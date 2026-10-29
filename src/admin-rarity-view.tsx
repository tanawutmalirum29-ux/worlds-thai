import {useEffect,useMemo,useState} from 'react';
import {CATEGORY_OPTIONS,LETTER_OPTIONS,type Entry} from './admin-data.ts';
import {letterCaption} from './letters.ts';
import {buildRarityGroups,displayRarityState,rarityGroupSummary,rarityReadiness,
  type RarityMetaRecord,type GroupState,type RarityWordRow} from './admin-rarity-data.ts';
import {hasRarityAdminSession,loginRarityAdmin,logoutRarityAdmin,queryRarityAdmin} from './admin-rarity-api.ts';
import './admin-rarity.css';

type Props={entries:Entry[];inspect:(category:string,letter:string,word?:string)=>void};
type LoadState='idle'|'loading'|'ready'|'error';
const fmt=(n:number)=>n.toLocaleString('th-TH');
function bonusLabel(bonus:number){return bonus===2?'หายากมาก +2':bonus===1?'หายาก +1':'ปกติ';}
function wordAge(timestamp:number|null){
  if(timestamp===null)return 'ยังไม่มีข้อมูล';
  return new Date(timestamp).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'});
}
export function RarityDashboard({entries,inspect}:Props){
  const [authenticated,setAuthenticated]=useState(false);
  const [checking,setChecking]=useState(true);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [authBusy,setAuthBusy]=useState(false);
  const [authError,setAuthError]=useState('');
  const [records,setRecords]=useState<RarityMetaRecord[]>([]);
  const [status,setStatus]=useState<LoadState>('idle');
  const [error,setError]=useState('');
  const [category,setCategory]=useState('');
  const [letter,setLetter]=useState('');
  const [stateFilter,setStateFilter]=useState('');
  const [selected,setSelected]=useState('');
  const [wordFilter,setWordFilter]=useState('');
  const [wordOrder,setWordOrder]=useState<'rare'|'recent'|'lifetime'>('rare');
  const [limit,setLimit]=useState(60);

  async function refresh(){
    setStatus('loading');setError('');
    try{setRecords(await queryRarityAdmin());setStatus('ready');}
    catch(e){setStatus('error');setError(e instanceof Error?e.message:'ไม่สามารถโหลดข้อมูลความหายากได้');}
  }
  useEffect(()=>{
    let mounted=true;
    void (async()=>{
      try{
        const valid=await hasRarityAdminSession();
        if(!mounted)return;
        setAuthenticated(valid);
        if(valid)void refresh();
      }catch(e){
        if(mounted)setAuthError(e instanceof Error?e.message:'อ่านสถานะบัญชีไม่ได้');
      }finally{if(mounted)setChecking(false);}
    })();
    return ()=>{mounted=false;};
  },[]);
  async function login(e:React.FormEvent){
    e.preventDefault();setAuthError('');setAuthBusy(true);
    try{
      await loginRarityAdmin(email,password);
      setPassword('');setAuthenticated(true);
      await refresh();
    }catch(e){setAuthError(e instanceof Error?e.message:'เข้าสู่ระบบไม่สำเร็จ');setPassword('');}
    finally{setAuthBusy(false);}
  }
  async function logout(){
    setAuthBusy(true);
    try{await logoutRarityAdmin();}
    finally{setAuthenticated(false);setRecords([]);setStatus('idle');setSelected('');setAuthBusy(false);}
  }
  const groups=useMemo(()=>buildRarityGroups(entries,records),[entries,records,status]);
  const summary=useMemo(()=>rarityGroupSummary(groups),[groups]);
  const filtered=useMemo(()=>groups.filter(g=>
    (!category||g.category===category)&&(!letter||g.letter===letter)&&
    (!stateFilter||g.state===stateFilter)),[groups,category,letter,stateFilter]);
  const details=groups.find(g=>g.key===selected) || filtered[0];
  const wordRows=useMemo(()=>{
    if(!details)return [];
    const searchable=details.words.filter(w=>!wordFilter.trim()||w.word.includes(wordFilter.trim()));
    return [...searchable].sort((a,b)=>wordOrder==='recent'?(b.recentUses??-1)-(a.recentUses??-1):
      wordOrder==='lifetime'?b.lifetimeUses-a.lifetimeUses:
      b.bonus-a.bonus||b.pendingTier-a.pendingTier||
      (a.recentUses??Number.MAX_SAFE_INTEGER)-(b.recentUses??Number.MAX_SAFE_INTEGER)||
      a.word.localeCompare(b.word,'th'));
  },[details,wordFilter,wordOrder]);
  return <section id="admin-rarity-insights" className="panel rarity-admin" aria-label="สถิติความหายากรายหมวดและพยัญชนะ">
    <div className="panel-title">
      <div>
        <div className="rarity-eyebrow">RARITY OPERATIONS · LAST 30 DAYS</div>
        <h2>สถิติความหายาก</h2>
        <p className="help">ดูหมวด × พยัญชนะ จำนวนคำ สถิติที่ใช้ประเมิน และระดับโบนัสจากเซิร์ฟเวอร์จริง</p>
      </div>
      {authenticated?<button className="button ghost" type="button" onClick={()=>void logout()} disabled={authBusy}>ออกจากบัญชีผู้ดูแล</button>:null}
    </div>
    {checking?<p role="status" className="rarity-notice">กำลังตรวจสิทธิ์ผู้ดูแล...</p>:
      !authenticated?<div className="rarity-auth">
        <h3>เข้าสู่ระบบสถิติส่วนผู้ดูแล</h3>
        <p>รหัสเข้าหน้าแอดมินเดิมไม่ใช่สิทธิ์ฐานข้อมูล ส่วนนี้ต้องใช้บัญชี Cognito ที่อยู่ในกลุ่ม <code>RARITY_ADMINS</code> เท่านั้น</p>
        <form onSubmit={e=>void login(e)} className="rarity-login">
          <label>อีเมลผู้ดูแล<input type="email" required value={email} autoComplete="username"
            onChange={e=>setEmail(e.target.value)} placeholder="อีเมลบัญชี Cognito"/></label>
          <label>รหัสผ่าน<input type="password" required value={password} autoComplete="current-password"
            onChange={e=>setPassword(e.target.value)}/></label>
          <button className="button primary" type="submit" disabled={authBusy}>{authBusy?'กำลังยืนยัน...':'เข้าสู่ระบบและเปิดข้อมูล'}</button>
        </form>
        {authError?<p className="error" role="alert">{authError}</p>:null}
        <small>ข้อมูลที่ส่งออกจากเซิร์ฟเวอร์เป็นยอดรวมเท่านั้น ไม่แสดงผู้เล่นรายบุคคล</small>
      </div>:<>
        <div className="rarity-toolbar">
          <p className="rarity-notice">สถานะความหายากเป็นข้อมูลประเมินรายวัน (เปลี่ยนวันเวลา 03:00 น. ไทย) ไม่ใช่ยอดใช้สะสมตลอดอายุเกม</p>
          <button className="button ghost" type="button" onClick={()=>void refresh()} disabled={status==='loading'}>
            {status==='loading'?'กำลังโหลด...':'↻ โหลดข้อมูลล่าสุด'}
          </button>
        </div>
        {status==='loading'||status==='idle'?<p role="status" className="rarity-notice">กำลังอ่านข้อมูลจากฐานข้อมูล AWS...</p>:
          status==='error'?<p role="alert" className="error">{error} · ตรวจว่า Amplify Backend Deploy สำเร็จและบัญชีมีสิทธิ์ RARITY_ADMINS</p>:<>
            <div className="rarity-metrics">
              <div><span>กลุ่มหมวด × อักษร</span><strong>{fmt(summary.groups)}</strong></div>
              <div><span>เปิดเล่นได้</span><strong>{fmt(summary.playable)}</strong></div>
              <div><span>มีคำหายาก</span><strong>{fmt(summary.active)}</strong></div>
              <div><span>ไม่มีคำหายาก</span><strong>{fmt(summary.noRare)}</strong></div>
              <div><span>ยังเรียนรู้/รอข้อมูล</span><strong>{fmt(summary.learning)}</strong></div>
              <div><span>คำหายาก / หายากมาก</span><strong>{fmt(summary.rare)} / {fmt(summary.veryRare)}</strong></div>
            </div>
            <div className="rarity-controls">
              <label>หมวด
                <select value={category} onChange={e=>{setCategory(e.target.value);setSelected('');}}>
                  <option value="">ทุกหมวด</option>
                  {CATEGORY_OPTIONS.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </label>
              <label>อักษร
                <select value={letter} onChange={e=>{setLetter(e.target.value);setSelected('');}}>
                  <option value="">ทุกอักษร</option>
                  {LETTER_OPTIONS.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </label>
              <label>สถานะ
                <select value={stateFilter} onChange={e=>{setStateFilter(e.target.value);setSelected('');}}>
                  <option value="">ทั้งหมด</option>
                  {(['active','no-rare','learning','not-started','stale','not-playable'] as GroupState[]).map(v=>
                    <option key={v} value={v}>{displayRarityState(v)}</option>)}
                </select>
              </label>
            </div>
            <p className="rarity-notice">พบ {fmt(filtered.length)} กลุ่ม · กดรายการเพื่อดูคำศัพท์และเหตุผลที่ยังไม่มีโบนัส</p>
            <div className="rarity-groups" role="region" aria-label="รายการสถิติหมวดและพยัญชนะ" tabIndex={0}>
              <table>
                <thead><tr><th>หมวด · อักษร</th><th>คำ</th><th>ใช้สะสม</th><th>ใช้ 30 วัน*</th><th>หายาก</th><th>สถานะ</th></tr></thead>
                <tbody>{filtered.slice(0,limit).map(g=><tr key={g.key}>
                  <td><button className={details?.key===g.key?'rarity-link selected':'rarity-link'} type="button"
                    onClick={()=>{setSelected(g.key);setWordFilter('');}}>{CATEGORY_OPTIONS.find(c=>c.id===g.category)?.label||g.category} · {letterCaption(g.letter)}</button></td>
                  <td>{fmt(g.totalWords)}</td><td>{fmt(g.lifetimeUses)}</td>
                  <td>{g.recentUses===null?'—':fmt(g.recentUses)}</td>
                  <td>{fmt(g.rareWords)} / {fmt(g.veryRareWords)}</td>
                  <td><span className={'rarity-state state-'+g.state}>{displayRarityState(g.state)}</span></td>
                </tr>)}
                  {!filtered.length?<tr><td colSpan={6}>ไม่มีคู่หมวดและตัวอักษรตรงตัวกรอง</td></tr>:null}
                </tbody>
              </table>
            </div>
            {filtered.length>limit?<button className="button ghost rarity-more" type="button" onClick={()=>setLimit(v=>v+60)}>
              แสดงเพิ่ม (กำลังแสดง {fmt(Math.min(limit,filtered.length))} / {fmt(filtered.length)})</button>:null}
            {details?<div className="rarity-detail">
              <div className="rarity-detail-head">
                <div><h3>{CATEGORY_OPTIONS.find(c=>c.id===details.category)?.label||details.category} · {letterCaption(details.letter)}</h3>
                  <span className={'rarity-state state-'+details.state}>{displayRarityState(details.state)}</span>
                  <p className="rarity-notice">ใช้ 30 วัน*: {details.recentUses===null?'ยังไม่มีข้อมูล':fmt(details.recentUses)} ·
                    ผู้เล่น {details.uniquePlayers===null?'—':fmt(details.uniquePlayers)} ·
                    ห้อง {details.uniqueRooms===null?'—':fmt(details.uniqueRooms)} ·
                    วันที่ประเมิน {details.snapshotDay||'ยังไม่มี'}
                  </p>
                </div>
                <div className="rarity-detail-controls">
                  <input type="search" aria-label="ค้นหาคำในกลุ่มนี้" placeholder="ค้นคำ..." value={wordFilter} onChange={e=>setWordFilter(e.target.value)}/>
                  <select aria-label="เรียงคำ" value={wordOrder} onChange={e=>setWordOrder(e.target.value as typeof wordOrder)}>
                    <option value="rare">โบนัสหายากก่อน</option><option value="recent">ใช้ 30 วันมากก่อน</option>
                    <option value="lifetime">ใช้สะสมมากก่อน</option>
                  </select>
                </div>
              </div>
              <div className="rarity-gates" aria-label="เกณฑ์ความพร้อมในการประเมิน">
                {Object.entries(rarityReadiness(details)).map(([key,gate])=>
                  <div key={key} className={gate.value!==null&&gate.value>=gate.required?'ready':'pending'}>
                    <span>{({words:'จำนวนคำ',uses:'จำนวนคำตอบ',players:'ผู้เล่น',rooms:'ห้องแข่งขัน',days:'อายุสถิติ (วัน)'} as Record<string,string>)[key]}</span>
                    <strong>{gate.value===null?'—':fmt(gate.value)} / {fmt(gate.required)}</strong>
                  </div>)}
              </div>
              <p className="rarity-notice">เงื่อนไขข้างต้นเป็นเพียงส่วนหนึ่ง ยังต้องตรวจความต่อเนื่องของวันใช้งานและระยะเรียนรู้ของแต่ละคำด้วย</p>
              <div className="rarity-word-scroll"><table>
                <thead><tr><th>คำศัพท์</th><th>ใช้สะสม</th><th>ใช้ 30 วัน*</th><th>เริ่มเก็บสถิติ</th><th>ผลประเมิน</th><th>ตรวจคำ</th></tr></thead>
                <tbody>{wordRows.slice(0,100).map((w:RarityWordRow)=><tr key={w.canonical}>
                  <td className="rarity-word">{w.word}</td>
                  <td>{fmt(w.lifetimeUses)}</td><td>{w.recentUses===null?'—':fmt(w.recentUses)}</td>
                  <td>{wordAge(w.firstEligibleAt)}</td>
                  <td>{w.bonus?<strong className={'rarity-tier rarity-tier-'+w.bonus}>{bonusLabel(w.bonus)}</strong>:
                    w.pendingDays>0?<span>แนวโน้ม {bonusLabel(w.pendingTier)} · ยืนยันแล้ว {fmt(w.pendingDays)} วัน</span>:
                    w.firstEligibleAt===null?<span>ยังไม่เริ่มเก็บข้อมูลคำ</span>:
                    Date.now()-w.firstEligibleAt<5*86400000?<span>คำใหม่ · อยู่ในระยะเรียนรู้</span>:
                    details.state==='no-rare'||details.state==='active'?<span>ปกติ / ยังไม่ผ่านเกณฑ์คำ</span>:
                    <span>ยังไม่ตัดสิน</span>}</td>
                  <td><button className="rarity-link" type="button" onClick={()=>inspect(details.category,details.letter,w.word)}>ดูคำ</button></td>
                </tr>)}
                  {!wordRows.length?<tr><td colSpan={6}>ไม่มีคำตรงกับที่ค้นหา</td></tr>:null}
                </tbody>
              </table></div>
              {wordRows.length>100?<p className="rarity-notice">แสดง 100 จาก {fmt(wordRows.length)} คำ ใช้การค้นหาหรือเรียงลำดับเพื่อดูคำอื่น</p>:null}
            </div>:null}
            <p className="rarity-legend">* ใช้ 30 วัน = จำนวนการเลือกคำที่นับซ้ำตัวตนเดิมได้ไม่เกิน 1 ครั้งต่อคำต่อวัน (ไม่ใช่ยอดใช้ทั้งหมด) · “—” คือยังไม่มี Snapshot ที่มีข้อมูลรายคำ · คำฉบับร่างในเครื่องและคำที่ถอดจากคลังไม่ถูกจัดระดับ · คะแนนหายากจริงยึด Snapshot ที่ล็อกไว้ตอนเริ่มรอบ</p>
          </>}
      </>}
  </section>;
}
