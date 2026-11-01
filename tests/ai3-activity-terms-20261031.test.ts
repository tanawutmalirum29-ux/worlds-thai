import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { AI3_ACTIVITY_TERMS } from '../amplify/functions/game/ai3-activity-terms-20261031.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage }
  from '../amplify/functions/game/moderation.ts';

const EXPECTED_INITIALS: Readonly<Record<string, readonly string[]>> = {
  job: ['น', 'น', 'ช', 'น', 'น', 'ช', 'น', 'ช', 'น', 'น', 'ช', 'น', 'ผ', 'น', 'ช', 'น', 'น', 'ช', 'ว', 'ช', 'น', 'ผ', 'ช', 'น', 'ช', 'ว', 'ผ', 'น', 'ผ', 'จ', 'ช', 'ช', 'ผ', 'น', 'ช', 'ช', 'น', 'น', 'ช', 'น', 'น', 'ช', 'น', 'ช', 'ช', 'น', 'ช', 'น', 'ช', 'น', 'ช', 'น', 'น', 'ช', 'ช', 'น', 'น', 'น', 'ช', 'น', 'ช', 'น', 'ช', 'ช', 'ผ', 'ช', 'ช', 'น', 'น'],
  verb: ['ค', 'พ', 'ล', 'ป', 'ถ', 'ถ', 'ก', 'ย', 'ข', 'ต', 'ค', 'ก', 'ข', 'จ', 'ด', 'ส', 'ร', 'ด', 'ฟ', 'ย', 'ข', 'ฝ', 'ล', 'ข', 'ร', 'ห', 'ถ', 'ส', 'ฟ', 'ห', 'บ', 'ร', 'ต', 'พ', 'ห', 'ป', 'ค', 'ก', 'ล', 'ผ', 'ต', 'บ', 'ก', 'ด', 'ห', 'ข', 'ท', 'ค', 'ห', 'ฟ', 'ว', 'ส', 'ส', 'ข', 'ล', 'ว', 'ห', 'ซ', 'ค', 'ย', 'ย', 'ถ', 'ค', 'ล', 'ห', 'ผ', 'ล', 'พ', 'ช'],
  sport: ['ส', 'พ', 'ฟ', 'ท', 'ร', 'บ', 'พ', 'ท', 'ร', 'ว', 'ค', 'ป', 'พ', 'ส', 'ต', 'ย', 'อ', 'ส', 'บ', 'พ', 'ย', 'ข', 'ว', 'ต', 'ย', 'ส', 'ว', 'ค', 'ร', 'ค', 'ค', 'ค', 'ซ', 'ย', 'ร', 'ส', 'ฟ', 'ฟ', 'ก', 'ซ', 'ซ', 'อ', 'ค', 'พ', 'ส', 'ส', 'ร', 'ส', 'จ', 'ค', 'ร', 'ส', 'พ', 'ว', 'ร', 'ต', 'ว', 'พ', 'จ', 'ย', 'ก', 'ร', 'ส', 'ส', 'ส', 'ย', 'ย', 'ส', 'ส'],
  music: ['ว', 'ก', 'ค', 'ท', 'ค', 'อ', 'ก', 'ค', 'ค', 'ป', 'ข', 'ก', 'ป', 'ป', 'ก', 'ก', 'ว', 'ป', 'ก', 'พ', 'ร', 'ซ', 'ห', 'ก', 'ค', 'ป', 'ต', 'บ', 'ช', 'ด', 'ค', 'ก', 'ด', 'ซ', 'อ', 'ก', 'อ', 'ก', 'ว', 'พ', 'ค', 'บ', 'พ', 'ซ', 'ม', 'ก', 'ก', 'ฉ', 'ก', 'ท', 'อ', 'ป', 'ห', 'ต', 'ค', 'อ', 'ก', 'ก', 'ก', 'อ', 'ก', 'ค', 'ซ', 'ซ', 'ด', 'ร'],
  toy: ['ห', 'ห', 'ก', 'ค', 'ช', 'ก', 'บ', 'ร', 'ล', 'ก', 'ก', 'บ', 'ก', 'ล', 'ต', 'ก', 'ร', 'ก', 'ก', 'ก', 'ก', 'ก', 'ช', 'ก', 'ก', 'ก', 'ห', 'ช', 'ก', 'ช', 'ก', 'ต', 'ต', 'ล', 'ก', 'ว', 'ห', 'ก', 'ห', 'ร', 'ก', 'ก', 'ห', 'เ', 'เ'],
  school: ['ก', 'ป', 'ต', 'ฟ', 'ค', 'ส', 'ก', 'บ', 'ก', 'ม', 'ท', 'ฟ', 'ซ', 'ก', 'ค', 'ฟ', 'ท', 'ว', 'ผ', 'ค', 'ก', 'บ', 'ย', 'ฟ', 'ส', 'ท', 'ส', 'ป', 'ก', 'ก', 'ส', 'ส', 'ก', 'บ', 'ก', 'ห', 'ต', 'ผ', 'จ', 'ท', 'ท', 'ก', 'ผ', 'ก', 'ต', 'ผ', 'ข', 'บ', 'ข', 'ก', 'ก', 'ข', 'ห', 'พ', 'ก', 'ส', 'ม', 'ป', 'ข', 'ค', 'ท', 'ก', 'ป', 'ห', 'ก', 'ก', 'เ', 'ท'],
  body: ['ก', 'ก', 'ข', 'ย', 'ย', 'ต', 'ส', 'ก', 'ต', 'ก', 'ส', 'ย', 'ต', 'อ', 'ก', 'ส', 'ล', 'ห', 'ล', 'ต', 'ห', 'ก', 'ต', 'ส', 'ส', 'ก', 'ส', 'ต', 'ท', 'ย', 'ส', 'ข', 'ก', 'ท', 'ต', 'ถ', 'ส', 'ส', 'ล', 'ส', 'ย', 'ก', 'ก', 'ส', 'ย', 'ส', 'ก', 'ก', 'ก', 'ส', 'ล', 'ก', 'ห', 'ส', 'ก', 'ห', 'ส', 'ส', 'ก', 'ต', 'ก', 'ก', 'ก', 'ห', 'ก', 'ย', 'ก', 'ก', 'ห'],
};

