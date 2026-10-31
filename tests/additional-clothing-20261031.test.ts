import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { ADDITIONAL_CLOTHING_20261031 } from '../amplify/functions/game/additional-clothing-20261031.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

test('188 curated clothing additions are distinct, normalized and accepted when their letter is playable', () => {
  const words = ADDITIONAL_CLOTHING_20261031;
  assert.equal(words.length, 188);
  assert.equal(new Set(words).size, words.length, 'duplicate spelling');
  assert.equal(new Set(words.map(word => canonicalAnswer(word, 'clothing'))).size, words.length,
    'duplicate canonical clothing entry');
  for (const word of words) {
    assert.equal(word, word.trim().normalize('NFC'), 'bad whitespace/Unicode: ' + word);
    assert.ok(word.length > 1 && word.length <= 48, 'invalid length: ' + word);
    assert.equal(isInappropriateLanguage(word), false, 'moderation rejected: ' + word);
    assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked answer: ' + word);
    const initial = wordInitialForCategory(word, 'clothing');
    assert.match(initial, /^[ก-ฮ]$/, 'invalid initial: ' + word);
    const identity = canonicalAnswer(word, 'clothing');
    const found = WORD_BANK.clothing.filter(entry => canonicalAnswer(entry, 'clothing') === identity);
    assert.equal(found.length, 1, 'not unique in live bank: ' + word);
    if (eligibleCategories(initial).includes('clothing')) {
      assert.equal(validAnswer(word, initial, 'clothing'), true,
        'valid playable term rejected: ' + word);
    }
  }
});

/** Read literal category entries from all existing vocabulary source files.
 * This avoids Set-based live-bank deduplication silently hiding duplicate
 * contributions from separate modules.
 */
function otherClothingSourceWords(): Set<string> {
  const root = new URL('../amplify/functions/game/', import.meta.url);
  const words = new Set<string>();
  for (const file of readdirSync(root)) {
    if (!file.endsWith('.ts') || file === 'additional-clothing-20261031.ts') continue;
    const parsed = ts.createSourceFile(file,
      readFileSync(new URL(file, root), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    function visit(node: ts.Node): void {
      if (ts.isPropertyAssignment(node)
        && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
        && node.name.text === 'clothing' && ts.isArrayLiteralExpression(node.initializer)) {
        for (const element of node.initializer.elements) {
          if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) {
            words.add(canonicalAnswer(element.text, 'clothing'));
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(parsed);
  }
  return words;
}

test('188 clothing additions do not duplicate entries in any previous vocabulary category array', () => {
  const existing = otherClothingSourceWords();
  for (const word of ADDITIONAL_CLOTHING_20261031) {
    assert.equal(existing.has(canonicalAnswer(word, 'clothing')), false,
      'already exists in another clothing module: ' + word);
  }
});
