/**
 * AI-2 batch I: independently curated Thai vegetables, household objects,
 * and furniture. These are established names, not generated combinations.
 * Prefix/canonicalization and gameplay behavior remain unchanged.
 */
export const AI2_FOOD_HOME_BATCH_I: Readonly<Record<'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  vegetable: [
    'กะหล่ำปม',
    'ใบชะมวง',
    'หน่อกระวาน',
    'ผักขวง'
  ],
  object: [
    'ที่รองสบู่',
    'เหยือกน้ำ',
    'ที่วางตะเกียบ',
    'ถาดน้ำแข็ง',
    'ถุงซักผ้า',
    'ยางรัดผม',
    'กระปุกสำลี',
    'ที่บีบหลอดยาสีฟัน',
    'ที่กรองชา',
    'ช้อนตวง',
    'ตลับยา',
    'กล่องปฐมพยาบาล'
  ],
  furniture: [
    'ตู้เก็บจาน',
    'โต๊ะเย็บผ้า',
    'ชั้นวางแก้ว',
    'เก้าอี้นวด'
  ]
} as const;
