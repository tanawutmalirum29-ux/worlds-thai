import test from 'node:test';
import assert from 'node:assert/strict';
import { ADDITIONAL_FISH } from '../amplify/functions/game/additional-fish.ts';
import { WORD_BANK, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER } from '../amplify/functions/game/dictionary.ts';
import { LETTERS, eligibleCategories, wordInitialForCategory, canonicalAnswer, validAnswer, newMatch, applyAction, scoreRound } from '../amplify/functions/game/logic.ts';
import { wordsForGroup } from '../amplify/functions/game/rarity.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer } from '../amplify/functions/game/moderation.ts';

test('curated fish list has 200+ valid, distinct names and no duplicates in the live bank', () => {
  assert.ok(ADDITIONAL_FISH.length >= 200);
  assert.equal(new Set(ADDITIONAL_FISH).size, ADDITIONAL_FISH.length);
  assert.equal(new Set(WORD_BANK.fish).size, WORD_BANK.fish.length);
  for(const name of ADDITIONAL_FISH){
    assert.equal(name,name.trim().normalize('NFC'),'not NFC '+name);
    assert.ok(name.length>=2&&name.length<=48,'invalid length '+name);
    assert.ok(!name.startsWith('ปลา'),'store the fish name without the generic ปลา prefix: '+name);
    assert.equal(isInappropriateLanguage(name),false,'blocked language '+name);
    assert.equal(isBlockedStandaloneAnswer(name),false,'blocked answer '+name);
    assert.equal(WORD_BANK.fish.filter(word=>word===name).length,1,'missing '+name);
    const letter=wordInitialForCategory(name,'fish');
    assert.equal(wordInitialForCategory('ปลา'+name,'fish'),letter,'prefix changes initial '+name);
    assert.equal(canonicalAnswer('ปลา'+name,'fish'),canonicalAnswer(name,'fish'),'prefix changes identity '+name);
    if(LETTERS.includes(letter as never)&&eligibleCategories(letter).includes('fish')){
      assert.equal(validAnswer(name,letter,'fish'),true,'bare fish invalid '+name);
      assert.equal(validAnswer('ปลา'+name,letter,'fish'),true,'prefixed fish invalid '+name);
    }
  }
});

test('familiar freshwater, sea and aquarium names are accepted for the true initial', () => {
  const examples: ReadonlyArray<readonly [string,string]> = [
    ['ปลากระสูบ','ก'],['ปลาแขยง','ข'],['ปลาชะโอน','ช'],
    ['ปลาเทพา','ท'],['ปลาแปบควาย','ป'],['ปลาเสือตอ','ส'],
    ['ปลาฉลามวาฬ','ฉ'],['ปลากะตัก','ก'],['ปลากระโทงดาบ','ก'],
    ['ปลาโฉมงาม','ฉ'],['ปลาทูน่าครีบเหลือง','ท'],
    ['ปลามอลลี่','ม'],['ปลานีออน','น'],['ปลาบาร์บเสือ','บ'],
    ['ปลาเทวดา','ท'],['ปลาหางดาบ','ห'],['ปลาหมอสี','ห']
  ];
  for(const [word,letter] of examples){
    assert.equal(wordInitialForCategory(word,'fish'),letter,'wrong initial '+word);
    assert.equal(validAnswer(word,letter,'fish'),true,'must accept '+word);
  }
  assert.equal(validAnswer('ปลากระสูบ','ป','fish'),false,'ปลา is a category prefix, not the initial');
  assert.equal(validAnswer('ปลากระสูบ','ก','animal'),false);
  assert.equal(validAnswer('ปลากระสูบจรวด','ก','fish'),false,'invented fish not accepted');
  assert.equal(validAnswer('ปลาหมึก','ห','fish'),false,'squid is not a fish');
  assert.equal(validAnswer('ปลาโลมา','ล','fish'),false,'dolphin is not a fish');
});

test('new fish retain two-word/five-category fairness and deduplicated rarity', () => {
  assert.equal(MIN_WORDS_PER_PAIR,2);
  assert.equal(MIN_CATEGORIES_PER_LETTER,5);
  for(const letter of LETTERS){
    if(!eligibleCategories(letter).includes('fish'))continue;
    const unique=new Set(WORD_BANK.fish
      .filter(word=>wordInitialForCategory(word,'fish')===letter)
      .map(word=>canonicalAnswer(word,'fish')));
    assert.ok(unique.size>=MIN_WORDS_PER_PAIR,'too few distinct fish for '+letter);
    assert.deepEqual(wordsForGroup(letter,'fish'),[...unique].sort(),'fish rarity mismatch '+letter);
  }
});

test('fish with or without ปลา score as identical answers in multiplayer', () => {
  const now=1_700_000_000_000;
  const game=newMatch('room-aabbccddeeff00112233',now);
  applyAction(game,'create','host',now,'Host');
  applyAction(game,'join','guest',now,'Guest');
  game.phase='playing';game.letter='ก';game.categories=['fish'];
  game.submissions={host:{fish:'กระสูบ'},guest:{fish:'ปลากระสูบ'}};
  assert.deepEqual(scoreRound(game).map(e=>e.points),[1,1]);
  game.submissions.guest={fish:'ปลากระสูบขีด'};
  assert.deepEqual(scoreRound(game).map(e=>e.points),[2,2]);
});
