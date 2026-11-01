import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_S } from '../amplify/functions/game/ai2-food-home-batch-s-20261102.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  food: ['แกงหยวกกล้วย', 'ปลาทูซาเตี๊ยะ', 'หมูผัดกะปิ', 'ไก่คั่วเกลือ'],
  dessert: ['ขนมคันหลาว', 'ขนมพริกไทย', 'ขนมนวลแห้ว'],
  drink: ['ชานมฮ่องกง', 'น้ำทับทิมโซดา', 'ชาข้าวโพด'],
  fruit: ['มะมุด'],
  vegetable: ['หน่อกะลา', 'ผักเซียงดา'],
  object: ['ผ้ากรองชา', 'ขวดโหลสุญญากาศ', 'แผ่นซิลิโคนรองอบ', 'ตะแกรงพักขนม', 'พิมพ์กดคุกกี้'],
  furniture: ['ชั้นวางไวน์', 'ตู้เก็บยา']
} as const;

const OWNED = ['dessert', 'drink', 'food', 'fruit', 'furniture', 'object', 'vegetable'];

test('AI-2 batch S registers 20 distinct, moderated, playable terms only in owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_S).sort(), OWNED);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_S, EXPECTED);
  assert.equal(Object.values(EXPECTED).flat().length, 20);
  for (const [category, words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size, words.length, 'literal duplicate: '+category);
    assert.equal(new Set(words.map(word=>canonicalAnswer(word,category))).size, words.length,
      'canonical duplicate within batch: '+category);
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

test('AI-2 batch S source literals occur once across all registered dictionary imports', () => {
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

test('AI-2 batch S rejects previously registered semantic equivalents', () => {
  const rejected = [
    { category:'food', alias:'ห่อหมกหน่อไม้', existing:'หมกหน่อไม้' },
    { category:'vegetable', alias:'ยอดผักมันปู', existing:'ยอดมันปู' },
    { category:'drink', alias:'ชาข้าวบาร์เลย์', existing:'น้ำข้าวบาร์เลย์' },
    { category:'drink', alias:'น้ำลิ้นจี่โซดา', existing:'ลิ้นจี่โซดา' },
    { category:'food', alias:'ต้มขมิ้นไก่', existing:'ไก่ต้มขมิ้น' }
  ] as const;
  for (const {category,alias,existing} of rejected) {
    assert.ok(WORD_BANK[category].includes(existing), 'missing existing identity: '+category+'/'+existing);
    assert.equal(AI2_FOOD_HOME_BATCH_S[category].includes(alias),false,
      'semantic alias must not be added: '+category+'/'+alias);
  }
});

test('AI-2 batch S preserves dessert and vegetable prefix semantics', () => {
  assert.equal(wordInitialForCategory('ขนมคันหลาว','dessert'),'ค');
  assert.equal(wordInitialForCategory('ขนมพริกไทย','dessert'),'พ');
  assert.equal(wordInitialForCategory('ขนมนวลแห้ว','dessert'),'น');
  assert.equal(wordInitialForCategory('ขนม','dessert'),'');
  assert.equal(wordInitialForCategory('หน่อกะลา','vegetable'),'ห');
  assert.equal(wordInitialForCategory('ผักหน่อกะลา','vegetable'),'ห');
  assert.equal(wordInitialForCategory('ผักเซียงดา','vegetable'),'ซ');
  assert.equal(canonicalAnswer('ผักหน่อกะลา','vegetable'),'หน่อกะลา');
});
