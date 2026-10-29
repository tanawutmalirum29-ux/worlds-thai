import test from 'node:test';
import assert from 'node:assert/strict';
import {getEntries,type Entry} from '../src/admin-data.ts';
import {mergeHistoricalStats,dashboardFilter,sumUsage,rankUsage,usageGroups,rankGroups,usageMatrix} from '../src/admin-dashboard.ts';
import type {WordStatRecord} from '../src/stats-export.ts';

const entries:Entry[]=[
  {word:'เสือ',category:'animal',label:'สัตว์',letter:'ส',draft:false,uses:5,points:10,lastUsedAt:5},
  {word:'ส้ม',category:'fruit',label:'ผลไม้',letter:'ส',draft:false,uses:2,points:4,lastUsedAt:4},
  {word:'เสือ',category:'person',label:'ชื่อคน',letter:'ส',draft:false,uses:1,points:2,lastUsedAt:3},
  {word:'มะม่วง',category:'fruit',label:'ผลไม้',letter:'ม',draft:false,uses:0,points:0,lastUsedAt:null},
  {word:'ม้า',category:'animal',label:'สัตว์',letter:'ม',draft:true,uses:0,points:0,lastUsedAt:null}
];
test('counts by word/category not just spelling and computes coverage',()=>{
  const sum=sumUsage(entries);
  assert.deepEqual([sum.entries,sum.usedEntries,sum.unusedEntries,sum.uses,sum.points,sum.coverage],[5,3,2,8,16,60]);
  const fruit=usageGroups(entries,'category').find(r=>r.category==='fruit');
  assert.deepEqual([fruit?.entries,fruit?.usedEntries,fruit?.uses,fruit?.points],[2,1,2,4]);
  assert.equal(usageGroups(entries,'letter').find(r=>r.letter==='ส')?.uses,8);
  assert.equal(usageGroups(entries,'pair').find(r=>r.category==='animal'&&r.letter==='ส')?.uses,5);
  assert.equal(dashboardFilter(entries,'fruit','ม').length,1);
});
test('ranks popularity and rare words by counts or cumulative points',()=>{
  assert.deepEqual(rankUsage(entries,'uses','most').slice(0,3).map(x=>x.word),['เสือ','ส้ม','เสือ']);
  assert.equal(rankUsage(entries,'uses','least')[0].uses,0);
  assert.equal(rankGroups(usageGroups(entries,'category'),'uses','most')[0].category,'animal');
  assert.equal(rankGroups(usageGroups(entries,'category'),'points','most')[0].category,'animal');
  assert.deepEqual(entries.map(x=>x.uses),[5,2,1,0,0]);
});
test('category by consonant matrix never invents missing cells',()=>{
  const matrix=usageMatrix(entries);
  assert.ok(matrix.categories.includes('fruit'));
  assert.ok(matrix.letters.includes('ส'));
  assert.equal(matrix.cells.get('fruit\u0000ส')?.uses,2);
  assert.equal(matrix.cells.get('fruit\u0000ม')?.uses,0);
  assert.equal(matrix.cells.get('person\u0000ม'),undefined);
});
test('retained historic words stay visible in analytics without changing live dictionary',()=>{
  const current=getEntries({});
  const raw:WordStatRecord[]=[
    {word:'คำเก่าที่ลบแล้ว',category:'verb',letter:'ค',timesUsed:7,totalPoints:11,lastUsedAt:100},
    {word:'พนมมือ',category:'verb',letter:'พ',timesUsed:4,totalPoints:8,lastUsedAt:10}
  ];
  const all=mergeHistoricalStats(current,raw);
  assert.equal(all.find(row=>row.category==='verb'&&row.word==='คำเก่าที่ลบแล้ว')?.archived,true);
  assert.equal(all.filter(row=>row.word==='พนมมือ'&&row.category==='verb').length,1);
  assert.equal(all.length,current.length+1);
});
test('no stats means no usage; zero-use words do not become fabricated winners',()=>{
  const sum=sumUsage(mergeHistoricalStats(getEntries({}),[]));
  assert.equal(sum.uses,0);
  assert.equal(sum.coverage,0);
  assert.equal(sumUsage([]).coverage,0);
});

