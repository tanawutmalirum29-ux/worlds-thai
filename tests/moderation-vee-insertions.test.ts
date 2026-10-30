import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nicknameValidationMessage,isBlockedStandaloneAnswer,isInappropriateLanguage,
  DISALLOWED_EXACT,DISALLOWED_PHRASES,DISALLOWED_ROMAN_RULES
} from '../amplify/functions/game/moderation.ts';
import {applyAction,newMatch,cleanAnswers,validAnswer} from '../amplify/functions/game/logic.ts';

test('iPad examples: inserts of Thai vowels, tone marks and numbers cannot evade banned nickname วี',()=>{
  const names=[
    'วี','วุี','วุี๊','วุี๋','วูี','วี่','วี๊','วี๋','วี์',
    'ว123ี','ว๑๒๓ี','ว123อี','วอี',
    'น้องวุี','คุณวุี๊','นายว123ี','คนชื่อวุี๋',
    'ว ุ ี','ว-ุ-ี','ว\u200Bุี','ว๑๒๓ุี'
  ];
  for(const name of names)
    assert.equal(nicknameValidationMessage(name),'ใช้ชื่อนี้ไม่ได้',name);
});

test('standalone game answers reject screenshot aliases, not dictionary words containing วี',()=>{
  for(const word of ['วี','วุี','วุี๊','วี่','วี๋','ว123ี','ว๑๒๓ี','ว123อี','วอี'])
    assert.equal(isBlockedStandaloneAnswer(word),true,word);
  // Historical restriction: Vee is forbidden as a whole answer, not when
  // embedded in another valid word. Retain the garan-suffix exception.
  for(const word of ['วีนัส','วีรบุรุษ','ทวีป','หวี','วีร์','วี์',
    'วิน','วุฒิ','วิทยา','วุ้ย','วอีสาน','สาวอีสาน'])
    assert.equal(isBlockedStandaloneAnswer(word),false,word);
});

test('do not flag ordinary Thai nicknames or vocabulary when filtering mark noise',()=>{
  for(const name of [
    'วิน','วิทยา','วุฒิ','วุ้ย','วิว','สาวอีสาน','ดาวอีสาน','วุธ','วุ',
    'หีบเพลง','กะหรี่','สัดส่วน','สัตว์','ตีนเป็ด','เวรกรรม',
    'แม่งกา','อีสาน','ควาย','แสร้ง'
  ]){
    assert.equal(nicknameValidationMessage(name),'',name);
    assert.equal(isInappropriateLanguage(name),false,name);
  }
});

test('newly expanded exact and phrase terms remain consistent with server moderation',()=>{
  const exact=['แม่ง','แม่ม','มึง','กู','จัญไร','ระยำ','สถุน','อัปรีย์','สารเลว','สวะ'];
  const phrases=['ไอ้เวร','อีเวร','ไอ้สัตว์','อีสัตว์','ไอ้โง่','อีโง่',
    'อีดอก','อีห่า','แม่มึง','พ่อมึง','ไอ้ระยำ','ปัญญาอ่อน'];
  for(const word of exact){
    assert.ok(DISALLOWED_EXACT.has(word),word);
    assert.equal(isInappropriateLanguage(word),true,word);
  }
  for(const word of phrases){
    assert.ok(DISALLOWED_PHRASES.includes(word as typeof DISALLOWED_PHRASES[number]),word);
    assert.equal(isInappropriateLanguage('น้อง'+word+'ครับ'),true,word);
  }
  for(const word of ['slut','whore','bastard','nigga','retard']){
    assert.ok(DISALLOWED_ROMAN_RULES.some(rule=>rule.word===word),word);
    assert.equal(isInappropriateLanguage(word),true,word);
  }
  for(const word of ['เวรกรรม','สัตว์เลี้ยง','ปัญญาดี','กูรู','อีสาน','class','assistant','shitake','Fukuyama'])
    assert.equal(isInappropriateLanguage(word),false,word);
});

test('server refuses screenshot aliases on create/join and removes disguised game submissions',()=>{
  const t=1_700_000_000_000;
  for(const name of ['วุี','วุี๊','ว123ี','ว123อี']){
    const m=newMatch('room-bbbbbbcccdddeeeffff0',t);
    assert.throws(()=>applyAction(m,'create','host',t,name),/ใช้ชื่อนี้ไม่ได้/,name);
    applyAction(m,'create','host',t,'ผู้สร้าง');
    assert.throws(()=>applyAction(m,'join','guest',t,name),/ใช้ชื่อนี้ไม่ได้/,name);
  }
  assert.deepEqual(cleanAnswers({animal:'วุี',body:'ว123อี',other:'หีบ'},['animal','body','other']),
    {animal:'',body:'',other:'หีบ'});
  assert.equal(validAnswer('ว123ี','ว','animal'),false);
});
