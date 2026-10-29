/**
 * Hand-reviewed Thai synonyms. No AI inference and no runtime synonym expansion.
 * "words" lists DISTINCT valid answers, NOT spelling aliases. Two players who
 * submit different words for one meaning each earn full independent credit.
 * This is different from province spelling variants and dessert name aliases.
 *
 * Sources: Royal Institute Dictionary B.E. 2554 entries reproduced on Longdo,
 * and NECTEC Lexitron where noted in the cited reference pages. Entries are
 * carefully approved for the specific listed category, not other categories.
 * The flower group means flowers IN GENERAL and is NOT eligible in 'flower',
 * which only accepts names of actual flower kinds/species.
 */
export type SynonymGroup = {
  id: string;
  category: 'animal' | 'nature';
  meaning: string;
  words: readonly string[];
  source: string;
};

export const SYNONYM_GROUPS: readonly SynonymGroup[] = [
  {
    "id": "elephant",
    "category": "animal",
    "meaning": "ช้าง",
    "words": [
      "ช้าง",
      "คชสาร",
      "กุญชร",
      "หัสดี",
      "หัสดิน",
      "หัตถี",
      "ไอยรา",
      "คชา"
    ],
    "source": "https://dict.longdo.com/search/%E0%B8%8A%E0%B9%89%E0%B8%B2%E0%B8%87"
  },
  {
    "id": "lion",
    "category": "animal",
    "meaning": "สิงโต",
    "words": [
      "สิงโต",
      "ราชสีห์",
      "สิงห์"
    ],
    "source": "https://dict.longdo.com/search/%E0%B8%A3%E0%B8%B2%E0%B8%8A%E0%B8%AA%E0%B8%B5%E0%B8%AB%E0%B9%8C"
  },
  {
    "id": "sun",
    "category": "nature",
    "meaning": "ดวงอาทิตย์",
    "words": [
      "ดวงอาทิตย์",
      "พระอาทิตย์",
      "สุริยา",
      "สุริยัน",
      "ทินกร",
      "ตะวัน"
    ],
    "source": "https://dict.longdo.com/search/%E0%B8%97%E0%B8%B4%E0%B8%99%E0%B8%81%E0%B8%A3"
  },
  {
    "id": "water",
    "category": "nature",
    "meaning": "น้ำ",
    "words": [
      "น้ำ",
      "วารี",
      "วาริ",
      "ชล"
    ],
    "source": "https://dict.longdo.com/search/%E0%B8%A7%E0%B8%B2%E0%B8%A3%E0%B8%B5"
  },
  {
    "id": "flower",
    "category": "nature",
    "meaning": "ดอกไม้ทั่วไป ไม่ใช่ชื่อพันธุ์ดอกไม้",
    "words": [
      "ดอกไม้",
      "บุปผา",
      "ผกา",
      "บุษบา",
      "มาลี"
    ],
    "source": "https://dict.longdo.com/search/%E0%B8%9C%E0%B8%81%E0%B8%B2"
  }
];

/** Only words missing from the existing animal bank; baseline animal names remain in dictionary.ts. */
export const ANIMAL_SYNONYM_ADDITIONS = [
  "คชสาร",
  "กุญชร",
  "หัสดี",
  "หัสดิน",
  "หัตถี",
  "ไอยรา",
  "คชา",
  "สิงห์"
] as const;

/** Selected nature vocabulary. Including a synonym here is an explicit editorial decision. */
export const NATURE_TERMS: readonly string[] = [
  ...SYNONYM_GROUPS.filter(group => group.category === 'nature').flatMap(group => group.words),
  "กรวด",
  "ก้อนหิน",
  "ก้อนเมฆ",
  "กิ่งไม้",
  "กระแสน้ำ",
  "กระแสลม",
  "เกลียวคลื่น",
  "กลีบดอกไม้",
  "คลื่น",
  "คลอง",
  "คุ้งน้ำ",
  "คีรี",
  "คาบสมุทร",
  "ชายหาด",
  "ชายฝั่ง",
  "ชะง่อนผา",
  "ชั้นหิน",
  "ชลธาร",
  "ดิน",
  "ดวงดาว",
  "ดาว",
  "ดาวตก",
  "ดวงจันทร์",
  "ดินโคลน",
  "ทะเล",
  "ทราย",
  "ทุ่งหญ้า",
  "ท้องฟ้า",
  "ทิวเขา",
  "ทะเลสาบ",
  "ทะเลทราย",
  "ทะเลหมอก",
  "น้ำตก",
  "น้ำค้าง",
  "น้ำพุ",
  "น้ำแข็ง",
  "น้ำฝน",
  "น้ำทะเล",
  "น้ำวน",
  "น้ำป่า",
  "บึง",
  "บ่อน้ำ",
  "บรรพต",
  "บุปผชาติ",
  "พายุ",
  "พงไพร",
  "พฤกษา",
  "พสุธา",
  "พฤกษชาติ",
  "ผืนดิน",
  "ผืนป่า",
  "ผืนน้ำ",
  "ผาหิน",
  "เมฆ",
  "หมอก",
  "มหาสมุทร",
  "มรสุม",
  "มวลเมฆ",
  "รุ้ง",
  "รุ้งกินน้ำ",
  "รากไม้",
  "ร่องน้ำ",
  "ริมฝั่ง",
  "สายน้ำ",
  "สายลม",
  "สายฝน",
  "สายรุ้ง",
  "สายฟ้า",
  "วายุ",
  "วสันต์",
  "วสันตฤดู",
  "อากาศ",
  "อรุณ",
  "อาทิตย์",
  "อ่าว",
  "อุกกาบาต",
  "อสนีบาต",
  "ต้นไม้",
  "ต้นหญ้า",
  "ตาน้ำ",
  "ตะกอนดิน",
  "ภูเขา",
  "ภูผา",
  "ภูเขาไฟ",
  "ภูมิประเทศ",
  "ภูมิอากาศ",
];
