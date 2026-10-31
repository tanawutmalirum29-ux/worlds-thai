import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_D } from '../amplify/functions/game/ai2-food-home-batch-d-20261031.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer } from '../amplify/functions/game/moderation.ts';

test('AI-2 batch D registers 20 distinct canonical answers in only owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_D).sort(), ['dessert', 'drink', 'food']);
  assert.equal(AI2_FOOD_HOME_BATCH_D.food.length, 10);
  assert.equal(AI2_FOOD_HOME_BATCH_D.dessert.length, 5);
  assert.equal(AI2_FOOD_HOME_BATCH_D.drink.length, 5);
  assert.equal(Object.values(AI2_FOOD_HOME_BATCH_D).flat().length, 20);

  for (const [category, words] of Object.entries(AI2_FOOD_HOME_BATCH_D)) {
    assert.equal(new Set(words).size, words.length, 'duplicate spelling in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size,
      words.length, 'duplicate canonical identity in ' + category);
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'not NFC/trimmed: ' + word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.ok(WORD_BANK[category].includes(word), 'missing from live bank: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length,
        1, 'canonical duplicate in entire bank: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid initial: ' + word);
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true, 'not playable: ' + word);
    }
  }
});

test('AI-2 batch D preserves existing dessert prefix and vegetable prefix behavior', () => {
  assert.equal(wordInitialForCategory('ขนมข้าวโป่ง', 'dessert'), 'ข');
  assert.equal(wordInitialForCategory('ขนมรังผึ้ง', 'dessert'), 'ร');
  assert.equal(wordInitialForCategory('ขนมโก๋', 'dessert'), 'ก');
  assert.equal(wordInitialForCategory('ขนมปั้นขลิบ', 'dessert'), 'ป');
  assert.equal(wordInitialForCategory('ขนมไข่กรอบ', 'dessert'), 'ข');
  assert.equal(wordInitialForCategory('ยำขนมจีน', 'food'), 'ย');
  assert.equal(wordInitialForCategory('ผักบุ้ง', 'vegetable'), 'บ');
  assert.equal(canonicalAnswer('ผักบุ้ง', 'vegetable'), 'บุ้ง');
});
