import { createHash, randomBytes } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { advance, applyAction, newMatch, snapshot, publicRoom, timedTransitionDue, type Match } from './logic';
import {handleAdminSession} from './admin-sessions';
import { resolveOperation } from './request';
import { roundWordDeltas } from './stats';
import { analyzeRarity, rarityDay, rarityGroup, roundRarityObservations, stabilizeRarity, wordsForGroup,
  RARITY_MAX_EVENTS, RARITY_WINDOW_DAYS, type RarityObservation, type RaritySnapshot } from './rarity';
import {roundDessertSuggestions,SUGGESTION_MIN_REPORTS,SUGGESTION_TTL_DAYS} from './suggestions';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions:{removeUndefinedValues:true} });
const TABLE=process.env.MATCHES_TABLE || '';
if (!TABLE) throw new Error('MATCHES_TABLE is required');
const STATS_TABLE=process.env.WORD_STATS_TABLE || '';
if(!STATS_TABLE)throw new Error('WORD_STATS_TABLE is required');
const SUGGESTIONS_TABLE=process.env.WORD_SUGGESTIONS_TABLE||'';
if(!SUGGESTIONS_TABLE)throw new Error('WORD_SUGGESTIONS_TABLE is required');
const RARITY_OBSERVATIONS_TABLE=process.env.RARITY_OBSERVATIONS_TABLE || '';
const RARITY_META_TABLE=process.env.RARITY_META_TABLE || '';
if(!RARITY_OBSERVATIONS_TABLE || !RARITY_META_TABLE)throw new Error('RARITY_TABLES required');
type GroupMeta = {
  id:string; version:number; groupStartedAt:number;
  firstEligibleAt:Record<string,number>; dictionarySignature:string;
  snapshot?:RaritySnapshot;
};
const noBonuses:Record<string,number>={};
/** Cached by day per group, not recalculated on each player input. */
async function loadRaritySnapshot(letter:string,category:string,now:number):Promise<Record<string,number>>{
  const words=wordsForGroup(letter,category);
  if(words.length<10)return noBonuses;
  const id=rarityGroup(letter,category);
  const signature=createHash('sha256').update(words.join('\\0')).digest('hex');
  const day=rarityDay(now);
  for(let attempt=0;attempt<3;attempt++){
    const readMeta=await db.send(new GetCommand({TableName:RARITY_META_TABLE,Key:{id},ConsistentRead:true}));
    const old=readMeta.Item as GroupMeta|undefined;
    const born={...(old?.firstEligibleAt||{})};
    // Deleted words lose eligibility; reintroducing one later starts a fresh cold start.
    const currentWords=new Set(words);
    for(const known of Object.keys(born))if(!currentWords.has(known))delete born[known];
    for(const word of words)if(!Number.isFinite(born[word]))born[word]=now;
    if(old?.dictionarySignature===signature && old.snapshot?.day===day && old.snapshot.eligible)
      return old.snapshot.bonuses;
    // Cached 'not ready' snapshots are also valid for the day.
    if(old?.dictionarySignature===signature && old.snapshot?.day===day)
      return noBonuses;
    const cutoff=new Date(now-RARITY_WINDOW_DAYS*86400000).toISOString();
    let cursor:Record<string,unknown>|undefined;
    const observations:RarityObservation[]=[];
    let truncated=false;
    do {
      const result=await db.send(new QueryCommand({
        TableName:RARITY_OBSERVATIONS_TABLE,
        KeyConditionExpression:'#group=:g AND #event>=:cutoff',
        ExpressionAttributeNames:{'#group':'group','#event':'eventId'},
        ExpressionAttributeValues:{':g':id,':cutoff':cutoff},
        ExclusiveStartKey:cursor,Limit:500,ConsistentRead:true
      }));
      observations.push(...(result.Items||[]) as RarityObservation[]);
      cursor=result.LastEvaluatedKey;
      if(cursor && observations.length>=RARITY_MAX_EVENTS){truncated=true;break;}
    }while(cursor);
    // Refuse to misclassify if we cannot analyze the complete recent history.
    const result=truncated?null:analyzeRarity({
      words,observations,firstEligibleAt:born,groupStartedAt:old?.groupStartedAt ?? now,now
    });
    if(truncated)console.warn('Rarity observation page cap reached for',id);
    const snapshot=stabilizeRarity(result?.candidates||{},old?.snapshot,day,!!result?.eligible);
    // A dictionary deploy mid-day must not abruptly discard already-earned tiers
    // for existing words or count as an additional promotion day. New words never
    // inherit a bonus. Any actual reclassification begins on the next rarity day.
    if(result?.eligible && old?.snapshot?.eligible && old.snapshot.day===day) {
      const liveWords=new Set(words);
      snapshot.bonuses=Object.fromEntries(
        Object.entries(old.snapshot.bonuses).filter(([word])=>liveWords.has(word))
      );
      snapshot.candidates=Object.fromEntries(
        Object.entries(old.snapshot.candidates).filter(([word])=>liveWords.has(word))
      );
    }
    snapshot.recentWordUses=result?.recentWordUses||{};
    snapshot.evaluatedAt=now;
    snapshot.suspicious=result?.suspicious||false;
    snapshot.observations=result?.observations||0;
    snapshot.uniquePlayers=result?.uniquePlayers||0;
    snapshot.uniqueRooms=result?.uniqueRooms||0;
    const meta:GroupMeta={
      id,version:(old?.version||0)+1,
      groupStartedAt:old?.groupStartedAt ?? now,
      firstEligibleAt:born,dictionarySignature:signature,snapshot
    };
    try{
      await db.send(new PutCommand({
        TableName:RARITY_META_TABLE,Item:meta,
        ConditionExpression:old?'#v=:old':'attribute_not_exists(#id)',
        ExpressionAttributeNames:old?{'#v':'version'}:{'#id':'id'},
        ExpressionAttributeValues:old?{':old':old.version}:undefined
      }));
      return snapshot.bonuses;
    }catch(e:any){
      if(e?.name!=='ConditionalCheckFailedException')throw e;
    }
  }
  console.warn('Rarity metadata contention for',id);
  return noBonuses;
}
async function assignRaritySnapshot(before:Match|null,state:Match,now:number):Promise<void>{
  if(state.phase!=='playing')return;
  if(before?.phase==='playing' && before.round===state.round)return;
  state.rarityBonuses={};
  // Failed analytics must NEVER stop a round or award unverified bonuses.
  const results=await Promise.all(state.categories.map(async slot=>{
    const category=state.topicCategory||slot;
    const letter=state.topicCategory?slot:state.letter;
    try{return [slot,await loadRaritySnapshot(letter,category,now)] as const;}
    catch(e){console.warn('Rarity analytics unavailable for',letter,category,e);return [slot,{}] as const;}
  }));
  for(const [slot,bonuses] of results)state.rarityBonuses[slot]=bonuses;
}

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
  const put:{TableName:string;Item:Match;ConditionExpression:string;
    ExpressionAttributeNames:Record<string,string>;ExpressionAttributeValues?:Record<string,number>}={
    TableName:TABLE,Item:updated,
    ConditionExpression:old?'#v = :prior':'attribute_not_exists(#id)',
    ExpressionAttributeNames:old?{'#v':'version'}:{'#id':'id'},
    ExpressionAttributeValues:old?{':prior':old.version}:undefined
  };
  const deltas=roundWordDeltas(old,updated);
  const observations=roundRarityObservations(old,updated,Date.now());
  if(!deltas.length && !observations.length){
    await db.send(new PutCommand(put));
    return;
  }
  // Atomic match, <=64 distinct word updates, <=8 rarity category events: <=73 actions.
  // Failed/conflicting match version means NO usage or rarity observation increments.
  await db.send(new TransactWriteCommand({TransactItems:[
    {Put:put},
    ...observations.map(row=>({Put:{
      TableName:RARITY_OBSERVATIONS_TABLE,Item:row,
      ConditionExpression:'attribute_not_exists(#g)',
      ExpressionAttributeNames:{'#g':'group'}
    }})),
    ...deltas.map(word=>({Update:{
      TableName:STATS_TABLE,Key:{id:word.id},
      UpdateExpression:'SET #letter=:letter, #category=:category, #word=:word, #last=:now ADD #uses :uses, #points :points',
      ExpressionAttributeNames:{
        '#letter':'letter','#category':'category','#word':'word','#last':'lastUsedAt',
        '#uses':'timesUsed','#points':'totalPoints'
      },
      ExpressionAttributeValues:{
        ':letter':word.letter,':category':word.category,':word':word.word,
        ':now':Date.now(),':uses':word.timesUsed,':points':word.totalPoints
      }
    }}))
  ]}));
}
/** Best-effort, after winning the match CAS/transaction. Never block gameplay
 * or count a failed/duplicate transaction. Each round contributes once per word.
 */
