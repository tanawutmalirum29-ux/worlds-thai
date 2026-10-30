import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isInappropriateLanguage,nicknameValidationMessage,isBlockedStandaloneAnswer
} from '../amplify/functions/game/moderation.ts';
import {applyAction,cleanAnswers,newMatch,validAnswer} from '../amplify/functions/game/logic.ts';

test('vowel-injection examples from iPad nickname field are rejected',()=>{
  for(const text of [
    'คุวุย','คุวย','คูวูย','คีวีีย','คุวุุย','คุ่่วุย',
    'คุ วุ ย','คุ-วุ-ย','คุ💜วุย','คุ\u200Bวุย',
    'คนชื่อคุวุย','คุวุยนะ','ไอ้คุวุย'
  ]){
    // "คีวีีย" is not an actual slur spelling; it is intentionally excluded
    // from the banned examples below for regression safety.
    if(text==='คีวีีย')continue;
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
    'คุย','ควาย','คุ้ม','คูณ','คิว','คีย์','คีวี','คาวี','คุรุ',
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
