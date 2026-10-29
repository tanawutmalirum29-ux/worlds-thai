import test from 'node:test';
import assert from 'node:assert/strict';
import { newMatch,applyAction,advance,chooseRound,scoreRound,snapshot,publicRoom,initialConsonant,wordInitialForCategory,canonicalAnswer,validAnswer,
  CATEGORIES,LETTERS,eligibleCategories,DEFAULT_SETTINGS,MAX_PLAYERS,validateSettings,type GameSettings } from '../amplify/functions/game/logic.ts';
import {resolveOperation} from '../amplify/functions/game/request.ts';
const start=1_700_000_000_000;
const room=()=>newMatch('room-aabbccddeeff00112233',start);
function setup(settings:GameSettings=DEFAULT_SETTINGS){
  const m=room();
  applyAction(m,'create','host',start,'Host',undefined,settings);
  applyAction(m,'join','guest',start,'Guest');
  return m;
}
test('creates owner-controlled room; no automatic matchmaking or start',()=>{
  const m=setup();
  advance(m,start+15000);
  assert.equal(m.phase,'lobby');
  assert.equal(m.ownerId,'host');
  assert.equal(m.players.length,2);
  assert.equal(m.settings.seconds,40);
  assert.equal(m.round,0);
  assert.throws(()=>applyAction(m,'create','stranger',start+200,'X'),/ROOM_UNAVAILABLE/);
  assert.throws(()=>applyAction(room(),'join','stranger',start,'X'),/ห้องนี้/);
});
test('only owner configures and starts; 2 players required',()=>{
  const m=room();
  applyAction(m,'create','host',start,'Host');
  assert.throws(()=>applyAction(m,'start','host',start+1000),/อย่างน้อย 2/);
  applyAction(m,'join','guest',start,'Guest');
  assert.throws(()=>applyAction(m,'settings','guest',start+1000,'',undefined,{rounds:9,categories:3,seconds:20}),/เจ้าของห้อง/);
  assert.throws(()=>applyAction(m,'start','guest',start+1000),/เจ้าของห้อง/);
  applyAction(m,'settings','host',start+1000,'',undefined,{rounds:2,categories:8,seconds:30});
  applyAction(m,'start','host',start+2000);
  assert.equal(m.phase,'playing');
  assert.equal(m.settings.categories,8);
  assert.equal(m.categories.length,8);
  assert.equal(m.deadline,start+32000);
  assert.throws(()=>applyAction(m,'settings','host',start+2001,'',undefined,{rounds:1}),/ก่อนเริ่ม/);
});
test('settings validation protects bounds and non-integer values',()=>{
  for(const input of [{rounds:0},{rounds:11},{categories:2},{categories:9},{seconds:19},{seconds:121},{rounds:'3'},{seconds:30.5}])
    assert.throws(()=>validateSettings(input),/ตั้งค่าไม่ถูกต้อง/);
  assert.deepEqual(validateSettings({rounds:10,categories:8,seconds:120}),{rounds:10,categories:8,seconds:120});
});
test('all allowed category counts pick distinct supported groups',()=>{
  for(let count=3;count<=8;count++){
    const m=setup({rounds:1,categories:count,seconds:40});
    for(const seed of [0,.17,.42,.75,.99]){
      const round=chooseRound(m,()=>seed);
      assert.equal(round.categories.length,count);
      assert.equal(new Set(round.categories).size,count);
      for(const category of round.categories)assert.ok(eligibleCategories(round.letter).includes(category));
    }
  }
  assert.equal(CATEGORIES.length,29);
  assert.ok(LETTERS.includes('ข' as never), 'ข ไข่ must remain playable');
  assert.ok(!LETTERS.includes('ฃ' as never), 'ฃ ขวด is excluded');
  assert.ok(eligibleCategories('ข').length>=8, 'ข ไข่ must support 8-category rooms');
  assert.equal(validAnswer('ข้าวผัด','ข','food'),true);
  assert.equal(validAnswer('ข้าวเหนียวแก้ว','ข','dessert'),true);
  assert.equal(validAnswer('ขลุ่ย','ข','music'),true);
  assert.equal(validAnswer('ขวด','ข','object'),true);
  assert.equal(validAnswer('ขวด','ฃ','object'),false);
});
test('finish configurable rounds, score once and require owner to reset',()=>{
  const m=setup({rounds:2,categories:3,seconds:20});
  applyAction(m,'start','host',start+1000);
  for(let n=1;n<=2;n++){
    const deadline=m.deadline;
    for(const p of m.players)p.lastSeen=deadline;
    advance(m,deadline+1);
    assert.equal(m.phase,'review');
    for(const p of m.players)p.lastSeen=m.deadline;
    advance(m,m.deadline+1);
  }
  assert.equal(m.phase,'final');
  assert.equal(m.history.length,2);
  advance(m,start+90000);
  assert.equal(m.phase,'final');
  assert.throws(()=>applyAction(m,'reset','guest',start+90001),/เจ้าของห้อง/);
  applyAction(m,'reset','host',start+90001);
  assert.equal(m.phase,'lobby');assert.equal(m.round,0);
});
test('late submissions blocked; invalid words do not score',()=>{
  const m=setup();
  applyAction(m,'start','host',start+1000);
  m.letter='ส';m.categories=['animal','sport','food'];
  applyAction(m,'submit','host',start+2000,'',{animal:'เสือ',sport:'สนุกเกอร์',food:'ส้มตำ'});
  applyAction(m,'submit','guest',start+2000,'',{animal:'ส้มตำ',sport:'สนุกเกอร์',food:'เสือ'});
  assert.deepEqual(scoreRound(m).map(entry=>entry.points),[5,1]);
  assert.equal(snapshot(m).settings.seconds,40);
  for(const p of m.players)p.lastSeen=m.deadline;
  assert.throws(()=>applyAction(m,'submit','host',m.deadline+1,'',{}),/หมดเวลา/);
  assert.equal(validAnswer('แอปเปิล','อ','fruit'),true);
  assert.equal(initialConsonant('เสือ'),'ส');
});
test('owner transfer after explicit exit and timeout',()=>{
  const m=setup();
  applyAction(m,'leave','host',start+1000);
  assert.equal(m.ownerId,'guest');
  applyAction(m,'settings','guest',start+2000,'',undefined,{rounds:4,categories:3,seconds:50});
  assert.equal(m.settings.rounds,4);
  const other=setup();
  other.players[0].lastSeen=start;
  other.players[1].lastSeen=start+30000;
  advance(other,start+44000);
  assert.equal(other.ownerId,'guest');
});
test('8-player capacity and rejoin',()=>{
  const m=room();
  applyAction(m,'create','host',start,'Host');
  for(let i=1;i<MAX_PLAYERS;i++)applyAction(m,'join','p'+i,start,'Guest'+i);
  assert.throws(()=>applyAction(m,'join','extra',start,'Extra'),/เต็ม/);
  applyAction(m,'join','host',start+100,'Host');
  assert.equal(m.players.length,8);
});
test('AppSync Lambda event resolver does not assume info.fieldName exists',()=>{
  assert.equal(resolveOperation({fieldName:'getGame',arguments:{roomId:'x'}}),'getGame');
  assert.equal(resolveOperation({info:{fieldName:'gameAction'},arguments:{action:'create'}}),'gameAction');
  assert.equal(resolveOperation({arguments:{action:'start'}}),'gameAction');
  assert.equal(resolveOperation({arguments:{roomId:'room-x'}}),'getGame');
  assert.throws(()=>resolveOperation({}),/UNKNOWN_OPERATION/);
});

