/**
 * Family-friendly terms for the word game. Check only clear profanity and
 * colloquial sexual anatomy; do not ban ordinary Thai substrings (หีบ, กะหรี่).
 * This is a gameplay vocabulary policy, not a generic text classifier.
 */
export const DISALLOWED_EXACT = new Set([
  'ควย','หี','หำ','จู๋','จิ๋ม','เจี๊ยว','จ้อน','แตด','กระดอ','กระเจี๊ยว',
  'ตีน','ตูด','ดาก','สัส','สัด','เหี้ย','เชี่ย','เชี้ย','ห่า',
  'เย็ด','เงี่ยน','ชิบหาย','ฉิบหาย','ดอกทอง'
]);
export const DISALLOWED_PHRASES = [
  'ควย','จิ๋ม','เจี๊ยว','กระดอ','กระเจี๊ยว','แตด','เย็ด','สัส','เหี้ย','เงี่ยน','หำ',
  'ส้นตีน','ไอ้เหี้ย','ไอเหี้ย','ไข่เหี้ย','ไอ้สัส','ไอสัส',
  'ชิบหาย','ฉิบหาย'
] as const;

/**
 * These are curated *pronunciation* exceptions, not a general spell-corrector.
 * Preserve the established exact-vs-contains distinction: common words such as
 * หีบ, สัดส่วน, ตีนเป็ด and legitimate English names must not be swept up.
 */
export const DISALLOWED_THAI_EXACT_VARIANTS=[
  'สาส','ส๊าส','เหีย','เชีย','หี๊','หี้','เงียน'
] as const;
export const DISALLOWED_THAI_PHRASE_VARIANTS=[
  'คุวย','คูวย','เยด','เย้ด','เย๊ด','เหี๊ย','เฮี้ย',
  'เชี๊ย','เชี๋ย','ชิ้บหาย','ฉิ้บหาย','ไอ้สาส','ไอสาส','อีสาส'
] as const;

/**
 * English swear words and Romanized Thai profanity. Common English syllables
 * (e.g. hee, sat, yet, tin or an English person's name Jim) require a whole
 * token rather than substring detection to avoid false positives.
 */
export const DISALLOWED_ROMAN_RULES=[
  {word:'fuck / fck',examples:'fuck, fuuuck, f.u.c.k, fck, f*ck, fück',scope:'contains'},
  {word:'bitch / cunt / pussy',examples:'bitch, biitch, cunt, pussy',scope:'contains'},
  {word:'ควย (Roman)',examples:'kuy, kuay, kuai, k.u.y, KUUUAY',scope:'contains'},
  {word:'คำหยาบแบบคำอ่านไทย',examples:'yed, yeet, hia, hee, sus, sud, ham, tud',scope:'exact'},
  {word:'คำหยาบภาษาอังกฤษที่อาจเป็นคำทั่วไป',examples:'shit, shiiit, fuk, ass, dick',scope:'exact'}
] as const;

const THAI_EXACT_VARIANTS=new Set<string>(DISALLOWED_THAI_EXACT_VARIANTS);
const REPEATED_SYMBOL=/([\p{L}\p{M}])\1+/gu;
/** Only checks get this lossy representation; never change stored game answers. */
function compactThai(value:unknown):string {
  if(typeof value!=='string')return '';
  return value.normalize('NFKC').toLocaleLowerCase('th')
    .replace(/[\s\p{P}\p{S}\u200B-\u200D\uFEFF\u2060-\u206F]/gu,'')
    // NFKC decomposes Thai Sara Am; fold it back for exact matches.
    .replace(/\u0E4D\u0E32/g,'\u0E33')
    // Phonetic spelling with gratuitous silent marks / stretched Thai letters.
    .replace(/\u0E4C/gu,'')
    .replace(REPEATED_SYMBOL,'$1');
}

/**
 * Latin/Thai Roman spelling checks only. Handle Latin diacritics, select
 * confusables, text separators and common 1337 substitutions. Keep the
 * original Thai check independent so English transformations cannot modify
 * ordinary Thai category words or vocabulary scoring.
 */
