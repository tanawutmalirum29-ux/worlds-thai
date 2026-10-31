import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { AI4_OBJECTS_GEO_TERMS } from '../amplify/functions/game/ai4-objects-geo-terms-20261031-b.ts';
import { ADDITIONAL_VEHICLES_20261031 } from '../amplify/functions/game/additional-vehicles-20261031.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, LETTERS, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage }
  from '../amplify/functions/game/moderation.ts';

const EXPECTED_INITIALS: Readonly<Record<string, readonly string[]>> = {
  clothing: ['ก', 'ส', 'ส', 'ส', 'ส', 'ก', 'ช', 'ช', 'ห', 'ส', 'ช', 'ช', 'ส', 'ร', 'ช', 'ก', 'ร', 'ส', 'ร', 'ส', 'ร', 'ถ', 'ส', 'ก', 'ช', 'ก', 'ร', 'ถ', 'ช', 'ถ', 'ช', 'ร', 'ห', 'ร', 'ห', 'ส', 'ส', 'ห', 'ส', 'ผ', 'ถ', 'ส', 'ร', 'ส', 'ช', 'ร', 'ผ', 'ช', 'ส', 'ร', 'ถ', 'ถ'],
  vehicle: ['ร', 'ร', 'ร', 'จ', 'ค', 'จ', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'จ', 'ร', 'ร', 'ร', 'ร', 'ค', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ค', 'ร', 'ร', 'ร'],
  device: ['ค', 'ค', 'ค', 'ต', 'ต', 'ต', 'ค', 'ค', 'ต', 'ค', 'ค', 'ค', 'ค', 'ก', 'ค', 'ต', 'ค', 'ต', 'ค', 'ค', 'ห', 'ค', 'พ', 'น', 'ต', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ค', 'ป', 'น'],
  tool: ['ค', 'ด', 'ป', 'ป', 'ห', 'ค', 'ค', 'ห', 'ข', 'ค', 'ฉ', 'ค', 'บ', 'ล', 'ท', 'ป', 'บ', 'ค', 'ต', 'ค', 'ป', 'ป', 'ว', 'ค', 'ห', 'ป', 'ป', 'ก', 'ป', 'ป', 'ท', 'ค', 'ท', 'ก', 'ห', 'ต', 'ป', 'ห', 'ล', 'ป', 'ค', 'ป', 'ค', 'ต', 'ก', 'ม', 'ม', 'ค', 'ก', 'ค', 'ป', 'ต'],
  place: ['ร', 'พ', 'ส', 'ต', 'ท', 'ร', 'ห', 'ร', 'อ', 'ร', 'ร', 'ส', 'ศ', 'ท', 'ศ', 'ศ', 'ร', 'ส', 'ศ', 'บ', 'ส', 'ท', 'ห', 'ส', 'ร', 'ศ', 'ส', 'ร', 'ร', 'ส', 'ห', 'ร', 'ส', 'ร', 'ล', 'อ', 'ร', 'ส', 'อ', 'ห', 'ร', 'ร', 'ร', 'ส', 'ส', 'ร', 'ส', 'ล', 'ร', 'ส', 'ร', 'ท'],
};

test('AI-4 batches 2–14 register exactly 260 clean and canonically unique terms', () => {
  assert.deepEqual(Object.keys(AI4_OBJECTS_GEO_TERMS), Object.keys(EXPECTED_INITIALS));
  const all = Object.values(AI4_OBJECTS_GEO_TERMS).flat();
  assert.equal(all.length, 260);
  assert.equal(new Set(all).size, 260, 'duplicate literal within AI-4 batches');

  for (const [category, words] of Object.entries(AI4_OBJECTS_GEO_TERMS)) {
    assert.equal(words.length, 52, 'unexpected count: ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size,
      words.length, 'duplicate canonical identity within AI-4 category: ' + category);
    for (const [index, word] of words.entries()) {
      assert.equal(word, word.trim().normalize('NFC'), 'noncanonical spacing: ' + word);
      assert.ok(word.length > 1 && word.length <= 48, 'invalid length: ' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation rejected: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked answer: ' + word);
      const initial = EXPECTED_INITIALS[category][index];
      assert.equal(wordInitialForCategory(word, category), initial, 'wrong initial: ' + word);
      assert.equal(
        WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonicalAnswer(word, category)).length,
        1, 'missing or duplicated canonical identity in live bank: ' + category + '/' + word
      );
      if (eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word, initial, category), true,
          'registered term not accepted: ' + category + '/' + word);
    }
  }
});


/** The live WORD_BANK uses Set deduplication, so checking it alone can hide
 * an AI-4 word already present in another source module. Scan the actual
 * category arrays that feed the live bank, excluding only AI-4's own file.
 */
function canonicalIdentitiesFromOtherSources(): Map<string, Set<string>> {
  const categories = new Set(Object.keys(AI4_OBJECTS_GEO_TERMS));
  const identities = new Map([...categories].map(category => [category, new Set<string>()]));
  const folder = new URL('../amplify/functions/game/', import.meta.url);
  for (const filename of readdirSync(folder)) {
    if (!filename.endsWith('.ts') || filename.startsWith('ai4-objects-geo-')) continue;
    const source = ts.createSourceFile(filename,
      readFileSync(new URL(filename, folder), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    function visit(node: ts.Node): void {
      if (ts.isPropertyAssignment(node)
        && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
        && categories.has(node.name.text)
        && ts.isArrayLiteralExpression(node.initializer)) {
        const category = node.name.text;
        for (const element of node.initializer.elements) {
          if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element))
            identities.get(category)!.add(canonicalAnswer(element.text, category));
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  // This standalone list is merged into WORD_BANK.vehicle but has no
  // `vehicle: [...]` property for the AST scanner above to discover.
  for (const vehicle of ADDITIONAL_VEHICLES_20261031)
    identities.get('vehicle')!.add(canonicalAnswer(vehicle, 'vehicle'));
  return identities;
}

test('AI-4 batches 5–14 contribute 200 new canonical identities beyond the other live sources', () => {
  const existing = canonicalIdentitiesFromOtherSources();
  // Regression guard: the duplicate rejected by AI-5 must be visible to this scanner.
  // AI-5 semantic QA: barcode scanners and barcode readers are the same device.
  // Their distinct spellings are NOT a new device; do not add either to AI-4.
  assert.ok(existing.get('device')?.has(canonicalAnswer('เครื่องอ่านบาร์โค้ด', 'device')),
    'source scan must find the existing barcode reader');
  assert.ok(!AI4_OBJECTS_GEO_TERMS.device.includes('เครื่องสแกนบาร์โค้ด'),
    'barcode scanner is a semantic duplicate of the existing barcode reader');
  assert.ok(!AI4_OBJECTS_GEO_TERMS.device.includes('เครื่องอ่านบาร์โค้ด'),
    'do not duplicate the existing barcode reader in AI-4');
  assert.ok(AI4_OBJECTS_GEO_TERMS.device.includes('เครื่องสแกนลายนิ้วมือ'),
    'the distinct fingerprint scanner must be registered');
  // AI-5 semantic review: cargo aircraft is already represented by
  // `เครื่องบินลำเลียง` in the standalone vehicle vocabulary.
  assert.ok(existing.get('vehicle')?.has(canonicalAnswer('เครื่องบินลำเลียง', 'vehicle')),
    'source scan must include the standalone vehicle vocabulary');
  assert.ok(!AI4_OBJECTS_GEO_TERMS.vehicle.includes('เครื่องบินบรรทุกสินค้า'),
    'cargo aircraft is a semantic duplicate of existing transport aircraft');
  assert.ok(AI4_OBJECTS_GEO_TERMS.vehicle.includes('รถขนส่งผู้ต้องขัง'),
    'prisoner transport vehicle must replace the duplicate aircraft');
  assert.ok(existing.get('tool')?.has(canonicalAnswer('กรรไกรตัดเหล็ก', 'tool')),
    'source scan must detect tools already registered by expanded-thai-terms');
  // AI-5 semantic QA: a generic tile cutter already exists in the live tool bank.
  assert.ok(existing.get('tool')?.has(canonicalAnswer('เครื่องตัดกระเบื้อง', 'tool')),
    'source scan must detect the existing tile cutter');
  assert.ok(!AI4_OBJECTS_GEO_TERMS.tool.includes('ที่ตัดกระเบื้อง'),
    'do not reintroduce a synonym for the existing tile cutter');
  // AI-5 semantic QA: a nail-set punch is already represented by เหล็กส่ง.
  assert.ok(existing.get('tool')?.has(canonicalAnswer('เหล็กส่ง', 'tool')),
    'source scan must detect the registered nail-setting punch');
  assert.ok(!AI4_OBJECTS_GEO_TERMS.tool.includes('เหล็กส่งตะปู'),
    'nail-setting punch is a semantic alias of the existing เหล็กส่ง');
  assert.ok(AI4_OBJECTS_GEO_TERMS.tool.includes('เหล็กตอกตัวอักษร'),
    'letter stamp punch is a distinct tool for imprinting characters, not setting nails');
  let added = 0;
  for (const [category, words] of Object.entries(AI4_OBJECTS_GEO_TERMS)) {
    for (const word of words.slice(-40)) {
      const canonical = canonicalAnswer(word, category);
      assert.ok(!existing.get(category)?.has(canonical),
        'not a new canonical identity: ' + category + '/' + word);
      assert.equal(WORD_BANK[category].filter(entry =>
        canonicalAnswer(entry, category) === canonical).length, 1,
        'missing or duplicated in live WORD_BANK: ' + category + '/' + word);
      added++;
    }
  }
  assert.equal(added, 200);
});

const BATCH_7: Readonly<Record<string, readonly string[]>> = {
  clothing: ['รองเท้าบูตยาง', 'ถุงเท้ากีฬา', 'เสื้อยืดคอกลม', 'กางเกงเอี๊ยม'],
  vehicle: ['เรือสปีดโบ๊ต', 'เครื่องบินใบพัด', 'รถสามล้อถีบ', 'รถบ้าน'],
  device: ['หุ่นยนต์ดูดฝุ่น', 'เครื่องตรวจจับควัน', 'พัดลมไร้ใบพัด', 'นาฬิกาปลุกดิจิทัล'],
  tool: ['ปืนยิงลวด', 'ประแจสายพาน', 'เวอร์เนียร์คาลิปเปอร์', 'คีมถอนตะปู'],
  place: ['สนามยิงธนู', 'ท่ารถตู้', 'ห้องสมุดประชาชน', 'สนามแข่งม้า']
};

test('AI-4 batch 7 adds exactly 20 reviewed terms in owned categories', () => {
  assert.deepEqual(Object.keys(BATCH_7), Object.keys(AI4_OBJECTS_GEO_TERMS));
  assert.equal(Object.values(BATCH_7).flat().length, 20);
  for (const [category, words] of Object.entries(BATCH_7)) {
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category as keyof typeof AI4_OBJECTS_GEO_TERMS].slice(-32, -28), words,
      'unexpected batch 7 vocabulary in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
  }
});

const BATCH_8: Readonly<Record<string, readonly string[]>> = {
  clothing: ['ชุดกี่เพ้า', 'กางเกงขาสามส่วน', 'รองเท้าผ้าใบหุ้มข้อ', 'ถุงเท้ายาว'],
  vehicle: ['เรือกู้ภัย', 'รถบัสสองชั้น', 'รถกระบะสี่ประตู', 'รถไฟฟ้ารางเดี่ยว'],
  device: ['เตาไฟฟ้า', 'เครื่องไล่ยุงไฟฟ้า', 'เครื่องนวดไฟฟ้า', 'เครื่องวัดฝุ่น'],
  tool: ['เหล็กขีด', 'แปรงทาสี', 'ประแจตัวที', 'เกรียงฉาบปูน'],
  place: ['โรงงานน้ำตาล', 'ศูนย์อพยพ', 'สถานีรถไฟฟ้า', 'โรงเรียนสอนขับรถ']
};

test('AI-4 batch 8 adds 20 new reviewed terms in owned categories', () => {
  assert.deepEqual(Object.keys(BATCH_8), Object.keys(AI4_OBJECTS_GEO_TERMS));
  assert.equal(Object.values(BATCH_8).flat().length, 20);
  for (const category of Object.keys(BATCH_8) as Array<keyof typeof AI4_OBJECTS_GEO_TERMS>) {
    const words = BATCH_8[category];
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category].slice(-28, -24), words,
      'unexpected batch 8 vocabulary in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
  }
});

const BATCH_9: Readonly<Record<string, readonly string[]>> = {
  clothing: ['ชุดอวกาศ', 'ถุงมือหนัง', 'ชุดป้องกันสารเคมี', 'รองเท้าส้นเตี้ย'],
  vehicle: ['รถขนส่งนักเรียน', 'รถห้องเย็น', 'เรือบรรทุกน้ำมัน', 'รถขนส่งผู้ต้องขัง'],
  device: ['เครื่องสแกนลายนิ้วมือ', 'เครื่องตรวจน้ำตาลในเลือด', 'เครื่องนับธนบัตร', 'เครื่องนึ่งขวดนม'],
  tool: ['ประแจปากตาย', 'ปากกาจับท่อ', 'ที่ดัดท่อ', 'คีมย้ำสายแลน'],
  place: ['โรงฆ่าสัตว์', 'สถานีตรวจอากาศ', 'หอควบคุมการบิน', 'โรงงานประกอบรถยนต์']
};

test('AI-4 batch 9 adds 20 reviewed and canonical-unique terms in owned categories', () => {
  assert.deepEqual(Object.keys(BATCH_9), Object.keys(AI4_OBJECTS_GEO_TERMS));
  assert.equal(Object.values(BATCH_9).flat().length, 20);
  for (const category of Object.keys(BATCH_9) as Array<keyof typeof AI4_OBJECTS_GEO_TERMS>) {
    const words = BATCH_9[category];
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category].slice(-24, -20), words,
      'unexpected batch 9 vocabulary in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
  }
});


const BATCH_10: Readonly<Record<string, readonly string[]>> = {
  'clothing': [
    'หมวกทรงกระบอก',
    'รองเท้าสเก็ตน้ำแข็ง',
    'หมวกบัณฑิต',
    'สนับแข้ง'
  ],
  'vehicle': [
    'รถลากจูงเครื่องบิน',
    'รถพ่นหมอกควัน',
    'เรือลากจูง',
    'รถเจาะเสาเข็ม'
  ],
  'device': [
    'เครื่องทำสายไหม',
    'เครื่องนับเหรียญ',
    'เครื่องอ่านบัตรประชาชน',
    'เครื่องทำป๊อปคอร์น'
  ],
  'tool': [
    'ที่เจาะรูเข็มขัด',
    'เกจวัดลมยาง',
    'เหล็กตอกตัวอักษร',
    'ตัวดูดลูกปืน'
  ],
  'place': [
    'สถานีสูบน้ำ',
    'โรงคั่วกาแฟ',
    'ลานจอดเฮลิคอปเตอร์',
    'อู่ซ่อมรถไฟ'
  ]
};

test('AI-4 batch 10 adds 20 distinct reviewed objects and places', () => {
  assert.deepEqual(Object.keys(BATCH_10), Object.keys(AI4_OBJECTS_GEO_TERMS));
  assert.equal(Object.values(BATCH_10).flat().length, 20);
  for (const category of Object.keys(BATCH_10) as Array<keyof typeof AI4_OBJECTS_GEO_TERMS>) {
    const words = BATCH_10[category];
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category].slice(-20, -16), words,
      'unexpected batch 10 vocabulary in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
  }
  // Reject semantic aliases of vehicles already registered in the main bank.
  assert.ok(ADDITIONAL_VEHICLES_20261031.includes('รถเกี่ยวข้าว'));
  assert.ok(ADDITIONAL_VEHICLES_20261031.includes('รถเกรดเดอร์'));
  assert.ok(!AI4_OBJECTS_GEO_TERMS.vehicle.includes('รถเก็บเกี่ยวข้าว'));
  assert.ok(!AI4_OBJECTS_GEO_TERMS.vehicle.includes('รถเกลี่ยดิน'));
});


const BATCH_11: Readonly<Record<string, readonly string[]>> = {
  clothing: ['เสื้อฮาวาย', 'หมวกกะลาสี', 'เสื้อกั๊กช่างภาพ', 'ผ้าคลุมเจ้าสาว'],
  vehicle: ['รถดับเพลิงบันไดสูง', 'รถเครนล้อยาง', 'เรือท้องกระจก', 'รถตักหน้าขุดหลัง'],
  device: ['เครื่องวัดออกซิเจนปลายนิ้ว', 'เครื่องฆ่าเชื้อยูวี', 'เครื่องตรวจจับโลหะ', 'เครื่องให้อาหารสัตว์อัตโนมัติ'],
  tool: ['ประแจโซ่', 'เหล็กงัดยาง', 'เลื่อยหางหนู', 'ปืนพ่นสี'],
  place: ['โรงน้ำแข็ง', 'สถานสงเคราะห์เด็ก', 'อาคารจอดรถ', 'ห้องเก็บเอกสาร']
};

test('AI-4 batch 11 adds 20 reviewed canonical-unique entries in owned categories', () => {
  assert.deepEqual(Object.keys(BATCH_11), Object.keys(AI4_OBJECTS_GEO_TERMS));
  assert.equal(Object.values(BATCH_11).flat().length, 20);
  const existing = canonicalIdentitiesFromOtherSources();
  for (const category of Object.keys(BATCH_11) as Array<keyof typeof AI4_OBJECTS_GEO_TERMS>) {
    const words = BATCH_11[category];
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category].slice(-16, -12), words);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
    for (const word of words) {
      assert.ok(!existing.get(category)?.has(canonicalAnswer(word, category)),
        'duplicate from another module: ' + category + '/' + word);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonicalAnswer(word, category)).length, 1);
      assert.equal(isInappropriateLanguage(word), false);
      assert.equal(isBlockedStandaloneAnswer(word), false);
    }
  }
});

