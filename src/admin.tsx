import {StrictMode,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Amplify} from 'aws-amplify';
import {generateClient} from 'aws-amplify/data';
import {initialConsonant,canonicalAnswer,normalizeAnswer} from '../amplify/functions/game/logic.ts';
import {DESSERT_SUBTYPES,dessertSubtype,dessertSubtypeLabel,type DessertSubtype} from './dessert-subtypes.ts';
import {letterCaption} from './letters.ts';
import {
  INBOX_STORAGE_KEY,normalizeInbox,addInboxWords,removeInboxWord,exportPendingWords
} from './admin-inbox.ts';
import {buildWordUsageCsv,type WordStatRecord} from './stats-export.ts';
import {
  ADMIN_SESSION_STORAGE_KEY,adminSessionRequest,readAdminSession,saveAdminSession,clearAdminSession,
  type SavedAdminSession
} from './admin-session-client.ts';
import {
  STORAGE_KEY,CATEGORY_OPTIONS,LETTER_OPTIONS,addDraft,dropDraft,normalizeDrafts,
  mergedBank,getEntries,filterEntries,exactEntries,exportDictionary,type Drafts
} from './admin-data.ts';
import './admin.css';
import {PopularityDashboard} from './admin-dashboard-view.tsx';
import {RarityDashboard} from './admin-rarity-view.tsx';
import {AdminBlocklistView} from './admin-blocklist-view.tsx';

