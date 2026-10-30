import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADDITIONAL_VEGETABLES,
  ADDITIONAL_VEGETABLE_GROUPS
} from '../amplify/functions/game/additional-vegetables.ts';
import {WORD_BANK} from '../amplify/functions/game/dictionary.ts';

// Intentionally does not test or change rules for removing ผัก.
// Validation/canonicalization is owned by the other workstream.
test('vegetable-only expansion registers distinct recognizable names',()=>{
  assert.ok(ADDITIONAL_VEGETABLES.length>=250,
    'the requested vegetable dictionary expansion should be substantial');
  assert.equal(new Set(ADDITIONAL_VEGETABLES).size,ADDITIONAL_VEGETABLES.length,
    'the new standalone vegetable list cannot duplicate names');
  assert.equal(new Set(WORD_BANK.vegetable).size,WORD_BANK.vegetable.length,
    'the live vegetable list should contain no literal duplicates');
  for(const [group,words] of Object.entries(ADDITIONAL_VEGETABLE_GROUPS)){
    assert.ok(words.length>=15,'missing meaningful coverage for '+group);
    for(const word of words){
      assert.equal(word,word.trim().normalize('NFC'),'bad normalization: '+word);
      assert.match(word,/^[ก-ฮเแโใไ]/,'invalid Thai vegetable name: '+word);
      assert.ok(WORD_BANK.vegetable.includes(word),'not registered: '+word);
    }
  }
});
test('important leafy, root, legume and local vegetable names were added',()=>{
  for(const word of [
    'กรีนโอ๊ก','เรดโอ๊ก','ผักกาดฮ่องเต้','เคล','กะหล่ำดาว',
    'ซูกินีเหลือง','บวบเหลี่ยม','ฟักแฟง','มะเขือเทศเชอร์รี',
    'พริกหวานแดง','ไชเท้าแดง','มันแกว','เผือกหอม',
    'ถั่วลูกไก่','ถั่วงอกถั่วเหลือง','ต้นอ่อนบรอกโคลี',
    'ใบเหลียง','ดอกขจร','ผักเฮือด','กะเพราแดง',
    'เห็ดนางรม','เห็ดชิเมจิ'
  ])assert.ok(WORD_BANK.vegetable.includes(word),'missing expected: '+word);
});
