import test from 'node:test';
import { readFileSync } from 'node:fs';
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

test('AI-1 adds 684 real nature names only within its eight assigned categories', () => {
  assert.deepEqual(Object.keys(AI1_NATURE_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(AI1_NATURE_TERMS).reduce((total, words) => total + words.length, 0), 684);

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
  assert.equal(additions.length, 529, 'AI-1 must contain 529 net new nature names after the 155-term baseline');

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

test('all 398 terms introduced by PR #92 are currently playable, not just the latest batch', () => {
  const additions = Object.entries(AI1_NATURE_TERMS).flatMap(([category, words]) =>
    words.slice(PR92_START_COUNTS[category]).map(word => ({ category, word })));
  assert.equal(additions.length, 398);
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
  nature: ['หาดทรายสีชมพู', 'พายุทราย'],
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
    "หงอนนาค",
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

 
// AI-5 semantic QA: พวงคราม already existed in the imported main flower bank.
test('AI-1 does not count pre-existing พวงคราม as a new flower', () => {
  assert.ok(WORD_BANK.flower.includes('พวงคราม'), 'main already registers this flower');
  assert.ok(!AI1_NATURE_TERMS.flower.includes('พวงคราม'), 'AI-1 must not duplicate it');
  assert.ok(AI1_NATURE_TERMS.flower.includes('หงอนนาค'), 'distinct replacement must be registered');
  assert.equal(canonicalAnswer('ดอกหงอนนาค', 'flower'), canonicalAnswer('หงอนนาค', 'flower'));
});

const BATCH27_TERMS: Readonly<Record<string, readonly string[]>> = {
  "animal": [
    "ม้าลายเกรวี",
    "อูฐสองโหนก"
  ],
  "bird": [
    "นกกระสาคอขาว",
    "นกยางกรอกพันธุ์ชวา"
  ],
  "fish": [
    "ปลากระบอกดำ",
    "ปลากะรังบั้ง"
  ],
  "insect": [
    "ด้วงกว่างญี่ปุ่น",
    "ตั๊กแตนตำข้าวกล้วยไม้"
  ],
  "plant": [
    "กาบหอยแครง",
    "หญ้าปล้อง"
  ],
  "tree": [
    "สนสองใบ",
    "สนสามใบ"
  ],
  "flower": [
    "แคแสด",
    "พวงแก้วกุดั่น"
  ],
  "nature": [
    "หลุมอุกกาบาต",
    "เกาะหินปูน"
  ]
};

test('batch 27 adds 16 canonical-distinct, playable Thai nature names', () => {
  assert.deepEqual(Object.keys(BATCH27_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH27_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก'
  };
  for (const [category, words] of Object.entries(BATCH27_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be registered in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} needs a canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing =>
        canonicalAnswer(existing, category) === canonical).length, 1,
        `${word} duplicates an existing canonical identity in ${category}`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical,
          `${word} must have one prefix-normalized identity`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} has unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} cannot be played in ${category}`);
      const normalized = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(bank.filter(existing =>
          normalizeAnswer(existing).toLocaleLowerCase('th') === normalized).length,
          bankCategory === category ? 1 : 0, `${word} duplicated in ${bankCategory}`);
      }
    }
  }
});


// Batch 28 (1 Nov 2026): only distinct, playable names in the eight AI-1 categories.
const BATCH28_TERMS: Readonly<Record<string, readonly string[]>> = {
  "animal": [
    "แมวน้ำช้าง",
    "แมวน้ำเสือดาว"
  ],
  "bird": [
    "นกเค้ากู่",
    "นกเขาไฟ"
  ],
  "fish": [
    "ปลามังกรเงิน",
    "ปลาหมอสีออสการ์"
  ],
  "insect": [
    "ด้วงคีมแดง",
    "ด้วงน้ำมันแดงหัวโต"
  ],
  "plant": [
    "ว่านเศรษฐีเรือนใน",
    "หญ้ากกดอกขาว"
  ],
  "tree": [
    "ยางแดง",
    "ยางเสียน"
  ],
  "flower": [
    "กล้วยไม้ช้างกระ",
    "ลิลลี่หุบเขา"
  ],
  "nature": [
    "น้ำตกใต้ดิน",
    "ทุ่งหญ้าอัลไพน์"
  ]
};

test('AI-5 landslide semantic QA: no second identity for แผ่นดินถล่ม', () => {
  assert.ok(WORD_BANK.nature.includes('แผ่นดินถล่ม'), 'the original landslide name remains registered');
  assert.ok(!AI1_NATURE_TERMS.nature.includes('ดินถล่ม'), 'semantic synonym must not be counted as new');
  assert.ok(AI1_NATURE_TERMS.nature.includes('หาดทรายสีชมพู'), 'independent coastal feature replaces the alias');
});

test('batch 28 adds 16 canonical-distinct playable Thai nature names', () => {
  assert.deepEqual(Object.keys(BATCH28_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH28_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก'
  };
  for (const [category, words] of Object.entries(BATCH28_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be registered in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} needs a canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing =>
        canonicalAnswer(existing, category) === canonical).length, 1,
        `${word} must not duplicate an existing canonical identity`);
      const prefix = prefixes[category];
      if (prefix) {
        const alternate = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(alternate, category), canonical,
          `${word} must preserve optional prefix normalization`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} has unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} cannot be played`);
      const normalized = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(bank.filter(existing =>
          normalizeAnswer(existing).toLocaleLowerCase('th') === normalized).length,
          bankCategory === category ? 1 : 0, `${word} duplicated in ${bankCategory}`);
      }
    }
  }
});


