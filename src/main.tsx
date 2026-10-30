import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import './style.css';
import { GameAudio, readAudioMuted, writeAudioMuted, type AudioScene } from './audio.ts';
import { validRoundAnswer,wordInitialForCategory,normalizeAnswer } from '../amplify/functions/game/logic.ts';
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
const CATEGORY_PREFIX_HINTS:Readonly<Record<string,{prefix:string;example:string;letter:string;generic:string}>>={
  flower:{prefix:'ดอก',example:'ดอกเมฆอมยิ้ม',letter:'ม ม้า',generic:'ดอกไม้'},
  bird:{prefix:'นก',example:'นกจักรวาลอมยิ้ม',letter:'จ จาน',generic:'นก'},
  insect:{prefix:'แมลง',example:'แมลงรุ้งติดจรวด',letter:'ร เรือ',generic:'แมลง'},
  fish:{prefix:'ปลา',example:'ปลาประกายสายรุ้งวิเศษ',letter:'ป ปลา',generic:'ปลา'}
};
const SYMBOLS: Record<string,string> = {
  animal:'🐾', sport:'🏆', job:'💼', verb:'✎', fruit:'🍋', vegetable:'🥬', food:'🥣', drink:'🥤',
  province:'📍', country:'🌎', city:'🏙', music:'♫', body:'♥', clothing:'👕', vehicle:'🚘',
  device:'⚡', school:'✏', plant:'🌿', flower:'✿', tree:'🌳', object:'◈', color:'🎨', cartoon:'✦',
  film:'▣', person:'♟', adjective:'✳', science:'⚗', technology:'⌘', place:'⌂',
  festival:'🎏', toy:'✦', fish:'🐟', insect:'🐝', bird:'🕊', dessert:'🍩', nature:'☘',
  furniture:'▤', material:'⬡', health:'✚', tool:'⚒', fiction:'📖', transport:'➤'
};
type GameSettings = {rounds:number;categories:number;seconds:number;mode?:'letter'|'category'};
const DEFAULT_SETTINGS:GameSettings={rounds:3,categories:5,seconds:40};
const TIME_OPTIONS=[20,30,40,50,60,75,90,120];
type SettingKey=keyof GameSettings;
const SETTINGS_CHOICES:{field:SettingKey;label:string;unit:string;options:number[]}[]=[
  {field:'rounds',label:'จำนวนรอบ',unit:'รอบ',options:Array.from({length:10},(_,i)=>i+1)},
  {field:'categories',label:'หมวดต่อรอบ',unit:'หมวด',options:Array.from({length:6},(_,i)=>i+3)},
  {field:'seconds',label:'เวลาตอบ',unit:'วินาที',options:TIME_OPTIONS}
];
type PublicRoom = {roomId:string;hostName:string;playerCount:number;createdAt:number;settings:GameSettings};
type Player = { id:string; name:string; score:number };
type Entry = { id:string; name:string; answers:Record<string,string>; points:number; perCategory:Record<string,number>; rarityBonus?:Record<string,number> };
type Round = {round:number; letter:string; categories:string[]; topicCategory?:string; entries:Entry[]};
type Game = {roomId:string; phase:'lobby'|'playing'|'review'|'final'; round:number; letter:string; topicCategory?:string;
  categories:string[]; deadline:number; countdown:number; players:Player[]; submitted:string[];
  history:Round[]; revision:number; ownerId:string; settings:GameSettings; you?:string;
  skipVotes?:string[]; rematchVotes?:string[];
  timeRush?:{start:number;ends:number;from:number};
};
type Api = any;
function unpack(value:unknown):any {
  if(typeof value === 'string') { try { return JSON.parse(value); } catch { return value; } }
  return value;
}
/** Ignore public-directory polls whose visible content has not changed. */
function sameRoomListings(before:readonly PublicRoom[],after:readonly PublicRoom[]):boolean {
  return before.length===after.length && before.every((room,i)=>{
    const next=after[i];
    return room.roomId===next.roomId && room.hostName===next.hostName &&
      room.playerCount===next.playerCount && room.createdAt===next.createdAt &&
      room.settings.rounds===next.settings.rounds &&
      room.settings.categories===next.settings.categories &&
      room.settings.seconds===next.settings.seconds &&
      room.settings.mode===next.settings.mode;
  });
}
function remainingForAutosave(game:Game,now:number){
  return Math.max(0,Math.ceil((game.deadline-now)/1000));
}
function secondsUntil(when:number, now:number){return Math.max(0,Math.ceil((when-now)/1000));}
function timeLabel(s:number){return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;}
function SoundIcon({muted}:{muted:boolean}){return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{muted?<path d="m16 9 5 6m0-6-5 6"/>:<><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></>}</svg>}
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
  const [exitConfirm,setExitConfirm] = useState(false);
  const [choicePopup,setChoicePopup] = useState<SettingKey|null>(null);
  const [audioMuted,setAudioMuted] = useState(readAudioMuted);
  const [audioNotice,setAudioNotice] = useState<{message:string;sequence:number}|null>(null);
  const audioNoticeSequenceRef=useRef(0);
  const audioRef = useRef<GameAudio|null>(null);
  const audioStateRef = useRef<{roomId:string;round:number;phase:AudioScene;remaining:number}|null>(null);
  const dialogRef = useRef<HTMLElement|null>(null);
  const openerRef = useRef<HTMLButtonElement|null>(null);
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
  // Keep short audio feedback outside the page flow, including repeated notices.
  useEffect(()=>{
    if(!audioNotice)return;
    const sequence=audioNotice.sequence;
    const timeout=window.setTimeout(()=>setAudioNotice(current=>current?.sequence===sequence?null:current),3200);
    return()=>window.clearTimeout(timeout);
  },[audioNotice]);
  useEffect(()=>{
    const audio = new GameAudio(audioMuted);
    audioRef.current = audio;
    const unlock = () => audio.unlock();
    const visibility = () => audio.setHidden(document.hidden);
    // One delegated listener covers every current/future UI button, including
    // dynamically rendered room cards and popups, without per-key typing noise.
    const pointerFeedback = (event:PointerEvent) => {
      const target=event.target;
      if(!(target instanceof Element))return;
      const control=target.closest('button,input,textarea,select,label.answer-item');
      if(!control || control.matches(':disabled,.sound-toggle') ||
        (control.matches('label.answer-item') && control.querySelector('input:disabled')))return;
      audio.unlock();
      const cue=control.matches('input,textarea,select,label.answer-item')?'focus':
        control.matches('.room-mode,.settings-choice-trigger,.custom-popup-option')?'select':'tap';
      audio.cue(cue);
    };
    const keyboardFeedback = (event:KeyboardEvent) => {
      if(event.repeat || (event.key!=='Enter' && event.key!==' '))return;
      const target=event.target;
      if(!(target instanceof Element) || !target.matches('button:not(:disabled):not(.sound-toggle)'))return;
      audio.unlock();
      audio.cue(target.matches('.room-mode,.settings-choice-trigger,.custom-popup-option')?'select':'tap');
    };
    document.addEventListener('pointerdown',pointerFeedback,{capture:true,passive:true});
    document.addEventListener('pointerdown',unlock,{passive:true});
    document.addEventListener('touchstart',unlock,{passive:true});
    document.addEventListener('click',unlock);
    document.addEventListener('keydown',unlock);
    document.addEventListener('keydown',keyboardFeedback);
    document.addEventListener('visibilitychange',visibility);
    return()=>{
      document.removeEventListener('pointerdown',pointerFeedback,true);
      document.removeEventListener('pointerdown',unlock);
      document.removeEventListener('touchstart',unlock);
      document.removeEventListener('click',unlock);
      document.removeEventListener('keydown',unlock);
      document.removeEventListener('keydown',keyboardFeedback);
      document.removeEventListener('visibilitychange',visibility);
      audio.dispose();audioRef.current=null;
    };
  },[]);
  // Trap keyboard focus in custom dialogs and allow Escape without native browser UI.
  useEffect(()=>{
    if(!exitConfirm && !choicePopup)return;
    const dialog=dialogRef.current;
    dialog?.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const keyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        event.preventDefault();
        setExitConfirm(false);setChoicePopup(null);
        openerRef.current?.focus();
      }else if(event.key==='Tab' && dialog){
        const focusable=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled)'));
        if(!focusable.length)return;
        const first=focusable[0],last=focusable[focusable.length-1];
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',keyDown);
    return()=>{document.removeEventListener('keydown',keyDown);document.body.style.overflow=previousOverflow;};
  },[exitConfirm,choicePopup]);
  // Update only timed screens; preserve quick ticks during the skip animation.
  useEffect(()=>{
    if(game?.phase!=='playing' && game?.phase!=='review')return;
    const tick=()=>{if(!document.hidden)setNow(Date.now());};
    const onVisibility=()=>{if(!document.hidden)tick();};
    tick();
    const id=window.setInterval(tick,game.phase==='playing'&&game.timeRush?100:1000);
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.clearInterval(id);document.removeEventListener('visibilitychange',onVisibility);};
  },[game?.roomId,game?.phase,game?.timeRush?.start]);
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
    if(current.current && current.current.roomId===next.roomId && next.revision<=current.current.revision) return;
    if(next.round !== roundRef.current){
      if(draftTimerRef.current)clearTimeout(draftTimerRef.current);
      draftTimerRef.current=null;
      answersRef.current={};draftVersionRef.current=0;savedVersionRef.current=0;
      setAnswers({});setDraftStatus('idle');roundRef.current=next.round;
    }
    if(next.phase!=='playing' && draftTimerRef.current){
      clearTimeout(draftTimerRef.current);draftTimerRef.current=null;
    }
    if(next.phase==='lobby' && current.current?.phase!=='lobby')setDraftSettings(next.settings);
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
      localStorage.setItem('khamwai-active-room',next.roomId);
      accept(next.snapshot);
      setDraftSettings(next.snapshot.settings);
      audioRef.current?.cue('join');
      // Keep the browser on the one public game URL.
      if(window.location.search)history.replaceState({},'',location.pathname);
    }catch(e){setError(e instanceof Error?e.message:'เข้าร่วมเกมไม่สำเร็จ');}
    finally{setWorking(false);workingRef.current=false;}
  };
  const leave=async()=>{
    audioRef.current?.cue('exit');
    const old=roomRef.current;
    roomRef.current=''; meRef.current='';setMe('');setGame(null);current.current=null;roundRef.current=0;setAnswers({});
    if(localStorage.getItem('khamwai-active-room')===old)localStorage.removeItem('khamwai-active-room');
    if(draftTimerRef.current)clearTimeout(draftTimerRef.current);
    draftTimerRef.current=null;answersRef.current={};draftVersionRef.current=0;savedVersionRef.current=0;setDraftStatus('idle');
    setMode('join');
    try {await call('leave',old);}catch {/* Guest expires automatically if offline. */}
  };
  // The same Cognito guest credentials are reused across tabs in one browser
  // profile. Restore the room by server re-join: the same guest ID cannot
  // occupy two player slots in that room.
  useEffect(()=>{
    if(!client || roomRef.current)return;
    const saved=localStorage.getItem('khamwai-active-room');
    const nickname=localStorage.getItem('khamwai-name');
    if(!saved || !/^room-[a-f0-9]{20}$/.test(saved)||!nickname)return;
    let stopped=false;
    (async()=>{
      try{
        const result=await call('join',saved,nickname);
        if(stopped || roomRef.current)return;
        roomRef.current=result.roomId;
        meRef.current=result.snapshot.you||'';
        setMe(meRef.current);roundRef.current=0;current.current=null;
        accept(result.snapshot);setDraftSettings(result.snapshot.settings);
      }catch{
        // The saved room may have expired or this identity already left it.
        if(!stopped && localStorage.getItem('khamwai-active-room')===saved)
          localStorage.removeItem('khamwai-active-room');
      }
    })();
    return()=>{stopped=true;};
  },[client,call,accept]);
  useEffect(()=>{
    if(!client || game || mode!=='join')return;
    const api=client as any;
    let stopped=false;
    let updating=false;
    const refreshRooms=async()=>{
      if(updating || stopped || document.hidden)return;
      updating=true;
      try {
        const response=await api.queries.listRooms({}, {authMode:'identityPool'});
        if(response.errors?.length)throw new Error(response.errors.map((entry:{message:string})=>entry.message).join('; '));
        const value=unpack(response.data);
        if(!Array.isArray(value))throw new Error('รูปแบบรายการห้องไม่ถูกต้อง');
        if(!stopped){setRooms(previous=>sameRoomListings(previous,value as PublicRoom[])?previous:value as PublicRoom[]);setRoomsError('');}
      }catch(err){
        if(!stopped)setRoomsError(err instanceof Error?err.message:'โหลดรายชื่อห้องไม่สำเร็จ');
      }finally{updating=false;if(!stopped)setRoomsLoading(false);}
    };
    void refreshRooms();
    const interval=window.setInterval(()=>void refreshRooms(),3000);
    const onVisibility=()=>{if(!document.hidden)void refreshRooms();};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{stopped=true;clearInterval(interval);document.removeEventListener('visibilitychange',onVisibility);};
  },[client,game?.roomId,mode]);
  useEffect(()=>{
    if(!client||!me||!game?.roomId)return;
    const id=game.roomId;
    const api=client as any;
    let stopped=false;
    let refreshing=false;
    // Avoid concurrent server reads; refresh immediately when the tab resumes.
    const refresh=async()=>{
      if(stopped || refreshing || document.hidden)return;
      refreshing=true;
      try {
        const result=await api.queries.getGame({roomId:id},{authMode:'identityPool'});
        if(!stopped && !result.errors?.length)accept(result.data);
      }catch(e){if(!stopped)console.warn('Refresh failed',e);}
      finally{refreshing=false;}
    };
    const timer=window.setInterval(()=>void refresh(),2000);
    const heartbeat=window.setInterval(async()=>{
      if(stopped || workingRef.current)return;
      try {const latest=await call('pulse',id);if(!stopped)accept(latest.snapshot);}
      catch(e){if(!stopped)console.warn('Heartbeat failed',e);}
    },5000);
    void refresh();
    const onVisibility=()=>{if(!document.hidden)void refresh();};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{stopped=true;clearInterval(timer);clearInterval(heartbeat);document.removeEventListener('visibilitychange',onVisibility);};
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
    const previousWord=answersRef.current[category]||'';
    if(value.trim() && !validRoundAnswer(normalizeAnswer(previousWord),state.letter,category,state.topicCategory) &&
       validRoundAnswer(normalizeAnswer(value),state.letter,category,state.topicCategory))audioRef.current?.cue('answer');
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
  async function vote(action:'skip'|'rematch') {
    if(!roomRef.current||workingRef.current||!current.current)return;
    const state=current.current;
    if(action==='skip' && (state.phase!=='playing'||state.skipVotes?.includes(meRef.current)||state.timeRush))return;
    if(action==='rematch' && (state.phase!=='final'||state.rematchVotes?.includes(meRef.current)))return;
    workingRef.current=true;setWorking(true);setError('');
    try{
      // Flush the last edited answer before requesting a shortened timer.
      if(action==='skip' && draftVersionRef.current>savedVersionRef.current)
        await flushDraft();
      const result=await call(action,state.roomId);
      accept(result.snapshot);
    }catch(e){setError(e instanceof Error?e.message:'โหวตไม่สำเร็จ');}
    finally{workingRef.current=false;setWorking(false);}
  }
  async function ownerAction(action:'settings'|'start') {
    if(!game||workingRef.current||game.ownerId!==me)return;
    workingRef.current=true;setWorking(true);setError('');
    try {
      const next=await call(action,game.roomId,undefined,undefined,(action==='settings'||action==='start')?draftSettings:undefined);
      accept(next.snapshot);
    }catch(e){setError(e instanceof Error?e.message:'ดำเนินการไม่สำเร็จ');}
    finally{workingRef.current=false;setWorking(false);}
  }
  function closeCustomDialog(){
    setExitConfirm(false);setChoicePopup(null);
    openerRef.current?.focus();
  }
  function openSetting(field:SettingKey,button:HTMLButtonElement){
    openerRef.current=button;
    setChoicePopup(field);
  }
  function confirmExit(){
    setExitConfirm(false);
    void leave();
  }
  // Word checks do not depend on the timer or the latest server heartbeat.
  const answerStates=useMemo(()=>{
    const states:Record<string,'empty'|'accepted'|'wrong-letter'|'unknown'>={};
    if(!game || game.phase!=='playing')return states;
    for(const id of game.categories){
      const typed=normalizeAnswer(answers[id]);
      const category=game.topicCategory||id;
      const requestedLetter=game.topicCategory?id:game.letter;
      states[id]=!typed?'empty':validRoundAnswer(typed,game.letter,id,game.topicCategory)
        ?'accepted':wordInitialForCategory(typed,category)!==requestedLetter?'wrong-letter':'unknown';
    }
    return states;
  },[answers,game?.phase,game?.round,game?.letter,game?.topicCategory,game?.categories]);
  const activeChoice=SETTINGS_CHOICES.find(choice=>choice.field===choicePopup);
  const activeChoiceLabel=activeChoice?.field==='categories'&&draftSettings.mode==='category'?'จำนวนคำต่อรอบ':activeChoice?.label;
  const settingsControls=<>
    <div className="game-mode-picker" role="group" aria-label="เลือกโหมดเกม">
      <button type="button" className={draftSettings.mode!=='category'?'game-mode-option active':'game-mode-option'}
        aria-pressed={draftSettings.mode!=='category'}
        onClick={()=>setDraftSettings(s=>({...s,mode:'letter'}))}><strong>โหมดพยัญชนะ</strong><small>อักษรเดียว หลายหมวด</small></button>
      <button type="button" className={draftSettings.mode==='category'?'game-mode-option active':'game-mode-option'}
        aria-pressed={draftSettings.mode==='category'}
        onClick={()=>setDraftSettings(s=>({...s,mode:'category'}))}><strong>โหมดหมวดใหญ่</strong><small>หมวดเดียว หลายอักษร</small></button>
    </div>
    <div className="settings-grid">{SETTINGS_CHOICES.map(choice=><div className="settings-choice-field" key={choice.field}>
      <span className="settings-choice-label">{choice.field==='categories'&&draftSettings.mode==='category'?'จำนวนคำต่อรอบ':choice.label}</span>
      <button type="button" className="settings-choice-trigger" aria-label={`เลือก${choice.field==='categories'&&draftSettings.mode==='category'?'จำนวนคำต่อรอบ':choice.label} ค่าปัจจุบัน ${draftSettings[choice.field]} ${choice.field==='categories'&&draftSettings.mode==='category'?'คำ':choice.unit}`} aria-haspopup="dialog" aria-expanded={choicePopup===choice.field}
        onClick={e=>openSetting(choice.field,e.currentTarget)}><span>{draftSettings[choice.field]} {choice.field==='categories'&&draftSettings.mode==='category'?'คำ':choice.unit}</span><span className="settings-chevron" aria-hidden="true">⌄</span></button>
    </div>)}</div>
  </>;
  const playing=game?.phase==='playing';
  const isOwner=Boolean(game && me===game.ownerId);
  const remaining=game&&game.deadline?secondsUntil(game.deadline,now):0;
  const rushing=Boolean(playing && game?.timeRush && now<game.timeRush.ends);
  const displayedRemaining=rushing && game?.timeRush
    ?Math.max(5,Math.ceil(game.timeRush.from-
      (game.timeRush.from-5)*(now-game.timeRush.start)/
      Math.max(1,game.timeRush.ends-game.timeRush.start)))
    :remaining;
  const skipCount=game?.skipVotes?.length||0;
  const rematchCount=game?.rematchVotes?.length||0;
  const hasSkipped=Boolean(game?.skipVotes?.includes(me));
  const hasRematched=Boolean(game?.rematchVotes?.includes(me));
  useEffect(()=>{
    const scene:AudioScene=game?.phase??'home';
    const audio=audioRef.current;
    audio?.setScene(scene,remaining);
    const previous=audioStateRef.current;
    if(previous && game && previous.roomId===game.roomId){
      if(scene==='playing' && (previous.phase!=='playing'||previous.round!==game.round)){
        audio?.cue('start');
      }else if(scene==='review' && previous.phase==='playing'){
        audio?.cue('review');
      }else if(scene==='final' && previous.phase!=='final'){
        audio?.cue('finish');
      }
      if(scene==='playing' && remaining>=1 && remaining<=5 &&
        (previous.phase!=='playing'||previous.round!==game.round||previous.remaining!==remaining)){
        audio?.countdown(remaining);
      }
      if(scene==='playing' && previous.phase==='playing' && previous.round===game.round &&
        remaining===0 && previous.remaining>0)audio?.cue('timeout');
    }
    audioStateRef.current={roomId:game?.roomId||'',round:game?.round||0,phase:scene,remaining};
  },[game?.roomId,game?.phase,game?.round,remaining]);
  function announceAudio(message:string){setAudioNotice({message,sequence:++audioNoticeSequenceRef.current});}
  function toggleAudio(){
    const next=!audioMuted;
    writeAudioMuted(next);
    setAudioMuted(next);
    announceAudio(next?'ปิดเสียงเพลงและเอฟเฟกต์แล้ว':'เปิดเสียงเพลงและเอฟเฟกต์แล้ว');
    audioRef.current?.setMuted(next);
    if(!next)audioRef.current?.cue('tap');
  }
  const ordered=(game?.players||[]).slice().sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'th'));
  const latest=game?.history.at(-1);
  const leaders=ordered.filter(p=>p.score===ordered[0]?.score);
  return <div className="app-shell">
    <div className="ambient ambient-left"/><div className="ambient ambient-right"/>
    <header className={playing?'topbar container topbar-playing':'topbar container'}>
      <a href="/" className="logo" aria-label="คำไว หน้าหลัก"><span className="logo-mark">ค</span><span>คำ<span className="logo-accent">ไว</span><small>THAI WORD PARTY</small></span></a>
      <div className="top-actions"><span className="live-pill"><span className="live-dot"/>{status==='ready'?'เล่นออนไลน์':'AWS CLOUD'}</span><button type="button" className="sound-toggle" aria-label={audioMuted?'เปิดเสียงเพลงและเอฟเฟกต์':'ปิดเสียงเพลงและเอฟเฟกต์'} aria-pressed={!audioMuted} title={audioMuted?'เปิดเสียง':'ปิดเสียง'} onClick={toggleAudio}><SoundIcon muted={audioMuted}/><span className="sound-button-text">{audioMuted?'เปิดเสียง':'ปิดเสียง'}</span></button><button className="ghost-btn" onClick={()=>setHelp(true)}><span className="help-dot">?</span> วิธีเล่น</button></div>
    </header>
    <div className="audio-toast-region" aria-live="polite" aria-atomic="true">{audioNotice?<p className="audio-notice" role="status">{audioNotice.message}</p>:null}</div>
    <main className="container">
      {!game ? <div className="welcome-layout">
        <section className="welcome-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> เกมคำศัพท์ปาร์ตี้ออนไลน์</div>
          <h1>คิดให้ไว <span>ตอบให้ทัน</span><br/>แล้วมาวัดกัน!</h1>
          <p className="lead">เลือกเล่นได้สองโหมด สุ่มพยัญชนะหรือสุ่มหมวดใหญ่ แข่งตอบคำให้ตรงโจทย์กับเพื่อนแบบออนไลน์!</p>
          <div className="floating-letters" aria-hidden="true"><div className="float-card first">ก<span>ไก่</span></div><div className="float-card second">ส<span>เสือ</span></div><div className="float-card third">ม<span>ม้า</span></div></div>
        </section>
        <section className="join-card">
          <div className="card-deco"><span>✳</span><span>✿</span></div>
          <div className="card-label">READY TO PLAY?</div>
          <div className="room-mode-switch" role="group" aria-label="เลือกวิธีเล่น">
            <button type="button" className={mode==='create'?'room-mode active':'room-mode'} aria-pressed={mode==='create'} onClick={()=>{setMode('create');setError('');}}>สร้างห้อง</button>
            <button type="button" className={mode==='join'?'room-mode active':'room-mode'} aria-pressed={mode==='join'} onClick={()=>{setMode('join');setError('');}}>เข้าร่วมห้อง</button>
          </div>
          <div className="room-intro"><h2>{mode==='join'?'ห้องที่กำลังรอผู้เล่น':'สร้างห้องใหม่'}</h2><p className="muted">{mode==='join'?'ห้องที่เพื่อนสร้างจะปรากฏอัตโนมัติ กดเข้าร่วมได้ทันที':'ตั้งค่าจำนวนรอบ หมวด และเวลา จากนั้นรอเพื่อนเข้ามา'}</p></div>
          <label htmlFor="nickname">ชื่อเล่นของคุณ</label>
          <input id="nickname" maxLength={18} autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&mode==='create')void join();}} placeholder="เช่น เจ้าแม่คำศัพท์" />
          <div className="room-mode-content">
          {mode==='join'?<div className="public-room-browser">
            <div className="public-room-heading"><strong>ห้องที่เปิดอยู่</strong><span>อัปเดตทุก 3 วินาที</span></div>
            {roomsError?<p role="alert" className="error-message">โหลดห้องไม่สำเร็จ: {roomsError}</p>:null}
            {roomsLoading?<p className="notice">กำลังค้นหาห้องออนไลน์...</p>:
            rooms.length===0?<div className="empty-rooms"><strong>ยังไม่มีห้องที่รอผู้เล่น</strong><p>ให้เพื่อนคนหนึ่งกดสร้างห้องก่อน ห้องจะปรากฏที่นี่อัตโนมัติ</p><button type="button" className="secondary-btn" onClick={()=>setMode('create')}>สร้างห้องใหม่</button></div>:
            <div className="public-room-list">{rooms.map(room=><div className="public-room-card" key={room.roomId}>
              <div className="public-room-description"><strong>ห้องของ {room.hostName}</strong><span>● {room.playerCount}/8 คน · {room.settings.rounds} รอบ · {room.settings.mode==='category'?'หมวดใหญ่':'พยัญชนะ'} · {room.settings.categories} {room.settings.mode==='category'?'คำ':'หมวด'} · {room.settings.seconds} วินาที</span></div>
              <button type="button" className="public-room-join" disabled={working||status!=='ready'} onClick={()=>void join(room.roomId)}>{working?'กำลังเข้า...':'เข้าร่วม'}</button>
            </div>)}</div>}
          </div>:<div className="settings-panel welcome-settings"><h3>ตั้งค่าเกมของคุณ</h3>
            {settingsControls}</div>}
          {mode==='create'?<button className="primary-btn" disabled={working||status!=='ready'} onClick={()=>void join()}>{working?'กำลังสร้างห้อง...':'สร้างห้อง'} <span>↗</span></button>:null}
          </div>
          {status==='loading'?<p className="notice">กำลังเชื่อมต่อเซิร์ฟเวอร์ AWS…</p>:null}
          {error?<p className="error-message" role="alert">{error}</p>:null}
          {status==='error'&&!error?<p className="error-message">ไม่สามารถเชื่อมต่อระบบออนไลน์</p>:null}
        </section>
      </div> : <div className={playing?'game-layout game-layout-playing':'game-layout'}>
        <section className="game-main">
          <div className="game-status-row"><div><span className="eyebrow tiny">LIVE MATCH <span className="gold-dot">●</span></span><h1 className="game-heading">{game.phase==='lobby'?'รอเพื่อนมาร่วมสนุก':game.phase==='playing'?'ได้เวลาประลองคำ!':game.phase==='review'?'เฉลยคำตอบรอบนี้':'จบเกมแล้ว!'}</h1></div><button type="button" className="exit-btn" onClick={e=>{openerRef.current=e.currentTarget;setExitConfirm(true);}}>ออกจากเกม ×</button></div>
          {error?<p className="error-message" role="alert">{error}</p>:null}
          <div className="game-meta"><span className="round-marker">{game.round?`รอบ ${game.round} / ${game.settings.rounds}`:'ห้องของเพื่อน'}</span><span className="people-marker">◉ {game.players.length} / 8 คน</span></div>
          {game.phase==='lobby'?<div className="lobby-view">
            <div className="lobby-visual"><div className="lobby-ring one"/><div className="lobby-ring two"/><span className="lobby-letter">{isOwner?'จ':'ร'}<span>◈</span></span></div>
            <h2>{isOwner?'เจ้าของห้อง':'รอเจ้าของห้องเริ่มเกม'}</h2>
            <p>{isOwner?(game.players.length<2?'รอเพื่อนกดเข้าร่วมห้องจากหน้าเกม':'ทุกคนพร้อมแล้ว กดเริ่มเกมได้เลย'):'เจ้าของห้องจะเริ่มเกมเมื่อพร้อม'}</p>
            <div className="public-room-notice">{isOwner?'ห้องของคุณแสดงอยู่ในหน้าเข้าร่วมห้องของทุกคนโดยอัตโนมัติ':'อยู่ในห้องแล้ว รอเจ้าของห้องเริ่มเกมได้เลย'}</div>
            {isOwner?<div className="settings-panel lobby-settings"><h3>ตั้งค่าห้อง</h3>
              {settingsControls}
              <button className="secondary-btn settings-save" disabled={working} onClick={()=>void ownerAction('settings')}>บันทึกการตั้งค่า</button>
              <button className="primary-btn" disabled={working||game.players.length<2} onClick={()=>void ownerAction('start')}>เริ่มเกม {game.players.length} คน <span>→</span></button>
            </div>:<div className="waiting-settings">การตั้งค่าห้อง: {game.settings.rounds} รอบ · {game.settings.mode==='category'?'โหมดหมวดใหญ่':'โหมดพยัญชนะ'} · {game.settings.categories} {game.settings.mode==='category'?'คำ':'หมวด'} · {game.settings.seconds} วินาที<br/>เจ้าของห้อง: {game.players.find(p=>p.id===game.ownerId)?.name||'กำลังรอเจ้าของห้อง'}</div>}
            <div className="lobby-tip">ทุกคนเปิดหน้าเว็บเกมเดียวกันแล้วกดเข้าร่วมได้ทันที · เจ้าของห้องเป็นคนกดเริ่มเกม</div>
          </div>:null}
          {playing?<><div className="challenge-banner"><div><div className="banner-label">{game.topicCategory?'หมวดใหญ่ประจำรอบ':'พยัญชนะประจำรอบ'}</div><div className={game.topicCategory?'letter-display category-display':'letter-display'}>{game.topicCategory?LABELS[game.topicCategory]||game.topicCategory:game.letter}</div><div className="letter-caption">{game.topicCategory?'แต่ละคำจะได้พยัญชนะต่างกัน':letterCaption(game.letter)}</div></div><div className="time-box"><span className={rushing||displayedRemaining<=5?'countdown-alert':''}>{rushing?'เร่งเวลา!':displayedRemaining>0&&displayedRemaining<=5?'รีบตอบ!':'เวลาที่เหลือ'}</span><strong key={rushing?'rush':displayedRemaining} className={rushing?'rush-time':displayedRemaining<=5?'countdown-pulse':displayedRemaining<=15?'urgent':''} aria-label={`เหลือ ${displayedRemaining} วินาที`}>{displayedRemaining<=5?displayedRemaining:timeLabel(displayedRemaining)}</strong><div className={rushing||displayedRemaining<=5?'time-track critical-track':'time-track'}><div style={{width:`${Math.min(100,displayedRemaining/game.settings.seconds*100)}%`}}/></div></div></div>
            <div className="answer-head"><div><h2>ตอบให้ครบ {game.categories.length} {game.topicCategory?'คำ':'หมวด'}</h2><p>{game.topicCategory?<>ตอบคำหมวด <b>“{LABELS[game.topicCategory]||game.topicCategory}”</b> ให้ตรงพยัญชนะของแต่ละช่อง · ตรวจทันที</>:<>ทุกคำต้องขึ้นต้นด้วย <b>“{letterCaption(game.letter)}”</b> · ตรวจคำขณะพิมพ์</>}</p></div><span className="progress-tag">{game.categories.filter(id=>answers[id]?.trim()).length}/{game.categories.length} คำ</span></div>
            <div className="answer-list">{game.categories.map((id,index)=>{
              const category=game.topicCategory||id;
              const requestedLetter=game.topicCategory?id:game.letter;
              const state=answerStates[id]||'empty';
              const hasPrefixHint=category==='dessert'||category==='tree'||
                Object.prototype.hasOwnProperty.call(CATEGORY_PREFIX_HINTS,category);
              return <label className={`answer-item answer-${state} ${hasPrefixHint&&(!game.topicCategory||index===0)?'answer-item-with-hint':''}`} key={`${game.round}-${id}`}>
                <span className="answer-number">{String(index+1).padStart(2,'0')}</span>
                <span className="answer-symbol">{game.topicCategory?requestedLetter:SYMBOLS[id]||'✦'}</span>
                <span className="answer-category">
                  <span className="answer-text">{game.topicCategory?letterCaption(id):LABELS[id]||id}</span>
                  {(id==='dessert'||(game.topicCategory==='dessert'&&index===0))?<span className="answer-category-hint">
                    เติม “ขนม” นำหน้าได้ แต่ให้นับอักษรของชื่อขนมที่ตามมา เช่น “ขนมจรวดสายรุ้ง” นับ จ จาน
                    <span className="answer-hint-note">ตัวอย่างสมมติ ไม่ใช่คำตอบจริง · “ขนม” คำเดียวใช้ไม่ได้</span>
                  </span>:null}
                  {(id==='tree'||(game.topicCategory==='tree'&&index===0))?<span className="answer-category-hint">
                    เติม “ต้น” นำหน้าได้ แต่ให้นับอักษรของชื่อต้นไม้ที่ตามมา เช่น “ต้นประกายเมฆ” นับ ป ปลา
                    <span className="answer-hint-note">ตัวอย่างสมมติ ไม่ใช่คำตอบจริง · “ต้น” หรือ “ต้นไม้” คำเดียวใช้ไม่ได้</span>
                  </span>:null}
                  {CATEGORY_PREFIX_HINTS[category]&&(!game.topicCategory||index===0)?<span className="answer-category-hint">
                    เติม “{CATEGORY_PREFIX_HINTS[category].prefix}” นำหน้าได้ แต่ไม่นับคำนำหน้าเป็นพยัญชนะต้น
                    เช่น “{CATEGORY_PREFIX_HINTS[category].example}” นับ {CATEGORY_PREFIX_HINTS[category].letter}
                    <span className="answer-hint-note">ตัวอย่างสมมติ ไม่ใช่คำตอบจริง · “{CATEGORY_PREFIX_HINTS[category].generic}” คำเดียวใช้ไม่ได้</span>
                  </span>:null}
                </span>
                <span className="answer-input-wrap">
                  <input disabled={remaining===0} maxLength={48} value={answers[id]||''}
                    onChange={e=>updateWord(id,e.target.value)}
                    onBlur={()=>void flushDraft()}
                    placeholder={game.topicCategory?`คำขึ้นต้นด้วย ${letterCaption(id)}...`:'พิมพ์คำตอบ...'} aria-label={game.topicCategory?`คำหมวด${LABELS[game.topicCategory]} ขึ้นต้นด้วย ${letterCaption(id)}`:`คำตอบหมวด${LABELS[id]}`}/>
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
          {game.phase==='review'&&latest?<div className="results-view"><div className="results-round">ROUND {latest.round} COMPLETE</div><h2>แต้มรอบนี้มาแล้ว!</h2><p>{latest.topicCategory?'หมวดใหญ่':'พยัญชนะ'} <strong className="gold-text">{latest.topicCategory?LABELS[latest.topicCategory]||latest.topicCategory:letterCaption(latest.letter)}</strong> · {latest.round>=game.settings.rounds?'กำลังสรุปคะแนน':`รอบถัดไปใน ${remaining} วินาที`}</p>
            <div className="round-results">{latest.entries.slice().sort((a,b)=>b.points-a.points).map((e,i)=><div className="result-person" key={e.id}><span className="rank-bubble">{i+1}</span><span>{e.name} {e.id===me?'(คุณ)':''}</span><strong>+{e.points} คะแนน</strong></div>)}</div>
            <div className="review-grid">{latest.categories.map(id=><div className="review-category" key={id}><h3>{latest.topicCategory?letterCaption(id):SYMBOLS[id]+' '+LABELS[id]}</h3>{latest.entries.map(e=><div key={e.id}><span>{e.name}: {e.answers[id]||'—'}{e.rarityBonus?.[id]?<small className="rarity-bonus"> · คำหายาก +{e.rarityBonus[id]}</small>:null}</span><b>+{e.perCategory[id]}</b></div>)}</div>)}</div>
            {latest.topicCategory?latest.categories.slice(0,3).map(id=><SynonymLearn key={id} letter={id} categories={[latest.topicCategory!]}/>):<SynonymLearn letter={latest.letter} categories={latest.categories}/>}
          </div>:null}
          {game.phase==='final'?<div className="final-view"><div className="final-crown">♛</div><p className="results-round">MATCH COMPLETE</p><h2>{leaders.length===1?`${leaders[0]?.name} ชนะการแข่งขัน!`:'เสมอกัน! เก่งทุกคน'}</h2><p>จบครบ {game.settings.rounds} รอบแล้ว · ทุกคนโหวตเล่นอีกครั้งเพื่อกลับล็อบบี้ห้องเดิม</p><div className="final-podium">{ordered.map((p,i)=><div className="final-player" key={p.id}><span>{i===0?'♛':`#${i+1}`}</span><b>{p.name}{p.id===me?' (คุณ)':''}</b><strong>{p.score} <small>คะแนน</small></strong></div>)}</div>{game.history.map(round=><div key={round.round} className="synonym-history">
              <p>รอบ {round.round} · {round.topicCategory?LABELS[round.topicCategory]||round.topicCategory:letterCaption(round.letter)}</p>
              {round.topicCategory?round.categories.slice(0,3).map(id=><SynonymLearn key={id} letter={id} categories={[round.topicCategory!]}/>):<SynonymLearn letter={round.letter} categories={round.categories}/>}
            </div>)}<button className="primary-btn rematch-vote" type="button"
              aria-pressed={hasRematched} disabled={hasRematched||working}
              onClick={()=>void vote('rematch')}>{hasRematched?'ลงคะแนนแล้ว':'เล่นอีกครั้ง'} · {rematchCount}/{game.players.length}
              <span>{hasRematched?'✓':'↻'}</span></button>
            <p className="small-center">เมื่อทุกคนกดครบ จะกลับล็อบบี้ห้องเดิม พร้อมตั้งค่าเดิมโดยอัตโนมัติ</p></div>:null}
        </section>
        {playing?<button type="button" className={rushing?'skip-time-floating rush-active':'skip-time-floating'}
          disabled={working||hasSkipped||Boolean(game.timeRush)||remaining<=5}
          aria-pressed={hasSkipped}
          onClick={()=>void vote('skip')}>
          <span className="skip-time-symbol" aria-hidden="true">⏩</span>
          <span>{rushing?'กำลังเร่งเวลา':game.timeRush?'เร่งเวลาแล้ว':hasSkipped?'โหวตแล้ว':'ข้ามเวลา'}</span>
          <strong>{skipCount}/{game.players.length}</strong>
        </button>:null}
        <aside className="sidebar"><div className="score-card"><div className="sidebar-title"><span className="sidebar-icon"><TrophyIcon/></span><div><h3>ตารางคะแนน</h3><p>อัปเดตทุก 2 วินาที</p></div></div><div className="score-list">{ordered.map((p,i)=><div className={`score-player ${p.id===me?'its-you':''}`} key={p.id}><span className={`avatar av${i%5}`}>{p.name.charAt(0).toUpperCase()}</span><div className="player-info"><b>{p.name}{p.id===me?<small> คุณ</small>:null}</b><span>{i===0?'อันดับ 1':`อันดับ ${i+1}`}</span></div><strong>{p.score}</strong></div>)}</div>{ordered.length<8?<div className="score-footer">+ {8-ordered.length} ที่ว่างสำหรับเพื่อนของคุณ</div>:null}</div>
          <div className="rules-card"><div className="rules-icon">✦</div><h3>กติกาคะแนน</h3><div><span>คำถูกและไม่ซ้ำ</span><strong>+2</strong></div><div><span>คำถูกแต่ซ้ำ</span><strong>+1</strong></div><div><span>คำหายากที่ไม่ซ้ำ (เมื่อมีข้อมูลเพียงพอ)</span><strong>+1 ถึง +2</strong></div><div><span>คำผิดหมวด / ไม่อยู่ในคลัง / ว่าง</span><strong>0</strong></div><p>โบนัสคำหายากรวมสูงสุด +3 ต่อรอบ · หมวดและอักษรที่ข้อมูลไม่พอหรือไม่มีคำหายากยังเล่นตามคะแนนปกติ</p><p>แข่งครบจำนวนรอบที่ตั้งค่า ใครคะแนนรวมสูงสุดชนะ!</p></div>
          <div className="public-room-notice">เพื่อนเปิดเว็บไซต์คำไวเดียวกัน แล้วเลือกชื่อห้องที่รอผู้เล่นได้ทันที</div>
        </aside>
      </div>}
    </main>
    <footer className="footer container"><span>คำไว — เกมคำไทยออนไลน์</span><span>29 หมวดที่ตรวจรับแล้ว · เจ้าของห้องตั้งเวลา หมวด และรอบได้</span></footer>
    {exitConfirm?<div className="custom-popup-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)closeCustomDialog();}}>
      <section className="custom-popup custom-popup-confirm" ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="exit-dialog-title" aria-describedby="exit-dialog-description">
        <span className="custom-popup-kicker">CONFIRM EXIT</span>
        <h2 id="exit-dialog-title">ออกจากเกมหรือไม่?</h2>
        <p id="exit-dialog-description">คุณจะออกจากห้องนี้ทันที หากเกมกำลังเล่นอยู่จะไม่สามารถตอบคำในรอบนี้ต่อได้</p>
        <div className="custom-popup-actions">
          <button type="button" className="popup-cancel" data-initial-focus onClick={closeCustomDialog}>อยู่ในห้องต่อ</button>
          <button type="button" className="popup-danger" onClick={confirmExit}>ยืนยันออกเกม</button>
        </div>
      </section>
    </div>:null}
    {activeChoice?<div className="custom-popup-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)closeCustomDialog();}}>
      <section className="custom-popup custom-popup-picker" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
        <div className="custom-popup-title-row"><div><span className="custom-popup-kicker">GAME SETTINGS</span><h2 id="settings-dialog-title">เลือก{activeChoiceLabel}</h2></div>
          <button type="button" className="custom-popup-close" aria-label="ปิดตัวเลือก" onClick={closeCustomDialog}>×</button>
        </div>
        <div className="custom-popup-options" role="group" aria-label={activeChoice.label}>
          {activeChoice.options.map(value=><button key={value} type="button" data-initial-focus={value===draftSettings[activeChoice.field]?'':undefined}
            className={value===draftSettings[activeChoice.field]?'custom-popup-option selected':'custom-popup-option'}
            aria-pressed={value===draftSettings[activeChoice.field]}
            onClick={()=>{setDraftSettings(s=>({...s,[activeChoice.field]:value}));closeCustomDialog();}}>
            <span>{value} {activeChoice.field==='categories'&&draftSettings.mode==='category'?'คำ':activeChoice.unit}</span><span className="option-check" aria-hidden="true">{value===draftSettings[activeChoice.field]?'✓':''}</span>
          </button>)}
        </div>
        <p className="custom-popup-footnote">การตั้งค่าจะมีผลเมื่อสร้างห้องหรือบันทึกการตั้งค่า</p>
      </section>
    </div>:null}
    {help?<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setHelp(false);}} role="presentation"><section className="help-modal" role="dialog" aria-modal="true" aria-label="วิธีเล่น"><button onClick={()=>setHelp(false)} className="modal-close" aria-label="ปิด">×</button><div className="eyebrow tiny">HOW TO PLAY</div><h2>วิธีเล่นคำไว</h2><ol><li>คนหนึ่งกดสร้างห้อง เลือกโหมด จำนวนรอบ จำนวนหมวดหรือคำ และเวลา ส่วนเพื่อนเปิดเกมเดียวกันแล้วเลือกห้องจากรายการ</li><li>เมื่อมีอย่างน้อย 2 คน เจ้าของห้องกดเริ่ม โหมดพยัญชนะจะสุ่มอักษรเดียวกับหลายหมวด ส่วนโหมดหมวดใหญ่จะสุ่มหนึ่งหมวดและพยัญชนะไม่ซ้ำกันหลายตัว</li><li>พิมพ์คำที่ขึ้นต้นตามอักษรในโจทย์และตรงหมวดของช่องนั้น ระบบตรวจและบันทึกให้ทันทีโดยไม่ต้องกดส่ง</li><li>คำถูกต้องตรงหมวดและพยัญชนะต้น ไม่ซ้ำได้ 2 คะแนน ซ้ำกับเพื่อนได้ 1 คะแนน; คำหายากที่ไม่ซ้ำอาจได้โบนัส +1 ถึง +2 หลังระบบมีข้อมูลเพียงพอ (รวมโบนัสไม่เกิน +3 ต่อรอบ)</li><li>แข่งขันตามจำนวนรอบที่เลือก รวมคะแนนทั้งหมดเพื่อหาผู้ชนะ</li></ol><p className="help-note">ระบบตรวจคำตรงหมวดและพยัญชนะต้นจากคลังคำที่ตรวจรับแล้ว คำจริงที่ยังไม่อยู่ในคลังจะไม่ได้คะแนนจนกว่าจะเพิ่มคำ กรุณาแจ้งผู้ดูแลเพื่อพิจารณาเพิ่ม</p><button className="primary-btn" onClick={()=>setHelp(false)}>เข้าใจแล้ว <span>✓</span></button></section></div>:null}
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
