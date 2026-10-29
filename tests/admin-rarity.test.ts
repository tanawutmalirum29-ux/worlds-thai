import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rarityDay} from '../amplify/functions/game/rarity.ts';
import {resolveOperation} from '../amplify/functions/game/request.ts';
import type {Entry} from '../src/admin-data.ts';
import {buildRarityGroups,rarityGroupSummary,displayRarityState,
  type RarityMetaRecord} from '../src/admin-rarity-data.ts';

const now=Date.parse('2026-10-29T12:00:00.000Z');
const day=rarityDay(now);
const entry=(word:string,category='animal',letter='ส',draft=false,uses=0):Entry=>
  ({word,category,label:'สัตว์',letter,draft,uses,points:uses*2,lastUsedAt:null});
const seeded:RarityMetaRecord={
  category:'animal',letter:'ส',groupStartedAt:now-14*86400000,
  firstEligibleAt:{'สิงโต':now-13*86400000,'เสือ':now-13*86400000},
  snapshot:{day,eligible:true,observations:300,uniquePlayers:24,uniqueRooms:15,
    bonuses:{'สิงโต':2},candidates:{},recentWordUses:{'สิงโต':2,'เสือ':29},evaluatedAt:now}
};
test('groups keep the category+letter boundary and show true bonus and independent usage windows',()=>{
  const rows=[entry('เสือ','animal','ส',false,90),entry('สิงโต','animal','ส',false,8),
    entry('กระต่าย','animal','ก',false,1)];
  const groups=buildRarityGroups(rows,[seeded],now);
  const animal=groups.find(g=>g.category==='animal'&&g.letter==='ส')!;
  assert.equal(animal.state,'active');
  assert.equal(animal.totalWords,2);
  assert.equal(animal.rareWords,0);
  assert.equal(animal.veryRareWords,1);
  assert.equal(animal.lifetimeUses,98);
  assert.equal(animal.recentUses,31);
  assert.equal(animal.words.find(w=>w.word==='สิงโต')?.bonus,2);
  assert.equal(animal.words.find(w=>w.word==='สิงโต')?.recentUses,2);
  assert.equal(groups.find(g=>g.category==='animal'&&g.letter==='ก')?.state,'not-started');
});
test('zero rare words is a valid evaluated state, not the same as no evidence',()=>{
  const clean={...seeded,snapshot:{...seeded.snapshot!,bonuses:{}}};
  const groups=buildRarityGroups([entry('เสือ')],[clean],now);
  assert.equal(groups[0].state,'no-rare');
  assert.equal(groups[0].words[0].bonus,0);
  assert.equal(displayRarityState(groups[0].state),'ไม่มีคำหายาก');
  assert.equal(buildRarityGroups([entry('เสือ')],[],now)[0].state,'not-started');
});
test('not-ready, stale and unplayable groups never pose as live rarity',()=>{
  const rows=[entry('เสือ'),entry('สิงโต'),entry('ตัวอย่าง','animal','ฮ')];
  const notReady={...seeded,snapshot:{...seeded.snapshot!,eligible:false,bonuses:{}}};
  assert.equal(buildRarityGroups(rows,[notReady],now).find(g=>g.letter==='ส')?.state,'learning');
  const old={...seeded,snapshot:{...seeded.snapshot!,day:'2026-10-26'}};
  assert.equal(buildRarityGroups(rows,[old],now).find(g=>g.letter==='ส')?.state,'stale');
  assert.equal(buildRarityGroups(rows,[seeded],now).find(g=>g.letter==='ฮ')?.state,'not-playable');
});
test('drafts are excluded and missing recent usage remains unknown, never guessed as zero',()=>{
  const old={...seeded,snapshot:{
    ...seeded.snapshot!,recentWordUses:undefined,bonuses:{}
  }};
  const groups=buildRarityGroups([entry('เสือ'),entry('สีรุ้ง','animal','ส',true,0)],[old],now);
  assert.equal(groups[0].totalWords,1);
  assert.equal(groups[0].recentUses,null);
  assert.equal(groups[0].words[0].recentUses,null);
  assert.equal(groups[0].words.some(w=>w.word==='สีรุ้ง'),false);
});
test('overview counts true status groups, not total entries',()=>{
  const groups=buildRarityGroups([entry('สิงโต'),entry('เสือ'),entry('ต้นไม้','tree','ต')],[seeded],now);
  const totals=rarityGroupSummary(groups);
  assert.equal(totals.groups,2);
  assert.equal(totals.active,1);
  assert.equal(totals.veryRare,1);
});
test('server offers dedicated GROUP-authenticated endpoint without leaking observations',()=>{
  const schema=readFileSync(new URL('../amplify/data/resource.ts',import.meta.url),'utf8');
  const head=schema.slice(schema.indexOf('getAdminRarity:'),schema.indexOf('listRooms:'));
  assert.match(head,/allow\.groups\(\['RARITY_ADMINS'\]\)/);
  assert.ok(!head.includes('allow.guest('));
  const backend=readFileSync(new URL('../amplify/functions/game/handler.ts',import.meta.url),'utf8');
  assert.match(backend,/ADMIN_AUTH_REQUIRED/);
  assert.match(backend,/ProjectionExpression:'#id,#start,#born,#snapshot'/);
  assert.ok(!backend.includes("request==='rarity'"),'Never add private rarity data to guest stats query');
  assert.equal(resolveOperation({fieldName:'getAdminRarity'}),'getAdminRarity');
  const auth=readFileSync(new URL('../amplify/auth/resource.ts',import.meta.url),'utf8');
  assert.match(auth,/groups:\s*\['RARITY_ADMINS'\]/);
});
test('admin dashboard is connected to the original vocabulary workspace',()=>{
  const admin=readFileSync(new URL('../src/admin.tsx',import.meta.url),'utf8');
  assert.match(admin,/\<RarityDashboard entries=\{allEntries\}/);
  const api=readFileSync(new URL('../src/admin-rarity-api.ts',import.meta.url),'utf8');
  assert.match(api,/authMode:'userPool'/);
  assert.match(api,/RARITY_ADMINS/);
});
