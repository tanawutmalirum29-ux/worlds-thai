import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { ADDITIONAL_VEHICLES_20261031 } from '../amplify/functions/game/additional-vehicles-20261031.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED_NEW_VEHICLES = 198;

test('vehicle expansion adds 198 clean and canonical-unique real vehicle names', () => {
  const words = ADDITIONAL_VEHICLES_20261031;
  assert.equal(words.length, EXPECTED_NEW_VEHICLES);
  assert.equal(new Set(words).size, words.length, 'literal duplicates');
  assert.equal(new Set(words.map(word => canonicalAnswer(word, 'vehicle'))).size, words.length,
    'canonical duplicates in vehicle expansion');
  for (const word of words) {
    assert.equal(word, word.trim().normalize('NFC'), 'noncanonical whitespace/Unicode: ' + word);
    assert.ok(word.length > 1 && word.length <= 48, 'invalid word length: ' + word);
    assert.equal(isInappropriateLanguage(word), false, 'moderation rejected: ' + word);
    assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked standalone term: ' + word);
    const initial = wordInitialForCategory(word, 'vehicle');
    assert.match(initial, /^[ก-ฮ]$/, 'bad initial: ' + word);
    const canonical = canonicalAnswer(word, 'vehicle');
    assert.equal(WORD_BANK.vehicle.filter(item =>
      canonicalAnswer(item, 'vehicle') === canonical).length, 1,
      'duplicate or missing in registered vehicle bank: ' + word);
    if (eligibleCategories(initial).includes('vehicle')) {
      assert.equal(validAnswer(word, initial, 'vehicle'), true,
        'registered vehicle rejected by answer validator: ' + word);
    }
  }
});

/** Cross-module AST check: Set-based dedup of the live bank must not hide
 * words that were already contributed by a separate source file.
 */
function vehicleLiteralsFromOtherSources(): Set<string> {
  const folder = new URL('../amplify/functions/game/', import.meta.url);
  const existing = new Set<string>();
  for (const filename of readdirSync(folder)) {
    if (!filename.endsWith('.ts') || filename === 'additional-vehicles-20261031.ts') continue;
    const source = ts.createSourceFile(filename,
      readFileSync(new URL(filename, folder), 'utf8'),
      ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    function visit(node: ts.Node): void {
      if (ts.isPropertyAssignment(node)
        && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
        && node.name.text === 'vehicle'
        && ts.isArrayLiteralExpression(node.initializer)) {
        for (const entry of node.initializer.elements) {
          if (ts.isStringLiteral(entry) || ts.isNoSubstitutionTemplateLiteral(entry))
            existing.add(canonicalAnswer(entry.text, 'vehicle'));
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return existing;
}

test('all 198 new vehicle names are absent from other source files', () => {
  const existing = vehicleLiteralsFromOtherSources();
  for (const word of ADDITIONAL_VEHICLES_20261031) {
    assert.equal(existing.has(canonicalAnswer(word, 'vehicle')), false,
      'already present in another source vehicle list: ' + word);
  }
});

test('other dictionary categories and normalization rules remain untouched', () => {
  assert.ok(WORD_BANK.vehicle.length >= EXPECTED_NEW_VEHICLES);
  for (const category of ['clothing', 'animal', 'food', 'tool', 'place']) {
    assert.ok(WORD_BANK[category]?.length > 0, 'missing unrelated category ' + category);
  }
});
