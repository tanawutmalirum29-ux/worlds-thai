import test from 'node:test';
import assert from 'node:assert/strict';
import { AI1_NATURE_TERMS } from '../amplify/functions/game/ai1-nature-terms.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, LETTERS, normalizeAnswer, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';

const NATURE_CATEGORIES = ['animal', 'bird', 'fish', 'insect', 'plant', 'tree', 'flower', 'nature'];
// Legacy reviewed names can become playable as more categories reach the letter threshold.
// Every name added or substituted in this batch must already be playable today.
const BATCH19_PLAYABLE = new Set([
  'กวางรูซา', 'วัลลาบี', 'วาฬเบลูกา',
  'นกจาบคาหัวเขียว', 'นกปากห่าง',
  'ปลาแพะเขียว', 'ปลาปักเป้าหนามหลังแถบ',
  'ด้วงงวงกล้วย', 'เพลี้ยจักจั่น',
  'เฟินบอสตัน', 'หญ้าขัดมอน',
  'ตะแบกเลือด', 'ประดู่แดง',
  'พุดศุภโชค', 'กล้วยไม้หวาย',
  'แอ่งน้ำเค็ม', 'ดินดอนสามเหลี่ยมปากแม่น้ำ',
  'ป่าดิบแล้ง', 'ตะกอนน้ำพา',
]);
const GAME_CONSONANTS = new Set([...'กขคงจฉชซดตถทนบปผพฟภมยรลวสหอ']);

