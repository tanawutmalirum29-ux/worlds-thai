import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  analyzeRarity, rarityDay, roundRarityObservations, stabilizeRarity,
  wordsForGroup, type RarityObservation, type RarityTier
} from '../amplify/functions/game/rarity.ts';
import { applyAction, newMatch, scoreRound } from '../amplify/functions/game/logic.ts';

const now=Date.parse('2026-10-29T12:00:00Z');
function sample(words: string[], counts: number[]): RarityObservation[] {
  const items:RarityObservation[]=[];
  for(let w=0;w<words.length;w++){
    for(let i=0;i<counts[w];i++){
      const occurredAt=now-(8-i%8)*86400000+1000*(w+1);
      items.push({
        group:'ส#animal',eventId:String(occurredAt)+'#'+w+'#'+i,
        matchId:'room-'+(i%30),occurredAt,
        entries:[{playerId:'player-'+((Math.floor(i/8)+w*7)%100),word:words[w]}],
        ttl:Math.floor(now/1000)+86400
      });
    }
  }
  return items;
}
function analyze(counts:number[],birth=now-15*86400000){
  const words=counts.map((_,i)=>'test-word-'+i);
  return analyzeRarity({
    words,observations:sample(words,counts),
    firstEligibleAt:Object.fromEntries(words.map(w=>[w,birth])),
    groupStartedAt:now-15*86400000,now
  });
}
test('a handful of extremely popular words do NOT create false rarity among the remaining words',()=>{
  const data=analyze([...Array(8).fill(40),400,420]);
  assert.equal(data.eligible,true);
  assert.deepEqual(data.candidates,{});
});
test('an evenly distributed category can legitimately have ZERO rare words',()=>{
  const data=analyze(Array(20).fill(40));
  assert.equal(data.eligible,true);
  assert.deepEqual(data.candidates,{});
});
test('one or multiple genuine lower-tail words become rare after adequate samples',()=>{
  const a=analyze([...Array(8).fill(40),2,1]);
  assert.equal(a.eligible,true);
  assert.equal(a.candidates['test-word-8'],1);
  assert.equal(a.candidates['test-word-9'],1);
  const b=analyze([...Array(18).fill(40),2,1]);
  assert.equal(b.eligible,true);
  assert.equal(b.candidates['test-word-18'],2);
  assert.equal(b.candidates['test-word-19'],2);
});
test('majority popularity shift may legitimately create a lower tail',()=>{
  const data=analyze([...Array(6).fill(400),...Array(4).fill(20)]);
  assert.equal(data.eligible,true);
  assert.equal(data.candidates['test-word-6'],1);
  assert.equal(data.candidates['test-word-9'],1);
});
test('cold start, tiny pools, and newly introduced words get NO bonus',()=>{
  assert.equal(analyze(Array(10).fill(2)).eligible,false);
  assert.equal(analyze(Array(9).fill(50)).eligible,false);
  assert.equal(analyze(Array(20).fill(50),now-86400000).eligible,false);
});
test('only one distinct player+word+day counts towards popularity',()=>{
  const words=Array.from({length:10},(_,i)=>'test-word-'+i);
  const repeated=sample(words,Array(10).fill(40)).map((x,i)=>({
    ...x,entries:[{playerId:'one-player',word:words[i%10]}]
  }));
  const result=analyzeRarity({
    words,observations:repeated,
    firstEligibleAt:Object.fromEntries(words.map(w=>[w,now-15*86400000])),
    groupStartedAt:now-15*86400000,now
  });
  assert.equal(result.eligible,false);
  assert.equal(result.uniquePlayers,1);
});
test('rarity tier promotion needs two distinct days; demotion needs three',()=>{
  const day1='2026-10-27',day2='2026-10-28',day3='2026-10-29';
  const candidate:Record<string,RarityTier>={tiger:2};
  const first=stabilizeRarity(candidate,undefined,day1,true);
  assert.deepEqual(first.bonuses,{});
  const second=stabilizeRarity(candidate,first,day2,true);
  assert.equal(second.bonuses.tiger,2);
  const third=stabilizeRarity({},second,day3,true);
  assert.equal(third.bonuses.tiger,2);
  const fourth=stabilizeRarity({},third,'2026-10-30',true);
  assert.equal(fourth.bonuses.tiger,2);
  const fifth=stabilizeRarity({},fourth,'2026-10-31',true);
  assert.equal(fifth.bonuses.tiger,undefined);
  assert.deepEqual(stabilizeRarity(candidate,undefined,day2,false).bonuses,{});
});
test('Thai day switches at 03:00 Bangkok and canonical dictionary groups preserve dessert rules',()=>{
  assert.equal(rarityDay(Date.parse('2026-10-28T19:59:59Z')),'2026-10-28');
  assert.equal(rarityDay(Date.parse('2026-10-28T20:00:00Z')),'2026-10-29');
  assert.ok(wordsForGroup('ค','dessert').includes('ขนมครก'));
  assert.ok(!wordsForGroup('ข','dessert').includes('ขนมครก'));
});
test('rarity only awards verified unique answers; total bonus capped at 3',()=>{
  const game=newMatch('room-1234567890abcdef1234',now);
  applyAction(game,'create','one',now,'one');
  applyAction(game,'join','two',now,'two');
  applyAction(game,'start','one',now+1000);
  game.letter='ส';game.categories=['animal','food','sport'];
  game.rarityBonuses={animal:{'เสือ':2},food:{'ส้มตำ':2},sport:{'สนุกเกอร์':2}};
  applyAction(game,'draft','one',now+2000,'',{animal:'เสือ',food:'ส้มตำ',sport:'สนุกเกอร์'});
  let score=scoreRound(game);
  assert.equal(score[0].points,9);
  assert.deepEqual(score[0].rarityBonus,{animal:2,food:1});
  applyAction(game,'draft','two',now+3000,'',{animal:'เสือ'});
  score=scoreRound(game);
  assert.equal(score[0].perCategory.animal,1);
  assert.equal(score[0].rarityBonus?.animal,undefined);
  assert.equal(score[1].perCategory.animal,1);
});
test('round observation is produced once at settle and never on drafts or repeat review',()=>{
  const game=newMatch('room-abcdefabcdefabcdefab',now);
  applyAction(game,'create','one',now,'one');
  applyAction(game,'join','two',now,'two');
  applyAction(game,'start','one',now+1000);
  game.letter='ข';game.categories=['dessert'];
  applyAction(game,'draft','one',now+2000,'',{dessert:'ไข่หงส์'});
  const before=structuredClone(game);
  assert.deepEqual(roundRarityObservations(before,game,now+3000),[]);
  for(const p of game.players)p.lastSeen=game.deadline;
  // Advancing with an active player at deadline changes playing -> review.
  importAdvance(game,game.deadline+1);
  const events=roundRarityObservations(before,game,now+4000);
  assert.equal(events.length,1);
  assert.equal(events[0].entries[0].word,'ไข่หงส์');
  assert.deepEqual(roundRarityObservations(game,game,now+5000),[]);
});
function importAdvance(game:ReturnType<typeof newMatch>,at:number){
  // Require without dynamic import so strip-types test runner stays deterministic.
  advance(game,at);
}
import { advance } from '../amplify/functions/game/logic.ts';
test('backend atomic transaction contains match, frequency delta and rarity event',()=>{
  const code=readFileSync(new URL('../amplify/functions/game/handler.ts',import.meta.url),'utf8');
  assert.match(code,/roundRarityObservations\(old,updated,/);
  assert.match(code,/RARITY_OBSERVATIONS_TABLE/);
  assert.match(code,/await assignRaritySnapshot\(before,state,now\)/);
  const infrastructure=readFileSync(new URL('../amplify/backend.ts',import.meta.url),'utf8');
  assert.match(infrastructure,/RarityObservations/);
  assert.match(infrastructure,/RarityGroupMeta/);
});

test('tree rarity pool deduplicates optional ต้น and assigns real consonant',()=>{
  const pool=wordsForGroup('ม','tree');
  assert.ok(pool.includes('มะม่วง'));
  assert.equal(pool.filter(w=>w==='มะม่วง').length,1);
  assert.ok(!wordsForGroup('ต','tree').includes('มะม่วง'));
  const names=wordsForGroup('พ','tree');
  assert.equal(names.filter(w=>w==='โพธิ์').length,1);
});

test('rarity pools use the real initial after fish/bird/insect/flower labels',()=>{
  for(const [category,bare,full,letter] of [
    ['fish','ดุก','ปลาดุก','ด'],
    ['bird','กระจอก','นกกระจอก','ก'],
    ['insect','ปอ','แมลงปอ','ป'],
    ['flower','บัว','ดอกบัว','บ']
  ]){
    const pool=wordsForGroup(letter,category);
    assert.ok(pool.includes(bare),category);
    assert.equal(pool.filter(x=>x===bare).length,1,category);
    assert.ok(!wordsForGroup(full[0],category).includes(bare),category);
  }
});

test('vegetable rarity pool uses the consonant after ผัก and deduplicates spelling variants',()=>{
  const pool=wordsForGroup('บ','vegetable');
  assert.ok(pool.includes('บุ้ง'));
  assert.equal(pool.filter(word=>word==='บุ้ง').length,1);
  assert.ok(!wordsForGroup('ผ','vegetable').includes('บุ้ง'));
});
