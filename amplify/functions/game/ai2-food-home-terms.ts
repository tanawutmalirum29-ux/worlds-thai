/**
 * AI-2: Reviewed household items and furniture used in Thailand.
 * These are literal established names, not generated combinations.
 * Keep categories limited to object and furniture; game rules are unchanged.
 */
export const AI2_FOOD_HOME_TERMS: Readonly<Record<'object' | 'furniture', readonly string[]>> = {
  object: [
    'ฝาชี',
    'ฝาขวด',
    'ซองพัสดุ',
    'กระชอน',
    'กระบวย',
    'ฝาหม้อ',
    'ตะแกรงล้างผัก',
    'ลูกกลิ้งเก็บฝุ่น',
    'สายวัด',
    'หมุด'
  ],
  furniture: [
    'ล็อกเกอร์',
    'เคาน์เตอร์ครัว',
    'ฉากกั้นห้อง',
    'โต๊ะรีดผ้า',
    'เตียงเด็ก',
    'เคาน์เตอร์บาร์',
    'โต๊ะหมู่บูชา',
    'ชั้นลอยติดผนัง',
    'โต๊ะปิกนิก',
    'ชั้นวางต้นไม้'
  ]
} as const;