const BATCH_12: Readonly<Record<string, readonly string[]>> = {
  clothing: ['ถุงมือกันความร้อน', 'สนับศอก', 'รองเท้ากอล์ฟ', 'เสื้อเกราะกันกระแทก'],
  vehicle: ['รถปูยางมะตอย', 'เรือดำน้ำท่องเที่ยว', 'รถตักตีนตะขาบ', 'รถฉีดน้ำล้างถนน'],
  device: ['เครื่องซีลสูญญากาศ', 'เครื่องตรวจจับก๊าซ', 'เครื่องอบผลไม้', 'เครื่องเคลือบบัตร'],
  tool: ['เครื่องวัดระยะเลเซอร์', 'ปืนเป่าลม', 'คีมตัดสายเคเบิล', 'ตัวดูดกระจก'],
  place: ['โรงเพาะเห็ด', 'โรงงานทอผ้า', 'โรงเก็บเรือ', 'สถานีชาร์จรถยนต์ไฟฟ้า']
};

test('AI-4 batch 12 adds 20 new canonical-unique entries in owned categories', () => {
  assert.deepEqual(Object.keys(BATCH_12), Object.keys(AI4_OBJECTS_GEO_TERMS));
  assert.equal(Object.values(BATCH_12).flat().length, 20);
  const existing = canonicalIdentitiesFromOtherSources();
  for (const category of Object.keys(BATCH_12) as Array<keyof typeof AI4_OBJECTS_GEO_TERMS>) {
    const words = BATCH_12[category];
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category].slice(-12, -8), words);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
    for (const word of words) {
      const canonical = canonicalAnswer(word, category);
      assert.ok(!existing.get(category)?.has(canonical),
        'duplicate from another source: ' + category + '/' + word);
      assert.equal(WORD_BANK[category].filter(entry =>
        canonicalAnswer(entry, category) === canonical).length, 1);
      assert.equal(isInappropriateLanguage(word), false);
      assert.equal(isBlockedStandaloneAnswer(word), false);
      assert.equal(wordInitialForCategory(word, category), wordInitialForCategory(canonical, category));
      const initial = wordInitialForCategory(word, category);
      assert.ok(LETTERS.includes(initial), 'initial excluded from playable letters: ' + category + '/' + word);
      assert.ok(eligibleCategories(initial).includes(category), 'category unavailable for initial: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'registered but unplayable: ' + category + '/' + word);
    }
  }
});