test('AI-3 registers 455 reviewed activity terms without duplicate canonical identities', () => {
  assert.deepEqual(Object.keys(AI3_ACTIVITY_TERMS), Object.keys(EXPECTED_INITIALS));
  const all = Object.values(AI3_ACTIVITY_TERMS).flat();
  assert.equal(all.length, 455);
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
  job: ['นักวางผังเมือง', 'ผู้ตรวจสอบอาคาร', 'เจ้าพนักงานเภสัชกรรม'],
  verb: ['สาวไหม', 'ฟั่นเชือก', 'หยอดเมล็ด'],
  sport: ['คินบอล', 'ราวด์เน็ต', 'โครเกต์'],
  music: ['โคโตะ', 'ปี่ไฉน', 'แตรบาริโทน'],
  toy: ['เกมลูโด', 'เกมทวิสเตอร์'],
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


test('AI-3 batch 10 entries are all playable in an actual eligible round', () => {
  for (const [category, words] of Object.entries(BATCH_TEN)) {
    for (const word of words) {
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category),
        'unavailable round: ' + category + '/' + word + ' (' + initial + ')');
      assert.equal(validAnswer(word, initial, category), true,
        'unplayable batch-10 term: ' + category + '/' + word);
    }
  }
});

// Guard against semantically identical names that are not yet canonical aliases.
test('AI-3 does not re-add known job sport and toy synonyms as separate answers', () => {
  const semanticPairs: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
    job: [['ช่างเชื่อม', 'ช่างเชื่อมโลหะ']],
    sport: [['ฟันดาบ', 'ฟันดาบเอเป้']],
    toy: [['เกมจับคู่', 'เกมจับคู่ภาพ'], ['รถของเล่น', 'รถของเล่นลากจูง']],
  };
  for (const [category, pairs] of Object.entries(semanticPairs)) {
    const known = new Set(WORD_BANK[category].map(word => word.normalize('NFC').toLocaleLowerCase('th')));
    for (const [generic, equivalent] of pairs) {
      assert.ok(!(known.has(generic) && known.has(equivalent)),
        'semantic duplicate: ' + category + '/' + generic + ' ~ ' + equivalent);
    }
  }
});


// AI-3 batch 11: only new, distinct, currently playable answers.
const BATCH_ELEVEN: Readonly<Record<string, readonly string[]>> = {
  job: ['ช่างซ่อมเครื่องบิน', 'ช่างปักผ้า', 'ผู้ควบคุมปั้นจั่น'],
  verb: ['บิดผ้า', 'ร้อยลูกปัด', 'ตอกตะปู'],
  sport: ['ไคท์เซิร์ฟ', 'คอร์นโฮล', 'ไซเคิลโปโล'],
  music: ['บาลาไลก้า', 'ชามิเซ็น', 'ดูดุก'],
  toy: ['เกมโอเทลโล', 'เกมสแครบเบิล'],
  school: ['กระดาษลิตมัส', 'ไส้ดินสอกด', 'สันรูดพลาสติก'],
  body: ['เส้นประสาทรับกลิ่น', 'ข้อต่อขากรรไกร', 'กระดูกสะบ้า'],
};

