/**
 * AI-2 batch P (2026-11-01): reviewed Thai regional foods, sweets, drinks,
 * fruit, edible flowers/shoots, household objects and furniture.
 * Vocabulary data only; no gameplay or canonicalization changes.
 */
export const AI2_FOOD_HOME_BATCH_P: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: [
    'ข้าวเบ๊อะ',
    'ลาบหมาน้อย',
    'ข้าวเปิ๊บ'
  ],
  dessert: [
    'ขนมอังกู๊',
    'ขนมบุหงาบูดะ'
  ],
  drink: [
    'น้ำส้มซ่า',
    'ชาดอกกุหลาบ',
    'ชาโฮจิฉะ'
  ],
  fruit: [
    'ลูกจัน',
    'มะปริง'
  ],
  vegetable: [
    'ดอกงิ้ว',
    'ดอกดาหลา',
    'ยอดกระถิน'
  ],
  object: [
    'หวีสับ',
    'ไม้พายซิลิโคน',
    'เครื่องบดพริกไทย',
    'ที่ตักไอศกรีม',
    'กล่องใส่เครื่องเทศ'
  ],
  furniture: [
    'โต๊ะทำเล็บ',
    'เตียงตรวจโรค'
  ]
} as const;
