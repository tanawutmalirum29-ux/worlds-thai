import test from 'node:test';
import assert from 'node:assert/strict';
import { SPORT_AND_FOLK_GROUPS, SPORT_AND_FOLK_TERMS } from '../amplify/functions/game/sport-and-folk-terms.ts';
import { WORD_BANK, MIN_CATEGORIES_PER_LETTER, MIN_WORDS_PER_PAIR } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, LETTERS, canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';
import { wordsForGroup } from '../amplify/functions/game/rarity.ts';

test('international, Thai and folk sport names are reviewed and deduplicated in the live dictionary',()=>{
  assert.equal(CATEGORIES.some(([id])=>id==='sport'),true);
  assert.ok(Object.keys(SPORT_AND_FOLK_GROUPS).length>=7);
  assert.ok(SPORT_AND_FOLK_TERMS.length>=170);
  assert.equal(new Set(SPORT_AND_FOLK_TERMS).size, SPORT_AND_FOLK_TERMS.length);
  assert.equal(new Set(WORD_BANK.sport).size, WORD_BANK.sport.length);
  for(const [group,words] of Object.entries(SPORT_AND_FOLK_GROUPS)){
    assert.ok(words.length>=10,'too few reviewed terms for '+group);
    for(const word of words){
      assert.equal(word,word.normalize('NFC').trim(),'invalid name '+word);
      assert.ok(word.length>=2&&word.length<=48,'unplayable length '+word);
      assert.equal(isInappropriateLanguage(word),false,'moderation blocked '+word);
      assert.ok(WORD_BANK.sport.includes(word),'missing from real sport index '+word);
      const initial=wordInitialForCategory(word,'sport');
      assert.match(initial,/^[ก-ฮ]$/,'invalid first consonant '+word);
      if(eligibleCategories(initial).includes('sport'))
        assert.equal(validAnswer(word,initial,'sport'),true,'not accepted in live game '+word);
    }
  }
});

test('common real sports and folk games score under their own Thai initial only',()=>{
  for(const [word,letter] of [
    ['มอญซ่อนผ้า','ม'],['รีรีข้าวสาร','ร'],['งูกินหาง','ง'],
    ['วิ่งกระสอบ','ว'],['ลิงชิงหลัก','ล'],['โพงพาง','พ'],
    ['หมากเก็บ','ห'],['กระบี่กระบอง','ก'],['ว่ายน้ำผีเสื้อ','ว'],
    ['วอลเลย์บอลนั่ง','ว'],['ซูโม่','ซ'],['เคิร์ลลิง','ค'],
    ['เต้นยาง','ต']
  ] as const){
    assert.equal(wordInitialForCategory(word,'sport'),letter,'wrong consonant '+word);
    if(eligibleCategories(letter).includes('sport'))
      assert.equal(validAnswer(word,letter,'sport'),true,'missing word '+word);
  }
  assert.equal(validAnswer('มอญซ่อนผ้า','ร','sport'),false);
  assert.equal(validAnswer('รีรีข้าวสาร','ร','food'),false);
  assert.equal(validAnswer('งูกินหาง','ง','animal'),false);
  assert.equal(validAnswer('กีฬามอญซ่อนผ้า','ก','sport'),false);
  assert.equal(validAnswer('กีฬาเล่นที่ไม่มีจริง','ก','sport'),false);
});

test('additional sports preserve playable letter fairness and rarity uniqueness',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  for(const letter of LETTERS){
    const categories=eligibleCategories(letter);
    assert.ok(categories.length>=5,letter);
    for(const category of categories){
      const words=new Set(WORD_BANK[category]
        .filter(word=>wordInitialForCategory(word,category)===letter)
        .map(word=>canonicalAnswer(word,category)));
      assert.ok(words.size>=2,letter+'/'+category);
      if(category==='sport')
        assert.deepEqual(wordsForGroup(letter,category),[...words].sort());
    }
  }
});
