import {useMemo,useState} from 'react';
import {CATEGORY_OPTIONS,LETTER_OPTIONS,type Entry} from './admin-data.ts';
import {letterCaption} from './letters.ts';
import type {WordStatRecord} from './stats-export.ts';
import {
  mergeHistoricalStats,dashboardFilter,sumUsage,rankUsage,usageGroups,rankGroups,
  usageMatrix,categoryName,type UsageMetric,type UsageOrder,type UsageGroup
} from './admin-dashboard.ts';
import './admin-dashboard.css';

type View='words'|'category'|'letter'|'matrix'|'unused';
type Status='idle'|'loading'|'ready'|'error';
type Props={
  rows:Entry[];stats:WordStatRecord[];status:Status;error:string;
  refresh:()=>void;
  inspect:(category:string,letter:string,word?:string)=>void;
};
const fmt=(n:number)=>n.toLocaleString('th-TH');
const metricName=(metric:UsageMetric)=>metric==='uses'?'ครั้งที่ใช้':'คะแนนสะสม';

export function PopularityDashboard({rows,stats,status,error,refresh,inspect}:Props){
  const [view,setView]=useState<View>('words');
  const [category,setCategory]=useState('');
  const [letter,setLetter]=useState('');
  const [metric,setMetric]=useState<UsageMetric>('uses');
  const [order,setOrder]=useState<UsageOrder>('most');
  const [limit,setLimit]=useState(20);

  const full=useMemo(()=>mergeHistoricalStats(rows,stats),[rows,stats]);
  const filtered=useMemo(()=>dashboardFilter(full,category,letter),[full,category,letter]);
  const total=useMemo(()=>sumUsage(full),[full]);
  const scoped=useMemo(()=>sumUsage(filtered),[filtered]);
  const sorted=useMemo(()=>rankUsage(
    view==='unused'?filtered.filter(row=>row.uses===0):filtered,metric,order),[view,filtered,metric,order]);
  const groupBy=view==='letter'?'letter':'category';
  const groups=useMemo(()=>rankGroups(usageGroups(filtered,groupBy),metric,order),
    [filtered,groupBy,metric,order]);
  const matrix=useMemo(()=>usageMatrix(filtered),[filtered]);
  const highestGroup=Math.max(1,...groups.map(group=>group[metric]));
  const highestCell=Math.max(1,...[...matrix.cells.values()].map(cell=>cell[metric]));

  const tabs:{id:View;label:string}[]=[
    {id:'words',label:'คำยอดนิยม'},
    {id:'category',label:'แยกตามหมวด'},
    {id:'letter',label:'แยกตามอักษร'},
    {id:'matrix',label:'หมวด × อักษร'},
    {id:'unused',label:'ยังไม่เคยใช้'}
  ];
  function inspectWord(cat:string,consonant:string,word?:string){
    inspect(cat,consonant,word);
  }
  return <section className="panel popularity-panel" aria-label="แดชบอร์ดความนิยมคำศัพท์">
    <div className="panel-title">
      <div><div className="pop-eyebrow">WORD INSIGHTS · ALL TIME</div><h2>แดชบอร์ดคำยอดนิยม</h2></div>
      <button className="button ghost pop-refresh" disabled={status==='loading'} type="button"
        onClick={refresh}>{status==='loading'?'กำลังอ่านข้อมูล...':'↻ โหลดสถิติใหม่'}</button>
    </div>
    <p className="pop-subtitle">สถิติสะสมจากคำตอบที่ถูกต้องเมื่อจบรอบ แยกคำตามหมวดจริง คำเดียวกันคนละหมวดจะนับแยกกัน</p>
    {status!=='ready'?<div className="pop-unavailable" role="status">
      <strong>{status==='loading'?'กำลังดึงสถิติจาก AWS':
        status==='error'?'โหลดสถิติไม่ได้':'ยังไม่ได้โหลดข้อมูลสถิติ'}</strong>
      <p>{status==='error'?(error||'ไม่สามารถเชื่อมต่อ AWS ได้'):
        'ต้องโหลดข้อมูลจากฐานข้อมูลก่อน จึงจะแสดงอันดับและกราฟจริงได้'}</p>
      {status!=='loading'?<button className="button ghost" type="button" onClick={refresh}>ลองโหลดอีกครั้ง</button>:null}
    </div>:<>
      <div className="pop-overview">
        <div><span>ใช้คำทั้งหมด</span><strong>{fmt(total.uses)}</strong><small>ครั้งสะสม</small></div>
        <div><span>คำที่เคยถูกใช้</span><strong>{fmt(total.usedEntries)}</strong><small>รายการคำ/หมวด</small></div>
        <div><span>คำที่ยังไม่ถูกใช้</span><strong>{fmt(total.unusedEntries)}</strong><small>รวมฉบับร่างในเครื่อง</small></div>
        <div><span>คะแนนที่ได้รับรวม</span><strong>{fmt(total.points)}</strong><small>คะแนนจากคำตอบที่รับรอง</small></div>
      </div>
      {total.uses===0?<p className="pop-empty-note">ยังไม่มีการใช้คำถูกบันทึกในฐานข้อมูล คลังคำยังแสดงได้ แต่ยังไม่มีอันดับยอดนิยมจริง</p>:null}
      <div className="pop-tabs" role="group" aria-label="เลือกรูปแบบแดชบอร์ด">
        {tabs.map(tab=><button key={tab.id} type="button"
          className={view===tab.id?'pop-tab active':'pop-tab'}
          aria-pressed={view===tab.id}
          onClick={()=>{setView(tab.id);if(tab.id==='unused')setOrder('least');}}>
          {tab.label}</button>)}
      </div>
      <div className="pop-controls">
        <label>หมวด
          <select value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="">ทุกหมวด</option>
            {CATEGORY_OPTIONS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <label>พยัญชนะ
          <select value={letter} onChange={e=>setLetter(e.target.value)}>
            <option value="">ทุกตัวอักษร</option>
            {LETTER_OPTIONS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <label>แสดงตาม
          <select value={metric} onChange={e=>setMetric(e.target.value as UsageMetric)}>
            <option value="uses">จำนวนครั้ง</option>
            <option value="points">คะแนนสะสม</option>
          </select>
        </label>
        <label>เรียงลำดับ
          <select value={order} onChange={e=>setOrder(e.target.value as UsageOrder)}>
            <option value="most">มาก → น้อย</option>
            <option value="least">น้อย → มาก</option>
          </select>
        </label>
        <label>จำนวนอันดับ
          <select value={limit} onChange={e=>setLimit(Number(e.target.value))}>
            {[10,20,50,100].map(n=><option key={n} value={n}>{n} รายการ</option>)}
          </select>
        </label>
      </div>
      <div className="pop-filter-summary">
        <span>ผลรวมตามตัวกรอง <strong>{fmt(scoped.uses)}</strong> ครั้ง · <strong>{fmt(scoped.points)}</strong> คะแนน</span>
        <span>มีคำใช้แล้ว {fmt(scoped.usedEntries)} / {fmt(scoped.entries)} รายการ
          ({scoped.coverage.toFixed(1)}%)</span>
        {(category||letter)?<button type="button" onClick={()=>{setCategory('');setLetter('');}}>ล้างตัวกรอง</button>:null}
      </div>
      {view==='words'||view==='unused'?
        <div className="pop-ranking">
          <div className="pop-rank-title">
            <h3>{view==='unused'?'คำที่ยังไม่มีใครใช้':'อันดับคำที่ถูกใช้'}</h3>
            <span>คำหนึ่งอาจปรากฏได้หลายหมวด · กดดูคำเพื่อเปิดในคลัง</span>
          </div>
          <div className="pop-word-scroll"><table className="pop-words-table">
            <thead><tr><th>อันดับ</th><th>คำศัพท์</th><th>หมวด</th><th>พยัญชนะ</th>
              <th>ใช้แล้ว</th><th>คะแนน</th><th>สัดส่วน</th><th></th></tr></thead>
            <tbody>
              {sorted.slice(0,limit).map((row,i)=><tr key={row.category+'::'+row.word}>
                <td className="pop-number">{i+1}</td>
                <td className="pop-word">
                  <strong>{row.word}</strong>{row.archived?<small>คำเก่าที่ถอดจากคลัง</small>:
                    row.draft?<small>ฉบับร่าง</small>:null}
                </td>
                <td>{row.label}</td><td>{letterCaption(row.letter)}</td>
                <td className="pop-numeric">{fmt(row.uses)}</td>
                <td className="pop-numeric">{fmt(row.points)}</td>
                <td><div className="pop-mini-bar" role="img" aria-label={fmt(row[metric])+' '+metricName(metric)}>
                  <div style={{width:(sorted[0]?.[metric]>0?row[metric]/sorted[0][metric]*100:0)+'%'}}/></div></td>
                <td><button className="pop-drill" type="button" onClick={()=>inspectWord(row.category,row.letter,row.word)}>ดูคำ</button></td>
              </tr>)}
              {!sorted.length?<tr><td colSpan={8} className="pop-no-data">ไม่มีคำตามเงื่อนไขที่เลือก</td></tr>:null}
            </tbody>
          </table></div>
          {sorted.length>limit?<p className="pop-footnote">แสดง {fmt(limit)} จาก {fmt(sorted.length)} คำ ปรับจำนวนอันดับด้านบนเพื่อดูเพิ่มเติม</p>:null}
        </div>:null}
      {(view==='category'||view==='letter')?
        <div className="pop-graph">
          <div className="pop-rank-title"><h3>{view==='category'?'ความนิยมแยกตามหมวด':'ความนิยมแยกตามพยัญชนะ'}</h3>
            <span>ความยาวกราฟเทียบจากจำนวน{metricName(metric)} · กดแถวเพื่อดูคำ</span></div>
          <div className="pop-bars">
            {groups.slice(0,limit).map((g:UsageGroup,i)=><button key={g.key} type="button"
              className="pop-bar-row" onClick={()=>inspectWord(g.category,g.letter)}>
              <span className="pop-bar-position">{i+1}</span>
              <span className="pop-bar-name">{view==='letter'?letterCaption(g.letter):g.label}
                <small>{fmt(g.usedEntries)} จาก {fmt(g.entries)} คำที่เคยถูกใช้</small></span>
              <span className="pop-bar-track"><span style={{width:(g[metric]/highestGroup*100)+'%'}}/></span>
              <strong className="pop-bar-value">{fmt(g[metric])}</strong>
            </button>)}
            {!groups.length?<p className="pop-no-data">ไม่มีหมวดหรือพยัญชนะตามตัวกรอง</p>:null}
          </div>
          {groups.length>limit?<p className="pop-footnote">แสดง {fmt(limit)} จาก {fmt(groups.length)} กลุ่ม</p>:null}
        </div>:null}
      {view==='matrix'?<div className="pop-matrix">
        <div className="pop-rank-title"><h3>ตารางหมวด × พยัญชนะ</h3>
          <span>ตัวเลขในช่องคือ{metricName(metric)} · กดช่องเพื่อค้นคำในคู่นั้น</span></div>
        <div className="pop-matrix-scroll" role="region" aria-label="ตารางความนิยมแยกหมวดและพยัญชนะ" tabIndex={0}>
          <table><thead><tr><th>หมวด</th>
            {matrix.letters.map(ch=><th key={ch} title={letterCaption(ch)}>{ch}</th>)}
            <th>รวม</th>
          </tr></thead><tbody>
            {matrix.categories.map(cat=><tr key={cat}>
              <th>{categoryName(cat)}</th>
              {matrix.letters.map(ch=>{
                const cell=matrix.cells.get(cat+'\u0000'+ch);
                if(!cell)return <td className="pop-matrix-empty" key={ch}>—</td>;
                const amount=cell[metric];
                return <td key={ch} className="pop-matrix-cell">
                  <button type="button" title={categoryName(cat)+' · '+letterCaption(ch)+': '+fmt(amount)+' '+metricName(metric)}
                    style={{backgroundColor:amount>0?'rgba(231,180,107,'+(0.15+0.7*amount/highestCell)+')':undefined}}
                    onClick={()=>inspectWord(cat,ch)}>{fmt(amount)}</button>
                </td>;
              })}
              <td className="pop-matrix-total">{fmt(usageGroups(filtered.filter(row=>row.category===cat),'category')[0]?.[metric]||0)}</td>
            </tr>)}
          </tbody></table>
        </div>
        <p className="pop-footnote">— หมายถึงไม่มีคำในคู่หมวด/ตัวอักษรนั้น · 0 หมายถึงมีคำ แต่ยังไม่มีการใช้</p>
      </div>:null}
      <p className="pop-disclaimer">ข้อมูลเป็นยอดสะสมตั้งแต่เปิดระบบเก็บสถิติ ไม่มีประวัติย้อนหลังแยกรายวัน และไม่ได้หมายถึงจำนวนผู้เล่นที่ไม่ซ้ำกัน คำฉบับร่างยังไม่มีสถิติจริง</p>
    </>}
  </section>;
}
