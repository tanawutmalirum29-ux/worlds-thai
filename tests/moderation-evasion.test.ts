import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isInappropriateLanguage,nicknameValidationMessage,isBlockedStandaloneAnswer,
  DISALLOWED_EXACT,DISALLOWED_PHRASES,DISALLOWED_ROMAN_RULES,
  DISALLOWED_THAI_EXACT_VARIANTS,DISALLOWED_THAI_PHRASE_VARIANTS
} from '../amplify/functions/game/moderation.ts';
import {validAnswer,cleanAnswers} from '../amplify/functions/game/logic.ts';

test('old banned terms still match even when consonants, vowels or tone marks are stretched',()=>{
  for(const word of [...DISALLOWED_EXACT,...DISALLOWED_PHRASES]){
    assert.equal(isInappropriateLanguage(word),true,'baseline '+word);
  }
  for(const word of [
    'คคควยยย','ค ว ย','ค---ว---ย','ค\u200Bวย','หีีี','ห ี','หำำำ',
    'สสสัสสส','ส ั ั ั ส','สัดดด','ไอ้ เ หี้ ยยย','เย็ดดด',
    'ชิบหายยย','ไอเหี้ยยย','ดอกทองงง'
  ])assert.equal(isInappropriateLanguage(word),true,'obfuscated '+word);
});

test('curated Thai phonetic variants reject swear spellings without banning ordinary words',()=>{
  for(const word of [...DISALLOWED_THAI_EXACT_VARIANTS,...DISALLOWED_THAI_PHRASE_VARIANTS,
    'คุวยยย','คูววย','เยดดด','เฮี้ยมม','ไอ้สาส','เงียน'
  ])assert.equal(isInappropriateLanguage(word),true,'pronunciation '+word);
  for(const word of [
    'หีบ','หีบเพลง','กะหรี่','แกงกะหรี่','สัดส่วน','ตีนเป็ด',
    'ห่าง','สด','ขนมชั้น','เห็ด','สาด','คุย','ควาย','เฮีย','เฮียใหญ่'
  ])assert.equal(isInappropriateLanguage(word),false,'ordinary '+word);
});

test('Romanized Thai insults, English swears, disguised punctuation and ASCII leetspeak',()=>{
  for(const word of [
    'kuy','KUUUUAY','kuai','K.U.Y','k_u_a_y','kuaykung','kวย','คuวย',
    'yed','yeet','hia','hiiiia','hee','sus','suss','tud','ham',
    'fuck','fuuuuuck','f.u.c.k','F*CK','FÜCK','shiiit','Sh1t',
    'bitch','Biiiitch','cunt','pussy','p_u_s_s_y','ass','dick',
    'ไอ hia','อีsus'
  ])assert.equal(isInappropriateLanguage(word),true,'Roman/English '+word);
  assert.ok(DISALLOWED_ROMAN_RULES.length>=4);
});

test('no broad substring or spelling-distance bans on ordinary Thai/English words',()=>{
  for(const word of [
    'หีบ','ต้นตีนเป็ด','สัตว์','สัดส่วน','น้องห่าง','กะหรี่',
    'class','passion','assistant','shitake','shiitake','fukuoka',
    'sheep','shipping','yet another','employed','Jim','sweet','review','sassy','Fukuyama'
  ])assert.equal(isInappropriateLanguage(word),false,'false positive '+word);
});

test('same checks cover nickname validation and server answer cleanup',()=>{
  for(const word of ['คคควยย','นายKUUUAY','น้องเยดด','Sh1t','f.c.k','ไอ hia']){
    assert.equal(nicknameValidationMessage(word),'กรุณาใช้ชื่อเล่นที่สุภาพ',word);
    assert.deepEqual(cleanAnswers({animal:word},['animal']),{animal:''},word);
  }
  assert.equal(nicknameValidationMessage('แกงกะหรี่'),'');
  assert.equal(nicknameValidationMessage('หีบเพลง'),'');
  assert.equal(validAnswer('ค ควยย','ค','object'),false);
  assert.equal(isBlockedStandaloneAnswer('VEEEEE'),true);
});
