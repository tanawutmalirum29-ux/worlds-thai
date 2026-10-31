import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_I } from '../amplify/functions/game/ai2-food-home-batch-i-20261031.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  vegetable: ['กะหล่ำปม', 'ใบชะมวง', 'หน่อกระวาน', 'ผักขวง'],
  object: [
    'ที่รองสบู่', 'เหยือกน้ำ', 'ที่วางตะเกียบ', 'ถาดน้ำแข็ง',
    'ถุงซักผ้า', 'ยางรัดผม', 'กระปุกสำลี', 'ที่บีบหลอดยาสีฟัน',
    'ที่กรองชา', 'ช้อนตวง', 'ตลับยา', 'กล่องปฐมพยาบาล'
  ],
  furniture: ['ตู้เก็บจาน', 'โต๊ะเย็บผ้า', 'ชั้นวางแก้ว', 'เก้าอี้นวด']
} as const;

test('AI-2 batch I adds exactly 20 clean canonical words in three owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_I).sort(), ['furniture', 'object', 'vegetable']);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_I, EXPECTED);
  assert.equal(Object.values(EXPECTED).flat().length, 20);
  for (const [category, words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size, words.length, 'literal duplicate: ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size,
      words.length, 'canonical duplicate within batch: ' + category);
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'not normalized: ' + word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.ok(WORD_BANK[category].includes(word), 'not registered: ' + word);
      assert.equal(WORD_BANK[category].filter(existing =>
        canonicalAnswer(existing, category) === canonicalAnswer(word, category)).length,
        1, 'canonical duplicate across live category: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid playable initial: ' + word);
      assert.ok(eligibleCategories(initial).includes(category),
        'unplayable initial/category: ' + category + '/' + word + ' (' + initial + ')');
      assert.equal(validAnswer(word, initial, category), true, 'not playable: ' + word);
    }
  }
});

test('AI-2 batch I words occur once in source modules before WORD_BANK deduplication', () => {
  const dictionary = readFileSync(new URL('../amplify/functions/game/dictionary.ts', import.meta.url), 'utf8');
  const imports = [...dictionary.matchAll(/from '\.\/([^']+\.ts)'/g)].map(match => match[1]);
  const sources = [dictionary, ...imports.map(filename =>
    readFileSync(new URL('../amplify/functions/game/' + filename, import.meta.url), 'utf8'))];
  for (const word of Object.values(EXPECTED).flat()) {
    const single = "'" + word + "'";
    const double = '"' + word + '"';
    const count = sources.reduce((total, source) =>
      total + source.split(single).length - 1 + source.split(double).length - 1, 0);
    assert.equal(count, 1, 'source-level duplicate or missing: ' + word);
  }
});

test('AI-2 batch I preserves existing ผัก and ขนม initial/canonical rules', () => {
  assert.equal(wordInitialForCategory('กะหล่ำปม', 'vegetable'), 'ก');
  assert.equal(wordInitialForCategory('หน่อกระวาน', 'vegetable'), 'ห');
  assert.equal(wordInitialForCategory('ผักขวง', 'vegetable'), 'ข');
  assert.equal(canonicalAnswer('กะหล่ำปม', 'vegetable'), 'กะหล่ำปม');
  assert.equal(canonicalAnswer('หน่อกระวาน', 'vegetable'), 'หน่อกระวาน');
  assert.equal(wordInitialForCategory('ใบชะมวง', 'vegetable'), 'บ');
  assert.equal(wordInitialForCategory('ขนมครก', 'dessert'), 'ค');
  assert.equal(canonicalAnswer('ผักบุ้ง', 'vegetable'), 'บุ้ง');
});

test('AI-2 batch I rejects semantic duplicates of existing household terms', () => {
  const rejected = {
    vegetable: [
      ['ผักก้านจอง', 'ผักพาย'],
      ['ผักกะสัง', 'ผักกระสัง']
    ],
    object: [
      ['หลอดดูดน้ำ', 'หลอดดูด'],
      ['ที่หนีบผ้า', 'ไม้หนีบผ้า'],
      ['ซองใส่แว่น', 'ซองใส่แว่นตา'],
      ['ฟอยล์อะลูมิเนียม', 'ฟอยล์อลูมิเนียม']
    ],
    furniture: [
      ['โต๊ะกลางโซฟา', 'โต๊ะกลาง'],
      ['ตู้ลอยครัว', 'ตู้ครัว']
    ]
  } as const;
  for (const [category, pairs] of Object.entries(rejected)) {
    for (const [duplicate, existing] of pairs) {
      assert.ok(WORD_BANK[category].includes(existing), 'missing baseline term: ' + existing);
      assert.equal((AI2_FOOD_HOME_BATCH_I[category as 'vegetable' | 'object' | 'furniture'] as readonly string[]).includes(duplicate),
        false, 'semantic duplicate added: ' + duplicate + ' ≈ ' + existing);
    }
  }
  assert.ok(WORD_BANK.vegetable.includes('กะหล่ำปม'));
  assert.ok(WORD_BANK.vegetable.includes('หน่อกระวาน'));
  assert.equal(WORD_BANK.vegetable.includes('ผักก้านจอง'), false);
  assert.equal(WORD_BANK.vegetable.includes('ผักกะสัง'), false);
  assert.ok(WORD_BANK.object.includes('ที่รองสบู่'));
  assert.ok(WORD_BANK.object.includes('ที่วางตะเกียบ'));
  assert.equal(WORD_BANK.object.includes('ฝาปิดแก้ว'), false);
  assert.equal(wordInitialForCategory('ที่วางตะเกียบ', 'object'), 'ท');
  assert.ok(WORD_BANK.object.includes('ถุงซักผ้า'));
  assert.ok(WORD_BANK.object.includes('กระปุกสำลี'));
  assert.ok(WORD_BANK.object.includes('ที่บีบหลอดยาสีฟัน'));
  assert.ok(WORD_BANK.object.includes('ฟอยล์อลูมิเนียม'));
  assert.equal(WORD_BANK.object.includes('ฟอยล์อะลูมิเนียม'), false);
  assert.equal(WORD_BANK.object.includes('ซองใส่แว่น'), false);
  assert.ok(WORD_BANK.furniture.includes('โต๊ะเย็บผ้า'));
  assert.ok(WORD_BANK.furniture.includes('เก้าอี้นวด'));
});
