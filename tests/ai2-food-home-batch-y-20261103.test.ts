import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_Y } from '../amplify/functions/game/ai2-food-home-batch-y-20261103.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  food: [
    'อ่อมปลาดุก', 'ยำไข่แมงดา', 'ขนมปังหน้าหมู', 'แหนมทอด',
    'ตำถั่ว', 'ยำไข่ดาว', 'ปลาช่อนลุยสวน', 'หมูย่างตรัง',
    'ผัดหมี่ฮกเกี้ยน', 'ยำไหลบัว'
  ],
  dessert: [],
  drink: [],
  fruit: [],
  vegetable: [],
  object: ['ที่คีบขนมปัง', 'แปรงทาเนย'],
  furniture: []
} as const;

test('AI-2 batch Y registers 12 reviewed, canonical-unique entries in owned categories', () => {
  assert.deepEqual(AI2_FOOD_HOME_BATCH_Y, EXPECTED);
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_Y).sort(),
    ['dessert','drink','food','fruit','furniture','object','vegetable']);
  assert.equal(Object.values(EXPECTED).flat().length, 12);
  for (const [category, words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size, words.length, 'literal duplicates: '+category);
    assert.equal(new Set(words.map(w=>canonicalAnswer(w,category))).size, words.length,
      'canonical duplicates: '+category);
    for (const word of words) {
      assert.equal(word, word.normalize('NFC').trim(), 'normalization: '+word);
      assert.ok(word.length>=2 && word.length<=48, 'length: '+word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: '+word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: '+word);
      assert.ok(WORD_BANK[category].includes(word), 'not registered: '+category+'/'+word);
      assert.equal(WORD_BANK[category].filter(w=>
        canonicalAnswer(w,category)===canonicalAnswer(word,category)).length, 1,
        'canonical collision: '+category+'/'+word);
      const letter=wordInitialForCategory(word,category);
      assert.match(letter,/^[ก-ฮ]$/, 'initial: '+word);
      assert.ok(eligibleCategories(letter).includes(category), 'unplayable: '+category+'/'+word);
      assert.equal(validAnswer(word,letter,category),true, 'not accepted: '+category+'/'+word);
      for (const [other, otherWords] of Object.entries(WORD_BANK))
        if(other!==category)
          assert.ok(!otherWords.includes(word), 'cross-category duplicate: '+category+'/'+word+' vs '+other);
    }
  }
});

test('AI-2 batch Y source terms are not duplicated across game modules', () => {
  const dir=new URL('../amplify/functions/game/',import.meta.url);
  const sources=readdirSync(dir).filter(n=>n.endsWith('.ts'))
    .map(n=>readFileSync(new URL(n,dir),'utf8'));
  for(const word of Object.values(EXPECTED).flat()){
    const quoted=["'"+word+"'",'"'+word+'"'];
    const count=sources.reduce((sum,s)=>sum+
      quoted.reduce((n,q)=>n+s.split(q).length-1,0),0);
    assert.equal(count,1,'existing literal or duplicate: '+word);
  }
});

test('AI-2 batch Y keeps category-specific initial and prefix rules unchanged', () => {
  assert.equal(wordInitialForCategory('ขนมปังหน้าหมู','food'),'ข');
  assert.equal(wordInitialForCategory('แหนมทอด','food'),'ห');
  assert.equal(wordInitialForCategory('แปรงทาเนย','object'),'ป');
  assert.equal(wordInitialForCategory('ขนมคุกกี้สิงคโปร์','dessert'),'ค');
  assert.equal(canonicalAnswer('ขนมคุกกี้สิงคโปร์','dessert'),'คุกกี้สิงคโปร์');
  assert.equal(wordInitialForCategory('ผักเชียงดา','vegetable'),'ช');
});
