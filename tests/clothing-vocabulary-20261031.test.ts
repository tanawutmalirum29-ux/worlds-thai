import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage }
  from '../amplify/functions/game/moderation.ts';

/** Familiar garment/accessory vocabulary added on 31 Oct 2026. */
const CLOTHING_ADDITIONS = [
  'เสื้อโค้ต', 'เสื้อคอจีน', 'เสื้อคลุมอาบน้ำ', 'เสื้อเชิ้ตแขนสั้น',
  'กระโปรงสั้น', 'กระโปรงทรงเอ', 'กางเกงขาเดฟ', 'กางเกงกระโปรง',
  'รองเท้าคัทชู', 'รองเท้าสตั๊ด', 'รองเท้าสลิปออน', 'หมวกฟาง',
  'หมวกบักเก็ต', 'หมวกว่ายน้ำ', 'ถุงน่อง', 'ผ้ากันเปื้อน',
  'ผ้าคลุมไหล่', 'เข็มขัด', 'ชุดลูกเสือ', 'ชุดเนตรนารี'
] as const;

test('clothing additions register 20 distinct, clean and playable Thai terms', () => {
  assert.equal(CLOTHING_ADDITIONS.length, 20);
  const identities = CLOTHING_ADDITIONS.map(word => canonicalAnswer(word, 'clothing'));
  assert.equal(new Set(identities).size, 20, 'duplicate canonical identity in additions');
  for (const word of CLOTHING_ADDITIONS) {
    assert.equal(word, word.trim().normalize('NFC'), 'incorrect spacing/Unicode: ' + word);
    assert.equal(isInappropriateLanguage(word), false, 'inappropriate word: ' + word);
    assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked word: ' + word);
    const initial = wordInitialForCategory(word, 'clothing');
    assert.ok(initial && initial.length === 1, 'invalid Thai initial: ' + word);
    const matches = WORD_BANK.clothing.filter(entry =>
      canonicalAnswer(entry, 'clothing') === canonicalAnswer(word, 'clothing'));
    assert.equal(matches.length, 1, 'unregistered or duplicated term: ' + word);
    if (eligibleCategories(initial).includes('clothing'))
      assert.equal(validAnswer(word, initial, 'clothing'), true,
        'rejected playable clothing term: ' + word);
  }
});

test('new clothing words appear exactly once in the base category literals', () => {
  const source = readFileSync(new URL('../amplify/functions/game/dictionary.ts', import.meta.url), 'utf8');
  const clothingSection = source.split('  "clothing": [')[1]?.split('  "vehicle": [')[0];
  assert.ok(clothingSection, 'missing clothing category');
  for (const word of CLOTHING_ADDITIONS) {
    const quoted = '"' + word + '"';
    assert.equal(clothingSection.split(quoted).length - 1, 1,
      'word must appear once in the clothing category: ' + word);
  }
});
