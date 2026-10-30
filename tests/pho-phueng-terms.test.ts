import test from 'node:test';
import assert from 'node:assert/strict';
import {PHO_PHUENG_TERMS} from '../amplify/functions/game/pho-phueng-terms.ts';
import {WORD_BANK,MIN_CATEGORIES_PER_LETTER,MIN_WORDS_PER_PAIR} from '../amplify/functions/game/dictionary.ts';
import {
  CATEGORIES,LETTERS,eligibleCategories,initialConsonant,wordInitialForCategory,canonicalAnswer,
  validAnswer,newMatch,applyAction,chooseRound,scoreRound
} from '../amplify/functions/game/logic.ts';

test('all reviewed ผ words appear once per live category, are NFC, and start with ผ',()=>{
  const supported=new Set<string>(CATEGORIES.map(([id])=>id));
  let count=0;
  for(const [category,words] of Object.entries(PHO_PHUENG_TERMS)){
    assert.ok(supported.has(category),'unknown category '+category);
    assert.equal(new Set(words).size,words.length,'repeated additions in '+category);
    assert.equal(new Set(WORD_BANK[category]).size,WORD_BANK[category].length,
      'duplicates in production '+category);
    for(const word of words){
      count++;
      assert.equal(word,word.trim().normalize('NFC'),'bad whitespace/Unicode '+word);
      assert.ok(word.length<=48,'word too long '+word);
      assert.equal(initialConsonant(word),'ผ',
        'reviewed dictionary entry must begin with ผ for '+word);
      assert.ok(WORD_BANK[category].includes(word),
        category+': '+word+' missing from production dictionary');
      const effectiveLetter=wordInitialForCategory(word,category);
      assert.equal(validAnswer(word,effectiveLetter,category),
        eligibleCategories(effectiveLetter).includes(category),
        category+': '+word+' must be assigned by its real consonant');
      if(effectiveLetter!=='ผ')
        assert.equal(validAnswer(word,'ผ',category),false,word+' no longer counts ผ category prefix');
    }
  }
  assert.ok(count>=400,'expected a substantial new ผ dictionary');
  assert.ok(Object.keys(PHO_PHUENG_TERMS).length>=15,'expected broad category coverage');
});

test('ผ is drawn with five qualifying categories and supports rooms of three to eight',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  assert.ok(LETTERS.includes('ผ' as never),'ผ must remain playable');
  const eligible=eligibleCategories('ผ');
  assert.ok(eligible.length>=15,'ผ should cover at least 15 well-stocked categories');
  for(const category of eligible){
    const distinct=new Set(WORD_BANK[category]
      .filter(word=>wordInitialForCategory(word,category)==='ผ')
      .map(word=>canonicalAnswer(word,category)));
    assert.ok(distinct.size>=2,category+' has too few different ผ answers');
  }
  for(let size=3;size<=8;size++){
    const now=1_700_000_000_000;
    const m=newMatch('room-aabbccddeeff00112233',now);
    applyAction(m,'create','host',now,'Host');
    applyAction(m,'join','guest',now,'Guest');
    m.settings={rounds:1,categories:size,seconds:40};
    const letters=LETTERS.filter(letter=>eligibleCategories(letter).length>=size);
    const offset=letters.indexOf('ผ');
    assert.ok(offset>=0,'ผ must be available to '+size+'-category rooms');
    const round=chooseRound(m,()=> (offset+0.01)/letters.length);
    assert.equal(round.letter,'ผ');
    assert.equal(round.categories.length,size);
    assert.equal(new Set(round.categories).size,size);
    for(const category of round.categories)
      assert.ok(eligible.includes(category),category+' not supported by ผ');
  }
});

test('popular ผ answers and preposed vowels work, but fabricated or wrong-category strings do not',()=>{
  const examples:ReadonlyArray<readonly [string,string]>=[
    ['ผึ้ง','animal'],['ผีเสื้อหนอนมะนาว','insect'],
    ['ผู้พิพากษา','job'],['ผูกเชือก','verb'],['เผชิญหน้า','verb'],
    ['ผักกูด','vegetable'],['ผักกาดขาว','vegetable'],
    ['ผัดขี้เมา','food'],['ผัดกะเพราไก่','food'],
    ['เผือกนมสด','drink'],['ผิวหนัง','body'],
    ['ผ้าขาวม้า','clothing'],['แผนที่','school'],
    ['ไผ่ตง','plant'],['ผกากรอง','flower'],
    ['ผ้าห่ม','object'],['ผาแต้ม','place'],
    ['ผึ้งหลวง','insect'],['เผือกเชื่อม','dessert'],
    ['ผิวน้ำ','nature'],['ผ้าถูพื้น','tool']
  ];
  for(const [word,category] of examples){
    const effectiveLetter=wordInitialForCategory(word,category);
    assert.equal(validAnswer(word,effectiveLetter,category),
      eligibleCategories(effectiveLetter).includes(category),
      category+': '+word+' must be playable for the actual initial');
    if(effectiveLetter!=='ผ')assert.equal(validAnswer(word,'ผ',category),false,word);
  }
  assert.equal(validAnswer('ขนมเผือกเชื่อม','ผ','dessert'),true);
  assert.equal(canonicalAnswer('ขนมเผือกเชื่อม','dessert'),'เผือกเชื่อม');
  assert.equal(validAnswer('ขนมผิง','ผ','dessert'),true,
    'existing prefixed ขนมผิง must remain playable as ผ');
  assert.equal(validAnswer('ขนมเผือกเชื่อม','ข','dessert'),false);
  assert.equal(validAnswer('ผึ้ง','ผ','food'),false);
  assert.equal(validAnswer('เผือกนมสด','ผ','animal'),false);
  assert.equal(validAnswer('ผักบินได้','ผ','vegetable'),false);
  assert.equal(validAnswer('ผัดอุกกาบาต','ผ','food'),false);
  assert.equal(validAnswer('ผ้าเช็ดตัว','ผ','job'),false);
});

test('score duplicate spelling of a ผ dessert as one answer, not two',()=>{
  const now=1_700_000_000_000;
  const m=newMatch('room-aabbccddeeff00112233',now);
  applyAction(m,'create','host',now,'Host');
  applyAction(m,'join','guest',now,'Guest');
  m.phase='playing';m.letter='ผ';m.categories=['animal','vegetable','dessert'];
  m.submissions={
    host:{animal:'ผึ้ง',vegetable:'ผักกูด',dessert:'เผือกเชื่อม'},
    guest:{animal:'ผีเสื้อกลางคืน',vegetable:'ผักปลัง',dessert:'ขนมเผือกเชื่อม'}
  };
  assert.deepEqual(scoreRound(m).map(e=>e.points),[3,3],
    'ผักกูด and ผักปลัง now count ก and ป instead of ผ');
  m.submissions.guest={animal:'ผึ้ง',vegetable:'ผักกูด',dessert:'เผือกเชื่อม'};
  assert.deepEqual(scoreRound(m).map(e=>e.points),[2,2]);
  m.letter='ก';m.categories=['vegetable'];
  m.submissions={host:{vegetable:'ผักกูด'},guest:{vegetable:'กูด'}};
  assert.deepEqual(scoreRound(m).map(e=>e.points),[1,1],
    'the bare and prefixed vegetable names are one answer');
});
