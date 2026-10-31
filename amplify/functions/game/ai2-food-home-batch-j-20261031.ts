/**
 * AI-2 batch J: established Thai regional dishes, traditional snacks,
 * a fruit cultivar and household utensils. Only AI-2-owned categories.
 * Keep all canonicalization, initial-letter and gameplay rules unchanged.
 */
export const AI2_FOOD_HOME_BATCH_J: Readonly<Record<'food' | 'dessert' | 'fruit' | 'object', readonly string[]>> = {
  food: [
    'แกงขนุน',
    'แกงโฮะ',
    'แกงกระด้าง',
    'ต้มจิ๋ว',
    'แกงบอน',
    'ยำส้มโอ',
    'แกงแคไก่',
    'ยำจิ้นไก่',
    'แกงผักหวานไข่มดแดง',
    'ข้าวผัดน้ำพริกลงเรือ'
  ],
  dessert: [
    'ขนมช่อม่วง',
    'ขนมหม้อตาล',
    'ขนมเจาะหู',
    'ขนมสาลี่กรอบ',
    'ขนมกรอบเค็ม'
  ],
  fruit: [
    'ชมพู่เพชรสามพราน',
    'ส้มจุก'
  ],
  object: [
    'ที่วางฝาหม้อ',
    'ที่หั่นไข่ต้ม',
    'ลูกกลิ้งนวดหน้า'
  ]
} as const;
