/**
 * AI-2 batch L: established Thai foods, desserts, drinks, fruit, edible
 * mushrooms, household objects and furniture. Vocabulary data only.
 * Names are counted once per category; no gameplay or alias changes.
 */
export const AI2_FOOD_HOME_BATCH_L: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: [
    'ข้าวต้มแห้ง',
    'หมูทอดใบมะกรูด',
    'จิ้นส้มหมก',
    'แหนมคลุก',
    'น้ำพริกข่า',
    'ข้าวซอยน้อย',
    'ปลากะพงทอดน้ำปลา'
  ],
  dessert: [
    'ขนมบัวหิมะ'
  ],
  drink: [
    'น้ำลูกยอ',
    'ชาดอกบัว'
  ],
  fruit: [
    'มะหลอด'
  ],
  vegetable: [
    'เห็ดระโงก',
    'เห็ดตับเต่า'
  ],
  object: [
    'ถาดหลุม',
    'กระติกข้าวเหนียว',
    'ถังข้าวสาร',
    'ที่กดกระเทียม',
    'ที่ตักน้ำแข็ง'
  ],
  furniture: [
    'ตั่งไม้',
    'โต๊ะบาร์'
  ]
} as const;