test('AI-3 batch 11 adds exactly 20 unique and playable reviewed answers', () => {
  const additions = Object.values(BATCH_ELEVEN).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, additions.length);
  const allRegistered = Object.values(WORD_BANK).flat()
    .map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_ELEVEN)) {
    const canonicalInCategory = WORD_BANK[category].map(word => canonicalAnswer(word, category));
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(allRegistered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category spelling collision: ' + word);
      assert.equal(canonicalInCategory.filter(value => value === canonicalAnswer(word, category)).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});

// AI-5 semantic QA: the drafting T-square is already registered as ไม้ที.
// A longer descriptive name must not be counted as a distinct school item.
test('AI-3 does not duplicate the existing T-square under a descriptive name', () => {
  assert.ok(WORD_BANK.school.includes('ไม้ที'), 'baseline T-square missing');
  assert.ok(!WORD_BANK.school.includes('ไม้ทีเขียนแบบ'), 'duplicate T-square reintroduced');
  assert.ok(AI3_ACTIVITY_TERMS.school.includes('กระดาษลิตมัส'), 'replacement litmus paper missing');
  assert.equal(wordInitialForCategory('กระดาษลิตมัส', 'school'), 'ก');
  assert.equal(validAnswer('กระดาษลิตมัส', 'ก', 'school'), true);
});


// AI-3 batch 12: real, canonical-unique, playable words in all seven owned categories.
const BATCH_TWELVE: Readonly<Record<string, readonly string[]>> = {
  job: ['นักบินโดรน', 'ช่างติดตั้งโซลาร์เซลล์', 'ช่างซ่อมเครื่องถ่ายเอกสาร'],
  verb: ['เพาะเห็ด', 'หมักปุ๋ย', 'ปักชำ'],
  sport: ['ยิงเป้าบิน', 'แร็กเกตบอล', 'สแลคไลน์'],
  music: ['คีย์ตาร์', 'กลองอูดู', 'ดิดเจอรีดู'],
  toy: ['เกมบิงโก', 'ชุดทดลองภูเขาไฟจำลอง'],
  school: ['กล่องใส่ชอล์ก', 'บัตรดัชนี', 'กระดาษโน้ตห้าเส้น'],
  body: ['ท่อนำไข่', 'ต่อมใต้สมอง', 'ถุงน้ำดี'],
};

test('AI-3 batch 12 adds 20 distinct and playable human-activities answers', () => {
  const additions = Object.values(BATCH_TWELVE).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, additions.length);
  const allRegistered = Object.values(WORD_BANK).flat()
    .map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_TWELVE)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(allRegistered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category spelling collision: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});

// AI-3 batch 13: category-specific, non-aliased terms with playable initials.
const BATCH_THIRTEEN: Readonly<Record<string, readonly string[]>> = {
  job: ['นักออกแบบภูมิทัศน์', 'นักจดหมายเหตุ', 'ช่างเทคนิคเครื่องมือแพทย์'],
  verb: ['คัดเมล็ด', 'กรีดยาง', 'ลอกเปลือก'],
  sport: ['ฟิสต์บอล', 'ฟุตเน็ต', 'โกลบอล'],
  music: ['ซานตูร์', 'เอ้อหู', 'กู่เจิง'],
  toy: ['เกมคาตัน', 'เกมทาบู'],
  school: ['หลอดทดลอง', 'ตะแกรงลวด', 'แผ่นแม่เหล็กตัวอักษร'],
  body: ['ไส้ติ่ง', 'เส้นประสาทไตรเจมินัล', 'ลิ้นหัวใจไตรคัสปิด'],
};

test('AI-3 batch 13 adds 20 unique, clean and playable reviewed answers', () => {
  const additions = Object.values(BATCH_THIRTEEN).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, additions.length);
  const allRegistered = Object.values(WORD_BANK).flat()
    .map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_THIRTEEN)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(allRegistered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category spelling collision: ' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});

// AI-5 semantic QA: an air-conditioner mechanic is already registered under two names.
// Do not count the longer synonym as a new occupation when aliases are not canonicalized.
test('AI-3 does not reintroduce the existing air-conditioner mechanic occupation', () => {
  assert.ok(WORD_BANK.job.includes('ช่างซ่อมแอร์'), 'existing occupation missing');
  assert.ok(WORD_BANK.job.includes('ช่างแอร์'), 'existing short title missing');
  assert.ok(!WORD_BANK.job.includes('ช่างซ่อมเครื่องปรับอากาศ'), 'semantic duplicate reintroduced');
  assert.ok(AI3_ACTIVITY_TERMS.job.includes('นักจดหมายเหตุ'), 'archivist replacement missing');
  assert.equal(wordInitialForCategory('นักจดหมายเหตุ', 'job'), 'น');
  assert.equal(validAnswer('นักจดหมายเหตุ', 'น', 'job'), true);
});

// Batch 14 (1 Nov 2026): reviewed activities, real instruments and classroom lab equipment.
const BATCH_FOURTEEN: Readonly<Record<string, readonly string[]>> = {
  "job": [
    "นักภาษาศาสตร์",
    "นักวิทยาศาสตร์อาหาร",
    "ช่างทำนาฬิกา"
  ],
  "verb": [
    "ผสมปูน",
    "ตวงแป้ง",
    "บดกาแฟ"
  ],
  "sport": [
    "แซมโบ",
    "เซิร์ฟสเกต",
    "อัลติเมตจานร่อน"
  ],
  "music": [
    "โอโบ ดาโมเร่",
    "กลองเหล็ก",
    "ไวโอลินไฟฟ้า"
  ],
  "toy": [
    "กระดานเขาวงกตลูกเหล็ก",
    "เหมียวระเบิด"
  ],
  "school": [
    "จานเพาะเชื้อ",
    "แท่งแก้วคนสาร",
    "ที่วางหลอดทดลอง"
  ],
  "body": [
    "เส้นเลือดฝอย",
    "เยื่อหุ้มสมอง",
    "กระดูกขมับ"
  ]
};

test('AI-3 batch 14 contributes 20 distinct, clean, currently playable answers', () => {
  const additions = Object.values(BATCH_FOURTEEN).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, additions.length);
  const registered = Object.values(WORD_BANK).flat()
    .map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_FOURTEEN)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'exact collision: ' + category + '/' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});

