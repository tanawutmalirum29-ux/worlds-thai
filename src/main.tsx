import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import './style.css';
import { validAnswer,wordInitialForCategory,normalizeAnswer } from '../amplify/functions/game/logic.ts';
import { letterCaption } from './letters.ts';
import { synonymExamplesForRound } from './word-insights.ts';
import { encodeGamePayload } from './rooms';

const LABELS: Record<string,string> = {
  animal:'สัตว์', sport:'กีฬา', job:'อาชีพ', verb:'คำกริยา', fruit:'ผลไม้',
  vegetable:'ผัก', food:'อาหาร', drink:'เครื่องดื่ม', province:'จังหวัด/รัฐทั่วโลก', country:'ประเทศ',
  city:'เมือง', music:'เครื่องดนตรี', body:'อวัยวะ', clothing:'เครื่องแต่งกาย',
  vehicle:'ยานพาหนะ', device:'เครื่องใช้ไฟฟ้า', school:'ของใช้ในโรงเรียน', plant:'พืช',
  flower:'ดอกไม้', tree:'ต้นไม้', object:'สิ่งของ', color:'สี', cartoon:'ตัวการ์ตูน',
  film:'ภาพยนตร์', person:'ชื่อคน', adjective:'คำคุณศัพท์', science:'วิทยาศาสตร์',
  technology:'เทคโนโลยี', place:'สถานที่', festival:'เทศกาล', toy:'ของเล่น', fish:'ปลา',
  insect:'แมลง', bird:'นก', dessert:'ขนม', nature:'ธรรมชาติ', furniture:'เฟอร์นิเจอร์',
  material:'วัสดุ', health:'สุขภาพ', tool:'เครื่องมือ', fiction:'ตัวละครในนิยาย', transport:'การเดินทาง'
};
const SYMBOLS: Record<string,string> = {
  animal:'🐾', sport:'🏆', job:'💼', verb:'✎', fruit:'🍋', vegetable:'🥬', food:'🥣', drink:'🥤',
  province:'📍', country:'🌎', city:'🏙', music:'♫', body:'♥', clothing:'👕', vehicle:'🚘',
  device:'⚡', school:'✏', plant:'🌿', flower:'✿', tree:'🌳', object:'◈', color:'🎨', cartoon:'✦',
  film:'▣', person:'♟', adjective:'✳', science:'⚗', technology:'⌘', place:'⌂',
  festival:'🎏', toy:'✦', fish:'🐟', insect:'🐝', bird:'🕊', dessert:'🍩', nature:'☘',
  furniture:'▤', material:'⬡', health:'✚', tool:'⚒', fiction:'📖', transport:'➤'
};
type GameSettings = {rounds:number;categories:number;seconds:number};
const DEFAULT_SETTINGS:GameSettings={rounds:3,categories:5,seconds:40};
const TIME_OPTIONS=[20,30,40,50,60,75,90,120];
type PublicRoom = {roomId:string;hostName:string;playerCount:number;createdAt:number;settings:GameSettings};
type Player = { id:string; name:string; score:number };
type Entry = { id:string; name:string; answers:Record<string,string>; points:number; perCategory:Record<string,number> };
type Round = {round:number; letter:string; categories:string[]; entries:Entry[]};
type Game = {roomId:string; phase:'lobby'|'playing'|'review'|'final'; round:number; letter:string;
  categories:string[]; deadline:number; countdown:number; players:Player[]; submitted:string[];
  history:Round[]; revision:number; ownerId:string; settings:GameSettings; you?:string};
type Api = any;
function unpack(value:unknown):any {
  if(typeof value === 'string') { try { return JSON.parse(value); } catch { return value; } }
  return value;
}
function remainingForAutosave(game:Game,now:number){
  return Math.max(0,Math.ceil((game.deadline-now)/1000));
}
function secondsUntil(when:number, now:number){return Math.max(0,Math.ceil((when-now)/1000));}
function timeLabel(s:number){return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;}
function TrophyIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 21h8m-4-4v4M6 3h12v7a6 6 0 01-12 0V3zm0 2H3v3a5 5 0 004 4m11-7h3v3a5 5 0 01-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function SynonymLearn({letter,categories}:{letter:string;categories:readonly string[]}) {
  const examples=synonymExamplesForRound(letter,categories);
  if(!examples.length)return null;
  return <section className="synonym-learn" aria-label="คำไวพจน์น่ารู้">
    <h3>คำไวพจน์น่ารู้</h3>
    <p>ตัวอย่างคำที่ตอบได้ในหมวดและพยัญชนะของรอบนี้ แต่ละคำสะกดต่างกันนับคะแนนแยกกัน</p>
    <ul>{examples.map(example=><li key={example.category+':'+example.word}>
      <strong>{example.word}</strong> <span>({LABELS[example.category]})</span>
      <span>หมายถึง {example.meaning} · คำที่มีความหมายใกล้กัน: {example.related.join(' · ')}</span>
    </li>)}</ul>
  </section>;
}

