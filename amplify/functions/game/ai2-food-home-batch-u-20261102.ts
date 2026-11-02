/**
 * AI-2 batch U (2026-11-02): independently screened food, desserts, drinks,
 * fruits, vegetables, household objects and furniture. Vocabulary data only.
 * No canonicalization, moderation or gameplay rule changes.
 */
export const AI2_FOOD_HOME_BATCH_U: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: ['ซุปบอร์ช', 'สลัดนิซัวส์', 'ฟาลาเฟล'],
  dessert: ['หยกมณี', 'ทาร์ตทาทิน', 'จาเลบี'],
  drink: ['น้ำมะม่วงหาวมะนาวโห่'],
  fruit: ['แบล็กเคอร์แรนต์', 'เรดเคอร์แรนต์'],
  vegetable: ['เห็ดเยื่อไผ่', 'เห็ดมันปู'],
  object: ['ซองกันชื้น', 'ฟองน้ำเมลามีน', 'แปรงขัดหลอด', 'เครื่องตีไข่มือหมุน'],
  furniture: ['โต๊ะทำงานปรับระดับ', 'เก้าอี้อานม้า', 'โต๊ะกลางยกท็อปเก็บของ']
} as const;
