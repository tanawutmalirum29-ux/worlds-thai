/**
 * Family-friendly terms for the word game. Check only clear profanity and
 * colloquial sexual anatomy; do not ban ordinary Thai substrings (หีบ, กะหรี่).
 * This is a gameplay vocabulary policy, not a generic text classifier.
 */
const DISALLOWED_EXACT = new Set([
  'ควย','หี','หำ','จู๋','จิ๋ม','เจี๊ยว','จ้อน','แตด','กระดอ','กระเจี๊ยว',
  'ตีน','ตูด','ดาก','สัส','สัด','เหี้ย','เชี่ย','เชี้ย','ห่า',
  'เย็ด','เงี่ยน','ชิบหาย','ฉิบหาย','ดอกทอง'
]);
const DISALLOWED_PHRASES = [
  'ควย','จิ๋ม','เจี๊ยว','กระดอ','กระเจี๊ยว','แตด','เย็ด',
  'ส้นตีน','ไอ้เหี้ย','ไอเหี้ย','ไข่เหี้ย','ไอ้สัส','ไอสัส',
  'ชิบหาย','ฉิบหาย'
] as const;

export function isInappropriateLanguage(value:unknown):boolean {
  if(typeof value!=='string')return false;
  // Disguised spacing/punctuation cannot evade exact and phrase checks.
  const compact=value.normalize('NFKC').toLocaleLowerCase('th')
    .replace(/[\s\p{P}\p{S}\u200B-\u200D\uFEFF]/gu,'')
    // NFKC decomposes Thai Sara Am; fold it back for exact matches.
    .replace(/\u0E4D\u0E32/g,'\u0E33');
  if(!compact)return false;
  return DISALLOWED_EXACT.has(compact) ||
    DISALLOWED_PHRASES.some(phrase=>compact.includes(phrase));
}
