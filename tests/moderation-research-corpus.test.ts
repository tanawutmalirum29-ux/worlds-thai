import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISALLOWED_EXACT,DISALLOWED_PHRASES,DISALLOWED_ROMAN_RULES,
  isInappropriateLanguage,nicknameValidationMessage,isBlockedStandaloneAnswer
} from '../amplify/functions/game/moderation.ts';
import {applyAction,newMatch,cleanAnswers,validAnswer} from '../amplify/functions/game/logic.ts';

/**
 * Small hand-reviewed regression corpus. A toxicity keyword corpus is a
 * candidate list, not permission to censor normal animal/food vocabulary.
 */
const newlyBannedExact=[
  'ตอแหล','ทุเรศ','เสือก','เฮงซวย','ดัดจริต','สันดาน',
  'หน้าด้าน','สถุล','อุบาทว์','เสนียด','ร่าน','โง่','เลว'
];
const newlyBannedPhrases=[
  'อีควาย','ไอ้ควาย','ไอควาย','อีตอแหล','ไอ้ตอแหล',
  'อีร่าน','อีดอกทอง','อีแรด','ไอ้หน้าด้าน','อีหน้าด้าน',
  'ไอ้สันดาน','อีสันดาน','ไอ้เฮงซวย','อีเฮงซวย',
  'ไอ้เสือก','ไอ้เบื๊อก','ไอ้หน้าโง่'
];

test('expanded Thai moderation catches only curated exact words and abusive phrases',()=>{
  for(const word of newlyBannedExact){
    assert.equal(DISALLOWED_EXACT.has(word),true,word);
    assert.equal(isInappropriateLanguage(word),true,word);
    assert.equal(nicknameValidationMessage(word),'กรุณาใช้ชื่อเล่นที่สุภาพ',word);
  }
  for(const word of newlyBannedPhrases){
    assert.equal(DISALLOWED_PHRASES.includes(word as typeof DISALLOWED_PHRASES[number]),true,word);
    assert.equal(isInappropriateLanguage('ฉันชื่อ'+word+'นะ'),true,word);
  }
  for(const name of ['ตอแล','ตอแร','ไอ้สลัด','อีสลัด']){
    assert.equal(isInappropriateLanguage(name),true,name);
  }
});

test('strip Unicode invisible controls, variation selectors and format marks for Thai terms',()=>{
  const cases=[
    'ค\\u200Eวย','ค\\u200Fวย','ค\\u2060วย','ค\\u202Eวย',
    'ค\\uFE0Fวย','ค\\u034Fวย','ค\\u200Dวย',
    'ไอ้\\u2060ควาย','อี\\u200Eแรด',
    'ไอ้ ค-ว า-ย','เเม่ง','เเ ม่ ง',
    'ไอ้คคควาย','ตอแหหล','ตอแห\\uFE0Fล'
  ].map(t=>t.replaceAll('\\u200E','\u200E').replaceAll('\\u200F','\u200F')
      .replaceAll('\\u2060','\u2060').replaceAll('\\u202E','\u202E')
      .replaceAll('\\uFE0F','\uFE0F').replaceAll('\\u034F','\u034F')
      .replaceAll('\\u200D','\u200D'));
  for(const word of cases)
    assert.equal(isInappropriateLanguage(word),true,JSON.stringify(word));
});

test('English/roman words catch mixed symbols, leetspeak, inserted numerals and stretched letters',()=>{
  for(const value of [
    'f1u2c3k','f.v.c.k','fvck','phuck','f-u-c-k',
    'f'+String.fromCharCode(0x200E)+'uck','f'+String.fromCharCode(0xFE0F)+'uck',
    'b!tch','b*i*t*c*h','s.h.1.t','p12ussy',
    'khuay','khuai','kuwy','k.h.u.a.y',
    'K.U.A.Y','k_u_a_y','fÜck','n1gga'
  ]){
    assert.equal(isInappropriateLanguage(value),true,value);
    assert.notEqual(nicknameValidationMessage(value),'',value); // V is independently banned in nicknames.
  }
  for(const rule of ['fvck','phuck','khuay','khuai','kuwy'])
    assert.ok(DISALLOWED_ROMAN_RULES.some(entry=>entry.word===rule),rule);
});

test('moderation must not punish legitimate category answers and innocent substrings',()=>{
  for(const value of [
    'ควาย','ควายไทย','หมา','สัตว์','สัตว์เลี้ยง','หอย','แมงดา','แรด',
    'เสื้อกั๊ก','เสื้อกันฝน','เสือกไส','สัตว์ทะเล',
    'กะหรี่','แกงกะหรี่','แกงเขียวหวาน','หีบ','หีบเพลง','ตีนเป็ด',
    'สัดส่วน','ต้นตีนเป็ด','เวรกรรม','สาดน้ำ','สลัดผัก','เปรต',
    'ทุเรียน','หน้าด่าน','วุฒิ','วิน','ร่างกาย','เลวร้าย',
    'ไอเดีย','กูรู','แม่งกา','ครัวซอง','เเปลก',
    'class','assistant','Fukuyama','shitake','Shiitake','passion',
    'khuaymy' // Whole-word Roman rule only.
  ]){
    assert.equal(isInappropriateLanguage(value),false,value);
  }
  assert.equal(isBlockedStandaloneAnswer('วีนัส'),false);
  assert.equal(isBlockedStandaloneAnswer('วี'),true);
  assert.equal(nicknameValidationMessage('วิชัย'),'');
});

test('server protects create/join and never accepts a disguised prohibited draft',()=>{
  const now=1_700_000_000_000;
  for(const name of ['ไอ้\\u2060ควาย','เเม่ง','f1u2c3k','อีตอแหล','ตอแหหล']){
    const normalized=name.replaceAll('\\u2060','\u2060');
    const m=newMatch('room-dddeeefff999aaabbb11',now);
    assert.throws(()=>applyAction(m,'create','host',now,normalized),/ชื่อเล่นที่สุภาพ/,name);
    applyAction(m,'create','host',now,'ผู้สร้าง');
    assert.throws(()=>applyAction(m,'join','guest',now,normalized),/ชื่อเล่นที่สุภาพ/,name);
  }
  assert.deepEqual(cleanAnswers({
    animal:'ไอ้ควาย',body:'f1u2c3k',food:'แกงกะหรี่',job:'สัตว์'
  },['animal','body','food','job']),{
    animal:'',body:'',food:'แกงกะหรี่',job:'สัตว์'
  });
  assert.equal(validAnswer('อีตอแหล','อ','job'),false);
});
