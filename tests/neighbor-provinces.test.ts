import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { NEIGHBOR_PROVINCES, NEIGHBORING_PROVINCES, NEIGHBOR_PROVINCE_ALIASES } from '../amplify/functions/game/neighbor-provinces.ts';
import { validAnswer, eligibleCategories, wordInitialForCategory, canonicalAnswer, newMatch, applyAction, scoreRound } from '../amplify/functions/game/logic.ts';

test('neighboring regions are a recognizable, bounded Thai-language shortlist, not a full atlas', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(NEIGHBOR_PROVINCES).map(([country, places]) => [country, places.length])), {
    laos: 8, cambodia: 8, myanmar: 8, malaysia: 8, vietnam: 6
  });
  assert.equal(NEIGHBORING_PROVINCES.length, 38);
  assert.equal(new Set(NEIGHBORING_PROVINCES).size, NEIGHBORING_PROVINCES.length);
  for (const word of NEIGHBORING_PROVINCES) {
    assert.ok(WORD_BANK.province.includes(word),word+' missing from curated province bank');
    assert.ok(word.length <= 48);
    assert.match(word, /^[ก-๙]+$/);
  }
  assert.equal(new Set(WORD_BANK.province).size,WORD_BANK.province.length,'all province entries must be unique');
  for (const known of ['หลวงพระบาง','สะหวันนะเขต','เสียมราฐ','พนมเปญ','ย่างกุ้ง','มัณฑะเลย์','กัวลาลัมเปอร์','ปีนัง','ฮานอย','โฮจิมินห์','ดานัง']) {
    assert.ok(NEIGHBORING_PROVINCES.includes(known),known+' is a familiar regional name');
  }
  for (const removed of ['ตโบงฆมุม','กำปงชนัง','ไหลเจิว','กาวบั่ง','เนกรีเซมบีลัน']) {
    assert.ok(!WORD_BANK.province.includes(removed),removed+' should no longer be in the curated shortlist');
  }
});

test('accepted alternate Thai spellings only refer to retained regions', () => {
  assert.equal(Object.keys(NEIGHBOR_PROVINCE_ALIASES).length, 5);
  for (const [variant,official] of Object.entries(NEIGHBOR_PROVINCE_ALIASES)) {
    assert.ok(NEIGHBORING_PROVINCES.includes(official),official+' target must be retained');
    assert.ok(!NEIGHBORING_PROVINCES.includes(variant));
    assert.ok(WORD_BANK.province.includes(variant));
    assert.equal(canonicalAnswer(variant,'province'),canonicalAnswer(official,'province'));
  }
  assert.equal(validAnswer('เสียมเรียบ','ส','province'),true);
  assert.equal(validAnswer('บัตตัมบอง','บ','province'),true);
  assert.ok(!WORD_BANK.province.includes('กัมปงชนัง'),'removed variants do not remain in the bank');
});

test('well-known neighboring regions are accepted when their letter/category is eligible', () => {
  const cases: readonly [string,string][] = [
    ['กัมปงจาม','ก'], ['กะฉิ่น','ก'], ['กลันตัน','ก'], ['กัวลาลัมเปอร์','ก'],
    ['พนมเปญ','พ'], ['มัณฑะเลย์','ม'], ['นครหลวงเวียงจันทน์','น'],
    ['บ่อแก้ว','บ'], ['เสียมราฐ','ส']
  ];
  for (const [name,letter] of cases) {
    assert.equal(wordInitialForCategory(name,'province'),letter);
    assert.ok(eligibleCategories(letter).includes('province'),letter+' province category must be playable');
    assert.equal(validAnswer(name,letter,'province'),true,name);
    assert.equal(validAnswer(name,letter,'country'),false,name);
  }
  assert.ok(WORD_BANK.province.includes('ฮานอย'),'capital is a valid provincial-level place');
  assert.equal(validAnswer('ปอยเปต','ป','province'),false,'ordinary town is not a province');
  assert.equal(validAnswer('ฮอยอัน','ฮ','province'),false,'ordinary town is not a province');
  assert.equal(validAnswer('กำปงจาม','ข','province'),false,'wrong starting letter');
});

test('alternate spellings are duplicates, different provinces are distinct', () => {
  const time=1_700_000_000_000;
  const match=newMatch('room-neighbor-test012345',time);
  applyAction(match,'create','host',time,'Host');
  applyAction(match,'join','guest',time,'Guest');
  match.phase='playing'; match.letter='ก'; match.categories=['province'];
  match.submissions={host:{province:'กัมปงจาม'},guest:{province:'กำปงจาม'}};
  assert.deepEqual(scoreRound(match).map(x=>x.perCategory.province),[1,1]);
  match.submissions.guest.province='กะฉิ่น';
  assert.deepEqual(scoreRound(match).map(x=>x.perCategory.province),[2,2]);
});
