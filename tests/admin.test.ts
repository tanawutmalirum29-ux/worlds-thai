import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORD_BANK} from '../amplify/functions/game/dictionary.ts';
import {EXPORT_PROMPT_CODE,buildWordUsageCsv} from '../src/stats-export.ts';
import {
  addDraft,dropDraft,normalizeDrafts,mergedBank,getEntries,filterEntries,exactEntries,
  exportDictionary,LETTER_OPTIONS,CATEGORY_OPTIONS
} from '../src/admin-data.ts';

test('all combinations of category, letter, and global search are supported',()=>{
  const rows=getEntries({});
  assert.ok(rows.length>1900);
  assert.ok(exactEntries(rows,'พนมมือ').some(r=>r.category==='verb'&&r.letter==='พ'));
  assert.ok(exactEntries(rows,'อุรุกวัย').some(r=>r.category==='country'));
  assert.ok(filterEntries(rows,'','fruit','พ').some(r=>r.word==='พลับ'));
  assert.deepEqual(filterEntries(rows,'พนมมือ','fruit','พ'),[]);
  assert.ok(LETTER_OPTIONS.some(l=>l.id==='ข'&&l.label==='ข ไข่'));
  assert.ok(CATEGORY_OPTIONS.some(c=>c.id==='verb'));
});
test('drafts are local immutable additions; duplicates and invalid words rejected',()=>{
  const originalSize=WORD_BANK.verb.length;
  const state=addDraft({},'ทดสอบคำใหม่','verb');
  assert.deepEqual(state,{verb:['ทดสอบคำใหม่']});
  assert.ok(mergedBank(state).verb.includes('ทดสอบคำใหม่'));
  assert.equal(WORD_BANK.verb.length,originalSize);
  assert.throws(()=>addDraft(state,'ทดสอบคำใหม่','verb'),/มีคำนี้/);
  assert.throws(()=>addDraft({},'พนมมือ','verb'),/มีคำนี้/);
  assert.throws(()=>addDraft({},'hello','verb'),/ภาษาไทย/);
  assert.throws(()=>addDraft({},'คำใหม่','unknown'),/เลือกหมวด/);
  const removed=dropDraft(state,'ทดสอบคำใหม่','verb');
  assert.deepEqual(removed,{});
});
test('local storage restoration ignores invalid and duplicate data',()=>{
  assert.deepEqual(normalizeDrafts('broken'),{});
  const restored=normalizeDrafts({verb:['ทดสอบคำใหม่','ทดสอบคำใหม่','พนมมือ','','123'],fake:['มะม่วง']});
  assert.deepEqual(restored,{verb:['ทดสอบคำใหม่']});
});
test('full dictionary export includes original words and staged words with compatible TS constants',()=>{
  const source=exportDictionary(addDraft({},'ทดสอบคำใหม่','verb'));
  assert.ok(source.includes('export const WORD_BANK: Record<string, readonly string[]>'));
  assert.ok(source.includes('"อุรุกวัย"'));
  assert.ok(source.includes('"ทดสอบคำใหม่"'));
  assert.ok(source.includes('export const EXCLUDED_LETTERS = new Set('));
  assert.ok(source.includes('export const MIN_WORDS_PER_PAIR = 5;'));
  assert.ok(source.includes('export const MIN_CATEGORIES_PER_LETTER = 8;'));
  assert.ok(source.length>25000);
});
test('admin-only download and no player page references',()=>{
  const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const admin=readFileSync(new URL('../src/admin.tsx',import.meta.url),'utf8');
  const config=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
  assert.doesNotMatch(ui,/downloadStatistics|EXPORT_PROMPT_CODE|buildWordUsageCsv|stats-button/);
  assert.match(admin,/exportDictionary/);
  assert.match(admin,/getWordStats/);
  assert.match(admin,/buildWordUsageCsv/);
  assert.match(admin,/STORAGE_KEY/);
  assert.match(config,/khw-admin-[a-f0-9]{56}\.html/);
  assert.equal(EXPORT_PROMPT_CODE,'251029');
});
test('word stats CSV download includes pending draft words as zero-use',()=>{
  const newBank=mergedBank(addDraft({},'ทดสอบคำใหม่','verb'));
  const csv=buildWordUsageCsv([],newBank);
  assert.match(csv,/"ท","ท ทหาร","คำกริยา","ทดสอบคำใหม่","0","0"/);
});

test('popularity dashboard is part of the protected admin page only',()=>{
  const admin=readFileSync(new URL('../src/admin.tsx',import.meta.url),'utf8');
  const player=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const dashboard=readFileSync(new URL('../src/admin-dashboard-view.tsx',import.meta.url),'utf8');
  assert.match(admin,/PopularityDashboard rows=\{allEntries\} stats=\{stats\}/);
  assert.match(admin,/admin-vocabulary-search/);
  assert.doesNotMatch(player,/PopularityDashboard|admin-dashboard-view/);
  for(const section of ['คำยอดนิยม','แยกตามหมวด','แยกตามอักษร','หมวด × อักษร','ยังไม่เคยใช้'])
    assert.ok(dashboard.includes(section),section);
  assert.match(dashboard,/status!=='ready'/);
  assert.match(dashboard,/usageMatrix\(filtered\)/);
});

test('uncategorized word export is only on admin page',()=>{
  const source=readFileSync(new URL('../src/admin.tsx',import.meta.url),'utf8');
  const player=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const dashboard=readFileSync(new URL('../src/admin-dashboard.css',import.meta.url),'utf8');
  assert.match(source,/INBOX_STORAGE_KEY/);
  assert.match(source,/addInboxWords\(inbox,inboxText\)/);
  assert.match(source,/exportPendingWords\(drafts,inbox\)/);
  assert.match(source,/ดาวน์โหลดคำใหม่ \.txt/);
  assert.doesNotMatch(player,/INBOX_STORAGE_KEY|downloadPendingTxt/);
  assert.match(dashboard,/\.pop-word-scroll\{overflow-y:auto;overflow-x:hidden/);
  assert.match(dashboard,/\.pop-words-table\{width:100%;min-width:0/);
  const view=readFileSync(new URL('../src/admin-dashboard-view.tsx',import.meta.url),'utf8');
  assert.match(view,/className="pop-word-link"/);
});

test('admin draft validation prevents redundant dessert variants',()=>{
  assert.throws(()=>addDraft({},'ขนมไข่หงส์','dessert'),/มีคำนี้/);
  assert.throws(()=>addDraft({},'ไข่เหี้ย','dessert'),/มีคำนี้/);
  assert.throws(()=>addDraft({},'ขนมข้าวตู','dessert'),/มีคำนี้/);
});
