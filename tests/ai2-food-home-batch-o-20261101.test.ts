import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_O } from '../amplify/functions/game/ai2-food-home-batch-o-20261101.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  "food": [
    "หอยจ๊อ",
    "ลาบเทา",
    "ข้าวปุ้นน้ำแจ่ว",
    "แกงรัญจวน"
  ],
  "dessert": [
    "ขนมสัมปันนี",
    "ขนมปำจี"
  ],
  "drink": [
    "ชาหลงจิ่ง",
    "น้ำข้าวบาร์เลย์",
    "น้ำว่านหางจระเข้"
  ],
  "fruit": [
    "มะงั่ว"
  ],
  "vegetable": [
    "ยอดกระโดน",
    "ยอดจิก"
  ],
  "object": [
    "กระดิ่งลม",
    "พิมพ์ขนมครก",
    "ที่บดกระเทียม",
    "ที่ขูดมะพร้าว",
    "พิมพ์วุ้น",
    "ขาตั้งโน้ตเพลง"
  ],
  "furniture": [
    "เตียงผ่าตัด",
    "โต๊ะวางจักรเย็บผ้า"
  ]
} as const;
const OWNED = ['dessert','drink','food','fruit','furniture','object','vegetable'];

test('AI-2 batch O registers 20 distinct moderated playable words in owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_O).sort(), OWNED);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_O, EXPECTED);
  assert.equal(Object.values(EXPECTED).flat().length, 20);
  for (const [category, words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size, words.length, 'literal duplicate: '+category);
    assert.equal(new Set(words.map(word=>canonicalAnswer(word,category))).size, words.length,
      'canonical duplicate in batch: '+category);
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

test('AI-2 batch O source literals are new across all registered dictionary imports', () => {
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

test('AI-2 batch O keeps existing dessert and vegetable prefix rules', () => {
  assert.equal(wordInitialForCategory('ขนมสัมปันนี','dessert'),'ส');
  assert.equal(wordInitialForCategory('ขนมปำจี','dessert'),'ป');
  assert.equal(wordInitialForCategory('ยอดกระโดน','vegetable'),'ย');
  assert.equal(wordInitialForCategory('ยอดจิก','vegetable'),'ย');
  assert.equal(canonicalAnswer('ขนมสัมปันนี','dessert'),'ขนมสัมปันนี');
});
