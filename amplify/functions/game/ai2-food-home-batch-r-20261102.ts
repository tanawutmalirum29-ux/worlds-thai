/**
 * AI-2 batch R (2026-11-02): verified Thai food and household vocabulary.
 * Data only; canonicalization, game rules and other categories are unchanged.
 */
export const AI2_FOOD_HOME_BATCH_R: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: ['ยากิโทริ', 'ข้าวหน้าปลาไหล', 'สตูว์เนื้อ'],
  dessert: ['ขนมลิ้นหมา'],
  drink: ['ชาเจียวกู่หลาน', 'ลาสซี่มะม่วง', 'ชาเปปเปอร์มินต์'],
  fruit: ['จาบูติกาบา'],
  vegetable: ['ยอดมะรุม', 'ยอดชะมวง', 'ผักลิ้นห่าน'],
  object: ['หินลับมีด', 'กระบอกน้ำสุญญากาศ', 'กล่องใส่รองเท้า'],
  furniture: ['ชั้นวางเครื่องเสียง', 'เตียงสนาม', 'เก้าอี้อาบน้ำ']
} as const;
