import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMON_THAI_TERMS} from '../amplify/functions/game/common-thai-terms.ts';
import {WORD_BANK,MIN_WORDS_PER_PAIR,MIN_CATEGORIES_PER_LETTER} from '../amplify/functions/game/dictionary.ts';
import {CATEGORIES,LETTERS,eligibleCategories,wordInitialForCategory,validAnswer,newMatch,applyAction,scoreRound} from '../amplify/functions/game/logic.ts';

test('every reviewed everyday word is registered in its specific category without duplicates',()=>{
  const categories=new Set(CATEGORIES.map(([id])=>id));
  let count=0;
  for(const [category,words] of Object.entries(COMMON_THAI_TERMS)){
    assert.ok(categories.has(category),category+' not a supported category');
    assert.equal(words.length,new Set(words).size,'duplicates among additions: '+category);
    assert.equal(new Set(WORD_BANK[category]).size,WORD_BANK[category].length,'duplicate in live '+category);
    count+=words.length;
    for(const word of words){
      assert.ok(WORD_BANK[category].includes(word),category+': '+word+' not in live bank');
      assert.equal(word,word.trim().normalize('NFC'),'untrimmed or unnormalized '+word);
      const initial=wordInitialForCategory(word,category);
      assert.match(initial,/^[ก-ฮ]$/,'invalid initial for '+word);
      if(eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word,initial,category),true,category+': '+word+' rejected');
    }
  }
  assert.ok(count>=220,'expected substantial reviewed everyday vocabulary');
});

test('reported familiar words have correct spellings and actual playable categories',()=>{
  assert.equal(validAnswer('แขน','ข','body'),true);
  assert.equal(validAnswer('กานา','ก','country'),true,'existing country must stay accepted');
  assert.equal(validAnswer('นา','น','place'),true);
  for(const word of ['ถั่วแระ','ถั่วปากอ้า','ถั่วเหลือง','ถั่วแระญี่ปุ่น'])
    assert.equal(validAnswer(word,'ถ','vegetable'),true,word);
  for(const word of ['ถั่วอบ','ถั่วต้ม','ถั่วทอด'])
    assert.equal(validAnswer(word,'ถ','food'),true,word);
  for(const category of ['vegetable','plant','tree'])
    assert.equal(validAnswer('กระถิน','ก',category),true,category);
  assert.equal(validAnswer('ถั่วตัด','ถ','dessert'),true);
  assert.equal(validAnswer('ถาด','ถ','object'),true);
  assert.equal(validAnswer('ถุงน่อง','ถ','clothing'),true);
  assert.equal(validAnswer('ถนน','ถ','place'),true);
});

test('ถ rounds respect the original eight-category minimum and five-distinct-answer rule',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,5);
  assert.equal(MIN_CATEGORIES_PER_LETTER,8);
  assert.ok(LETTERS.includes('ถ' as never),'ถ needs to be randomly selectable');
  const eligible=eligibleCategories('ถ');
  assert.ok(eligible.length>=8);
  for(const category of eligible){
    const distinct=new Set(WORD_BANK[category]
      .filter(word=>wordInitialForCategory(word,category)==='ถ'));
    assert.ok(distinct.size>=5,category+' has fewer than five ถ answers');
  }
});

test('category boundaries reject misspellings and unrelated food/body words',()=>{
  assert.equal(validAnswer('แขน','ข','food'),false);
  assert.equal(validAnswer('ถั่วอบ','ถ','vegetable'),false);
  assert.equal(validAnswer('ถั่วปากอ้า','ป','vegetable'),false);
  assert.equal(validAnswer('ปากอ้า','ป','vegetable'),false,'full plant name is required');
  assert.equal(validAnswer('ถั่วแรก','ถ','vegetable'),false,'do not accept the misspelling');
  assert.equal(validAnswer('กระถิ่น','ก','plant'),false,'do not accept the misspelling');
  assert.equal(validAnswer('ถั่วมั่วซั่ว','ถ','food'),false);
});

test('new familiar terms score independently and duplicates remain one point each',()=>{
  const start=1_700_000_000_000;
  const match=newMatch('room-aabbccddeeff00112233',start);
  applyAction(match,'create','host',start,'Host');
  applyAction(match,'join','guest',start,'Guest');
  match.phase='playing';
  match.letter='ถ';
  match.categories=['vegetable','food'];
  match.submissions={
    host:{vegetable:'ถั่วแระ',food:'ถั่วอบ'},
    guest:{vegetable:'ถั่วปากอ้า',food:'ถั่วต้ม'}
  };
  assert.deepEqual(scoreRound(match).map(entry=>entry.points),[4,4]);
  match.submissions.guest={vegetable:'ถั่วแระ',food:'ถั่วอบ'};
  assert.deepEqual(scoreRound(match).map(entry=>entry.points),[2,2]);
});
