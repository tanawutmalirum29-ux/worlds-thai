import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { NEIGHBOR_PROVINCES, NEIGHBORING_PROVINCES } from '../amplify/functions/game/neighbor-provinces.ts';
import { validAnswer, eligibleCategories, wordInitialForCategory, newMatch, applyAction, scoreRound } from '../amplify/functions/game/logic.ts';

test('neighboring first-level divisions have the current verified coverage', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(NEIGHBOR_PROVINCES).map(([country, places]) => [country, places.length])), {
    laos: 18, cambodia: 25, myanmar: 15, malaysia: 16, vietnam: 34
  });
  assert.equal(NEIGHBORING_PROVINCES.length, 108);
  assert.equal(new Set(NEIGHBORING_PROVINCES).size, NEIGHBORING_PROVINCES.length, 'no repeated place names');
  for (const name of NEIGHBORING_PROVINCES) {
    assert.ok(WORD_BANK.province.includes(name), name + ' missing from scoring bank');
    assert.ok(name.length <= 48, name + ' exceeds input length');
    assert.match(name, /^[ก-๙]+$/, name + ' should use Thai characters');
  }
  assert.equal(new Set(WORD_BANK.province).size, WORD_BANK.province.length, 'no duplicate answers in category');
});

test('neighboring names score in province but not in country or city categories', () => {
  const cases: readonly [string, string][] = [
    ['กัมปงจาม','ก'], ['กะฉิ่น','ก'], ['กลันตัน','ก'], ['กวางนิญ','ก'],
    ['พนมเปญ','พ'], ['มาเกว','ม'], ['นครหลวงเวียงจันทน์','น'],
    ['บ่อแก้ว','บ'], ['ตาแก้ว','ต']
  ];
  for (const [name, initial] of cases) {
    assert.equal(wordInitialForCategory(name, 'province'), initial);
    assert.ok(eligibleCategories(initial).includes('province'), initial + ' should support province category');
    assert.equal(validAnswer(name, initial, 'province'), true, name);
    assert.equal(validAnswer(name, initial, 'country'), false, name);
  }
  assert.equal(validAnswer('ปอยเปต','ป','province'), false, 'town is not a province');
  assert.equal(validAnswer('ฮอยอัน','ฮ','province'), false, 'town is not a province');
  assert.equal(validAnswer('กำปงจาม','ข','province'), false, 'wrong starting letter');
});

test('two players using the same neighboring province receive duplicate-word scoring', () => {
  const time = 1_700_000_000_000;
  const match = newMatch('room-neighbor-test012345', time);
  applyAction(match,'create','host',time,'Host');
  applyAction(match,'join','guest',time,'Guest');
  match.phase='playing'; match.letter='ก'; match.categories=['province'];
  match.submissions = {host:{province:'กัมปงจาม'},guest:{province:'กัมปงจาม'}};
  assert.deepEqual(scoreRound(match).map(entry => entry.perCategory.province),[1,1]);
  match.submissions.guest.province='กะฉิ่น';
  assert.deepEqual(scoreRound(match).map(entry => entry.perCategory.province),[2,2]);
});
