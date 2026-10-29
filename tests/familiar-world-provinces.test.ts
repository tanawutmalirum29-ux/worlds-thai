import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_BANK, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER } from '../amplify/functions/game/dictionary.ts';
import { NEIGHBORING_PROVINCES, NEIGHBOR_PROVINCE_ALIASES } from '../amplify/functions/game/neighbor-provinces.ts';
import { FAMILIAR_WORLD_REGIONS, FAMILIAR_WORLD_PROVINCES } from '../amplify/functions/game/familiar-world-provinces.ts';
import { CATEGORIES, LETTERS, eligibleCategories, wordInitialForCategory, canonicalAnswer, validAnswer } from '../amplify/functions/game/logic.ts';

test('77 Thai provinces are kept while familiar overseas provinces stay limited',()=>{
  const world=Object.fromEntries(Object.entries(FAMILIAR_WORLD_REGIONS).map(([country,places])=>[country,places.length]));
  assert.deepEqual(world,{unitedStates:12,canada:3,japan:8,australia:3,germany:2});
  assert.equal(FAMILIAR_WORLD_PROVINCES.length,28);
  const foreign=[...NEIGHBORING_PROVINCES,...FAMILIAR_WORLD_PROVINCES];
  assert.equal(foreign.length,66);
  assert.equal(new Set(foreign).size,66);
  const aliases=Object.keys(NEIGHBOR_PROVINCE_ALIASES);
  assert.equal(WORD_BANK.province.length,77+foreign.length+aliases.length);
  assert.ok(WORD_BANK.province.length<=160,'foreign names must not become a complete atlas again');
  assert.equal(new Set(WORD_BANK.province).size,WORD_BANK.province.length);
  for(const word of foreign) assert.ok(WORD_BANK.province.includes(word),word+' should be in province bank');
  for(const thai of ['กรุงเทพมหานคร','เชียงใหม่','ชลบุรี','นครราชสีมา','แม่ฮ่องสอน','อุบลราชธานี']){
    assert.ok(WORD_BANK.province.includes(thai),thai+' must be kept');
  }
});

test('only recognizable overseas regions are retained; ordinary foreign cities are excluded',()=>{
  for(const word of ['แคลิฟอร์เนีย','โคโลราโด','เคนทักกี','นิวยอร์ก','ฮาวาย','ออนแทรีโอ','ควิเบก','โตเกียว','โอซากะ','ฮอกไกโด','ควีนส์แลนด์','เบอร์ลิน']){
    assert.ok(FAMILIAR_WORLD_PROVINCES.includes(word),word+' should remain');
  }
  for(const removed of ['ไวโอมิง','เนแบรสกา','มอนแทนา','ซัสแคตเชวัน','นิวฟันด์แลนด์และแลบราดอร์','ยามากาตะ','บรันเดนบูร์ก','ซัคเซิน']){
    assert.equal(WORD_BANK.province.includes(removed),false,removed+' should be removed');
  }
  assert.equal(validAnswer('โอซากะ','อ','province'),true);
  assert.equal(validAnswer('ออนแทรีโอ','อ','province'),true);
  assert.equal(validAnswer('แคลิฟอร์เนีย','ค','province'),true);
  assert.equal(validAnswer('โอซากะ','อ','country'),false);
  assert.equal(validAnswer('ลอสแอนเจลิส','ล','province'),false,'ordinary city is not a province');
});

test('cutting international regions does not disable existing playable letters',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,5);
  assert.equal(MIN_CATEGORIES_PER_LETTER,8);
  assert.equal(CATEGORIES.length,29);
  for(const letter of ['ว','ห','จ','ก','ข','ค','ช','ด','ต','ท','น','บ','ป','พ','ม','ร','ส','อ']){
    assert.ok(LETTERS.includes(letter as never),letter+' lost playability');
    for(const category of eligibleCategories(letter)){
      const answerCount=new Set((WORD_BANK[category]||[])
        .filter(word=>wordInitialForCategory(word,category)===letter)
        .map(word=>canonicalAnswer(word,category))).size;
      assert.ok(answerCount>=5,letter+'/'+category+' contains only '+answerCount+' words');
    }
    assert.ok(eligibleCategories(letter).length>=8,letter+' must still support eight categories');
  }
});