// AI-5 lexical QA: use attested Thai product/instrument names, not invented translations.
test('AI-3 batch 14 uses attested Thai names and rejects rejected spellings', () => {
  assert.ok(AI3_ACTIVITY_TERMS.toy.includes('เหมียวระเบิด'));
  assert.ok(!WORD_BANK.toy.includes('เกมระเบิดแมว'));
  assert.ok(AI3_ACTIVITY_TERMS.music.includes('โอโบ ดาโมเร่'));
  assert.ok(!WORD_BANK.music.includes('โอโบอามอร์'));
  assert.equal(wordInitialForCategory('เหมียวระเบิด', 'toy'), 'ห');
  assert.equal(validAnswer('เหมียวระเบิด', 'ห', 'toy'), true);
  assert.equal(wordInitialForCategory('โอโบ ดาโมเร่', 'music'), 'อ');
  assert.equal(validAnswer('โอโบ ดาโมเร่', 'อ', 'music'), true);
});

// Batch 15 (1 Nov 2026): only real human-activity terms, no generic-prefix job stripping.
const BATCH_FIFTEEN: Readonly<Record<string, readonly string[]>> = {
  job: ['นักกีฏวิทยา', 'ช่างแกะสลักหิน', 'ช่างทำหัวโขน'],
  verb: ['เกี่ยวข้าว', 'ดำนา', 'หว่านข้าว'],
  sport: ['แคนูโปโล', 'พายเรือยืน', 'สเกตบอร์ดพาร์ก'],
  music: ['พิณเปี๊ยะ', 'คอนทราบาสซูน', 'บัณเฑาะว์'],
  toy: ['ชุดทำสร้อยลูกปัด', 'กระดานวาดภาพน้ำ'],
  school: ['กระบอกตวง', 'แผ่นสไลด์แก้ว', 'กระดาษมิลลิเมตร'],
  body: ['กล้ามเนื้อกะบังลม', 'เส้นเอ็นไขว้หลัง', 'เยื่อหุ้มกระดูก'],
};

test('AI-3 batch 15 contributes 20 new clean, canonical-unique playable answers', () => {
  const additions = Object.values(BATCH_FIFTEEN).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, 20);
  const registered = Object.values(WORD_BANK).flat()
    .map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_FIFTEEN)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'exact collision: ' + category + '/' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});

// Batch 16 (1 Nov 2026): reviewed activities and equipment; no changes to game rules.
const BATCH_SIXTEEN: Readonly<Record<string, readonly string[]>> = {
  job: ['นักจุลชีววิทยา', 'ช่างทำร่ม', 'นักพิษวิทยา'],
  verb: ['ขูดสี', 'ทอเสื่อ', 'คั่วถั่ว'],
  sport: ['สเกตบอร์ดสตรีต', 'โรลเลอร์สกี', 'สโนว์บอร์ดสโลปสไตล์'],
  music: ['พิณไฟฟ้า', 'แซกโซโฟนโซปราโน', 'เมลโลโฟน'],
  toy: ['ชุดประดิษฐ์ว่าว', 'กระดานวาดทราย'],
  school: ['ตาชั่งสามคาน', 'แผ่นปิดสไลด์', 'ขวดรูปชมพู่'],
  body: ['เส้นประสาทมีเดียน', 'กระดูกสันอก', 'กระดูกทั่ง'],
};

test('AI-3 batch 16 contributes 20 new clean canonical-unique playable answers', () => {
  const additions = Object.values(BATCH_SIXTEEN).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, 20);
  const registered = Object.values(WORD_BANK).flat()
    .map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_SIXTEEN)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'exact collision: ' + category + '/' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});

