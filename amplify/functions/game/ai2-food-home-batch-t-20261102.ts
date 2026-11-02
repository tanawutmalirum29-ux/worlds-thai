/**
 * AI-2 batch T (2026-11-02): reviewed food, sweets, drinks, fruit,
 * vegetable, household utensils and furniture. Data only.
 * Names are distinct established dishes/items, not arbitrary variants.
 */
export const AI2_FOOD_HOME_BATCH_T: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: ['ห่อหมกทะเล', 'ข้าวหมกแพะ', 'สลัดซีซาร์', 'กุ้งผัดพริกเกลือ', 'ปลาหมึกผัดไข่เค็ม'],
  dessert: ['วาราบิโมจิ', 'บิสคอตติ', 'โมนากะ'],
  drink: ['น้ำผึ้งมะนาวโซดา'],
  fruit: ['มะนาวนิ้วมือ'],
  vegetable: ['ถั่วหรั่ง'],
  object: ['เหยือกตวง', 'ที่ทุบเนื้อ', 'หัวบีบครีม', 'ถุงบีบครีม'],
  furniture: ['เตียงเลื่อน', 'เตียงลอฟต์', 'ชั้นหนังสือหมุน']
} as const;