test('AI-4 batch 12 rejects snowmobile semantic alias already in the main bank', () => {
  // รถสโนว์โมบิล and สโนว์โมบิล are the same vehicle despite distinct canonical strings.
  assert.ok(WORD_BANK.vehicle.includes('สโนว์โมบิล'));
  assert.ok(!AI4_OBJECTS_GEO_TERMS.vehicle.includes('รถสโนว์โมบิล'));
  // Asphalt pavers lay asphalt; unlike existing road rollers they do not compact it.
  assert.ok(AI4_OBJECTS_GEO_TERMS.vehicle.includes('รถปูยางมะตอย'));
  assert.ok(WORD_BANK.vehicle.includes('รถบดถนน'));
  assert.equal(wordInitialForCategory('รถปูยางมะตอย', 'vehicle'), 'ร');
  assert.equal(validAnswer('รถปูยางมะตอย', 'ร', 'vehicle'), true);
});

const BATCH_13: Readonly<Record<string, readonly string[]>> = {
  clothing: ['ชุดสกี', 'รองเท้าปีนผา', 'ผ้ารัดข้อมือ', 'ชุดเต้นบัลเลต์'],
  vehicle: ['รถไฟไอน้ำ', 'รถไฟตรวจราง', 'เรือกวาดทุ่นระเบิด', 'รถขนส่งกระจก'],
  device: ['เครื่องทำโยเกิร์ต', 'เครื่องอุ่นนม', 'เครื่องพ่นละอองยา', 'เครื่องตรวจวัดคุณภาพน้ำ'],
  tool: ['เกจวัดเกลียว', 'ไม้ฉากปรับมุม', 'มีดปาดสี', 'ค้อนทองแดง'],
  place: ['สนามซ้อมกอล์ฟ', 'โรงงานผลิตกระดาษ', 'สถานีเรดาร์', 'ลานสเก็ตบอร์ด']
};

