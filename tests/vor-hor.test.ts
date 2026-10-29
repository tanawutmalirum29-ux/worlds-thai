import test from 'node:test';
import assert from 'node:assert/strict';
import {VOR_HOR_TERMS} from '../amplify/functions/game/vor-hor-terms.ts';
import {WORD_BANK,MIN_WORDS_PER_PAIR,MIN_CATEGORIES_PER_LETTER} from '../amplify/functions/game/dictionary.ts';
import {CATEGORIES,LETTERS,eligibleCategories,wordInitialForCategory,canonicalAnswer,validAnswer,newMatch,applyAction,scoreRound} from '../amplify/functions/game/logic.ts';

test('only ว and ห are expanded with distinct real category-specific words',()=>{
  const counts={ว:0,ห:0};
  for(const [category,words] of Object.entries(VOR_HOR_TERMS)){
    assert.ok(CATEGORIES.some(([id])=>id===category),category);
    assert.equal(words.length,new Set(words).size,'repeated word in '+category);
    for(const word of words){
      const initial=wordInitialForCategory(word,category);
      assert.ok(initial==='ว'||initial==='ห',word+' has wrong initial '+initial);
      counts[initial as keyof typeof counts]++;
      assert.ok(WORD_BANK[category].includes(word),word+' not registered in '+category);
      assert.ok(word.length<=48,word+' too long');
      assert.equal(validAnswer(word,initial,category),true,word+' not playable');
    }
  }
  assert.deepEqual(counts,{ว:79,ห:96});
  for(const category of ['animal','sport','job','verb','vegetable','food','plant','flower','tree','object','place','dessert','nature']){
    assert.equal(new Set(WORD_BANK[category]).size,WORD_BANK[category].length,'duplicates in '+category);
  }
});

test('ว and ห pass the five-category/two-answer fairness threshold',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  for(const letter of ['ว','ห']){
    assert.ok(LETTERS.includes(letter as never),letter+' should be in random pool');
    const categories=eligibleCategories(letter);
    assert.ok(categories.length>=5,letter+' must offer 5 categories');
    for(const category of categories){
      const uniques=new Set(WORD_BANK[category]
        .filter(word=>wordInitialForCategory(word,category)===letter)
        .map(word=>canonicalAnswer(word,category)));
      assert.ok(uniques.size>=2,letter+'/'+category+' has '+uniques.size+' answers');
    }
  }
});

test('new letters obey category, first-consonant and no-invented-word rules',()=>{
  assert.equal(validAnswer('วาฬ','ว','animal'),true);
  assert.equal(validAnswer('วาฬ','ว','fish'),false,'whales are mammals');
  assert.equal(validAnswer('ว่ายน้ำ','ว','sport'),true);
  assert.equal(validAnswer('วิ่ง','ว','verb'),true);
  assert.equal(validAnswer('หวี','ห','object'),true);
  assert.equal(validAnswer('เห็ดฟาง','ห','vegetable'),true);
  assert.equal(validAnswer('แหวน','ห','object'),true);
  assert.equal(validAnswer('หิมะ','ห','nature'),true);
  assert.equal(validAnswer('วาฬ','ห','animal'),false);
  assert.equal(validAnswer('วาน่าจะมี','ว','animal'),false);
  assert.equal(validAnswer('หมีบินได้','ห','animal'),false);
  assert.equal(validAnswer('สัตว์','ส','animal'),false);
  assert.equal(validAnswer('ธรรมชาติ','ธ','nature'),false);
});

test('different distinct answers get 2 points; duplicate answers get 1 for new letters',()=>{
  const time=1_700_000_000_000;
  const match=newMatch('room-vor-hor-1234567890',time);
  applyAction(match,'create','host',time,'Host');
  applyAction(match,'join','guest',time,'Guest');
  match.phase='playing';match.letter='ว';match.categories=['animal'];
  match.submissions={host:{animal:'วัว'},guest:{animal:'วาฬ'}};
  assert.deepEqual(scoreRound(match).map(x=>x.perCategory.animal),[2,2]);
  match.submissions.guest.animal='วัว';
  assert.deepEqual(scoreRound(match).map(x=>x.perCategory.animal),[1,1]);
  match.letter='ห';match.categories=['object'];
  match.submissions={host:{object:'หวี'},guest:{object:'แหวน'}};
  assert.deepEqual(scoreRound(match).map(x=>x.perCategory.object),[2,2]);
});
