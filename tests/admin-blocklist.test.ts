import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCKED_ENTRIES,BLOCK_KIND_LABELS,filterBlockedEntries
} from '../src/admin-blocklist-data.ts';
import {
  DISALLOWED_EXACT,DISALLOWED_PHRASES,BLOCKED_NICKNAME_FRAGMENT,BLOCKED_STANDALONE_ANSWER,
  BLOCKED_VEE_ROMAN_RULES,DISALLOWED_THAI_EXACT_VARIANTS,DISALLOWED_THAI_PHRASE_VARIANTS,DISALLOWED_ROMAN_RULES,
  isInappropriateLanguage,isBlockedStandaloneAnswer,nicknameValidationMessage
} from '../amplify/functions/game/moderation.ts';

test('admin banned list is derived from every active gameplay rule',()=>{
  assert.equal(BLOCKED_ENTRIES.length,DISALLOWED_EXACT.size+DISALLOWED_PHRASES.length+
    DISALLOWED_THAI_EXACT_VARIANTS.length+DISALLOWED_THAI_PHRASE_VARIANTS.length+
    DISALLOWED_ROMAN_RULES.length+2+2*BLOCKED_VEE_ROMAN_RULES.length);
  assert.deepEqual(BLOCKED_ENTRIES.filter(entry=>entry.kind==='exact').map(entry=>entry.word),
    [...DISALLOWED_EXACT,...DISALLOWED_THAI_EXACT_VARIANTS,
      ...DISALLOWED_ROMAN_RULES.filter(rule=>rule.scope==='exact').map(rule=>rule.word)]);
  assert.deepEqual(BLOCKED_ENTRIES.filter(entry=>entry.kind==='contains').map(entry=>entry.word),
    [...DISALLOWED_PHRASES,...DISALLOWED_THAI_PHRASE_VARIANTS,
      ...DISALLOWED_ROMAN_RULES.filter(rule=>rule.scope==='contains').map(rule=>rule.word)]);
  assert.deepEqual(BLOCKED_ENTRIES.filter(entry=>entry.kind==='nickname').map(entry=>entry.word),
    [BLOCKED_NICKNAME_FRAGMENT,...BLOCKED_VEE_ROMAN_RULES.map(rule=>rule.word)]);
  assert.deepEqual(BLOCKED_ENTRIES.filter(entry=>entry.kind==='answer').map(entry=>entry.word),
    [BLOCKED_STANDALONE_ANSWER,...BLOCKED_VEE_ROMAN_RULES.map(rule=>rule.word)]);
  assert.equal(BLOCK_KIND_LABELS.nickname.includes('ชื่อผู้เล่น'),true);
});

test('listed entries agree with runtime moderation and keep special cases distinct',()=>{
  for(const row of BLOCKED_ENTRIES){
    if(row.kind==='exact'||row.kind==='contains')
      assert.equal(isInappropriateLanguage(row.word),true,row.kind+' / '+row.word);
    if(row.kind==='nickname')
      assert.equal(nicknameValidationMessage('ทดสอบ'+row.word+'ทดลอง'),'ใช้ชื่อนี้ไม่ได้');
    if(row.kind==='answer') {
      assert.equal(isBlockedStandaloneAnswer(row.word),true);
      assert.equal(isBlockedStandaloneAnswer(row.word+'ร์'),false);
    }
  }
  assert.equal(isInappropriateLanguage('หีบ'),false);
  assert.equal(isInappropriateLanguage('แกงกะหรี่'),false);
});

test('admin list search and type filtering preserve all groups and special rules',()=>{
  assert.deepEqual(filterBlockedEntries('ไม่ได้อยู่ในรายการ'),[]);
  assert.equal(filterBlockedEntries('', 'all').length,BLOCKED_ENTRIES.length);
  for(const kind of ['exact','contains','nickname','answer'] as const){
    const subset=filterBlockedEntries('',kind);
    assert.ok(subset.length>0,kind);
    assert.ok(subset.every(row=>row.kind===kind));
  }
  assert.deepEqual(filterBlockedEntries('วี','nickname'),[{word:'วี',kind:'nickname'}]);
  assert.deepEqual(filterBlockedEntries('วี','answer'),[{word:'วี',kind:'answer'}]);
  assert.deepEqual(filterBlockedEntries('  วี  ','all').map(row=>row.kind),['nickname','answer']);
  assert.equal(filterBlockedEntries('หี','exact').some(row=>row.word==='หี'),true);
  assert.ok(filterBlockedEntries('ไอ้เหี้ย','contains').length>=1);
});

test('roman V/wee admin entries include real live examples, not a separate hard-coded list',()=>{
  for(const rule of BLOCKED_VEE_ROMAN_RULES){
    const nickname=BLOCKED_ENTRIES.find(row=>row.kind==='nickname'&&row.word===rule.word);
    const answer=BLOCKED_ENTRIES.find(row=>row.kind==='answer'&&row.word===rule.word);
    assert.equal(nickname?.examples,rule.examples);
    assert.equal(answer?.examples,rule.examples);
    assert.equal(nicknameValidationMessage('คนชื่อ'+rule.word+'ทดสอบ'),'ใช้ชื่อนี้ไม่ได้');
    assert.equal(isBlockedStandaloneAnswer(rule.word),true);
  }
  assert.equal(filterBlockedEntries('v','nickname').length,1);
  assert.equal(filterBlockedEntries('we','answer').length,1);
});


test('new Roman blocklist rows show real active patterns and examples',()=>{
  for(const rule of DISALLOWED_ROMAN_RULES){
    const entry=BLOCKED_ENTRIES.find(row=>row.word===rule.word&&
      row.kind===(rule.scope==='exact'?'exact':'contains'));
    assert.ok(entry,rule.word);
    assert.equal(entry.examples,rule.examples);
    assert.equal(isInappropriateLanguage(rule.word),true,'rule must block its own listed word: '+rule.word);
  }
  for(const word of ['หีบ','สัดส่วน','ตีนเป็ด','class','shitake','Fukuyama'])
    assert.equal(isInappropriateLanguage(word),false,word);
});