async function persistDessertSuggestions(before:Match|null,after:Match):Promise<void>{
  const proposed=roundDessertSuggestions(before,after);
  if(!proposed.length)return;
  const now=Date.now();
  const ttl=Math.floor(now/1000)+SUGGESTION_TTL_DAYS*86400;
  const updates=proposed.map(item=>db.send(new UpdateCommand({
    TableName:SUGGESTIONS_TABLE,Key:{id:item.id},
    UpdateExpression:'SET #word=:word,#category=:cat,#letter=:letter,#last=:last,#ttl=:ttl ADD #count :one',
    ExpressionAttributeNames:{
      '#word':'word','#category':'category','#letter':'letter',
      '#last':'lastSeenAt','#ttl':'ttl','#count':'timesSuggested'
    },
    ExpressionAttributeValues:{
      ':word':item.word,':cat':item.category,':letter':item.letter,
      ':last':now,':ttl':ttl,':one':1
    }
  })));
  const results=await Promise.allSettled(updates);
  if(results.some(item=>item.status==='rejected'))
    console.warn('Dessert suggestion aggregation incomplete; game result was still committed');
}
async function readDessertSuggestions(cursor?:string){
  if(cursor && (cursor.length>250||!cursor.startsWith('suggest#dessert#')))
    throw new Error('INVALID_CURSOR');
  const result=await db.send(new ScanCommand({
    TableName:SUGGESTIONS_TABLE,Limit:250,
    ExclusiveStartKey:cursor?{id:cursor}:undefined,
    FilterExpression:'#count >= :minimum',
    ProjectionExpression:'#word,#letter,#count,#last',
    ExpressionAttributeNames:{
      '#word':'word','#letter':'letter','#count':'timesSuggested','#last':'lastSeenAt'
    },
    ExpressionAttributeValues:{':minimum':SUGGESTION_MIN_REPORTS}
  }));
  const items=(result.Items||[]).map(row=>({
    category:'dessert',word:row.word,letter:row.letter,
    timesSuggested:row.timesSuggested||0,lastSeenAt:row.lastSeenAt||null
  }));
  return {items,nextToken:result.LastEvaluatedKey?.id||null};
}
function isRetryableConflict(error:any):boolean {
  if(error?.name==='ConditionalCheckFailedException' || error?.name==='TransactionConflictException')return true;
  if(error?.name==='TransactionCanceledException'){
    return (error.CancellationReasons||[]).some((reason:any)=>
      reason.Code==='ConditionalCheckFailed'||reason.Code==='TransactionConflict');
  }
  return false;
}
/** Aggregate-only rarity snapshot reader, shared with the existing stats API.
 * Guest-accessible by design: the legacy front-end admin PIN is a convenience
 * screen gate, NOT an authorization boundary. Never return round observations
 * or pseudonymous player IDs.
 */
