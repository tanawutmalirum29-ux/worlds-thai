import test from 'node:test';
import assert from 'node:assert/strict';
import {LOR_LING_TERMS} from '../amplify/functions/game/lor-ling-terms.ts';
import {WORD_BANK,MIN_CATEGORIES_PER_LETTER,MIN_WORDS_PER_PAIR} from '../amplify/functions/game/dictionary.ts';
import {CATEGORIES,LETTERS,eligibleCategories,wordInitialForCategory,canonicalAnswer,validAnswer,newMatch,applyAction,chooseRound,scoreRound} from '../amplify/functions/game/logic.ts';

test('reviewed ล terms are distinct, have correct initials, and are registered without category duplicates',()=>{
  const availableCategories=new Set<string>(CATEGORIES.map(([id])=>id));
  let total=0;
  for(const [category,words] of Object.entries(LOR_LING_TERMS)){
    assert.ok(availableCategories.has(category),'unknown category '+category);
    assert.equal(new Set(words).size,words.length,'repeated addition in '+category);
    assert.equal(new Set(WORD_BANK[category]).size,WORD_BANK[category].length,'duplicate in live '+category);
    for(const word of words){
      total++;
      assert.equal(word,word.trim().normalize('NFC'),'untrimmed or non-NFC '+word);
      assert.ok(word.length<=48,'word exceeds input limit '+word);
      assert.equal(wordInitialForCategory(word,category),'ล',word+' must start with ล');
      assert.ok(WORD_BANK[category].includes(word),word+' was not registered in '+category);
      if(eligibleCategories('ล').includes(category))
        assert.equal(validAnswer(word,'ล',category),true,category+': '+word+' not playable');
    }
  }
  assert.ok(total>=300,'at least 300 distinct category entries should be registered');
  assert.ok(Object.keys(LOR_LING_TERMS).length>=20,'vocabulary must cover multiple everyday categories');
});

test('ล qualifies for the 5-category/2-distinct-word threshold and eight-category rooms',()=>{
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  assert.ok(LETTERS.includes('ล' as never),'ล must now enter the random consonant pool');
  const eligible=eligibleCategories('ล');
  assert.ok(eligible.length>=16,'ล should have broad, not merely marginal, category support');
  for(const category of eligible){
    const distinct=new Set(WORD_BANK[category]
      .filter(word=>wordInitialForCategory(word,category)==='ล')
      .map(word=>canonicalAnswer(word,category)));
    assert.ok(distinct.size>=2,category+' is short on distinct ล answers');
  }
  // Every valid room size (3–8) can select ล without repeating any category.
  for(let size=3;size<=8;size++){
    const m=newMatch('room-aabbccddeeff00112233',1_700_000_000_000);
    applyAction(m,'create','host',1_700_000_000_000,'Host');
    applyAction(m,'join','guest',1_700_000_000_000,'Guest');
    m.settings={rounds:1,categories:size,seconds:40};
    const letters=LETTERS.filter(letter=>eligibleCategories(letter).length>=size);
    const offset=letters.indexOf('ล');
    assert.ok(offset>=0,'ล must support '+size+' categories');
    const round=chooseRound(m,()=> (offset+0.01)/letters.length);
    assert.equal(round.letter,'ล');
    assert.equal(round.categories.length,size);
    assert.equal(new Set(round.categories).size,size);
    assert.ok(round.categories.every(id=>eligible.includes(id)));
  }
});

test('common ล-initial answers are accepted in correct category, including written leading vowels',()=>{
  const examples:ReadonlyArray<readonly [string,string]>=[
    ['ลิง','animal'],['ลา','animal'],['โลมา','animal'],['ละมั่ง','animal'],
    ['ล่าม','job'],['เลขานุการ','job'],['ลบ','verb'],['ลืม','verb'],
    ['เลมอน','fruit'],['ลูกเนียง','vegetable'],['ลาบ','food'],
    ['ลูกชิ้นทอด','food'],['ลาเต้','drink'],['ลิ้นจี่โซดา','drink'],
    ['ไลร์','music'],['ลำไส้','body'],['เลกกิ้ง','clothing'],
    ['ลำโพงพกพา','device'],['ลูกโลก','school'],['ลิ้นมังกร','plant'],
    ['ลีลาวดี','flower'],['ลองกอง','tree'],['ลูกโป่ง','object'],
    ['ลานจอดรถ','place'],['เลโก้','toy'],['ลอดช่อง','dessert'],
    ['ลูกชุบ','dessert'],['ลาวา','nature'],['ลิ้นชัก','furniture'],
    ['เลื่อย','tool']
  ];
  for(const [word,category] of examples)
    assert.equal(validAnswer(word,'ล',category),true,word+'/'+category+' should be accepted');
  assert.equal(validAnswer('ขนมลอดช่อง','ล','dessert'),true,'optional ขนม prefix should not affect ล');
  assert.equal(canonicalAnswer('ขนมลอดช่อง','dessert'),'ลอดช่อง');
  assert.equal(validAnswer('ลอดช่อง','ข','dessert'),false);
  assert.equal(validAnswer('ลิง','ล','food'),false);
  assert.equal(validAnswer('ลาเต้','ล','animal'),false);
  assert.equal(validAnswer('เลื่อย','ล','music'),false);
  assert.equal(validAnswer('ลิงติดจรวด','ล','animal'),false,'invented words remain invalid');
  assert.equal(validAnswer('ลาบเอเลียน','ล','food'),false,'arbitrary menu combinations are invalid');
});

test('distinct ล answers score 2 points and identical answers score 1 each',()=>{
  const now=1_700_000_000_000;
  const m=newMatch('room-aabbccddeeff00112233',now);
  applyAction(m,'create','host',now,'Host');
  applyAction(m,'join','guest',now,'Guest');
  m.phase='playing';m.letter='ล';m.categories=['animal','food','dessert'];
  m.submissions={
    host:{animal:'ลิง',food:'ลาบ',dessert:'ลอดช่อง'},
    guest:{animal:'โลมา',food:'ลูกชิ้น',dessert:'ขนมลอดช่อง'}
  };
  assert.deepEqual(scoreRound(m).map(e=>e.points),[5,5]);
  m.submissions.guest={animal:'ลิง',food:'ลาบ',dessert:'ลอดช่อง'};
  assert.deepEqual(scoreRound(m).map(e=>e.points),[3,3]);
});
