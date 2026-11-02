import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_Z } from '../amplify/functions/game/ai2-food-home-batch-z-20261103.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  "food": [
    "แกงผักเฮือด",
    "น้ำพริกน้ำปู๋",
    "หมกไข่มดแดง",
    "ตำโคราช",
    "ตำหอยดอง",
    "ผัดหมี่กระเฉด",
    "บุ๋นจ๋า",
    "ก๋วยเตี๋ยวหลอด",
    "โอโคโนมิยากิ",
    "ซุนดูบูจิเก",
    "ยากิโซบะ",
    "ทอดมันหัวปลี"
  ],
  "dessert": [
    "ขนมทองนพคุณ"
  ],
  "drink": [],
  "fruit": [],
  "vegetable": [],
  "object": [
    "ผ้าขาวบาง",
    "หวดนึ่งข้าวเหนียว",
    "กระติบข้าวเหนียว"
  ],
  "furniture": []
} as const;

test('AI-2 batch Z registers 16 screened, canonical-unique words in owned categories only', () => {
  assert.deepEqual(AI2_FOOD_HOME_BATCH_Z, EXPECTED);
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_Z).sort(),
    ['dessert','drink','food','fruit','furniture','object','vegetable']);
  assert.equal(Object.values(EXPECTED).flat().length, 16);
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

test('AI-2 batch Z source terms occur exactly once in game modules', () => {
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

test('AI-2 batch Z preserves dessert and vegetable prefix behavior', () => {
  assert.equal(wordInitialForCategory('ขนมทองนพคุณ','dessert'),'ท');
  assert.equal(wordInitialForCategory('ผักเชียงดา','vegetable'),'ช');
  assert.equal(canonicalAnswer('ผักเชียงดา','vegetable'),'เชียงดา');
  assert.equal(wordInitialForCategory('ผ้าขาวบาง','object'),'ผ');
});