test('AI-4 batch 13 adds 20 playable and canonical-unique objects and places', () => {
  assert.deepEqual(Object.keys(BATCH_13), Object.keys(AI4_OBJECTS_GEO_TERMS));
  assert.equal(Object.values(BATCH_13).flat().length, 20);
  const existing = canonicalIdentitiesFromOtherSources();
  for (const category of Object.keys(BATCH_13) as Array<keyof typeof AI4_OBJECTS_GEO_TERMS>) {
    const words = BATCH_13[category];
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category].slice(-8, -4), words);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
    for (const word of words) {
      const canonical = canonicalAnswer(word, category);
      assert.ok(!existing.get(category)?.has(canonical), 'duplicate from other source: ' + category + '/' + word);
      assert.equal(WORD_BANK[category].filter(entry =>
        canonicalAnswer(entry, category) === canonical).length, 1);
      assert.equal(isInappropriateLanguage(word), false, 'inappropriate: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: ' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(LETTERS.includes(initial), 'unplayable initial: ' + category + '/' + word);
      assert.ok(eligibleCategories(initial).includes(category), 'unavailable category: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'not accepted: ' + category + '/' + word);
    }
  }
  assert.ok(WORD_BANK.vehicle.includes('รถบรรทุกไม้'));
  assert.ok(!AI4_OBJECTS_GEO_TERMS.vehicle.includes('รถบรรทุกซุง'));
  assert.ok(WORD_BANK.clothing.includes('เสื้อยืดคอวี'));
  assert.ok(!AI4_OBJECTS_GEO_TERMS.clothing.includes('เสื้อคอวี'));
});


