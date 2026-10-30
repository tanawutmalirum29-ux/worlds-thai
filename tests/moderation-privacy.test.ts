import test from 'node:test';
import assert from 'node:assert/strict';
import {isInappropriateLanguage} from '../amplify/functions/game/moderation.ts';
import {newMatch,applyAction,advance,scoreRound,snapshot,validAnswer} from '../amplify/functions/game/logic.ts';

const now=1_700_000_000_000;
const room=()=>{
  const match=newMatch('room-aaaaaaaaaabbbbbbbbbb',now);
  applyAction(match,'create','host',now,'Host');
  applyAction(match,'join','guest',now,'Guest');
  applyAction(match,'start','host',now+1000);
  match.letter='อ';match.categories=['body','animal'];
  return match;
};

test('profanity filter catches vulgar words and spacing without broad false positives',()=>{
  for(const word of ['ควย','หี','หำ','จู๋','จิ๋ม','เจี๊ยว','แตด','ตูด','ตีน','เหี้ย','ไข่เหี้ย',
    'ขนมไข่เหี้ย','ไอ้เหี้ย','ค ว ย','ชิบหาย','ส้นตีน']){
    assert.equal(isInappropriateLanguage(word),true,word);
  }
  for(const word of ['หีบ','หีบเพลง','แกงกะหรี่','ไข่หงส์','ขนมไข่หงส์',
    'อวัยวะเพศ','อวัยวะสืบพันธุ์','องคชาต','อัณฑะ','ช่องคลอด','เท้า','ขี้เหล็ก']){
    assert.equal(isInappropriateLanguage(word),false,word);
  }
  assert.equal(validAnswer('ตีน','ต','body'),false);
  assert.equal(validAnswer('องคชาต','อ','body'),true);
  assert.equal(validAnswer('อวัยวะเพศ','อ','body'),true);
  assert.equal(validAnswer('ไข่เหี้ย','ข','dessert'),false);
});

test('server discards offensive drafts; live snapshots contain markers, never guesses',()=>{
  const match=room();
  applyAction(match,'draft','host',now+2000,'',{body:'องคชาต',animal:'อูฐ'});
  applyAction(match,'draft','guest',now+2001,'',{body:'ควย',animal:'อูฐ'});
  assert.equal(match.submissions.guest.body,'');
  assert.equal(match.submissions.host.body,'องคชาต');
  const live=snapshot(match);
  assert.deepEqual(live.maskedAnswers,{
    host:{body:'1234',animal:'1234'},guest:{animal:'1234'}
  });
  assert.equal(JSON.stringify(live).includes('องคชาต'),false);
  assert.equal(JSON.stringify(live).includes('อูฐ'),false);
  assert.equal(JSON.stringify(live).includes('ควย'),false);
  assert.equal(live.history.length,0);
  assert.deepEqual(scoreRound(match).map(p=>p.perCategory.body),[2,0]);

  for(const player of match.players)player.lastSeen=match.deadline;
  advance(match,match.deadline+1);
  const revealed=snapshot(match);
  assert.equal(revealed.phase,'review');
  assert.deepEqual(revealed.maskedAnswers,{});
  assert.equal(revealed.history.at(-1)?.entries[0]?.answers.body,'องคชาต');
  assert.equal(revealed.history.at(-1)?.entries[1]?.answers.body,'');
});

test('only player-controlled input can be visible locally; server also blocks rude nicknames',()=>{
  const match=newMatch('room-11111111112222222222',now);
  assert.throws(()=>applyAction(match,'create','host',now,'ส้นตีน'),/ชื่อเล่นที่สุภาพ/);
  applyAction(match,'create','host',now,'Host');
  assert.throws(()=>applyAction(match,'join','guest',now,'ไอ้เหี้ย'),/ชื่อเล่นที่สุภาพ/);
  applyAction(match,'join','guest',now,'Guest');
  assert.equal(match.players.length,2);
  assert.deepEqual(snapshot(match).maskedAnswers,{});
});
