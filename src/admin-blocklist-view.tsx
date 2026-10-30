import {useMemo,useState} from 'react';
import {BLOCKED_ENTRIES,BLOCK_KIND_LABELS,filterBlockedEntries,type BlockKind} from './admin-blocklist-data.ts';
import './admin-blocklist.css';

type Filter=BlockKind|'all';
const OPTIONS:{kind:Filter;label:string}[]=[
  {kind:'all',label:'ทุกประเภท'},
  {kind:'exact',label:BLOCK_KIND_LABELS.exact},
  {kind:'contains',label:BLOCK_KIND_LABELS.contains},
  {kind:'nickname',label:BLOCK_KIND_LABELS.nickname},
  {kind:'answer',label:BLOCK_KIND_LABELS.answer}
];

export function AdminBlocklistView(){
  const [search,setSearch]=useState('');
  const [kind,setKind]=useState<Filter>('all');
  const rows=useMemo(()=>filterBlockedEntries(search,kind),[search,kind]);
  return <section className="panel blocklist-panel" aria-label="รายการคำหยาบและคำที่ถูกแบน">
    <div className="panel-title">
      <div><h2>รายการคำหยาบ / คำแบน</h2>
        <p className="help">แสดงกฎจากระบบตรวจคำและชื่อผู้เล่นที่เกมใช้จริง รวมการลากพยัญชนะ/สระ เว้นวรรค ซ่อนอักขระ และคำอ่านภาษาอังกฤษ</p>
      </div>
    </div>
    <div className="blocklist-totals" aria-label="จำนวนกฎที่ใช้">
      <div><span>คำหยาบแบบตรงทั้งคำ</span><strong>{BLOCKED_ENTRIES.filter(row=>row.kind==='exact').length}</strong></div>
      <div><span>วลีที่ห้ามเมื่อพบในข้อความ</span><strong>{BLOCKED_ENTRIES.filter(row=>row.kind==='contains').length}</strong></div>
      <div><span>กฎพิเศษชื่อ / คำตอบ</span><strong>{BLOCKED_ENTRIES.filter(row=>row.kind==='nickname'||row.kind==='answer').length}</strong></div>
    </div>
    <div className="blocklist-controls">
      <label htmlFor="admin-blocklist-query">ค้นหาคำแบน
        <input id="admin-blocklist-query" type="search" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="ค้นจากคำหรือส่วนหนึ่งของคำ"/>
      </label>
      <label htmlFor="admin-blocklist-filter">ประเภทกฎ
        <select id="admin-blocklist-filter" value={kind} onChange={e=>setKind(e.target.value as Filter)}>
          {OPTIONS.map(option=><option key={option.kind} value={option.kind}>{option.label}</option>)}
        </select>
      </label>
    </div>
    <p className="blocklist-count" role="status">พบ {rows.length.toLocaleString('th-TH')} จาก {BLOCKED_ENTRIES.length.toLocaleString('th-TH')} รายการ</p>
    <div className="blocklist-table-wrap" role="region" aria-label="ตารางคำหยาบและคำแบน" tabIndex={0}>
      <table className="blocklist-table">
        <thead><tr><th scope="col">คำ / ข้อความ</th><th scope="col">ประเภท</th><th scope="col">เงื่อนไขการแบน</th></tr></thead>
        <tbody>{rows.map((row,index)=><tr key={row.kind+'-'+row.word+'-'+index}>
          <td className="blocklist-word">{row.word}{row.examples?<small className="blocklist-examples">เช่น {row.examples}</small>:null}</td>
          <td><span className={'blocklist-tag kind-'+row.kind}>{BLOCK_KIND_LABELS[row.kind]}</span></td>
          <td>{row.kind==='exact'?'ต้องตรงกับคำที่พิมพ์ (ตัดช่องว่างและเครื่องหมายบางชนิด)':
            row.kind==='contains'?'มีวลีนี้อยู่ส่วนใดของข้อความก็ไม่ผ่าน':
            row.kind==='nickname'?'ชื่อมีคำนี้อยู่ตรงไหนก็ห้ามตั้ง รวมการลากตัวอักษร เว้นวรรคและผสมภาษา':
            'ห้ามใช้เป็นคำตอบเดี่ยว ๆ (รวมรูปแบบลากตัวอักษร) ไม่แบนคำอื่นที่มีคำนี้อยู่ภายใน'}</td>
        </tr>)}
        {!rows.length?<tr><td className="blocklist-empty" colSpan={3}>ไม่พบคำแบนตามที่ค้นหา</td></tr>:null}
        </tbody>
      </table>
    </div>
    <p className="blocklist-note">รายการนี้ดูได้อย่างเดียว หากต้องการเพิ่มหรือลบกฎ ต้องแก้ไฟล์ <code>amplify/functions/game/moderation.ts</code> ใน GitHub แล้ว Deploy เกมใหม่ ไม่ใช่แก้จากหน้านี้</p>
    <p className="blocklist-note">ระบบตรวจชื่อที่เลี่ยงคำแบนด้วยตัวเลข วรรณยุกต์ และสระแทรกด้วย (เช่น วุี, ว123ี, ว123อี) โดยไม่เปลี่ยนข้อความจริงของผู้เล่น ระบบยุบตัวอักษรและสระที่พิมพ์ซ้ำเพื่อใช้ตรวจเท่านั้น ไม่แก้คำตอบที่ผู้เล่นพิมพ์จริง คำหยาบประเภท “ตรงทั้งคำ” จะไม่แบนคำธรรมดาที่สะกดคล้ายกัน ส่วนคำอ่านภาษาอังกฤษบางคำใช้กฎตรงทั้งคำเพื่อลดการบล็อกคำสุภาพโดยผิดพลาด</p>
  </section>;
}
