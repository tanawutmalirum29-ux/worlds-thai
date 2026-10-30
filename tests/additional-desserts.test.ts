import test from 'node:test';
import assert from 'node:assert/strict';
import {ADDITIONAL_DESSERT_GROUPS,ADDITIONAL_DESSERTS} from '../amplify/functions/game/additional-desserts.ts';
import {WORD_BANK} from '../amplify/functions/game/dictionary.ts';
import {
  canonicalAnswer,eligibleCategories,validAnswer,wordInitialForCategory,
  newMatch,applyAction,scoreRound
} from '../amplify/functions/game/logic.ts';
import {dessertSubtype} from '../src/dessert-subtypes.ts';

test('expanded dessert list contains hundreds of vetted names without literal duplicates',()=>{
  assert.ok(ADDITIONAL_DESSERTS.length>=300,'dessert expansion is too small');
  assert.equal(new Set(ADDITIONAL_DESSERTS).size,ADDITIONAL_DESSERTS.length);
  assert.equal(new Set(WORD_BANK.dessert).size,WORD_BANK.dessert.length,
    'live dessert bank must deduplicate repeated spellings');
  for(const [subtype,words] of Object.entries(ADDITIONAL_DESSERT_GROUPS)){
    assert.ok(words.length>15,subtype+' has too few entries');
    for(const word of words){
      assert.equal(word,word.trim().normalize('NFC'),word+' was not normalized');
      assert.ok(WORD_BANK.dessert.includes(word),word+' was not registered');
      const first=wordInitialForCategory(word,'dessert');
      assert.match(first,/^[ก-ฮ]$/,word+' has no playable Thai initial');
      assert.equal(dessertSubtype(word),subtype,word+' is classified incorrectly');
      if(eligibleCategories(first).includes('dessert'))
        assert.equal(validAnswer(word,first,'dessert'),true,word+' is rejected');
    }
  }
});

test('frequently requested dessert names are valid with correct consonants',()=>{
  for(const [name,initial] of [
    ['ครัวซองต์','ค'],['ครัวซอง','ค'],['ครอฟเฟิล','ค'],
    ['ครีมชีส','ค'],['โดรายากิ','ด'],['โดรายากิถั่วแดง','ด'],
    ['จันอับ','จ'],['ขนมจันอับ','จ'],['ขนมเสน่ห์จันทน์','ส'],
    ['โมจิ','ม'],['ไดฟูกุ','ด'],['บิงซูมะม่วง','บ'],
    ['ชีสทาร์ต','ช'],['ขนมพระพาย','พ'],['ฟักเชื่อม','ฟ']
  ] as const){
    assert.equal(wordInitialForCategory(name,'dessert'),initial,name);
    assert.equal(validAnswer(name,initial,'dessert'),true,name);
    assert.equal(validAnswer(name,'ก','dessert'),initial==='ก',name+' wrong initial');
  }
});

test('croissant shorthand and optional dessert prefix count as one canonical word',()=>{
  for(const word of ['ครัวซอง','ครัวซองต์','ขนมครัวซอง','ขนมครัวซองต์']){
    assert.equal(canonicalAnswer(word,'dessert'),'ครัวซองต์',word);
    assert.equal(validAnswer(word,'ค','dessert'),true,word);
  }
  for(const word of ['จันอับ','ขนมจันอับ']){
    assert.equal(canonicalAnswer(word,'dessert'),'จันอับ',word);
    assert.equal(validAnswer(word,'จ','dessert'),true,word);
  }
  const timestamp=1_700_000_000_000;
  const match=newMatch('room-aabbccddeeff00112233',timestamp);
  applyAction(match,'create','host',timestamp,'Host');
  applyAction(match,'join','guest',timestamp,'Guest');
  match.phase='playing';
  match.letter='ค';
  match.categories=['dessert'];
  match.submissions={host:{dessert:'ครัวซอง'},guest:{dessert:'ครัวซองต์'}};
  assert.deepEqual(scoreRound(match).map(result=>result.perCategory.dessert),[1,1],
    'both spellings share one answer identity for duplicate scoring');
});

test('dessert expansion does not permit invented names or unrelated savory items',()=>{
  for(const word of ['ขนม','ขนมจันทร์','ขนมครัวซองสายรุ้งจักรวาล','โดรายากิหมูกรอบ']){
    assert.equal(validAnswer(word,wordInitialForCategory(word,'dessert'),'dessert'),false,word);
  }
  assert.equal(validAnswer('ครีมชีส','ค','animal'),false);
  assert.equal(validAnswer('โดรายากิ','ด','food'),false);
});
