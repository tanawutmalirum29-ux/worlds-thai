import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { AI4_OBJECTS_GEO_TERMS } from '../amplify/functions/game/ai4-objects-geo-terms-20261031-b.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory }
  from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage }
  from '../amplify/functions/game/moderation.ts';

const EXPECTED_INITIALS: Readonly<Record<string, readonly string[]>> = {
  clothing: ['ก', 'ส', 'ส', 'ส', 'ส', 'ก', 'ช', 'ช', 'ห', 'ส', 'ช', 'ช', 'ส', 'ร', 'ช', 'ก', 'ร', 'ส', 'ร', 'ส', 'ร', 'ถ', 'ส', 'ก', 'ช', 'ก', 'ร', 'ถ'],
  vehicle: ['ร', 'ร', 'ร', 'จ', 'ค', 'จ', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'ร', 'จ', 'ร', 'ร', 'ร', 'ร', 'ค', 'ร', 'ร', 'ร', 'ร', 'จ', 'ร'],
  device: ['ค', 'ค', 'ค', 'ต', 'ต', 'ต', 'ค', 'ค', 'ต', 'ค', 'ค', 'ค', 'ค', 'ก', 'ค', 'ต', 'ค', 'ต', 'ค', 'ค', 'ห', 'ค', 'พ', 'น', 'ต', 'ค', 'ค', 'ค'],
  tool: ['ค', 'ด', 'ป', 'ป', 'ห', 'ค', 'ค', 'ห', 'ข', 'ค', 'ฉ', 'ค', 'บ', 'ล', 'ท', 'ป', 'บ', 'ค', 'ต', 'ค', 'ป', 'ป', 'ว', 'ค', 'ห', 'ป', 'ป', 'ก'],
  place: ['ร', 'พ', 'ส', 'ต', 'ท', 'ร', 'ห', 'ร', 'อ', 'ร', 'ร', 'ส', 'ศ', 'ท', 'ศ', 'ศ', 'ร', 'ส', 'ศ', 'บ', 'ส', 'ท', 'ห', 'ส', 'ร', 'ศ', 'ส', 'ร'],
};

test('AI-4 batches 2–8 register exactly 140 clean and canonically unique terms', () => {
  assert.deepEqual(Object.keys(AI4_OBJECTS_GEO_TERMS), Object.keys(EXPECTED_INITIALS));
  const all = Object.values(AI4_OBJECTS_GEO_TERMS).flat();
  assert.equal(all.length, 140);
  assert.equal(new Set(all).size, 140, 'duplicate literal within AI-4 batches');

  for (const [category, words] of Object.entries(AI4_OBJECTS_GEO_TERMS)) {
    assert.equal(words.length, 28, 'unexpected count: ' + category);
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
  return identities;
}

test('AI-4 batches 5–8 contribute 80 new canonical identities beyond the other live sources', () => {
  const existing = canonicalIdentitiesFromOtherSources();
  // Regression guard: the duplicate rejected by AI-5 must be visible to this scanner.
  assert.ok(existing.get('tool')?.has(canonicalAnswer('กรรไกรตัดเหล็ก', 'tool')),
    'source scan must detect tools already registered by expanded-thai-terms');
  let added = 0;
  for (const [category, words] of Object.entries(AI4_OBJECTS_GEO_TERMS)) {
    for (const word of words.slice(-16)) {
      const canonical = canonicalAnswer(word, category);
      assert.ok(!existing.get(category)?.has(canonical),
        'not a new canonical identity: ' + category + '/' + word);
      assert.equal(WORD_BANK[category].filter(entry =>
        canonicalAnswer(entry, category) === canonical).length, 1,
        'missing or duplicated in live WORD_BANK: ' + category + '/' + word);
      added++;
    }
  }
  assert.equal(added, 80);
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
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category as keyof typeof AI4_OBJECTS_GEO_TERMS].slice(-4), words,
      'unexpected batch 7 vocabulary in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
  }
});

const BATCH_8: Readonly<Record<string, readonly string[]>> = {
  clothing: ['ชุดกี่เพ้า', 'กางเกงขาสามส่วน', 'รองเท้าผ้าใบหุ้มข้อ', 'ถุงเท้ายาว'],
  vehicle: ['เรือกู้ภัย', 'รถบัสสองชั้น', 'จักรยานสามล้อ', 'รถไฟฟ้ารางเดี่ยว'],
  device: ['เตาไฟฟ้า', 'เครื่องไล่ยุงไฟฟ้า', 'เครื่องนวดไฟฟ้า', 'เครื่องวัดฝุ่น'],
  tool: ['เหล็กขีด', 'แปรงทาสี', 'ประแจตัวที', 'เกรียงฉาบปูน'],
  place: ['โรงงานน้ำตาล', 'ศูนย์อพยพ', 'สถานีรถไฟฟ้า', 'โรงเรียนสอนขับรถ']
};

test('AI-4 batch 8 adds 20 new reviewed terms in owned categories', () => {
  assert.deepEqual(Object.keys(BATCH_8), Object.keys(AI4_OBJECTS_GEO_TERMS));
  assert.equal(Object.values(BATCH_8).flat().length, 20);
  for (const category of Object.keys(BATCH_8) as Array<keyof typeof AI4_OBJECTS_GEO_TERMS>) {
    const words = BATCH_8[category];
    assert.deepEqual(AI4_OBJECTS_GEO_TERMS[category].slice(-4), words,
      'unexpected batch 8 vocabulary in ' + category);
    assert.equal(new Set(words.map(word => canonicalAnswer(word, category))).size, 4);
  }
});