const BATCH_14: Readonly<Record<string, readonly string[]>> = {
  clothing: ['เสื้อกั๊กตกปลา', 'รองเท้าบูตขี่ม้า', 'ถุงมือทำสวน', 'ถุงเท้ากันน้ำ'],
  vehicle: ['เครื่องบินเติมน้ำมันกลางอากาศ', 'เรือพยาบาล', 'รถตรวจวัดมลพิษ', 'เรือเก็บขยะ'],
  device: ['เครื่องตัดกระดาษไฟฟ้า', 'เครื่องบันทึกเสียงดิจิทัล', 'ป้ายไฟวิ่ง', 'นาฬิกาจับเวลาดิจิทัล'],
  tool: ['เกจวัดรัศมี', 'คีมถอดคลิปพลาสติก', 'ประแจถอดกรองน้ำมันเครื่อง', 'ตะไบเพชร'],
  place: ['โรงงานผลิตปุ๋ย', 'สถานีตรวจสภาพรถ', 'โรงงานผลิตกระจก', 'ท่าเรือน้ำลึก']
};

test('AI-4 batch 14 adds 20 distinct playable terms without cross-source collisions', () => {
  assert.deepEqual(Object.keys(BATCH_14), Object.keys(AI4_OBJECTS_GEO_TERMS));
  assert.equal(Object.values(BATCH_14).flat().length, 20);
  const existing = canonicalIdentitiesFromOtherSources();
  for (const category of Object.keys(BATCH_14) as Array<keyof typeof AI4_OBJECTS_GEO_TERMS>) {
    const words = BATCH_14[category];
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category].slice(-4), words);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
    for (const word of words) {
      const canonical = canonicalAnswer(word, category);
      assert.ok(!existing.get(category)?.has(canonical), 'duplicate source identity: ' + category + '/' + word);
      assert.equal(WORD_BANK[category].filter(entry => canonicalAnswer(entry, category) === canonical).length,
        1, 'not uniquely registered: ' + category + '/' + word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation rejected: ' + word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked answer: ' + word);
      const initial = wordInitialForCategory(word, category);
      assert.ok(LETTERS.includes(initial), 'unplayable initial: ' + category + '/' + word);
      assert.ok(eligibleCategories(initial).includes(category), 'category not available for initial: ' + category + '/' + word);
      assert.equal(validAnswer(word, initial, category), true, 'registered but not accepted: ' + category + '/' + word);
    }
  }
});