test('AI-1 adds 448 real nature names only within its eight assigned categories', () => {
  assert.deepEqual(Object.keys(AI1_NATURE_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(AI1_NATURE_TERMS).reduce((total, words) => total + words.length, 0), 448);

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
  assert.equal(additions.length, 293, 'AI-1 must contain 293 net new nature names after the 155-term baseline');

  for (const { category, word } of additions) {
    const initial = wordInitialForCategory(word, category);
    assert.ok(GAME_CONSONANTS.has(initial), `${word} must use a supported game consonant`);
    if (BATCH19_PLAYABLE.has(word))
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


// Batch 20: genuine species and nature terms, audited against every imported bank.
const BATCH20_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: [
    'หมีหมา',
    'หมีควาย'
  ],
  bird: [
    'นกแอ่นบ้าน',
    'นกเค้าหูยาวเล็ก'
  ],
  fish: [
    'ปลาบู่จุดสีฟ้า',
    'ปลาแพะลาย'
  ],
  insect: [
    'แมลงหวี่ผลไม้',
    'เพลี้ยอ่อน'
  ],
  plant: [
    'หญ้ากินนี',
    'ไมยราบ',
    'มอส'
  ],
  tree: [
    'ประดู่บ้าน',
    'มะฮอกกานี'
  ],
  flower: [
    'ดอกพยับหมอก',
    'ดอกหงส์เหิน'
  ],
  nature: [
    'ที่ราบลุ่ม',
    'ปากอ่าว'
  ]
};

test('batch 20 contributes 17 canonical-distinct and currently playable nature terms', () => {
  assert.deepEqual(Object.keys(BATCH20_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH20_TERMS).flat().length, 17);
  const prefixes: Readonly<Record<string, string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก',
  };
  for (const [category, words] of Object.entries(BATCH20_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be in ${category}`);
      const identity = canonicalAnswer(word, category);
      assert.ok(identity, `${word} needs a canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === identity).length, 1,
        `${word} must not duplicate an imported answer`);
      const prefix = prefixes[category];
      if (prefix) {
        const alternate = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(alternate, category), identity, `${word} prefix normalization must agree`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} must have a playable consonant`);
      assert.equal(validAnswer(word, initial, category), true, `${word} must be playable in ${category}`);
    }
  }
});

 
// PR #92 started with 286 terms in main. Check every proposed word, not just
// the newest batch: a green CI result must also mean the answer is playable.
const PR92_START_COUNTS: Readonly<Record<string, number>> = {
  animal: 40, bird: 39, fish: 35, insect: 31,
  plant: 39, tree: 37, flower: 32, nature: 33,
};
const BATCH21_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['วัวไบซัน', 'เสือชีตาห์'],
  bird: ['นกกระสาแดง', 'นกยางโทนใหญ่'],
  fish: ['ปลาไหลริบบิ้น', 'ปลาทองหัวสิงห์'],
  insect: ['ผีเสื้อหางดาบลายจุด', 'ผีเสื้อหนอนคูนเหลือง'],
  plant: ['หญ้าแห้วหมู'],
  tree: ['กระพี้เขาควาย', 'ตะเคียนชันตาแมว'],
  flower: ['ดอกจำปูน', 'เอื้องแปรงสีฟัน'],
  nature: ['ตะพักลำน้ำ', 'ลานหินทราย'],
};

test('AI-1 batch 21 adds 15 real distinct words in the assigned categories', () => {
  assert.deepEqual(Object.keys(BATCH21_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH21_TERMS).flat().length, 15);
  for (const [category, words] of Object.entries(BATCH21_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be registered in ${category}`);
      const identity = canonicalAnswer(word, category);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === identity).length, 1,
        `${word} must have one canonical identity in ${category}`);
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} must use a playable initial`);
      assert.equal(validAnswer(word, initial, category), true, `${word} must be playable`);
    }
  }
});

test('all 162 terms introduced by PR #92 are currently playable, not just the latest batch', () => {
  const additions = Object.entries(AI1_NATURE_TERMS).flatMap(([category, words]) =>
    words.slice(PR92_START_COUNTS[category]).map(word => ({ category, word })));
  assert.equal(additions.length, 162);
  for (const { category, word } of additions) {
    const initial = wordInitialForCategory(word, category);
    assert.ok((LETTERS as readonly string[]).includes(initial), `${word} has unplayable initial ${initial}`);
    assert.equal(validAnswer(word, initial, category), true, `${word} cannot be submitted in ${category}`);
    if (word.startsWith('เฟิน')) {
      const spellingVariant = 'เฟิร์น' + word.slice('เฟิน'.length);
      assert.ok(!WORD_BANK[category].includes(spellingVariant),
        `${word} is the same plant as existing spelling ${spellingVariant}`);
    }
  }
});

test('Boston fern semantic alias is not double-counted in AI-1', () => {
  assert.ok(WORD_BANK.plant.includes('เฟิร์นบอสตัน'), 'existing main spelling must remain');
  assert.ok(!AI1_NATURE_TERMS.plant.includes('เฟินบอสตัน'), 'AI-1 must not add the same Boston fern again');
  assert.ok(AI1_NATURE_TERMS.plant.includes('กระแตไต่ไม้'), 'replacement must be a distinct fern');
});


// Batch 22: distinct Thai species, plants and natural features; only AI-1 categories.
const BATCH22_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['ลิงอ้ายเงี้ยะ', 'ชะมดแผงหางปล้อง'],
  bird: ['นกอ้ายงั่ว', 'นกแอ่นตาล'],
  fish: ['ปลาหมอสีฟรอนโตซ่า', 'ปลาวัว'],
  insect: ['ด้วงเสือ', 'แมลงวันลาย'],
  plant: ['พรมมิ', 'หญ้าลิเภา'],
  tree: ['เสม็ดแดง', 'ปอทะเล'],
  flower: ['ฟ้าประดิษฐ์', 'ชบาเมเปิ้ล'],
  nature: ['ดินถล่ม', 'พายุทราย'],
};

test('batch 22 registers 16 new playable nature names without canonical or literal collisions', () => {
  assert.deepEqual(Object.keys(BATCH22_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH22_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก',
  };
  for (const [category, words] of Object.entries(BATCH22_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} must have a canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length, 1,
        `${word} must not duplicate an existing category answer`);
      const prefix = prefixes[category];
      if (prefix) {
        const alternate = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(alternate, category), canonical,
          `${word} must preserve category-prefix identity`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} must use a playable initial`);
      assert.equal(validAnswer(word, initial, category), true, `${word} must be accepted in a live round`);
      const normalized = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [otherCategory, bank] of Object.entries(WORD_BANK)) {
        const occurrences = bank.filter(existing => normalizeAnswer(existing).toLocaleLowerCase('th') === normalized).length;
        assert.equal(occurrences, otherCategory === category ? 1 : 0,
          `${word} must not duplicate a literal name in ${otherCategory}`);
      }
    }
  }
});


test('batch 22 does not duplicate the older tree ต้นสะเดาเทียม under its optional prefix', () => {
  assert.ok(WORD_BANK.tree.includes('ต้นสะเดาเทียม'), 'existing hourly tree name must remain');
  assert.ok(!AI1_NATURE_TERMS.tree.includes('สะเดาเทียม'), 'AI-1 must not re-add the same tree without prefix');
  assert.equal(canonicalAnswer('ต้นสะเดาเทียม', 'tree'), canonicalAnswer('สะเดาเทียม', 'tree'));
  assert.ok(AI1_NATURE_TERMS.tree.includes('เสม็ดแดง'), 'distinct replacement tree must be registered');
});


