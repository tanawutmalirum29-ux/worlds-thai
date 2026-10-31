/**
 * AI-2 batch D: established Thai regional dishes, sweets and drinks.
 * Curated literal names only; no new categories or gameplay-rule changes.
 * Dessert names retain their written ขนม prefix; the existing game logic
 * determines their playable initial from the remainder.
 */
export const AI2_FOOD_HOME_BATCH_D: Readonly<Record<'food' | 'dessert' | 'drink', readonly string[]>> = {
  food: [
    'แกงขี้เหล็ก',
    'ไก่กอและ',
    'หมูฮ้อง',
    'ต้มส้มปลาทู',
    'จอผักกาด',
    'อุ๊บไก่',
    'ยำขนมจีน',
    'หลนปูเค็ม',
    'ผัดใบเหลียงใส่ไข่',
    'ข้าวยำปักษ์ใต้'
  ],
  dessert: [
    'ขนมข้าวโป่ง',
    'ขนมรังผึ้ง',
    'ขนมโก๋',
    'ขนมปั้นขลิบ',
    'ขนมไข่กรอบ'
  ],
  drink: [
    'น้ำงาดำ',
    'น้ำมะเม่า',
    'น้ำมะดัน',
    'ชาใบหม่อน',
    'ชาข้าวบาร์เลย์'
  ]
} as const;
