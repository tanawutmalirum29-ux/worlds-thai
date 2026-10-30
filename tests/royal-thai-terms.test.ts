import test from 'node:test';
import assert from 'node:assert/strict';
import { ROYAL_WORD_GLOSSARY, ROYAL_THAI_TERMS } from '../amplify/functions/game/royal-thai-terms.ts';
import { WORD_BANK, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, LETTERS, eligibleCategories, wordInitialForCategory, canonicalAnswer, validAnswer } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';
import { wordsForGroup } from '../amplify/functions/game/rarity.ts';

test('royal vocabulary includes reviewed words with explicit meanings and no duplicates',()=>{
  const supported=new Set<string>(CATEGORIES.map(([id])=>id));
  let total=0;
  for(const [category,pairs] of Object.entries(ROYAL_WORD_GLOSSARY)){
    assert.ok(supported.has(category),'unknown royal category '+category);
    const words=pairs.map(([word])=>word);
    assert.deepEqual(words,ROYAL_THAI_TERMS[category],'glossary/vocabulary mismatch '+category);
    assert.equal(new Set(words).size,words.length,'duplicated royal spelling '+category);
    assert.equal(new Set(WORD_BANK[category]).size,WORD_BANK[category].length,
      'live bank must not duplicate a word '+category);
    for(const [word,meaning] of pairs){
      total++;
      assert.ok(meaning.length>0,'missing meaning '+word);
      assert.equal(word,word.normalize('NFC').trim(),'non-normalized royal word '+word);
      assert.ok(word.length>=2&&word.length<=48,'invalid answer size '+word);
      assert.equal(isInappropriateLanguage(word),false,'moderation blocked a curated term '+word);
      assert.ok(WORD_BANK[category].includes(word),'not registered '+category+'/'+word);
      const letter=wordInitialForCategory(word,category);
      assert.match(letter,/^[ก-ฮ]$/,'invalid royal initial '+word);
      if(eligibleCategories(letter).includes(category)){
        assert.equal(validAnswer(word,letter,category),true,
          'royal term cannot be used '+category+'/'+word);
      }
    }
  }
  assert.ok(total>=240,'expected substantial royal-register additions');
  assert.ok(Object.keys(ROYAL_WORD_GLOSSARY).length>=8,'expected multiple existing game categories');
});

test('royal terms score in their actual semantic categories; prefixes are not freely synthesized',()=>{
  const accepted:ReadonlyArray<readonly [string,string,string]>=[
    ['พระเศียร','พ','body'],['พระเนตร','พ','body'],
    ['พระหัตถ์','พ','body'],['พระบาท','พ','body'],
    ['พระอุระ','พ','body'],['พระนาภี','พ','body'],
    ['ข้อพระหัตถ์','ข','body'],['น้ำพระเนตร','น','body'],
    ['บรรทม','บ','verb'],['เสวย','ส','verb'],['ตรัส','ต','verb'],
    ['ทอดพระเนตร','ท','verb'],['พระราชทาน','พ','verb'],
    ['ทรงพระสรวล','ท','verb'],['สรงพระพักตร์','ส','verb'],
    ['ฉลองพระองค์','ฉ','clothing'],['พระมาลา','พ','clothing'],
    ['พระธำมรงค์','พ','clothing'],['พระสาง','พ','object'],
    ['ธารพระกร','ธ','object'],['ฉลองพระหัตถ์ส้อม','ฉ','object'],
    ['พระแท่นบรรทม','พ','furniture'],['พระเขนย','พ','furniture'],
    ['พระกระยาหาร','พ','food'],['พระสุธารส','พ','drink'],
    ['พระตำหนัก','พ','place'],['รถพระที่นั่ง','ร','vehicle']
  ];
  for(const [word,letter,category] of accepted){
    assert.equal(wordInitialForCategory(word,category),letter,word+' wrong initial');
    if(eligibleCategories(letter).includes(category))
      assert.equal(validAnswer(word,letter,category),true,category+'/'+word+' should be playable');
  }
  assert.equal(validAnswer('พระเศียร','พ','food'),false);
  assert.equal(validAnswer('พระมาลา','พ','body'),false);
  assert.equal(validAnswer('เสวย','ส','body'),false);
  assert.equal(validAnswer('ทรงเสวย','ท','verb'),false,'must not synthesize malformed royal verbs');
  assert.equal(validAnswer('ทรงตรัส','ท','verb'),false);
  assert.equal(validAnswer('ทรงบรรทม','ท','verb'),false);
  assert.equal(validAnswer('พระแขน','พ','body'),false);
});

test('royal additions preserve two-word, five-category fairness and rarity uniqueness',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  for(const letter of LETTERS){
    const categories=eligibleCategories(letter);
    assert.ok(categories.length>=5,letter+' must have >=5 categories');
    for(const category of categories){
      const canonical=new Set(WORD_BANK[category]
        .filter(word=>wordInitialForCategory(word,category)===letter)
        .map(word=>canonicalAnswer(word,category)));
      assert.ok(canonical.size>=2,category+'/'+letter+' must have >=2 distinct words');
      if(Object.prototype.hasOwnProperty.call(ROYAL_THAI_TERMS,category))
        assert.deepEqual(wordsForGroup(letter,category),[...canonical].sort(),
          'rarity pool must contain each royal canonical word exactly once');
    }
  }
});
