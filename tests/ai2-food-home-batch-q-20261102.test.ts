import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_Q } from '../amplify/functions/game/ai2-food-home-batch-q-20261102.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  food: ['ข้าวผัดสับปะรด','แกงส้มไหลบัว','ไก่ต้มน้ำปลา'],
  dessert: ['ขนมลูกเต๋า','ขนมสามเกลอ'],
  drink: ['น้ำฟักข้าว','กาแฟน้ำมะพร้าว','น้ำสละ'],
  fruit: ['ลูกสำรอง','ส้มมือ'],
  vegetable: ['ดอกฟักทอง','หน่อหวาย','ใบมะขามอ่อน'],
  object: ['ขวดบีบซอส','ที่ขูดชีส','ถาดอบขนม','ถุงตาข่ายซักผ้า','แผ่นรองจาน'],
  furniture: ['ตู้แขวนผนัง','ม้านั่งเก็บของ']
} as const;
const OWNED = ['dessert','drink','food','fruit','furniture','object','vegetable'];

test('AI-2 batch Q registers 20 distinct, moderated, playable words only in owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_Q).sort(), OWNED);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_Q, EXPECTED);
  assert.equal(Object.values(EXPECTED).flat().length, 20);
  for (const [category, words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size, words.length, 'literal duplicate: '+category);
    assert.equal(new Set(words.map(word=>canonicalAnswer(word,category))).size, words.length,
      'canonical duplicate in batch: '+category);
    for (const word of words) {
      assert.equal(word, word.trim().normalize('NFC'), 'non-NFC: '+word);
      assert.ok(word.length >= 2 && word.length <= 48, 'invalid length: '+word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: '+word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: '+word);
      assert.ok(WORD_BANK[category].includes(word), 'not registered: '+category+'/'+word);
      assert.equal(WORD_BANK[category].filter(w=>canonicalAnswer(w,category)===canonicalAnswer(word,category)).length,
        1, 'canonical collision: '+category+'/'+word);
      const initial=wordInitialForCategory(word,category);
      assert.match(initial,/^[ก-ฮ]$/, 'invalid initial: '+word);
      assert.ok(eligibleCategories(initial).includes(category), 'unplayable: '+category+'/'+word+' ('+initial+')');
      assert.equal(validAnswer(word,initial,category),true, 'rejected by game: '+category+'/'+word);
    }
  }
});

test('AI-2 batch Q source literals are unique across every registered dictionary import', () => {
  const dictionary=readFileSync(new URL('../amplify/functions/game/dictionary.ts',import.meta.url),'utf8');
  const imports=dictionary.split('\n').filter(line=>line.startsWith('import ')&&line.includes("from './"))
    .map(line=>line.split("from './")[1]?.split("'")[0])
    .filter((filename):filename is string=>Boolean(filename));
  const sources=[dictionary,...imports.map(filename=>readFileSync(
    new URL('../amplify/functions/game/'+filename,import.meta.url),'utf8'))];
  for (const word of Object.values(EXPECTED).flat()) {
    const quoted=["'"+word+"'",'"'+word+'"'];
    const count=sources.reduce((sum,source)=>sum+quoted.reduce((n,q)=>n+source.split(q).length-1,0),0);
    assert.equal(count,1,'duplicate or missing source literal: '+word);
  }
});

test('AI-2 batch Q keeps dessert and vegetable prefix semantics unchanged', () => {
  assert.equal(wordInitialForCategory('ขนมลูกเต๋า','dessert'),'ล');
  assert.equal(wordInitialForCategory('ขนมสามเกลอ','dessert'),'ส');
  assert.equal(wordInitialForCategory('ขนม','dessert'),'');
  assert.equal(wordInitialForCategory('หน่อหวาย','vegetable'),'ห');
  assert.equal(wordInitialForCategory('ผักหน่อหวาย','vegetable'),'ห');
  assert.equal(canonicalAnswer('ผักหน่อหวาย','vegetable'),canonicalAnswer('หน่อหวาย','vegetable'));
});
