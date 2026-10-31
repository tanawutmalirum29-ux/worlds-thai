/**
 * AI-2 batch K: distinct, established Thai dishes and sweets plus
 * internationally recognized beverages used by Thai speakers.
 * Vocabulary data only; no category, normalization or gameplay changes.
 */
export const AI2_FOOD_HOME_BATCH_K: Readonly<Record<'food' | 'dessert' | 'drink', readonly string[]>> = {
  food: [
    'หมูสร่ง',
    'แสร้งว่ากุ้ง',
    'แกงส้มดอกแค',
    'ข้าวหมูกรอบ',
    'ปลาร้าสับ',
    'แกงผักกูด',
    'ไก่ต้มขมิ้น',
    'ยำมะเขือยาว'
  ],
  dessert: [
    'ขนมสัมปันนี',
    'ขนมเรไร'
  ],
  drink: [
    'กาแฟริสเตรตโต',
    'ชามาซาลา'
  ]
} as const;
