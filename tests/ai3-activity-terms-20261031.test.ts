import test from 'node:test';
import assert from 'node:assert/strict';
import { AI3_ACTIVITY_TERMS } from '../amplify/functions/game/ai3-activity-terms-20261031.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage }
  from '../amplify/functions/game/moderation.ts';

const EXPECTED_INITIALS: Readonly<Record<string, readonly string[]>> = {
  job: ['น', 'น', 'ช', 'น', 'น', 'ช', 'น', 'ช', 'น', 'น', 'ช', 'น', 'ผ', 'น', 'ช', 'น', 'น', 'ช', 'ว', 'ช', 'น', 'ผ', 'ช', 'น', 'ช', 'ว', 'ผ', 'น', 'ช', 'จ'],
  verb: ['ค', 'พ', 'ล', 'ป', 'ถ', 'ถ', 'ก', 'ย', 'ข', 'ต', 'ค', 'ก', 'ข', 'จ', 'ด', 'ส', 'ร', 'ด', 'ฟ', 'ย', 'ข', 'ฝ', 'ล', 'ข', 'ร', 'ห', 'ถ', 'ฝ', 'ฟ', 'ห'],
  sport: ['ส', 'พ', 'ฟ', 'ท', 'ร', 'บ', 'พ', 'ท', 'ร', 'ว', 'ค', 'ป', 'พ', 'ส', 'ต', 'ย', 'อ', 'ส', 'บ', 'พ', 'ย', 'ข', 'ว', 'ต', 'ย', 'ส', 'ว', 'ค', 'ย', 'ฟ'],
  music: ['ว', 'ก', 'ค', 'ท', 'ค', 'อ', 'ก', 'ค', 'ค', 'ป', 'ข', 'ก', 'ป', 'ป', 'ก', 'ก', 'ว', 'ป', 'ก', 'พ', 'ร', 'ซ', 'ห', 'ก', 'ฮ', 'ป', 'ต'],
  toy: ['ห', 'ห', 'ก', 'ค', 'ช', 'ก', 'บ', 'ร', 'ล', 'ก', 'ก', 'บ', 'ก', 'ล', 'ต', 'ก', 'ร', 'ก', 'ร'],
  school: ['ก', 'ป', 'ต', 'ฟ', 'ค', 'ส', 'ก', 'บ', 'ก', 'ม', 'ท', 'ฟ', 'ซ', 'ก', 'ค', 'ฟ', 'ท', 'ว', 'ผ', 'ค', 'ก', 'บ', 'ย', 'ฟ', 'ส', 'ท', 'ส', 'ป', 'ก'],
  body: ['ก', 'ก', 'ข', 'ย', 'ย', 'ต', 'ส', 'ก', 'ต', 'ก', 'ส', 'ย', 'ต', 'อ', 'ก', 'ส', 'ล', 'ห', 'ล', 'ต', 'ห', 'ก', 'ต', 'ส', 'ส', 'ก', 'ส', 'ต', 'ท', 'ย'],
};

test('AI-3 registers 195 reviewed activity terms without duplicate canonical identities', () => {
  assert.deepEqual(Object.keys(AI3_ACTIVITY_TERMS), Object.keys(EXPECTED_INITIALS));
  const all = Object.values(AI3_ACTIVITY_TERMS).flat();
  assert.equal(all.length, 195);
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

const BATCH_TEN: Readonly<Record<string, readonly string[]>> = {
  job: ['นักวางผังเมือง', 'ช่างเชื่อมโลหะ', 'เจ้าพนักงานเภสัชกรรม'],
  verb: ['ฝัดข้าว', 'ฟั่นเชือก', 'หยอดเมล็ด'],
  sport: ['คินบอล', 'ยิงธนูเป้า', 'ฟันดาบเอเป้'],
  music: ['ฮาร์ปซิคอร์ด', 'ปี่ไฉน', 'แตรบาริโทน'],
  toy: ['เกมจับคู่ภาพ', 'รถของเล่นลากจูง'],
  school: ['สมุดกราฟ', 'ปากกาไวท์บอร์ด', 'กระดาษคาร์บอน'],
  body: ['ต่อมน้ำตา', 'ท่อน้ำดี', 'เยื่อบุตา'],
};

test('AI-3 batch 10 terms are unique across all registered categories', () => {
  const registered = Object.values(WORD_BANK).flat().map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_TEN)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing AI-3 term: ' + word);
      assert.equal(registered.filter(entry => entry === word.normalize('NFC').toLocaleLowerCase('th')).length,
        1, 'cross-category spelling duplicate: ' + word);
    }
  }
});
