import test from 'node:test';
import assert from 'node:assert/strict';
import { ADDITIONAL_TOYS } from '../amplify/functions/game/additional-toys.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { LETTERS, eligibleCategories, validAnswer, wordInitialForCategory, newMatch, applyAction, scoreRound } from '../amplify/functions/game/logic.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer } from '../amplify/functions/game/moderation.ts';
test('new toys are unique, safe, correctly registered and playable',()=>{
  assert.ok(ADDITIONAL_TOYS.length>=250);
  assert.equal(new Set(ADDITIONAL_TOYS).size, ADDITIONAL_TOYS.length);
  assert.equal(new Set(WORD_BANK.toy).size, WORD_BANK.toy.length);
  for(const word of ADDITIONAL_TOYS){
    assert.equal(word,word.trim().normalize('NFC'));
    assert.ok(word.length>=2&&word.length<=48);
    assert.equal(isInappropriateLanguage(word),false,word);
    assert.equal(isBlockedStandaloneAnswer(word),false,word);
    assert.equal(WORD_BANK.toy.filter(w=>w===word).length,1,word);
    const letter=wordInitialForCategory(word,'toy');
    if(LETTERS.includes(letter as never)&&eligibleCategories(letter).includes('toy'))
      assert.equal(validAnswer(word,letter,'toy'),true,word);
  }
});
test('Barbie and other familiar toys accept only correct initial and category',()=>{
  for(const [word,letter] of [['บาร์บี้','บ'],['ตุ๊กตาบาร์บี้','ต'],['บ้านบาร์บี้','บ'],['เบย์เบลด','บ'],['โยโย่','ย'],['โดมิโน','ด'],['ทามาก็อตจิ','ท'],['ป๊อปอิท','ป'],['โมเดลกันดั้ม','ม'],['ไพ่อูโน่','พ']] as const){
    assert.equal(wordInitialForCategory(word,'toy'),letter);
    assert.equal(validAnswer(word,letter,'toy'),true,word);
  }
  assert.equal(validAnswer('บาร์บี้','บ','animal'),false);
  assert.equal(validAnswer('บาร์บี้','ต','toy'),false);
  assert.equal(validAnswer('ตุ๊กตาบาร์บี้ดาวอังคาร','ต','toy'),false);
});
test('matching Barbie answers score one point; different words score two',()=>{
  const now=1_700_000_000_000;
  const match=newMatch('room-aabbccddeeff00112233',now);
  applyAction(match,'create','host',now,'Host');
  applyAction(match,'join','guest',now,'Guest');
  match.phase='playing';match.letter='บ';match.categories=['toy'];
  match.submissions={host:{toy:'บาร์บี้'},guest:{toy:'บ้านบาร์บี้'}};
  assert.deepEqual(scoreRound(match).map(e=>e.points),[2,2]);
  match.submissions.guest={toy:'บาร์บี้'};
  assert.deepEqual(scoreRound(match).map(e=>e.points),[1,1]);
});