function App(){
  const [client,setClient] = useState<Api|null>(null);
  const [status,setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [error,setError] = useState('');
  const [name,setName] = useState(()=>localStorage.getItem('khamwai-name')||'');
  const [mode,setMode]=useState<'create'|'join'>('join');
  const [rooms,setRooms]=useState<PublicRoom[]>([]);
  const [roomsLoading,setRoomsLoading]=useState(true);
  const [roomsError,setRoomsError]=useState('');
  const [draftSettings,setDraftSettings]=useState<GameSettings>({...DEFAULT_SETTINGS});
  const [game,setGame] = useState<Game|null>(null);
  const [me,setMe] = useState('');
  const [answers,setAnswers] = useState<Record<string,string>>({});
  const [draftStatus,setDraftStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [working,setWorking] = useState(false);
  const [now,setNow] = useState(Date.now());
  const [help,setHelp] = useState(false);
  const current = useRef<Game|null>(null);
  const appClient = useRef<Api|null>(null);
  const roomRef = useRef('');
  const meRef = useRef('');
  const workingRef = useRef(false);
  const roundRef = useRef(0);
  const answersRef = useRef<Record<string,string>>({});
  const draftVersionRef=useRef(0);
  const savedVersionRef=useRef(0);
  const draftTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const draftInFlightRef=useRef(false);
  useEffect(()=>()=>{if(draftTimerRef.current)clearTimeout(draftTimerRef.current);},[]);
  useEffect(()=>{ const id=window.setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(id); },[]);
  useEffect(()=>{
    let active=true;
    (async()=>{
      try {
        const res = await fetch('/amplify_outputs.json',{cache:'no-store'});
        if(!res.ok) throw new Error('ยังไม่ได้ Deploy ระบบออนไลน์บน AWS Amplify (ไม่พบ amplify_outputs.json)');
        const outputs=await res.json();
        if(!active) return;
        Amplify.configure(outputs);
        const api=(generateClient as any)();
        appClient.current=api;setClient(api);setStatus('ready');
      }catch(e){ if(active){setStatus('error');setError(e instanceof Error?e.message:'เชื่อมต่อ AWS ไม่สำเร็จ');} }
    })();
    return()=>{active=false;};
  },[]);
  const accept=useCallback((state:unknown)=>{
    const next=unpack(state) as Game|null;
    if(!next || !next.roomId) return;
    if(roomRef.current && next.roomId!==roomRef.current) return;
    if(current.current && current.current.roomId===next.roomId && next.revision<current.current.revision) return;
    if(next.round !== roundRef.current){
      if(draftTimerRef.current)clearTimeout(draftTimerRef.current);
      draftTimerRef.current=null;
      answersRef.current={};draftVersionRef.current=0;savedVersionRef.current=0;
      setAnswers({});setDraftStatus('idle');roundRef.current=next.round;
    }
    if(next.phase!=='playing' && draftTimerRef.current){
      clearTimeout(draftTimerRef.current);draftTimerRef.current=null;
    }
    current.current=next;setGame(next);
  },[]);
  const call=useCallback(async(action:string,roomId?:string, nickname?:string, values?:Record<string,string>, settings?:GameSettings)=>{
    const api=appClient.current as any;
    if(!api) throw new Error('ยังไม่พร้อมเชื่อมต่อ');
    const response=await api.mutations.gameAction({action,roomId,name:nickname,...encodeGamePayload(values,settings)}, {authMode:'identityPool'});
    if(response.errors?.length) throw new Error(response.errors.map((x:{message:string})=>x.message).join('; '));
    const event=response.data;
    if(!event?.roomId) throw new Error('เซิร์ฟเวอร์ไม่ได้ตอบกลับ');
    return { roomId:event.roomId as string, snapshot:unpack(event.snapshot) as Game };
  },[]);
  const join=async(targetRoomId?:string)=>{
    if(workingRef.current || !client)return;
    const trimmed=name.trim().slice(0,18);
    if(!trimmed){setError('กรุณาใส่ชื่อเล่นก่อนเริ่มเกม');return;}
    setError('');setWorking(true);workingRef.current=true;
    try{
      // A room is selected from the live public directory; no code or URL needed.
      const next=await call(targetRoomId?'join':'create',targetRoomId,trimmed,undefined,
        targetRoomId?undefined:draftSettings);
      localStorage.setItem('khamwai-name',trimmed);
      meRef.current=next.snapshot.you||'';setMe(meRef.current);
      roomRef.current=next.roomId;roundRef.current=0;current.current=null;
      accept(next.snapshot);
      setDraftSettings(next.snapshot.settings);
      // Keep the browser on the one public game URL.
      if(window.location.search)history.replaceState({},'',location.pathname);
    }catch(e){setError(e instanceof Error?e.message:'เข้าร่วมเกมไม่สำเร็จ');}
    finally{setWorking(false);workingRef.current=false;}
  };
  const leave=async()=>{
    const old=roomRef.current;
    roomRef.current=''; meRef.current='';setMe('');setGame(null);current.current=null;roundRef.current=0;setAnswers({});
    if(draftTimerRef.current)clearTimeout(draftTimerRef.current);
    draftTimerRef.current=null;answersRef.current={};draftVersionRef.current=0;savedVersionRef.current=0;setDraftStatus('idle');
    setMode('join');
    try {await call('leave',old);}catch {/* Guest expires automatically if offline. */}
  };
  useEffect(()=>{
    if(!client || game)return;
    const api=client as any;
    let stopped=false;
    let updating=false;
    const refreshRooms=async()=>{
      if(updating)return;
      updating=true;
      try {
        const response=await api.queries.listRooms({}, {authMode:'identityPool'});
        if(response.errors?.length)throw new Error(response.errors.map((entry:{message:string})=>entry.message).join('; '));
        const value=unpack(response.data);
        if(!Array.isArray(value))throw new Error('รูปแบบรายการห้องไม่ถูกต้อง');
        if(!stopped){setRooms(value as PublicRoom[]);setRoomsError('');}
      }catch(err){
        if(!stopped)setRoomsError(err instanceof Error?err.message:'โหลดรายชื่อห้องไม่สำเร็จ');
      }finally{updating=false;if(!stopped)setRoomsLoading(false);}
    };
    void refreshRooms();
    const interval=window.setInterval(()=>void refreshRooms(),3000);
    return()=>{stopped=true;clearInterval(interval);};
  },[client,game?.roomId]);
  useEffect(()=>{
    if(!client||!me||!game?.roomId)return;
    const id=game.roomId;
    const api=client as any;
    let stopped=false;
    // Poll server-owned state; no AppSync subscription resolver is needed.
    const refresh=async()=>{
      try {
        const result=await api.queries.getGame({roomId:id},{authMode:'identityPool'});
        if(!stopped && !result.errors?.length)accept(result.data);
      }catch(e){console.warn('Refresh failed',e);}
    };
    const timer=window.setInterval(refresh,2000);
    const heartbeat=window.setInterval(async()=>{
      if(stopped || workingRef.current)return;
      try {const latest=await call('pulse',id);if(!stopped)accept(latest.snapshot);}
      catch(e){if(!stopped)console.warn('Heartbeat failed',e);}
    },5000);
    refresh();
    return()=>{stopped=true;clearInterval(timer);clearInterval(heartbeat);};
  },[client,me,game?.roomId,call,accept]);
  // A single serialized queue per browser avoids late/out-of-order draft writes
  // overwriting more recent inputs. All writes remain server-time validated.
  async function flushDraft(){
    const state=current.current;
    if(!state || state.phase!=='playing' || Date.now()>=state.deadline ||
       !roomRef.current || draftInFlightRef.current ||
       draftVersionRef.current<=savedVersionRef.current)return;
    const roomId=state.roomId,round=state.round,version=draftVersionRef.current;
    const payload={...answersRef.current};
    draftInFlightRef.current=true;
    let failed=false;
    try{
      const update=await call('draft',roomId,undefined,payload);
      if(roomRef.current===roomId && current.current?.round===round){
        savedVersionRef.current=Math.max(savedVersionRef.current,version);
        accept(update.snapshot);
        if(draftVersionRef.current===version)setDraftStatus('saved');
      }
    }catch(e){
      failed=true;
      if(roomRef.current===roomId && current.current?.round===round){
        setDraftStatus('error');
        console.warn('Auto-save draft failed',e);
      }
    }finally{
      draftInFlightRef.current=false;
      if(roomRef.current===roomId && current.current?.round===round &&
         current.current?.phase==='playing' && Date.now()<current.current.deadline &&
         draftVersionRef.current>savedVersionRef.current){
        if(draftTimerRef.current)clearTimeout(draftTimerRef.current);
        draftTimerRef.current=setTimeout(()=>void flushDraft(),failed?900:50);
      }
    }
  }
  function updateWord(category:string,value:string){
    const state=current.current;
    if(!state || state.phase!=='playing' || Date.now()>=state.deadline)return;
    const latest={...answersRef.current,[category]:value};
    answersRef.current=latest;setAnswers(latest);draftVersionRef.current++;
    setDraftStatus('saving');
    if(draftTimerRef.current)clearTimeout(draftTimerRef.current);
    const ms=state.deadline-Date.now()<=2500?0:350;
    draftTimerRef.current=setTimeout(()=>void flushDraft(),ms);
  }
  // Flush pending edits before the countdown reaches zero.
  useEffect(()=>{
    if(game?.phase==='playing' && remainingForAutosave(game,now)<=2 &&
       draftVersionRef.current>savedVersionRef.current && !draftInFlightRef.current){
      if(draftTimerRef.current)clearTimeout(draftTimerRef.current);
      draftTimerRef.current=setTimeout(()=>void flushDraft(),0);
    }
  },[game?.round,game?.phase,now]);
  async function ownerAction(action:'settings'|'start'|'reset') {
    if(!game||workingRef.current||game.ownerId!==me)return;
    workingRef.current=true;setWorking(true);setError('');
    try {
      const next=await call(action,game.roomId,undefined,undefined,(action==='settings'||action==='start')?draftSettings:undefined);
      accept(next.snapshot);
    }catch(e){setError(e instanceof Error?e.message:'ดำเนินการไม่สำเร็จ');}
    finally{workingRef.current=false;setWorking(false);}
  }
  const playing=game?.phase==='playing';
  const isOwner=Boolean(game && me===game.ownerId);
  const remaining=game&&game.deadline?secondsUntil(game.deadline,now):0;
  const ordered=(game?.players||[]).slice().sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'th'));
  const latest=game?.history.at(-1);
  const leaders=ordered.filter(p=>p.score===ordered[0]?.score);
  return <div className="app-shell">
    <div className="ambient ambient-left"/><div className="ambient ambient-right"/>
    <header className={playing?'topbar container topbar-playing':'topbar container'}>
      <a href="/" className="logo" aria-label="คำไว หน้าหลัก"><span className="logo-mark">ค</span><span>คำ<span className="logo-accent">ไว</span><small>THAI WORD PARTY</small></span></a>
      <div className="top-actions"><span className="live-pill"><span className="live-dot"/>{status==='ready'?'เล่นออนไลน์':'AWS CLOUD'}</span><button className="ghost-btn" onClick={()=>setHelp(true)}><span className="help-dot">?</span> วิธีเล่น</button></div>
    </header>
    <main className="container">
      {!game ? <div className="welcome-layout">
        <section className="welcome-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> เกมคำศัพท์ปาร์ตี้ออนไลน์</div>
          <h1>คิดให้ไว <span>ตอบให้ทัน</span><br/>แล้วมาวัดกัน!</h1>
          <p className="lead">สุ่มพยัญชนะไทย แข่งตอบคำให้ตรงหมวดกับเพื่อนแบบออนไลน์ คำไม่ซ้ำยิ่งได้แต้มเยอะ!</p>
          <div className="floating-letters" aria-hidden="true"><div className="float-card first">ก<span>ไก่</span></div><div className="float-card second">ส<span>เสือ</span></div><div className="float-card third">ม<span>ม้า</span></div></div>
        </section>
        <section className="join-card">
          <div className="card-deco"><span>✳</span><span>✿</span></div>
          <div className="card-label">READY TO PLAY?</div>
          <div className="room-mode-switch" role="group" aria-label="เลือกวิธีเล่น">
            <button type="button" className={mode==='create'?'room-mode active':'room-mode'} aria-pressed={mode==='create'} onClick={()=>{setMode('create');setError('');}}>สร้างห้อง</button>
            <button type="button" className={mode==='join'?'room-mode active':'room-mode'} aria-pressed={mode==='join'} onClick={()=>{setMode('join');setError('');}}>เข้าร่วมห้อง</button>
          </div>
          <h2>{mode==='join'?'ห้องที่กำลังรอผู้เล่น':'สร้างห้องใหม่'}</h2><p className="muted">{mode==='join'?'ห้องที่เพื่อนสร้างจะปรากฏอัตโนมัติ กดเข้าร่วมได้ทันที':'ตั้งค่าจำนวนรอบ หมวด และเวลา จากนั้นรอเพื่อนเข้ามา'}</p>
          <label htmlFor="nickname">ชื่อเล่นของคุณ</label>
          <input id="nickname" maxLength={18} autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&mode==='create')void join();}} placeholder="เช่น เจ้าแม่คำศัพท์" />
          {mode==='join'?<div className="public-room-browser">
            <div className="public-room-heading"><strong>ห้องที่เปิดอยู่</strong><span>อัปเดตทุก 3 วินาที</span></div>
            {roomsError?<p role="alert" className="error-message">โหลดห้องไม่สำเร็จ: {roomsError}</p>:null}
            {roomsLoading?<p className="notice">กำลังค้นหาห้องออนไลน์...</p>:
            rooms.length===0?<div className="empty-rooms"><strong>ยังไม่มีห้องที่รอผู้เล่น</strong><p>ให้เพื่อนคนหนึ่งกดสร้างห้องก่อน ห้องจะปรากฏที่นี่อัตโนมัติ</p><button type="button" className="secondary-btn" onClick={()=>setMode('create')}>สร้างห้องใหม่</button></div>:
            <div className="public-room-list">{rooms.map(room=><div className="public-room-card" key={room.roomId}>
              <div className="public-room-description"><strong>ห้องของ {room.hostName}</strong><span>● {room.playerCount}/8 คน · {room.settings.rounds} รอบ · {room.settings.categories} หมวด · {room.settings.seconds} วินาที</span></div>
              <button type="button" className="public-room-join" disabled={working||status!=='ready'} onClick={()=>void join(room.roomId)}>{working?'กำลังเข้า...':'เข้าร่วม'}</button>
            </div>)}</div>}
          </div>:<div className="settings-panel welcome-settings"><h3>ตั้งค่าเกมของคุณ</h3>
            <div className="settings-grid">
              <label>จำนวนรอบ<select value={draftSettings.rounds} onChange={e=>setDraftSettings(s=>({...s,rounds:Number(e.target.value)}))}>{Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} รอบ</option>)}</select></label>
              <label>หมวดต่อรอบ<select value={draftSettings.categories} onChange={e=>setDraftSettings(s=>({...s,categories:Number(e.target.value)}))}>{Array.from({length:6},(_,i)=>i+3).map(n=><option key={n} value={n}>{n} หมวด</option>)}</select></label>
              <label>เวลาตอบ<select value={draftSettings.seconds} onChange={e=>setDraftSettings(s=>({...s,seconds:Number(e.target.value)}))}>{TIME_OPTIONS.map(n=><option key={n} value={n}>{n} วินาที</option>)}</select></label>
            </div></div>}
          {mode==='create'?<button className="primary-btn" disabled={working||status!=='ready'} onClick={()=>void join()}>{working?'กำลังสร้างห้อง...':'สร้างห้อง'} <span>↗</span></button>:null}
          {status==='loading'?<p className="notice">กำลังเชื่อมต่อเซิร์ฟเวอร์ AWS…</p>:null}
          {error?<p className="error-message" role="alert">{error}</p>:null}
          {status==='error'&&!error?<p className="error-message">ไม่สามารถเชื่อมต่อระบบออนไลน์</p>:null}
          <div className="divider-word"><span>เล่นง่าย ๆ</span></div>
          <div className="join-benefits"><div><strong>01</strong> เจ้าของสร้างห้อง</div><div><strong>02</strong> เพื่อนเห็นห้องและกดเข้าร่วม</div><div><strong>03</strong> เจ้าของกดเริ่มเกม</div></div>
        </section>
      </div> : <div className={playing?'game-layout game-layout-playing':'game-layout'}>
        <section className="game-main">
          <div className="game-status-row"><div><span className="eyebrow tiny">LIVE MATCH <span className="gold-dot">●</span></span><h1 className="game-heading">{game.phase==='lobby'?'รอเพื่อนมาร่วมสนุก':game.phase==='playing'?'ได้เวลาประลองคำ!':game.phase==='review'?'เฉลยคำตอบรอบนี้':'จบเกมแล้ว!'}</h1></div><button className="exit-btn" onClick={leave}>ออกจากเกม ×</button></div>
          {error?<p className="error-message" role="alert">{error}</p>:null}
          <div className="game-meta"><span className="round-marker">{game.round?`รอบ ${game.round} / ${game.settings.rounds}`:'ห้องของเพื่อน'}</span><span className="people-marker">◉ {game.players.length} / 8 คน</span></div>
          {game.phase==='lobby'?<div className="lobby-view">
            <div className="lobby-visual"><div className="lobby-ring one"/><div className="lobby-ring two"/><span className="lobby-letter">ค<span>◈</span></span></div>
            <h2>{isOwner?'คุณเป็นเจ้าของห้อง':'รอเจ้าของห้องเริ่มเกม'}</h2>
            <p>{game.players.length<2?'รอเพื่อนกดเข้าร่วมห้องจากหน้าเกม':'ทุกคนพร้อมแล้ว เจ้าของห้องสามารถเริ่มได้เลย'}</p>
            <div className="public-room-notice">ห้องของคุณแสดงอยู่ในหน้าเข้าร่วมห้องของทุกคนโดยอัตโนมัติ</div>
            {isOwner?<div className="settings-panel lobby-settings"><h3>ตั้งค่าห้อง</h3>
              <div className="settings-grid">
                <label>จำนวนรอบ<select value={draftSettings.rounds} onChange={e=>setDraftSettings(s=>({...s,rounds:Number(e.target.value)}))}>{Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} รอบ</option>)}</select></label>
                <label>หมวดต่อรอบ<select value={draftSettings.categories} onChange={e=>setDraftSettings(s=>({...s,categories:Number(e.target.value)}))}>{Array.from({length:6},(_,i)=>i+3).map(n=><option key={n} value={n}>{n} หมวด</option>)}</select></label>
                <label>เวลาตอบ<select value={draftSettings.seconds} onChange={e=>setDraftSettings(s=>({...s,seconds:Number(e.target.value)}))}>{TIME_OPTIONS.map(n=><option key={n} value={n}>{n} วินาที</option>)}</select></label>
              </div>
              <button className="secondary-btn settings-save" disabled={working} onClick={()=>void ownerAction('settings')}>บันทึกการตั้งค่า</button>
              <button className="primary-btn" disabled={working||game.players.length<2} onClick={()=>void ownerAction('start')}>เริ่มเกม {game.players.length} คน <span>→</span></button>
            </div>:<div className="waiting-settings">การตั้งค่าห้อง: {game.settings.rounds} รอบ · {game.settings.categories} หมวด · {game.settings.seconds} วินาที<br/>เจ้าของห้อง: {game.players.find(p=>p.id===game.ownerId)?.name||'กำลังรอเจ้าของห้อง'}</div>}
            <div className="lobby-tip">ทุกคนเปิดหน้าเว็บเกมเดียวกันแล้วกดเข้าร่วมได้ทันที · เจ้าของห้องเป็นคนกดเริ่มเกม</div>
          </div>:null}
          {playing?<><div className="challenge-banner"><div><div className="banner-label">พยัญชนะประจำรอบ</div><div className="letter-display">{game.letter}</div><div className="letter-caption">{letterCaption(game.letter)}</div></div><div className="time-box"><span>เวลาที่เหลือ</span><strong className={remaining<=15?'urgent':''}>{timeLabel(remaining)}</strong><div className="time-track"><div style={{width:`${Math.min(100,remaining/game.settings.seconds*100)}%`}}/></div></div></div>
            <div className="answer-head"><div><h2>ตอบให้ครบ {game.categories.length} หมวด</h2><p>ทุกคำต้องขึ้นต้นด้วย <b>“{letterCaption(game.letter)}”</b> · ตรวจคำขณะพิมพ์</p>
              {game.categories.includes('dessert')?<p className="dessert-prefix-help">หมวดขนม: เติม “ขนม” นำหน้าชื่อได้ แต่ไม่นับคำว่า “ขนม” เป็นอักษรต้น เช่น “ขนมจรวดสายรุ้ง” ให้นับ จ จาน (ตัวอย่างสมมติที่ไม่มีจริง ไม่ใช่คำตอบที่ใช้ได้) · ตรวจเฉพาะชื่อขนมจริงในคลัง · “ขนม” เดี่ยว ๆ ไม่รับ</p>:null}</div><span className="progress-tag">{game.categories.filter(id=>answers[id]?.trim()).length}/{game.categories.length} คำ</span></div>
            <div className="answer-list">{game.categories.map((id,index)=>{
              const typed=normalizeAnswer(answers[id]);
              const state=!typed?'empty':validAnswer(typed,game.letter,id)?'accepted':wordInitialForCategory(typed,id)!==game.letter?'wrong-letter':'unknown';
              return <label className={`answer-item answer-${state}`} key={`${game.round}-${id}`}>
                <span className="answer-number">{String(index+1).padStart(2,'0')}</span>
                <span className="answer-symbol">{SYMBOLS[id]||'✦'}</span>
                <span className="answer-text">{LABELS[id]||id}</span>
                <span className="answer-input-wrap">
                  <input disabled={remaining===0} maxLength={48} value={answers[id]||''}
                    onChange={e=>updateWord(id,e.target.value)}
                    onBlur={()=>void flushDraft()}
                    placeholder="พิมพ์คำตอบ..." aria-label={`คำตอบหมวด${LABELS[id]}`}/>
                  <span className={`answer-feedback feedback-${state}`}>{state==='empty'?'ตรวจคำให้ทันที':state==='accepted'?'✓ คำนี้ใช้ได้':state==='wrong-letter'?'ตัวอักษรต้นไม่ตรง':'ยังไม่พบคำนี้ในหมวด'}</span>
                </span>
                <span className={state==='accepted'?'answer-check filled':state==='empty'?'answer-check':'answer-check invalid'}>{state==='accepted'?'✓':state==='empty'?'—':'!'}</span>
              </label>;
            })}</div>
            <div className={`auto-save-status autosave-${draftStatus}`} role="status" aria-live="polite">
              {draftStatus==='saving'?'กำลังบันทึกคำตอบ...':
               draftStatus==='saved'?'✓ บันทึกคำตอบแล้ว':
               draftStatus==='error'?'การเชื่อมต่อขัดข้อง กำลังลองบันทึกใหม่':
               'พิมพ์ได้เลย ระบบจะบันทึกคำตอบให้อัตโนมัติ'}
            </div>
            <p className="small-center">ไม่ต้องกดส่งคำตอบ ระบบคิดคะแนนจากคำล่าสุดที่บันทึกสำเร็จเมื่อหมดเวลา</p>
          </>:null}
          {game.phase==='review'&&latest?<div className="results-view"><div className="results-round">ROUND {latest.round} COMPLETE</div><h2>แต้มรอบนี้มาแล้ว!</h2><p>พยัญชนะ <strong className="gold-text">{letterCaption(latest.letter)}</strong> · {latest.round>=game.settings.rounds?'กำลังสรุปคะแนน':`รอบถัดไปใน ${remaining} วินาที`}</p>
            <div className="round-results">{latest.entries.slice().sort((a,b)=>b.points-a.points).map((e,i)=><div className="result-person" key={e.id}><span className="rank-bubble">{i+1}</span><span>{e.name} {e.id===me?'(คุณ)':''}</span><strong>+{e.points} คะแนน</strong></div>)}</div>
            <div className="review-grid">{latest.categories.map(id=><div className="review-category" key={id}><h3>{SYMBOLS[id]} {LABELS[id]}</h3>{latest.entries.map(e=><div key={e.id}><span>{e.name}: {e.answers[id]||'—'}</span><b>+{e.perCategory[id]}</b></div>)}</div>)}</div>
            <SynonymLearn letter={latest.letter} categories={latest.categories}/>
          </div>:null}
          {game.phase==='final'?<div className="final-view"><div className="final-crown">♛</div><p className="results-round">MATCH COMPLETE</p><h2>{leaders.length===1?`${leaders[0]?.name} ชนะการแข่งขัน!`:'เสมอกัน! เก่งทุกคน'}</h2><p>จบครบ {game.settings.rounds} รอบแล้ว · เจ้าของห้องเป็นผู้เริ่มเกมใหม่</p><div className="final-podium">{ordered.map((p,i)=><div className="final-player" key={p.id}><span>{i===0?'♛':`#${i+1}`}</span><b>{p.name}{p.id===me?' (คุณ)':''}</b><strong>{p.score} <small>คะแนน</small></strong></div>)}</div>{game.history.map(round=><div key={round.round} className="synonym-history">
              <p>รอบ {round.round} · {letterCaption(round.letter)}</p>
              <SynonymLearn letter={round.letter} categories={round.categories}/>
            </div>)}{isOwner?<button className="primary-btn" disabled={working} onClick={()=>void ownerAction('reset')}>ตั้งค่าห้องและเล่นใหม่ <span>↗</span></button>:null}<p className="small-center">เล่นใหม่ได้จากห้องเดิม เพื่อนที่ออกสามารถเลือกห้องที่เปิดอยู่ได้จากหน้าเกม</p></div>:null}
        </section>
        <aside className="sidebar"><div className="score-card"><div className="sidebar-title"><span className="sidebar-icon"><TrophyIcon/></span><div><h3>ตารางคะแนน</h3><p>อัปเดตทุก 2 วินาที</p></div></div><div className="score-list">{ordered.map((p,i)=><div className={`score-player ${p.id===me?'its-you':''}`} key={p.id}><span className={`avatar av${i%5}`}>{p.name.charAt(0).toUpperCase()}</span><div className="player-info"><b>{p.name}{p.id===me?<small> คุณ</small>:null}</b><span>{i===0?'อันดับ 1':`อันดับ ${i+1}`}</span></div><strong>{p.score}</strong></div>)}</div>{ordered.length<8?<div className="score-footer">+ {8-ordered.length} ที่ว่างสำหรับเพื่อนของคุณ</div>:null}</div>
          <div className="rules-card"><div className="rules-icon">✦</div><h3>กติกาคะแนน</h3><div><span>คำถูกและไม่ซ้ำ</span><strong>+2</strong></div><div><span>คำถูกแต่ซ้ำ</span><strong>+1</strong></div><div><span>คำผิดหมวด / ไม่อยู่ในคลัง / ว่าง</span><strong>0</strong></div><p>แข่งครบจำนวนรอบที่ตั้งค่า ใครคะแนนรวมสูงสุดชนะ!</p></div>
          <div className="public-room-notice">เพื่อนเปิดเว็บไซต์คำไวเดียวกัน แล้วเลือกชื่อห้องที่รอผู้เล่นได้ทันที</div>
        </aside>
      </div>}
    </main>
    <footer className="footer container"><span>คำไว — เกมคำไทยออนไลน์</span><span>29 หมวดที่ตรวจรับแล้ว · เจ้าของห้องตั้งเวลา หมวด และรอบได้</span></footer>
    {help?<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setHelp(false);}} role="presentation"><section className="help-modal" role="dialog" aria-modal="true" aria-label="วิธีเล่น"><button onClick={()=>setHelp(false)} className="modal-close" aria-label="ปิด">×</button><div className="eyebrow tiny">HOW TO PLAY</div><h2>วิธีเล่นคำไว</h2><ol><li>คนหนึ่งกดสร้างห้อง เลือกจำนวนรอบ หมวด และเวลา ส่วนเพื่อนเปิดเกมเดียวกันแล้วเลือกห้องจากรายการ</li><li>เมื่อมีอย่างน้อย 2 คน เจ้าของห้องกดเริ่ม เกมจะสุ่มตัวอักษรและหมวดตามที่ตั้งไว้</li><li>พิมพ์คำที่ขึ้นต้นด้วยตัวอักษรที่สุ่มให้ตรงหมวด ระบบตรวจและบันทึกให้ทันทีโดยไม่ต้องกดส่ง</li><li>คำถูกต้องตรงหมวดและพยัญชนะต้น ไม่ซ้ำได้ 2 คะแนน ซ้ำกับเพื่อนได้ 1 คะแนน</li><li>แข่งขันตามจำนวนรอบที่เลือก รวมคะแนนทั้งหมดเพื่อหาผู้ชนะ</li></ol><p className="help-note">ระบบตรวจคำตรงหมวดและพยัญชนะต้นจากคลังคำที่ตรวจรับแล้ว คำจริงที่ยังไม่อยู่ในคลังจะไม่ได้คะแนนจนกว่าจะเพิ่มคำ กรุณาแจ้งผู้ดูแลเพื่อพิจารณาเพิ่ม</p><button className="primary-btn" onClick={()=>setHelp(false)}>เข้าใจแล้ว <span>✓</span></button></section></div>:null}
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