// Batch 17: new verified human-activity vocabulary only; no gameplay rule changes.
const BATCH_SEVENTEEN: Readonly<Record<string, readonly string[]>> = {
  job: ['ช่างต่อเรือ', 'นักปฐพีวิทยา', 'ช่างหล่อพระ'],
  verb: ['หาบน้ำ', 'ฟาดข้าว', 'วิดน้ำ'],
  sport: ['ไจแอนต์สลาลอม', 'เคอร์ลิงวีลแชร์', 'รักบี้ใต้น้ำ'],
  music: ['กรับพวง', 'กลองชาตรี', 'ฉาบใหญ่'],
  toy: ['ตุ๊กตาล้มลุก', 'ตุ๊กตาแม่ลูกดก'],
  school: ['บีกเกอร์', 'ขวดบีบน้ำกลั่น', 'กระดาษพับโอริกามิ'],
  body: ['กระดูกค้อน', 'เส้นประสาทอัลนาร์', 'ลิ้นหัวใจพัลโมนารี'],
};

test('AI-3 batch 17 contributes 20 distinct, clean and playable answers', () => {
  const additions = Object.values(BATCH_SEVENTEEN).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, 20);
  const registered = Object.values(WORD_BANK).flat().map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_SEVENTEEN)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category literal collision: ' + category + '/' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});

// Batch 18 (1 Nov 2026): distinct real terms across AI-3's seven owned categories.
const BATCH_EIGHTEEN: Readonly<Record<string, readonly string[]>> = {
  job: ['นักอุทกวิทยา', 'นักพัฒนาหลักสูตร', 'ช่างทำเครื่องสาย'],
  verb: ['สีข้าว', 'สับฟืน', 'ขึงผ้า'],
  sport: ['สกีโมกุล', 'พาราไตรกีฬา', 'วิ่งวิบากสามพันเมตร'],
  music: ['กีตาร์บาริโทน', 'ทรัมเป็ตพิคโคโล', 'ออร์แกนท่อ'],
  toy: ['ลูกบาศก์งู', 'เกมโยนถุงทราย'],
  school: ['กระดาษกรอง', 'ขาตั้งสามขา', 'หลอดหยด'],
  body: ['กระดูกเรเดียส', 'หลอดเลือดดำพอร์ทัล', 'เส้นประสาทไซอาติก'],
};

test('AI-3 batch 18 adds 20 clean canonical-unique playable answers', () => {
  const additions = Object.values(BATCH_EIGHTEEN).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, 20);
  const registered = Object.values(WORD_BANK).flat().map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_EIGHTEEN)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category spelling collision: ' + category + '/' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const letter = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(letter).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, letter, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});

// Batch 19 (1 Nov 2026): independently named, real activities and anatomy terms.
const BATCH_NINETEEN: Readonly<Record<string, readonly string[]>> = {
  job: ['ช่างซ่อมรองเท้า', 'นักวิทยาศาสตร์การกีฬา', 'นักจิตวิทยาคลินิก'],
  verb: ['ลับกรรไกร', 'วัดไข้', 'หยอดกาว'],
  sport: ['เรือแคนูมาราธอน', 'ไตรกีฬาผลัดผสม', 'ว่ายน้ำเดี่ยวผสม'],
  music: ['โปงลาง', 'หยางฉิน', 'ตะโพนมอญ'],
  toy: ['ว่าวกล่อง', 'หุ่นยนต์บังคับวิทยุ'],
  school: ['พู่กันหัวกลม', 'กรรไกรปลายมน', 'สีโปสเตอร์'],
  body: ['กระดูกอัลนา', 'หลอดเลือดแดงคาโรติด', 'เส้นประสาทเฟมอรัล'],
};

test('AI-3 batch 19 adds 20 unique, clean and playable human-activity terms', () => {
  const additions = Object.values(BATCH_NINETEEN).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, 20);
  const registered = Object.values(WORD_BANK).flat().map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_NINETEEN)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category spelling collision: ' + category + '/' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});


// AI-5 independent QA: three proposed sports were aliases of registered disciplines.
// Keep their replacements distinct and prevent semantic double counting.
test('AI-3 batch 19 does not duplicate existing javelin, dragon boat or butterfly swimming', () => {
  const aliases: Readonly<readonly (readonly [string, string])[]> = [
    ['ขว้างหอก', 'พุ่งแหลน'],
    ['แข่งเรือมังกร', 'พายเรือมังกร'],
    ['ว่ายน้ำท่าผีเสื้อ', 'ว่ายน้ำผีเสื้อ'],
  ];
  for (const [duplicate, registered] of aliases) {
    assert.ok(WORD_BANK.sport.includes(registered), 'baseline sport missing: ' + registered);
    assert.ok(!AI3_ACTIVITY_TERMS.sport.includes(duplicate), 'semantic duplicate: ' + duplicate);
  }
  for (const replacement of ['เรือแคนูมาราธอน', 'ไตรกีฬาผลัดผสม', 'ว่ายน้ำเดี่ยวผสม']) {
    assert.ok(AI3_ACTIVITY_TERMS.sport.includes(replacement), 'replacement missing: ' + replacement);
    const initial = wordInitialForCategory(replacement, 'sport');
    assert.ok(eligibleCategories(initial).includes('sport'), 'unplayable replacement: ' + replacement);
    assert.equal(validAnswer(replacement, initial, 'sport'), true);
  }
});

