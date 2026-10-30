import test from 'node:test';
import assert from 'node:assert/strict';
import { FO_FAN_TERMS } from '../amplify/functions/game/fo-fan-terms.ts';
import { WORD_BANK, MIN_CATEGORIES_PER_LETTER, MIN_WORDS_PER_PAIR } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, LETTERS, canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { wordsForGroup } from '../amplify/functions/game/rarity.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

test('curated ฟ answers are unique, correctly spelled, categorized, and registered once', () => {
  const known = new Set<string>(CATEGORIES.map(([id]) => id));
  let total = 0;
  for (const [category, words] of Object.entries(FO_FAN_TERMS)) {
    assert.ok(known.has(category), 'unknown category '+category);
    assert.equal(words.length, new Set(words).size, 'duplicate curated '+category);
    assert.equal(WORD_BANK[category].length, new Set(WORD_BANK[category]).size, 'duplicate live '+category);
    for (const word of words) {
      total++;
      assert.equal(word, word.trim().normalize('NFC'), 'not normalized '+word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length '+word);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate '+word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked '+word);
      assert.equal(wordInitialForCategory(word, category), 'ฟ', 'wrong consonant '+word);
      assert.equal(WORD_BANK[category].filter(item => item === word).length, 1, 'unregistered '+word);
      assert.equal(validAnswer(word, 'ฟ', category), true, 'not accepted '+category+'/'+word);
    }
  }
  assert.ok(total >= 120, 'expected substantial reviewed additions');
  assert.ok(Object.keys(FO_FAN_TERMS).length >= 18, 'expected breadth across categories');
});

test('everyday เฟิร์น ฟัก แฟง and other ฟ words work only in appropriate categories', () => {
  for (const [word, category] of [
    ['เฟิร์น', 'plant'], ['เฟิร์นบอสตัน', 'plant'], ['ฟัก', 'vegetable'],
    ['แฟง', 'vegetable'], ['ฟักทอง', 'vegetable'], ['ฟักข้าว', 'fruit'],
    ['ฟักข้าว', 'plant'], ['ฟัง', 'verb'], ['ฟื้นตัว', 'verb'],
    ['ฟัน', 'body'], ['ฟันน้ำนม', 'body'], ['ฟุตบอล', 'sport'],
    ['ฟลอร์บอล', 'sport'], ['ฟาร์ม', 'place'], ['ฟักทองเชื่อม', 'dessert'],
    ['ฟลามิงโก', 'bird'], ['ฟินช์ม้าลาย', 'bird'], ['แฟลชไดรฟ์', 'device'],
    ['ฟูก', 'furniture'], ['ฟรุตเค้ก', 'dessert']
  ] as const) assert.equal(validAnswer(word, 'ฟ', category), true, word+'/'+category);
  assert.equal(validAnswer('ต้นเฟิร์น', 'ฟ', 'plant'), false, 'plant has no optional ต้น prefix');
  assert.equal(validAnswer('ดอกฟอร์เก็ตมีนอต', 'ฟ', 'flower'), true);
  assert.equal(validAnswer('ฟัก', 'ฟ', 'animal'), false);
  assert.equal(validAnswer('เฟิร์นรถบิน', 'ฟ', 'plant'), false);
  assert.equal(validAnswer('ฟาร์มดาวอังคาร', 'ฟ', 'place'), false);
  assert.equal(validAnswer('แฟง', 'ฟ', 'fruit'), false);
  assert.equal(validAnswer('เฟิร์น', 'ฝ', 'plant'), false);
});

test('ฟ remains fair and each rarity group counts distinct canonical spellings once', () => {
  assert.equal(MIN_WORDS_PER_PAIR, 2);
  assert.equal(MIN_CATEGORIES_PER_LETTER, 5);
  assert.ok(LETTERS.includes('ฟ' as never));
  const eligible = eligibleCategories('ฟ');
  assert.ok(eligible.length >= 18, 'not enough category coverage');
  for (const category of eligible) {
    const unique = new Set(WORD_BANK[category]
      .filter(word => wordInitialForCategory(word, category) === 'ฟ')
      .map(word => canonicalAnswer(word, category)));
    assert.ok(unique.size >= MIN_WORDS_PER_PAIR, category+' has too few words');
    assert.deepEqual(wordsForGroup('ฟ', category), [...unique].sort(), 'rarity mismatch '+category);
  }
});
