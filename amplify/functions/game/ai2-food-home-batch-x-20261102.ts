/**
 * AI-2 batch X (2026-11-02): screened regional foods, established sweets,
 * drinks, kitchen utensils and furniture. Fruit/vegetable: no verified
 * distinct new entries this batch. Vocabulary data only; no logic changes.
 */
export const AI2_FOOD_HOME_BATCH_X: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  "food": [
    "แกงอ่อมไข่มดแดง",
    "ปลาทูต้มมะดัน"
  ],
  "dessert": [
    "คุกกี้สิงคโปร์",
    "เค้กมะตูม",
    "พุดดิ้งข้าว"
  ],
  "drink": [
    "น้ำตะลิงปลิง"
  ],
  "fruit": [],
  "vegetable": [],
  "object": [
    "ที่ตัดแป้ง",
    "ตะแกรงนึ่ง",
    "ที่วางช้อน",
    "แผ่นรองหม้อ"
  ],
  "furniture": [
    "ตู้บานเฟี้ยม",
    "โต๊ะทำงานเข้ามุม"
  ]
} as const;