// Batch 20: reviewed real terms; no new category, scoring or canonicalization rules.
const BATCH_TWENTY: Readonly<Record<string, readonly string[]>> = {
  job: ['นักอนุรักษ์สัตว์ป่า', 'ช่างซ่อมจักรเย็บผ้า', 'นักสื่อสารวิทยาศาสตร์'],
  verb: ['ซ่อมหลังคา', 'คั้นกะทิ', 'เย็บกระดุม'],
  sport: ['พาราเรือแคนู', 'จักรยานไทรอัล', 'ยิงปืนยาวอัดลม'],
  music: ['คลาริเน็ตอัลโต', 'อัลโตฮอร์น', 'กีตาร์เรโซเนเตอร์'],
  toy: ['เกมเจงก้า', 'หุ่นเชิดเงา'],
  school: ['ไมโครปิเปต', 'ปากกาเขียนแผ่นใส', 'ขวดวัดปริมาตร'],
  body: ['เส้นประสาทเรเดียล', 'กล้ามเนื้อไบเซปส์', 'ต่อมน้ำลายใต้ขากรรไกร'],
};

test('AI-3 batch 20 adds 20 clean, canonical-unique and playable answers', () => {
  const additions = Object.values(BATCH_TWENTY).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, 20);
  const registered = Object.values(WORD_BANK).flat().map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_TWENTY)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category spelling collision: ' + category + '/' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});


// AI-5 semantic QA: wooden shape blocks are not a distinct identity from บล็อกไม้.
// Jenga is a named tower-extraction game with rules distinct from generic building blocks.
test('AI-3 batch 20 rejects semantic wooden-block duplicate and registers Jenga game', () => {
  assert.ok(WORD_BANK.toy.includes('บล็อกไม้'), 'existing wooden blocks baseline missing');
  assert.ok(!AI3_ACTIVITY_TERMS.toy.includes('บล็อกไม้รูปทรง'), 'semantic duplicate reintroduced');
  assert.ok(AI3_ACTIVITY_TERMS.toy.includes('เกมเจงก้า'), 'replacement game missing');
  const initial = wordInitialForCategory('เกมเจงก้า', 'toy');
  assert.ok(eligibleCategories(initial).includes('toy'), 'Jenga unavailable for toy');
  assert.equal(validAnswer('เกมเจงก้า', initial, 'toy'), true);
});


// Batch 21 (1 Nov 2026): distinct real jobs, actions, sports, instruments, toys, school items and anatomy.
const BATCH_TWENTY_ONE: Readonly<Record<string, readonly string[]>> = {
  job: ['ช่างทำแม่พิมพ์', 'นักอัญมณีศาสตร์', 'ช่างทำเบาะ'],
  verb: ['เย็บผ้าห่ม', 'ถักเปีย', 'คั้นน้ำอ้อย'],
  sport: ['กระโดดน้ำสปริงบอร์ด', 'เรือใบออปติมิสต์', 'สกีสลาลอม'],
  music: ['กลองเปิงมาง', 'กลองสองหน้า', 'โอโบเบส'],
  toy: ['รถแข่งรางไฟฟ้า', 'เกมดิกซ์อิท'],
  school: ['เครื่องชั่งสปริง', 'แท่งแม่เหล็ก', 'กระดาษยูนิเวอร์ซัลอินดิเคเตอร์'],
  body: ['กล้ามเนื้อไตรเซปส์', 'กระดูกน่อง', 'กล้ามเนื้อเดลทอยด์'],
};

test('AI-3 batch 21 adds 20 distinct, moderated, canonical-unique and playable answers', () => {
  const additions = Object.values(BATCH_TWENTY_ONE).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, 20);
  const registered = Object.values(WORD_BANK).flat().map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  for (const [category, words] of Object.entries(BATCH_TWENTY_ONE)) {
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category spelling collision: ' + category + '/' + word);
      const canonical = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
    }
  }
});


