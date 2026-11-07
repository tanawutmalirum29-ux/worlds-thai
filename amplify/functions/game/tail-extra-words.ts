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
