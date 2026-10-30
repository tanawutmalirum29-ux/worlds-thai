import test from 'node:test';
import assert from 'node:assert/strict';
import { HOURLY_VOCABULARY_20261030_D }
  from '../amplify/functions/game/hourly-vocabulary-20261030-d.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer }
  from '../amplify/functions/game/moderation.ts';

const EXPECTED_INITIALS: Readonly<Record<string, readonly string[]>> = {
  insect: ['ป', 'จ', 'พ', 'ห'],
  flower: ['พ', 'บ', 'ค', 'จ'],
  tree: ['ส', 'ค', 'ส', 'ม'],
  music: ['ห', 'บ', 'ฉ', 'ป'],
};

test('hourly vocabulary round D registers 16 distinct canonical Thai answers', () => {
  const entries = Object.entries(HOURLY_VOCABULARY_20261030_D);
  const additions = entries.flatMap(([, words]) => words);
  assert.deepEqual(entries.map(([category]) => category), Object.keys(EXPECTED_INITIALS));
  assert.equal(additions.length, 16);
  assert.equal(new Set(additions).size, 16, 'duplicate literal in this batch');
  let playable = 0;

  for (const [category, words] of entries) {
    assert.ok(Object.prototype.hasOwnProperty.call(WORD_BANK, category), category);
    assert.equal(words.length, 4, category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4,
      category + ': duplicate canonical identity');
    for (const [index, word] of words.entries()) {
      assert.equal(word, word.trim().normalize('NFC'), 'invalid Unicode/spacing: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'prohibited: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, 'empty canonical answer: ' + word);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length,
        1, category + ': canonical duplicate: ' + word);
      const initial = wordInitialForCategory(word, category);
      assert.equal(initial, EXPECTED_INITIALS[category][index], 'wrong initial: ' + word);
      if (eligibleCategories(initial).includes(category)) {
        assert.equal(validAnswer(word, initial, category), true, 'not accepted: ' + word);
        playable++;
      }
    }
  }
  assert.ok(playable >= 8, 'at least half of new words should be playable');
});

test('category-only prefixes are stripped for scoring but remain registered', () => {
  assert.equal(canonicalAnswer('แมลงปอเข็ม', 'insect'), 'ปอเข็ม');
  assert.equal(canonicalAnswer('ดอกพุดตาน', 'flower'), 'พุดตาน');
  assert.equal(canonicalAnswer('ต้นเสลา', 'tree'), 'เสลา');
  assert.equal(canonicalAnswer('โหวด', 'music'), 'โหวด');
});
