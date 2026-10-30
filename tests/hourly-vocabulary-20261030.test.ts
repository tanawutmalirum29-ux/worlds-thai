import test from 'node:test';
import assert from 'node:assert/strict';
import { HOURLY_VOCABULARY_20261030 } from '../amplify/functions/game/hourly-vocabulary-20261030.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';

test('hourly vocabulary 2026-10-30 is unique, correctly categorized and registered', () => {
  assert.equal(Object.values(HOURLY_VOCABULARY_20261030).flat().length, 16);
  let playable = 0;
  for (const [category, words] of Object.entries(HOURLY_VOCABULARY_20261030)) {
    assert.ok(Object.prototype.hasOwnProperty.call(WORD_BANK, category), category);
    assert.equal(words.length, 4, category);
    assert.equal(new Set(words).size, words.length, category + ' duplicate spelling');
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, words.length,
      category + ' duplicate canonical identity');
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'invalid normalization: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length,
        1, category + ' must have exactly one canonical entry for ' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, word + ' invalid initial');
      if (eligibleCategories(initial).includes(category)) {
        assert.equal(validAnswer(word, initial, category), true, category + ': ' + word);
        playable++;
      }
    }
  }
  assert.ok(playable >= 8, 'expected most new words to be playable immediately');
});
