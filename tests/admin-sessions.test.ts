import test from 'node:test';
import assert from 'node:assert/strict';
import {DeleteCommand,GetCommand,PutCommand,UpdateCommand} from '@aws-sdk/lib-dynamodb';
import {
  handleAdminSession,validAdminSession,validAdminToken,ADMIN_SESSION_LIFETIME_MS
} from '../amplify/functions/game/admin-sessions.ts';
import {resolveOperation} from '../amplify/functions/game/request.ts';

const now=1_750_000_000_000;
function fakeDb(){
  const rows=new Map<string,any>();
  const client={async send(command:any):Promise<any>{
    const arg=command.input,id=arg.Key?.id;
    if(command instanceof GetCommand)return {Item:structuredClone(rows.get(id))};
    if(command instanceof PutCommand){
      if(rows.has(arg.Item.id))throw new Error('ConditionalCheckFailedException');
      rows.set(arg.Item.id,structuredClone(arg.Item));return {};
    }
    if(command instanceof DeleteCommand){rows.delete(id);return {};}
    if(command instanceof UpdateCommand){
      if(id==='control'){
        const next={id,revision:(rows.get(id)?.revision||0)+1};
        rows.set(id,next);return {Attributes:next};
      }
      if(id.startsWith('attempt#')){
        const old=rows.get(id)||{};
        const next={id,attempts:(old.attempts||0)+1,ttl:arg.ExpressionAttributeValues[':ttl']};
        rows.set(id,next);return {Attributes:next};
      }
    }
    throw new Error('Unexpected DB command '+command.constructor.name);
  }};
  return {client,rows};
}
const table='test-admin-sessions';
const login=(client:any,identity:string,pin='251029',at=now)=>
  handleAdminSession({action:'login',pin},identity,client,table,at,'251029');
const check=(client:any,identity:string,token:string,at=now)=>
  handleAdminSession({action:'check',token},identity,client,table,at,'251029');

test('30-day opaque admin tokens are bound to a device identity and expire exactly',async()=>{
  const {client,rows}=fakeDb();
  const auth=await login(client,'device-1');
  assert.equal(auth.valid,true);
  assert.equal(auth.expiresAt,now+ADMIN_SESSION_LIFETIME_MS);
  assert.ok(validAdminToken(auth.token));
  assert.equal(await check(client,'device-1',auth.token),Object.assign({valid:true},{expiresAt:auth.expiresAt}));
  assert.deepEqual(await check(client,'device-2',auth.token),{valid:false,expiresAt:null});
  assert.equal((await check(client,'device-1',auth.token,auth.expiresAt-1)).valid,true);
  assert.equal((await check(client,'device-1',auth.token,auth.expiresAt)).valid,false);
  assert.equal([...rows.keys()].some(key=>key===auth.token),false,'raw bearer token must not be stored in database');
  assert.equal(validAdminSession({},'device-1',0,now),false);
});

test('logoutAll invalidates 30-day tokens on every device, but a fresh login still works',async()=>{
  const {client}=fakeDb();
  const first=await login(client,'device-1');
  const second=await login(client,'device-2');
  assert.equal((await check(client,'device-1',first.token)).valid,true);
  assert.equal((await check(client,'device-2',second.token)).valid,true);
  const revoked=await handleAdminSession(
    {action:'logoutAll',token:first.token},'device-1',client,table,now,'251029');
  assert.deepEqual(revoked,{valid:false,revokedAll:true});
  assert.deepEqual(await check(client,'device-1',first.token),{valid:false,expiresAt:null});
  assert.deepEqual(await check(client,'device-2',second.token),{valid:false,expiresAt:null});
  await assert.rejects(handleAdminSession(
    {action:'logoutAll',token:second.token},'device-2',client,table,now,'251029'),/เซสชันหมดอายุ/);
  const newAuth=await login(client,'device-2');
  assert.equal((await check(client,'device-2',newAuth.token)).valid,true);
});

test('logout local deletes only its token; passwords and invalid tokens cannot revoke everyone',async()=>{
  const {client}=fakeDb();
  const a=await login(client,'alpha');
  const b=await login(client,'beta');
  const logout=await handleAdminSession(
    {action:'logout',token:a.token},'alpha',client,table,now,'251029');
  assert.equal(logout.valid,false);
  assert.equal((await check(client,'alpha',a.token)).valid,false);
  assert.equal((await check(client,'beta',b.token)).valid,true);
  await assert.rejects(handleAdminSession(
    {action:'logoutAll',token:'0'.repeat(64)},'alpha',client,table,now,'251029'),/เซสชันหมดอายุ/);
  await assert.rejects(login(client,'attacker','wrong'),/รหัสไม่ถูกต้อง/);
  assert.equal((await check(client,'beta',b.token)).valid,true);
});

test('wrong PIN is throttled after ten tries for the same Cognito identity',async()=>{
  const {client}=fakeDb();
  for(let i=0;i<10;i++)
    await assert.rejects(login(client,'brute','nope'),/รหัสไม่ถูกต้อง/);
  await assert.rejects(login(client,'brute'),/มากเกินไป/);
});

test('AppSync resolver selects adminSession with fieldName or action fallback',()=>{
  assert.equal(resolveOperation({fieldName:'adminSession',arguments:{action:'check'}}),'adminSession');
  assert.equal(resolveOperation({arguments:{action:'login',pin:'x'}}),'adminSession');
  assert.equal(resolveOperation({arguments:{action:'logoutAll'}}),'adminSession');
  assert.equal(resolveOperation({arguments:{action:'create'}}),'gameAction');
});
