import test from 'node:test';
import assert from 'node:assert/strict';
import { newMatch, applyAction, advance, scoreRound, snapshot, initialConsonant, validAnswer, CATEGORIES, ROUNDS, ROUND_SECONDS, MAX_PLAYERS } from '../amplify/functions/game/logic.ts';
const start = 1_700_000_000_000;
test('five distinct categories out of 40+ and Thai letter each round', () => {
  let match = newMatch('public-1',start);
  applyAction(match,'join','p1',start,'หนึ่ง');
  applyAction(match,'join','p2',start,'สอง');
  advance(match,start + 10_000,()=>.01);
  assert.equal(match.phase,'playing');
  assert.equal(match.categories.length,5);
  assert.equal(new Set(match.categories).size,5);
  assert.ok(CATEGORIES.length>=40);
  assert.ok(match.letter.length===1);
});
test('accepts Thai leading vowels before the consonant',()=>{
  assert.equal(initialConsonant('เสือ'),'ส');
  assert.equal(initialConsonant('แมว'),'ม');
  assert.equal(initialConsonant('ไก่'),'ก');
  assert.equal(validAnswer('   เสือ  ','ส'),true);
  assert.equal(validAnswer('แมว','ส'),false);
});
test('unique 20, duplicate 10, invalid 0 and no early reveal',()=>{
  const match=newMatch('public-1',start);
  applyAction(match,'join','p1',start,'A'); applyAction(match,'join','p2',start,'B');
  advance(match,start+10000,()=>.01);
  match.letter='ส'; match.categories=['animal','job','sport','food','place'];
  applyAction(match,'submit','p1',start+11000,'',{animal:'เสือ',job:'สถาปนิก',sport:'สนุกเกอร์',food:'ส้มตำ',place:'สวน'});
  applyAction(match,'submit','p2',start+11000,'',{animal:'เสือ',job:'หมอ',sport:'สนุกเกอร์',food:'ส้มตำ',place:'โรงเรียน'});
  assert.equal('submissions' in snapshot(match),false);
  assert.equal(snapshot(match).history.length,0);
  assert.deepEqual(scoreRound(match).map(x=>x.points),[70,30]);
  for(const p of match.players) p.lastSeen=start+10000+ROUND_SECONDS*1000;
  advance(match,start+10000+ROUND_SECONDS*1000+1);
  assert.equal(match.phase,'review');
  assert.deepEqual(match.players.map(x=>x.score),[70,30]);
});
test('blocks late answers and requires membership',()=>{
  const match=newMatch('public-1',start);
  assert.throws(()=>applyAction(match,'submit','stranger',start,'',{}),/NOT_JOINED/);
  applyAction(match,'join','p1',start,'A');applyAction(match,'join','p2',start,'B');
  advance(match,start+10000);
  for(const p of match.players) p.lastSeen=match.deadline;
  assert.throws(()=>applyAction(match,'submit','p1',match.deadline+1,'',{}),/หมดเวลา/);
});
test('match capacity and rejoin are idempotent',()=>{
  const match=newMatch('public-1',start);
  for(let i=0;i<MAX_PLAYERS;i++) applyAction(match,'join',String(i),start,String(i));
  assert.throws(()=>applyAction(match,'join','extra',start,'X'),/ROOM_UNAVAILABLE/);
  applyAction(match,'join','0',start,'updated');
  assert.equal(match.players.length,MAX_PLAYERS);
  assert.equal(match.players[0].name,'updated');
});
test('three rounds transition and final reset',()=>{
  const match=newMatch('public-1',start);
  applyAction(match,'join','p1',start,'A');applyAction(match,'join','p2',start,'B');
  advance(match,start+10000);
  for(let i=1;i<=ROUNDS;i++) {
    assert.equal(match.round,i);
    for(const p of match.players) p.lastSeen=match.deadline;
    advance(match,match.deadline+1);assert.equal(match.phase,'review');
    for(const p of match.players) p.lastSeen=match.deadline;
    advance(match,match.deadline+1);
  }
  assert.equal(match.phase,'final');
  for(const p of match.players) p.lastSeen=match.deadline;
  advance(match,match.deadline+1);
  assert.equal(match.phase,'lobby'); assert.equal(match.players[0].score,0);
});
