import test from 'node:test';
import assert from 'node:assert/strict';
import { HOURLY_VOCABULARY_20261031 }
  from '../amplify/functions/game/hourly-vocabulary-20261031.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer }
  from '../amplify/functions/game/moderation.ts';

const EXPECTED_INITIALS: Readonly<Record<string, readonly string[]>> = {
  animal: ['ต', 'ม', 'ค', 'ส'],
  clothing: ['ก', 'ช', 'ห', 'ส'],
  food: ['ก', 'ข', 'ต', 'ย'],
  tool: ['ค', 'ค', 'ต', 'ค'],
};

test('hourly round H adds 16 distinct playable Thai terms in supported categories', () => {
  const entries = Object.entries(HOURLY_VOCABULARY_20261031);
  assert.deepEqual(entries.map(([category]) => category), Object.keys(EXPECTED_INITIALS));
  const additions = entries.flatMap(([, words]) => words);
  assert.equal(additions.length, 16);
  assert.equal(new Set(additions).size, 16, 'duplicate literal in batch');

  let playable = 0;
  for (const [category, words] of entries) {
    assert.ok(Object.prototype.hasOwnProperty.call(WORD_BANK, category), category);
    assert.equal(words.length, 4, category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4,
      category + ': duplicate canonical identity within batch');

    for (const [index, word] of words.entries()) {
      assert.equal(word, word.trim().normalize('NFC'), 'invalid Unicode or spacing: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate word: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked word: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, 'empty canonical identity: ' + word);
      assert.equal(
        WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length,
        1, category + ': canonical collision with existing vocabulary: ' + word
      );
      const initial = wordInitialForCategory(word, category);
      assert.equal(initial, EXPECTED_INITIALS[category][index], 'wrong initial: ' + word);
      if (eligibleCategories(initial).includes(category)) {
        assert.equal(validAnswer(word, initial, category), true, 'not playable: ' + word);
        playable++;
      }
    }
  }
  assert.ok(playable >= 8, 'at least half the new terms must be playable');
});
