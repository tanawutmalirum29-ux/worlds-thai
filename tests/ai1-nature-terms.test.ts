import test from 'node:test';
import assert from 'node:assert/strict';
import { AI1_NATURE_TERMS } from '../amplify/functions/game/ai1-nature-terms.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, LETTERS, normalizeAnswer, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';

const NATURE_CATEGORIES = ['animal', 'bird', 'fish', 'insect', 'plant', 'tree', 'flower', 'nature'];

test('AI-1 adds 338 real nature names only within its eight assigned categories', () => {
  assert.deepEqual(Object.keys(AI1_NATURE_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(AI1_NATURE_TERMS).reduce((total, words) => total + words.length, 0), 338);

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
    ['bird', 'นกเด้าดินทุ่งเล็ก', 'เด้าดินทุ่งเล็ก', 'ด'],
    ['fish', 'ปลาหมอสีคางดำ', 'หมอสีคางดำ', 'ห'],
    ['fish', 'ปลาโมง', 'โมง', 'ม'],
    ['bird', 'นกแซงแซวหางบ่วง', 'แซงแซวหางบ่วง', 'ซ'],
    ['fish', 'ปลาข้าวสาร', 'ข้าวสาร', 'ข'],
    ['insect', 'แมลงสาบเยอรมัน', 'สาบเยอรมัน', 'ส'],
    ['bird', 'นกกระติ๊ดขี้หมู', 'กระติ๊ดขี้หมู', 'ก'],
    ['bird', 'นกกระเรียนไทย', 'กระเรียนไทย', 'ก'],
    ['fish', 'ปลาหมูอินโด', 'หมูอินโด', 'ห'],
    ['fish', 'ปลากระดี่นาง', 'กระดี่นาง', 'ก'],
    ['insect', 'ด้วงแรดมะพร้าว', 'ด้วงแรดมะพร้าว', 'ด'],
    ['tree', 'ยางกราด', 'ยางกราด', 'ย'],
    ['bird', 'นกยางเปีย', 'ยางเปีย', 'ย'],
    ['fish', 'ปลานิลแดง', 'นิลแดง', 'น'],
    ['insect', 'แมลงดานา', 'ดานา', 'ด'],
    ['tree', 'โกงกางใบใหญ่', 'โกงกางใบใหญ่', 'ก'],
    ['flower', 'หิรัญญิการ์', 'หิรัญญิการ์', 'ห'],
    ['flower', 'เอื้องผึ้ง', 'เอื้องผึ้ง', 'อ'],
    ['bird', 'นกนางนวลหัวดำ', 'นางนวลหัวดำ', 'น'],
    ['fish', 'ปลาสเตอร์เจียน', 'สเตอร์เจียน', 'ส'],
  ];
  for (const [category, word, canonical, initial] of examples) {
    assert.equal(canonicalAnswer(word, category), canonical);
    assert.equal(wordInitialForCategory(word, category), initial);
  }
});


/**
 * The original AI-1 module had 155 terms before the reviewed additions.
 * Check all subsequent additions (including later PRs) across categories,
 * without penalizing historically shared names in the original baseline.
 */
test('AI-1 additions since the 155-term baseline have unique literal spelling across the entire registered word bank', () => {
  const baseline: Readonly<Record<string, number>> = {
    animal: 21, bird: 21, fish: 19, insect: 17,
    plant: 23, tree: 21, flower: 18, nature: 15,
  };
  const additions = Object.entries(AI1_NATURE_TERMS).flatMap(([category, terms]) =>
    terms.slice(baseline[category]).map(word => ({ category, word })));
  assert.equal(additions.length, 183, 'AI-1 must contain 183 net new nature names after the 155-term baseline');

  for (const { category, word } of additions) {
    const initial = wordInitialForCategory(word, category);
    assert.ok((LETTERS as readonly string[]).includes(initial), `${word} must start with a currently playable consonant`);
    const normalized = normalizeAnswer(word).toLocaleLowerCase('th');
    for (const [bankCategory, bankWords] of Object.entries(WORD_BANK)) {
      const occurrences = bankWords.filter(existing =>
        normalizeAnswer(existing).toLocaleLowerCase('th') === normalized).length;
      assert.equal(occurrences, bankCategory === category ? 1 : 0,
        `${word} must not duplicate a literal name in ${bankCategory}`);
    }
  }
});

// Semantic and gameplay regression cases flagged by independent AI-5 QA.
test('AI-1 does not reintroduce unplayable or semantically duplicate names', () => {
  assert.ok(WORD_BANK.nature.includes('ผาหินปูน'), 'Existing limestone cliff must remain in the dictionary');
  assert.ok(!AI1_NATURE_TERMS.nature.includes('หน้าผาหินปูน'), 'Do not count limestone cliff twice by rephrasing it');
  assert.ok(!AI1_NATURE_TERMS.animal.includes('ไฮยีนาลายจุด'), 'ฮ is not currently playable');
  assert.ok(!AI1_NATURE_TERMS.nature.includes('ธารน้ำร้อน'), 'ธ is not currently playable');
});