// Batch 23: names checked against the latest main and all imported word-bank
// modules. Distinct species/subspecies are not aliases of generic category nouns.
const BATCH23_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['ตัวกินมดยักษ์', 'ช้างแอฟริกา'],
  bird: ['นกกะเต็นอกขาว', 'นกจาบคาเคราแดง'],
  fish: ['ปลานกแก้วหัวโหนก', 'ปลากะรังแดงจุดน้ำเงิน'],
  insect: ['ผีเสื้อหนอนกาฝากธรรมดา', 'ด้วงเต่าลายขวาง'],
  plant: ['หญ้านกสีชมพู', 'หญ้าหนวดปลาดุก'],
  tree: ['สมพง', 'ก่อเดือย'],
  flower: ['สร้อยสุวรรณา', 'ม่วงเทพรัตน์'],
  nature: ['พายุลูกเห็บ', 'ดินเค็ม'],
};

test('batch 23 registers 16 distinct currently playable names in AI-1 categories', () => {
  assert.deepEqual(Object.keys(BATCH23_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH23_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก',
  };
  for (const [category, words] of Object.entries(BATCH23_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} needs a canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length, 1,
        `${word} duplicates an existing canonical identity`);
      const prefix = prefixes[category];
      if (prefix) {
        const alternate = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(alternate, category), canonical,
          `${word} must preserve prefix normalization`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} has unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} cannot be played`);
      const normalized = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        const occurrences = bank.filter(existing => normalizeAnswer(existing).toLocaleLowerCase('th') === normalized).length;
        assert.equal(occurrences, bankCategory === category ? 1 : 0,
          `${word} duplicates a literal name in ${bankCategory}`);
      }
    }
  }
});

test('batch 23 does not re-add manta ray under a different Thai name', () => {
  assert.ok(!AI1_NATURE_TERMS.fish.includes('ปลากระเบนแมนต้า'));
  assert.ok(AI1_NATURE_TERMS.fish.includes('ปลานกแก้วหัวโหนก'));
});

test('batch 23 does not duplicate the hourly bird ตะขาบทุ่ง under optional นก prefix', () => {
  assert.ok(WORD_BANK.bird.includes('ตะขาบทุ่ง'), 'existing unprefixed bird remains');
  assert.ok(!AI1_NATURE_TERMS.bird.includes('นกตะขาบทุ่ง'), 'AI-1 must not re-add the same bird');
  assert.equal(canonicalAnswer('นกตะขาบทุ่ง', 'bird'), canonicalAnswer('ตะขาบทุ่ง', 'bird'));
  assert.ok(AI1_NATURE_TERMS.bird.includes('นกจาบคาเคราแดง'), 'distinct bird must replace duplicate');
});


// Batch 24: reviewed names absent from main and all imported vocabulary modules.
// Canonical identities, category prefixes, playable initials and cross-bank
// duplicates are checked against the current merged game dictionary.
const BATCH24_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['กวางดาว', 'หนูพุก'],
  bird: ['นกกะเต็นน้อยธรรมดา', 'นกจับแมลงคอสีน้ำเงินเข้ม'],
  fish: ['ปลาหมูหางแดง', 'ปลาบู่กองหิน'],
  insect: ['ด้วงคีมยีราฟ', 'ด้วงกว่างห้าเขา'],
  plant: ['ตำแยแมว', 'กระดุมทองเลื้อย'],
  tree: ['ยอป่า', 'ตะคร้ำ'],
  flower: ['เทียนกิ่ง', 'มะลุลี'],
  nature: ['ป่าผลัดใบ', 'เกาะปะการัง'],
};

test('batch 24 adds 16 distinct currently playable names without cross-bank collisions', () => {
  assert.deepEqual(Object.keys(BATCH24_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH24_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก',
  };
  for (const [category, words] of Object.entries(BATCH24_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be registered in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} needs a canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length, 1,
        `${word} must not duplicate a registered canonical answer`);
      const prefix = prefixes[category];
      if (prefix) {
        const alternate = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(alternate, category), canonical,
          `${word} must preserve optional category-prefix identity`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} has an unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} cannot be played`);
      const normalized = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        const occurrences = bank.filter(existing => normalizeAnswer(existing).toLocaleLowerCase('th') === normalized).length;
        assert.equal(occurrences, bankCategory === category ? 1 : 0,
          `${word} duplicates a literal answer in ${bankCategory}`);
      }
    }
  }
});


