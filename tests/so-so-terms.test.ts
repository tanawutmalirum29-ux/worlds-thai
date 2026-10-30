import test from 'node:test';
import assert from 'node:assert/strict';
import { SO_SO_TERMS } from '../amplify/functions/game/so-so-terms.ts';
import { WORD_BANK, MIN_CATEGORIES_PER_LETTER, MIN_WORDS_PER_PAIR } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, LETTERS, canonicalAnswer, eligibleCategories, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { wordsForGroup } from '../amplify/functions/game/rarity.ts';
import { isBlockedStandaloneAnswer, isInappropriateLanguage } from '../amplify/functions/game/moderation.ts';

test('227 reviewed ซ words cover 25 valid categories without repeating a word in its category',()=>{
  const knownCategories=new Set<string>(CATEGORIES.map(([id])=>id));
  let count=0;
  for(const [category, words] of Object.entries(SO_SO_TERMS)){
    assert.ok(knownCategories.has(category),'unsupported category '+category);
    assert.equal(words.length,new Set(words).size,'duplicate in addition '+category);
    assert.equal(WORD_BANK[category].length,new Set(WORD_BANK[category]).size,'duplicate in live category '+category);
    for(const word of words){
      count++;
      assert.equal(word,word.trim().normalize('NFC'),'non-normalized '+word);
      assert.ok(word.length>=2&&word.length<=48,'out of game limits '+word);
      assert.equal(isInappropriateLanguage(word),false,'blocked language '+word);
      assert.equal(isBlockedStandaloneAnswer(word),false,'blocked standalone answer '+word);
      assert.equal(wordInitialForCategory(word,category),'ซ','not a real ซ initial '+category+'/'+word);
      assert.equal(WORD_BANK[category].filter(item=>item===word).length,1,'word missing or duplicated '+category+'/'+word);
      if(eligibleCategories('ซ').includes(category))
        assert.equal(validAnswer(word,'ซ',category),true,'word not playable '+category+'/'+word);
    }
  }
  assert.ok(count>=220,'expected substantial ซ vocabulary expansion');
  assert.ok(Object.keys(SO_SO_TERMS).length>=24,'expected broad category coverage');
});

test('new ซ names accept written leading vowels but reject unrelated categories or fake combinations',()=>{
  const examples: ReadonlyArray<readonly [string,string]>=[
    ['ซาลาแมนเดอร์','animal'],['ซูโม่','sport'],['เซลส์','job'],
    ['ซักถาม','verb'],['ซาโปเต','fruit'],['ซูกินี','vegetable'],
    ['ซาลาเปา','food'],['โซดาพีช','drink'],['ซึง','music'],
    ['ซอกฟัน','body'],['ซิ่น','clothing'],['ซาเล้ง','vehicle'],
    ['ซาวด์บาร์','device'],['ซองใส่รายงาน','school'],
    ['ซัลเวีย','plant'],['ซัลเวียแดง','flower'],['ซอกเขา','nature'],
    ['ซ้อ','tree'],['ซิมการ์ด','object'],['ซุ้มประตู','place'],
    ['ซิวหางกรรไกร','fish'],['ซันคอนัวร์','bird'],
    ['ซ่าหริ่ม','dessert'],['โซฟาปรับนอน','furniture'],['ซ็อกเก็ตหัวเทียน','tool']
  ];
  for(const [word,category] of examples)
    assert.equal(validAnswer(word,'ซ',category),true,category+'/'+word+' should be playable');
  assert.equal(validAnswer('ปลาซิวหางกรรไกร','ซ','fish'),true);
  assert.equal(canonicalAnswer('ปลาซิวหางกรรไกร','fish'),'ซิวหางกรรไกร');
  assert.equal(validAnswer('ดอกซัลเวียแดง','ซ','flower'),true);
  assert.equal(validAnswer('ต้นซ้อ','ซ','tree'),true);
  assert.equal(validAnswer('ขนมซ่าหริ่ม','ซ','dessert'),true);
  assert.equal(canonicalAnswer('ขนมซ่าหริ่ม','dessert'),'ซ่าหริ่ม');
  assert.equal(validAnswer('ซูโม่','ซ','fruit'),false);
  assert.equal(validAnswer('โซดาเอเลียน','ซ','drink'),false);
  assert.equal(validAnswer('ซาลาแมนเดอร์','ส','animal'),false);
  assert.equal(validAnswer('ซอย','ซ','verb'),true,'verb meaning must not be lost to place ซอย');
});

test('rarity counts canonical ซ words once and pre-existing eligibility rules remain intact',()=>{
  assert.ok(LETTERS.includes('ซ' as (typeof LETTERS)[number]));
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  assert.ok(eligibleCategories('ซ').length>=18,'expanded ซ should have broad playable categories');
  for(const letter of LETTERS){
    const cats=eligibleCategories(letter);
    assert.ok(cats.length>=MIN_CATEGORIES_PER_LETTER);
    for(const category of cats){
      const unique=new Set(WORD_BANK[category]
        .filter(word=>wordInitialForCategory(word,category)===letter)
        .map(word=>canonicalAnswer(word,category)));
      assert.ok(unique.size>=MIN_WORDS_PER_PAIR,category+'/'+letter);
      if(letter==='ซ' && Object.hasOwn(SO_SO_TERMS,category))
        assert.deepEqual(wordsForGroup(letter,category),[...unique].sort());
    }
  }
});
