import test from 'node:test';
import assert from 'node:assert/strict';
import {NOR_NU_TERMS,FARM_SHELTER_PLACES} from '../amplify/functions/game/nor-nu-terms.ts';
import {WORD_BANK,MIN_WORDS_PER_PAIR,MIN_CATEGORIES_PER_LETTER} from '../amplify/functions/game/dictionary.ts';
import {CATEGORIES,LETTERS,eligibleCategories,initialConsonant,wordInitialForCategory,canonicalAnswer,validAnswer,newMatch,applyAction,chooseRound,scoreRound} from '../amplify/functions/game/logic.ts';

test('all new น words are NFC, category-specific and not duplicated in production lists',()=>{
  const allowedCategories=new Set<string>(CATEGORIES.map(([id])=>id));
  let count=0;
  for(const [category,words] of Object.entries(NOR_NU_TERMS)){
    assert.ok(allowedCategories.has(category),'unsupported category: '+category);
    assert.equal(words.length,new Set(words).size,'duplicate additions in '+category);
    assert.equal(WORD_BANK[category].length,new Set(WORD_BANK[category]).size,'duplicate live '+category);
    for(const word of words){
      count++;
      assert.equal(word,word.trim().normalize('NFC'),'bad Unicode or spacing: '+word);
      assert.ok(word.length<=48,'too long '+word);
      assert.equal(initialConsonant(word),'น','raw reviewed word must begin with น: '+word);
      assert.ok(WORD_BANK[category].includes(word),'missing '+category+' / '+word);
      const effectiveLetter=wordInitialForCategory(word,category);
      // New bird/fish/insect/flower category prefixes are ignored only in that category.
      // An original น word (e.g. นกแสก) may now belong to ส เสือ when played as a bird.
      assert.equal(validAnswer(word,effectiveLetter,category),
        eligibleCategories(effectiveLetter).includes(category),
        word+' must follow the current category/letter fairness pool');
      if(effectiveLetter!=='น')assert.equal(validAnswer(word,'น',category),false,word);
    }
  }
  assert.ok(count>=400,'expected 400+ real-category entries');
  assert.ok(Object.keys(NOR_NU_TERMS).length>=20,'expected at least 20 categories');
});

test('นา is already known, while surveyed rice-field types are admitted to the place category',()=>{
  const names=['นา','นาข้าว','นาขั้นบันได','นาหว่าน','นาดำ','นาปี','นาปรัง','นาดอน','นาลุ่ม','นาทาม','นาคำ','นาร้าง','นาเกลือ','นาโนน','นาเขิน'];
  for(const word of names){
    assert.equal(wordInitialForCategory(word,'place'),'น',word);
    assert.equal(validAnswer(word,'น','place'),true,'real rice-field name rejected: '+word);
  }
  assert.equal(validAnswer('นาปลูกดวงจันทร์','น','place'),false,'invented type must not be admitted');
  assert.equal(validAnswer('นาหว่าน','น','food'),false,'place is not food');
});

test('เถียงนา is a ถ place, never an น place, with six documented farm shelter names',()=>{
  assert.deepEqual(FARM_SHELTER_PLACES,[
    'เถียงนา','เถียงไร่','กระท่อมปลายนา','ห้างนา','โรงนา','ขนำ'
  ]);
  for(const word of FARM_SHELTER_PLACES)assert.ok(WORD_BANK.place.includes(word),word+' missing');
  assert.equal(wordInitialForCategory('เถียงนา','place'),'ถ');
  assert.equal(validAnswer('เถียงนา','ถ','place'),true);
  assert.equal(validAnswer('เถียงนา','น','place'),false);
  assert.equal(validAnswer('เถียงไร่','ถ','place'),true);
  assert.equal(validAnswer('กระท่อมปลายนา','ก','place'),true);
  assert.equal(validAnswer('ห้างนา','ห','place'),true);
  assert.equal(validAnswer('โรงนา','ร','place'),true);
  assert.equal(validAnswer('ขนำ','ข','place'),true);
});

