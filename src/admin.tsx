import {StrictMode,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Amplify} from 'aws-amplify';
import {generateClient} from 'aws-amplify/data';
import {initialConsonant,normalizeAnswer} from '../amplify/functions/game/logic.ts';
import {letterCaption} from './letters.ts';
import {EXPORT_PROMPT_CODE,buildWordUsageCsv,type WordStatRecord} from './stats-export.ts';
import {
  STORAGE_KEY,CATEGORY_OPTIONS,LETTER_OPTIONS,addDraft,dropDraft,normalizeDrafts,
  mergedBank,getEntries,filterEntries,exactEntries,exportDictionary,type Drafts
} from './admin-data.ts';
import './admin.css';
import {PopularityDashboard} from './admin-dashboard-view.tsx';

function loadDrafts():Drafts{
  try{return normalizeDrafts(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}
  catch{return {};}
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
type StatsState='idle'|'loading'|'ready'|'error';
function WordAdmin(){
  const [authorized,setAuthorized]=useState(false);
  const [pin,setPin]=useState('');
  const [pinError,setPinError]=useState('');
  const [drafts,setDrafts]=useState<Drafts>(loadDrafts);
  const [query,setQuery]=useState('');
  const [filterCategory,setFilterCategory]=useState('');
  const [filterLetter,setFilterLetter]=useState('');
  const [addCategory,setAddCategory]=useState('');
  const [addText,setAddText]=useState('');
  const [message,setMessage]=useState('');
  const [stats,setStats]=useState<WordStatRecord[]>([]);
  const [statsState,setStatsState]=useState<StatsState>('idle');
  const [statsError,setStatsError]=useState('');
  const [showAll,setShowAll]=useState(false);
  const bank=useMemo(()=>mergedBank(drafts),[drafts]);
  const allEntries=useMemo(()=>getEntries(drafts,stats),[drafts,stats]);
  const shown=useMemo(()=>filterEntries(allEntries,query,filterCategory,filterLetter),[allEntries,query,filterCategory,filterLetter]);
  const exact=useMemo(()=>exactEntries(allEntries,query),[allEntries,query]);
  const visible=showAll?shown:shown.slice(0,100);
  const draftCount=Object.values(drafts).reduce((sum,words)=>sum+words.length,0);
  const totalCount=Object.values(bank).reduce((sum,words)=>sum+words.length,0);

  useEffect(()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(drafts));}
    catch{setMessage('บันทึกคำในเบราว์เซอร์ไม่ได้ กรุณาดาวน์โหลด dictionary.ts สำรองไว้');}
  },[drafts]);
  async function refreshStats(){
    setStatsState('loading');setStatsError('');
    try{const rows=await queryStats();setStats(rows);setStatsState('ready');}
    catch(error){setStatsState('error');setStatsError(error instanceof Error?error.message:'เชื่อมต่อสถิติไม่ได้');}
  }
  function login(){
    if(pin!==EXPORT_PROMPT_CODE){setPinError('รหัสไม่ถูกต้อง');return;}
    setAuthorized(true);setPin('');setPinError('');
    void refreshStats();
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
    <form onSubmit={e=>{e.preventDefault();login();}}>
      <label>รหัสเข้าใช้งาน<input type="password" value={pin} onChange={e=>setPin(e.target.value)}
        placeholder="••••••" autoComplete="off" required/></label>
      {pinError?<span className="error" role="alert">{pinError}</span>:null}
      <button className="button primary" type="submit">เข้าสู่หน้าจัดการ</button>
    </form>
    <small>ชื่อหน้าและรหัสใช้ป้องกันการกดเล่นทั่วไป ไม่ใช่การยืนยันสิทธิ์จากเซิร์ฟเวอร์</small>
  </div></div>;
  return <main className="workspace">
    <header className="heading"><div>
      <div className="overline">KHAMWAI · VOCABULARY OPERATIONS</div>
      <h1>คลังคำศัพท์</h1>
      <p>ค้นหาทุกหมวดและทุกพยัญชนะ · เพิ่มคำฉบับร่าง · ส่งออกข้อมูล</p>
    </div><button className="button ghost" onClick={()=>setAuthorized(false)}>ล็อกหน้าจอ</button></header>
    <section className="metrics">
      <div><span>รายการคำทั้งหมด</span><strong>{totalCount.toLocaleString('th-TH')}</strong></div>
      <div><span>จำนวนหมวด</span><strong>{CATEGORY_OPTIONS.length}</strong></div>
      <div><span>คำเพิ่มใหม่ในเครื่อง</span><strong>{draftCount}</strong></div>
      <div><span>สถิติออนไลน์</span><strong>{statsState==='ready'?'พร้อม':statsState==='loading'?'กำลังโหลด':'ยังไม่พร้อม'}</strong></div>
    </section>
    <PopularityDashboard rows={allEntries} stats={stats} status={statsState} error={statsError}
      refresh={()=>{void refreshStats();}}
      inspect={(categoryId,consonant,word)=>{
        setFilterCategory(categoryId);setFilterLetter(consonant);setQuery(word||'');setShowAll(false);
        document.getElementById('admin-vocabulary-search')?.scrollIntoView({behavior:'smooth'});
      }}/>
    <section className="panel" id="admin-vocabulary-search">
      <div className="panel-title"><h2>ค้นหาคำศัพท์</h2><span>เลือกหมวด ตัวอักษร หรือไม่เลือกอะไรเลยก็ได้</span></div>
      <div className="filter-grid">
        <label>ค้นคำ<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setShowAll(false);}}
          placeholder="เช่น พนมมือ, อุรุกวัย, พลับ"/></label>
        <label>หมวด
          <select value={filterCategory} onChange={e=>{setFilterCategory(e.target.value);if(e.target.value)setAddCategory(e.target.value);setShowAll(false);}}>
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
      </div>
      {query.trim()?<div className="match-note" role="status">{exact.length?
        <><b>{query.trim()}</b> มีอยู่ {exact.length} หมวด: {exact.map(x=>x.label).join(', ')} ({letterCaption(initialConsonant(query))})</>:
        <>ไม่พบคำ <b>{query.trim()}</b> ในคลังปัจจุบัน — ตรวจความถูกต้องก่อนเพิ่มคำใหม่</>}
      </div>:null}
      <div className="result-count"><strong>พบ {shown.length.toLocaleString('th-TH')} รายการ</strong>
        <span>{showAll?'แสดงทั้งหมด':'แสดง 100 รายการแรก (เมื่อมีมากกว่า 100)'}</span></div>
      <div className="table-scroll"><table><thead><tr><th>คำศัพท์</th><th>หมวด</th><th>พยัญชนะ</th>
        <th>ใช้แล้ว (ครั้ง)</th><th>คะแนนสะสม</th><th>สถานะ</th><th></th></tr></thead><tbody>
        {visible.map(row=><tr key={row.category+'::'+row.word}>
          <td className="word">{row.word}</td><td>{row.label}</td><td>{letterCaption(row.letter)}</td>
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
    <section className="panel">
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
    <section className="panel"><div className="panel-title"><h2>ดาวน์โหลดข้อมูล</h2>
      <span>นำไฟล์คลังคำไปวางใน GitHub เอง</span></div>
      <div className="download-grid">
        <div><h3>คลังคำฉบับเต็ม</h3>
          <p>รวมคำเดิมทั้งหมดกับคำที่เพิ่มไว้ในเครื่อง พร้อมค่าเงื่อนไขการสุ่ม เป็นไฟล์ <code>dictionary.ts</code> ที่ใช้แทนของเดิมได้</p>
          <button className="button primary" onClick={downloadDictionary}>ดาวน์โหลด dictionary.ts</button>
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
    {message?<div className="toast" role="status">{message}<button onClick={()=>setMessage('')} aria-label="ปิด">×</button></div>:null}
    <footer>หน้าและรหัสที่ซ่อนไว้ไม่ใช่ระบบความปลอดภัยของผู้ดูแลจริง</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><WordAdmin/></StrictMode>);
