import test from 'node:test';
import assert from 'node:assert/strict';
import { AI3_ACTIVITY_TERMS } from '../amplify/functions/game/ai3-activity-terms-20261031.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage }
  from '../amplify/functions/game/moderation.ts';

const EXPECTED_INITIALS: Readonly<Record<string, readonly string[]>> = {
  job: ['น', 'น', 'ช', 'น', 'น', 'ช', 'น', 'ช', 'น', 'น', 'ช', 'น'],
  verb: ['ค', 'พ', 'ล', 'ป', 'ถ', 'ถ', 'ก', 'ย', 'ข', 'ต', 'ค', 'ก'],
  sport: ['ส', 'พ', 'ฟ', 'ท', 'ร', 'บ', 'พ', 'ท', 'ร', 'ว', 'ค', 'ป'],
  music: ['ว', 'ก', 'ค', 'ท', 'ค', 'อ', 'ก', 'ค', 'ค'],
  toy: ['ห', 'ห', 'ก', 'ค', 'ช', 'ก', 'บ'],
  school: ['ก', 'ป', 'ต', 'ฟ', 'ค', 'ส', 'ก', 'บ', 'ก', 'ม', 'ท'],
  body: ['ก', 'ก', 'ข', 'ย', 'ย', 'ต', 'ส', 'ก', 'ต', 'ก', 'ส', 'ย'],
};

test('AI-3 registers 75 reviewed activity terms without duplicate canonical identities', () => {
  assert.deepEqual(Object.keys(AI3_ACTIVITY_TERMS), Object.keys(EXPECTED_INITIALS));
  const all = Object.values(AI3_ACTIVITY_TERMS).flat();
  assert.equal(all.length, 75);
  assert.equal(new Set(all).size, all.length);
  let playable = 0;
  for (const [category, words] of Object.entries(AI3_ACTIVITY_TERMS)) {
    assert.ok(Object.prototype.hasOwnProperty.call(WORD_BANK, category), category);
    assert.equal(words.length, EXPECTED_INITIALS[category].length);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, words.length,
      'canonical duplicate within AI-3 category ' + category);
    for (const [index, word] of words.entries()) {
      assert.equal(word, word.trim().normalize('NFC'), word + ' not normalized');
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid word length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation blocked ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'standalone block ' + word);
      const initial = wordInitialForCategory(word, category);
      assert.equal(initial, EXPECTED_INITIALS[category][index], 'wrong initial: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(
        WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length,
        1, 'existing canonical collision: ' + category + '/' + word
      );
      if (eligibleCategories(initial).includes(category)) {
        assert.equal(validAnswer(word, initial, category), true,
          'unplayable registered term: ' + category + '/' + word);
        playable++;
      }
    }
  }
  assert.ok(playable >= 10, 'at least ten entries must be playable in eligible rounds');
});
