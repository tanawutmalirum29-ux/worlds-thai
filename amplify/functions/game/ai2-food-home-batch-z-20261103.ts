/**
 * AI-2 batch Z (2026-11-03): real regional Thai and familiar Asian dishes,
 * one traditional sweet and one independently distinct household item.
 * Data only; no scoring, category or canonicalization rule changes.
 */
export const AI2_FOOD_HOME_BATCH_Z: Readonly<Record<
  'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture',
  readonly string[]
>> = {
  "food": [
    "แกงผักเฮือด",
    "น้ำพริกน้ำปู๋",
    "หมกไข่มดแดง",
    "ตำโคราช",
    "ตำหอยดอง",
    "ผัดหมี่กระเฉด",
    "บุ๋นจ๋า",
    "ก๋วยเตี๋ยวหลอด",
    "โอโคโนมิยากิ",
    "ซุนดูบูจิเก",
    "ยากิโซบะ",
    "ทอดมันหัวปลี"
  ],
  "dessert": [
    "ขนมทองนพคุณ"
  ],
  "drink": [],
  "fruit": [],
  "vegetable": [],
  "object": [
    "ผ้าขาวบาง"
  ],
  "furniture": []
} as const;
