import test from 'node:test';
import assert from 'node:assert/strict';
import { AI3_ACTIVITY_TERMS } from '../amplify/functions/game/ai3-activity-terms-20261031.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage }
  from '../amplify/functions/game/moderation.ts';

const EXPECTED_INITIALS: Readonly<Record<string, readonly string[]>> = {
  job: ['น', 'น', 'ช', 'น', 'น', 'ช', 'น', 'ช', 'น', 'น', 'ช', 'น', 'ผ', 'น', 'ช', 'น', 'น', 'ช', 'ว', 'ช', 'น', 'ผ', 'ช', 'น', 'ช', 'ว', 'ผ', 'น', 'ผ', 'จ', 'ช', 'ช', 'ผ', 'น', 'ช', 'ช', 'น', 'น', 'ช'],
  verb: ['ค', 'พ', 'ล', 'ป', 'ถ', 'ถ', 'ก', 'ย', 'ข', 'ต', 'ค', 'ก', 'ข', 'จ', 'ด', 'ส', 'ร', 'ด', 'ฟ', 'ย', 'ข', 'ฝ', 'ล', 'ข', 'ร', 'ห', 'ถ', 'ส', 'ฟ', 'ห', 'บ', 'ร', 'ต', 'พ', 'ห', 'ป', 'ค', 'ก', 'ล'],
  sport: ['ส', 'พ', 'ฟ', 'ท', 'ร', 'บ', 'พ', 'ท', 'ร', 'ว', 'ค', 'ป', 'พ', 'ส', 'ต', 'ย', 'อ', 'ส', 'บ', 'พ', 'ย', 'ข', 'ว', 'ต', 'ย', 'ส', 'ว', 'ค', 'ร', 'ค', 'ค', 'ค', 'ซ', 'ย', 'ร', 'ส', 'ฟ', 'ฟ', 'ก'],
  music: ['ว', 'ก', 'ค', 'ท', 'ค', 'อ', 'ก', 'ค', 'ค', 'ป', 'ข', 'ก', 'ป', 'ป', 'ก', 'ก', 'ว', 'ป', 'ก', 'พ', 'ร', 'ซ', 'ห', 'ก', 'ค', 'ป', 'ต', 'บ', 'ช', 'ด', 'ค', 'ก', 'ด', 'ซ', 'อ', 'ก'],
  toy: ['ห', 'ห', 'ก', 'ค', 'ช', 'ก', 'บ', 'ร', 'ล', 'ก', 'ก', 'บ', 'ก', 'ล', 'ต', 'ก', 'ร', 'ก', 'ก', 'ก', 'ก', 'ก', 'ช', 'ก', 'ก'],
  school: ['ก', 'ป', 'ต', 'ฟ', 'ค', 'ส', 'ก', 'บ', 'ก', 'ม', 'ท', 'ฟ', 'ซ', 'ก', 'ค', 'ฟ', 'ท', 'ว', 'ผ', 'ค', 'ก', 'บ', 'ย', 'ฟ', 'ส', 'ท', 'ส', 'ป', 'ก', 'ก', 'ส', 'ส', 'ก', 'บ', 'ก', 'ห', 'ต', 'ผ'],
  body: ['ก', 'ก', 'ข', 'ย', 'ย', 'ต', 'ส', 'ก', 'ต', 'ก', 'ส', 'ย', 'ต', 'อ', 'ก', 'ส', 'ล', 'ห', 'ล', 'ต', 'ห', 'ก', 'ต', 'ส', 'ส', 'ก', 'ส', 'ต', 'ท', 'ย', 'ส', 'ข', 'ก', 'ท', 'ต', 'ถ', 'ส', 'ส', 'ล'],
};

test('AI-3 registers 255 reviewed activity terms without duplicate canonical identities', () => {
  assert.deepEqual(Object.keys(AI3_ACTIVITY_TERMS), Object.keys(EXPECTED_INITIALS));
  const all = Object.values(AI3_ACTIVITY_TERMS).flat();
  assert.equal(all.length, 255);
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