test('public lobby lists joinable waiting rooms and does not expose player IDs',()=>{
  const m=setup();
  const result=publicRoom(m,start+1000);
  assert.equal(result?.hostName,'Host');
  assert.equal(result?.playerCount,2);
  assert.deepEqual(result?.settings,DEFAULT_SETTINGS);
  assert.ok(!('ownerId' in (result||{})));
  assert.ok(!('answers' in (result||{})));
  const other=structuredClone(m);
  other.phase='playing';
  assert.equal(publicRoom(other,start+1000),null);
  const full=structuredClone(m);
  for(let i=2;i<MAX_PLAYERS;i++)full.players.push({id:String(i),name:'X',score:0,lastSeen:start});
  assert.equal(publicRoom(full,start+1000),null);
  assert.equal(publicRoom(m,start+45000),null);
  assert.equal(publicRoom(newMatch('public-1',start),start),null);
});
test('listRooms operation resolves without requiring roomId',()=>{
  assert.equal(resolveOperation({fieldName:'listRooms',arguments:{}}),'listRooms');
  assert.equal(resolveOperation({arguments:{}}),'listRooms');
  assert.equal(resolveOperation({arguments:{action:'start'}}),'gameAction');
});

test('random draw can select ข ไข่ with eight supported categories',()=>{
  const m=setup({rounds:1,categories:8,seconds:40});
  const target=LETTERS.indexOf('ข' as never);
  assert.ok(target>=0);
  const round=chooseRound(m,()=> (target+0.01)/LETTERS.length);
  assert.equal(round.letter,'ข');
  assert.equal(round.categories.length,8);
  for(const id of round.categories)assert.ok(eligibleCategories('ข').includes(id));
  assert.ok(!round.categories.includes('not-a-category'));
});

