import test from 'node:test';
import assert from 'node:assert/strict';
import {EXTERNAL_BODY_TERMS} from '../amplify/functions/game/external-body-terms.ts';
import {WORD_BANK, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER} from '../amplify/functions/game/dictionary.ts';
import {LETTERS, eligibleCategories, canonicalAnswer, validAnswer, wordInitialForCategory} from '../amplify/functions/game/logic.ts';
import {wordsForGroup} from '../amplify/functions/game/rarity.ts';
import {isInappropriateLanguage} from '../amplify/functions/game/moderation.ts';

test('familiar external body terms are normalized, distinct and included exactly once',()=>{
  assert.ok(EXTERNAL_BODY_TERMS.length>=75);
  assert.equal(new Set(EXTERNAL_BODY_TERMS).size,EXTERNAL_BODY_TERMS.length);
  assert.equal(new Set(WORD_BANK.body).size,WORD_BANK.body.length,'body bank must be deduplicated');
  assert.ok(WORD_BANK.body.length>=220,'body category needs broad everyday coverage');
  for(const word of EXTERNAL_BODY_TERMS){
    assert.equal(word,word.normalize('NFC').trim(),word+' is not normalized');
    assert.ok(word.length>1 && word.length<=48,word+' exceeds game input constraints');
    assert.equal(isInappropriateLanguage(word),false,word+' is blocked by moderation');
    assert.equal(WORD_BANK.body.filter(item=>item===word).length,1,word+' is not unique in live bank');
    const letter=wordInitialForCategory(word,'body');
    assert.match(letter,/^[ก-ฮ]$/,'unexpected initial '+word);
    if(eligibleCategories(letter).includes('body'))
      assert.equal(validAnswer(word,letter,'body'),true,word+' should be accepted');
  }
});

test('common external parts are playable using their actual first consonant',()=>{
  const examples: ReadonlyArray<readonly [string,string]>=[
    ['ก้น','ก'],['กระหม่อม','ก'],['ขน','ข'],['ข้อนิ้ว','ข'],['เข่า','ข'],
    ['ดั้งจมูก','ด'],['ติ่งหู','ต'],['ตาดำ','ต'],['ต้นแขน','ต'],
    ['ท้ายทอย','ท'],['ใบหู','บ'],['หน้าแข้ง','ห'],['หน้าอก','ห'],
    ['หน้าท้อง','ห'],['หลัง','ห'],['หลังมือ','ห'],['หลังเท้า','ห'],
    ['หนวด','ห'],['หัวนม','ห'],['ปีกจมูก','ป'],['ปลายจมูก','ป'],
    ['รูม่านตา','ร'],['โหนกแก้ม','ห'],['โหนกคิ้ว','ห'],
    ['แผ่นหลัง','ผ'],['เครา','ค'],['ไหปลาร้า','ห'],['เต้านม','ต']
  ];
  for(const [word,letter] of examples){
    assert.ok(LETTERS.includes(letter as typeof LETTERS[number]),'unplayable letter '+letter);
    assert.equal(validAnswer(word,letter,'body'),true,word+' should be accepted');
  }
  assert.equal(validAnswer('ใบหู','ห','body'),false,'do not use a later consonant');
  assert.equal(validAnswer('หลัง','ห','food'),false,'keep categories separate');
  assert.equal(validAnswer('ตูด','ต','body'),false,'vulgar slang must not be accepted');
});

test('body additions do not duplicate rarity pool words or change the fairness threshold',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  for(const letter of LETTERS){
    const eligible=eligibleCategories(letter);
    assert.ok(eligible.length>=MIN_CATEGORIES_PER_LETTER);
    if(!eligible.includes('body'))continue;
    const words=wordsForGroup(letter,'body');
    assert.equal(new Set(words).size,words.length,letter+' rarity pool contains duplicates');
    assert.ok(words.length>=MIN_WORDS_PER_PAIR);
    assert.equal(words.length,new Set(WORD_BANK.body
      .filter(word=>wordInitialForCategory(word,'body')===letter)
      .map(word=>canonicalAnswer(word,'body'))).size);
  }
  assert.equal(wordsForGroup('ห','body').filter(word=>word==='หลัง').length,1);
});