// Batch 29 (1 Nov 2026): 16 reviewed, category-specific names.
const BATCH29_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['จิงโจ้แดง', 'คาราคัล'],
  bird: ['นกโพระดกคางเหลือง', 'นกโพระดกหูเขียว'],
  fish: ['ปลาซิวหนู', 'ปลาซิวใบไผ่แม่แตง'],
  insect: ['ด้วงเต่าแตงแดง', 'แมลงปอเข็มน้ำตกใหญ่ญี่ปุ่น'],
  plant: ['เฟินเขากวาง', 'กระบองเพชรหูกระต่าย'],
  tree: ['โกงกางใบเล็ก', 'แสมขาว'],
  flower: ['เอื้องดิน', 'เอื้องไอยเรศ'],
  nature: ['หมอกทะเล', 'เมฆคิวมูโลนิมบัส'],
};

test('AI-5 sinkhole QA: do not re-add the already imported หลุมยุบ', () => {
  assert.ok(WORD_BANK.nature.includes('หลุมยุบ'), 'the imported hourly sinkhole name must remain');
  assert.ok(!AI1_NATURE_TERMS.nature.includes('หลุมยุบ'), 'AI-1 must not duplicate the source-level name');
  assert.ok(AI1_NATURE_TERMS.nature.includes('น้ำตกใต้ดิน'), 'distinct replacement feature must be registered');
});

test('batch 29 adds 16 unique, currently playable names in only the eight assigned categories', () => {
  assert.deepEqual(Object.keys(BATCH29_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH29_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก',
  };
  for (const [category, words] of Object.entries(BATCH29_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} must be in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} must have an identity`);
      assert.equal(WORD_BANK[category].filter(existing =>
        canonicalAnswer(existing, category) === canonical).length, 1,
        `${word} duplicates an existing canonical identity`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical,
          `${word} must keep its prefix-normalized identity`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} has unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} must be playable`);
    }
  }
});

// Batch 30 (1 Nov 2026): 16 source-screened, category-specific Thai names.
const BATCH30_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['วัวมัสก์', 'แมวน้ำฮาร์ป'],
  bird: ['นกขุนแผนหัวแดง', 'นกขุนแผนอกส้ม'],
  fish: ['ปลากระสูบหลังดำ', 'ปลาสร้อยนกเขาจุดทอง'],
  insect: ['เพลี้ยไฟพริก', 'แมลงปอเข็มท้องเข็มสังขละ'],
  plant: ['ว่านนางคำ', 'ว่านสาวหลง'],
  tree: ['เสลาใบใหญ่', 'ปาล์มคิง'],
  flower: ['กล้วยไม้ฟ้ามุ่ย', 'เข็มสามสี'],
  nature: ['พายุหมุนเขตร้อน', 'เมฆชั้นต่ำ'],
};