function loadDrafts():Drafts{
  try{return normalizeDrafts(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}
  catch{return {};}
}
function loadInbox():string[]{
  try{return normalizeInbox(JSON.parse(localStorage.getItem(INBOX_STORAGE_KEY)||'[]'));}
  catch{return [];}
}
function unpack(value:unknown):any{
  if(typeof value==='string'){try{return JSON.parse(value);}catch{return null;}}
  return value;
}
function downloadFile(name:string,content:string,mime='text/plain;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const link=document.createElement('a');
  link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function queryStats():Promise<WordStatRecord[]>{
  const response=await fetch('/amplify_outputs.json',{cache:'no-store'});
  if(!response.ok)throw new Error('ไม่พบการตั้งค่า AWS Amplify');
  Amplify.configure(await response.json());
  const client=(generateClient as any)();
  const rows:WordStatRecord[]=[];
  let cursor:string|null=null,completed=false;
  for(let page=0;page<100;page++){
    const result=await client.queries.getWordStats({
      request:'stats',...(cursor?{cursor}:{})
    },{authMode:'identityPool'});
    if(result.errors?.length)throw new Error(result.errors.map((x:{message:string})=>x.message).join('; '));
    const data=unpack(result.data) as {items?:WordStatRecord[];nextToken?:string|null};
    if(!Array.isArray(data?.items))throw new Error('รูปแบบสถิติที่ได้รับไม่ถูกต้อง');
    rows.push(...data.items);
    cursor=data.nextToken||null;
    if(!cursor){completed=true;break;}
  }
  if(!completed)throw new Error('ข้อมูลสถิติเกินขนาดที่ส่งออกได้');
  return rows;
}
type AdminTab='overview'|'popularity'|'rarity'|'suggestions'|'blocked'|'search'|'edit'|'export';
const ADMIN_SECTIONS:{id:AdminTab;label:string;description:string}[]=[
  {id:'overview',label:'ภาพรวม',description:'ตัวเลขสำคัญและทางลัดไปยังเครื่องมือจัดการ'},
  {id:'popularity',label:'คำยอดนิยม',description:'สถิติการใช้งานคำศัพท์และคะแนนสะสม'},
  {id:'rarity',label:'ความหายาก',description:'ตรวจระดับโบนัสและข้อมูลความหายากรายหมวด'},
  {id:'suggestions',label:'คำเสนอแนะ',description:'ตรวจคำขนมที่ผู้เล่นเสนอเข้ามา'},
  {id:'blocked',label:'คำที่ถูกแบน',description:'ดูรายการคำหยาบ คำต้องห้าม และกฎชื่อผู้เล่น'},
  {id:'search',label:'ค้นคำศัพท์',description:'ค้นหาและกรองคำทั้งหมดในคลัง'},
  {id:'edit',label:'เพิ่ม / จัดคำ',description:'เพิ่มคำฉบับร่างและเก็บคำที่ยังไม่รู้หมวด'},
  {id:'export',label:'ดาวน์โหลด',description:'ส่งออกคลังคำ รายการคำใหม่ และสถิติ'}
];
type StatsState='idle'|'loading'|'ready'|'error';
type DessertSuggestionRow={category:'dessert';word:string;letter:string;timesSuggested:number;lastSeenAt:number|null};
async function querySuggestions():Promise<DessertSuggestionRow[]>{
  const response=await fetch('/amplify_outputs.json',{cache:'no-store'});
  if(!response.ok)throw new Error('ไม่พบการตั้งค่า AWS Amplify');
  Amplify.configure(await response.json());
  const client=(generateClient as any)();
  const rows:DessertSuggestionRow[]=[];
  let cursor:string|null=null,completed=false;
  for(let page=0;page<40;page++){
    const result=await client.queries.getWordStats({
      request:'dessert-suggestions',...(cursor?{cursor}:{})
    },{authMode:'identityPool'});
    if(result.errors?.length)throw new Error(result.errors.map((x:{message:string})=>x.message).join('; '));
    const data=unpack(result.data) as {items?:DessertSuggestionRow[];nextToken?:string|null};
    if(!Array.isArray(data?.items))throw new Error('ข้อมูลคำเสนอแนะมีรูปแบบไม่ถูกต้อง');
    rows.push(...data.items);
    cursor=data.nextToken||null;
    if(!cursor){completed=true;break;}
  }
  if(!completed)throw new Error('คำเสนอแนะมากเกินขอบเขตที่เปิดอ่านได้');
  return rows.sort((a,b)=>b.timesSuggested-a.timesSuggested);
}

function WordAdmin(){
  const [authorized,setAuthorized]=useState(false);
  const authorizedRef=useRef(false);
  const activeSession=useRef<SavedAdminSession|null>(readAdminSession());
  const [sessionChecking,setSessionChecking]=useState(Boolean(activeSession.current));
  const [authBusy,setAuthBusy]=useState(false);
  const [confirmLogoutAll,setConfirmLogoutAll]=useState(false);
  const [logoutAllBusy,setLogoutAllBusy]=useState(false);
  const [activeTab,setActiveTab]=useState<AdminTab>('overview');
  const [visitedTabs,setVisitedTabs]=useState<AdminTab[]>(['overview']);
  const [jumpTarget,setJumpTarget]=useState('');
  const [pin,setPin]=useState('');
  const [pinError,setPinError]=useState('');
  const [drafts,setDrafts]=useState<Drafts>(loadDrafts);
  const [inbox,setInbox]=useState<string[]>(loadInbox);
  const [inboxText,setInboxText]=useState('');
  const [query,setQuery]=useState('');
  const [filterCategory,setFilterCategory]=useState('');
  const [filterLetter,setFilterLetter]=useState('');
  const [addCategory,setAddCategory]=useState('');
  const [addText,setAddText]=useState('');
  const [message,setMessage]=useState('');
  const [stats,setStats]=useState<WordStatRecord[]>([]);
  const [statsState,setStatsState]=useState<StatsState>('idle');
  const [statsError,setStatsError]=useState('');
  const [suggestions,setSuggestions]=useState<DessertSuggestionRow[]>([]);
  const [suggestionState,setSuggestionState]=useState<StatsState>('idle');
  const [suggestionError,setSuggestionError]=useState('');
  const [dessertType,setDessertType]=useState<''|DessertSubtype>('');
  const [showAll,setShowAll]=useState(false);
  const bank=useMemo(()=>mergedBank(drafts),[drafts]);
  const allEntries=useMemo(()=>getEntries(drafts,stats),[drafts,stats]);
  const shown=useMemo(()=>filterEntries(allEntries,query,filterCategory,filterLetter)
    .filter(row=>!dessertType||(row.category==='dessert'&&dessertSubtype(row.word)===dessertType)),
    [allEntries,query,filterCategory,filterLetter,dessertType]);
  const pendingSuggestions=useMemo(()=>{
    const known=new Set(allEntries.filter(row=>row.category==='dessert')
      .map(row=>canonicalAnswer(row.word,'dessert')));
    return suggestions.filter(row=>!known.has(canonicalAnswer(row.word,'dessert')));
  },[suggestions,allEntries]);
  const exact=useMemo(()=>exactEntries(allEntries,query),[allEntries,query]);
  const visible=showAll?shown:shown.slice(0,100);
  const draftCount=Object.values(drafts).reduce((sum,words)=>sum+words.length,0);
  const totalCount=Object.values(bank).reduce((sum,words)=>sum+words.length,0);

  useEffect(()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(drafts));}
    catch{setMessage('บันทึกคำในเบราว์เซอร์ไม่ได้ กรุณาดาวน์โหลด dictionary.ts สำรองไว้');}
  },[drafts]);
  useEffect(()=>{
    try{localStorage.setItem(INBOX_STORAGE_KEY,JSON.stringify(inbox));}
    catch{setMessage('เก็บคำรอจัดหมวดในเบราว์เซอร์ไม่ได้ กรุณาดาวน์โหลดไฟล์ TXT สำรอง');}
  },[inbox]);
  // Keep visited panels mounted so filters and unsaved form input survive navigation.
  useEffect(()=>{
    if(!jumpTarget)return;
    document.getElementById(jumpTarget)?.scrollIntoView({behavior:'smooth',block:'start'});
    setJumpTarget('');
  },[activeTab,jumpTarget]);
  function openTab(tab:AdminTab,target?:string){
    setVisitedTabs(current=>current.includes(tab)?current:[...current,tab]);
    setActiveTab(tab);
    if(target)setJumpTarget(target);
    else{
      setJumpTarget('');
      window.scrollTo({top:0,behavior:'smooth'});
    }
  }
  async function refreshStats(){
    setStatsState('loading');setStatsError('');
    try{const rows=await queryStats();setStats(rows);setStatsState('ready');}
    catch(error){setStatsState('error');setStatsError(error instanceof Error?error.message:'เชื่อมต่อสถิติไม่ได้');}
  }
  async function refreshSuggestions(){
    setSuggestionState('loading');setSuggestionError('');
    try{setSuggestions(await querySuggestions());setSuggestionState('ready');}
    catch(error){setSuggestionState('error');
      setSuggestionError(error instanceof Error?error.message:'อ่านคำเสนอแนะไม่ได้');}
  }
  function closeSession(message=''){
    authorizedRef.current=false;
    activeSession.current=null;
    clearAdminSession();
    setAuthorized(false);setSessionChecking(false);setConfirmLogoutAll(false);
    setPin('');setPinError(message);
  }
  // Restore the 30-day token only after cloud validation. Re-check periodically
  // so the all-device revocation invalidates other online screens promptly.
  useEffect(()=>{
    let cancelled=false,polling=false;
    const restore=async()=>{
      const saved=activeSession.current;
      if(!saved){setSessionChecking(false);return;}
      try{
        const checked=await adminSessionRequest('check',saved.token);
        if(cancelled)return;
        if(!checked.valid){closeSession('เซสชันหมดอายุหรือถูกออกจากระบบทุกเครื่อง กรุณาใส่รหัสใหม่');return;}
        authorizedRef.current=true;setAuthorized(true);setPinError('');
        void refreshStats();void refreshSuggestions();
      }catch(error){
        if(!cancelled)setPinError('ตรวจสอบการเข้าสู่ระบบไม่ได้ กรุณาโหลดหน้าใหม่');
      }finally{if(!cancelled)setSessionChecking(false);}
    };
    void restore();
    const verify=async()=>{
      if(cancelled||polling||!authorizedRef.current||!activeSession.current)return;
      polling=true;
      const checkedToken=activeSession.current.token;
      try{
        const checked=await adminSessionRequest('check',checkedToken);
        if(!cancelled&&activeSession.current?.token===checkedToken&&!checked.valid)
          closeSession('มีการออกจากระบบทุกเครื่อง หรือเซสชันหมดอายุ กรุณาใส่รหัสใหม่');
      }catch{/* An offline device must revalidate after reconnecting. */}
      finally{polling=false;}
    };
    const timer=window.setInterval(()=>void verify(),15000);
    const onFocus=()=>void verify();
    const onVisibility=()=>{if(!document.hidden)void verify();};
    const onStorage=(event:StorageEvent)=>{
      if(event.key===ADMIN_SESSION_STORAGE_KEY&&event.oldValue!==event.newValue)
        window.location.reload();
    };
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('storage',onStorage);
    return ()=>{
      cancelled=true;window.clearInterval(timer);
      window.removeEventListener('focus',onFocus);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('storage',onStorage);
    };
  },[]);

  async function login(){
    if(authBusy||sessionChecking)return;
    setAuthBusy(true);setPinError('');
    try{
      const result=await adminSessionRequest('login',undefined,pin);
      if(!result.valid||!result.token||!result.expiresAt)
        throw new Error('เซิร์ฟเวอร์ไม่สามารถสร้างเซสชันได้');
      const saved:SavedAdminSession={token:result.token,expiresAt:result.expiresAt};
      activeSession.current=saved;saveAdminSession(saved);
      authorizedRef.current=true;setAuthorized(true);setPin('');setPinError('');
      void refreshStats();void refreshSuggestions();
    }catch(error){setPinError(error instanceof Error?error.message:'เข้าสู่ระบบไม่สำเร็จ');}
    finally{setAuthBusy(false);}
  }
  async function logoutThisDevice(){
    const session=activeSession.current;
    closeSession();
    if(session)try{await adminSessionRequest('logout',session.token);}
    catch{/* Clearing local authentication is sufficient to leave this device. */}
  }
  async function logoutAllDevices(){
    const session=activeSession.current;
    if(!session||logoutAllBusy)return;
    setLogoutAllBusy(true);
    try{
      const result=await adminSessionRequest('logoutAll',session.token);
      if(!result.revokedAll)throw new Error('เซิร์ฟเวอร์ยังไม่ยืนยันการออกจากทุกเครื่อง');
      closeSession('ออกจากระบบทุกเครื่องแล้ว กรุณาใส่รหัสใหม่');
    }catch(error){
      setMessage(error instanceof Error?error.message:'ออกจากระบบทุกเครื่องไม่สำเร็จ');
      setConfirmLogoutAll(false);
    }finally{setLogoutAllBusy(false);}
  }
  function insert(){
    try{
      const next=addDraft(drafts,addText,addCategory);
      setDrafts(next);
      setQuery(normalizeAnswer(addText));setFilterCategory(addCategory);setFilterLetter('');
      setAddText('');setMessage('เพิ่มคำลงในฉบับร่างแล้ว ต้องดาวน์โหลดไฟล์และนำเข้า GitHub จึงจะเข้าเกมจริง');
    }catch(error){setMessage(error instanceof Error?error.message:'เพิ่มคำไม่สำเร็จ');}
  }
  function downloadDictionary(){
    downloadFile('dictionary.ts',exportDictionary(drafts));
    setMessage('ดาวน์โหลด dictionary.ts ฉบับเต็มแล้ว วางแทน amplify/functions/game/dictionary.ts ใน GitHub');
  }
  function saveUncategorized(){
    const result=addInboxWords(inbox,inboxText);
    if(!inboxText.trim()){setMessage('กรุณาพิมพ์คำก่อนบันทึก');return;}
    setInbox(result.words);setInboxText('');
    setMessage('บันทึกคำรอจัดหมวด '+result.added+' คำ'+(result.ignored?' · ข้ามคำซ้ำหรือไม่ถูกต้อง '+result.ignored+' รายการ':''));
  }
  function downloadPendingTxt(){
    const text=exportPendingWords(drafts,inbox);
    if(!text){setMessage('ยังไม่มีคำใหม่ให้ดาวน์โหลด');return;}
    downloadFile('khamwai-words-for-ai-categorization.txt',text,'text/plain;charset=utf-8');
    setMessage('ดาวน์โหลดรายการคำใหม่ล้วน ๆ แล้ว (ไม่มีหมวดหรือหัวตาราง)');
  }
  function downloadCsv(){
    if(statsState!=='ready'){setMessage('สถิติยังไม่พร้อม กรุณากดโหลดสถิติใหม่');return;}
    const today=new Date().toISOString().slice(0,10);
    downloadFile('khamwai-word-usage-'+today+'.csv',buildWordUsageCsv(stats,bank),'text/csv;charset=utf-8');
    setMessage('ดาวน์โหลด CSV สถิติการใช้คำแล้ว');
  }
  if(!authorized)return <div className="login-shell"><div className="login-card">
    <div className="overline">KHAMWAI · PRIVATE WORKSPACE</div>
    <h1>จัดการคลังคำศัพท์</h1>
    <p>ตรวจคำ เพิ่มคำฉบับร่าง และดาวน์โหลดไฟล์สำหรับ GitHub</p>
    {sessionChecking?<p className="admin-auth-loading" role="status">กำลังตรวจสอบเซสชันที่จดจำไว้…</p>:
    <form onSubmit={e=>{e.preventDefault();void login();}}>
      <label>รหัสเข้าใช้งาน<input type="password" value={pin} onChange={e=>setPin(e.target.value)}
        placeholder="••••••" autoComplete="off" disabled={authBusy} required/></label>
      {pinError?<span className="error" role="alert">{pinError}</span>:null}
      <button className="button primary" type="submit" disabled={authBusy}>{authBusy?'กำลังเข้าสู่ระบบ…':'เข้าสู่หน้าจัดการ'}</button>
    </form>}
    <small>จำการเข้าใช้ในเบราว์เซอร์นี้ 30 วัน · ใช้ปุ่มออกจากระบบทุกเครื่องเพื่อยกเลิกเซสชันทั้งหมด</small>
    <small>รหัสเดิมเป็นรหัสสาธารณะในโค้ด ไม่ใช่ระบบยืนยันตัวตนแอดมินที่ปลอดภัยเต็มรูปแบบ</small>
  </div></div>;
  return <main className="workspace">
    <header className="heading"><div>
      <div className="overline">KHAMWAI · VOCABULARY OPERATIONS</div>
      <h1>คลังคำศัพท์</h1>
      <p>เลือกหัวข้องานด้านบนเพื่อเปิดเฉพาะเครื่องมือที่ต้องการ</p>
    </div><div className="admin-auth-actions">
      <button className="button ghost" type="button" onClick={()=>void logoutThisDevice()}>ออกจากเครื่องนี้</button>
      <button className="button danger" type="button" onClick={()=>setConfirmLogoutAll(true)}>ออกจากระบบทุกเครื่อง</button>
    </div></header>
    {confirmLogoutAll?<div className="admin-confirm-backdrop" role="presentation">
      <section className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-revoke-title">
        <h2 id="admin-revoke-title">ออกจากระบบทุกเครื่อง?</h2>
        <p>เซสชันที่เคยจดจำไว้ทั้งหมดจะใช้ไม่ได้ทันทีเมื่อเซิร์ฟเวอร์ยืนยัน เครื่องอื่นที่กำลังเปิดหน้าแอดมินอยู่จะถูกให้ออกเมื่อเช็กเซสชันใหม่ (ปกติภายใน 15 วินาทีหากออนไลน์)</p>
        <div className="admin-confirm-buttons">
          <button className="button ghost" type="button" disabled={logoutAllBusy} onClick={()=>setConfirmLogoutAll(false)}>ยกเลิก</button>
          <button className="button danger" type="button" disabled={logoutAllBusy} onClick={()=>void logoutAllDevices()}>{logoutAllBusy?'กำลังยกเลิกเซสชัน…':'ยืนยันออกจากทุกเครื่อง'}</button>
        </div>
      </section>
    </div>:null}
    <nav className="admin-tabs" aria-label="หมวดเครื่องมือแอดมิน">
      {ADMIN_SECTIONS.map(tab=><button key={tab.id} type="button"
        className={activeTab===tab.id?'admin-tab-button active':'admin-tab-button'}
        aria-current={activeTab===tab.id?'page':undefined}
        onClick={()=>openTab(tab.id)}>{tab.label}</button>)}
    </nav>
    <div className="admin-section-heading">
      <strong>{ADMIN_SECTIONS.find(tab=>tab.id===activeTab)?.label}</strong>
      <span>{ADMIN_SECTIONS.find(tab=>tab.id===activeTab)?.description}</span>
    </div>
    {visitedTabs.includes('overview')?<div className="admin-tab-content" id="admin-panel-overview" hidden={activeTab!=='overview'}>
    <section className="metrics">
      <div><span>รายการคำทั้งหมด</span><strong>{totalCount.toLocaleString('th-TH')}</strong></div>
      <div><span>จำนวนหมวด</span><strong>{CATEGORY_OPTIONS.length}</strong></div>
      <div><span>คำเพิ่มใหม่ในเครื่อง</span><strong>{draftCount}</strong></div>
      <div><span>สถิติออนไลน์</span><strong>{statsState==='ready'?'พร้อม':statsState==='loading'?'กำลังโหลด':'ยังไม่พร้อม'}</strong></div>
    </section>
    <section className="panel admin-welcome" aria-label="ทางลัดงานแอดมิน">
      <h2>เปิดเครื่องมือที่ต้องการ</h2>
      <div className="admin-quick-grid">
        {ADMIN_SECTIONS.filter(tab=>tab.id!=='overview').map(tab=>
          <button type="button" key={tab.id} className="admin-quick-link" onClick={()=>openTab(tab.id)}>
            <strong>{tab.label}</strong><span>{tab.description}</span>
          </button>)}
      </div>
    </section>
    </div>:null}
    {visitedTabs.includes('popularity')?<div className="admin-tab-content" id="admin-panel-popularity" hidden={activeTab!=='popularity'}>
    <PopularityDashboard rows={allEntries} stats={stats} status={statsState} error={statsError}
      refresh={()=>{void refreshStats();}}
      inspect={(categoryId,consonant,word)=>{
        setFilterCategory(categoryId);setFilterLetter(consonant);setQuery(word||'');setShowAll(false);
        openTab('search','admin-vocabulary-search');
      }}/>
    </div>:null}
    {visitedTabs.includes('rarity')?<div className="admin-tab-content" id="admin-panel-rarity" hidden={activeTab!=='rarity'}>
    <RarityDashboard entries={allEntries}
      inspect={(categoryId,consonant,word)=>{
        setFilterCategory(categoryId);setFilterLetter(consonant);setQuery(word||'');setShowAll(false);
        openTab('search','admin-vocabulary-search');
      }}/>
    </div>:null}
    {visitedTabs.includes('suggestions')?<div className="admin-tab-content" id="admin-panel-suggestions" hidden={activeTab!=='suggestions'}>
    <section className="panel suggestion-panel">
      <div className="panel-title">
        <div><h2>ขนมที่ผู้เล่นเสนอให้ตรวจ</h2>
          <p className="help">แสดงเมื่อมีการตอบคำเดียวกันในอย่างน้อย 3 รอบที่จบแล้ว · ไม่เก็บชื่อหรือรหัสผู้เล่น · ข้อมูลหมดอายุใน 90 วัน</p></div>
        <button className="button ghost" type="button" disabled={suggestionState==='loading'}
          onClick={()=>void refreshSuggestions()}>{suggestionState==='loading'?'กำลังโหลด':'↻ โหลดรายการใหม่'}</button>
      </div>
      {suggestionState==='error'?<p className="error" role="alert">{suggestionError} · หากเพิ่งอัปเดต ต้อง Deploy ฐานข้อมูล AWS ใหม่ก่อน</p>:null}
      {suggestionState==='ready'&&pendingSuggestions.length===0?
        <p className="help">ยังไม่มีคำที่ผ่านเกณฑ์การเสนอซ้ำและรอตรวจ</p>:null}
      {suggestionState==='ready'&&pendingSuggestions.length>0?
        <div className="suggestion-scroll"><table>
          <thead><tr><th>คำเสนอแนะ</th><th>ตัวอักษร</th><th>พบ (รอบ)</th><th>ตรวจคำ</th></tr></thead>
          <tbody>{pendingSuggestions.slice(0,80).map(row=><tr key={row.letter+'-'+row.word}>
            <td className="word">{row.word}</td><td>{letterCaption(row.letter)}</td>
            <td>{row.timesSuggested.toLocaleString('th-TH')}</td>
            <td><button type="button" className="button ghost" onClick={()=>{
              setAddText(row.word);setAddCategory('dessert');setFilterCategory('dessert');
              setQuery(row.word);setDessertType('');
              openTab('edit','admin-add-words');
            }}>ตรวจแล้วเพิ่มเอง</button></td>
          </tr>)}</tbody>
        </table></div>:null}
      <p className="help">คำที่ไม่รู้จักอาจเป็นคำพิมพ์ผิดหรือคำแกล้งพิมพ์ แม้มีคนใช้บ่อยก็ยังไม่ใช่คำที่ผ่านการตรวจ ต้องตรวจชื่อขนมจริงก่อนเพิ่มฉบับร่าง และคำในหน้านี้ไม่ใช่สถิติผู้เล่นที่ไม่ซ้ำกัน</p>
    </section>
    </div>:null}
    {visitedTabs.includes('blocked')?<div className="admin-tab-content" id="admin-panel-blocked" hidden={activeTab!=='blocked'}>
      <AdminBlocklistView/>
    </div>:null}
    {visitedTabs.includes('search')?<div className="admin-tab-content" id="admin-panel-search" hidden={activeTab!=='search'}>
    <section className="panel" id="admin-vocabulary-search">
      <div className="panel-title"><h2>ค้นหาคำศัพท์</h2><span>เลือกหมวด ตัวอักษร หรือไม่เลือกอะไรเลยก็ได้</span></div>
      <div className="filter-grid">
        <label>ค้นคำ<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setShowAll(false);}}
          placeholder="เช่น พนมมือ, อุรุกวัย, พลับ"/></label>
        <label>หมวด
          <select value={filterCategory} onChange={e=>{setFilterCategory(e.target.value);if(e.target.value)setAddCategory(e.target.value);setDessertType('');setShowAll(false);}}>
            <option value="">ทุกหมวด</option>
            {CATEGORY_OPTIONS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label>ตัวอักษร
          <select value={filterLetter} onChange={e=>{setFilterLetter(e.target.value);setShowAll(false);}}>
            <option value="">ทุกตัวอักษร</option>
            {LETTER_OPTIONS.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        <label>ประเภทขนมย่อย
          <select value={dessertType} onChange={e=>{setDessertType(e.target.value as ''|DessertSubtype);setShowAll(false);}}>
            <option value="">ทุกประเภท</option>
            {DESSERT_SUBTYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
      </div>
      {query.trim()?<div className="match-note" role="status">{exact.length?
        <><b>{query.trim()}</b> มีอยู่ {exact.length} หมวด: {exact.map(x=>x.label).join(', ')} ({exact.map(x=>letterCaption(x.letter)).join(', ')})</>:
        <>ไม่พบคำ <b>{query.trim()}</b> ในคลังปัจจุบัน — ตรวจความถูกต้องก่อนเพิ่มคำใหม่</>}
      </div>:null}
      <div className="result-count"><strong>พบ {shown.length.toLocaleString('th-TH')} รายการ</strong>
        <span>{showAll?'แสดงทั้งหมด':'แสดง 100 รายการแรก (เมื่อมีมากกว่า 100)'}</span></div>
      <div className="table-scroll"><table><thead><tr><th>คำศัพท์</th><th>หมวด</th><th>พยัญชนะ</th>
        <th>ใช้แล้ว (ครั้ง)</th><th>คะแนนสะสม</th><th>สถานะ</th><th></th></tr></thead><tbody>
        {visible.map(row=><tr key={row.category+'::'+row.word}>
          <td className="word">{row.word}
            {row.category==='dessert'?<small className="dessert-subtype-caption">{dessertSubtypeLabel(dessertSubtype(row.word))}</small>:null}
          </td><td>{row.label}</td><td>{letterCaption(row.letter)}</td>
          <td>{statsState==='ready'?row.uses.toLocaleString('th-TH'):'—'}</td>
          <td>{statsState==='ready'?row.points.toLocaleString('th-TH'):'—'}</td>
          <td><span className={row.draft?'tag draft':'tag'}>{row.draft?'เพิ่มใหม่':'ในคลัง'}</span></td>
          <td>{row.draft?<button className="remove" type="button" onClick={()=>{
            setDrafts(current=>dropDraft(current,row.word,row.category));setMessage('ลบคำจากฉบับร่างแล้ว');
          }}>ลบ</button>:null}</td>
        </tr>)}
        {!visible.length?<tr><td colSpan={7} className="no-rows">ไม่พบคำตามตัวกรองที่เลือก</td></tr>:null}
      </tbody></table></div>
      {!showAll&&shown.length>100?<button className="button ghost" onClick={()=>setShowAll(true)}>
        แสดงครบ {shown.length.toLocaleString('th-TH')} รายการ</button>:null}
    </section>
    </div>:null}
    {visitedTabs.includes('edit')?<div className="admin-tab-content" id="admin-panel-edit" hidden={activeTab!=='edit'}>
    <section className="panel inbox-panel">
      <div className="panel-title"><h2>จดคำที่ยังไม่รู้หมวด</h2><span>เอาไว้ให้ AI ช่วยตรวจและจัดหมวดภายหลัง</span></div>
      <form onSubmit={e=>{e.preventDefault();saveUncategorized();}}>
        <label>คำศัพท์รอพิจารณา (หนึ่งคำต่อบรรทัด หรือคั่นด้วยเครื่องหมายจุลภาค)
          <textarea className="inbox-textarea" rows={4} value={inboxText}
            onChange={e=>setInboxText(e.target.value)}
            placeholder={'ตัวอย่าง:\nขนมไข่\nอุรุกวัย\nปรบมือ'}/>
        </label>
        <div className="inbox-actions">
          <button type="submit" className="button primary" disabled={!inboxText.trim()}>+ เก็บคำรอจัดหมวด</button>
          <button type="button" className="button ghost"
            disabled={inbox.length===0&&Object.values(drafts).every(items=>items.length===0)}
            onClick={downloadPendingTxt}>ดาวน์โหลดเฉพาะคำใหม่ (.txt)</button>
          <span>ไม่ส่งเข้าคลังเกมจนกว่าจะตรวจหมวดและนำเข้า GitHub</span>
        </div>
      </form>
      {inbox.length>0?<div className="draft-summary"><h3>คำที่รอให้จัดหมวด ({inbox.length})</h3>
        <div className="inbox-word-chips">{inbox.map(word=><button key={word} type="button"
          onClick={()=>setInbox(current=>removeInboxWord(current,word))}
          title="กดเพื่อลบคำจากรายการรอจัดหมวด">{word} ×</button>)}</div>
      </div>:<p className="help">ยังไม่มีคำรอจัดหมวด สามารถวางหลายคำแล้วบันทึกพร้อมกันได้</p>}
      <p className="help">ไฟล์ TXT จะรวมเฉพาะคำที่เพิ่มเองทั้งหมด (ทั้งคำรอจัดหมวดและคำฉบับร่างที่เลือกหมวดแล้ว) โดยตัดคำซ้ำ เหลือหนึ่งคำต่อบรรทัด ไม่มีชื่อหมวดหรือข้อความอื่น</p>
    </section>
    <section className="panel" id="admin-add-words">
      <div className="panel-title"><h2>เพิ่มคำศัพท์</h2><span>บันทึกในเบราว์เซอร์เท่านั้น ไม่เปลี่ยนเกมออนไลน์</span></div>
      <form className="add-grid" onSubmit={e=>{e.preventDefault();insert();}}>
        <label>คำศัพท์<input value={addText} maxLength={48} onChange={e=>setAddText(e.target.value)}
          placeholder="พิมพ์คำที่ยังไม่มี" required/></label>
        <label>หมวดที่จะเพิ่ม<select value={addCategory} required onChange={e=>setAddCategory(e.target.value)}>
          <option value="">เลือกหมวด</option>
          {CATEGORY_OPTIONS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select></label>
        <button className="button primary" type="submit">+ เพิ่มคำ</button>
      </form>
      <p className="help">ระบบแยกตัวอักษรให้อัตโนมัติ เช่น แอปเปิล = อ อ่าง และไม่เพิ่มคำที่ซ้ำในหมวดเดียวกัน</p>
      <p className="help">คำที่เพิ่มจะยังอยู่หลังรีเฟรชหน้าในเบราว์เซอร์เดิม แต่ถ้าลบข้อมูลเว็บไซต์หรือเปลี่ยนเครื่องจะหาย ควรดาวน์โหลดไฟล์สำรอง</p>
      {draftCount>0?<div className="draft-summary"><h3>คำที่เพิ่มไว้ ({draftCount})</h3>
        {CATEGORY_OPTIONS.filter(c=>drafts[c.id]?.length).map(c=><div key={c.id} className="draft-line">
          <strong>{c.label}</strong><div>{drafts[c.id].map(word=><button type="button" key={word}
            onClick={()=>setDrafts(current=>dropDraft(current,word,c.id))} title="กดเพื่อลบคำ">{word} ×</button>)}</div>
        </div>)}
      </div>:null}
    </section>
    </div>:null}
    {visitedTabs.includes('export')?<div className="admin-tab-content" id="admin-panel-export" hidden={activeTab!=='export'}>
    <section className="panel"><div className="panel-title"><h2>ดาวน์โหลดข้อมูล</h2>
      <span>นำไฟล์คลังคำไปวางใน GitHub เอง</span></div>
      <div className="download-grid">
        <div><h3>คลังคำฉบับเต็ม</h3>
          <p>รวมคำเดิมทั้งหมดกับคำที่เพิ่มไว้ในเครื่อง พร้อมค่าเงื่อนไขการสุ่ม เป็นไฟล์ <code>dictionary.ts</code> ที่ใช้แทนของเดิมได้</p>
          <button className="button primary" onClick={downloadDictionary}>ดาวน์โหลด dictionary.ts</button>
        </div>
        <div><h3>รายการคำใหม่สำหรับ AI</h3>
          <p>ดาวน์โหลดเฉพาะคำที่คุณเพิ่มไว้ในเครื่อง ทั้งคำที่ยังไม่รู้หมวดและคำที่จัดหมวดแล้ว เพื่อให้ AI ตรวจและแยกประเภท ไม่มีคำเก่าจากคลังปะปน</p>
          <button className="button ghost" onClick={downloadPendingTxt}
            disabled={inbox.length===0&&draftCount===0}>ดาวน์โหลดคำใหม่ .txt ({new Set([...inbox,...Object.values(drafts).flat()]).size})</button>
        </div>
        <div><h3>สถิติการใช้คำ</h3>
          <p>ไฟล์ CSV แยกหมวด พยัญชนะ จำนวนครั้ง และคะแนนสะสม รวมถึงคำที่ยังไม่มีการใช้ (0 ครั้ง)</p>
          <button className="button ghost" disabled={statsState!=='ready'} onClick={downloadCsv}>ดาวน์โหลดสถิติ CSV</button>
          <button className="button light" disabled={statsState==='loading'} onClick={()=>void refreshStats()}>โหลดสถิติใหม่</button>
        </div>
      </div>
      {statsState==='error'?<p className="error" role="alert">{statsError}</p>:null}
      <p className="help">สถิติออนไลน์ไม่มีสิทธิ์แก้ข้อมูลในหน้านี้ คำศัพท์ที่เพิ่มในเครื่องจะเริ่มมีสถิติจริงเมื่ออัปเดต GitHub และมีคนเล่นใช้คำนั้น</p>
    </section>
    </div>:null}
    {message?<div className="toast" role="status">{message}<button onClick={()=>setMessage('')} aria-label="ปิด">×</button></div>:null}
    <footer>หน้าและรหัสที่ซ่อนไว้ไม่ใช่ระบบความปลอดภัยของผู้ดูแลจริง</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><WordAdmin/></StrictMode>);