// AI-5 source-level QA: runtime WORD_BANK de-duplicates entries and cannot prove source novelty.
// Inspect literal vocabulary in *other* game source modules, including hourly batches.
test('AI-3 batch 21 has no source-level literal collisions in any other game module', () => {
  const gameDirectory = fileURLToPath(new URL('../amplify/functions/game/', import.meta.url));
  const sources = readdirSync(gameDirectory)
    .filter(name => name.endsWith('.ts') && name !== 'ai3-activity-terms-20261031.ts')
    .map(name => ({ name, content: readFileSync(new URL('../amplify/functions/game/' + name, import.meta.url), 'utf8') }));
  for (const [category, words] of Object.entries(BATCH_TWENTY_ONE)) {
    for (const word of words) {
      const collisions = sources.filter(source =>
        source.content.includes("'" + word + "'") || source.content.includes('"' + word + '"'))
        .map(source => source.name);
      assert.deepEqual(collisions, [], 'source collision: ' + category + '/' + word);
    }
  }
  assert.ok(!AI3_ACTIVITY_TERMS.music.includes('ฟลูเกิลฮอร์น'), 'pre-existing flugelhorn reintroduced');
  assert.ok(!AI3_ACTIVITY_TERMS.music.includes('สะล้อ'), 'pre-existing salo reintroduced');
});

// AI-5 semantic QA: mobile-phone repair is the same occupation as existing phone repair.
// Industrial mold making is a distinct skilled trade and must remain playable.
test('AI-3 batch 21 does not duplicate the existing phone-repair occupation', () => {
  assert.ok(WORD_BANK.job.includes('ช่างซ่อมโทรศัพท์'), 'baseline phone repair job missing');
  assert.ok(!AI3_ACTIVITY_TERMS.job.includes('ช่างซ่อมโทรศัพท์มือถือ'), 'semantic phone repair duplicate reintroduced');
  assert.ok(AI3_ACTIVITY_TERMS.job.includes('ช่างทำแม่พิมพ์'), 'mold-maker replacement missing');
  const initial = wordInitialForCategory('ช่างทำแม่พิมพ์', 'job');
  assert.equal(initial, 'ช');
  assert.ok(eligibleCategories(initial).includes('job'), 'mold-maker job is not playable');
  assert.equal(validAnswer('ช่างทำแม่พิมพ์', initial, 'job'), true);
});


// AI-5 semantic QA: bubble-making sets describe the existing bubble toy,
// whereas Dixit is a named storytelling-and-picture-voting board game.
test('AI-3 batch 21 avoids the bubble toy semantic alias and keeps distinct Dixit playable', () => {
  assert.ok(WORD_BANK.toy.includes('ฟองสบู่'), 'baseline bubble toy missing');
  assert.ok(WORD_BANK.toy.includes('เครื่องเป่าฟองสบู่'), 'bubble-maker baseline missing');
  assert.ok(!AI3_ACTIVITY_TERMS.toy.includes('ชุดทำฟองสบู่'), 'bubble toy semantic duplicate reintroduced');
  assert.ok(AI3_ACTIVITY_TERMS.toy.includes('เกมดิกซ์อิท'), 'Dixit replacement missing');
  assert.equal(WORD_BANK.toy.filter(word => canonicalAnswer(word, 'toy') === canonicalAnswer('เกมดิกซ์อิท', 'toy')).length, 1,
    'Dixit canonical duplicate');
  const initial = wordInitialForCategory('เกมดิกซ์อิท', 'toy');
  assert.equal(initial, 'ก');
  assert.ok(eligibleCategories(initial).includes('toy'), 'Dixit unavailable in toy rounds');
  assert.equal(validAnswer('เกมดิกซ์อิท', initial, 'toy'), true);
});


// Batch 22: checked against main's game vocabulary sources and explicit job aliases.
const BATCH_TWENTY_TWO: Readonly<Record<string, readonly string[]>> = {
  job: ['ช่างทำกระจกสี', 'ผู้จัดการพิพิธภัณฑ์', 'ช่างเป่าแก้ว'],
  verb: ['ล้างฟิล์ม', 'ห่อเกี๊ยว', 'ผูกเงื่อน'],
  sport: ['สเกตบอร์ดบิ๊กแอร์', 'สโนว์บอร์ดบิ๊กแอร์', 'ยิงธนูรีเคิร์ฟ'],
  music: ['กลองบาตา', 'คอนเซอร์ตินา', 'ซารังกี'],
  toy: ['เกมบล็อกัส', 'หุ่นยนต์เดินไขลาน'],
  school: ['แปรงล้างหลอดทดลอง', 'หลอดปั่นเหวี่ยง', 'กล่องใส่สไลด์'],
  body: ['หลอดเลือดแดงเรเดียล', 'กระดูกฝ่าเท้า', 'เยื่อบุช่องท้อง'],
};

