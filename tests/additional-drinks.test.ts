import test from 'node:test';
import assert from 'node:assert/strict';
import {ADDITIONAL_DRINK_GROUPS,ADDITIONAL_DRINKS} from '../amplify/functions/game/additional-drinks.ts';
import {WORD_BANK} from '../amplify/functions/game/dictionary.ts';
import {
  canonicalAnswer,eligibleCategories,validAnswer,wordInitialForCategory,
  newMatch,applyAction,scoreRound
} from '../amplify/functions/game/logic.ts';

test('curated beverage expansion is substantial, distinct and wired into live gameplay',()=>{
  assert.ok(ADDITIONAL_DRINKS.length>=450,'expected wide coverage of drink names');
  assert.equal(new Set(ADDITIONAL_DRINKS).size,ADDITIONAL_DRINKS.length,
    'additions should not have repeated literal entries');
  assert.equal(new Set(WORD_BANK.drink).size,WORD_BANK.drink.length,
    'live dictionary must remove repeated drink spellings');
  for(const [group,words] of Object.entries(ADDITIONAL_DRINK_GROUPS)){
    assert.ok(words.length>=40,group+' is undersized');
    for(const word of words){
      assert.equal(word,word.trim().normalize('NFC'),'bad normalization: '+word);
      assert.ok(WORD_BANK.drink.includes(word),'not registered: '+word);
      const first=wordInitialForCategory(word,'drink');
      assert.match(first,/^[ก-ฮ]$/,'invalid Thai initial: '+word);
      if(eligibleCategories(first).includes('drink'))
        assert.equal(validAnswer(word,first,'drink'),true,'not playable: '+word);
    }
  }
});

test('Sprite and familiar beverage types accept the proper Thai consonant',()=>{
  for(const [word,initial] of [
    ['สไปรท์','ส'],['สไปร์','ส'],['สไปรต์','ส'],
    ['สไปรท์ซีโร่','ส'],['โค้ก','ค'],['โคคาโคล่า','ค'],
    ['เป๊ปซี่','ป'],['แฟนต้า','ฟ'],['มิรินด้า','ม'],
    ['เซเว่นอัพ','ซ'],['ชาไทยปั่น','ช'],['มัทฉะลาเต้','ม'],
    ['น้ำอ้อย','น'],['โกโก้ร้อน','ก'],['ยาคูลท์','ย'],
    ['โออิชิ','อ'],['ลิปตัน','ล'],['น้ำบัวบก','น']
  ] as const){
    assert.equal(wordInitialForCategory(word,'drink'),initial,'wrong initial: '+word);
    assert.equal(validAnswer(word,initial,'drink'),true,'rejected beverage: '+word);
  }
});

test('a mistyped Sprite and its standard spelling count once in scores and rarity',()=>{
  for(const spelling of ['สไปรท์','สไปร์','สไปรต์']){
    assert.equal(canonicalAnswer(spelling,'drink'),'สไปรท์',spelling);
    assert.equal(validAnswer(spelling,'ส','drink'),true,spelling);
  }
  assert.equal(canonicalAnswer('โคคาโคล่า','drink'),'โค้ก');
  assert.equal(canonicalAnswer('เอสเพรสโซ','drink'),'เอสเปรสโซ');
  const timestamp=1_700_000_000_000;
  const match=newMatch('room-aabbccddeeff00112233',timestamp);
  applyAction(match,'create','host',timestamp,'Host');
  applyAction(match,'join','guest',timestamp,'Guest');
  match.phase='playing';
  match.letter='ส';
  match.categories=['drink'];
  match.submissions={host:{drink:'สไปรท์'},guest:{drink:'สไปร์'}};
  assert.deepEqual(scoreRound(match).map(entry=>entry.perCategory.drink),[1,1]);
});

test('the dictionary never treats invented flavors, bare prefixes or unrelated terms as drinks',()=>{
  for(const word of ['น้ำ','ชา','เครื่องดื่ม','สไปร์อวกาศ','น้ำทุเรียนกล้วยไข่จักรวาล']){
    assert.equal(validAnswer(word,wordInitialForCategory(word,'drink'),'drink'),false,word);
  }
  assert.equal(validAnswer('สไปรท์','ส','dessert'),false);
  assert.equal(validAnswer('โค้ก','ค','animal'),false);
});
