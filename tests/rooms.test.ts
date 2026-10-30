import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeGamePayload} from '../src/rooms.ts';

test('AWSJSON variables use JSON serialization',()=>{
  const payload=encodeGamePayload({animal:'เสือ'},{rounds:3,categories:5,seconds:40});
  assert.deepEqual(JSON.parse(payload.answers!),{animal:'เสือ'});
  assert.deepEqual(JSON.parse(payload.settings!),{rounds:3,categories:5,seconds:40});
  assert.deepEqual(encodeGamePayload(),{});
});
test('join flow displays public room list and does not require links or codes',()=>{
  const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  assert.match(ui,/api\.queries\.listRooms\(/);
  assert.match(ui,/setInterval\(\(\)=>void refreshRooms\(\),3000\)/);
  assert.match(ui,/onClick=\{\(\)=>void join\(room\.roomId\)\}/);
  assert.match(ui,/ห้องที่เปิดอยู่/);
  assert.doesNotMatch(ui,/parseInviteUrl|ลิงก์เชิญ|invitation-link|\?match=|onClick=\{share\}/);
});

test('statistics query resolves explicitly and by request',async()=>{
  const {resolveOperation}=await import('../amplify/functions/game/request.ts');
  assert.equal(resolveOperation({fieldName:'getWordStats',arguments:{request:'stats'}}),'getWordStats');
  assert.equal(resolveOperation({arguments:{request:'stats'}}),'getWordStats');
});

test('game UI autosaves drafts and has no submit control',()=>{
  const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  assert.match(source,/call\('draft',roomId/);
  assert.match(source,/onChange=\{e=>updateWord\(id,e\.target\.value\)\}/);
  assert.match(source,/onBlur=\{\(\)=>void flushDraft\(\)\}/);
  assert.match(source,/draftInFlightRef\.current/);
  assert.match(source,/autosave-\$\{draftStatus\}/);
  assert.doesNotMatch(source,/onClick=\{send\}|call\('submit'/);
  assert.doesNotMatch(source,/ส่งคำตอบแล้ว ✓|ต้องส่งก่อนหมดเวลา/);
});

test('special-category hints render directly below each answer category title, not near the round letter',()=>{
  const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const styles=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
  const header=source.slice(source.indexOf('className="answer-head"'),source.indexOf('className="answer-list"'));
  const answerRows=source.slice(source.indexOf('className="answer-list"'),source.indexOf('className="auto-save-status'));
  assert.doesNotMatch(header,/ขนมจรวดสายรุ้ง|ต้นประกายเมฆ|answer-category-hint/);
  assert.match(answerRows,/className="answer-category"/);
  assert.match(answerRows,/className="answer-text"/);
  assert.match(answerRows,/game\.topicCategory==='dessert'/);
  assert.match(answerRows,/game\.topicCategory==='tree'/);
  assert.match(answerRows,/ขนมจรวดสายรุ้ง/);
  assert.match(answerRows,/ต้นประกายเมฆ/);
  assert.match(answerRows,/className="answer-input-wrap"/);
  assert.match(styles,/\.answer-item-with-hint\{/);
  assert.match(styles,/grid-template-areas:"symbol category check" "input input input"/);
  assert.match(styles,/\.answer-hint-note/);
});

test('flower bird insect fish prefix hints are directly beneath the playable category',()=>{
  const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const start=ui.indexOf('className="answer-list"');
  const section=ui.slice(start,ui.indexOf('className="auto-save-status',start));
  const header=ui.slice(ui.indexOf('className="answer-head"'),start);
  for(const [category,fake] of [
    ['flower','ดอกเมฆอมยิ้ม'],['bird','นกจักรวาลอมยิ้ม'],
    ['insect','แมลงรุ้งติดจรวด'],['fish','ปลาประกายสายรุ้งวิเศษ']
  ]){
    assert.ok(ui.includes(category+":{prefix:"),category+' tip config');
    assert.ok(ui.includes(fake),fake);
    assert.ok(!header.includes(fake),'not displayed below current round letter');
  }
  assert.match(section,/CATEGORY_PREFIX_HINTS\[category\]/);
  assert.match(section,/className="answer-category-hint"/);
  assert.match(section,/!game\.topicCategory\|\|index===0/);
});

test('live answer feedback distinguishes banned labels from unknown words',()=>{
  const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const styles=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
  assert.match(ui,/checkAnswerFeedback\(typed,requestedLetter,category\)/);
  assert.match(ui,/feedback.message/);
  assert.match(ui,/feedback.status/);
  assert.doesNotMatch(ui,/state==='wrong-letter'\?'ตัวอักษรต้นไม่ตรง'/);
  assert.match(styles,/\.feedback-forbidden/);
  assert.match(styles,/\.feedback-prefix-not-counted/);
});

test('vegetable prefix has an invented example beneath its own answer category',()=>{
  const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const head=ui.slice(ui.indexOf('className="answer-head"'),ui.indexOf('className="answer-list"'));
  const answers=ui.slice(ui.indexOf('className="answer-list"'),ui.indexOf('className="auto-save-status'));
  assert.ok(ui.includes("vegetable:{prefix:'ผัก',example:'ผักจรวดนุ่มนิ่ม'"));
  assert.ok(!head.includes('ผักจรวดนุ่มนิ่ม'));
  assert.match(answers,/CATEGORY_PREFIX_HINTS\[category\]/);
  assert.match(answers,/className="answer-category-hint"/);
  assert.match(answers,/!game\.topicCategory\|\|index===0/);
});
