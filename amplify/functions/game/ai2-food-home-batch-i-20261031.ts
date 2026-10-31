/**
 * AI-2 batch I: independently curated Thai vegetables, household objects,
 * and furniture. These are established names, not generated combinations.
 * Prefix/canonicalization and gameplay behavior remain unchanged.
 */
export const AI2_FOOD_HOME_BATCH_I: Readonly<Record<'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  vegetable: [
    'ผักก้านจอง',
    'ใบชะมวง',
    'ผักกะสัง',
    'ผักขวง'
  ],
  object: [
    'หลอดดูดน้ำ',
    'เหยือกน้ำ',
    'ฝาปิดแก้ว',
    'ถาดน้ำแข็ง',
    'ที่หนีบผ้า',
    'ยางรัดผม',
    'ซองใส่แว่น',
    'ฟอยล์อะลูมิเนียม',
    'ที่กรองชา',
    'ช้อนตวง',
    'ตลับยา',
    'กล่องปฐมพยาบาล'
  ],
  furniture: [
    'ตู้เก็บจาน',
    'โต๊ะกลางโซฟา',
    'ชั้นวางแก้ว',
    'ตู้ลอยครัว'
  ]
} as const;
