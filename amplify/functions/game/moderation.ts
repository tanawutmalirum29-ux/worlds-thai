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
 * (e.g. hee or an English person's name Jim) require a whole
 * token rather than substring detection to avoid false positives.
 */
export const DISALLOWED_ROMAN_RULES=[
  {word:'fuck',scope:'contains',pattern:/fuck/u,examples:'fuck, fuuuck, f.u.c.k, fück'},
  {word:'fck',scope:'contains',pattern:/fck/u,examples:'fck, f*ck'},
  {word:'bitch',scope:'contains',pattern:/bitch/u,examples:'bitch, biiitch'},
  {word:'cunt',scope:'contains',pattern:/cunt/u,examples:'cunt'},
  {word:'pussy',scope:'contains',pattern:/pusy|pussy/u,examples:'pussy, p_u_s_s_y'},
  {word:'kuy',scope:'contains',pattern:/(?:^|[^a-z])kuy/u,examples:'kuy, K.U.Y, kuyKung'},
  {word:'kuay',scope:'contains',pattern:/(?:^|[^a-z])kuay/u,examples:'kuay, KUUUAY, k_u_a_y'},
  {word:'kuai',scope:'contains',pattern:/(?:^|[^a-z])kuai/u,examples:'kuai'},
  {word:'คuวย',scope:'contains',pattern:/คuวย/u,examples:'คuวย'},
  {word:'kuวย',scope:'contains',pattern:/kuวย/u,examples:'kuวย'},
  {word:'kวย',scope:'contains',pattern:/kวย/u,examples:'kวย'},
  {word:'ไอhia',scope:'contains',pattern:/(?:ไอ้?|อี)(?:hia|sus|yed|kuy)/u,examples:'ไอ hia, อีsus'},
  {word:'shit',scope:'exact',pattern:/^shit(?:s|y|ing)?$/u,examples:'shit, shiiit, sh1t'},
  {word:'fuk',scope:'exact',pattern:/^fuk$/u,examples:'fuk'},
  {word:'ass',scope:'exact',pattern:/^ass$/u,examples:'ass'},
  {word:'dick',scope:'exact',pattern:/^dick$/u,examples:'dick'},
  {word:'cock',scope:'exact',pattern:/^cock$/u,examples:'cock'},
  {word:'yed',scope:'exact',pattern:/^yed$/u,examples:'yed'},
  {word:'yeet',scope:'exact',pattern:/^ye{2,}t$/u,examples:'yeet, yeeet'},
  {word:'hia',scope:'exact',pattern:/^hia$/u,examples:'hia, hiiiia'},
  {word:'hee',scope:'exact',pattern:/^he{2,}$/u,examples:'hee, heeee'},
  {word:'sus',scope:'exact',pattern:/^sus$/u,examples:'sus, suss'},
  {word:'sud',scope:'exact',pattern:/^sud$/u,examples:'sud'},
  {word:'tud',scope:'exact',pattern:/^tud$/u,examples:'tud'},
  {word:'tood',scope:'exact',pattern:/^tod$/u,examples:'tood'},
] as const;

/**
 * Catch inserted Thai combining vowels and tone marks inside banned words,
 * without stripping meaningful vowels from legitimate words like ควาย.
 * Exact-only bans stay anchored; phrases may occur inside longer nicknames.
 */
const EXTRA_THAI_MARKS=String.raw`[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]{0,4}`;
function withInsertedThaiMarks(word:string,contains:boolean):RegExp {
  // In addition to stray marks, allow bounded repetitions of a consonant
  // separated by vowel/tone marks: คุวุวีย์ has two ว letters with a vowel
  // between them, so a simple /(.)\\1+/ collapse never sees the repeat.
  // Preserve the actual vowel characters in every banned spelling, however:
  // stripping them globally would accidentally reject ควาย and หีบ.
  const pattern=[...word].map(letter=>
    /[ก-ฮ]/u.test(letter)
      ?letter+'(?:'+EXTRA_THAI_MARKS+letter+'){0,3}'
      :letter
  ).join(EXTRA_THAI_MARKS);
  return new RegExp(contains?pattern:'^(?:'+pattern+')
const STRETCHED_PHRASES=[
  ...DISALLOWED_PHRASES,...DISALLOWED_THAI_PHRASE_VARIANTS
].map(word=>withInsertedThaiMarks(word,true));
const STRETCHED_EXACT=[
  ...DISALLOWED_EXACT,...DISALLOWED_THAI_EXACT_VARIANTS
].map(word=>withInsertedThaiMarks(word,false));

const THAI_EXACT_VARIANTS=new Set<string>(DISALLOWED_THAI_EXACT_VARIANTS);
const REPEATED_SYMBOL=/([\p{L}\p{M}])\1+/gu;
/** Only checks get this lossy representation; never change stored game answers. */
function compactThai(value:unknown):string {
  if(typeof value!=='string')return '';
  return value.normalize('NFKC').toLocaleLowerCase('th')
    .replace(/[\s\p{P}\p{S}\u200B-\u200D\uFEFF\u2060-\u206F]/gu,'')
    // NFKC decomposes Thai Sara Am; fold it back for exact matches.
    .replace(/\u0E4D\u0E32/g,'\u0E33');
}

/** Profanity-only folding; keep historic standalone วี spelling exact. */
function compactModeration(value:unknown):string {
  return compactThai(value).replace(/\u0E4C/gu,'').replace(REPEATED_SYMBOL,'$1');
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
  return [...new Set([plain,leet,plain.replace(REPEATED_SYMBOL,'$1'),leet.replace(REPEATED_SYMBOL,'$1')])];
}
export function isInappropriateLanguage(value:unknown):boolean {
  const compact=compactModeration(value);
  if(!compact)return false;
  if(DISALLOWED_EXACT.has(compact)||THAI_EXACT_VARIANTS.has(compact)||
    DISALLOWED_PHRASES.some(phrase=>compact.includes(phrase))||
    DISALLOWED_THAI_PHRASE_VARIANTS.some(phrase=>compact.includes(phrase))||
    STRETCHED_PHRASES.some(pattern=>pattern.test(compact))||
    STRETCHED_EXACT.some(pattern=>pattern.test(compact)))return true;
  return romanizedCandidates(value).some(roman=>
    DISALLOWED_ROMAN_RULES.some(rule=>rule.pattern.test(roman)));
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
,'u');
}
const STRETCHED_PHRASES=[
  ...DISALLOWED_PHRASES,...DISALLOWED_THAI_PHRASE_VARIANTS
].map(word=>withInsertedThaiMarks(word,true));
const STRETCHED_EXACT=[
  ...DISALLOWED_EXACT,...DISALLOWED_THAI_EXACT_VARIANTS
].map(word=>withInsertedThaiMarks(word,false));

const THAI_EXACT_VARIANTS=new Set<string>(DISALLOWED_THAI_EXACT_VARIANTS);
const REPEATED_SYMBOL=/([\p{L}\p{M}])\1+/gu;
/** Only checks get this lossy representation; never change stored game answers. */
function compactThai(value:unknown):string {
  if(typeof value!=='string')return '';
  return value.normalize('NFKC').toLocaleLowerCase('th')
    .replace(/[\s\p{P}\p{S}\u200B-\u200D\uFEFF\u2060-\u206F]/gu,'')
    // NFKC decomposes Thai Sara Am; fold it back for exact matches.
    .replace(/\u0E4D\u0E32/g,'\u0E33');
}

/** Profanity-only folding; keep historic standalone วี spelling exact. */
function compactModeration(value:unknown):string {
  return compactThai(value).replace(/\u0E4C/gu,'').replace(REPEATED_SYMBOL,'$1');
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
  return [...new Set([plain,leet,plain.replace(REPEATED_SYMBOL,'$1'),leet.replace(REPEATED_SYMBOL,'$1')])];
}
export function isInappropriateLanguage(value:unknown):boolean {
  const compact=compactModeration(value);
  if(!compact)return false;
  if(DISALLOWED_EXACT.has(compact)||THAI_EXACT_VARIANTS.has(compact)||
    DISALLOWED_PHRASES.some(phrase=>compact.includes(phrase))||
    DISALLOWED_THAI_PHRASE_VARIANTS.some(phrase=>compact.includes(phrase))||
    STRETCHED_PHRASES.some(pattern=>pattern.test(compact))||
    STRETCHED_EXACT.some(pattern=>pattern.test(compact)))return true;
  return romanizedCandidates(value).some(roman=>
    DISALLOWED_ROMAN_RULES.some(rule=>rule.pattern.test(roman)));
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
