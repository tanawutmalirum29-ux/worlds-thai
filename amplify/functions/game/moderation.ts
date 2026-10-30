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
  'ควย','จิ๋ม','เจี๊ยว','กระดอ','กระเจี๊ยว','แตด','เย็ด',
  'ส้นตีน','ไอ้เหี้ย','ไอเหี้ย','ไข่เหี้ย','ไอ้สัส','ไอสัส',
  'ชิบหาย','ฉิบหาย'
] as const;

/** Normalize Unicode, hidden separators, and punctuation consistently for checks. */
function compactThai(value:unknown):string {
  if(typeof value!=='string')return '';
  return value.normalize('NFKC').toLocaleLowerCase('th')
    .replace(/[\s\p{P}\p{S}\u200B-\u200D\uFEFF]/gu,'')
    // NFKC decomposes Thai Sara Am; fold it back for exact matches.
    .replace(/\u0E4D\u0E32/g,'\u0E33');
}
export function isInappropriateLanguage(value:unknown):boolean {
  const compact=compactThai(value);
  if(!compact)return false;
  return DISALLOWED_EXACT.has(compact) ||
    DISALLOWED_PHRASES.some(phrase=>compact.includes(phrase));
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