test('batch 30 adds 16 canonical-distinct and playable nature names', () => {
  assert.deepEqual(Object.keys(BATCH30_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH30_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก',
  };
  for (const [category, words] of Object.entries(BATCH30_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing from ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} has no canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing =>
        canonicalAnswer(existing, category) === canonical).length, 1,
        `${word} duplicates a category identity`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical,
          `${word} has incorrect prefix normalization`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} initial ${initial} is unplayable`);
      assert.equal(validAnswer(word, initial, category), true, `${word} must be playable`);
    }
  }
});

// Check the actual *source files* imported by dictionary.ts. WORD_BANK uses Set
// to deduplicate values, so checking only the runtime bank can hide duplicates
// such as หลุมยุบ from hourly-vocabulary-20261030-b.ts.
test('all PR #92 additions are absent from every other imported vocabulary source', () => {
  const sourceRoot = new URL('../amplify/functions/game/', import.meta.url);
  const dictionarySource = readFileSync(new URL('dictionary.ts', sourceRoot), 'utf8');
  const imports = [...new Set([...dictionarySource.matchAll(/from '\.\/([^']+\.ts)'/g)]
    .map(match => match[1]))].filter(file => file !== 'ai1-nature-terms.ts');
  const sourceFiles = ['dictionary.ts', ...imports];
  const normalize = (word:string) => normalizeAnswer(word).toLocaleLowerCase('th');
  const literalSources = new Map<string, Set<string>>();
  const categorySources = new Map<string, Map<string, Set<string>>>();
  for (const file of sourceFiles) {
    const source = file === 'dictionary.ts'
      ? dictionarySource : readFileSync(new URL(file, sourceRoot), 'utf8');
    literalSources.set(file, new Set(
      [...source.matchAll(/['"]([^'"\r\n]+)['"]/g)].map(match => normalize(match[1]))));
    const byCategory = new Map<string, Set<string>>();
    for (const match of source.matchAll(/(?:^|\n)\s*['"]?(animal|bird|fish|insect|plant|tree|flower|nature)['"]?\s*:\s*\[([\s\S]*?)\]/g)) {
      const category = match[1];
      const names = byCategory.get(category) ?? new Set<string>();
      for (const item of match[2].matchAll(/['"]([^'"\r\n]+)['"]/g))
        names.add(canonicalAnswer(item[1], category));
      byCategory.set(category, names);
    }
    categorySources.set(file, byCategory);
  }
  const proposed = Object.entries(AI1_NATURE_TERMS).flatMap(([category, words]) =>
    words.slice(PR92_START_COUNTS[category]).map(word => ({ category, word })));
  assert.equal(proposed.length, 398);
  for (const { category, word } of proposed) {
    const literal = normalize(word);
    const variants = [literal];
    if (literal.startsWith('เฟิน')) variants.push('เฟิร์น' + literal.slice('เฟิน'.length));
    if (literal.startsWith('เฟิร์น')) variants.push('เฟิน' + literal.slice('เฟิร์น'.length));
    const identity = canonicalAnswer(word, category);
    for (const file of sourceFiles) {
      for (const variant of variants)
        assert.ok(!literalSources.get(file)!.has(variant),
          `${word} is already a literal in imported source ${file} (variant ${variant})`);
      assert.ok(!categorySources.get(file)?.get(category)?.has(identity),
        `${word} is already a prefix-normalized ${category} answer in ${file}`);
    }
  }
});


// Batch 31 (1 Nov 2026): 16 distinct nature names, two per assigned category.
const BATCH31_TERMS: Readonly<Record<string, readonly string[]>> = {
  'animal': [
    'กวางซิก้า',
    'เสือจากัวร์'
  ],
  'bird': [
    'นกกะเต็นน้อยสามนิ้ว',
    'นกปรอดหัวสีเขม่า'
  ],
  'fish': [
    'ปลากัดมหาชัย',
    'ปลาทองออรันดา'
  ],
  'insect': [
    'เพลี้ยกระโดดสีน้ำตาล',
    'ผีเสื้อหนอนใยผัก'
  ],
  'plant': [
    'ว่านมหาลาภ',
    'ผักปลาบ'
  ],
  'tree': [
    'ยางพลวง',
    'แคฝรั่ง'
  ],
  'flower': [
    'พวงทองต้น',
    'ชบาด่าง'
  ],
  'nature': [
    'เมฆเซอร์รัส',
    'เมฆอัลโตคิวมูลัส'
  ]
};

test('batch 31 adds 16 canonical-distinct, playable terms in the eight AI-1 categories', () => {
  assert.deepEqual(Object.keys(BATCH31_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH31_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = { bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก' };
  for (const [category, words] of Object.entries(BATCH31_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing from ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} has no canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length, 1, `${word} duplicates an identity`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical, `${word} prefix normalization mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} initial ${initial} is not playable`);
      assert.equal(validAnswer(word, initial, category), true, `${word} must be playable`);
    }
  }
});


// Batch 32 (1 Nov 2026): verified nature names, only the eight AI-1 categories.
const BATCH32_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['ออริกซ์เขาดาบ', 'สุนัขจิ้งจอกแดง'],
  bird: ['นกติ๊ดสุลต่าน', 'นกกระทาดงแข้งเขียว'],
  fish: ['ปลาแป้นกระโดงจุด', 'ปลาหมูสีแก้มแดง'],
  insect: ['เพลี้ยกระโดดหลังขาว', 'แมลงปอเข็มท้องเข็มดำ'],
  plant: ['หญ้าคาทะเล', 'หญ้าใบพาย'],
  tree: ['ไผ่ซางหม่น', 'ไผ่หก'],
  flower: ['เอื้องสีตาล', 'เอื้องดอกมะขาม'],
  nature: ['เมฆสเตรตัส', 'เมฆนิมโบสเตรตัส'],
};

test('batch 32 adds 16 playable canonical-distinct nature terms', () => {
  assert.deepEqual(Object.keys(BATCH32_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH32_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = { bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก' };
  for (const [category, words] of Object.entries(BATCH32_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} has no canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length, 1, `${word} duplicate canonical identity`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical, `${word} prefix normalization mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} not accepted`);
    }
  }
});


test('AI-1 does not add a second name for existing reindeer', () => {
  assert.ok(WORD_BANK.animal.includes('เรนเดียร์'));
  assert.ok(!AI1_NATURE_TERMS.animal.includes('กวางเรนเดียร์'));
  assert.ok(AI1_NATURE_TERMS.animal.includes('กวางซิก้า'));
});


test('batch 32 excludes main-source aliases and literal collisions found in CI', () => {
  assert.ok(!AI1_NATURE_TERMS.animal.includes('วอมแบต'));
  assert.ok(!AI1_NATURE_TERMS.bird.includes('นกตะกรุม'));
  assert.ok(!AI1_NATURE_TERMS.plant.includes('ผักคราดหัวแหวน'));
  assert.ok(!AI1_NATURE_TERMS.nature.includes('เมฆคิวมูลัส'));
});


test('batch 32 does not re-add existing fish after ปลา prefix normalization', () => {
  assert.ok(WORD_BANK.fish.includes('ซิวข้างขวาน'));
  assert.ok(WORD_BANK.fish.includes('ม้าลาย'));
  assert.ok(!AI1_NATURE_TERMS.fish.includes('ปลาซิวข้างขวาน'));
  assert.ok(!AI1_NATURE_TERMS.fish.includes('ปลาม้าลาย'));
});

// Batch 33 (1 Nov 2026): independent source review; 2 real Thai names per AI-1 category.
const BATCH33_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['แมวน้ำวงแหวน', 'แพะภูเขา'],
  bird: ['นกกะรางสร้อยคอเล็ก', 'นกเค้าเหยี่ยว'],
  fish: ['ปลากัดตะวันออก', 'ปลากดหัวแข็ง'],
  insect: ['แมลงช้างกรามโตทัศนัย', 'แมลงช้างกรามโตสยาม'],
  plant: ['หญ้าแฝกหอม', 'หญ้าแฝกดอน'],
  tree: ['ยางปาย', 'กระบากขาว'],
  flower: ['เทียนบ้าน', 'เอื้องสายสามสี'],
  nature: ['หมอกควัน', 'พายุหิมะ'],
};

test('batch 33 adds 16 registered, canonical-distinct, playable nature terms', () => {
  assert.deepEqual(Object.keys(BATCH33_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH33_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก'
  };
  for (const [category, words] of Object.entries(BATCH33_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} has no canonical identity`);
      assert.equal(
        WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length,
        1, `${word} duplicates another canonical identity`
      );
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical, `${word} prefix normalization mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} must be accepted`);
    }
  }
});