test('new น vocabulary is playable in correct categories, including preposed vowels and dessert prefixes',()=>{
  const examples:ReadonlyArray<readonly [string,string]>=[
    ['นกขุนทอง','animal'],['นกแสก','bird'],['นากทะเล','animal'],
    ['นักแสดง','job'],['นักพัฒนาเกม','job'],
    ['นั่งพับเพียบ','verb'],['นวดข้าว','verb'],['นึ่งปลา','verb'],
    ['น้อยโหน่ง','fruit'],['น้ำเต้า','vegetable'],['น้ำพริกกะปิ','food'],
    ['เนื้อแดดเดียว','food'],['น้ำเก๊กฮวย','drink'],['นมชมพู','drink'],
    ['นิ้วก้อย','body'],['เนกไทหูกระต่าย','clothing'],['นวม','clothing'],
    ['นาฬิกาดิจิทัล','device'],['น้ำยาลบคำผิด','school'],
    ['เนียมหูเสือ','plant'],['นีออน','flower'],['น้อยหน่า','tree'],
    ['น้ำบาดาล','nature'],['นามบัตร','object'],['นาฬิกาทราย','toy'],
    ['นวลจันทร์ทะเล','fish'],['นางเล็ด','dessert'],['นูกัต','dessert'],
    ['นาฬิกาจับเวลา','tool']
  ];
  for(const [word,category] of examples){
    const realLetter=wordInitialForCategory(word,category);
    assert.equal(validAnswer(word,realLetter,category),
      eligibleCategories(realLetter).includes(category),
      category+' / '+word+' should use '+realLetter+' rather than the label prefix');
    if(realLetter!=='น')assert.equal(validAnswer(word,'น',category),false,category+' / '+word);
  }
  assert.equal(validAnswer('ขนมนางเล็ด','น','dessert'),true,'optional dessert prefix');
  assert.equal(canonicalAnswer('ขนมนางเล็ด','dessert'),'นางเล็ด');
  assert.equal(validAnswer('ขนมนางเล็ด','ข','dessert'),false);
  assert.equal(validAnswer('นกขุนทอง','น','vegetable'),false);
  assert.equal(validAnswer('น้ำพริกยูนิคอร์น','น','food'),false);
  assert.equal(validAnswer('นกอวกาศสีรุ้ง','น','animal'),false);
});

test('the 5-category/2-answer fairness rule and larger rooms still allow น',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  assert.ok(LETTERS.includes('น' as never),'น must be in round pool');
  const categories=eligibleCategories('น');
  assert.ok(categories.length>=18,'new vocabulary should support many different categories');
  for(const category of categories){
    const words=new Set(WORD_BANK[category]
      .filter(word=>wordInitialForCategory(word,category)==='น')
      .map(word=>canonicalAnswer(word,category)));
    assert.ok(words.size>=2,category+' requires two distinct canonical answers');
  }
  for(let count=3;count<=8;count++){
    const now=1_700_000_000_000;
    const m=newMatch('room-aabbccddeeff00112233',now);
    applyAction(m,'create','host',now,'Host');
    applyAction(m,'join','guest',now,'Guest');
    m.settings={rounds:1,categories:count,seconds:40};
    const letters=LETTERS.filter(letter=>eligibleCategories(letter).length>=count);
    const target=letters.indexOf('น');
    assert.ok(target>=0,'น missing from '+count+'-category draw');
    const round=chooseRound(m,()=> (target+0.01)/letters.length);
    assert.equal(round.letter,'น');
    assert.equal(round.categories.length,count);
    assert.equal(new Set(round.categories).size,count);
    for(const id of round.categories)assert.ok(categories.includes(id));
  }
});

test('duplicate นางเล็ด and ขนมนางเล็ด share points, not separate identities',()=>{
  const now=1_700_000_000_000;
  const m=newMatch('room-aabbccddeeff00112233',now);
  applyAction(m,'create','host',now,'Host');
  applyAction(m,'join','guest',now,'Guest');
  m.phase='playing';m.letter='น';m.categories=['animal','place','dessert'];
  m.submissions={
    host:{animal:'นก',place:'นา',dessert:'นางเล็ด'},
    guest:{animal:'นาก',place:'นาดำ',dessert:'ขนมนางเล็ด'}
  };
  assert.deepEqual(scoreRound(m).map(entry=>entry.points),[5,5]);
  m.submissions.guest={animal:'นก',place:'นา',dessert:'นางเล็ด'};
  assert.deepEqual(scoreRound(m).map(entry=>entry.points),[3,3]);
});
