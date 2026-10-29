import test from 'node:test';
import assert from 'node:assert/strict';
import { SYNONYM_GROUPS, ANIMAL_SYNONYM_ADDITIONS, NATURE_TERMS } from '../amplify/functions/game/synonyms.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, LETTERS, canonicalAnswer, validAnswer, scoreRound, newMatch, applyAction, eligibleCategories } from '../amplify/functions/game/logic.ts';
import { synonymExamplesForRound } from '../src/word-insights.ts';

test('reviewed Thai synonym groups have sourced, approved category-specific entries', () => {
  assert.equal(SYNONYM_GROUPS.length, 5);
  assert.equal(NATURE_TERMS.length, new Set(NATURE_TERMS).size, 'no duplicate nature words');
  assert.ok(NATURE_TERMS.every(word => WORD_BANK.nature.includes(word)), 'existing approved nature vocabulary is retained');
  assert.equal(new Set(WORD_BANK.nature).size, WORD_BANK.nature.length, 'no duplicate nature answers');
  assert.equal(WORD_BANK.animal.length, new Set(WORD_BANK.animal).size, 'no duplicate animal words');
  for (const group of SYNONYM_GROUPS) {
    assert.match(group.source, /^https:\/\//);
    assert.ok(group.words.length >= 3);
    assert.equal(new Set(group.words).size, group.words.length, group.id);
    for (const word of group.words) {
      assert.ok(WORD_BANK[group.category].includes(word), word+' must be manually admitted in '+group.category);
      assert.ok(word.length <= 48, word);
    }
  }
  for (const word of ANIMAL_SYNONYM_ADDITIONS) assert.ok(WORD_BANK.animal.includes(word));
  assert.ok(CATEGORIES.some(([id]) => id === 'nature'), 'nature must be a real playable category');
  assert.equal(CATEGORIES.length, 29);
});

test('synonyms are independent lexical answers, not aliases of the same score identity', () => {
  for (const [word,letter,category] of [
    ['กุญชร','ก','animal'], ['คชสาร','ค','animal'], ['คชา','ค','animal'],
    ['หัสดี','ห','animal'], ['ทินกร','ท','nature'], ['สุริยา','ส','nature'],
    ['ดอกไม้','ด','nature'], ['บุปผา','บ','nature']
  ] as const) {
    assert.ok(WORD_BANK[category].includes(word), word);
    if (LETTERS.includes(letter as never) && eligibleCategories(letter).includes(category)) {
      assert.equal(validAnswer(word,letter,category),true,word);
    }
    assert.equal(canonicalAnswer(word,category),word,word+' must not collapse to meaning label');
  }
  assert.equal(validAnswer('คชสาร','ค','animal'),true);
  assert.equal(validAnswer('คชา','ค','animal'),true);
  assert.equal(validAnswer('กุญชร','ก','animal'),true);
  assert.equal(validAnswer('คชจรวด','ค','animal'),false,'invented synonyms are rejected');
  assert.equal(validAnswer('คชสาร','ก','animal'),false,'wrong initial is rejected');
  assert.equal(validAnswer('คชสาร','ค','nature'),false,'synonyms cannot silently cross categories');
});

test('same meaning but different spelling earns separate 2-point scores', () => {
  const now = 1_700_000_000_000;
  const m=newMatch('room-synonym-check0123',now);
  applyAction(m,'create','host',now,'Host');
  applyAction(m,'join','guest',now,'Guest');
  m.phase='playing';m.letter='ค';m.categories=['animal'];
  m.submissions={host:{animal:'คชสาร'},guest:{animal:'คชา'}};
  assert.deepEqual(scoreRound(m).map(e => e.perCategory.animal),[2,2]);
  m.submissions.guest.animal='คชสาร';
  assert.deepEqual(scoreRound(m).map(e => e.perCategory.animal),[1,1]);
});

test('generic labels never masquerade as specific flower species or answer categories', () => {
  for (const word of ['บุปผา','ผกา','บุษบา','มาลี','ดอกไม้']) {
    assert.ok(!WORD_BANK.flower.includes(word), word+' is not a flower kind');
    assert.ok(WORD_BANK.nature.includes(word), word+' belongs to nature');
  }
  for (const [category, generic] of [['animal','สัตว์'], ['food','อาหาร'],['flower','ดอกไม้'],['nature','ธรรมชาติ']] as const) {
    assert.ok(!WORD_BANK[category].includes(generic),generic+' cannot be a self-referential answer');
  }
});

test('post-round examples only select real eligible words and explain their meaning', () => {
  const animal=synonymExamplesForRound('ค',['animal']);
  assert.ok(animal.some(x=>x.word==='คชสาร' && x.meaning==='ช้าง'));
  assert.ok(animal.some(x=>x.word==='คชา' && x.meaning==='ช้าง'));
  assert.ok(animal.every(x=>validAnswer(x.word,'ค',x.category)));
  assert.ok(synonymExamplesForRound('ก',['flower']).length===0);
  assert.ok(synonymExamplesForRound('ค',['animal'],1).length===1);
  const nature=synonymExamplesForRound('ท',['nature']);
  assert.ok(nature.some(x=>x.word==='ทินกร' && x.meaning==='ดวงอาทิตย์'));
  assert.ok(synonymExamplesForRound('ค',['animal']).every(x=>x.related.length>0));
});