test('batch 33 rejects semantically duplicate candidate aliases found during external review', () => {
  assert.ok(AI1_NATURE_TERMS.plant.includes('เฟินใบมะขาม'));
  assert.ok(!AI1_NATURE_TERMS.plant.includes('เฟินก้างปลา'));
  assert.ok(AI1_NATURE_TERMS.plant.includes('หญ้ากกดอกขาว'));
  assert.ok(!AI1_NATURE_TERMS.plant.includes('กกตุ้มหู'));
  assert.ok(AI1_NATURE_TERMS.tree.includes('ก่อเดือย'));
  assert.ok(!AI1_NATURE_TERMS.tree.includes('ก่อแป้น'));
  assert.ok(!AI1_NATURE_TERMS.flower.includes('สร้อยระย้า'));
  assert.ok(WORD_BANK.fish.includes('ซิวควาย'));
  assert.ok(!AI1_NATURE_TERMS.fish.includes('ปลาซิวควาย'));
  assert.ok(!AI1_NATURE_TERMS.fish.includes('ปลาซิวหางแดง'));
});


// Batch 34 (1 Nov 2026): 16 independently sourced Thai names, two per AI-1 category.
const BATCH34_TERMS: Readonly<Record<string, readonly string[]>> = {
  "animal": [
    "ลิงฮาวเลอร์",
    "ลิงมาร์โมเสท"
  ],
  "bird": [
    "นกปากช้อนหน้าดำ",
    "นกกะรางหัวหงอก"
  ],
  "fish": [
    "ปลากระทิงดำ",
    "ปลาหมอสีฟลาวเวอร์ฮอร์น"
  ],
  "insect": [
    "ผีเสื้อฟ้าหนอนมะนาว",
    "ผีเสื้อหนอนเจาะผลธรรมดา"
  ],
  "plant": [
    "กกทราย",
    "หญ้าไซ"
  ],
  "tree": [
    "กระเบาหลัก",
    "ตะเคียนหนู"
  ],
  "flower": [
    "พุดกังหัน",
    "กุหลาบจีน"
  ],
  "nature": [
    "เมฆสเตรโตคิวมูลัส",
    "เมฆแอลโตสเตรตัส"
  ]
};

