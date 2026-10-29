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
