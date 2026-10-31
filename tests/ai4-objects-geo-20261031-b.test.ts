import test from 'node:test';
import assert from 'node:assert/strict';
import { AI4_OBJECTS_GEO_TERMS } from '../amplify/functions/game/ai4-objects-geo-terms-20261031-b.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage }
  from '../amplify/functions/game/moderation.ts';

const EXPECTED_INITIALS: Readonly<Record<string, readonly string[]>> = {
  clothing: ['ก', 'ส', 'ส', 'ส', 'ส', 'ก', 'ช', 'ช', 'ห', 'ส', 'ช', 'ช'],
  vehicle: ['ร', 'ร', 'ร', 'จ', 'ค', 'จ', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร'],
  device: ['ค', 'ค', 'ค', 'ต', 'ต', 'ต', 'ค', 'ค', 'ต', 'ค', 'ค', 'ค'],
  tool: ['ค', 'ด', 'ป', 'ป', 'ห', 'ค', 'ค', 'ห', 'ข', 'ค', 'ฉ', 'ค'],
  place: ['ร', 'พ', 'ส', 'ต', 'ท', 'ร', 'ห', 'ร', 'อ', 'ร', 'ร', 'ส']
};

test('AI-4 batches 2–4 register exactly 60 clean and canonically unique terms', () => {
  assert.deepEqual(Object.keys(AI4_OBJECTS_GEO_TERMS), Object.keys(EXPECTED_INITIALS));
  const all = Object.values(AI4_OBJECTS_GEO_TERMS).flat();
  assert.equal(all.length, 60);
  assert.equal(new Set(all).size, 60, 'duplicate literal within AI-4 batches');

  for (const [category, words] of Object.entries(AI4_OBJECTS_GEO_TERMS)) {
    assert.equal(words.length, 12, 'unexpected count: ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size,
      words.length, 'duplicate canonical identity within AI-4 category: ' + category);
    for (const [index, word] of words.entries()) {
      assert.equal(word, word.trim().normalize('NFC'), 'noncanonical spacing: ' + word);
      assert.ok(word.length > 1 && word.length <= 48, 'invalid length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation rejected: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked answer: ' + word);
      const initial = EXPECTED_INITIALS[category][index];
      assert.equal(wordInitialForCategory(word, category), initial, 'wrong initial: ' + word);
      assert.equal(
        WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonicalAnswer(word, category)).length,
        1, 'missing or duplicated canonical identity in live bank: ' + category + '/' + word
      );
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true,
          'registered term not accepted: ' + category + '/' + word);
    }
  }
});
