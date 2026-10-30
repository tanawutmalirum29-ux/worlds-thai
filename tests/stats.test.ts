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

test('new stats exclude rude answers while retaining valid dessert scoring',()=>{
  const game=newMatch('room-abcdefabcdefabcdefab',now);
  applyAction(game,'create','host',now,'Host');
  applyAction(game,'join','guest',now,'Guest');
  applyAction(game,'start','host',now+1000);
  game.letter='ข';game.categories=['dessert'];
  applyAction(game,'draft','host',now+2000,'',{dessert:'ไข่หงส์'});
  applyAction(game,'draft','guest',now+2000,'',{dessert:'ขนมไข่เหี้ย'});
  assert.equal(game.submissions.guest.dessert,'','rude answers are not persisted');
  const before=structuredClone(game);
  for(const p of game.players)p.lastSeen=game.deadline;
  advance(game,game.deadline+1);
  const rows=roundWordDeltas(before,game);
  assert.deepEqual(rows.map(r=>({word:r.word,count:r.timesUsed,points:r.totalPoints})),
    [{word:'ไข่หงส์',count:1,points:2}]);
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

test('tree prefix variants share the exact same usage-statistic key',()=>{
  const m=newMatch('room-abcabcabcabcabcabcab',now);
  applyAction(m,'create','host',now,'Host');
  applyAction(m,'join','guest',now,'Guest');
  applyAction(m,'start','host',now+1000);
  m.letter='ม';m.categories=['tree'];
  applyAction(m,'draft','host',now+2000,'',{tree:'มะม่วง'});
  applyAction(m,'draft','guest',now+2000,'',{tree:'ต้นมะม่วง'});
  const before=structuredClone(m);
  for(const p of m.players)p.lastSeen=m.deadline;
  advance(m,m.deadline+1);
  const entries=roundWordDeltas(before,m);
  assert.deepEqual(entries.map(x=>[x.word,x.letter,x.timesUsed,x.totalPoints]),
    [['มะม่วง','ม',2,2]]);
  assert.equal(roundWordDeltas(before,m).length,1,'one delta per completed game round');
});
test('CSV merges historical ต-prefix tree records with normalized tree identity',()=>{
  const csv=buildWordUsageCsv([
    {letter:'ต',category:'tree',word:'ต้นโพธิ์',timesUsed:2,totalPoints:4,lastUsedAt:now-1000},
    {letter:'พ',category:'tree',word:'โพธิ์',timesUsed:3,totalPoints:3,lastUsedAt:now}
  ]);
  assert.match(csv,/"พ","พ พาน","ต้นไม้","ต้นโพธิ์","5","7"/);
  assert.doesNotMatch(csv,/"ต","ต เต่า","ต้นไม้","ต้นโพธิ์","5","7"/);
});

test('stat deltas and CSV share the same word across prefixed fish answers',()=>{
  const m=newMatch('room-testfish000000000000',now);
  applyAction(m,'create','host',now,'Host');
  applyAction(m,'join','guest',now,'Guest');
  applyAction(m,'start','host',now+1000);
  m.letter='ด';m.categories=['fish'];
  applyAction(m,'draft','host',now+2000,'',{fish:'ดุก'});
  applyAction(m,'draft','guest',now+2000,'',{fish:'ปลาดุก'});
  const before=structuredClone(m);
  for(const p of m.players)p.lastSeen=m.deadline;
  advance(m,m.deadline+1);
  const items=roundWordDeltas(before,m);
  assert.deepEqual(items.map(x=>[x.word,x.letter,x.timesUsed,x.totalPoints]),
    [['ดุก','ด',2,2]]);
  const csv=buildWordUsageCsv([
    {letter:'ป',category:'fish',word:'ปลาดุก',timesUsed:2,totalPoints:2,lastUsedAt:now-100},
    {letter:'ด',category:'fish',word:'ดุก',timesUsed:1,totalPoints:2,lastUsedAt:now}
  ]);
  // The dictionary may store bare ดุก before ปลาดุก. Either display spelling
  // represents ONE canonical fish; the totals and corrected initial must match.
  const lines=csv.split('\r\n').filter(line=>
    line.startsWith('"ด","ด เด็ก","ปลา",')&&
    (line.includes('"ดุก"')||line.includes('"ปลาดุก"'))&&
    line.includes(',"3","4",'));
  assert.equal(lines.length,1,'single canonical fish row with historical totals');
  assert.doesNotMatch(csv,/"ป","ป ปลา","ปลา","ปลาดุก","3","4"/);
});

test('vegetable prefixed answers share a single usage stat and historical CSV row',()=>{
  const m=newMatch('room-vegetable-prefix-001',now);
  applyAction(m,'create','host',now,'Host');
  applyAction(m,'join','guest',now,'Guest');
  applyAction(m,'start','host',now+1000);
  m.letter='บ';m.categories=['vegetable'];
  applyAction(m,'draft','host',now+2000,'',{vegetable:'บุ้ง'});
  applyAction(m,'draft','guest',now+2000,'',{vegetable:'ผักบุ้ง'});
  const before=structuredClone(m);
  for(const p of m.players)p.lastSeen=m.deadline;
  advance(m,m.deadline+1);
  const deltas=roundWordDeltas(before,m);
  assert.deepEqual(deltas.map(row=>[row.word,row.letter,row.timesUsed,row.totalPoints]),
    [['บุ้ง','บ',2,2]]);
  const csv=buildWordUsageCsv([
    {letter:'ผ',category:'vegetable',word:'ผักบุ้ง',timesUsed:3,totalPoints:4,lastUsedAt:now-100},
    {letter:'บ',category:'vegetable',word:'บุ้ง',timesUsed:2,totalPoints:2,lastUsedAt:now}
  ]);
  const lines=csv.split('\r\n').filter(line=>
    line.startsWith('"บ","บ ใบไม้","ผัก",')&&
    (line.includes('"ผักบุ้ง"')||line.includes('"บุ้ง"'))&&
    line.includes(',"5","6",'));
  assert.equal(lines.length,1,'one canonical vegetable row with the combined historic total');
  assert.doesNotMatch(csv,/"ผ","ผ ผึ้ง","ผัก","ผักบุ้ง","5","6"/);
});
