import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_TERMS } from '../amplify/functions/game/ai2-food-home-terms.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

test('AI-2 registers 20 distinct clean words in object and furniture only', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_TERMS).sort(), ['furniture', 'object']);
  assert.equal(Object.values(AI2_FOOD_HOME_TERMS).reduce((n, words) => n + words.length, 0), 20);

  for (const [category, words] of Object.entries(AI2_FOOD_HOME_TERMS)) {
    assert.equal(words.length, 10, 'unexpected AI-2 count for ' + category);
    assert.equal(new Set(words).size, words.length, 'literal duplicate in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size,
      words.length, 'canonical duplicate in ' + category);

    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'not normalized: ' + word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate word: ' + word);
      assert.ok(WORD_BANK[category].includes(word), 'not registered: ' + word);
      const identity = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(
        candidate => canonicalAnswer(candidate, category) === identity
      ).length, 1, 'duplicate canonical identity in live bank: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid consonant: ' + word);
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + word);
    }
  }
});

test('AI-2 does not alter dessert or vegetable prefix rules', () => {
  assert.equal(wordInitialForCategory('ขนมครก', 'dessert'), 'ค');
  assert.equal(wordInitialForCategory('ผักบุ้ง', 'vegetable'), 'บ');
  assert.equal(canonicalAnswer('ผักบุ้ง', 'vegetable'), 'บุ้ง');
});
