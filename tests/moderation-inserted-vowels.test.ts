import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isInappropriateLanguage,nicknameValidationMessage,isBlockedStandaloneAnswer
} from '../amplify/functions/game/moderation.ts';
import {applyAction,cleanAnswers,newMatch,validAnswer} from '../amplify/functions/game/logic.ts';

test('vowel-injection examples from iPad nickname field are rejected',()=>{
  for(const text of [
    'คุวุย','คุวย','คูวูย','คุวุุย','คุ่่วุย',
    'คุ วุ ย','คุ-วุ-ย','คุ💜วุย','คุ\u200Bวุย',
    'คนชื่อคุวุย','คุวุยนะ','ไอ้คุวุย'
  ]){
    assert.equal(isInappropriateLanguage(text),true,'should reject '+text);
    assert.equal(nicknameValidationMessage(text),'กรุณาใช้ชื่อเล่นที่สุภาพ',text);
  }
});

test('injected combining marks also work on other previously blocked phrases',()=>{
  for(const text of [
    'สัุส','เย็ุด','จิุ๋ม','ไอ้เหีุ้ย','น้องเย็ุด',
    'สุ้นตีน','กระดอุ'
  ]){
    assert.equal(isInappropriateLanguage(text),true,'should reject '+text);
  }
});

test('do not delete meaningful Thai vowels or block ordinary words that share consonants',()=>{
  for(const text of [
    'คุย','ควาย','คุ้ม','คูณ','คิว','คีย์','คุรุ',
    'หีบ','หีบเพลง','สัดส่วน','สัตว์','ตีนเป็ด','เห็ด',
    'เฮีย','เฮียใหญ่','แกงกะหรี่','น้องคุยเก่ง','วันควายไทย'
  ]){
    assert.equal(isInappropriateLanguage(text),false,'must remain allowed: '+text);
    assert.equal(nicknameValidationMessage(text),'','nickname should remain allowed: '+text);
  }
  // Existing unrelated nickname-only and standalone-word rules are unchanged.
  assert.equal(isBlockedStandaloneAnswer('วี์'),false);
  assert.equal(isBlockedStandaloneAnswer('วี'),true);
  assert.equal(nicknameValidationMessage('วี์'),'ใช้ชื่อนี้ไม่ได้');
});

test('server rejects injected-vowel nicknames before joining and discards offensive draft answers',()=>{
  const t=1_700_000_000_000;
  for(const name of ['คุวุย','น้องคุวุย','คุ-วุ-ย']){
    const match=newMatch('room-aaabbbcccdddeeefff00',t);
    assert.throws(()=>applyAction(match,'create','host',t,name),/ชื่อเล่นที่สุภาพ/);
    assert.equal(match.players.length,0);
    applyAction(match,'create','host',t,'ผู้สร้าง');
    assert.throws(()=>applyAction(match,'join','guest',t,name),/ชื่อเล่นที่สุภาพ/);
    assert.equal(match.players.length,1);
  }
  assert.deepEqual(cleanAnswers({body:'คุวุย',animal:'ควาย'},['body','animal']),
    {body:'',animal:'ควาย'});
  assert.equal(validAnswer('คุวุย','ค','body'),false);
});

test('repeated consonants with interleaved vowels cannot disguise a banned Thai spelling',()=>{
  const bypasses=[
    'คุวุวีย์',
    'คุวุวุย',
    'คุวุวุย์',
    'คุคุวุย',
    'คุวุวียี',
    'คุวุวีย์์',
    'คุ-วุ-วีย์',
    'ชื่อคุวุวีย์',
    'คุวุวีย์ครับ',
    'คุวุวุยนะ'
  ];
  for(const name of bypasses){
    assert.equal(isInappropriateLanguage(name),true,name);
    // Some spellings also contain the separately banned fragment วี, which
    // takes priority in nickname errors. Both reasons must block the name.
    assert.notEqual(nicknameValidationMessage(name),'',name);
  }
  assert.deepEqual(cleanAnswers({body:'คุวุวีย์'},['body']),{body:''});
});

test('interleaved repetition rule must not cause consonant skeleton false positives',()=>{
  const ordinary=[
    'คุย','ควาย','คุยเก่ง','ควายไทย','คุ้มครอง','คูณ','คิว','คุรุ',
    'คีรี','คะน้า','วุ่นวาย','วุฒิ','ขนม','หีบเพลง','สัดส่วน',
    'ตีนเป็ด','เห็ดฟาง','เฮีย','แกงกะหรี่'
  ];
  for(const word of ordinary){
    assert.equal(isInappropriateLanguage(word),false,word);
    assert.equal(nicknameValidationMessage(word),'',word);
  }
});

test('server create and join enforce interleaved vowel rejection even when client validation is bypassed',()=>{
  const t=1_700_000_000_000;
  for(const name of ['คุวุวุย','ชื่อคุวุวุย','คุคุวุย']){
    const game=newMatch('room-abababababababababab',t);
    assert.throws(()=>applyAction(game,'create','creator',t,name),/ชื่อเล่นที่สุภาพ/,name);
    applyAction(game,'create','creator',t,'ผู้สร้าง');
    assert.throws(()=>applyAction(game,'join','guest',t,name),/ชื่อเล่นที่สุภาพ/,name);
  }
});
