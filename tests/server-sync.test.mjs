import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const handler=readFileSync(new URL('../amplify/functions/game/handler.ts',import.meta.url),'utf8');

test('a game read advances only expired server-owned phases and commits atomically',()=>{
  assert.match(handler,/async function readAndAdvanceGame\(roomId:string\)/);
  assert.match(handler,/if\(!timedTransitionDue\(before,now\)\)return before/);
  assert.match(handler,/advance\(state,now\)/);
  assert.match(handler,/await assignRaritySnapshot\(before,state,now\)/);
  assert.match(handler,/await commit\(roomId,before,state\)/);
  assert.match(handler,/if\(!isRetryableConflict\(error\)\)throw error/);
  assert.match(handler,/snapshotOrNull\(await readAndAdvanceGame\(roomId\)\)/);
});
