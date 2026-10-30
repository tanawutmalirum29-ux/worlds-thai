import test from 'node:test';
import assert from 'node:assert/strict';
import { AI1_NATURE_TERMS } from '../amplify/functions/game/ai1-nature-terms.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';

const NATURE_CATEGORIES = ['animal', 'bird', 'fish', 'insect', 'plant', 'tree', 'flower', 'nature'];

test('AI-1 adds 95 real nature names only within its eight assigned categories', () => {
  assert.deepEqual(Object.keys(AI1_NATURE_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(AI1_NATURE_TERMS).reduce((total, words) => total + words.length, 0), 95);

  for (const [category, words] of Object.entries(AI1_NATURE_TERMS)) {
    const canonicalSeen = new Set<string>();
    for (const word of words) {
      assert.ok(WORD_BANK[category].includes(word), `${word} must be registered in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} must have a canonical identity`);
      assert.ok(!canonicalSeen.has(canonical), `${word} duplicates another AI-1 name`);
      canonicalSeen.add(canonical);

      const matches = WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical);
      assert.equal(matches.length, 1, `${word} must not duplicate an existing canonical identity`);

      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/u, `${word} must resolve to a Thai consonant`);
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true, `${word} should be accepted where playable`);
    }
  }
});

test('nature nouns keep existing bird, fish, insect, tree, and flower prefix identities', () => {
  const examples: ReadonlyArray<readonly [string, string, string, string]> = [
    ['bird', 'นกกะรางหัวขวาน', 'กะรางหัวขวาน', 'ก'],
    ['bird', 'นกเป็ดผี', 'เป็ดผี', 'ป'],
    ['fish', 'ปลาสิงโต', 'สิงโต', 'ส'],
    ['fish', 'ปลาตีน', 'ตีน', 'ต'],
    ['insect', 'แมลงช้างปีกใส', 'ช้างปีกใส', 'ช'],
    ['insect', 'แมลงกระชอน', 'กระชอน', 'ก'],
    ['tree', 'ประดู่ป่า', 'ประดู่ป่า', 'ป'],
    ['flower', 'บัวดิน', 'บัวดิน', 'บ'],
    ['bird', 'นกกวัก', 'กวัก', 'ก'],
    ['fish', 'ปลาใบมีดโกน', 'ใบมีดโกน', 'บ'],
    ['fish', 'ปลาไหลมอเรย์', 'ไหลมอเรย์', 'ห'],
    ['insect', 'แมลงทับ', 'ทับ', 'ท'],
    ['insect', 'แมลงหางหนีบ', 'หางหนีบ', 'ห'],
    ['bird', 'นกพญาไฟเล็ก', 'พญาไฟเล็ก', 'พ'],
    ['bird', 'นกแซงแซวหางปลา', 'แซงแซวหางปลา', 'ซ'],
    ['fish', 'ปลาหมอสีคางดำ', 'หมอสีคางดำ', 'ห'],
    ['fish', 'ปลาโมง', 'โมง', 'ม'],
  ];
  for (const [category, word, canonical, initial] of examples) {
    assert.equal(canonicalAnswer(word, category), canonical);
    assert.equal(wordInitialForCategory(word, category), initial);
  }
});
