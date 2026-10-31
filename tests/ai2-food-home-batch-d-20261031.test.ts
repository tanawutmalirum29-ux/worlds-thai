import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_D } from '../amplify/functions/game/ai2-food-home-batch-d-20261031.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer } from '../amplify/functions/game/moderation.ts';

test('AI-2 batches D, E, F and G register 58 distinct canonical answers in only owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_D).sort(), ['dessert', 'drink', 'food']);
  assert.equal(AI2_FOOD_HOME_BATCH_D.food.length, 40);
  assert.equal(AI2_FOOD_HOME_BATCH_D.dessert.length, 8);
  assert.equal(AI2_FOOD_HOME_BATCH_D.drink.length, 10);
  assert.equal(Object.values(AI2_FOOD_HOME_BATCH_D).flat().length, 58);

  for (const [category, words] of Object.entries(AI2_FOOD_HOME_BATCH_D)) {
    assert.equal(new Set(words).size, words.length, 'duplicate spelling in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size,
      words.length, 'duplicate canonical identity in ' + category);
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'not NFC/trimmed: ' + word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.ok(WORD_BANK[category].includes(word), 'missing from live bank: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length,
        1, 'canonical duplicate in entire bank: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid initial: ' + word);
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true, 'not playable: ' + word);
    }
  }
});

test('AI-2 batch E registers exactly 12 new foods and one drink', () => {
  const additions = {
    food: [
      'ฉู่ฉี่ปลาทู', 'แกงหน่อไม้', 'แกงคั่วหอยขม', 'ผัดผักกูด',
      'คั่วกลิ้งหมู', 'ไก่ผัดเม็ดมะม่วงหิมพานต์', 'ต้มโคล้งปลากรอบ',
      'หมี่กะทิ', 'ซี่โครงหมูอบน้ำผึ้ง', 'ยำดอกขจร',
      'ปลาทอดขมิ้น', 'ต้มกะทิสายบัว'
    ],
    drink: ['ชาดอกมะลิ']
  } as const;
  assert.equal(additions.food.length, 12);
  assert.equal(additions.drink.length, 1);
  for (const [category, words] of Object.entries(additions)) {
    for (const word of words) {
      assert.ok(AI2_FOOD_HOME_BATCH_D[category as 'food' | 'drink'].includes(word), word);
      assert.equal(WORD_BANK[category].filter(
        entry => canonicalAnswer(entry, category) === canonicalAnswer(word, category)
      ).length, 1, 'duplicate canonical identity: ' + category + '/' + word);
      assert.equal(isInappropriateLanguage(word), false, word);
      assert.equal(isBlockedStandaloneAnswer(word), false, word);
    }
  }
});

test('AI-2 batch D preserves existing dessert prefix and vegetable prefix behavior', () => {
  assert.equal(wordInitialForCategory('ขนมข้าวโป่ง', 'dessert'), 'ข');
  assert.equal(wordInitialForCategory('ขนมรังผึ้ง', 'dessert'), 'ร');
  assert.equal(wordInitialForCategory('ขนมโก๋', 'dessert'), 'ก');
  assert.equal(wordInitialForCategory('ขนมปั้นขลิบ', 'dessert'), 'ป');
  assert.equal(wordInitialForCategory('ขนมไข่กรอบ', 'dessert'), 'ข');
  assert.equal(wordInitialForCategory('ยำขนมจีน', 'food'), 'ย');
  assert.equal(wordInitialForCategory('ผักบุ้ง', 'vegetable'), 'บ');
  assert.equal(canonicalAnswer('ผักบุ้ง', 'vegetable'), 'บุ้ง');
});

test('AI-2 batch F registers 14 real dishes and one dessert with unique canonical answers', () => {
  const additions = {
    food: [
      'ฉู่ฉี่กุ้ง',
      'ผัดสะตอกะปิกุ้ง',
      'ผัดผักเชียงดา',
      'ยำผักกูด',
      'ซุปขนุน',
      'ผัดยอดฟักแม้ว',
      'แกงเห็ดเผาะ',
      'แกงอ่อมไก่',
      'ต้มยำปลาคัง',
      'แกงคั่วสับปะรด',
      'คั่วกลิ้งไก่',
      'แกงคั่วหอยแครง',
      'ซุปมะเขือ',
      'ผัดดอกขจร'
    ],
    dessert: ['ขนมกลีบลำดวน']
  } as const;
  assert.equal(additions.food.length, 14);
  assert.equal(additions.dessert.length, 1);
  for (const [category, words] of Object.entries(additions)) {
    for (const word of words) {
      assert.ok(AI2_FOOD_HOME_BATCH_D[category as 'food' | 'dessert'].includes(word), word);
      assert.equal(WORD_BANK[category].filter(entry =>
        canonicalAnswer(entry, category) === canonicalAnswer(word, category)).length,
        1, 'duplicate in live bank: ' + category + '/' + word);
      assert.equal(isInappropriateLanguage(word), false, word);
      assert.equal(isBlockedStandaloneAnswer(word), false, word);
    }
  }
  assert.equal(wordInitialForCategory('ขนมกลีบลำดวน', 'dessert'), 'ก');
});


test('AI-2 batch G adds four dishes, two desserts and four drinks with unique canonical answers', () => {
  const additions = {
    food: ['ซุบหน่อไม้', 'ก้อยไข่มดแดง', 'แหนมเนือง', 'ยำแหนม'],
    dessert: ['ขนมตะลุ่ม', 'ขนมโสมนัส'],
    drink: ['น้ำจับเลี้ยง', 'น้ำลูกเดือย', 'น้ำบ๊วย', 'นมถั่วดำ']
  } as const;
  assert.equal(Object.values(additions).flat().length, 10);
  for (const [category, words] of Object.entries(additions)) {
    for (const word of words) {
      assert.ok(AI2_FOOD_HOME_BATCH_D[category as 'food' | 'dessert' | 'drink'].includes(word), word);
      assert.equal(WORD_BANK[category].filter(entry =>
        canonicalAnswer(entry, category) === canonicalAnswer(word, category)).length,
        1, 'duplicate canonical identity: ' + category + '/' + word);
      assert.equal(isInappropriateLanguage(word), false, word);
      assert.equal(isBlockedStandaloneAnswer(word), false, word);
      const initial = wordInitialForCategory(word, category);
      assert.match(initial, /^[ก-ฮ]$/, 'invalid consonant: ' + word);
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + word);
    }
  }
  assert.equal(wordInitialForCategory('ขนมตะลุ่ม', 'dessert'), 'ต');
  assert.equal(wordInitialForCategory('ขนมโสมนัส', 'dessert'), 'ส');
  assert.equal(wordInitialForCategory('ซุบหน่อไม้', 'food'), 'ซ');
  assert.equal(canonicalAnswer('ขนมตะลุ่ม', 'dessert'), 'ขนมตะลุ่ม');
});
