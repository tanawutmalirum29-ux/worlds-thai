import test from 'node:test';
import assert from 'node:assert/strict';
import { ADDITIONAL_FRUITS, ADDITIONAL_FRUIT_GROUPS } from '../amplify/functions/game/additional-fruits.ts';
import { WORD_BANK, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, LETTERS, canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';
import { wordsForGroup } from '../amplify/functions/game/rarity.ts';

test('fruit additions are unique, valid, safe and present in the game fruit index',()=>{
 assert.ok(CATEGORIES.some(([id])=>id==='fruit'));
 assert.ok(ADDITIONAL_FRUITS.length>=150);
 assert.ok(Object.keys(ADDITIONAL_FRUIT_GROUPS).length>=6);
 assert.equal(new Set(ADDITIONAL_FRUITS).size,ADDITIONAL_FRUITS.length,'duplicated newly approved fruit');
 assert.equal(new Set(WORD_BANK.fruit).size,WORD_BANK.fruit.length,'duplicated live fruit entry');
 for(const word of ADDITIONAL_FRUITS){
  assert.equal(word,word.trim().normalize('NFC'),'fruit spelling not normalized: '+word);
  assert.ok(word.length>=2&&word.length<=48,'length: '+word);
  assert.equal(isInappropriateLanguage(word),false,'blocked fruit: '+word);
  assert.ok(WORD_BANK.fruit.includes(word),'not registered: '+word);
  const letter=wordInitialForCategory(word,'fruit');
  assert.match(letter,/^[ก-ฮ]$/,'invalid first letter: '+word);
  if(eligibleCategories(letter).includes('fruit'))
   assert.equal(validAnswer(word,letter,'fruit'),true,'unplayable fruit: '+word);
 }
});

test('native fruit and cultivars use their own initials only; no fabricated varieties',()=>{
 for(const [word,letter] of [
  ['เสาวรส','ส'],['เมลอน','ม'],['มะดัน','ม'],['มะขวิด','ม'],
  ['กล้วยนาก','ก'],['ทุเรียนพวงมณี','ท'],['มะม่วงฟ้าลั่น','ม'],
  ['สับปะรดภูแล','ส'],['องุ่นไชน์มัสแคต','อ'],
  ['แอปเปิลฟูจิ','อ'],['แครนเบอร์รี','ค'],
  ['ลูกไหน','ล'],['เงาะโรงเรียน','ง'],['คามูคามู','ค']
 ] as const){
  assert.equal(wordInitialForCategory(word,'fruit'),letter,word);
  if(eligibleCategories(letter).includes('fruit')) assert.equal(validAnswer(word,letter,'fruit'),true,word);
  assert.equal(canonicalAnswer(word,'fruit'),word.toLocaleLowerCase('th'));
 }
 assert.equal(validAnswer('เสาวรส','ม','fruit'),false,'not the same first consonant');
 assert.equal(validAnswer('มะดัน','ม','sport'),false,'not another category');
 assert.equal(validAnswer('กล้วยสีรุ้งมายา','ก','fruit'),false,'fictional fruit cultivar');
 assert.equal(validAnswer('ส้มดาวอังคาร','ส','fruit'),false,'invented fruit');
});

test('more fruit words preserve fair playable letter pools and rarity uniqueness',()=>{
 assert.equal(MIN_WORDS_PER_PAIR,2);
 assert.equal(MIN_CATEGORIES_PER_LETTER,5);
 for(const letter of LETTERS){
  const cats=eligibleCategories(letter);
  assert.ok(cats.length>=5,letter);
  for(const category of cats){
   const valid=new Set((WORD_BANK[category]||[])
    .filter(w=>wordInitialForCategory(w,category)===letter)
    .map(w=>canonicalAnswer(w,category)));
   assert.ok(valid.size>=2,letter+'/'+category);
   if(category==='fruit')
    assert.deepEqual(wordsForGroup(letter,category),[...valid].sort());
  }
 }
});
