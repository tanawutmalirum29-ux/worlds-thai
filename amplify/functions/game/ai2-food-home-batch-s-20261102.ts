/**
 * AI-2 batch S (2026-11-02): independently screened Thai food and home vocabulary.
 * Seven owned categories only; no gameplay or canonicalization changes.
 * Regional examples: แกงหยวกกล้วย, ปลาทูซาเตี๊ยะ, ขนมคันหลาว, มะมุด, หน่อกะลา.
 */
export const AI2_FOOD_HOME_BATCH_S: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: ['แกงหยวกกล้วย', 'ปลาทูซาเตี๊ยะ', 'หมูผัดกะปิ', 'ไก่คั่วเกลือ'],
  dessert: ['ขนมคันหลาว', 'ขนมพริกไทย', 'ขนมนวลแห้ว'],
  drink: ['ชานมฮ่องกง', 'น้ำทับทิมโซดา', 'ชาข้าวโพด'],
  fruit: ['มะมุด'],
  vegetable: ['หน่อกะลา', 'ผักเซียงดา'],
  object: ['อุปกรณ์ตัดเปลือกไข่', 'ขวดโหลสุญญากาศ', 'แผ่นซิลิโคนรองอบ', 'ตะแกรงพักขนม', 'พิมพ์กดคุกกี้'],
  furniture: ['ชั้นวางไวน์', 'โต๊ะพับติดผนัง']
} as const;
