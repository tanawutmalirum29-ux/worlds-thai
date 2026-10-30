import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer }
  from '../amplify/functions/game/moderation.ts';

/** AI-4 manually reviewed objects/geography batch; no gameplay-rule changes. */
const REVIEWED: Readonly<Record<string, readonly [string, string][]>> = {
  clothing: [
    ['ชุดไทย', 'ช'],
    ['ชุดหมี', 'ช'],
    ['เสื้อคอเต่า', 'ส'],
    ['ผ้าคาดเอว', 'ผ'],
  ],
  vehicle: [
    ['รถโม่ปูน', 'ร'],
    ['รถยก', 'ร'],
    ['บอลลูนลมร้อน', 'บ'],
    ['เลื่อนหิมะ', 'ล'],
  ],
  device: [
    ['เครื่องทำน้ำอุ่น', 'ค'],
    ['เครื่องซีลถุง', 'ค'],
    ['กระทะไฟฟ้า', 'ก'],
    ['หม้อหุงข้าวไฟฟ้า', 'ห'],
  ],
  tool: [
    ['เหล็กส่ง', 'ห'],
    ['สว่านมือ', 'ส'],
    ['สว่านแท่น', 'ส'],
    ['ประแจจับท่อ', 'ป'],
  ],
  place: [
    ['ที่ว่าการอำเภอ', 'ท'],
    ['สถานีอนามัย', 'ส'],
    ['โรงภาพยนตร์', 'ร'],
    ['โรงยิม', 'ร'],
  ],
};

test('AI-4 registers 20 normalized, category-correct distinct Thai terms', () => {
  const categories = Object.keys(REVIEWED);
  assert.deepEqual(categories, ['clothing', 'vehicle', 'device', 'tool', 'place']);
  assert.equal(Object.values(REVIEWED).flat().length, 20);
  const allWords = Object.values(REVIEWED).flat().map(([word]) => word);
  assert.equal(new Set(allWords).size, 20, 'duplicate across AI-4 batch');

  for (const [category, entries] of Object.entries(REVIEWED)) {
    assert.equal(entries.length, 4, 'incorrect category count: ' + category);
    assert.ok(Object.prototype.hasOwnProperty.call(WORD_BANK, category));
    const canonicalWords = entries.map(([word]) => canonicalAnswer(word, category));
    assert.equal(new Set(canonicalWords).size, entries.length,
      'canonical collision within AI-4 category: ' + category);
    for (const [word, initial] of entries) {
      assert.equal(word, word.trim().normalize('NFC'), 'Unicode or spacing: ' + word);
      assert.ok(word.length > 1 && word.length <= 48, 'invalid answer length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation rejected: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'standalone block: ' + word);
      assert.equal(wordInitialForCategory(word, category), initial, 'wrong initial: ' + word);
      assert.equal(
        WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonicalAnswer(word, category)).length,
        1, 'duplicate or missing canonical word in live bank: ' + category + '/' + word
      );
      if (eligibleCategories(initial).includes(category)) {
        assert.equal(validAnswer(word, initial, category), true,
          'registered AI-4 answer rejected: ' + category + '/' + word);
      }
    }
  }
});