test('admin and dashboard place named desserts under the consonant AFTER ขนม',()=>{
  const rows=getEntries({},[
    {letter:'ข',category:'dessert',word:'ขนมครก',timesUsed:2,totalPoints:4,lastUsedAt:100},
    {letter:'ค',category:'dessert',word:'ขนมครก',timesUsed:1,totalPoints:2,lastUsedAt:200}
  ]);
  const crock=rows.find(x=>x.word==='ขนมครก'&&x.category==='dessert');
  assert.equal(crock?.letter,'ค');
  assert.equal(crock?.uses,3);
  assert.equal(crock?.points,6);
  assert.equal(dashboardFilter(mergeHistoricalStats(rows,[]),'dessert','ข')
    .some(x=>x.word==='ขนมครก'),false);
  assert.equal(dashboardFilter(mergeHistoricalStats(rows,[]),'dessert','ค')
    .some(x=>x.word==='ขนมครก'),true);
});

test('dashboard joins historical ขนม-prefixed variants without double counting rows',()=>{
  const rows=getEntries({},[
    {letter:'ข',category:'dessert',word:'ไข่หงส์',timesUsed:2,totalPoints:4},
    {letter:'ข',category:'dessert',word:'ขนมไข่เหี้ย',timesUsed:1,totalPoints:1},
    {letter:'ข',category:'dessert',word:'ขนมไข่หงส์',timesUsed:3,totalPoints:5}
  ]);
  const sweet=rows.filter(row=>row.category==='dessert'&&row.word==='ไข่หงส์');
  assert.equal(sweet.length,1);
  assert.equal(sweet[0].uses,6);
  assert.equal(sweet[0].points,10);
  const all=mergeHistoricalStats(rows,[
    {letter:'ข',category:'dessert',word:'ขนมไข่เหี้ย',timesUsed:1,totalPoints:1}
  ]);
  assert.equal(all.filter(row=>row.category==='dessert'&&row.word==='ไข่หงส์').length,1);
  assert.ok(!all.some(row=>row.category==='dessert'&&row.archived&&row.word==='ขนมไข่เหี้ย'));
});

test('historical tree uses stay grouped under the real tree consonant in admin',()=>{
  const rows=getEntries({},[
    {letter:'ต',category:'tree',word:'ต้นโพธิ์',timesUsed:3,totalPoints:6,lastUsedAt:100},
    {letter:'พ',category:'tree',word:'โพธิ์',timesUsed:2,totalPoints:2,lastUsedAt:200}
  ]);
  const item=rows.find(row=>row.category==='tree'&&row.word==='ต้นโพธิ์');
  assert.equal(item?.letter,'พ');
  assert.equal(item?.uses,5);
  assert.equal(item?.points,8);
  const all=mergeHistoricalStats(rows,[]);
  assert.equal(dashboardFilter(all,'tree','พ').some(x=>x.word==='ต้นโพธิ์'),true);
  assert.equal(dashboardFilter(all,'tree','ต').some(x=>x.word==='ต้นโพธิ์'),false);
});

test('historic prefixed bird and fish counts regroup under the real consonant',()=>{
  for(const [category,bare,full,letter] of [
    ['bird','กระจอก','นกกระจอก','ก'],
    ['fish','ดุก','ปลาดุก','ด'],
    ['flower','บัว','ดอกบัว','บ'],
    ['insect','ปอ','แมลงปอ','ป']
  ]){
    const rows=getEntries({},[
      {category,letter:full[0],word:full,timesUsed:3,totalPoints:4,lastUsedAt:100},
      {category,letter,word:bare,timesUsed:2,totalPoints:2,lastUsedAt:200}
    ]);
    const match=rows.filter(row=>row.category===category&&
      (row.word===full||row.word===bare));
    assert.equal(match.length,1,category);
    assert.equal(match[0].letter,letter,category);
    assert.equal(match[0].uses,5,category);
    assert.equal(match[0].points,6,category);
    const joined=mergeHistoricalStats(rows,[]);
    assert.equal(dashboardFilter(joined,category,letter)
      .some(row=>row.word===match[0].word),true,category);
  }
});
