/**
 * AI-2 batch Q (2026-11-02): curated food, dessert, drink, fruit,
 * vegetable, household object and furniture names.
 * Vocabulary data only. No gameplay or canonicalization changes.
 */
export const AI2_FOOD_HOME_BATCH_Q: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: [
    'ข้าวผัดสับปะรด',
    'แกงส้มไหลบัว',
    'ไก่ต้มน้ำปลา'
  ],
  dessert: [
    'ขนมกง',
    'ขนมสามเกลอ'
  ],
  drink: [
    'น้ำฟักข้าว',
    'กาแฟน้ำมะพร้าว',
    'น้ำสละ'
  ],
  fruit: [
    'ลูกสำรอง',
    'ส้มมือ'
  ],
  vegetable: [
    'ดอกฟักทอง',
    'หน่อหวาย',
    'ใบมะขามอ่อน'
  ],
  object: [
    'ขวดบีบซอส',
    'ที่ขูดชีส',
    'ถาดอบขนม',
    'ถุงตาข่ายซักผ้า',
    'แผ่นรองจาน'
  ],
  furniture: [
    'ตู้แขวนผนัง',
    'ม้านั่งเก็บของ'
  ]
} as const;
