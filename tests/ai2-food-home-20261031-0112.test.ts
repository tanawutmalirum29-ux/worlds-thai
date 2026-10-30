import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { ADDITIONAL_DESSERT_GROUPS } from '../amplify/functions/game/additional-desserts.ts';
import { ADDITIONAL_DRINK_GROUPS } from '../amplify/functions/game/additional-drinks.ts';
import { ADDITIONAL_VEGETABLE_GROUPS } from '../amplify/functions/game/additional-vegetables.ts';
import {
  canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory
} from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

// AI-2 only: 20 recognized Thai food-and-home vocabulary entries.
// This is data-only: no scoring, normalization, or category rules are changed.
const AI2_WORDS = {
  dessert: [
    'ขนมลืมกลืน', 'ครองแครงกะทิ', 'ครองแครงกรอบ',
    'ขนมหม้อแกงเผือก', 'ขนมหม้อแกงถั่ว', 'ขนมเหนียว',
    'ขนมเทียนไส้เค็ม', 'บ้าบิ่นมะพร้าวอ่อน', 'ข้าวเหนียวตัด', 'สำปันนี'
  ],
  drink: [
    'น้ำหล่อฮังก๊วย', 'น้ำลูกสำรอง', 'น้ำพุทราจีน',
    'น้ำส้มจี๊ด', 'น้ำมะนาวดอง'
  ],
  vegetable: [
    'ตั้งโอ๋', 'จิงจูฉ่าย', 'ผักชะคราม', 'ผักหูเสือ', 'ผักสันตะวา'
  ]
} as const;

test('AI-2 registers exactly 20 distinct, clean words in owned categories', () => {
  assert.equal(Object.values(AI2_WORDS).reduce((sum, words) => sum + words.length, 0), 20);
  for (const [category, words] of Object.entries(AI2_WORDS)) {
    assert.equal(new Set(words).size, words.length, 'literal duplicate in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size,
      words.length, 'canonical duplicate in ' + category);
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'not normalized: ' + word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate word: ' + word);
      assert.ok(WORD_BANK[category].includes(word), 'not registered: ' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid initial: ' + word);
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + word);
    }
  }
});

test('AI-2 words are in existing groups, not newly invented game categories', () => {
  for (const word of AI2_WORDS.dessert)
    assert.ok(ADDITIONAL_DESSERT_GROUPS.thai.includes(word as never), word);
  for (const word of AI2_WORDS.drink)
    assert.ok(ADDITIONAL_DRINK_GROUPS.herbal.includes(word as never), word);
  for (const word of AI2_WORDS.vegetable)
    assert.ok(ADDITIONAL_VEGETABLE_GROUPS['ผักพื้นบ้านและดอกกินได้'].includes(word as never), word);
});

test('dessert ขนม and vegetable ผัก prefixes retain the existing consonant rules', () => {
  assert.equal(wordInitialForCategory('ขนมลืมกลืน', 'dessert'), 'ล');
  assert.equal(wordInitialForCategory('ขนมหม้อแกงเผือก', 'dessert'), 'ห');
  assert.equal(wordInitialForCategory('ขนมเทียนไส้เค็ม', 'dessert'), 'ท');
  assert.equal(wordInitialForCategory('ผักชะคราม', 'vegetable'), 'ช');
  assert.equal(wordInitialForCategory('ผักหูเสือ', 'vegetable'), 'ห');
  assert.equal(wordInitialForCategory('ผักสันตะวา', 'vegetable'), 'ส');
  assert.equal(canonicalAnswer('ผักชะคราม', 'vegetable'), 'ชะคราม');
  assert.equal(canonicalAnswer('ขนมลืมกลืน', 'dessert'), 'ขนมลืมกลืน');
});