test('fairness filter excludes low-vocabulary consonants and weak letter-category pairs', async ()=>{
  const {WORD_BANK,MIN_WORDS_PER_PAIR,MIN_CATEGORIES_PER_LETTER}=await import('../amplify/functions/game/dictionary.ts');
  assert.equal(MIN_WORDS_PER_PAIR,5);
  assert.equal(MIN_CATEGORIES_PER_LETTER,8);
  assert.ok(LETTERS.includes('ข' as never));
  assert.ok(LETTERS.includes('ด' as never));
  for(const rare of ['ฃ','ฅ','ฎ','ฏ','ฑ','ฒ','ฬ','ฮ','ง','ฉ','ซ','ถ','ฟ','ภ','ย','ล','ว','ห']){
    assert.ok(!LETTERS.includes(rare as never),rare+' should not be offered');
  }
  for(const letter of LETTERS){
    const cats=eligibleCategories(letter);
    assert.ok(cats.length>=8,letter+' needs at least 8 eligible categories');
    for(const category of cats){
      const words=new Set((WORD_BANK[category]||[]).filter(word=>wordInitialForCategory(word,category)===letter)
        .map(word=>canonicalAnswer(word,category)));
      assert.ok(words.size>=5,letter+':'+category+' only '+words.size+' distinct answers');
    }
  }
  for(const count of [3,5,8]){
    const m=setup({rounds:1,categories:count,seconds:40});
    for(let attempt=0;attempt<100;attempt++){
      const round=chooseRound(m,()=>attempt/100);
      assert.equal(round.categories.length,count);
      for(const category of round.categories)assert.ok(eligibleCategories(round.letter).includes(category));
    }
  }
});