async function readRarityStats(cursor?:string) {
  if(cursor && (cursor.length>160 || !/^[ก-ฮ]#[a-z]+$/.test(cursor)))throw new Error('INVALID_CURSOR');
  const result=await db.send(new ScanCommand({
    TableName:RARITY_META_TABLE,Limit:100,
    ExclusiveStartKey:cursor?{id:cursor}:undefined,
    ProjectionExpression:'#id,#start,#born,#snapshot',
    ExpressionAttributeNames:{
      '#id':'id','#start':'groupStartedAt',
      '#born':'firstEligibleAt','#snapshot':'snapshot'
    }
  }));
  return {
    items:(result.Items||[]).flatMap(item=>{
      if(typeof item.id!=='string')return [];
      const [letter,category]=item.id.split('#');
      if(!letter||!category)return [];
      return [{
        letter,category,
        groupStartedAt:item.groupStartedAt||null,
        firstEligibleAt:item.firstEligibleAt||{},
        snapshot:item.snapshot||null
      }];
    }),
    nextToken:result.LastEvaluatedKey?.id||null
  };
}

/** Scan a separate retained stats table in bounded pages. Export is intentionally aggregate-only. */
async function readWordStats(cursor?:string){
  if(cursor && (cursor.length>250 || !cursor.startsWith('stats#')))throw new Error('INVALID_CURSOR');
  const result=await db.send(new ScanCommand({
    TableName:STATS_TABLE,Limit:250,
    ExclusiveStartKey:cursor?{id:cursor}:undefined,
    ProjectionExpression:'#id,#letter,#category,#word,#uses,#points,#last',
    ExpressionAttributeNames:{
      '#id':'id','#letter':'letter','#category':'category','#word':'word',
      '#uses':'timesUsed','#points':'totalPoints','#last':'lastUsedAt'
    }
  }));
  const items=(result.Items||[]).map(item=>({
    letter:item.letter,category:item.category,word:item.word,
    timesUsed:item.timesUsed||0,totalPoints:item.totalPoints||0,lastUsedAt:item.lastUsedAt||null
  }));
  return {items,nextToken:result.LastEvaluatedKey?.id||null};
}
/** Public waiting rooms: small, bounded scan for friends-only MVP.
 * Only sanitized summary fields are emitted; no players IDs or answers.
 * Pagination avoids hiding new rooms behind expired legacy records.
 */
async function availableRooms(now:number){
  const collected:ReturnType<typeof publicRoom>[]=[];
  let cursor:Record<string,unknown>|undefined;
  for(let page=0;page<8;page++){
    const response=await db.send(new ScanCommand({
      TableName:TABLE,
      Limit:100,
      ExclusiveStartKey:cursor,
      ProjectionExpression:'#id,#phase,#players,#owner,#settings,#created',
      ExpressionAttributeNames:{
        '#id':'id','#phase':'phase','#players':'players',
        '#owner':'ownerId','#settings':'settings','#created':'createdAt'
      }
    }));
    for(const item of response.Items || []){
      const visible=publicRoom(item as Match,now);
      if(visible)collected.push(visible);
    }
    cursor=response.LastEvaluatedKey;
    if(!cursor)break;
  }
  return collected.filter((item):item is NonNullable<typeof item>=>item!==null)
    .sort((a,b)=>b.createdAt-a.createdAt).slice(0,30);
}
/** A weak/offline player's polling request must be able to move a timed phase.
 * Only expired phase transitions write; ordinary polls remain a single read.
 * The same CAS and accounting transaction as gameAction prevents double scores.
 */
async function readAndAdvanceGame(roomId:string):Promise<Match|null>{
  for(let attempt=0;attempt<6;attempt++){
    const before=await read(roomId);
    if(!before)return null;
    const now=Date.now();
    if(!timedTransitionDue(before,now))return before;
    const state=structuredClone(before);
    advance(state,now);
    await assignRaritySnapshot(before,state,now);
    try{
      await commit(roomId,before,state);
      await persistDessertSuggestions(before,state);
      return state;
    }catch(error:any){
      if(!isRetryableConflict(error))throw error;
      await sleep((attempt+1)*20);
    }
  }
  // Another poll/pulse won the race: return its current durable snapshot.
  return read(roomId);
}
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
function parseJson(value:unknown):unknown {
  if(typeof value!=='string')return value;
  try{return JSON.parse(value);}catch{return {};}
}
export const handler=async(event:any)=>{
  const args=event?.arguments ?? event ?? {};
  const operation=resolveOperation(event);
  if (operation==='adminSession')return handleAdminSession(
    args,userFromEvent(event),db,process.env.ADMIN_SESSIONS_TABLE||''
  );
  if (operation==='getGame') {
    const roomId=args.roomId;
    return typeof roomId==='string' && ROOM_ID.test(roomId)
      ? snapshotOrNull(await readAndAdvanceGame(roomId)) : null;
  }
  if (operation==='listRooms') return availableRooms(Date.now());
  if (operation==='getWordStats') {
    if(args.request==='stats')return readWordStats(args.cursor);
    if(args.request==='rarity')return readRarityStats(args.cursor);
    if(args.request==='dessert-suggestions')return readDessertSuggestions(args.cursor);
    throw new Error('INVALID_STATS_REQUEST');
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
        if(!isRetryableConflict(error))throw error;
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
    await assignRaritySnapshot(before,state,now);
    try{
      await commit(roomId,before,state);
      await persistDessertSuggestions(before,state);
      return {roomId,snapshot:{...snapshot(state),you:userId}};
    }catch(error:any){
      if(!isRetryableConflict(error))throw error;
      await sleep((attempt+1)*20);
    }
  }
  throw new Error('มีผู้เล่นดำเนินการพร้อมกัน กรุณาลองใหม่');
};
function snapshotOrNull(value:Match|null){return value?snapshot(value):null;}
