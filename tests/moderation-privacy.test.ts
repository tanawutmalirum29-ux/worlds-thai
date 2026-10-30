import test from 'node:test';
import assert from 'node:assert/strict';
import {isInappropriateLanguage,isBlockedStandaloneAnswer,nicknameValidationMessage} from '../amplify/functions/game/moderation.ts';
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

test('nickname restriction detects วี anywhere, including tone-free garan suffixes',()=>{
  for(const nickname of [
    'วี','วีร์','วีว์','วี์','วีร','น้องวี','สวัสดีวีนะ','มีวีในชื่อ','หวี',
    'คุณ วี ครับ','ว ี','ว\u200Bี','ชื่อวีร์ทดลอง','เราเป็นวีว์'
  ]){
    assert.equal(nicknameValidationMessage(nickname),'ใช้ชื่อนี้ไม่ได้',nickname);
  }
  for(const nickname of ['วิ','วิน','น้องวิ','น้องบี','ชื่อเพื่อน','ชื่อไทย','วี'.replace('ี','ิ')]){
    assert.equal(nicknameValidationMessage(nickname),'',nickname);
  }
  assert.equal(nicknameValidationMessage('ไอ้เหี้ย'),'กรุณาใช้ชื่อเล่นที่สุภาพ');
});

test('server rejects both create and join with banned names, allows other names',()=>{
  const blocked=['วี','วีร์','วีว์','วี์','คุณวี','มาวีในข้อความ','ชอบวีกัน'];
  for(const nickname of blocked){
    const match=newMatch('room-11223344556677889900',now);
    assert.throws(()=>applyAction(match,'create','host',now,nickname),/ใช้ชื่อนี้ไม่ได้/,nickname);
    assert.equal(match.players.length,0);
    applyAction(match,'create','host',now,'น้องบี');
    assert.throws(()=>applyAction(match,'join','guest',now,nickname),/ใช้ชื่อนี้ไม่ได้/,nickname);
    assert.equal(match.players.length,1);
  }
});

test('standalone วี is blocked in drafts, not any word that merely contains วี',()=>{
  for(const word of ['วี',' วี ','ว ี','วี!','\u200Bวี\u200B'])
    assert.equal(isBlockedStandaloneAnswer(word),true,word);
  for(const word of ['วีนัส','วีร์','วีว์','วี์','ทวีป','วีรบุรุษ','วิ','บี','หวี'])
    assert.equal(isBlockedStandaloneAnswer(word),false,word);
  const match=room();
  applyAction(match,'draft','host',now+2000,'',{body:'วี',animal:'อูฐ'});
  assert.equal(match.submissions.host.body,'');
  assert.equal(match.submissions.host.animal,'อูฐ');
  assert.equal(snapshot(match).maskedAnswers.host.body,undefined);
  assert.equal(snapshot(match).maskedAnswers.host.animal,'1234');
});