test('batch 34 registers 16 canonical-distinct, playable names in the eight AI-1 categories', () => {
  assert.deepEqual(Object.keys(BATCH34_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH34_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = { bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก' };
  for (const [category, words] of Object.entries(BATCH34_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing from ${category}`);
      const identity = canonicalAnswer(word, category);
      assert.ok(identity, `${word} has no canonical identity`);
      assert.equal(WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === identity).length, 1, `${word} collides with another identity`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), identity, `${word} has incorrect prefix normalization`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} starts with unplayable ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} not accepted by game`);
    }
  }
});

// Batch 35 (1 Nov 2026): real Thai names with distinct canonical identities.
const BATCH35_TERMS: Readonly<Record<string, readonly string[]>> = {
  "animal": [
    "สกังก์",
    "โอพอสซัม"
  ],
  "bird": [
    "นกคาสโซวารี่",
    "นกแก๊ก"
  ],
  "fish": [
    "ปลาลิ้นควายขนดำ",
    "ปลาสากดำ"
  ],
  "insect": [
    "ด้วงเฮอร์คิวลีส",
    "ผีเสื้อจักรพรรดิ"
  ],
  "plant": [
    "กกนา",
    "กกเล็ก"
  ],
  "tree": [
    "กระถินเงิน",
    "กระถินพิมาน"
  ],
  "flower": [
    "เบญจมาศ",
    "แกลดิโอลัส"
  ],
  "nature": [
    "แสงเหนือ",
    "สุริยุปราคา"
  ]
};

test('batch 35 adds 16 distinct playable names without prefix or literal collisions', () => {
  assert.deepEqual(Object.keys(BATCH35_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH35_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string,string>> = {
    bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก'
  };
  for (const [category, words] of Object.entries(BATCH35_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} missing canonical identity`);
      assert.equal(
        WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === canonical).length,
        1, `${word} collides with a registered answer`
      );
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical, `${word} prefix mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} not accepted`);
      const literal = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [otherCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(bank.filter(existing => normalizeAnswer(existing).toLocaleLowerCase('th') === literal).length,
          otherCategory === category ? 1 : 0, `${word} literal collision in ${otherCategory}`);
      }
    }
  }
});


// Batch 36 (1 Nov 2026): category-verified Thai names, checked against current main.
const BATCH36_TERMS: Readonly<Record<string, readonly string[]>> = {
  "animal": [
    "อ้นใหญ่",
    "แรดขาว"
  ],
  "bird": [
    "นกจาบคาเคราน้ำเงิน",
    "นกคัดคูมรกต"
  ],
  "fish": [
    "ปลาทองริวกิ้น",
    "ปลาการ์ตูนมะเขือเทศ"
  ],
  "insect": [
    "ผีเสื้อหางติ่งชะอ้อนถิ่นใต้",
    "ผีเสื้อหางคู่โคนปีกส้ม"
  ],
  "plant": [
    "หญ้าหางหมาจิ้งจอก",
    "ว่านแม่ยับ"
  ],
  "tree": [
    "ขี้เหล็กเลือด",
    "มะเกลือเลือด"
  ],
  "flower": [
    "พวงหยก",
    "พวงโกเมน"
  ],
  "nature": [
    "พายุทอร์นาโด",
    "แสงใต้"
  ]
};

test('batch 36 adds 16 unique playable nature names with category-local prefix identities', () => {
  assert.deepEqual(Object.keys(BATCH36_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH36_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก'
  };
  for (const [category, words] of Object.entries(BATCH36_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing from ${category}`);
      const identity = canonicalAnswer(word, category);
      assert.ok(identity, `${word} missing canonical identity`);
      assert.equal(
        WORD_BANK[category].filter(existing => canonicalAnswer(existing, category) === identity).length,
        1, `${word} canonical collision in ${category}`
      );
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), identity, `${word} prefix normalization mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} not playable`);
      const literal = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [otherCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(
          bank.filter(existing => normalizeAnswer(existing).toLocaleLowerCase('th') === literal).length,
          otherCategory === category ? 1 : 0,
          `${word} literal collision in ${otherCategory}`
        );
      }
    }
  }
});


