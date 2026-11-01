/**
 * AI-2 batch O (2026-11-01): established Thai regional dishes, sweets,
 * non-branded drinks, produce, household tools and specialist furniture.
 * Vocabulary data only; no changes to canonicalization or gameplay.
 */
export const AI2_FOOD_HOME_BATCH_O: Readonly<Record<'food' | 'dessert' | 'drink' | 'fruit' | 'vegetable' | 'object' | 'furniture', readonly string[]>> = {
  food: [
    'หอยจ๊อ',
    'ลาบเทา',
    'ข้าวปุ้นน้ำแจ่ว',
    'แกงรัญจวน'
  ],
  dessert: [
    'ขนมสัมปันนี',
    'ขนมปำจี'
  ],
  drink: [
    'ชาหลงจิ่ง',
    'น้ำข้าวบาร์เลย์',
    'น้ำว่านหางจระเข้'
  ],
  fruit: [
    'มะงั่ว'
  ],
  vegetable: [
    'ยอดกระโดน',
    'ยอดจิก'
  ],
  object: [
    'กระดิ่งลม',
    'พิมพ์ขนมครก',
    'ที่บดกระเทียม',
    'ที่ขูดมะพร้าว',
    'พิมพ์วุ้น',
    'ขาตั้งโน้ตเพลง'
  ],
  furniture: [
    'เตียงผ่าตัด',
    'โต๊ะวางจักรเย็บผ้า'
  ]
} as const;
