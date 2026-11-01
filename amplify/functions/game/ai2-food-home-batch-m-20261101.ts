/**
 * AI-2 batch M (2026-11-01): reviewed, established food/home vocabulary.
 * Data only. Do not modify category rules, aliases or gameplay.
 */
export const AI2_FOOD_HOME_BATCH_M: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: [
    'หมกปลา',
    'แกงอ่อมหมู',
    'ยำแหนมสด',
    'ซุปเห็ดหอม',
    'ผัดฉ่าปลากะพง'
  ],
  dessert: [
    'ขนมข้าวตังหน้าตั้ง'
  ],
  drink: [
    'ชาดอกคำฝอย',
    'น้ำบ๊วยมะนาว'
  ],
  fruit: [
    'ตะขบน้ำ'
  ],
  vegetable: [
    'ผักขะแยง',
    'ผักกาดหอมแดง',
    'ใบมะรุม'
  ],
  object: [
    'โม่หิน',
    'ไซดักปลา',
    'หวดนึ่งข้าว',
    'กระด้ง',
    'ขันโตก',
    'ตะแกรงตากปลา'
  ],
  furniture: [
    'แคร่ไม้ไผ่',
    'โต๊ะหวาย'
  ]
} as const;