// Batch 37: independently sourced TH-BIF species names and natural phenomena.
const BATCH37_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['แรดดำ', 'ลิงโบโนโบ'],
  bird: ['นกแซงแซวเล็กเหลือบ', 'นกแซงแซวปากกา'],
  fish: ['ปลาฉลามหูดำ', 'ปลามังกรน้อยแถบขาว'],
  insect: ['ผีเสื้อหางมังกรเขียว', 'ด้วงหนวดยาวโคนลูกปัด'],
  plant: ['หญ้าหางนกยูงใหญ่', 'ผักปราบใบกว้าง'],
  tree: ['เสลาขาว', 'กางขี้มอด'],
  flower: ['หางกระรอกแดง', 'ประทัดดอย'],
  nature: ['หิมะถล่ม', 'พายุสุริยะ'],
};

test('batch 37 adds 16 canonical-distinct playable names in AI-1 categories', () => {
  assert.deepEqual(Object.keys(BATCH37_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH37_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string,string>> = {
    bird:'นก', fish:'ปลา', insect:'แมลง', tree:'ต้น', flower:'ดอก'
  };
  for (const [category, names] of Object.entries(BATCH37_TERMS)) {
    for (const word of names) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing in ${category}`);
      const identity = canonicalAnswer(word, category);
      assert.ok(identity, `${word} lacks canonical identity`);
      assert.equal(WORD_BANK[category].filter(item => canonicalAnswer(item, category) === identity).length, 1,
        `${word} duplicates a registered canonical answer`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), identity, `${word} prefix mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} not accepted`);
      const normalized = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(bank.filter(item => normalizeAnswer(item).toLocaleLowerCase('th') === normalized).length,
          bankCategory === category ? 1 : 0, `${word} duplicates literal in ${bankCategory}`);
      }
    }
  }
});

 
// Batch 38: 13 source-distinct Thai names; QA corrections are replacements, not additions.
const BATCH38_TERMS: Readonly<Record<string, readonly string[]>> = {
  "animal": [
    "มานาที",
    "อีแลนด์"
  ],
  "bird": [
    "นกกีวี",
    "นกเค้าแมวหิมะ"
  ],
  "fish": [
    "ปลากระเบนราหูยักษ์",
    "ปลากระเบนปีศาจหางหนาม"
  ],
  "insect": [
    "เพลี้ยจักจั่นฝอยทุเรียน",
    "เพลี้ยไฟฝ้าย"
  ],
  "plant": [
    "สาหร่ายวากาเมะ"
  ],
  "tree": [
    "ก่อหรั่ง"
  ],
  "flower": [
    "เยอบีร่า"
  ],
  "nature": [
    "เมฆรูปเลนส์",
    "เมฆแมมมาตัส"
  ]
};

test('batch 38 adds 13 playable, category-correct and canonical-distinct nature terms', () => {
  assert.deepEqual(Object.keys(BATCH38_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH38_TERMS).flat().length, 13);
  const prefixes: Readonly<Record<string,string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก'
  };
  for (const [category, words] of Object.entries(BATCH38_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing from ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} lacks a canonical identity`);
      assert.equal(WORD_BANK[category].filter(item => canonicalAnswer(item, category) === canonical).length, 1,
        `${word} duplicates a registered canonical answer`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical, `${word} prefix identity mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} not accepted by the game`);
      const literal = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(bank.filter(item => normalizeAnswer(item).toLocaleLowerCase('th') === literal).length,
          bankCategory === category ? 1 : 0, `${word} literal collision in ${bankCategory}`);
      }
    }
  }
});

