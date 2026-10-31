import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_FRUIT_20261031 } from '../amplify/functions/game/ai2-food-fruit-20261031.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer } from '../amplify/functions/game/moderation.ts';

const approvedCategories = ['food', 'fruit'];

test('AI-2 batches C, F and H register exactly 38 unique foods and fruits in the live dictionary', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_FRUIT_20261031).sort(), approvedCategories);
  assert.equal(AI2_FOOD_FRUIT_20261031.food.length, 29);
  assert.equal(AI2_FOOD_FRUIT_20261031.fruit.length, 9);
  assert.equal(Object.values(AI2_FOOD_FRUIT_20261031).flat().length, 38);

  for (const [category, words] of Object.entries(AI2_FOOD_FRUIT_20261031)) {
    assert.equal(new Set(words).size, words.length, 'duplicate literal: ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size,
      words.length, 'duplicate canonical identity: ' + category);
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'not NFC/trimmed: ' + word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.ok(WORD_BANK[category].includes(word), 'missing from live dictionary: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length,
        1, 'canonical duplicate in entire live bank: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid initial consonant: ' + word);
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true, 'not playable: ' + word);
    }
  }
});

test('AI-2 batch C preserves category-local prefix and canonicalization behavior', () => {
  assert.equal(wordInitialForCategory('ขนมจีนน้ำพริก', 'food'), 'ข');
  assert.equal(wordInitialForCategory('ขนมครก', 'dessert'), 'ค');
  assert.equal(wordInitialForCategory('ผักบุ้ง', 'vegetable'), 'บ');
  assert.equal(canonicalAnswer('ผักบุ้ง', 'vegetable'), 'บุ้ง');
});

test('AI-2 batch F registers Sla Noen Wong as one unique fruit', () => {
  const word = 'สละเนินวง';
  assert.ok(AI2_FOOD_FRUIT_20261031.fruit.includes(word));
  assert.equal(WORD_BANK.fruit.filter(entry =>
    canonicalAnswer(entry, 'fruit') === canonicalAnswer(word, 'fruit')).length, 1);
  assert.equal(isInappropriateLanguage(word), false);
  assert.equal(wordInitialForCategory(word, 'fruit'), 'ส');
});


// Batch H checks source-level duplicates before WORD_BANK Set() deduplication.
test('AI-2 batch H adds 17 source-unique established food and fruit names', () => {
  const additions = {
    food: [
      'ฟักแม้วผัดไข่',
      'ซาลาเปาไส้หมู',
      'ฉู่ฉี่ปลาเนื้ออ่อน',
      'ฉู่ฉี่ปลาช่อน',
      'อ่อมหมู',
      'หมกหน่อไม้',
      'ปลาส้มทอด',
      'ข้าวจี่ไข่',
      'ยำมะม่วงปลากรอบ',
      'แกงส้มชะอมไข่',
      'ไก่ย่างเขาสวนกวาง',
      'ต้มส้มปลากระบอก',
      'หลนปลาอินทรีเค็ม',
      'ลาบหมูคั่ว'
    ],
    fruit: [
      'กระท้อนปุยฝ้าย',
      'มะเฟืองหวาน',
      'ชมพู่ทับทิมจันทร์'
    ]
  } as const;
  assert.equal(additions.food.length, 14);
  assert.equal(additions.fruit.length, 3);
  assert.equal(Object.values(additions).flat().length, 17);

  const dictionarySource = readFileSync(new URL('../amplify/functions/game/dictionary.ts', import.meta.url), 'utf8');
  const imports = [...new Set([...dictionarySource.matchAll(/from '\.\/([^']+\.ts)'/g)].map(match => match[1]))];
  const sources = [dictionarySource, ...imports.map(filename =>
    readFileSync(new URL('../amplify/functions/game/' + filename, import.meta.url), 'utf8'))];

  for (const [category, words] of Object.entries(additions)) {
    for (const word of words) {
      assert.ok(AI2_FOOD_FRUIT_20261031[category as 'food' | 'fruit'].includes(word), 'not registered: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length,
        1, 'canonical duplicate: ' + category + '/' + word);
      const occurrences = sources.reduce((count, source) => count
        + source.split("'" + word + "'").length - 1
        + source.split('"' + word + '"').length - 1, 0);
      assert.equal(occurrences, 1, 'source duplicate or missing: ' + category + '/' + word);
      assert.equal(isInappropriateLanguage(word), false, word);
      assert.equal(isBlockedStandaloneAnswer(word), false, word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid initial: ' + word);
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + word);
    }
  }
  assert.equal(wordInitialForCategory('ขนมครก', 'dessert'), 'ค');
  assert.equal(wordInitialForCategory('ผักบุ้ง', 'vegetable'), 'บ');
});
