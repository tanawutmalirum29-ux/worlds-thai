import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_W } from '../amplify/functions/game/ai2-food-home-batch-w-20261102.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  food: ['ข้าวผัดปลาสลิด', 'แกงอ่อมเห็ด'],
  dessert: ['แคนโนลี', 'เซมิเฟรดโด'],
  drink: ['ชาลาเวนเดอร์'],
  fruit: ['ส้มสีเลือด', 'อะเซโรลาเชอร์รี'],
  vegetable: ['ดอกแคนา', 'เห็ดหัวลิง'],
  object: ['ที่หนีบถุงขนม', 'ไม้แขวนกางเกง', 'ที่ตีฟองนม', 'ที่กรองน้ำมัน'],
  furniture: ['โต๊ะกลมพับได้', 'ชั้นวางของเข้ามุม', 'เตียงมีลิ้นชัก']
} as const;

test('AI-2 batch W adds exactly 16 canonical-distinct, playable terms in owned categories', () => {
  assert.deepEqual(AI2_FOOD_HOME_BATCH_W, EXPECTED);
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_W).sort(), ['dessert','drink','food','fruit','furniture','object','vegetable']);
  assert.equal(Object.values(EXPECTED).flat().length, 16);
  for (const [category, words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size, words.length, 'duplicate literal: '+category);
    assert.equal(new Set(words.map(w => canonicalAnswer(w,category))).size, words.length, 'canonical duplicate: '+category);
    for (const word of words) {
      assert.equal(word, word.normalize('NFC').trim(), 'non-NFC word: '+word);
      assert.ok(word.length>=2 && word.length<=48, 'invalid length: '+word);
      assert.equal(isInappropriateLanguage(word), false, 'moderation: '+word);
      assert.equal(isBlockedStandaloneAnswer(word), false, 'blocked: '+word);
      assert.ok(WORD_BANK[category].includes(word), 'not registered: '+category+'/'+word);
      assert.equal(WORD_BANK[category].filter(w => canonicalAnswer(w,category)===canonicalAnswer(word,category)).length,1,
        'canonical duplicate in full bank: '+category+'/'+word);
      const initial = wordInitialForCategory(word,category);
      assert.match(initial,/^[ก-ฮ]$/,'invalid initial: '+word);
      assert.ok(eligibleCategories(initial).includes(category),'unplayable pair: '+category+'/'+word);
      assert.equal(validAnswer(word,initial,category),true,'rejected: '+category+'/'+word);
      for (const [other,otherWords] of Object.entries(WORD_BANK))
        if (other!==category) assert.ok(!otherWords.includes(word),'cross-category literal: '+category+'/'+word+' vs '+other);
    }
  }
});

test('AI-2 batch W has exactly one source literal for each new word', () => {
  const dir = new URL('../amplify/functions/game/',import.meta.url);
  const sources = readdirSync(dir).filter(name=>name.endsWith('.ts'))
    .map(name=>readFileSync(new URL(name,dir),'utf8'));
  for (const word of Object.values(EXPECTED).flat()) {
    const quoted = ["'"+word+"'", '"'+word+'"'];
    const count = sources.reduce((sum,src)=>sum+quoted.reduce((n,q)=>n+src.split(q).length-1,0),0);
    assert.equal(count,1,'duplicate source literal: '+word);
  }
});

test('AI-2 batch W preserves prefix and known semantic identities', () => {
  assert.equal(wordInitialForCategory('ขนมแคนโนลี','dessert'),'ค');
  assert.equal(canonicalAnswer('ขนมแคนโนลี','dessert'),'แคนโนลี');
  assert.equal(validAnswer('ขนมแคนโนลี','ค','dessert'),true);
  assert.equal(wordInitialForCategory('ผักดอกแคนา','vegetable'),'ด');
  assert.equal(canonicalAnswer('ผักดอกแคนา','vegetable'),'ดอกแคนา');
  assert.equal(validAnswer('ผักดอกแคนา','ด','vegetable'),true);
  assert.ok(WORD_BANK.food.includes('หมูชะมวง'));
  assert.ok(!AI2_FOOD_HOME_BATCH_W.food.includes('หมูต้มชะมวง'));
  assert.ok(WORD_BANK.vegetable.includes('ยอดฟักแม้ว'));
  assert.ok(!AI2_FOOD_HOME_BATCH_W.vegetable.includes('ยอดมะระหวาน'));
  assert.ok(WORD_BANK.drink.includes('น้ำลูกเดือย'));
  assert.ok(!AI2_FOOD_HOME_BATCH_W.drink.includes('นมลูกเดือย'));
});
