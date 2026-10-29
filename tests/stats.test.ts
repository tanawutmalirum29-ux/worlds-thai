import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newMatch,applyAction,advance,scoreRound} from '../amplify/functions/game/logic.ts';
import {roundWordDeltas} from '../amplify/functions/game/stats.ts';
import {letterCaption} from '../src/letters.ts';
import {buildWordUsageCsv,EXPORT_PROMPT_CODE} from '../src/stats-export.ts';
import {WORD_BANK} from '../amplify/functions/game/dictionary.ts';
const now=1_700_000_000_000;
test('small 2/1 scoring and one-time round word deltas',()=>{
  const game=newMatch('room-aabbccddeeff00112233',now);
  applyAction(game,'create','host',now,'Host');
  applyAction(game,'join','guest',now,'Guest');
  applyAction(game,'start','host',now+1000);
  game.letter='ส';game.categories=['animal','food','sport'];
  applyAction(game,'submit','host',now+2000,'',{animal:'เสือ',food:'ส้มตำ',sport:'not-real'});
  applyAction(game,'submit','guest',now+2000,'',{animal:'เสือ',food:'เสือ',sport:'สนุกเกอร์'});
  assert.deepEqual(scoreRound(game).map(x=>x.points),[3,3]);
  const before=structuredClone(game);
  for(const p of game.players)p.lastSeen=game.deadline;
  advance(game,game.deadline+1);
  const deltas=roundWordDeltas(before,game);
  assert.equal(deltas.length,3);
  const words=new Map(deltas.map(x=>[x.word,x]));
  assert.deepEqual([words.get('เสือ')?.timesUsed,words.get('เสือ')?.totalPoints],[2,2]);
  assert.deepEqual([words.get('ส้มตำ')?.timesUsed,words.get('ส้มตำ')?.totalPoints],[1,2]);
  assert.deepEqual([words.get('สนุกเกอร์')?.timesUsed,words.get('สนุกเกอร์')?.totalPoints],[1,2]);
  assert.equal(roundWordDeltas(game,game).length,0);
  assert.equal(roundWordDeltas(null,game).length,0);
});
test('distinct letter names: ข ไข่ is playable, ฃ ขวด is omitted from game',()=>{
  assert.equal(letterCaption('บ'),'บ ใบไม้');
  assert.equal(letterCaption('ข'),'ข ไข่');
  assert.equal(letterCaption('ฃ'),'ฃ ขวด');
  assert.equal(letterCaption('ส'),'ส เสือ');
});
test('export CSV includes used and zero-use reviewed dictionary words',()=>{
  const csv=buildWordUsageCsv([
    {letter:'ส',category:'animal',word:'เสือ',timesUsed:2,totalPoints:2,lastUsedAt:now},
    {letter:'ส',category:'food',word:'ส้มตำ',timesUsed:1,totalPoints:2}
  ]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv,/"ส","ส เสือ","สัตว์","เสือ","2","2"/);
  assert.match(csv,/"ส","ส เสือ","อาหาร","ส้มตำ","1","2"/);
  assert.match(csv,/"ก","ก ไก่","สัตว์","กบ","0","0"/);
  assert.ok(csv.split('\r\n').length>1000);
  assert.equal(EXPORT_PROMPT_CODE,'251029');
  const extended=buildWordUsageCsv([],{...WORD_BANK,fruit:[...WORD_BANK.fruit,'ผลไม้ทดสอบ']});
  assert.match(extended,/"ผ","ผ ผึ้ง","ผลไม้","ผลไม้ทดสอบ","0","0"/);
});
test('transactional stats guard in backend',()=>{
  const code=readFileSync(new URL('../amplify/functions/game/handler.ts',import.meta.url),'utf8');
  assert.match(code,/TransactWriteCommand/);
  assert.match(code,/roundWordDeltas\(old,updated\)/);
  assert.match(code,/\{Put:put\}/);
  const schema=readFileSync(new URL('../amplify/data/resource.ts',import.meta.url),'utf8');
  assert.match(schema,/getWordStats: a\.query\(\)/);
});

test('CSV remaps the dessert-prefix letter and preserves historical stats',()=>{
  const csv=buildWordUsageCsv([
    {letter:'ข',category:'dessert',word:'ขนมครก',timesUsed:3,totalPoints:6,lastUsedAt:now-100},
    {letter:'ค',category:'dessert',word:'ขนมครก',timesUsed:2,totalPoints:4,lastUsedAt:now},
    {letter:'ข',category:'dessert',word:'ขนมไข่',timesUsed:1,totalPoints:2,lastUsedAt:now}
  ]);
  assert.match(csv,/"ค","ค ควาย","ขนม","ขนมครก","5","10"/);
  assert.match(csv,/"ข","ข ไข่","ขนม","ขนมไข่","1","2"/);
});

test('stats aggregate prefixed and bare desserts into one canonical key',()=>{
  const game=newMatch('room-abcdefabcdefabcdefab',now);
  applyAction(game,'create','host',now,'Host');
  applyAction(game,'join','guest',now,'Guest');
  applyAction(game,'start','host',now+1000);
  game.letter='ข';game.categories=['dessert'];
  applyAction(game,'draft','host',now+2000,'',{dessert:'ไข่หงส์'});
  applyAction(game,'draft','guest',now+2000,'',{dessert:'ขนมไข่เหี้ย'});
  const before=structuredClone(game);
  for(const p of game.players)p.lastSeen=game.deadline;
  advance(game,game.deadline+1);
  const rows=roundWordDeltas(before,game);
  assert.deepEqual(rows.map(r=>({word:r.word,count:r.timesUsed,points:r.totalPoints})),
    [{word:'ไข่หงส์',count:2,points:2}]);
});
test('CSV joins prefixed historical statistics with bare canonical word',()=>{
  const csv=buildWordUsageCsv([
    {letter:'ข',category:'dessert',word:'ไข่หงส์',timesUsed:1,totalPoints:2},
    {letter:'ข',category:'dessert',word:'ขนมไข่หงส์',timesUsed:2,totalPoints:3},
    {letter:'ข',category:'dessert',word:'ขนมไข่เหี้ย',timesUsed:1,totalPoints:1}
  ]);
  assert.match(csv,/"ข","ข ไข่","ขนม","ไข่หงส์","4","6"/);
  assert.match(csv,/"ข","ข ไข่","ขนม","ข้าวตู","0","0"/);
});

test('backend writes anonymous suggestions only after a committed match, not on draft',()=>{
  const backend=readFileSync(new URL('../amplify/functions/game/handler.ts',import.meta.url),'utf8');
  const updated=backend.indexOf('await commit(roomId,before,state)');
  const later=backend.indexOf('await persistDessertSuggestions(before,state)',updated);
  assert.ok(updated>=0&&later>updated);
  assert.match(backend,/SUGGESTION_MIN_REPORTS/);
  assert.match(backend,/readDessertSuggestions/);
  assert.match(backend,/Promise\.allSettled/);
  const resource=readFileSync(new URL('../amplify/backend.ts',import.meta.url),'utf8');
  assert.match(resource,/timeToLiveAttribute:'ttl'/);
  assert.match(resource,/WORD_SUGGESTIONS_TABLE/);
});