test('automatic drafts replace prior text and score when timer expires without submit',()=>{
  const m=setup({rounds:1,categories:3,seconds:40});
  applyAction(m,'start','host',start+1000);
  m.letter='พ';m.categories=['verb','fruit','tool'];
  applyAction(m,'draft','host',start+2000,'',{verb:'พนมมือ',fruit:'พลับ',tool:''});
  assert.equal(m.submissions.host.verb,'พนมมือ');
  applyAction(m,'draft','host',start+2500,'',{verb:'พนมมือ',fruit:'พลับ',tool:''});
  assert.equal(m.submissions.host.fruit,'พลับ');
  applyAction(m,'draft','host',start+3000,'',{verb:'พนมมือ',fruit:'',tool:''});
  assert.equal(m.submissions.host.fruit,'');
  for(const p of m.players)p.lastSeen=m.deadline;
  advance(m,m.deadline+1);
  assert.equal(m.phase,'review');
  assert.equal(m.history[0].entries.find(x=>x.id==='host')?.points,2);
  assert.throws(()=>applyAction(m,'draft','host',m.deadline+10000,'',{verb:'พนมมือ'}),/หมดเวลา/);
});
test('new real-world word classes and corrected categorization',async()=>{
  assert.equal(validAnswer('พนมมือ','พ','verb'),true);
  assert.equal(validAnswer('ปรบมือ','ป','verb'),true);
  assert.equal(validAnswer('อุรุกวัย','อ','country'),true);
  assert.equal(validAnswer('พลับ','พ','fruit'),true);
  assert.equal(validAnswer('พลัม','พ','fruit'),true);
  assert.equal(validAnswer('พลับพลึง','พ','fruit'),false);
  assert.equal(validAnswer('พลับพลึง','พ','flower'),true);
  assert.equal(validAnswer('ออนแทรีโอ','อ','province'),true);
  assert.equal(validAnswer('แคลิฟอร์เนีย','ค','province'),true);
  assert.equal(validAnswer('โอเลี้ยง','อ','drink'),true);
  assert.equal(validAnswer('ไข่เจียว','ข','food'),true);
  assert.equal(validAnswer('ข้าวเหนียวแก้ว','ข','dessert'),true);
  assert.equal(validAnswer('ประแจปอนด์','ป','tool'),true);
  assert.equal(validAnswer('ปีนเขา','ป','sport'),true);
  assert.equal(validAnswer('ปาเลา','ป','country'),true);
  const {WORD_BANK}=await import('../amplify/functions/game/dictionary.ts');
  assert.ok(WORD_BANK.country.length>=193);
  assert.ok(WORD_BANK.province.length>=140);
  assert.ok(WORD_BANK.dessert.includes('ขนมไข่'));
  assert.ok(WORD_BANK.dessert.includes('ขนมครก'));
  assert.ok(!WORD_BANK.dessert.includes('ขนม'));
  assert.ok(!WORD_BANK.dessert.includes('ไข่'));
});

test('country list contains missing countries including ones whose initials are not selected',async()=>{
  const {WORD_BANK}=await import('../amplify/functions/game/dictionary.ts');
  for(const name of ['อุรุกวัย','สหรัฐอาหรับเอมิเรตส์','กาบูเวร์ดี','ไซปรัส','สโลวาเกีย'])
    assert.ok(WORD_BANK.country.includes(name),name);
  // ซ has few qualifying categories and isn't a round letter, but Cyprus
  // must still be present in the country dictionary for future expansion.
  assert.ok(!LETTERS.includes('ซ' as never));
  assert.equal(validAnswer('สโลวาเกีย','ส','country'),true);
});

test('dessert prefix ขนม is ignored; only the named sweet determines the letter',async()=>{
  const groups:Record<string,string[]>={
    'ข':['ขนมไข่','ขนมเข่ง','ขนมขี้หนู','ขนมข้าวโพด','ขนมไข่นกกระทา'],
    'ค':['ขนมครก'],
    'ช':['ขนมชั้น'],
    'ถ':['ขนมถ้วย'],
    'ต':['ขนมตาล'],
    'ห':['ขนมหม้อแกง'],
    'ป':['ขนมเปียกปูน']
  };
  for(const [letter,words] of Object.entries(groups)){
    for(const word of words){
      assert.equal(wordInitialForCategory(word,'dessert'),letter,word);
      assert.equal(validAnswer(word,letter,'dessert'),eligibleCategories(letter).includes('dessert'),word);
      if(letter!=='ข')assert.equal(validAnswer(word,'ข','dessert'),false,word);
    }
  }
  for(const word of ['ขนม','ไข่','ไข่เจียว','ขนมที่ไม่มีจริง']){
    assert.equal(validAnswer(word,'ข','dessert'),false,word);
  }
  assert.equal(wordInitialForCategory('ขนม','dessert'),'');
  assert.equal(wordInitialForCategory('ขนมจีนน้ำยา','food'),'ข');
  assert.equal(validAnswer('ขนมไข่','ข','food'),false);
  assert.equal(validAnswer('ไข่เจียว','ข','food'),true);
  assert.ok(eligibleCategories('ข').includes('dessert'),'24 real ข desserts allow this category');
  const eligibleKh=(await import('../amplify/functions/game/dictionary.ts')).WORD_BANK.dessert
    .filter(w=>wordInitialForCategory(w,'dessert')==='ข');
  assert.equal(eligibleKh.length,24);
});

