import { createHash, randomBytes } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { applyAction, newMatch, snapshot, type Match } from './logic';
import { resolveOperation } from './request';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions:{removeUndefinedValues:true} });
const TABLE=process.env.MATCHES_TABLE;
if (!TABLE) throw new Error('MATCHES_TABLE is required');
const ROOM_ID=/^room-[a-f0-9]{20}$/;
function userFromEvent(event: any): string {
  const identity = event?.identity ?? event?.context?.identity;
  const guestId = identity?.cognitoIdentityId;
  if (typeof guestId!=='string' || !guestId) throw new Error('Guest credentials are required');
  return createHash('sha256').update(guestId).digest('hex').slice(0,24);
}
async function read(roomId:string):Promise<Match|null> {
  if (!ROOM_ID.test(roomId)) return null;
  const response=await db.send(new GetCommand({TableName:TABLE,Key:{id:roomId},ConsistentRead:true}));
  return response.Item as Match || null;
}
async function commit(roomId:string,old:Match|null,updated:Match):Promise<void> {
  updated.version=(old?.version||0)+1;
  await db.send(new PutCommand({
    TableName:TABLE,Item:updated,
    ConditionExpression:old?'#v = :prior':'attribute_not_exists(#id)',
    ExpressionAttributeNames:old?{'#v':'version'}:{'#id':'id'},
    ExpressionAttributeValues:old?{':prior':old.version}:undefined
  }));
}
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
function parseJson(value:unknown):unknown {
  if(typeof value!=='string')return value;
  try{return JSON.parse(value);}catch{return {};}
}
export const handler=async(event:any)=>{
  const args=event?.arguments ?? event ?? {};
  const operation=resolveOperation(event);
  if (operation==='getGame') {
    const roomId=args.roomId;
    return typeof roomId==='string' && ROOM_ID.test(roomId) ? snapshotOrNull(await read(roomId)) : null;
  }
  const action=args.action;
  const now=Date.now();
  const userId=userFromEvent(event);
  if(action==='create') {
    for(let retry=0;retry<4;retry++) {
      const id='room-'+randomBytes(10).toString('hex');
      const state=newMatch(id,now);
      applyAction(state,'create',userId,now,args.name||'',undefined,parseJson(args.settings));
      try {
        await commit(id,null,state);
        return {roomId:id,snapshot:{...snapshot(state),you:userId}};
      }catch(error:any) {
        if(error.name!=='ConditionalCheckFailedException')throw error;
      }
    }
    throw new Error('สร้างห้องไม่สำเร็จ กรุณาลองอีกครั้ง');
  }
  const roomId=args.roomId;
  if(typeof roomId!=='string'||!ROOM_ID.test(roomId))throw new Error('INVALID_ROOM');
  for(let attempt=0;attempt<7;attempt++){
    const before=await read(roomId);
    if(!before)throw new Error('ไม่พบห้องนี้ หรือห้องหมดอายุแล้ว');
    const state=structuredClone(before);
    applyAction(state,action,userId,now,args.name||'',parseJson(args.answers),parseJson(args.settings));
    try{
      await commit(roomId,before,state);
      return {roomId,snapshot:{...snapshot(state),you:userId}};
    }catch(error:any){
      if(error.name!=='ConditionalCheckFailedException')throw error;
      await sleep((attempt+1)*20);
    }
  }
  throw new Error('มีผู้เล่นดำเนินการพร้อมกัน กรุณาลองใหม่');
};
function snapshotOrNull(value:Match|null){return value?snapshot(value):null;}
