import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAnswerFeedback} from '../src/answer-feedback.ts';
import {eligibleCategories} from '../amplify/functions/game/logic.ts';

test('single category nouns and repeated prefixes are forbidden, not unknown',()=>{
  const examples:[string,string,string][]=[
    ['dessert','ขนม','ข'],['dessert','ขนมขนมไข่','ข'],
    ['tree','ต้น','ต'],['tree','ต้นไม้','ต'],['tree','ไม้','ม'],
    ['tree','ต้นต้นมะม่วง','ม'],
    ['flower','ดอก','ด'],['flower','ดอกไม้','ด'],
    ['bird','นก','น'],['insect','แมลง','ม'],
    ['fish','ปลา','ป'],['fish','ปลาปลาดุก','ด'],
    ['vegetable','ผัก','ผ'],['vegetable','ผักผักบุ้ง','บ']
  ];
  for(const [category,word,letter] of examples){
    const feedback=checkAnswerFeedback(word,letter,category);
    assert.equal(feedback.status,'forbidden',category+' / '+word);
    assert.match(feedback.message,/ห้ามใช้/,word);
    assert.doesNotMatch(feedback.message,/ไม่พบคำ/,word);
  }
});
test('category-specific forbidden labels do not invalidate other categories',()=>{
  if(eligibleCategories('น').includes('animal'))
    assert.equal(checkAnswerFeedback('นก','น','animal').status,'accepted');
  assert.notEqual(checkAnswerFeedback('ปลา','ป','food').status,'forbidden');
  assert.notEqual(checkAnswerFeedback('ดอกไม้','ด','object').status,'forbidden');
});
test('prefix leading letter is explicitly not counted',()=>{
  for(const [category,word,typedLetter,realLetter,prefix] of [
    ['bird','นกกระจอก','น','ก','นก'],
    ['fish','ปลาดุก','ป','ด','ปลา'],
    ['flower','ดอกบัว','ด','บ','ดอก'],
    ['tree','ต้นมะม่วง','ต','ม','ต้น'],
    ['insect','แมลงปอ','ม','ป','แมลง'],
    ['dessert','ขนมครก','ข','ค','ขนม'],
    ['vegetable','ผักบุ้ง','ผ','บ','ผัก']
  ]){
    const result=checkAnswerFeedback(word,typedLetter,category);
    assert.equal(result.status,'prefix-not-counted',category+' / '+word);
    assert.ok(result.message.includes('ไม่นับ “'+prefix+'”'),word);
    assert.ok(result.message.includes(realLetter+' '),word);
    assert.doesNotMatch(result.message,/ไม่พบคำ/,word);
  }
});
test('correct, empty, unknown and ordinary wrong-letter retain distinct feedback',()=>{
  assert.deepEqual(checkAnswerFeedback('','ข','dessert'),
    {status:'empty',message:'ตรวจคำให้ทันที'});
  assert.equal(checkAnswerFeedback('ขนมไข่','ข','dessert').status,'accepted');
  assert.equal(checkAnswerFeedback('มะม่วง','ม','tree').status,'accepted');
  assert.equal(checkAnswerFeedback('ผักบุ้ง','บ','vegetable').status,'accepted');
  assert.equal(checkAnswerFeedback('บุ้ง','บ','vegetable').status,'accepted');
  assert.equal(checkAnswerFeedback('ผักจรวดนุ่มนิ่ม','จ','vegetable').status,'unknown');
  assert.notEqual(checkAnswerFeedback('ผัก','ผ','plant').status,'forbidden');
  assert.equal(checkAnswerFeedback('ขนมจรวดสายรุ้ง','จ','dessert').status,'unknown');
  assert.equal(checkAnswerFeedback('ปลาหมอกดาวอังคาร','ห','fish').status,'unknown');
  assert.equal(checkAnswerFeedback('มะม่วง','ข','tree').status,'wrong-letter');
});

test('profane anatomy is forbidden while proper medical names remain acceptable',()=>{
  for(const term of ['ควย','หี','หำ','จู๋','จิ๋ม','เจี๊ยว','แตด','ตีน','ขนมไข่เหี้ย']){
    const category=term.includes('ไข่')?'dessert':'body';
    const status=checkAnswerFeedback(term,'อ',category);
    assert.equal(status.status,'inappropriate',term);
    assert.match(status.message,/ห้ามใช้/,term);
  }
  assert.equal(checkAnswerFeedback('อวัยวะเพศ','อ','body').status,'accepted');
  assert.equal(checkAnswerFeedback('องคชาต','อ','body').status,'accepted');
  assert.equal(checkAnswerFeedback('หีบ','ห','object').status,'accepted');
  assert.notEqual(checkAnswerFeedback('แกงกะหรี่','ก','food').status,'inappropriate');
});

test('bare วี gives explicit banned-answer feedback, never an unknown-word hint',()=>{
  for(const typed of ['วี',' วี ','ว ี']){
    const value=checkAnswerFeedback(typed,'ว','body');
    assert.equal(value.status,'forbidden',typed);
    assert.equal(value.message,'ห้ามใช้คำว่า “วี” เป็นคำตอบ');
  }
  assert.notEqual(checkAnswerFeedback('วีร์','ว','body').status,'forbidden');
  assert.notEqual(checkAnswerFeedback('วีว์','ว','body').status,'forbidden');
});

test('roman V and we/wee elongated substitutions show banned feedback instead of unknown word',()=>{
  for(const word of ['v','V','vee','ve','vvvvv','we','wee','weeeee','vี.','v v v']){
    const result=checkAnswerFeedback(word,'ว','body');
    assert.equal(result.status,'forbidden',word);
    assert.match(result.message,/ห้ามใช้ตัว V/,word);
  }
  for(const word of ['win','why','วีนัส'])
    assert.notEqual(checkAnswerFeedback(word,'ว','body').status,'forbidden',word);
});
