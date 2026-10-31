import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_FRUIT_20261031 } from '../amplify/functions/game/ai2-food-fruit-20261031.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer } from '../amplify/functions/game/moderation.ts';

const approvedCategories = ['food', 'fruit'];

test('AI-2 batch C registers exactly 20 unique foods and fruits in the live dictionary', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_FRUIT_20261031).sort(), approvedCategories);
  assert.equal(AI2_FOOD_FRUIT_20261031.food.length, 15);
  assert.equal(AI2_FOOD_FRUIT_20261031.fruit.length, 5);
  assert.equal(Object.values(AI2_FOOD_FRUIT_20261031).flat().length, 20);

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