// Batch 25: names confirmed against main and imported vocabulary modules.
// Keep prefix-canonical identities and ensure all additions are playable.
const BATCH25_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: [
    'หมูป่า',
    'หมีขั้วโลก'
  ],
  bird: [
    'นกอีแจว',
    'นกพญาไฟใหญ่'
  ],
  fish: [
    'ปลากระทุงเหวเมือง',
    'ปลากะรังหัวโขน'
  ],
  insect: [
    'แมลงวันบ้าน',
    'ตั๊กแตนตำข้าวคอยาวเกษตรศาสตร์'
  ],
  plant: [
    'กูดเกี๊ยะ',
    'ผักเบี้ยหิน'
  ],
  tree: [
    'สาละลังกา',
    'จันทน์หอม'
  ],
  flower: [
    'พู่จอมพล',
    'พุดสามสี'
  ],
  nature: [
    'ทะเลสาบน้ำเค็ม',
    'ที่ราบน้ำท่วมถึง'
  ]
};

test('batch 25 adds 16 distinct currently playable names without canonical or cross-bank duplicates', () => {
  assert.deepEqual(Object.keys(BATCH25_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH25_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก',
  };
  for (const [category, words] of Object.entries(BATCH25_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be registered in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} needs a canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length, 1,
        `${word} duplicates a registered canonical answer`);
      const prefix = prefixes[category];
      if (prefix) {
        const alternate = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(alternate, category), canonical,
          `${word} must preserve optional category-prefix identity`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} has unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} cannot be played`);
      const normalized = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        const occurrences = bank.filter(existing => normalizeAnswer(existing).toLocaleLowerCase('th') === normalized).length;
        assert.equal(occurrences, bankCategory === category ? 1 : 0,
          `${word} duplicates a literal answer in ${bankCategory}`);
      }
    }
  }
});


// Batch 26: remove semantic sawfish alias and add only independently distinct
// names. AI-5 flagged ปลาฟันเลื่อย as a possible alias of existing ฉนาก.
test('AI-1 does not count sawfish twice under descriptive names', () => {
  assert.ok(WORD_BANK.fish.includes('ฉนาก'), 'existing sawfish identity must remain');
  assert.ok(!AI1_NATURE_TERMS.fish.includes('ปลาฟันเลื่อย'), 'sawfish alias must not be re-added');
  assert.ok(AI1_NATURE_TERMS.fish.includes('ปลาหมอสีฟรอนโตซ่า'), 'distinct frontosa cichlid replaces it');
});

const BATCH26_TERMS: Readonly<Record<string, readonly string[]>> = {
  "animal": [
    "กระต่ายป่า",
    "กระรอกท้องแดง"
  ],
  "bird": [
    "นกกระสานวล",
    "นกกะเต็นลาย"
  ],
  "insect": [
    "เพลี้ยหอย",
    "ด้วงเต่าเจ็ดจุด"
  ],
  "plant": [
    "หญ้ารูซี่",
    "หญ้าแพงโกล่า"
  ],
  "tree": [
    "กระถินเทพา",
    "แสมดำ"
  ],
  "flower": [
    "พวงคราม",
    "เอื้องเงินหลวง"
  ],
  "nature": [
    "ปล่องภูเขาไฟ",
    "ทะเลสาบน้ำจืด"
  ]
};

test('batch 26 adds 14 distinct playable names across AI-1 categories', () => {
  assert.equal(Object.values(BATCH26_TERMS).flat().length, 14);
  const prefixes: Readonly<Record<string,string>> = {
    bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก'
  };
  for (const [category, words] of Object.entries(BATCH26_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be registered`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} needs a canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing =>
        canonicalAnswer(existing, category) === canonical).length, 1,
        `${word} duplicates another registered identity`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} has unplayable initial`);
      assert.equal(validAnswer(word, initial, category), true, `${word} cannot be played`);
      const normalized = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(bank.filter(existing =>
          normalizeAnswer(existing).toLocaleLowerCase('th') === normalized).length,
          bankCategory === category ? 1 : 0, `${word} is duplicated in ${bankCategory}`);
      }
    }
  }
});