test('AI-5 spelling and cross-PR species-identity HOLD items are corrected', () => {
  assert.ok(AI1_NATURE_TERMS.bird.includes('นกกะเต็นน้อยสามนิ้ว'));
  assert.ok(!AI1_NATURE_TERMS.bird.includes('นกกระเต็นน้อยสามนิ้ว'));
  assert.ok(!AI1_NATURE_TERMS.tree.includes('ตะขบป่า'), 'fruit PR #109 owns the same species');
  assert.ok(AI1_NATURE_TERMS.tree.includes('กะทังใบใหญ่'), 'Litsea grandis is a distinct tree replacement');
});


// Batch 39 (1 Nov 2026): independently sourced species and weather terms.
// Sources: ONEP Thai Biodiversity (Songkhla lagoon), DOAE/DOA insect research,
// Baanlaesuan flower profiles and Thai Meteorological Department observations.
const BATCH39_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['หนูป่ามาเลย์', 'กระรอกปลายหางดำ'],
  bird: ['นกคัดคูสีทองแดง', 'นกบั้งรอกเล็กท้องแดง'],
  fish: ['ปลากุเราปานดำ', 'ปลาบู่ทองแก้มลาย'],
  insect: ['ด้วงงวงข้าวโพด', 'เพลี้ยอ่อนฝ้าย'],
  plant: ['กะเม็ง', 'หญ้างวงช้าง'],
  tree: ['ยางวาด', 'เสม็ดชุน'],
  flower: ['บานชื่นหนู', 'บานเที่ยง'],
  nature: ['ฟ้าหลัวแห้ง', 'ลมกระโชก'],
};

test('batch 39 registers 16 distinct playable AI-1 terms without cross-bank or prefix collisions', () => {
  assert.deepEqual(Object.keys(BATCH39_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH39_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string, string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก',
  };
  for (const [category, names] of Object.entries(BATCH39_TERMS)) {
    for (const word of names) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing in ${category}`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} has no canonical identity`);
      assert.equal(WORD_BANK[category].filter(item => canonicalAnswer(item, category) === canonical).length,
        1, `${word} duplicates a registered canonical answer`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), canonical, `${word} prefix mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} not playable`);
      const literal = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(bank.filter(item => normalizeAnswer(item).toLocaleLowerCase('th') === literal).length,
          bankCategory === category ? 1 : 0, `${word} duplicates a literal in ${bankCategory}`);
      }
    }
  }
});

