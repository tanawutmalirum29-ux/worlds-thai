import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_R } from '../amplify/functions/game/ai2-food-home-batch-r-20261102.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  "food": [
    "หมูโสร่ง",
    "ข้าวหน้าปลาไหล",
    "สตูว์เนื้อ"
  ],
  "dessert": [
    "ขนมลิ้นหมา"
  ],
  "drink": [
    "ชามาซาล่า",
    "ลาสซี่มะม่วง",
    "ชาเปปเปอร์มินต์"
  ],
  "fruit": [
    "เนคทารีน"
  ],
  "vegetable": [
    "ยอดมะรุม",
    "ผักเคล",
    "ยอดผักติ้ว"
  ],
  "object": [
    "หินลับมีด",
    "กระบอกน้ำสุญญากาศ",
    "กล่องใส่รองเท้า"
  ],
  "furniture": [
    "ชั้นวางเครื่องเสียง",
    "เตียงสนาม",
    "โต๊ะคอนโซล"
  ]
} as const;
const OWNED = ['dessert','drink','food','fruit','furniture','object','vegetable'];

test('AI-2 batch R registers 17 distinct, moderated, playable entries in owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_R).sort(), OWNED);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_R, EXPECTED);
  assert.equal(Object.values(EXPECTED).flat().length, 17);
  for (const [category, words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size, words.length, 'literal duplicate: '+category);
    assert.equal(new Set(words.map(word=>canonicalAnswer(word,category))).size, words.length,
      'canonical duplicate within batch: '+category);
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'non-NFC: '+word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length: '+word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: '+word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: '+word);
      assert.ok(WORD_BANK[category].includes(word), 'not registered: '+category+'/'+word);
      assert.equal(WORD_BANK[category].filter(w=>canonicalAnswer(w,category)===canonicalAnswer(word,category)).length,
        1, 'canonical collision: '+category+'/'+word);
      const initial=wordInitialForCategory(word,category);
      assert.match(initial,/^[ก-ฮ]$/, 'invalid initial: '+word);
      assert.ok(eligibleCategories(initial).includes(category), 'unplayable: '+category+'/'+word+' ('+initial+')');
      assert.equal(validAnswer(word,initial,category),true, 'rejected by game: '+category+'/'+word);
    }
  }
});

test('AI-2 batch R literals are new across all registered dictionary source modules', () => {
  const dictionary=readFileSync(new URL('../amplify/functions/game/dictionary.ts',import.meta.url),'utf8');
  const imports=dictionary.split('\n').filter(line=>line.startsWith('import ')&&line.includes("from './"))
    .map(line=>line.split("from './")[1]?.split("'")[0])
    .filter((filename):filename is string=>Boolean(filename));
  const sources=[dictionary,...imports.map(filename=>readFileSync(
    new URL('../amplify/functions/game/'+filename,import.meta.url),'utf8'))];
  for (const word of Object.values(EXPECTED).flat()) {
    const quoted=["'"+word+"'",'"'+word+'"'];
    const count=sources.reduce((sum,source)=>sum+quoted.reduce((n,q)=>n+source.split(q).length-1,0),0);
    assert.equal(count,1,'duplicate or missing source literal: '+word);
  }
});

test('AI-2 batch R retains category-local dessert and vegetable prefix handling', () => {
  assert.equal(wordInitialForCategory('ขนมลิ้นหมา','dessert'),'ล');
  assert.equal(wordInitialForCategory('ขนม','dessert'),'');
  assert.equal(wordInitialForCategory('ผักเคล','vegetable'),'ค');
  assert.equal(canonicalAnswer('ผักเคล','vegetable'),'เคล');
  assert.equal(canonicalAnswer('ผักยอดมะรุม','vegetable'),canonicalAnswer('ยอดมะรุม','vegetable'));
});
