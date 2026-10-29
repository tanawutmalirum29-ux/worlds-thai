import test from 'node:test';
import assert from 'node:assert/strict';
import {newMatch,applyAction,advance} from '../amplify/functions/game/logic.ts';
import {roundDessertSuggestions,SUGGESTION_MIN_REPORTS,SUGGESTION_TTL_DAYS} from '../amplify/functions/game/suggestions.ts';
const now=1_700_000_000_000;
function round(answer1:string,answer2:string,letter='ข'){
  const game=newMatch('room-abcdefghijklmnopqrst',now);
  applyAction(game,'create','host',now,'Host');
  applyAction(game,'join','guest',now,'Guest');
  applyAction(game,'start','host',now+1000);
  game.letter=letter;game.categories=['dessert'];
  applyAction(game,'draft','host',now+2000,'',{dessert:answer1});
  applyAction(game,'draft','guest',now+2000,'',{dessert:answer2});
  const before=structuredClone(game);
  for(const p of game.players)p.lastSeen=game.deadline;
  advance(game,game.deadline+1);
  return {before,game};
}
test('only plausible unknown desserts are counted, once per finished round',()=>{
  const {before,game}=round('ขนมข้าวดาวอังคาร','ขนมข้าวดาวอังคาร');
  const reports=roundDessertSuggestions(before,game);
  assert.deepEqual(reports.map(x=>[x.word,x.letter,x.timesSuggested]),[['ขนมข้าวดาวอังคาร','ข',1]]);
  assert.equal(roundDessertSuggestions(game,game).length,0);
  assert.equal(roundDessertSuggestions(null,game).length,0);
  assert.ok(!JSON.stringify(reports).includes('host'));
  assert.ok(!JSON.stringify(reports).includes('guest'));
});
test('valid terms, wrong initials, junk and bare ขนม are never suggested',()=>{
  for(const text of ['ไข่หงส์','ขนมไข่เหี้ย','ขนม','ครก','hello','123','ขนมขนมครก']){
    const {before,game}=round(text,text);
    assert.deepEqual(roundDessertSuggestions(before,game),[],text);
  }
});
test('suggestion report requires 3 rounds and expires after 90 days',()=>{
  assert.equal(SUGGESTION_MIN_REPORTS,3);
  assert.equal(SUGGESTION_TTL_DAYS,90);
});
