import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPANDED_THAI_TERMS} from '../amplify/functions/game/expanded-thai-terms.ts';
import {WORD_BANK,MIN_CATEGORIES_PER_LETTER,MIN_WORDS_PER_PAIR} from '../amplify/functions/game/dictionary.ts';
import {CATEGORIES,LETTERS,canonicalAnswer,eligibleCategories,validAnswer,wordInitialForCategory} from '../amplify/functions/game/logic.ts';
import {isInappropriateLanguage} from '../amplify/functions/game/moderation.ts';

test('expanded Thai vocabulary is reviewed, normalized, category-bound and available in the live bank',()=>{
  const supported=new Set<string>(CATEGORIES.map(([id])=>id));
  let entries=0;
  for(const [category,words] of Object.entries(EXPANDED_THAI_TERMS)){
    assert.ok(supported.has(category),'unknown category '+category);
    assert.equal(words.length,new Set(words).size,'duplicate expansion entry in '+category);
    assert.equal(WORD_BANK[category].length,new Set(WORD_BANK[category]).size,'duplicate live entry in '+category);
    for(const word of words){
      entries++;
      assert.equal(word,word.trim().normalize('NFC'),'un-normalized answer '+word);
      assert.ok(word.length>1 && word.length<=48,'word outside game input bounds '+word);
      assert.equal(isInappropriateLanguage(word),false,'blocked language in '+word);
      assert.ok(WORD_BANK[category].includes(word),'not registered '+category+'/'+word);
      const initial=wordInitialForCategory(word,category);
      assert.match(initial,/^[ก-ฮ]$/,'unexpected initial in '+category+'/'+word);
      if(eligibleCategories(initial).includes(category))
        assert.equal(validAnswer(word,initial,category),true,'unplayable addition '+category+'/'+word);
    }
  }
  assert.ok(entries>=1400,'expected a substantial reviewed expansion');
  assert.ok(Object.keys(EXPANDED_THAI_TERMS).length>=25);
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
});

test('expanded words follow category boundaries, initial consonants and optional name prefixes',()=>{
  const examples:ReadonlyArray<readonly [string,string,string]>=[
    ['ชินชิลลา','ช','animal'],
    ['ฟุตซอล','ฟ','sport'],
    ['นักพัฒนาเกม','น','job'],
    ['ถัก','ถ','verb'],
    ['กล้วยน้ำว้า','ก','fruit'],
    ['ผักกูด','ผ','vegetable'],
    ['ก๋วยจั๊บ','ก','food'],
    ['ชานมไข่มุก','ช','drink'],
    ['เมโลเดียน','ม','music'],
    ['กระดูกสะบัก','ก','body'],
    ['กางเกงยีนส์','ก','clothing'],
    ['รถดับเพลิง','ร','vehicle'],
    ['เครื่องฟอกอากาศ','ค','device'],
    ['กระดานไวต์บอร์ด','ก','school'],
    ['ว่านหางจระเข้','ว','plant'],
    ['กล้วยไม้แวนด้า','ก','flower'],
    ['ป่าชายเลน','ป','nature'],
    ['ต้นตะเคียนทอง','ต','tree'],
    ['ขวดโหล','ข','object'],
    ['ซูเปอร์มาร์เก็ต','ซ','place'],
    ['ลูกข่าง','ล','toy'],
    ['ปลากะพงแดง','ก','fish'],
    ['แมลงผีเสื้อกลางคืน','ผ','insect'],
    ['นกแต้วแล้ว','ต','bird'],
    ['ขนมเค้กกล้วยหอม','ค','dessert'],
    ['เก้าอี้พับ','ก','furniture'],
    ['เลื่อยวงเดือน','ล','tool']
  ];
  for(const [word,letter,category] of examples)
    assert.equal(validAnswer(word,letter,category),true,category+'/'+word+' should be playable');
  assert.equal(canonicalAnswer('นกแต้วแล้ว','bird'),'แต้วแล้ว');
  assert.equal(canonicalAnswer('ปลากะพงแดง','fish'),'กะพงแดง');
  assert.equal(validAnswer('ปลากะพงแดง','ป','fish'),false);
  assert.equal(validAnswer('ขนมเค้กกล้วยหอม','ข','dessert'),false);
  assert.equal(validAnswer('กล้วยน้ำว้า','ก','job'),false);
  assert.equal(validAnswer('ผักปลอมจากดาวอังคาร','ผ','vegetable'),false);
});

test('new vocabulary preserves fair consonant eligibility',()=>{
  for(const letter of LETTERS){
    const categories=eligibleCategories(letter);
    assert.ok(categories.length>=MIN_CATEGORIES_PER_LETTER,letter+' has too few categories');
    for(const category of categories){
      const distinct=new Set(WORD_BANK[category]
        .filter(word=>wordInitialForCategory(word,category)===letter)
        .map(word=>canonicalAnswer(word,category)));
      assert.ok(distinct.size>=MIN_WORDS_PER_PAIR,letter+'/'+category+' has too few words');
    }
  }
});
