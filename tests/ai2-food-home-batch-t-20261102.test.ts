import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_T } from '../amplify/functions/game/ai2-food-home-batch-t-20261102.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  food: ['ห่อหมกทะเล', 'ข้าวหมกแพะ', 'สลัดซีซาร์', 'กุ้งผัดพริกเกลือ', 'ปลาหมึกผัดไข่เค็ม'],
  dessert: ['วาราบิโมจิ', 'บิสคอตติ', 'โมนากะ'],
  drink: ['น้ำผึ้งมะนาวโซดา'],
  fruit: ['มะนาวนิ้วมือ'],
  vegetable: ['ถั่วหรั่ง'],
  object: ['เหยือกตวง', 'ที่ทุบเนื้อ', 'หัวบีบครีม', 'ถุงบีบครีม'],
  furniture: ['เตียงเลื่อน', 'เตียงลอฟต์', 'ชั้นหนังสือหมุน']
} as const;
const OWNED = ['dessert','drink','food','fruit','furniture','object','vegetable'];

test('AI-2 batch T registers 18 distinct moderated playable terms in owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_T).sort(),OWNED);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_T,EXPECTED);
  assert.equal(Object.values(EXPECTED).flat().length,18);
  for(const [category,words] of Object.entries(EXPECTED)){
    assert.equal(new Set(words).size,words.length,'literal duplicate: '+category);
    assert.equal(new Set(words.map(word=>canonicalAnswer(word,category))).size,words.length,
      'canonical duplicate in batch: '+category);
    for(const word of words){
      assert.equal(word,word.trim().normalize('NFC'),'non-NFC: '+word);
      assert.ok(word.length>=2&&word.length<=48,'invalid length: '+word);
      assert.equal(isInappropriateLanguage(word),false,'moderation: '+word);
      assert.equal(isBlockedStandaloneAnswer(word),false,'blocked: '+word);
      assert.ok(WORD_BANK[category].includes(word),'not registered: '+category+'/'+word);
      assert.equal(WORD_BANK[category].filter(w=>canonicalAnswer(w,category)===canonicalAnswer(word,category)).length,
        1,'canonical collision: '+category+'/'+word);
      const initial=wordInitialForCategory(word,category);
      assert.match(initial,/^[ก-ฮ]$/,'invalid initial: '+word);
      assert.ok(eligibleCategories(initial).includes(category),'unplayable: '+category+'/'+word+' ('+initial+')');
      assert.equal(validAnswer(word,initial,category),true,'rejected by game: '+category+'/'+word);
    }
  }
});

test('AI-2 batch T words are source-new across registered dictionary modules', () => {
  const dictionary=readFileSync(new URL('../amplify/functions/game/dictionary.ts',import.meta.url),'utf8');
  const imports=dictionary.split('\n').filter(line=>line.startsWith('import ')&&line.includes("from './"))
    .map(line=>line.split("from './")[1]?.split("'")[0])
    .filter((filename):filename is string=>Boolean(filename));
  const sources=[dictionary,...imports.map(filename=>readFileSync(
    new URL('../amplify/functions/game/'+filename,import.meta.url),'utf8'))];
  for(const word of Object.values(EXPECTED).flat()){
    const quoted=["'"+word+"'",'"'+word+'"'];
    const count=sources.reduce((sum,source)=>sum+quoted.reduce((n,q)=>n+source.split(q).length-1,0),0);
    assert.equal(count,1,'duplicate or missing source literal: '+word);
  }
});

test('AI-2 batch T excludes known existing names and semantic aliases',()=>{
  assert.ok(WORD_BANK.dessert.includes('ขนมบุหลันดั้นเมฆ'));
  assert.ok(WORD_BANK.dessert.includes('ทรัฟเฟิลช็อกโกแลต'));
  assert.ok(WORD_BANK.fruit.includes('มะไฟจีน'));
  assert.ok(WORD_BANK.vegetable.includes('หน่อกระวาน'));
  assert.equal(AI2_FOOD_HOME_BATCH_T.dessert.includes('บุหลันดั้นเมฆ'),false);
  assert.equal(AI2_FOOD_HOME_BATCH_T.dessert.includes('ช็อกโกแลตทรัฟเฟิล'),false);
  assert.equal(AI2_FOOD_HOME_BATCH_T.fruit.includes('มะไฟจีน'),false);
  assert.equal(AI2_FOOD_HOME_BATCH_T.vegetable.includes('หน่อกระวาน'),false);
  assert.equal(AI2_FOOD_HOME_BATCH_T.fruit.includes('มะนาวคาเวียร์'),false);
});

test('AI-2 batch T preserves category-local dessert and vegetable prefix rules',()=>{
  assert.equal(wordInitialForCategory('ขนมวาราบิโมจิ','dessert'),'ว');
  assert.equal(canonicalAnswer('ขนมวาราบิโมจิ','dessert'),'วาราบิโมจิ');
  assert.equal(wordInitialForCategory('ผักถั่วหรั่ง','vegetable'),'ถ');
  assert.equal(canonicalAnswer('ผักถั่วหรั่ง','vegetable'),'ถั่วหรั่ง');
});
