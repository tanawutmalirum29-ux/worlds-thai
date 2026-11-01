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
    'ขนมอาโป๊ง',
    'ขนมเต้าส้อ'
  ],
  drink: [
    'น้ำกระเจี๊ยบโซดา',
    'ชามะนาวน้ำผึ้ง'
  ],
  fruit: [
    'ลูกหยี'
  ],
  vegetable: [
    'ยอดมันปู'
  ],
  object: [
    'ที่คีบขนมปัง',
    'ตะแกรงย่างปลา',
    'พัดใบตาล',
    'กระจาดไม้ไผ่',
    'ตะเกียงเจ้าพายุ',
    'กระเช้าหวาย'
  ],
  furniture: [
    'โต๊ะเขียนแบบ',
    'ตู้เก็บยา',
    'เตียงพยาบาล',
    'เก้าอี้ทำฟัน'
  ]
} as const;
