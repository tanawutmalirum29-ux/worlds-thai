import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_L } from '../amplify/functions/game/ai2-food-home-batch-l-20261101.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  "food": [
    "ข้าวต้มแห้ง",
    "หมูทอดใบมะกรูด",
    "จิ้นส้มหมก",
    "แหนมคลุก",
    "น้ำพริกข่า",
    "ข้าวซอยน้อย",
    "ปลากะพงทอดน้ำปลา"
  ],
  "dessert": [
    "ขนมบัวหิมะ"
  ],
  "drink": [
    "น้ำลูกยอ",
    "ชาดอกบัว"
  ],
  "fruit": [
    "มะหลอด"
  ],
  "vegetable": [
    "เห็ดระโงก",
    "เห็ดตับเต่า"
  ],
  "object": [
    "ถาดหลุม",
    "กระติกข้าวเหนียว",
    "ถังข้าวสาร",
    "ที่กดกระเทียม",
    "ที่ตักน้ำแข็ง"
  ],
  "furniture": [
    "ตั่งไม้",
    "โต๊ะบาร์"
  ]
} as const;
const OWNED = ['dessert', 'drink', 'food', 'fruit', 'furniture', 'object', 'vegetable'];

test('AI-2 batch L adds 20 distinct moderated and playable words in owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_L).sort(), OWNED);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_L, EXPECTED);
  assert.equal(Object.values(EXPECTED).flat().length, 20);
  for (const [category, words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size, words.length, 'literal duplicates: ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size,
      words.length, 'canonical duplicates within batch: ' + category);
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.ok(WORD_BANK[category].includes(word), 'not registered: ' + category + '/' + word);
      assert.equal(WORD_BANK[category].filter(existing =>
        canonicalAnswer(existing, category) === canonicalAnswer(word, category)).length,
        1, 'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid initial: ' + category + '/' + word);
      assert.ok(eligibleCategories(initial).includes(category),
        'unplayable initial/category: ' + category + '/' + word + ' (' + initial + ')');
      assert.equal(validAnswer(word, initial, category), true,
        'not accepted by game: ' + category + '/' + word);
    }
  }
});

test('AI-2 batch L has no literal duplicates in the registered source modules', () => {
  const dictionary = readFileSync(new URL('../amplify/functions/game/dictionary.ts', import.meta.url), 'utf8');
  const imports = dictionary.split('\\n').filter(line => line.startsWith('import ') && line.includes("from './"))
    .map(line => line.split("from './")[1]?.split("'")[0]).filter((filename): filename is string => Boolean(filename));
  const sources = [dictionary, ...imports.map(filename =>
    readFileSync(new URL('../amplify/functions/game/' + filename, import.meta.url), 'utf8'))];
  for (const word of Object.values(EXPECTED).flat()) {
    const single = "'" + word + "'";
    const double = '"' + word + '"';
    const count = sources.reduce((sum, source) =>
      sum + source.split(single).length - 1 + source.split(double).length - 1, 0);
    assert.equal(count, 1, 'duplicate or missing source literal: ' + word);
  }
});

test('AI-2 batch L preserves prefix and existing synonym identities', () => {
  assert.equal(wordInitialForCategory('ขนมบัวหิมะ', 'dessert'), 'บ');
  assert.equal(wordInitialForCategory('ผักบุ้ง', 'vegetable'), 'บ');
  assert.equal(canonicalAnswer('ผักบุ้ง', 'vegetable'), 'บุ้ง');
  assert.equal(canonicalAnswer('ขนมบัวหิมะ', 'dessert'), 'ขนมบัวหิมะ');
  assert.ok(WORD_BANK.dessert.includes('ทองเอก'));
  assert.equal(AI2_FOOD_HOME_BATCH_L.dessert.includes('ขนมทองเอก'), false);
  assert.ok(WORD_BANK.vegetable.includes('ผักติ้ว'));
  assert.equal(AI2_FOOD_HOME_BATCH_L.vegetable.includes('ยอดติ้ว'), false);
});
