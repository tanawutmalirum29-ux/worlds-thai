/** A small Thai-audience-facing shortlist of recognizable non-neighboring
 * first-level administrative regions. NOT an exhaustive world directory.
 * All selected names were already included in the reviewed game vocabulary.
 * Retention criteria: familiar through Thai media, travel or school geography.
 * No ordinary city is listed solely for its popularity: Tokyo/Osaka/Kyoto
 * are Japanese prefectures, and Berlin is a German city-state.
 */
export const FAMILIAR_WORLD_REGIONS = {
  unitedStates: [
    "แคลิฟอร์เนีย",
    "โคโลราโด",
    "เคนทักกี",
    "เท็กซัส",
    "ฟลอริดา",
    "นิวยอร์ก",
    "อลาสกา",
    "แอริโซนา",
    "เนวาดา",
    "ฮาวาย",
    "วอชิงตัน",
    "แมสซาชูเซตส์",
  ],
  canada: [
    "ออนแทรีโอ",
    "ควิเบก",
    "บริติชโคลัมเบีย",
  ],
  japan: [
    "โตเกียว",
    "โอซากะ",
    "เกียวโต",
    "ฮอกไกโด",
    "โอกินาวะ",
    "ฮิโรชิมะ",
    "ฟุกุโอกะ",
    "นาระ",
  ],
  australia: [
    "ควีนส์แลนด์",
    "นิวเซาท์เวลส์",
    "วิกตอเรีย",
  ],
  germany: [
    "บาวาเรีย",
    "เบอร์ลิน",
  ],
} as const;

export const FAMILIAR_WORLD_PROVINCES: readonly string[] = Object.values(FAMILIAR_WORLD_REGIONS).flat();
