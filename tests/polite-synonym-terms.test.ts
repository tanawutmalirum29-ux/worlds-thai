import test from 'node:test';
import assert from 'node:assert/strict';
import { POLITE_SYNONYM_GLOSSARY, POLITE_SYNONYM_TERMS } from '../amplify/functions/game/polite-synonym-terms.ts';
import { WORD_BANK, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, LETTERS, eligibleCategories, wordInitialForCategory, canonicalAnswer, validAnswer } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

test('polite terms and literary synonyms have meanings, valid categories and distinct spellings', () => {
  const categories=new Set<string>(CATEGORIES.map(([id]) => id));
  let count=0;
  for (const [category, entries] of Object.entries(POLITE_SYNONYM_GLOSSARY)) {
    assert.ok(categories.has(category), 'unknown category '+category);
    assert.deepEqual(POLITE_SYNONYM_TERMS[category], entries.map(([word]) => word));
    assert.equal(new Set(entries.map(([word]) => word)).size, entries.length, 'duplicate addition in '+category);
    assert.equal(new Set(WORD_BANK[category]).size, WORD_BANK[category].length, 'duplicate live word in '+category);
    for (const [word, meaning, register] of entries) {
      count++;
      assert.ok(meaning.trim().length>0, 'meaning missing for '+word);
      assert.ok(register==='คำไวพจน์' || register==='คำสุภาพ', 'wrong register '+word);
      assert.equal(word, word.trim().normalize('NFC'), 'noncanonical spelling '+word);
      assert.ok(word.length>=2 && word.length<=48, 'invalid word length '+word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation blocks '+word);
      assert.ok(WORD_BANK[category].includes(word), 'word not in live dictionary '+word);
      const letter=wordInitialForCategory(word,category);
      assert.match(letter,/^[ก-ฮ]$/, 'invalid initial '+word);
      if(eligibleCategories(letter).includes(category))
        assert.equal(validAnswer(word,letter,category), true, 'new word not playable '+category+'/'+word);
    }
  }
  assert.ok(count>=110, 'expected broad synonym and polite vocabulary');
});

test('word meanings are category-bound, with real consonant initials and no invented variants', () => {
  for(const [word, letter, category] of [
    ['วานร','ว','animal'], ['วิฬาร์','ว','animal'],
    ['นภา','น','nature'], ['ทิวากร','ท','nature'],
    ['ศีรษะ','ศ','body'], ['รับประทาน','ร','verb'],
    ['ผายลม','ผ','verb'], ['อุบล','อ','flower'],
    ['ผักทอดยอด','ผ','vegetable']
  ] as const) {
    assert.equal(wordInitialForCategory(word,category),letter, word+' wrong initial');
    if (eligibleCategories(letter).includes(category))
      assert.equal(validAnswer(word,letter,category),true,word+' not accepted');
  }
  assert.equal(canonicalAnswer('วานร','animal'),'วานร');
  assert.equal(canonicalAnswer('วิฬาร์','animal'),'วิฬาร์');
  assert.equal(validAnswer('วานร','ว','nature'),false);
  assert.equal(validAnswer('นภา','น','animal'),false);
  assert.equal(validAnswer('รับประทาน','ร','food'),false);
  assert.equal(validAnswer('บุหงา','บ','flower'),false, 'generic flower synonym is not a flower species');
  assert.equal(validAnswer('วานร','ก','animal'),false);
  assert.equal(validAnswer('ทรงรับประทาน','ท','verb'),false, 'never auto-construct royal or polite forms');
});

test('new words preserve 2-words-per-pair, 5-categories-per-letter constraints', () => {
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  for (const letter of LETTERS) {
    const categories=eligibleCategories(letter);
    assert.ok(categories.length>=5, 'not enough categories '+letter);
    for (const category of categories) {
      const unique=new Set(WORD_BANK[category]
        .filter(word=>wordInitialForCategory(word,category)===letter)
        .map(word=>canonicalAnswer(word,category)));
      assert.ok(unique.size>=2, 'not enough answers '+category+'/'+letter);
    }
  }
});