test('AI-3 batch 22 contributes 20 canonical-unique playable terms in seven owned categories', () => {
  const additions = Object.values(BATCH_TWENTY_TWO).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, additions.length);
  const registered = Object.values(WORD_BANK).flat()
    .map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  const gameDirectory = fileURLToPath(new URL('../amplify/functions/game/', import.meta.url));
  const otherSources = readdirSync(gameDirectory)
    .filter(name => name.endsWith('.ts') && name !== 'ai3-activity-terms-20261031.ts')
    .map(name => ({ name, content: readFileSync(new URL('../amplify/functions/game/' + name, import.meta.url), 'utf8') }));
  for (const [category, words] of Object.entries(BATCH_TWENTY_TWO)) {
    const canonicalBank = WORD_BANK[category].map(word => canonicalAnswer(word, category));
    for (const word of words) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'standalone blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category literal collision: ' + word);
      assert.equal(canonicalBank.filter(entry => entry === canonicalAnswer(word, category)).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
      const sources = otherSources.filter(source => source.content.includes("'" + word + "'") ||
        source.content.includes('"' + word + '"')).map(source => source.name);
      assert.deepEqual(sources, [], 'source literal collision: ' + category + '/' + word);
    }
  }
});

// AI-5 semantic HOLD: a marine mechanic is a specialization of existing ช่างเครื่อง.
// Glassblowing is a separate skilled glass-forming trade, not mechanical repair.
test('AI-3 batch 22 uses a distinct glassblower trade instead of generic mechanic specialization', () => {
  assert.ok(WORD_BANK.job.includes('ช่างเครื่อง'), 'existing mechanic baseline missing');
  assert.ok(!AI3_ACTIVITY_TERMS.job.includes('ช่างเครื่องเรือ'), 'generic mechanic specialization reintroduced');
  assert.ok(AI3_ACTIVITY_TERMS.job.includes('ช่างเป่าแก้ว'), 'glassblower replacement missing');
  const initial = wordInitialForCategory('ช่างเป่าแก้ว', 'job');
  assert.equal(initial, 'ช');
  assert.ok(eligibleCategories(initial).includes('job'), 'glassblower job unavailable');
  assert.equal(validAnswer('ช่างเป่าแก้ว', initial, 'job'), true);
});


// Batch 23: source-level novelty, category-local canonical identity, moderation and live playability.
const BATCH_TWENTY_THREE: Readonly<Record<string, readonly string[]>> = {
  job: [
    'ช่างติดตั้งระบบดับเพลิง',
    'นักวิเคราะห์หลักทรัพย์',
    'นักคณิตศาสตร์ประกันภัย'
  ],
  verb: [
    'เลาะตะเข็บ',
    'พับจีบ',
    'ชุบแป้งทอด'
  ],
  sport: [
    'ยิงธนูคอมพาวด์',
    'สเกตบอร์ดเวิร์ต',
    'สกีฮาล์ฟไปป์'
  ],
  music: [
    'ซูร์นา',
    'ดอมรา',
    'รีคอร์เดอร์เบส'
  ],
  toy: [
    'เกมโค้ดเนมส์',
    'เกมอาซูล'
  ],
  school: [
    'กรวยแยกสาร',
    'เครื่องวัดค่าพีเอช',
    'ที่หนีบหลอดทดลอง'
  ],
  body: [
    'กระดูกลิ้น',
    'กล้ามเนื้อโซเลียส',
    'หลอดเลือดดำจูกูลาร์'
  ]
};

test('AI-3 batch 23 adds 20 source-unique, clean, canonical-unique playable answers', () => {
  const additions = Object.values(BATCH_TWENTY_THREE).flat();
  assert.equal(additions.length, 20);
  assert.equal(new Set(additions).size, 20);
  const registered = Object.values(WORD_BANK).flat().map(word => word.normalize('NFC').toLocaleLowerCase('th'));
  const gameDirectory = fileURLToPath(new URL('../amplify/functions/game/', import.meta.url));
  const otherSources = readdirSync(gameDirectory)
    .filter(name => name.endsWith('.ts') && name !== 'ai3-activity-terms-20261031.ts')
    .map(name => ({ name, content: readFileSync(new URL('../amplify/functions/game/' + name, import.meta.url), 'utf8') }));
  for (const [category, terms] of Object.entries(BATCH_TWENTY_THREE)) {
    const canonicals = WORD_BANK[category].map(word => canonicalAnswer(word, category));
    for (const word of terms) {
      assert.ok(AI3_ACTIVITY_TERMS[category].includes(word), 'missing: ' + category + '/' + word);
      assert.equal(word, word.trim().normalize('NFC'), 'unnormalized: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'standalone blocked: ' + word);
      assert.equal(registered.filter(entry => entry === word.toLocaleLowerCase('th')).length, 1,
        'cross-category literal collision: ' + category + '/' + word);
      assert.equal(canonicals.filter(entry => entry === canonicalAnswer(word, category)).length, 1,
        'canonical collision: ' + category + '/' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'unplayable: ' + category + '/' + word);
      const collisions = otherSources.filter(source => source.content.includes("'" + word + "'") ||
        source.content.includes('"' + word + '"')).map(source => source.name);
      assert.deepEqual(collisions, [], 'source-level collision: ' + category + '/' + word);
    }
  }
});
