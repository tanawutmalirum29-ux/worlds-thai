import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import './style.css';

const LABELS: Record<string,string> = {
  animal:'สัตว์', sport:'กีฬา', job:'อาชีพ', verb:'คำกริยา', fruit:'ผลไม้',
  vegetable:'ผัก', food:'อาหาร', drink:'เครื่องดื่ม', province:'จังหวัด', country:'ประเทศ',
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
function secondsUntil(when:number, now:number){return Math.max(0,Math.ceil((when-now)/1000));}
function timeLabel(s:number){return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;}
function TrophyIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 21h8m-4-4v4M6 3h12v7a6 6 0 01-12 0V3zm0 2H3v3a5 5 0 004 4m11-7h3v3a5 5 0 01-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function App(){
  const [client,setClient] = useState<Api|null>(null);
  const [status,setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [error,setError] = useState('');
  const [name,setName] = useState(()=>localStorage.getItem('khamwai-name')||'');
  const [invite,setInvite]=useState(()=>new URLSearchParams(window.location.search).get('match')||'');
  const [draftSettings,setDraftSettings]=useState<GameSettings>({...DEFAULT_SETTINGS});
  const [game,setGame] = useState<Game|null>(null);
  const [me,setMe] = useState('');
  const [answers,setAnswers] = useState<Record<string,string>>({});
  const [submitted,setSubmitted] = useState(false);
  const [working,setWorking] = useState(false);
  const [now,setNow] = useState(Date.now());
  const [copied,setCopied] = useState(false);
  const [help,setHelp] = useState(false);
  const current = useRef<Game|null>(null);
  const appClient = useRef<Api|null>(null);
  const roomRef = useRef('');
  const meRef = useRef('');
  const workingRef = useRef(false);
  const roundRef = useRef(0);
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
    if(next.round !== roundRef.current){ setAnswers({});setSubmitted(false);roundRef.current=next.round; }
    if(next.phase==='playing' && meRef.current) setSubmitted(next.submitted.includes(meRef.current));
    current.current=next;setGame(next);
  },[]);
  const call=useCallback(async(action:string,roomId?:string, nickname?:string, values?:Record<string,string>, settings?:GameSettings)=>{
    const api=appClient.current as any;
    if(!api) throw new Error('ยังไม่พร้อมเชื่อมต่อ');
    const response=await api.mutations.gameAction({action,roomId,name:nickname,answers:values,settings}, {authMode:'identityPool'});
    if(response.errors?.length) throw new Error(response.errors.map((x:{message:string})=>x.message).join('; '));
    const event=response.data;
    if(!event?.roomId) throw new Error('เซิร์ฟเวอร์ไม่ได้ตอบกลับ');
    return { roomId:event.roomId as string, snapshot:unpack(event.snapshot) as Game };
  },[]);
  const join=async()=>{
    if(workingRef.current || !client)return;
    const trimmed=name.trim().slice(0,18);
    if(!trimmed){setError('กรุณาใส่ชื่อเล่นก่อนเริ่มเกม');return;}
    setError('');setWorking(true);workingRef.current=true;
    try{
      const linkRoom = /^room-[a-f0-9]{20}$/.test(invite) ? invite : undefined;
      if(invite&&!linkRoom)throw new Error('ลิงก์เชิญไม่ถูกต้อง');
      const next = await call(linkRoom?'join':'create', linkRoom, trimmed, undefined,
        linkRoom?undefined:draftSettings);
      localStorage.setItem('khamwai-name',trimmed);
      meRef.current=next.snapshot.you||'';setMe(meRef.current);
      roomRef.current=next.roomId;roundRef.current=0;current.current=null;
      accept(next.snapshot);
      setDraftSettings(next.snapshot.settings);
      const url=new URL(location.href);url.searchParams.set('match',next.roomId);
      history.replaceState({},'',url);setInvite(next.roomId);
    }catch(e){setError(e instanceof Error?e.message:'เข้าร่วมเกมไม่สำเร็จ');}
    finally{setWorking(false);workingRef.current=false;}
  };
  const leave=async()=>{
    const old=roomRef.current;
    roomRef.current=''; meRef.current='';setMe('');setGame(null);current.current=null;roundRef.current=0;setAnswers({});
    const url=new URL(location.href);url.searchParams.delete('match');history.replaceState({},'',url);setInvite('');
    try {await call('leave',old);}catch {/* Guest expires automatically if offline. */}
  };
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
  async function send(){
    if(workingRef.current||!game||game.phase!=='playing'||submitted)return;
    workingRef.current=true;setWorking(true);setError('');
    try{const latest=await call('submit',game.roomId,undefined,answers);accept(latest.snapshot);setSubmitted(true);}
    catch(e){setError(e instanceof Error?e.message:'ส่งคำตอบไม่สำเร็จ');}
    finally{workingRef.current=false;setWorking(false);}
  }
  async function ownerAction(action:'settings'|'start'|'reset') {
    if(!game||workingRef.current||game.ownerId!==me)return;
    workingRef.current=true;setWorking(true);setError('');
    try {
      const next=await call(action,game.roomId,undefined,undefined,(action==='settings'||action==='start')?draftSettings:undefined);
      accept(next.snapshot);
    }catch(e){setError(e instanceof Error?e.message:'ดำเนินการไม่สำเร็จ');}
    finally{workingRef.current=false;setWorking(false);}
  }
  async function share(){
    if(!game)return;
    const url=new URL(location.origin+location.pathname);
    url.searchParams.set('match',game.roomId);
    try {await navigator.clipboard.writeText(url.toString());setCopied(true);setTimeout(()=>setCopied(false),2200);}
    catch {window.prompt('คัดลอกลิงก์ชวนเพื่อน',url.toString());}
  }
  const playing=game?.phase==='playing';
  const isOwner=Boolean(game && me===game.ownerId);
  const remaining=game&&game.deadline?secondsUntil(game.deadline,now):0;
  const ordered=(game?.players||[]).slice().sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'th'));
  const latest=game?.history.at(-1);
  const leaders=ordered.filter(p=>p.score===ordered[0]?.score);
  return <div className="app-shell">
    <div className="ambient ambient-left"/><div className="ambient ambient-right"/>
    <header className="topbar container">
      <a href="/" className="logo" aria-label="คำไว หน้าหลัก"><span className="logo-mark">ค</span><span>คำ<span className="logo-accent">ไว</span><small>THAI WORD PARTY</small></span></a>
      <div className="top-actions"><span className="live-pill"><span className="live-dot"/>{status==='ready'?'เล่นออนไลน์':'AWS CLOUD'}</span><button className="ghost-btn" onClick={()=>setHelp(true)}><span className="help-dot">?</span> วิธีเล่น</button></div>
    </header>
    <main className="container">
      {!game ? <div className="welcome-layout">
        <section className="welcome-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> เกมคำศัพท์ปาร์ตี้ออนไลน์</div>
          <h1>คิดให้ไว <span>ตอบให้ทัน</span><br/>แล้วมาวัดกัน!</h1>
          <p className="lead">สุ่มพยัญชนะไทยแล้วแข่งตอบคำให้ตรงหมวด เจ้าของห้องเลือกจำนวนรอบ หมวดและเวลาเล่นได้เอง คำไม่ซ้ำยิ่งได้แต้มเยอะ!</p>
          <div className="feature-chips"><span>✦ เล่นพร้อมเพื่อน</span><span>✦ ไม่ต้องสมัคร</span><span>✦ ไม่มีรหัสห้อง</span></div>
          <div className="floating-letters" aria-hidden="true"><div className="float-card first">ก<span>กีฬา</span></div><div className="float-card second">ส<span>สัตว์</span></div><div className="float-card third">ม<span>ผลไม้</span></div></div>
        </section>
        <section className="join-card">
          <div className="card-deco"><span>✳</span><span>✿</span></div>
          <div className="card-label">READY TO PLAY?</div>
          <h2>{invite?'เข้าร่วมห้องเพื่อน':'สร้างห้องใหม่'}</h2><p className="muted">{invite?'คุณได้รับลิงก์ชวนเล่น ใส่ชื่อเพื่อเข้าห้อง':'ตั้งค่าเกมแล้วแชร์ลิงก์ให้เพื่อนเข้าร่วม'}</p>
          <label htmlFor="nickname">ชื่อเล่นของคุณ</label>
          <input id="nickname" maxLength={18} autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void join();}} placeholder="เช่น เจ้าแม่คำศัพท์" />
          {!invite?<div className="settings-panel welcome-settings"><h3>ตั้งค่าเกมของคุณ</h3>
            <div className="settings-grid">
              <label>จำนวนรอบ<select value={draftSettings.rounds} onChange={e=>setDraftSettings(s=>({...s,rounds:Number(e.target.value)}))}>{Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} รอบ</option>)}</select></label>
              <label>หมวดต่อรอบ<select value={draftSettings.categories} onChange={e=>setDraftSettings(s=>({...s,categories:Number(e.target.value)}))}>{Array.from({length:6},(_,i)=>i+3).map(n=><option key={n} value={n}>{n} หมวด</option>)}</select></label>
              <label>เวลาตอบ<select value={draftSettings.seconds} onChange={e=>setDraftSettings(s=>({...s,seconds:Number(e.target.value)}))}>{TIME_OPTIONS.map(n=><option key={n} value={n}>{n} วินาที</option>)}</select></label>
            </div></div>:<p className="invite-info">เปิดลิงก์เชิญแล้ว กดเข้าร่วมห้องได้ทันที</p>}
          <button className="primary-btn" disabled={working||status!=='ready'} onClick={join}>{working?'กำลังเชื่อมต่อ...':invite?'เข้าร่วมห้องเพื่อน':'สร้างห้องและชวนเพื่อน'} <span>↗</span></button>
          {status==='loading'?<p className="notice">กำลังเชื่อมต่อเซิร์ฟเวอร์ AWS…</p>:null}
          {error?<p className="error-message" role="alert">{error}</p>:null}
          {status==='error'&&!error?<p className="error-message">ไม่สามารถเชื่อมต่อระบบออนไลน์</p>:null}
          <div className="divider-word"><span>เล่นง่าย ๆ</span></div>
          <div className="join-benefits"><div><strong>01</strong> เจ้าของสร้างห้อง</div><div><strong>02</strong> ส่งลิงก์ชวนเพื่อน</div><div><strong>03</strong> เจ้าของกดเริ่มเกม</div></div>
        </section>
      </div> : <div className="game-layout">
        <section className="game-main">
          <div className="game-status-row"><div><span className="eyebrow tiny">LIVE MATCH <span className="gold-dot">●</span></span><h1 className="game-heading">{game.phase==='lobby'?'รอเพื่อนมาร่วมสนุก':game.phase==='playing'?'ได้เวลาประลองคำ!':game.phase==='review'?'เฉลยคำตอบรอบนี้':'จบเกมแล้ว!'}</h1></div><button className="exit-btn" onClick={leave}>ออกจากเกม ×</button></div>
          {error?<p className="error-message" role="alert">{error}</p>:null}
          <div className="game-meta"><span className="round-marker">{game.round?`รอบ ${game.round} / ${game.settings.rounds}`:'ห้องของเพื่อน'}</span><span className="people-marker">◉ {game.players.length} / 8 คน</span></div>
          {game.phase==='lobby'?<div className="lobby-view">
            <div className="lobby-visual"><div className="lobby-ring one"/><div className="lobby-ring two"/><span className="lobby-letter">ค<span>◈</span></span></div>
            <h2>{isOwner?'คุณเป็นเจ้าของห้อง':'รอเจ้าของห้องเริ่มเกม'}</h2>
            <p>{game.players.length<2?'ชวนเพื่อนมาอย่างน้อยอีก 1 คนเพื่อแข่งขัน':'ทุกคนพร้อมแล้ว เจ้าของห้องสามารถเริ่มได้เลย'}</p>
            <button className="secondary-btn" onClick={share}>{copied?'คัดลอกแล้ว ✓':'⤴ คัดลอกลิงก์ชวนเพื่อน'}</button>
            {isOwner?<div className="settings-panel lobby-settings"><h3>ตั้งค่าห้อง</h3>
              <div className="settings-grid">
                <label>จำนวนรอบ<select value={draftSettings.rounds} onChange={e=>setDraftSettings(s=>({...s,rounds:Number(e.target.value)}))}>{Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} รอบ</option>)}</select></label>
                <label>หมวดต่อรอบ<select value={draftSettings.categories} onChange={e=>setDraftSettings(s=>({...s,categories:Number(e.target.value)}))}>{Array.from({length:6},(_,i)=>i+3).map(n=><option key={n} value={n}>{n} หมวด</option>)}</select></label>
                <label>เวลาตอบ<select value={draftSettings.seconds} onChange={e=>setDraftSettings(s=>({...s,seconds:Number(e.target.value)}))}>{TIME_OPTIONS.map(n=><option key={n} value={n}>{n} วินาที</option>)}</select></label>
              </div>
              <button className="secondary-btn settings-save" disabled={working} onClick={()=>void ownerAction('settings')}>บันทึกการตั้งค่า</button>
              <button className="primary-btn" disabled={working||game.players.length<2} onClick={()=>void ownerAction('start')}>เริ่มเกม {game.players.length} คน <span>→</span></button>
            </div>:<div className="waiting-settings">การตั้งค่าห้อง: {game.settings.rounds} รอบ · {game.settings.categories} หมวด · {game.settings.seconds} วินาที<br/>เจ้าของห้อง: {game.players.find(p=>p.id===game.ownerId)?.name||'กำลังรอเจ้าของห้อง'}</div>}
            <div className="lobby-tip">ส่งลิงก์ให้เพื่อนเข้าร่วม ไม่ต้องใช้รหัสห้อง และไม่มีการเริ่มเกมอัตโนมัติ</div>
          </div>:null}
          {playing?<><div className="challenge-banner"><div><div className="banner-label">ตัวอักษรประจำรอบ</div><div className="letter-display">{game.letter}</div></div><div className="time-box"><span>เวลาที่เหลือ</span><strong className={remaining<=15?'urgent':''}>{timeLabel(remaining)}</strong><div className="time-track"><div style={{width:`${Math.min(100,remaining/game.settings.seconds*100)}%`}}/></div></div></div>
            <div className="answer-head"><div><h2>ตอบให้ครบ {game.categories.length} หมวด</h2><p>ทุกคำต้องขึ้นต้นด้วยตัว <b>“{game.letter}”</b></p></div><span className="progress-tag">{game.categories.filter(id=>answers[id]?.trim()).length}/{game.categories.length} คำ</span></div>
            <div className="answer-list">{game.categories.map((id,index)=><label className="answer-item" key={`${game.round}-${id}`}><span className="answer-number">{String(index+1).padStart(2,'0')}</span><span className="answer-symbol">{SYMBOLS[id]||'✦'}</span><span className="answer-text">{LABELS[id]||id}</span><input disabled={submitted||remaining===0} maxLength={48} value={answers[id]||''} onChange={e=>setAnswers(old=>({...old,[id]:e.target.value}))} placeholder="พิมพ์คำตอบ..." aria-label={`คำตอบหมวด${LABELS[id]}`}/><span className={answers[id]?.trim()?'answer-check filled':'answer-check'}>{answers[id]?.trim()?'✓':'—'}</span></label>)}</div>
            <button className="primary-btn submit-btn" onClick={send} disabled={submitted||working||remaining===0}>{submitted?'ส่งคำตอบแล้ว ✓':working?'กำลังส่ง...':'ส่งคำตอบ'} <span>↗</span></button>
            <p className="small-center">{submitted?'รอเวลาหมดเพื่อดูผลคะแนนพร้อมเพื่อน':'แก้ไขคำตอบได้ก่อนกดส่ง · ต้องส่งก่อนหมดเวลา'}</p>
          </>:null}
          {game.phase==='review'&&latest?<div className="results-view"><div className="results-round">ROUND {latest.round} COMPLETE</div><h2>แต้มรอบนี้มาแล้ว!</h2><p>พยัญชนะ <strong className="gold-text">{latest.letter}</strong> · {latest.round>=game.settings.rounds?'กำลังสรุปคะแนน':`รอบถัดไปใน ${remaining} วินาที`}</p>
            <div className="round-results">{latest.entries.slice().sort((a,b)=>b.points-a.points).map((e,i)=><div className="result-person" key={e.id}><span className="rank-bubble">{i+1}</span><span>{e.name} {e.id===me?'(คุณ)':''}</span><strong>+{e.points} คะแนน</strong></div>)}</div>
            <div className="review-grid">{latest.categories.map(id=><div className="review-category" key={id}><h3>{SYMBOLS[id]} {LABELS[id]}</h3>{latest.entries.map(e=><div key={e.id}><span>{e.name}: {e.answers[id]||'—'}</span><b>+{e.perCategory[id]}</b></div>)}</div>)}</div>
          </div>:null}
          {game.phase==='final'?<div className="final-view"><div className="final-crown">♛</div><p className="results-round">MATCH COMPLETE</p><h2>{leaders.length===1?`${leaders[0]?.name} ชนะการแข่งขัน!`:'เสมอกัน! เก่งทุกคน'}</h2><p>จบครบ {game.settings.rounds} รอบแล้ว · เจ้าของห้องเป็นผู้เริ่มเกมใหม่</p><div className="final-podium">{ordered.map((p,i)=><div className="final-player" key={p.id}><span>{i===0?'♛':`#${i+1}`}</span><b>{p.name}{p.id===me?' (คุณ)':''}</b><strong>{p.score} <small>คะแนน</small></strong></div>)}</div>{isOwner?<button className="primary-btn" disabled={working} onClick={()=>void ownerAction('reset')}>ตั้งค่าห้องและเล่นใหม่ <span>↗</span></button>:null}<button className="secondary-btn" onClick={share}>⤴ ชวนเพื่อนมาแข่งรอบต่อไป</button></div>:null}
        </section>
        <aside className="sidebar"><div className="score-card"><div className="sidebar-title"><span className="sidebar-icon"><TrophyIcon/></span><div><h3>ตารางคะแนน</h3><p>อัปเดตทุก 2 วินาที</p></div></div><div className="score-list">{ordered.map((p,i)=><div className={`score-player ${p.id===me?'its-you':''}`} key={p.id}><span className={`avatar av${i%5}`}>{p.name.charAt(0).toUpperCase()}</span><div className="player-info"><b>{p.name}{p.id===me?<small> คุณ</small>:null}</b><span>{i===0?'อันดับ 1':`อันดับ ${i+1}`}</span></div><strong>{p.score}</strong></div>)}</div>{ordered.length<8?<div className="score-footer">+ {8-ordered.length} ที่ว่างสำหรับเพื่อนของคุณ</div>:null}</div>
          <div className="rules-card"><div className="rules-icon">✦</div><h3>กติกาคะแนน</h3><div><span>คำถูกและไม่ซ้ำ</span><strong>+20</strong></div><div><span>คำถูกแต่ซ้ำ</span><strong>+10</strong></div><div><span>คำผิดหมวด / ไม่อยู่ในคลัง / ว่าง</span><strong>0</strong></div><p>แข่งครบจำนวนรอบที่ตั้งค่า ใครคะแนนรวมสูงสุดชนะ!</p></div>
          <button className="invite-card" onClick={share}><span>⤴</span><span><b>{copied?'คัดลอกลิงก์แล้ว':'ชวนเพื่อนมาเล่น'}</b><small>แชร์ลิงก์ ไม่ต้องใช้รหัสห้อง</small></span><span>↗</span></button>
        </aside>
      </div>}
    </main>
    <footer className="footer container"><span>คำไว — เกมคำไทยออนไลน์</span><span>28 หมวดที่ตรวจรับแล้ว · เจ้าของห้องตั้งเวลา หมวด และรอบได้</span></footer>
    {help?<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setHelp(false);}} role="presentation"><section className="help-modal" role="dialog" aria-modal="true" aria-label="วิธีเล่น"><button onClick={()=>setHelp(false)} className="modal-close" aria-label="ปิด">×</button><div className="eyebrow tiny">HOW TO PLAY</div><h2>วิธีเล่นคำไว</h2><ol><li>เจ้าของใส่ชื่อและสร้างห้อง เลือกจำนวนรอบ หมวด และเวลา แล้วแชร์ลิงก์ให้เพื่อน</li><li>เมื่อมีอย่างน้อย 2 คน เจ้าของห้องกดเริ่ม เกมจะสุ่มตัวอักษรและหมวดตามที่ตั้งไว้</li><li>พิมพ์คำที่ขึ้นต้นด้วยตัวอักษรที่สุ่มให้ตรงหมวดภายในเวลาที่เจ้าของห้องเลือก แล้วกดส่ง</li><li>คำถูกต้องตรงหมวดและพยัญชนะต้น ไม่ซ้ำได้ 20 คะแนน ซ้ำกับเพื่อนได้ 10 คะแนน</li><li>แข่งขันตามจำนวนรอบที่เลือก รวมคะแนนทั้งหมดเพื่อหาผู้ชนะ</li></ol><p className="help-note">ระบบตรวจคำตรงหมวดและพยัญชนะต้นจากคลังคำที่ตรวจรับแล้ว คำจริงที่ยังไม่อยู่ในคลังจะไม่ได้คะแนนจนกว่าจะเพิ่มคำ กรุณาแจ้งผู้ดูแลเพื่อพิจารณาเพิ่ม</p><button className="primary-btn" onClick={()=>setHelp(false)}>เข้าใจแล้ว <span>✓</span></button></section></div>:null}
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
