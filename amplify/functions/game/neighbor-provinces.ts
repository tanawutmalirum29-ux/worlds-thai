/** Curated recognizable province-level regions in countries close to Thailand.
 * This is deliberately NOT a complete geography registry. Use well-known Thai
 * names from regional travel, border crossings, school geography and news.
 *
 * Laos/Cambodia/Myanmar/Malaysia/Vietnam: first-level provinces, states,
 * regions or capitals with equivalent administrative status. Cities that are
 * NOT province-level units must not be inserted.
 * Vietnam names follow its July 2025 administrative consolidation.
 *
 * References:
 * https://www.malaysia.travel/about-malaysia
 * https://vietnam.travel
 * https://phnompenh.thaiembassy.org/
 */
export const NEIGHBOR_PROVINCES = {
  laos: [
    "หลวงพระบาง",
    "เวียงจันทน์",
    "นครหลวงเวียงจันทน์",
    "สะหวันนะเขต",
    "จำปาสัก",
    "บ่อแก้ว",
    "เชียงขวาง",
    "หลวงน้ำทา",
  ],
  cambodia: [
    "พนมเปญ",
    "เสียมราฐ",
    "พระตะบอง",
    "พระสีหนุ",
    "เกาะกง",
    "กัมปอต",
    "ไพลิน",
    "กำปงจาม",
  ],
  myanmar: [
    "ย่างกุ้ง",
    "มัณฑะเลย์",
    "เนปยีดอ",
    "กะเหรี่ยง",
    "ฉาน",
    "มอญ",
    "ตะนาวศรี",
    "กะฉิ่น",
  ],
  malaysia: [
    "กัวลาลัมเปอร์",
    "ปีนัง",
    "ยะโฮร์",
    "กลันตัน",
    "มะละกา",
    "สลังงอร์",
    "ซาบะฮ์",
    "ซาราวัก",
  ],
  vietnam: [
    "ฮานอย",
    "โฮจิมินห์",
    "ดานัง",
    "ไฮฟอง",
    "เว้",
    "หล่าวกาย",
  ],
} as const;

export const NEIGHBORING_PROVINCES: readonly string[] = Object.values(NEIGHBOR_PROVINCES).flat();

/** Accepted Thai spelling variants are not extra geographic answers. */
export const NEIGHBOR_PROVINCE_ALIASES: Readonly<Record<string, string>> = {
  "เสียมเรียบ": "เสียมราฐ",
  "บัตตัมบอง": "พระตะบอง",
  "กัมปงจาม": "กำปงจาม",
  "สะหวันนะเขด": "สะหวันนะเขต",
  "ลาวไก": "หล่าวกาย",
};
