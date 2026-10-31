import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_J } from '../amplify/functions/game/ai2-food-home-batch-j-20261031.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  food: [
    'แกงขนุน', 'แกงโฮะ', 'แกงกระด้าง', 'ต้มจิ๋ว', 'แกงบอน',
    'ยำส้มโอ', 'แกงแคไก่', 'ยำจิ้นไก่', 'แกงผักหวานไข่มดแดง',
    'ข้าวผัดน้ำพริกลงเรือ'
  ],
  dessert: [
    'ขนมช่อม่วง', 'ขนมหม้อตาล', 'ขนมเจาะหู',
    'ขนมสาลี่กรอบ', 'ขนมกรอบเค็ม'
  ],
  fruit: ['ชมพู่เพชรสามพราน', 'ส้มจุก'],
  object: ['ที่วางฝาหม้อ', 'ที่หั่นไข่ต้ม', 'ลูกกลิ้งนวดหน้า']
} as const;

test('AI-2 batch J adds 20 unique, moderated and playable words in owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_J).sort(), ['dessert', 'food', 'fruit', 'object']);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_J, EXPECTED);
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
        1, 'canonical collision in live category: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid initial: ' + category + '/' + word);
      assert.ok(eligibleCategories(initial).includes(category),
        'unplayable initial/category: ' + category + '/' + word + ' (' + initial + ')');
      assert.equal(validAnswer(word, initial, category), true,
        'not accepted by game: ' + category + '/' + word);
    }
  }
});

test('AI-2 batch J has no source-level literal duplicates across dictionary modules', () => {
  const dictionary = readFileSync(new URL('../amplify/functions/game/dictionary.ts', import.meta.url), 'utf8');
  const imports = dictionary.split('\n').filter(line => line.startsWith('import ') && line.includes("from './"))
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

test('AI-2 batch J keeps existing dessert prefix and cross-category rules intact', () => {
  assert.equal(wordInitialForCategory('ขนมช่อม่วง', 'dessert'), 'ช');
  assert.equal(wordInitialForCategory('ขนมหม้อตาล', 'dessert'), 'ห');
  assert.equal(wordInitialForCategory('ขนมเจาะหู', 'dessert'), 'จ');
  assert.equal(wordInitialForCategory('ขนมสาลี่กรอบ', 'dessert'), 'ส');
  assert.equal(wordInitialForCategory('ขนมกรอบเค็ม', 'dessert'), 'ก');
  assert.equal(wordInitialForCategory('ผักบุ้ง', 'vegetable'), 'บ');
  assert.equal(canonicalAnswer('ผักบุ้ง', 'vegetable'), 'บุ้ง');
  assert.equal(wordInitialForCategory('ชมพู่เพชรสามพราน', 'fruit'), 'ช');
});
