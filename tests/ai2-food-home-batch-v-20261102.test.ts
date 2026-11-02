import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { AI2_FOOD_HOME_BATCH_V } from '../amplify/functions/game/ai2-food-home-batch-v-20261102.ts';
import { canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

const EXPECTED = {
  food: ['ซุปมิโซะ', 'ขนมจีนน้ำยาป่า', 'แกงป่าไก่', 'ข้าวซอยเนื้อ'],
  dessert: ['บัคลาวา', 'พาฟโลวา', 'บานอฟฟี่'],
  drink: ['ชาโรสฮิป'],
  fruit: ['สตรอว์เบอร์รีขาว'],
  vegetable: ['เห็ดขอนขาว', 'เห็ดแครง'],
  object: ['ถุงกรองชา', 'แหนบถอนขน', 'ผ้ารองรีด', 'ถุงมือกันร้อน'],
  furniture: ['ชั้นวางทีวีติดผนัง', 'ตู้เก็บไวน์', 'เตียงพับติดผนัง']
} as const;

test('AI-2 batch V registers exactly 18 canonical-unique playable words in seven owned categories', () => {
  assert.deepEqual(Object.keys(AI2_FOOD_HOME_BATCH_V).sort(),Object.keys(EXPECTED).sort());
  assert.deepEqual(AI2_FOOD_HOME_BATCH_V,EXPECTED);
  assert.equal(Object.values(EXPECTED).flat().length,18);
  for (const [category,words] of Object.entries(EXPECTED)) {
    assert.equal(new Set(words).size,words.length,'literal duplicate: '+category);
    assert.equal(new Set(words.map(word=>canonicalAnswer(word,category))).size,words.length,'canonical batch duplicate: '+category);
    for (const word of words) {
      assert.equal(word,word.normalize('NFC').trim(),'not NFC: '+word);
      assert.ok(word.length>=2 && word.length<=48,'length: '+word);
      assert.equal(isInappropriateLanguage(word),false,'moderation: '+word);
      assert.equal(isBlockedStandaloneAnswer(word),false,'blocked: '+word);
      assert.ok(WORD_BANK[category].includes(word),'not registered: '+category+'/'+word);
      assert.equal(WORD_BANK[category].filter(w=>canonicalAnswer(w,category)===canonicalAnswer(word,category)).length,1,'canonical collision: '+category+'/'+word);
      const letter=wordInitialForCategory(word,category);
      assert.match(letter,/^[ก-ฮ]$/,'initial: '+word);
      assert.ok(eligibleCategories(letter).includes(category),'unplayable pair: '+category+'/'+word);
      assert.equal(validAnswer(word,letter,category),true,'rejected: '+category+'/'+word);
      for (const [other,otherWords] of Object.entries(WORD_BANK))
        if (other!==category) assert.ok(!otherWords.includes(word),'cross-category duplicate: '+category+'/'+word+' vs '+other);
    }
  }
});

test('AI-2 batch V has one source literal per answer across dictionary modules', () => {
  const dir=new URL('../amplify/functions/game/',import.meta.url);
  const sources=readdirSync(dir).filter(name=>name.endsWith('.ts'))
    .map(name=>readFileSync(new URL(name,dir),'utf8'));
  for (const word of Object.values(EXPECTED).flat()) {
    const quoted=["'"+word+"'",'"'+word+'"'];
    const count=sources.reduce((sum,source)=>sum+quoted.reduce((n,q)=>n+source.split(q).length-1,0),0);
    assert.equal(count,1,'not new or duplicate source literal: '+word);
  }
});

test('AI-2 batch V respects existing dessert and vegetable prefixes', () => {
  assert.equal(wordInitialForCategory('ขนมบัคลาวา','dessert'),'บ');
  assert.equal(canonicalAnswer('ขนมบัคลาวา','dessert'),'บัคลาวา');
  assert.equal(validAnswer('ขนมบัคลาวา','บ','dessert'),true);
  assert.equal(wordInitialForCategory('ผักเห็ดแครง','vegetable'),'ห');
  assert.equal(canonicalAnswer('ผักเห็ดแครง','vegetable'),'เห็ดแครง');
  assert.equal(validAnswer('ผักเห็ดแครง','ห','vegetable'),true);
});
