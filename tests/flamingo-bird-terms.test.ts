import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIAR_BIRD_TERMS } from '../amplify/functions/game/familiar-bird-terms.ts';
import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { applyAction, advance, canonicalAnswer, newMatch, scoreRound, validAnswer, wordInitialForCategory } from '../amplify/functions/game/logic.ts';
import { wordsForGroup } from '../amplify/functions/game/rarity.ts';
import { roundWordDeltas } from '../amplify/functions/game/stats.ts';

test('both published flamingo spellings and optional bird prefix are accepted as one answer',()=>{
  for (const spelling of ['ฟลามิงโก','ฟลามิงโก้','นกฟลามิงโก','นกฟลามิงโก้']) {
    assert.equal(wordInitialForCategory(spelling,'bird'),'ฟ');
    assert.equal(validAnswer(spelling,'ฟ','bird'),true,'bird spelling: '+spelling);
    assert.equal(canonicalAnswer(spelling,'bird'),'ฟลามิงโก');
  }
  for (const spelling of ['ฟลามิงโก','ฟลามิงโก้']) {
    assert.equal(validAnswer(spelling,'ฟ','animal'),true,'animal spelling: '+spelling);
    assert.equal(canonicalAnswer(spelling,'animal'),'ฟลามิงโก');
  }
  assert.equal(validAnswer('นกฟลามิงโก','น','animal'),true);
  assert.equal(validAnswer('นกฟลามิงโก้','น','animal'),true);
  assert.equal(canonicalAnswer('นกฟลามิงโก้','animal'),'นกฟลามิงโก');
  assert.equal(validAnswer('ฟลามิงโก้','ฟ','fish'),false);
  assert.equal(validAnswer('ฟลามิงโก้สะท้อนแสง','ฟ','bird'),false);
  assert.equal(validAnswer('ฟลามิงโก้','น','bird'),false);
});

test('large and lesser flamingo spellings remain distinct species, not four rarity words',()=>{
  for (const size of ['ใหญ่','เล็ก']) {
    assert.equal(validAnswer('ฟลามิงโก'+size,'ฟ','bird'),true);
    assert.equal(validAnswer('ฟลามิงโก้'+size,'ฟ','bird'),true);
    assert.equal(validAnswer('นกฟลามิงโก้'+size,'ฟ','bird'),true);
    assert.equal(canonicalAnswer('นกฟลามิงโก้'+size,'bird'),'ฟลามิงโก'+size);
    assert.equal(validAnswer('ฟลามิงโก้'+size,'ฟ','animal'),true);
  }
  for (const category of ['bird','animal']) {
    const rarity=wordsForGroup('ฟ',category);
    for(const word of ['ฟลามิงโก','ฟลามิงโกใหญ่','ฟลามิงโกเล็ก']) {
      assert.equal(rarity.filter(item=>item===word).length,1,'duplicate rarity candidate '+category+'/'+word);
      assert.equal(rarity.includes(word+'้'),false,'incorrect extra tone-mark candidate');
    }
    assert.equal(WORD_BANK[category].length,new Set(WORD_BANK[category]).size,'duplicate literal word in '+category);
  }
});

test('additional familiar birds use existing category rules and reject fabricated answers',()=>{
  assert.ok(FAMILIAR_BIRD_TERMS.bird.length>=40);
  assert.ok(FAMILIAR_BIRD_TERMS.animal.length>=8);
  for(const [category,words] of Object.entries(FAMILIAR_BIRD_TERMS)){
    assert.equal(words.length,new Set(words).size,'duplicate additions '+category);
    for(const word of words){
      assert.ok(word.length>1&&word.length<=48);
      assert.equal(word,word.trim().normalize('NFC'));
      assert.equal(WORD_BANK[category].filter(w=>w===word).length,1,'not registered or duplicated '+word);
    }
  }
  for (const [word,letter] of [['เพนกวินจักรพรรดิ','พ'],['ค็อกคาเทล','ค'],
    ['เลิฟเบิร์ด','ล'],['ลอรี่','ล'],['ไก่งวง','ก'],['เป็ดแมนดาริน','ป'],
    ['นกกระสาปากพลั่ว','ก'],['หงส์ดำ','ห']] as const){
    assert.equal(validAnswer(word,letter,'bird'),true,word+' should be accepted');
  }
  assert.equal(validAnswer('นกไก่งวง','ก','bird'),true);
  assert.equal(validAnswer('นกฟลามิงโก้ดาวอังคาร','ฟ','bird'),false);
});

test('mixed flamingo spellings share round score and aggregated word statistics',()=>{
  const now=1_700_000_000_000;
  const game=newMatch('room-aabbccddeeff00112233',now);
  applyAction(game,'create','host',now,'Host');
  applyAction(game,'join','guest',now,'Guest');
  applyAction(game,'start','host',now+1000);
  game.letter='ฟ';
  game.categories=['bird','animal'];
  applyAction(game,'submit','host',now+2000,'',{bird:'ฟลามิงโก',animal:'ฟลามิงโก้'});
  applyAction(game,'submit','guest',now+2000,'',{bird:'นกฟลามิงโก้',animal:'ฟลามิงโก'});
  assert.deepEqual(scoreRound(game).map(entry=>entry.points),[2,2],
    'two matching answers in each category must receive duplicate (1-point) scores');
  const before=structuredClone(game);
  for(const p of game.players)p.lastSeen=game.deadline;
  advance(game,game.deadline+1);
  const deltas=roundWordDeltas(before,game);
  assert.equal(deltas.length,2,'one canonical word per real category');
  for(const delta of deltas){
    assert.equal(delta.word,'ฟลามิงโก');
    assert.equal(delta.letter,'ฟ');
    assert.equal(delta.timesUsed,2);
    assert.equal(delta.totalPoints,2);
  }
});
