/**
 * AI-2 batch W (2026-11-02): curated established Thai/international foods,
 * sweets, drinks, fruit, edible plants/mushrooms and household furnishings.
 * Data only; no canonicalization or gameplay changes.
 */
export const AI2_FOOD_HOME_BATCH_W: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: ['ข้าวผัดปลาสลิด', 'แกงอ่อมเห็ด'],
  dessert: ['แคนโนลี', 'เซมิเฟรดโด'],
  drink: ['ชาลาเวนเดอร์'],
  fruit: ['ส้มเลือด', 'เชอร์รีอะเซโรลา'],
  vegetable: ['ดอกแคนา', 'เห็ดหัวลิง'],
  object: ['ที่หนีบถุงขนม', 'ไม้แขวนกางเกง', 'ที่ตีฟองนม', 'ที่กรองน้ำมัน'],
  furniture: ['โต๊ะกลมพับได้', 'ชั้นวางของเข้ามุม', 'เตียงมีลิ้นชัก']
} as const;