// Batch 40: source-reviewed Thai nature vocabulary, kept in the eight AI-1 categories.
// References: Bangkok Metropolitan Administration tree inventory, Chiang Mai Zoo
// Aquarium, DMCR Nepenthes survey, Thai flower/bird nurseries and DOAE pest records.
const BATCH40_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: [
    'เม่นแคระแอฟริกา',
    'อาร์มาดิลโลเก้าแถบ'
  ],
  bird: [
    'นกฟินซ์เจ็ดสี',
    'นกซีบร้าฟินซ์'
  ],
  fish: [
    'ปลาผีดำ',
    'ปลาดุกไฟฟ้า'
  ],
  insect: [
    'เพลี้ยแป้งมันสำปะหลัง',
    'ด้วงถั่วเขียว'
  ],
  plant: [
    'หม้อข้าวหม้อแกงลิง'
  ],
  tree: [
    'ไทรย้อยใบทู่',
    'ตะโกสวน'
  ],
  flower: [
    'ดอกไอริส',
    'ฟอร์เก็ตมีน็อต'
  ],
  nature: [
    'รุ้งสองชั้น',
    'คลื่นความร้อน'
  ]
};

test('batch 40 contributes 15 new playable canonical-distinct nature answers', () => {
  assert.deepEqual(Object.keys(BATCH40_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH40_TERMS).flat().length, 15);
  const prefixes: Readonly<Record<string,string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก',
  };
  for (const [category, names] of Object.entries(BATCH40_TERMS)) {
    for (const word of names) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} not in AI-1 bank`);
      const canonical = canonicalAnswer(word, category);
      assert.ok(canonical, `${word} lacks canonical identity`);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length,
        1, `${word} canonical collision`);
      const prefix = prefixes[category];
      if (prefix) {
        const alternative = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(alternative, category), canonical, `${word} prefix mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} unplayable consonant ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} not accepted in gameplay`);
      const literal = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [bankCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(bank.filter(entry => normalizeAnswer(entry).toLocaleLowerCase('th') === literal).length,
          bankCategory === category ? 1 : 0, `${word} duplicate literal in ${bankCategory}`);
      }
    }
  }
});

// Batch 41: Thai Biodiversity Information Facility (ONEP) species lists
// and Thai Meteorological Department wind glossary; category-prefix variants
// must retain one canonical identity.
const BATCH41_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: ['นากเล็บสั้น', 'กบรายา'],
  bird: ['นกแอ่นฟ้าหงอน', 'นกเด้าลมเหลือง'],
  fish: ['ปลาบู่จุดเขียวใหญ่', 'ปลาสีกุนกบ'],
  insect: ['ผีเสื้อแผนที่ธรรมดา', 'ผีเสื้อหางมังกรขาว'],
  plant: ['หญ้านิ้วหนู', 'กกมารี'],
  tree: ['สะท้อนรอก', 'นวลเสี้ยน'],
  flower: ['พุดทุ่ง', 'ระย้าแก้ว'],
  nature: ['ลมกรด', 'ลมภูเขา']
};

test('batch 41 adds 16 playable canonical-distinct names in eight nature categories', () => {
  assert.deepEqual(Object.keys(BATCH41_TERMS).sort(), [...NATURE_CATEGORIES].sort());
  assert.equal(Object.values(BATCH41_TERMS).flat().length, 16);
  const prefixes: Readonly<Record<string,string>> = {
    bird: 'นก', fish: 'ปลา', insect: 'แมลง', tree: 'ต้น', flower: 'ดอก',
  };
  for (const [category, words] of Object.entries(BATCH41_TERMS)) {
    for (const word of words) {
      assert.ok(AI1_NATURE_TERMS[category].includes(word), `${word} missing in ${category}`);
      const identity = canonicalAnswer(word, category);
      assert.ok(identity, `${word} empty canonical identity`);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === identity).length,
        1, `${word} duplicate canonical identity`);
      const prefix = prefixes[category];
      if (prefix) {
        const variant = word.startsWith(prefix) ? word.slice(prefix.length) : prefix + word;
        assert.equal(canonicalAnswer(variant, category), identity, `${word} prefix mismatch`);
      }
      const initial = wordInitialForCategory(word, category);
      assert.ok((LETTERS as readonly string[]).includes(initial), `${word} unplayable initial ${initial}`);
      assert.equal(validAnswer(word, initial, category), true, `${word} not accepted`);
      const literal = normalizeAnswer(word).toLocaleLowerCase('th');
      for (const [otherCategory, bank] of Object.entries(WORD_BANK)) {
        assert.equal(bank.filter(entry => normalizeAnswer(entry).toLocaleLowerCase('th') === literal).length,
          otherCategory === category ? 1 : 0, `${word} duplicate literal in ${otherCategory}`);
      }
    }
  }
});
