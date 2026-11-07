/**
 * Standalone, reviewed words used exclusively by the คำท้าย word-chain mode.
 * These are dictionary entries that are not naturally tied to a classic
 * category. Do NOT register them in WORD_BANK: normal category modes must
 * retain their current curated semantics and rarity statistics.
 *
 * Only explicit entries are accepted; typed guesses are never auto-learned.
 */
export const TAIL_EXTRA_WORDS: readonly string[] = [
  'การกระทำ',
  'จินตนาการ',
  'ความพยายาม',
  'ปฏิสัมพันธ์',
  'กระบวนการ',
  'สถานการณ์',
  'การเรียนรู้',
  'ข้อเท็จจริง',
  'แนวความคิด',
  'วิจารณญาณ',
  'ความทรงจำ',
  'ประสบการณ์',
  'แรงบันดาลใจ',
  'การตัดสินใจ',
  'การเปลี่ยนแปลง',
  'อุปสรรค',
  'ความรับผิดชอบ',
  'ข้อตกลง',
  'ความร่วมมือ',
  'ปรากฏการณ์',
  'ข้อสังเกต',
  'บทสนทนา',
  'การสืบค้น',
  'สิทธิมนุษยชน',
  'คำอธิบาย',
  'ข้อเสนอแนะ',
  'การตรวจสอบ',
  'หลักเหตุผล',
  'แนวปฏิบัติ',
  'ความเป็นไปได้',
  'การออกแบบ',
  'ทางเลือก',
  'การอภิปราย',
  'คำปรึกษา',
  'การนำเสนอ',
  'ข้อสรุป',
  'กระแสสังคม',
  'การพัฒนา',
  'กระบวนทัศน์',
] as const;


/**
 * Explicit syllable-onset corrections for Thai forms whose last syllable
 * cannot be identified from written vowel signs alone (or has a silent
 * consonant). Keep these alongside the tail-only dictionary so future
 * reviewers can update both vocabulary and ending rules without touching
 * classic category game logic.
 */
export const TAIL_END_OVERRIDES:Readonly<Record<string,string>>={
  'การกระทำ':'ท',
  'ส้มตำ':'ต',
  'ขนมครก':'ค',
  'ดอกไม้':'ม',
  'รถไฟ':'ฟ',
  'ความรัก':'ร',
  'แกะสลักสบู่':'บ',
  'ดอก':'ด',
  'หอย':'ห',
  'กล้วย':'ก',
  'มะม่วง':'ม',
  'หมี':'ห',
  'หนู':'ห',
  'บ้าน':'บ',
  'น้อย':'น',
  'ภาษา':'ส',
  'กว้าง':'ก',
  'หวาน':'ห',
  'สอน':'ส',
  'บอล':'บ',
  'หอม':'ห'
} as const;
