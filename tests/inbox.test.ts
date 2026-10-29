import test from 'node:test';
import assert from 'node:assert/strict';
import {addInboxWords,removeInboxWord,normalizeInbox,exportPendingWords,INBOX_STORAGE_KEY} from '../src/admin-inbox.ts';
import {addDraft,mergedBank} from '../src/admin-data.ts';

test('paste uncategorized Thai words, preserve order, reject invalid/duplicates',()=>{
  const first=addInboxWords([], 'พลับพลึง\nขนมไข่, ปรบมือ; พลับพลึง');
  assert.deepEqual(first.words,['พลับพลึง','ขนมไข่','ปรบมือ']);
  assert.equal(first.added,3);
  assert.equal(first.ignored,1);
  const second=addInboxWords(first.words,'ขนมไข่\nhello\nฝรั่ง');
  assert.deepEqual(second.words,['พลับพลึง','ขนมไข่','ปรบมือ','ฝรั่ง']);
  assert.equal(second.added,1);
  assert.equal(second.ignored,2);
  assert.deepEqual(removeInboxWord(second.words,'ขนมไข่'),['พลับพลึง','ปรบมือ','ฝรั่ง']);
});
test('plain export contains only unique pending words, no category names/header',()=>{
  const staged=addDraft({},'ทดสอบคำใหม่','verb');
  const text=exportPendingWords(staged,['ขนมไข่','ทดสอบคำใหม่','พนมมือ']);
  assert.equal(text,'ทดสอบคำใหม่\nขนมไข่\nพนมมือ\n');
  assert.ok(!text.includes('verb'));
  assert.ok(!text.includes('คำกริยา'));
  assert.equal(exportPendingWords({},[]),'');
  assert.equal(INBOX_STORAGE_KEY,'kw-admin-uncategorized-words-v1');
});
test('uncategorized list cannot alter the live dictionary',()=>{
  const list=addInboxWords([],'คำรอทบทวน');
  const bank=mergedBank({});
  assert.ok(!bank.verb.includes(list.words[0]));
  assert.deepEqual(normalizeInbox({words:list.words}),[]);
});
