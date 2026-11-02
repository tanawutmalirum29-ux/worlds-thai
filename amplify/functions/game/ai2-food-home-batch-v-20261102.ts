/**
 * AI-2 batch V (2026-11-02): independently reviewed real food, sweets,
 * drinks, fruits, edible mushrooms, household utensils and furniture.
 * Data only; no game-rule or canonicalization changes.
 */
export const AI2_FOOD_HOME_BATCH_V: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: ['ซุปมิโซะ', 'ขนมจีนน้ำยาป่า', 'แกงป่าไก่', 'ข้าวซอยเนื้อ'],
  dessert: [],
  drink: ['ชาโรสฮิป'],
  fruit: ['สตรอว์เบอร์รีขาว'],
  vegetable: ['เห็ดขอนขาว', 'เห็ดแครง'],
  object: ['ถุงกรองชา', 'แหนบถอนขน', 'ผ้ารองรีด'],
  furniture: ['ชั้นวางทีวีติดผนัง', 'ตู้เก็บไวน์', 'เตียงพับติดผนัง']
} as const;
