import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {DeleteCommand,GetCommand,PutCommand,UpdateCommand} from '@aws-sdk/lib-dynamodb';

/**
 * Opaque 30-day sessions kept in DynamoDB, not self-contained JWTs.
 * Global logout increments a durable revision; all old sessions then fail checks.
 */
export const ADMIN_SESSION_LIFETIME_MS=30*24*60*60*1000;
export const ADMIN_SESSION_CHECK_MS=15_000;
const LOGIN_ATTEMPT_WINDOW_MS=15*60*1000;
const MAX_LOGIN_ATTEMPTS=10;
type Client={send:(command:any)=>Promise<any>};
type SessionRecord={
  id:string;identity:string;revision:number;expiresAt:number;ttl:number;
};
type SessionArgs={action?:unknown;token?:unknown;pin?:unknown};
function hash(token:string):string {
  return createHash('sha256').update(token).digest('hex');
}
function safeEquals(actual:unknown,expected:string):boolean {
  if(typeof actual!=='string')return false;
  const a=Buffer.from(actual),b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
function sessionKey(token:string):string{return 'session#'+hash(token);}
export function validAdminSession(session:unknown,identity:string,revision:number,now:number):boolean{
  if(!session||typeof session!=='object')return false;
  const value=session as Partial<SessionRecord>;
  return value.identity===identity&&value.revision===revision&&
    typeof value.expiresAt==='number'&&Number.isFinite(value.expiresAt)&&value.expiresAt>now;
}
export function validAdminToken(token:unknown):token is string{
  return typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
}
async function revision(client:Client,table:string):Promise<number>{
  const value=await client.send(new GetCommand({
    TableName:table,Key:{id:'control'},ConsistentRead:true
  }));
  return Number(value.Item?.revision)||0;
}
async function currentSession(client:Client,table:string,token:unknown,identity:string,now:number){
  if(!validAdminToken(token))return null;
  const [lookup,rev]=await Promise.all([
    client.send(new GetCommand({TableName:table,Key:{id:sessionKey(token)},ConsistentRead:true})),
    revision(client,table)
  ]);
  const session=lookup.Item as SessionRecord|undefined;
  return validAdminSession(session,identity,rev,now)?session:null;
}
export async function handleAdminSession(
  args:SessionArgs,identity:string,client:Client,table:string,
  now=Date.now(),expectedPin=process.env.ADMIN_ACCESS_PIN||'251029'
){
  if(!table)throw new Error('ADMIN_SESSIONS_TABLE is required');
  if(!identity)throw new Error('IDENTITY_REQUIRED');
  if(args.action==='login'){
    // Only the provided PIN is checked; no PIN or token is logged or returned in errors.
    const bucket=Math.floor(now/LOGIN_ATTEMPT_WINDOW_MS);
    const throttle=await client.send(new UpdateCommand({
      TableName:table,Key:{id:'attempt#'+identity+'#'+bucket},
      UpdateExpression:'SET #ttl=:ttl ADD #attempts :one',
      ExpressionAttributeNames:{'#ttl':'ttl','#attempts':'attempts'},
      ExpressionAttributeValues:{
        ':ttl':Math.floor((bucket+2)*LOGIN_ATTEMPT_WINDOW_MS/1000),':one':1
      },
      ReturnValues:'UPDATED_NEW'
    }));
    if((Number(throttle.Attributes?.attempts)||0)>MAX_LOGIN_ATTEMPTS)
      throw new Error('ลองใส่รหัสมากเกินไป กรุณาลองอีกครั้งใน 15 นาที');
    if(!safeEquals(args.pin,expectedPin))throw new Error('รหัสไม่ถูกต้อง');
    const rev=await revision(client,table);
    const token=randomBytes(32).toString('hex');
    const expiresAt=now+ADMIN_SESSION_LIFETIME_MS;
    await client.send(new PutCommand({
      TableName:table,Item:{
        id:sessionKey(token),identity,revision:rev,expiresAt,
        ttl:Math.floor(expiresAt/1000)+86400
      },ConditionExpression:'attribute_not_exists(#id)',
      ExpressionAttributeNames:{'#id':'id'}
    }));
    return {valid:true,token,expiresAt};
  }
  if(args.action==='check'){
    const session=await currentSession(client,table,args.token,identity,now);
    return {valid:!!session,expiresAt:session?.expiresAt??null};
  }
  if(args.action==='logout'){
    const session=await currentSession(client,table,args.token,identity,now);
    if(session)await client.send(new DeleteCommand({TableName:table,Key:{id:session.id}}));
    return {valid:false};
  }
  if(args.action==='logoutAll'){
    const session=await currentSession(client,table,args.token,identity,now);
    if(!session)throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
    // Atomic increment: even a concurrent logout request cannot bring back old sessions.
    await client.send(new UpdateCommand({
      TableName:table,Key:{id:'control'},
      UpdateExpression:'ADD #revision :one',
      ExpressionAttributeNames:{'#revision':'revision'},
      ExpressionAttributeValues:{':one':1}
    }));
    return {valid:false,revokedAll:true};
  }
  throw new Error('INVALID_ADMIN_ACTION');
}
