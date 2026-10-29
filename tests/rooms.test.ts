import test from 'node:test';
import assert from 'node:assert/strict';
import {parseInviteUrl,encodeGamePayload} from '../src/rooms.ts';
const site='https://main.d27uswg4aln78i.amplifyapp.com/';
const room='room-aabbccddeeff00112233';

test('invitation accepts URL from our game, not a code or outside domain',()=>{
  assert.equal(parseInviteUrl(site+'?match='+room,site),room);
  assert.equal(parseInviteUrl(' '+site+'?match='+room+' ',site),room);
  assert.equal(parseInviteUrl(room,site),null);
  assert.equal(parseInviteUrl('https://evil.example/?match='+room,site),null);
  assert.equal(parseInviteUrl(site+'?match=public-1',site),null);
  assert.equal(parseInviteUrl(site+'?match='+room+'&match='+room,site),null);
  assert.equal(parseInviteUrl(site+'?match='+room.slice(0,-1),site),null);
});

test('AWSJSON GraphQL input uses JSON text for settings and answers',()=>{
  const settings={rounds:3,categories:5,seconds:40};
  const answers={animal:'เสือ',fruit:'ส้ม'};
  const payload=encodeGamePayload(answers,settings);
  assert.equal(typeof payload.settings,'string');
  assert.equal(typeof payload.answers,'string');
  assert.deepEqual(JSON.parse(payload.settings),settings);
  assert.deepEqual(JSON.parse(payload.answers),answers);
  assert.deepEqual(encodeGamePayload(),{});
  assert.deepEqual(encodeGamePayload(undefined,settings),{settings:JSON.stringify(settings)});
});
test('frontend displays joining path and passes AWSJSON encoded variables',()=>{
  const fs=await import('node:fs');
  const code=fs.readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  assert.match(code,/เข้าร่วมห้อง/);
  assert.match(code,/mode==='join'/);
  assert.match(code,/parseInviteUrl\(invite,window\.location\.href\)/);
  assert.match(code,/\.\.\.encodeGamePayload\(values,settings\)/);
});
