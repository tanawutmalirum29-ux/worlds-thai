import type { FormEvent } from 'react';

export type TailViewState={
  order:{id:string;name:string}[];
  currentId:string;
  usedWords:string[];
  eliminated:Record<string,{place:number;reason:'timeout'|'repeat'|'left';word?:string}>;
  moves:{playerId:string;name:string;turn:number;letter:string;word?:string;nextLetter?:string;reason?:'timeout'|'repeat'|'left'}[];
  lastWord:string;
};
const reasonLabel=(reason?:'timeout'|'repeat'|'left')=>
  reason==='timeout'?'หมดเวลา':reason==='repeat'?'คำซ้ำ':reason==='left'?'ออกจากเกม':'';

type TailProps={
  tail:TailViewState;letter:string;remaining:number;seconds:number;
  me:string;typed:string;onTyped:(value:string)=>void;onSubmit:()=>void;
  pending:boolean;feedback:string;hint:string;hintValid:boolean;
};
export function TailModeView({
  tail,letter,remaining,seconds,me,typed,onTyped,onSubmit,pending,feedback,hint,hintValid
}:TailProps){
  const active=tail.order.find(p=>p.id===tail.currentId);
  const myTurn=tail.currentId===me && !tail.eliminated[me] && remaining>0;
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(myTurn&&!pending)onSubmit();};
  return <section className="tail-mode" aria-label="เกมคำท้าย">
    <div className="challenge-banner tail-challenge">
      <div><div className="banner-label">พยัญชนะที่ต้องขึ้นต้น</div>
        <div className="letter-display">{letter}</div>
        <div className="letter-caption">{tail.lastWord?'คำก่อนหน้า: '+tail.lastWord:'เริ่มคำแรกของเกม'}</div>
      </div>
      <div className="time-box"><span className={remaining<=5?'countdown-alert':''}>
        {remaining===0?'กำลังซิงค์ตาถัดไป':remaining<=5?'ใกล้หมดเวลา!':'เวลาของผู้เล่นคนนี้'}
      </span><strong className={remaining<=5?'countdown-pulse':''}>{remaining<=5?remaining:`${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`}</strong>
        <div className={remaining<=5?'time-track critical-track':'time-track'}>
          <div style={{width:`${Math.min(100,remaining/seconds*100)}%`}}/>
        </div>
      </div>
    </div>
    <div className="tail-playing-card">
      <div className="tail-section-heading"><h2>โหมดคำท้าย</h2>
        <p>เล่นเรียงตามเข็มนาฬิกา · คำซ้ำหรือหมดเวลาจะถูกคัดออก</p></div>
      <div className="tail-circle" role="list" aria-label="ตำแหน่งผู้เล่นเป็นวงกลม">
        <div className="tail-circle-center"><small>ตาปัจจุบัน</small>
          <b>{active?.name||'—'}</b><span>เริ่มด้วย {letter}</span></div>
        {tail.order.map((person,index)=>{
          const eliminated=tail.eliminated[person.id];
          const isActive=person.id===tail.currentId&&!eliminated;
          const angle=2*Math.PI*index/tail.order.length;
          return <div key={person.id} role="listitem"
            style={{left:`${50+36*Math.sin(angle)}%`,top:`${50-36*Math.cos(angle)}%`}}
            className={`tail-seat ${isActive?'tail-seat-active':''} ${eliminated?'tail-seat-out':''} ${person.id===me?'tail-seat-you':''}`}>
            <span className="tail-seat-avatar">{person.name.charAt(0)}</span>
            <strong title={person.name}>{person.name}{person.id===me?' (คุณ)':''}</strong>
            <small>{eliminated?`อันดับ ${eliminated.place}`:isActive?'กำลังตอบ':'รอตา'}</small>
          </div>;
        })}
      </div>
      <form className="tail-answer-form" onSubmit={submit}>
        <label htmlFor="tail-word">{myTurn?'ตาของคุณ · พิมพ์คำแล้วกดส่ง':tail.eliminated[me]?'คุณถูกคัดออกแล้ว · ชมเกมต่อได้':'รอผู้เล่นคนปัจจุบันตอบ'}</label>
        <div className="tail-answer-row">
          <input id="tail-word" value={typed} maxLength={48} autoComplete="off" autoCorrect="off" spellCheck={false}
            disabled={!myTurn||pending} onChange={e=>onTyped(e.target.value)}
            placeholder={myTurn?`คำขึ้นต้นด้วย ${letter}...`:'รอตาของคุณ'}/>
          <button type="submit" className="primary-btn" disabled={!myTurn||!typed.trim()||pending}>
            {pending?'กำลังส่ง':'ส่งคำ'}
          </button>
        </div>
        {feedback?<p className="tail-feedback tail-feedback-error" role="alert">{feedback}</p>:
         myTurn?<p className={hintValid?'tail-feedback tail-feedback-ok':'tail-feedback'} role="status">{hint||'คำต้องมีในพจนานุกรมเกม'}</p>:
         <p className="tail-feedback">คำที่ถูกต้องจะส่งพยัญชนะของพยางค์สุดท้ายให้คนถัดไป</p>}
      </form>
      <div className="tail-history"><h3>คำที่เล่นไปแล้ว</h3>
        {!tail.moves.length?<p>ยังไม่มีคำที่ส่ง</p>:
        <div className="tail-move-list">{tail.moves.slice(-8).reverse().map((move,index)=>
          <div key={move.turn+'-'+move.playerId+'-'+index} className={move.reason?'tail-move tail-move-out':'tail-move'}>
            <span>{move.name}</span>
            <b>{move.word||'—'}</b>
            <small>{move.reason?reasonLabel(move.reason)+' · คัดออก':`${move.letter} → ${move.nextLetter}`}</small>
          </div>)}</div>}
      </div>
    </div>
  </section>;
}
export function TailFinalView({tail,ordered,me}:{tail:TailViewState;ordered:{id:string;name:string;score:number}[];me:string}){
  return <section className="final-view tail-final-view" aria-label="ผลการแข่งขันคำท้าย">
    <div className="final-crown">♛</div>
    <p className="results-round">WORD CHAIN COMPLETE</p>
    <h2>{ordered[0]?.name||'ไม่มีผู้ชนะ'} ชนะโหมดคำท้าย!</h2>
    <p>เรียงอันดับจากคนที่อยู่รอดนานที่สุด · ทุกคนกดเล่นอีกครั้งเพื่อกลับห้องเดิม</p>
    <div className="final-podium">{ordered.map((p,index)=><div className="final-player" key={p.id}>
      <span>{index===0?'♛':`#${index+1}`}</span><b>{p.name}{p.id===me?' (คุณ)':''}</b>
      <strong>{index===0?'ผู้ชนะ':reasonLabel(tail.eliminated[p.id]?.reason)}</strong>
    </div>)}</div>
    <div className="tail-history"><h3>คำตอบและการคัดออกล่าสุด</h3>
      <div className="tail-move-list">{tail.moves.slice(-30).map((move,index)=>
        <div className={move.reason?'tail-move tail-move-out':'tail-move'} key={move.turn+'-'+move.playerId+'-'+index}>
          <span>{move.name}</span><b>{move.word||'—'}</b>
          <small>{move.reason?reasonLabel(move.reason):`${move.letter} → ${move.nextLetter}`}</small>
        </div>)}</div>
    </div>
  </section>;
}