test('desserts accept an OPTIONAL leading ขนม but never arbitrary made-up words',()=>{
  for(const [word,letter] of [
    ['ไข่หงส์','ข'],['ขนมไข่หงส์','ข'],
    ['ไข่เหี้ย','ข'],['ขนมไข่เหี้ย','ข'],
    ['ข้าวตู','ข'],['ขนมข้าวตู','ข'],
    ['ข้าวเหนียวแก้ว','ข'],['ขนมข้าวเหนียวแก้ว','ข'],
    ['เค้ก','ค'],['ขนมเค้ก','ค'],
    ['ขนมครก','ค']
  ]){
    assert.equal(wordInitialForCategory(word,'dessert'),letter,word);
    assert.equal(validAnswer(word,letter,'dessert'),true,word);
  }
  assert.equal(canonicalAnswer('ขนมไข่หงส์','dessert'),'ไข่หงส์');
  assert.equal(canonicalAnswer('ไข่เหี้ย','dessert'),'ไข่หงส์');
  assert.equal(canonicalAnswer('ขนมไข่เหี้ย','dessert'),'ไข่หงส์');
  assert.equal(canonicalAnswer('ขนมข้าวตู','dessert'),'ข้าวตู');
  assert.equal(canonicalAnswer('ขนมครก','dessert'),'ขนมครก');
  for(const word of ['ขนม','ขนมขนมครก','ขนมคำที่ไม่มี','ครก','ไข่']){
    assert.equal(validAnswer(word,'ข','dessert'),false,word);
    assert.equal(validAnswer(word,'ค','dessert'),false,word);
  }
  assert.equal(validAnswer('ขนมข้าวตู','ข','food'),false);
  assert.equal(validAnswer('ขนมจีนน้ำยา','ข','food'),true);
});
test('same dessert with or without ขนม and historical alias counts as duplicate',()=>{
  const m=setup();
  m.phase='playing';m.letter='ข';m.categories=['dessert'];
  m.submissions={
    host:{dessert:'ไข่หงส์'},
    guest:{dessert:'ขนมไข่เหี้ย'}
  };
  const points=scoreRound(m).map(entry=>entry.perCategory.dessert);
  assert.deepEqual(points,[1,1]);
  m.submissions.guest.dessert='ขนมไข่หงส์';
  assert.deepEqual(scoreRound(m).map(x=>x.perCategory.dessert),[1,1]);
});

test('synonymous Thai sweet สอดไส้ / ใส่ไส้ is one type for scoring and fairness',()=>{
  for(const answer of ['ขนมสอดไส้','ขนมใส่ไส้','สอดไส้','ใส่ไส้']){
    assert.equal(wordInitialForCategory(answer,'dessert'),'ส',answer);
    assert.equal(canonicalAnswer(answer,'dessert'),'ขนมสอดไส้',answer);
    assert.equal(validAnswer(answer,'ส','dessert'),true,answer);
  }
  const m=setup();m.phase='playing';m.letter='ส';m.categories=['dessert'];
  m.submissions={host:{dessert:'ขนมสอดไส้'},guest:{dessert:'ใส่ไส้'}};
  assert.deepEqual(scoreRound(m).map(x=>x.perCategory.dessert),[1,1]);
  assert.equal(canonicalAnswer('ขนมจรวดสายรุ้ง','dessert'),'ขนมจรวดสายรุ้ง');
  assert.equal(validAnswer('ขนมจรวดสายรุ้ง','จ','dessert'),false);
});
