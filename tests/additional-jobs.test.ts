import test from 'node:test';
import assert from 'node:assert/strict';
import {ADDITIONAL_JOB_GROUPS,ADDITIONAL_JOBS,JOB_CANONICAL_ALIASES}
  from '../amplify/functions/game/additional-jobs.ts';
import {WORD_BANK} from '../amplify/functions/game/dictionary.ts';
import {canonicalAnswer,eligibleCategories,validAnswer,wordInitialForCategory,
  newMatch,applyAction,scoreRound} from '../amplify/functions/game/logic.ts';

test('curated occupations are substantial, deduplicated and available to the live game',()=>{
  assert.ok(ADDITIONAL_JOBS.length >= 300,'expected diverse occupations');
  assert.equal(new Set(ADDITIONAL_JOBS).size,ADDITIONAL_JOBS.length,
    'no literal duplicate entries in curated job additions');
  assert.equal(new Set(WORD_BANK.job).size,WORD_BANK.job.length,
    'no literal duplicate entries in the live job bank');
  let accepted=0;
  for(const [group,words] of Object.entries(ADDITIONAL_JOB_GROUPS)){
    assert.ok(words.length >= 30,'too few curated '+group+' occupations');
    for(const word of words){
      assert.equal(word,word.trim().normalize('NFC'),word+' must be NFC and trimmed');
      assert.ok(WORD_BANK.job.includes(word),'missing job: '+word);
      const initial=wordInitialForCategory(word,'job');
      assert.match(initial,/^[ก-ฮ]$/,'invalid initial: '+word);
      if(eligibleCategories(initial).includes('job')){
        assert.equal(validAnswer(word,initial,'job'),true,'not playable: '+word);
        accepted++;
      }
    }
  }
  assert.ok(accepted >= 250,'too few jobs available through playable initials');
  assert.ok(new Set(ADDITIONAL_JOBS.map(w=>wordInitialForCategory(w,'job'))).size>=18,
    'occupation expansion must diversify initial consonants');
  assert.ok(ADDITIONAL_JOBS.filter(w=>w.startsWith('นัก')).length <
    ADDITIONAL_JOBS.filter(w=>!w.startsWith('นัก')).length,
    'avoid overloading น through นัก');
});

test('job shorthand is an explicitly approved alternative, not a blanket prefix rule',()=>{
  for(const [short,full,shortInitial,fullInitial] of [
    ['ออกแบบ','นักออกแบบ','อ','น'],
    ['ออกแบบกราฟิก','นักออกแบบกราฟิก','อ','น'],
    ['ออกแบบภายใน','นักออกแบบภายใน','อ','น'],
    ['ออกแบบแฟชั่น','นักออกแบบเสื้อผ้า','อ','น'],
    ['ออกแบบเว็บไซต์','นักออกแบบเว็บไซต์','อ','น'],
    ['ออกแบบเกม','นักออกแบบเกม','อ','น'],
    ['เขียนบท','นักเขียนบท','ข','น'],
    ['เขียนโปรแกรม','นักเขียนโปรแกรม','ข','น'],
    ['วาดภาพ','นักวาดภาพ','ว','น'],
    ['ถ่ายภาพ','นักถ่ายภาพ','ถ','น'],
    ['ถ่ายรูป','นักถ่ายภาพ','ถ','น'],
    ['แปลภาษา','นักแปล','ป','น']
  ] as const){
    assert.equal(wordInitialForCategory(short,'job'),shortInitial,short);
    assert.equal(wordInitialForCategory(full,'job'),fullInitial,full);
    assert.equal(canonicalAnswer(short,'job'),canonicalAnswer(full,'job'),
      'these are the same occupation: '+short+' and '+full);
    assert.equal(validAnswer(short,shortInitial,'job'),true,'short rejected: '+short);
    assert.equal(validAnswer(full,fullInitial,'job'),true,'full rejected: '+full);
  }
  for(const [alias,target] of Object.entries(JOB_CANONICAL_ALIASES)){
    assert.ok(WORD_BANK.job.includes(target),'unregistered canonical job: '+target);
    assert.equal(canonicalAnswer(alias,'job'),target,alias+' wrong identity');
  }
  for(const verb of ['บิน','ร้อง','วิจัย','บัญชี','จัดการ','ขับ','สอน','ทำ']){
    assert.equal(validAnswer(verb,wordInitialForCategory(verb,'job'),'job'),false,
      'standalone generic activity is not an occupation: '+verb);
  }
  assert.equal(validAnswer('ออกแบบ','อ','food'),false,
    'short jobs must not automatically bleed into unrelated categories');
});

test('two approved short descriptions of the same occupation score as duplicates',()=>{
  const start=1_700_000_000_000;
  const match=newMatch('room-aabbccddeeff00112233',start);
  applyAction(match,'create','host',start,'Host');
  applyAction(match,'join','guest',start,'Guest');
  match.phase='playing';
  match.letter='อ';
  match.categories=['job'];
  match.submissions={
    host:{job:'ออกแบบเสื้อผ้า'},
    guest:{job:'ออกแบบแฟชั่น'}
  };
  assert.deepEqual(scoreRound(match).map(entry=>entry.perCategory.job),[1,1]);
  match.letter='ถ';
  match.submissions={host:{job:'ถ่ายภาพ'},guest:{job:'ถ่ายรูป'}};
  assert.deepEqual(scoreRound(match).map(entry=>entry.perCategory.job),[1,1]);
});
