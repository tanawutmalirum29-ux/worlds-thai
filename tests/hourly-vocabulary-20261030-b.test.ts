import test from 'node:test';
import assert from 'node:assert/strict';
import { HOURLY_VOCABULARY_20261030_B } from '../amplify/functions/game/hourly-vocabulary-20261030-b.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';

test('hourly vocabulary round B has 16 distinct canonical Thai answers in the live bank', () => {
  const additions = Object.values(HOURLY_VOCABULARY_20261030_B).flat();
  assert.equal(additions.length, 16);
  assert.equal(new Set(additions).size, additions.length, 'duplicate word across categories');
  let playable = 0;
  for (const [category, words] of Object.entries(HOURLY_VOCABULARY_20261030_B)) {
    assert.ok(Object.prototype.hasOwnProperty.call(WORD_BANK, category), category);
    assert.equal(words.length, 4, category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, words.length,
      category + ' duplicate canonical identity');
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'invalid normalization: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length,
        1, category + ' duplicate canonical answer: ' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid initial: ' + word);
      if (eligibleCategories(initial).includes(category)) {
        assert.equal(validAnswer(word, initial, category), true, category + ': ' + word);
        playable++;
      }
    }
  }
  assert.ok(playable >= 8, 'expected at least half the words to be playable');
});
