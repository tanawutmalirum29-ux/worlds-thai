import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomSettingsSaver,type RoomSettingSaveStatus} from '../src/room-settings-saver.ts';

function deferred(){
  let resolve!:()=>void,reject!:(error:Error)=>void;
  const promise=new Promise<void>((res,rej)=>{resolve=res;reject=rej;});
  return {promise,resolve,reject};
}
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));

test('save immediately, serialize network writes and retain only the newest rapid selection',async()=>{
  const first=deferred(),second=deferred();
  const sent:number[]=[];
  const states:RoomSettingSaveStatus[]=[];
  const saver=createRoomSettingsSaver(async n=>{
    sent.push(n);
    if(n===1)await first.promise;
    if(n===3)await second.promise;
  },status=>states.push(status));
  saver.update(1);
  assert.deepEqual(sent,[1],'the first selection is dispatched immediately');
  saver.update(2);saver.update(3);
  assert.deepEqual(sent,[1],'no overlapping remote writes');
  first.resolve();
  await tick();
  assert.deepEqual(sent,[1,3],'obsolete value 2 is discarded');
  second.resolve();
  await saver.waitForIdle();
  assert.equal(states.at(-1),'saved');
  saver.close();
});

test('a failed write retries on reconnect while preserving the latest selected value',async()=>{
  const attempts:number[]=[];
  let offline=true;
  const states:RoomSettingSaveStatus[]=[];
  const saver=createRoomSettingsSaver(async value=>{
    attempts.push(value);
    if(offline)throw new Error('offline');
  },status=>states.push(status));
  saver.update(5);
  await saver.waitForIdle();
  assert.equal(states.at(-1),'error');
  assert.deepEqual(attempts,[5],'do not loop continuously while offline');
  offline=false;
  saver.retry();
  await saver.waitForIdle();
  assert.deepEqual(attempts,[5,5]);
  assert.equal(states.at(-1),'saved');
  saver.close();
});

test('a newer change made during an unsuccessful write is automatically sent',async()=>{
  const first=deferred();
  const sent:string[]=[];
  const saver=createRoomSettingsSaver(async value=>{
    sent.push(value);
    if(value==='old')await first.promise;
  },()=>{});
  saver.update('old');
  saver.update('new');
  first.reject(new Error('timed out'));
  await saver.waitForIdle();
  assert.deepEqual(sent,['old','new']);
  saver.close();
});

test('closing room settings cancels unsent writes from a departed lobby',async()=>{
  const first=deferred(),sent:number[]=[];
  const saver=createRoomSettingsSaver(async value=>{
    sent.push(value);
    await first.promise;
  },()=>{});
  saver.update(1);saver.update(2);
  saver.close();
  first.resolve();
  await saver.waitForIdle();
  assert.deepEqual(sent,[1],'no queued updates can modify a different room');
});
