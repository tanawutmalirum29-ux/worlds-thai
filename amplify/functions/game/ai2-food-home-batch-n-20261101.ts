/**
 * AI-2 batch N (2026-11-01): established Thai food, sweets, drinks,
 * regional produce, household objects and furniture.
 * Vocabulary data only; no gameplay or canonicalization changes.
 */
export const AI2_FOOD_HOME_BATCH_N: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: [
    'ข้าวแรมฟืน',
    'ข้าวพันผัก',
    'ข้าวอบเผือก',
    'หมกเห็ด'
  ],
  dessert: [
    'ขนมลอเป๊ะ',
    'ขนมเต้าส้อ'
  ],
  drink: [
    'น้ำกระเจี๊ยบโซดา',
    'ชาผู่เอ๋อร์'
  ],
  fruit: [
    'ลูกหยี'
  ],
  vegetable: [
    'ยอดมันปู'
  ],
  object: [
    'ไม้คลึงแป้ง',
    'ตะแกรงย่างปลา',
    'ที่ตัดพิซซ่า',
    'กระจาดไม้ไผ่',
    'ตะเกียงเจ้าพายุ',
    'กระเช้าหวาย'
  ],
  furniture: [
    'โต๊ะเขียนแบบ',
    'เก้าอี้ตัดผม',
    'เตียงพยาบาล',
    'เก้าอี้ทำฟัน'
  ]
} as const;
