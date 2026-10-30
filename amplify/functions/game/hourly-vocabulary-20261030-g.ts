/** Curated Thai vocabulary, hourly round G (30 October 2026).
 * Four real terms each for fish, birds, occupations and fruit.
 * Fish and bird names omit optional ปลา/นก prefixes so canonical identities
 * and first consonants follow the game's existing category rules.
 * Vocabulary only; do not alter scoring, rarity or eligibility.
 */
export const HOURLY_VOCABULARY_20261030_G: Readonly<Record<string, readonly string[]>> = {
  fish: [
    'ฉนาก',
    'กะมง',
    'ตูหนา',
    'อีคุด',
  ],
  bird: [
    'ตะขาบทุ่ง',
    'แซงแซวหางปลา',
    'กระจาบทอง',
    'อัญชันคิ้วขาว',
  ],
  job: [
    'ผู้กำกับภาพ',
    'เจ้าหน้าที่ควบคุมจราจรทางอากาศ',
    'นักธรณีวิทยา',
    'ช่างทำกุญแจ',
  ],
  fruit: [
    'มะปรางหวาน',
    'แอปเปิลเขียว',
    'สตรอว์เบอร์รีป่า',
    'เชอร์รีบราซิล',
  ],
};
