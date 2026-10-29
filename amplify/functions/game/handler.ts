import { createHash } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { applyAction, newMatch, snapshot, type Match } from './logic';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const TABLE = process.env.MATCHES_TABLE;
if (!TABLE) throw new Error('MATCHES_TABLE is required');
const roomIds = Array.from({length: 20}, (_, i) => `public-${i+1}`);
function userFromEvent(event: {identity?: unknown}) {
  const identity = event.identity as {cognitoIdentityId?: string} | null;
  if (!identity?.cognitoIdentityId) throw new Error('Guest credentials are required');
  return createHash('sha256').update(identity.cognitoIdentityId).digest('hex').slice(0, 20);
}
async function read(roomId: string): Promise<Match | null> {
  if (!roomIds.includes(roomId)) return null;
  const response = await db.send(new GetCommand({ TableName: TABLE, Key: { id: roomId }, ConsistentRead: true }));
  return response.Item as Match || null;
}
async function commit(roomId: string, old: Match | null, updated: Match) {
  updated.version = (old?.version || 0) + 1;
  await db.send(new PutCommand({
    TableName: TABLE, Item: updated,
    ConditionExpression: old ? '#v = :prior' : 'attribute_not_exists(#id)',
    ExpressionAttributeNames: old ? {'#v':'version'} : {'#id':'id'},
    ExpressionAttributeValues: old ? {':prior':old.version} : undefined
  }));
}
const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return {}; }
}
export const handler = async (event: any) => {
  const args = event.arguments || {};
  const action = args.action;
  const now = Date.now();
  if (event.info.fieldName === 'getGame') {
    const state = await read(args.roomId);
    return state ? snapshot(state) : null;
  }
  const userId = userFromEvent(event);
  const targets = action === 'join' && !args.roomId ? roomIds : [args.roomId];
  if (!targets?.length || targets.some((x: string) => !roomIds.includes(x))) throw new Error('INVALID_ROOM');
  for (const roomId of targets as string[]) {
    for (let attempt = 0; attempt < 7; attempt++) {
      const before = await read(roomId);
      const state = structuredClone(before || newMatch(roomId, now));
      try { applyAction(state, action, userId, now, args.name || '', parseJson(args.answers)); }
      catch (error) {
        if (action === 'join' && (error as Error).message === 'ROOM_UNAVAILABLE') break;
        throw error;
      }
      try {
        await commit(roomId, before, state);
        return { roomId, snapshot: { ...snapshot(state), you: userId } };
      } catch (error: any) {
        if (error.name !== 'ConditionalCheckFailedException') throw error;
        await sleep(15 * (attempt + 1));
      }
    }
  }
  throw new Error(action === 'join' ? 'ห้องสาธารณะเต็ม กรุณาลองใหม่อีกครั้ง' : 'ระบบมีผู้เล่นจำนวนมาก กรุณาลองอีกครั้ง');
};
