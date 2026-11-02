/**
 * AI-2 batch Y (2026-11-03): established Thai regional dishes and
 * two specific kitchen utensils, screened against main and open PRs.
 * Vocabulary only; do not alter canonicalization or gameplay.
 */
export const AI2_FOOD_HOME_BATCH_Y: Readonly<Record<
  'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture',
  readonly string[]
>> = {
  food: [
    'อ่อมปลาดุก',
    'ยำไข่แมงดา',
    'ขนมปังหน้าหมู',
    'แหนมทอด',
    'ตำถั่ว',
    'ยำไข่ดาว',
    'ปลาช่อนลุยสวน',
    'หมูย่างตรัง',
    'ผัดหมี่ฮกเกี้ยน',
    'ยำไหลบัว'
  ],
  dessert: [],
  drink: [],
  fruit: [],
  vegetable: [],
  object: [
    'ที่คีบขนมปัง',
    'แปรงทาเนย'
  ],
  furniture: []
} as const;
