import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_X } from '../amplify/functions/game/ai2-food-home-batch-x-20261102.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  "food": [
    "ต้มขมิ้นไก่",
    "แกงอ่อมไข่มดแดง",
    "ปลาทูต้มมะดัน"
  ],
  "dessert": [
    "คุกกี้สิงคโปร์",
    "เค้กมะตูม",
    "พุดดิ้งข้าว",
    "พายมะพร้าวอ่อน",
    "ขนมไข่ปลา"
  ],
  "drink": [
    "น้ำตะลิงปลิง",
    "ชาหญ้าหวาน"
  ],
  "fruit": [],
  "vegetable": [],
  "object": [
    "แปรงล้างหลอด",
    "ที่ตัดแป้ง",
    "ตะแกรงนึ่ง",
    "ที่วางช้อน",
    "แผ่นรองหม้อ"
  ],
  "furniture": [
    "ตู้บานเฟี้ยม",
    "โต๊ะทำงานเข้ามุม",
    "ชั้นวางหนังสือแบบหมุน"
  ]
} as const;

test('AI-2 batch X adds 18 canonical-unique words only in seven owned categories', () => {
  assert.deepEqual(AI2_FOOD_HOME_BATCH_X, EXPECTED);
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_X).sort(), ['dessert','drink','food','fruit','furniture','object','vegetable']);
  assert.equal(Object.values(EXPECTED).flat().length, 18);
  for (const [category,words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size,words.length,'literal duplicate: '+category);
    assert.equal(new Set(words.map(w=>canonicalAnswer(w,category))).size,words.length,'canonical duplicate: '+category);
    for (const word of words) {
      assert.equal(word,word.normalize('NFC').trim(),'not NFC: '+word);
      assert.ok(word.length>=2 && word.length<=48,'length: '+word);
      assert.equal(isInappropriateLanguage(word),false,'moderation: '+word);
      assert.equal(isBlockedStandaloneAnswer(word),false,'blocked: '+word);
      assert.ok(WORD_BANK[category].includes(word),'not registered: '+category+'/'+word);
      assert.equal(WORD_BANK[category].filter(w=>canonicalAnswer(w,category)===canonicalAnswer(word,category)).length,1,'canonical collision: '+category+'/'+word);
      const initial=wordInitialForCategory(word,category);
      assert.match(initial,/^[ก-ฮ]$/,'invalid initial: '+word);
      assert.ok(eligibleCategories(initial).includes(category),'unplayable pair: '+category+'/'+word);
      assert.equal(validAnswer(word,initial,category),true,'rejected: '+category+'/'+word);
      for (const [other,otherWords] of Object.entries(WORD_BANK))
        if(other!==category)assert.ok(!otherWords.includes(word),'cross-category literal: '+category+'/'+word+' vs '+other);
    }
  }
});

test('AI-2 batch X source words occur exactly once across game dictionary modules', () => {
  const dir=new URL('../amplify/functions/game/',import.meta.url);
  const sources=readdirSync(dir).filter(n=>n.endsWith('.ts')).map(n=>readFileSync(new URL(n,dir),'utf8'));
  for(const word of Object.values(EXPECTED).flat()) {
    const quoted=["'"+word+"'",'"'+word+'"'];
    const count=sources.reduce((sum,s)=>sum+quoted.reduce((n,q)=>n+s.split(q).length-1,0),0);
    assert.equal(count,1,'existing or duplicate source literal: '+word);
  }
});

test('AI-2 batch X respects dessert prefix without changing canonicalization', () => {
  assert.equal(wordInitialForCategory('ขนมไข่ปลา','dessert'),'ข');
  assert.equal(wordInitialForCategory('ขนมคุกกี้สิงคโปร์','dessert'),'ค');
  assert.equal(canonicalAnswer('ขนมคุกกี้สิงคโปร์','dessert'),'คุกกี้สิงคโปร์');
  assert.equal(validAnswer('ขนมคุกกี้สิงคโปร์','ค','dessert'),true);
});