function romanizedCandidates(value:unknown):string[] {
  if(typeof value!=='string')return [];
  const latin=value.normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036F]/g,'')
    .replace(/[аΑΑɑ]/gu,'a')
    .replace(/[сϲ]/gu,'c')
    .replace(/[еε]/gu,'e')
    .replace(/[іΙı]/gu,'i')
    .replace(/[οо]/gu,'o')
    .replace(/[υս]/gu,'u')
    .replace(/[р]/gu,'p')
    .replace(/[х]/gu,'x');
  const plain=latin.replace(/[\s\p{P}\p{S}\u200B-\u200D\uFEFF\u2060-\u206F]/gu,'');
  const leet=latin.replace(/[@4]/g,'a').replace(/[!1]/g,'i')
    .replace(/3/g,'e').replace(/0/g,'o').replace(/5/g,'s').replace(/7/g,'t').replace(/\$/g,'s')
    .replace(/[\s\p{P}\p{S}\u200B-\u200D\uFEFF\u2060-\u206F]/gu,'');
  return [...new Set([plain,leet].map(t=>t.replace(REPEATED_SYMBOL,'$1')))];
}
const ROMAN_STRONG=/(?:fuck|fck|bitch|cunt|pusy|kuy|kuay|kuai|คuวย|kuวย|kวย|(?:ไอ้?|อี)(?:hia|sus|yed|kuy))/u;
const ROMAN_WHOLE=/^(?:shit|shits|shitty|shitting|fuk|ass|dick|cock|yed|yet|yeet|hia|hee|sus|sud|sat|ham|hum|tud|tood|teen|tin|joo|jew)$/u;
export function isInappropriateLanguage(value:unknown):boolean {
  const compact=compactThai(value);
  if(!compact)return false;
  if(DISALLOWED_EXACT.has(compact)||THAI_EXACT_VARIANTS.has(compact)||
    DISALLOWED_PHRASES.some(phrase=>compact.includes(phrase))||
    DISALLOWED_THAI_PHRASE_VARIANTS.some(phrase=>compact.includes(phrase)))return true;
  return romanizedCandidates(value).some(roman=>
    ROMAN_STRONG.test(roman)||ROMAN_WHOLE.test(roman));
}

/**
 * Roman spellings used to evade the nickname ban on วี. Keep the examples
 * alongside their actual matchers so the admin can display the same rules.
 * Normalization first strips spaces, punctuation, zero-width chars and
 * folds full-width Latin characters to their ASCII equivalents.
 */
export const BLOCKED_VEE_ROMAN_RULES=[
  {
    word:'v',
    nicknamePattern:/v/u,
    answerPattern:/^v+(?:e+|ี+)?$/u,
    examples:'V, v, vvvvv, ve, vee, veeeee, vี'
  },
  {
    word:'we',
    nicknamePattern:/w+e+/u,
    answerPattern:/^w+e+$/u,
    examples:'we, wee, weeeee, wwweee'
  }
] as const;

/** Game answers: block bare วี and its standalone Roman replacements only. */
export const BLOCKED_STANDALONE_ANSWER='วี';
export function isBlockedStandaloneAnswer(value:unknown):boolean {
  const compact=compactThai(value);
  return compact===BLOCKED_STANDALONE_ANSWER ||
    BLOCKED_VEE_ROMAN_RULES.some(rule=>rule.answerPattern.test(compact));
}

/** Nicknames: block วี anywhere, Roman V anywhere, and stretched we/wee. */
export const BLOCKED_NICKNAME_FRAGMENT='วี';
export function nicknameValidationMessage(value:unknown):string {
  const compact=compactThai(value);
  if(compact.includes(BLOCKED_NICKNAME_FRAGMENT) ||
    BLOCKED_VEE_ROMAN_RULES.some(rule=>rule.nicknamePattern.test(compact)))
    return 'ใช้ชื่อนี้ไม่ได้';
  if(isInappropriateLanguage(value))return 'กรุณาใช้ชื่อเล่นที่สุภาพ';
  return '';
}
