import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newMatch, applyAction, advance, snapshot, gameMode,
  validateSettings, tailNextConsonant, tailWordStatus, canonicalTailWord,
  TAIL_START_LETTERS, initialConsonant, timedTransitionDue
} from '../amplify/functions/game/logic.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { TAIL_EXTRA_WORDS } from '../amplify/functions/game/tail-extra-words.ts';

const NOW=1_800_000_000_000;
const ROOM_ID='room-1234567890abcdef1234';
function match(count=3) {
  const m=newMatch(ROOM_ID,NOW);
  applyAction(m,'create','host',NOW,'Host',undefined,
    {mode:'tail',rounds:3,categories:5,seconds:20});
  for(let index=1;index<count;index++)
    applyAction(m,'join','guest'+index,NOW,'Guest '+index);
  applyAction(m,'start','host',NOW+1000);
  return m;
}
function playable(letter:string,used:string[]=[]):string {
  const found=Object.values(WORD_BANK).flat().concat([...TAIL_EXTRA_WORDS])
    .find(word=>tailWordStatus(word,letter,used)==='ok');
  assert.ok(found,'expected a reviewed word for '+letter);
  return found;
}

test('tail is a distinct mode; classic modes and their settings remain intact',()=>{
  assert.equal(gameMode(validateSettings({mode:'tail'})),'tail');
  assert.equal(gameMode(validateSettings({mode:'letter'})),'letter');
  assert.equal(gameMode(validateSettings({mode:'category'})),'category');
  assert.equal(gameMode(validateSettings({})),'letter');
  assert.throws(()=>validateSettings({mode:'not-a-mode'}),/ตั้งค่า/);
  assert.ok(TAIL_START_LETTERS.length>5);
  assert.ok(!Object.keys(WORD_BANK).includes('tail'));
  assert.ok(TAIL_EXTRA_WORDS.includes('การกระทำ'));
});

test('Thai ending uses the last spoken syllable, not the final written consonant',()=>{
  assert.equal(tailNextConsonant('การกระทำ'),'ท');
  assert.equal(tailNextConsonant('ส้มตำ'),'ต');
  assert.equal(tailNextConsonant('รถไฟ'),'ฟ');
  assert.equal(tailNextConsonant('ดอกไม้'),'ม');
  assert.equal(tailNextConsonant('ขนมครก'),'ค');
  assert.equal(tailNextConsonant('ความรัก'),'ร');
  assert.equal(canonicalTailWord('  การกระทำ  '),'การกระทำ');
  assert.equal(tailWordStatus('การกระทำ','ก'),'ok');
  assert.equal(tailWordStatus('คำที่ไม่มีจริงในพจนานุกรม','ค'),'unknown');
});

test('round robin: only current seat may submit, and the next player gets the tail',()=>{
  const m=match(3);
  m.letter='ก';
  assert.equal(m.tail?.currentId,'host');
  assert.deepEqual(m.tail?.order.map(p=>p.id),['host','guest1','guest2']);
  assert.throws(()=>applyAction(m,'tail-submit','guest1',NOW+2000,'',{word:'การกระทำ'}),/ยังไม่ถึงตา/);
  applyAction(m,'tail-submit','host',NOW+2000,'',{word:'การกระทำ'});
  assert.equal(m.letter,'ท');
  assert.equal(m.tail?.currentId,'guest1');
  assert.equal(m.tail?.lastWord,'การกระทำ');
  assert.equal(m.tail?.usedWords.length,1);
  assert.equal(m.players[0].score,1);
  assert.equal(snapshot(m).tail?.currentId,'guest1');
  assert.equal(m.round,2);
});

test('duplicate of any earlier played word eliminates immediately, not just previous turn',()=>{
  const m=match(2);
  m.letter='ก';
  applyAction(m,'tail-submit','host',NOW+2000,'',{word:'การกระทำ'});
  const second=playable('ท',['การกระทำ']);
  const secondLetter=tailNextConsonant(second);
  applyAction(m,'tail-submit','guest1',NOW+3000,'',{word:second});
  assert.equal(m.tail?.currentId,'host');
  assert.equal(m.letter,secondLetter);
  // Even if the repeated word has the wrong initial for this turn, repeat
  // still means immediate elimination, and the other player wins.
  applyAction(m,'tail-submit','host',NOW+4000,'',{word:'การกระทำ'});
  assert.equal(m.phase,'final');
  assert.equal(m.tail?.eliminated.host?.reason,'repeat');
  assert.equal(m.tail?.eliminated.host?.place,2);
  assert.equal(m.tail?.currentId,'guest1');
});

test('invalid/unknown entries never become accepted or stored; player may retry',()=>{
  const m=match(2);
  m.letter='ก';
  assert.throws(()=>applyAction(m,'tail-submit','host',NOW+2000,'',{word:'แมว'}),/ขึ้นต้น/);
  assert.throws(()=>applyAction(m,'tail-submit','host',NOW+2000,'',{word:'กกกกกสมมุติ'}),/พจนานุกรม/);
  assert.equal(m.tail?.usedWords.length,0);
  assert.equal(m.tail?.currentId,'host');
  assert.equal(m.phase,'playing');
});

test('server timer eliminates a missing answer and closes match at last survivor',()=>{
  const m=match(3);
  const first=m.tail?.currentId;
  assert.ok(first);
  assert.equal(timedTransitionDue(m,m.deadline),true);
  const cutoff=m.deadline;
  advance(m,cutoff);
  assert.equal(m.tail?.eliminated[first]?.reason,'timeout');
  assert.equal(m.tail?.eliminated[first]?.place,3);
  assert.equal(m.tail?.currentId,'guest1');
  assert.equal(m.deadline,cutoff+20_000);
  advance(m,m.deadline);
  assert.equal(m.phase,'final');
  assert.equal(m.tail?.eliminated.guest1?.place,2);
  assert.equal(m.tail?.currentId,'guest2');
  assert.equal(m.deadline,0);
  assert.ok(Array.isArray(snapshot(m).tail?.moves));
});

test('leaving an active chain loses the turn and preserves winner standings',()=>{
  const m=match(2);
  applyAction(m,'leave','host',NOW+2000);
  assert.equal(m.phase,'final');
  assert.equal(m.tail?.eliminated.host?.reason,'left');
  assert.equal(m.tail?.eliminated.host?.place,2);
  assert.equal(m.tail?.order.length,2);
  assert.equal(m.tail?.currentId,'guest1');
});

test('replay preserves seats and settings but clears all used answers and eliminations',()=>{
  const m=match(2);
  advance(m,m.deadline);
  assert.equal(m.phase,'final');
  applyAction(m,'rematch','host',m.deadline+1000);
  applyAction(m,'rematch','guest1',m.deadline+1001);
  assert.equal(m.phase,'lobby');
  assert.equal(m.tail,undefined);
  assert.equal(m.settings.mode,'tail');
  applyAction(m,'start','host',NOW+30000);
  assert.equal(m.phase,'playing');
  assert.deepEqual(m.tail?.usedWords,[]);
});

test('a valid word cannot trigger classic draft scoring in tail mode',()=>{
  const m=match(2);
  assert.throws(()=>applyAction(m,'draft','host',NOW+2000,'',{verb:'รีดผ้า'}),/ปุ่มส่งคำ/);
  assert.throws(()=>applyAction(m,'skip','host',NOW+2000),/ไม่มีระบบข้ามเวลา/);
});
