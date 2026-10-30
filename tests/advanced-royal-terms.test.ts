import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVANCED_ROYAL_GLOSSARY, ADVANCED_ROYAL_TERMS } from '../amplify/functions/game/advanced-royal-terms.ts';
import { WORD_BANK, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, LETTERS, validAnswer, canonicalAnswer, eligibleCategories, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

test('advanced royal terms are checked, category-local, meaningful and de-duplicated', () => {
  const validCategories=new Set<string>(CATEGORIES.map(([id])=>id));
  let total=0;
  for (const [category, rows] of Object.entries(ADVANCED_ROYAL_GLOSSARY)) {
    assert.ok(validCategories.has(category),'unknown '+category);
    assert.deepEqual(rows.map(([w])=>w),ADVANCED_ROYAL_TERMS[category]);
    const words=rows.map(([word])=>word);
    assert.equal(new Set(words).size,words.length,'duplicate in new glossary '+category);
    assert.equal(new Set(WORD_BANK[category]).size,WORD_BANK[category].length,'duplicate in live bank '+category);
    for (const [word,meaning] of rows) {
      total++;
      assert.ok(meaning.length>0,'unexplained term '+word);
      assert.equal(word,word.normalize('NFC').trim(),'invalid normalization '+word);
      assert.ok(word.length>=2&&word.length<=48,'invalid length '+word);
      assert.equal(isInappropriateLanguage(word),false,'moderation blocked '+word);
      assert.ok(WORD_BANK[category].includes(word),'not indexed '+word);
      const letter=wordInitialForCategory(word,category);
      assert.match(letter,/^[ก-ฮ]$/,'invalid initial '+word);
      if (eligibleCategories(letter).includes(category))
        assert.equal(validAnswer(word,letter,category),true,'cannot play '+word);
    }
  }
  assert.ok(total>=125,'not enough high-quality deep terms');
  assert.ok(Object.keys(ADVANCED_ROYAL_GLOSSARY).length>=8);
});

test('specialist words are meaningful only in supported categories; never synthesize variants',()=>{
  const accepted: ReadonlyArray<readonly [string,string,string]> = [
    ['พระสิรัฐิ','พ','body'],['พระกัประ','พ','body'],
    ['ทรงพระบรรทม','ท','verb'],['โสรจสรง','ส','verb'],
    ['ฉลองพระบาทเชิงงอน','ฉ','clothing'],
    ['พระแสงขรรค์ชัยศรี','พ','object'],['พระสุพรรณภาชน์','พ','object'],
    ['พระบรรจถรณ์','พ','furniture'],['พระกระยาต้ม','พ','food'],
    ['พระสุธารสเย็น','พ','drink'],['พระราชฐาน','พ','place'],
    ['พระมหาพิชัยราชรถ','พ','vehicle']
  ];
  for (const [word,letter,category] of accepted) {
    assert.equal(wordInitialForCategory(word,category),letter);
    if(eligibleCategories(letter).includes(category))
      assert.equal(validAnswer(word,letter,category),true,category+'/'+word);
    assert.equal(canonicalAnswer(word,category),word.toLocaleLowerCase('th'));
  }
  assert.equal(validAnswer('พระสิรัฐิ','พ','food'),false);
  assert.equal(validAnswer('พระแสงธนู','พ','verb'),false);
  assert.equal(validAnswer('พระกนิษฐา','พ','animal'),false);
  assert.equal(validAnswer('ทรงเสวย','ท','verb'),false);
  assert.equal(validAnswer('ทรงตรัส','ท','verb'),false);
  assert.equal(validAnswer('พระปืน','พ','object'),false);
});

test('advanced royal additions keep initial consonant fairness without rarity inflation',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  for (const letter of LETTERS) {
    const categories=eligibleCategories(letter);
    assert.ok(categories.length>=5,letter);
    for(const category of categories) {
      const actual=new Set(WORD_BANK[category].filter(w=>wordInitialForCategory(w,category)===letter)
        .map(w=>canonicalAnswer(w,category)));
      assert.ok(actual.size>=2,letter+'/'+category);
    }
  }
});
