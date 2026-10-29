import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newMatch,applyAction,chooseRound,advance,scoreRound,snapshot,publicRoom,
  validRoundAnswer,eligibleCategoryLetters,eligibleCategories,validateSettings,LETTERS
} from '../amplify/functions/game/logic.ts';
import {WORD_BANK,MIN_WORDS_PER_PAIR} from '../amplify/functions/game/dictionary.ts';
import {wordInitialForCategory,canonicalAnswer} from '../amplify/functions/game/logic.ts';
import {roundWordDeltas} from '../amplify/functions/game/stats.ts';
import {roundRarityObservations} from '../amplify/functions/game/rarity.ts';
import {roundDessertSuggestions} from '../amplify/functions/game/suggestions.ts';

const now=1_700_000_000_000;
function room(count=5){
  const m=newMatch('room-abcdeabcdeabcdeabcde',now);
  applyAction(m,'create','host',now,'Host',undefined,{mode:'category',rounds:3,categories:count,seconds:40});
  applyAction(m,'join','guest',now,'Guest');
  return m;
}
test('category mode settings are validated and the legacy mode remains the default',()=>{
  assert.equal(validateSettings({mode:'category'}).mode,'category');
  assert.equal(validateSettings({mode:'letter'}).mode,'letter');
  assert.equal(validateSettings({mode:undefined}).mode,undefined);
  for(const mode of ['invalid',42,null])assert.throws(()=>validateSettings({mode}),/ตั้งค่าไม่ถูกต้อง/);
});
test('each prompt is a distinct supported consonant in one reviewed category',()=>{
  for(let count=3;count<=8;count++){
    for(const seed of [0,.1,.31,.52,.76,.99]){
      const m=room(count);
      const round=chooseRound(m,()=>seed);
      assert.ok(round.topicCategory);
      assert.equal(round.letter,'');
      assert.equal(round.categories.length,count);
      assert.equal(new Set(round.categories).size,count);
      for(const letter of round.categories){
        assert.ok(LETTERS.includes(letter as never));
        assert.ok(eligibleCategories(letter).includes(round.topicCategory!));
        const matching=new Set((WORD_BANK[round.topicCategory!]||[])
          .filter(word=>wordInitialForCategory(word,round.topicCategory!)===letter)
          .map(word=>canonicalAnswer(word,round.topicCategory!)));
        assert.ok(matching.size>=MIN_WORDS_PER_PAIR,
          round.topicCategory+' / '+letter+' must have at least two distinct reviewed words');
      }
      assert.ok(eligibleCategoryLetters(round.topicCategory!).length>=count);
    }
  }
});
test('category mode rejects wrong letters, wrong categories and invented words',()=>{
  assert.equal(validRoundAnswer('เสือ','','ส','animal'),true);
  assert.equal(validRoundAnswer('ช้าง','','ช','animal'),true);
  assert.equal(validRoundAnswer('ส้มตำ','','ส','animal'),false);
  assert.equal(validRoundAnswer('เสือ','','ช','animal'),false);
  assert.equal(validRoundAnswer('สัตว์ประหลาดที่ไม่มีจริง','','ส','animal'),false);
  assert.equal(validRoundAnswer('ขนมครก','','ค','dessert'),true);
  assert.equal(validRoundAnswer('ขนมครก','','ข','dessert'),false);
  assert.equal(validRoundAnswer('ต้นมะม่วง','','ม','tree'),true);
  assert.equal(validRoundAnswer('ต้นมะม่วง','','ต','tree'),false);
});
test('score, stats, rarity and final round history track each distinct letter separately',()=>{
  const m=room(3);
  applyAction(m,'start','host',now+1000);
  m.topicCategory='animal';m.letter='';m.categories=['ส','ช','ม'];
  assert.equal(snapshot(m).topicCategory,'animal');
  applyAction(m,'draft','host',now+2000,'',{ส:'เสือ',ช:'ช้าง',ม:'ม้า'});
  applyAction(m,'draft','guest',now+2000,'',{ส:'เสือ',ช:'ส้มตำ',ม:'ม้า'});
  assert.deepEqual(scoreRound(m).map(e=>e.points),[4,2]);
  const before=structuredClone(m);
  for(const player of m.players)player.lastSeen=m.deadline;
  advance(m,m.deadline+1);
  assert.equal(m.phase,'review');
  assert.equal(m.history.at(-1)?.topicCategory,'animal');
  assert.deepEqual(m.history.at(-1)?.categories,['ส','ช','ม']);
  const rows=roundWordDeltas(before,m);
  assert.deepEqual(rows.map(row=>row.id).sort(),[
    'stats#ช#animal#ช้าง','stats#ม#animal#ม้า','stats#ส#animal#เสือ'].sort());
  const tiger=rows.find(row=>row.word==='เสือ');
  assert.equal(tiger?.timesUsed,2);
  assert.equal(tiger?.totalPoints,2);
  const observations=roundRarityObservations(before,m,now+45000);
  assert.deepEqual(observations.map(row=>row.group).sort(),
    ['ส#animal','ช#animal','ม#animal'].sort());
  assert.equal(publicRoom(m,now+45000),null);
  const next=m.deadline+1;
  for(const player of m.players)player.lastSeen=next;
  advance(m,next,()=>0.5);
  assert.equal(m.phase,'playing');
  assert.ok(m.topicCategory);
  assert.equal(new Set(m.categories).size,m.settings.categories);
  assert.ok(m.categories.every(letter=>eligibleCategoryLetters(m.topicCategory!).includes(letter)));
});
test('category mode dessert suggestions use the assigned letter, not an empty round letter',()=>{
  const m=room(3);
  applyAction(m,'start','host',now+1000);
  m.topicCategory='dessert';m.letter='';m.categories=['ข','ค','ส'];
  applyAction(m,'draft','host',now+2000,'',{ข:'ขนมข้าวดาว',ค:'ขนมครก',ส:'ขนมส้มดาว'});
  const before=structuredClone(m);
  for(const player of m.players)player.lastSeen=m.deadline;
  advance(m,m.deadline+1);
  const proposed=roundDessertSuggestions(before,m);
  assert.ok(proposed.every(s=>s.letter==='ข'||s.letter==='ส'));
  assert.ok(proposed.every(s=>s.category==='dessert'));
});
test('guest sees the room mode and can rematch with same settings',()=>{
  const m=room(8);
  assert.equal(publicRoom(m,now)?.settings.mode,'category');
  applyAction(m,'start','host',now+1000);
  m.phase='final';m.deadline=0;
  applyAction(m,'rematch','host',now+2000);
  applyAction(m,'rematch','guest',now+2001);
  assert.equal(m.phase,'lobby');
  assert.equal(m.settings.mode,'category');
  assert.equal(m.topicCategory,undefined);
  applyAction(m,'start','host',now+2200);
  assert.ok(m.topicCategory);
  assert.equal(m.categories.length,8);
});
