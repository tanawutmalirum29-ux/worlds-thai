import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_U } from '../amplify/functions/game/ai2-food-home-batch-u-20261102.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  food: ['ซุปบอร์ช', 'สลัดนิซัวส์', 'ฟาลาเฟล'],
  dessert: ['หยกมณี', 'ทาร์ตทาทิน', 'จาเลบี'],
  drink: ['น้ำรากบัว', 'น้ำมะม่วงหาวมะนาวโห่'],
  fruit: ['แบล็กเคอร์แรนต์', 'เรดเคอร์แรนต์'],
  vegetable: ['ผักแว่น'],
  object: ['ซองกันชื้น', 'ฟองน้ำเมลามีน', 'แปรงขัดหลอด', 'เครื่องตีไข่มือหมุน'],
  furniture: ['โต๊ะทำงานปรับระดับ', 'เก้าอี้อานม้า', 'โต๊ะกาแฟยกหน้า']
} as const;
const OWNED = ['dessert','drink','food','fruit','furniture','object','vegetable'];

test('AI-2 batch U registers 18 moderated playable canonical-unique terms in owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_U).sort(),OWNED);
  assert.deepEqual(AI2_FOOD_HOME_BATCH_U,EXPECTED);
  assert.equal(Object.values(EXPECTED).flat().length,18);
  for (const [category,words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size,words.length,'literal duplicate: '+category);
    assert.equal(new Set(words.map(w=>canonicalAnswer(w,category))).size,words.length,'canonical batch collision: '+category);
    for (const word of words) {
      assert.equal(word,word.trim().normalize('NFC'),'non-NFC: '+word);
      assert.ok(word.length>=2&&word.length<=48,'invalid length: '+word);
      assert.equal(isInappropriateLanguage(word),false,'moderation: '+word);
      assert.equal(isBlockedStandaloneAnswer(word),false,'blocked: '+word);
      assert.ok(WORD_BANK[category].includes(word),'missing: '+category+'/'+word);
      assert.equal(WORD_BANK[category].filter(w=>canonicalAnswer(w,category)===canonicalAnswer(word,category)).length,1,'canonical collision: '+category+'/'+word);
      const initial=wordInitialForCategory(word,category);
      assert.match(initial,/^[ก-ฮ]$/,'invalid initial: '+word);
      assert.ok(eligibleCategories(initial).includes(category),'unplayable pair: '+category+'/'+word+' ('+initial+')');
      assert.equal(validAnswer(word,initial,category),true,'rejected: '+category+'/'+word);
      for (const [otherCategory,otherWords] of Object.entries(WORD_BANK))
        if (otherCategory!==category)
          assert.ok(!otherWords.includes(word),'cross-category literal collision: '+category+'/'+word+' vs '+otherCategory);
    }
  }
});

test('AI-2 batch U source literals are new across all dictionary game modules', () => {
  const dir=new URL('../amplify/functions/game/',import.meta.url);
  const sources=readdirSync(dir).filter(name=>name.endsWith('.ts'))
    .map(name=>({name,content:readFileSync(new URL(name,dir),'utf8')}));
  for (const word of Object.values(EXPECTED).flat()) {
    const quoted=["'"+word+"'",'"'+word+'"'];
    const occurrences=sources.reduce((n,s)=>n+quoted.reduce((m,q)=>m+s.content.split(q).length-1,0),0);
    assert.equal(occurrences,1,'source duplicate or missing: '+word);
  }
});

test('AI-2 batch U retains existing semantic identities and prefix handling', () => {
  assert.ok(WORD_BANK.dessert.includes('กุหลาบจามุน'));
  assert.ok(!AI2_FOOD_HOME_BATCH_U.dessert.includes('กุลาบจามุน'));
  assert.ok(WORD_BANK.drink.includes('น้ำลูกยอ'));
  assert.ok(!AI2_FOOD_HOME_BATCH_U.drink.includes('น้ำลูกยอ'));
  assert.ok(WORD_BANK.vegetable.includes('ชะคราม'));
  assert.ok(!AI2_FOOD_HOME_BATCH_U.vegetable.includes('ผักชะคราม'));
  assert.equal(wordInitialForCategory('ผักแว่น','vegetable'),'ว');
  assert.equal(canonicalAnswer('ผักแว่น','vegetable'),'แว่น');
  assert.equal(canonicalAnswer('ผักผักแว่น','vegetable'),'');
  assert.equal(wordInitialForCategory('ขนมหยกมณี','dessert'),'ห');
  assert.equal(canonicalAnswer('ขนมหยกมณี','dessert'),'หยกมณี');
});
