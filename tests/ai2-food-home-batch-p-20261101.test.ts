import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_P } from '../amplify/functions/game/ai2-food-home-batch-p-20261101.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  "food": [
    "ข้าวเบ๊อะ",
    "ลาบหมาน้อย",
    "ข้าวเปิ๊บ"
  ],
  "dessert": [
    "ขนมอังกู๊",
    "ขนมบุหงาบูดะ"
  ],
  "drink": [
    "น้ำส้มซ่า",
    "ชาดอกกุหลาบ",
    "ชาโฮจิฉะ"
  ],
  "fruit": [
    "ลูกจัน",
    "มะปริง"
  ],
  "vegetable": [
    "ดอกงิ้ว",
    "ดอกดาหลา",
    "ยอดฟักข้าว"
  ],
  "object": [
    "หวีสับ",
    "ไม้พายซิลิโคน",
    "เครื่องบดพริกไทย",
    "ที่ตักไอศกรีม",
    "กล่องใส่เครื่องเทศ"
  ],
  "furniture": [
    "โต๊ะทำเล็บ",
    "เตียงตรวจโรค"
  ]
} as const;
const OWNED = ['dessert','drink','food','fruit','furniture','object','vegetable'];

test('AI-2 batch P registers 20 distinct moderated playable words in owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_P).sort(), OWNED);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_P, EXPECTED);
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

test('AI-2 batch P source literals are new across all registered dictionary imports', () => {
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

test('AI-2 batch P preserves category-specific prefix and canonical rules', () => {
  assert.equal(wordInitialForCategory('ขนมอังกู๊','dessert'),'อ');
  assert.equal(wordInitialForCategory('ขนมบุหงาบูดะ','dessert'),'บ');
  assert.equal(wordInitialForCategory('ยอดฟักข้าว','vegetable'),'ย');
  assert.equal(wordInitialForCategory('ดอกงิ้ว','vegetable'),'ด');
  assert.equal(canonicalAnswer('ขนมอังกู๊','dessert'),'ขนมอังกู๊');
});
