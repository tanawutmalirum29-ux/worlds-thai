/**
 * AI-4 Objects & Geography — reviewed Thai vocabulary (31 Oct 2026, batches 2–3).
 * Only AI-4-owned categories; no changes to canonicalization or game rules.
 * All terms denote established distinct items or real-world place types.
 */
export const AI4_OBJECTS_GEO_TERMS: Readonly<Record<
  'clothing' | 'vehicle' | 'device' | 'tool' | 'place',
  readonly string[]
>> = {
  clothing: [
    'กางเกงคาร์โก้',
    'เสื้อวอร์ม',
    'เสื้อชูชีพ',
    'เสื้อกั๊กสะท้อนแสง',
    // AI-4 batch 3: reviewed additions; original batch 2 entries preserved.
    'เสื้อกันลม',
    'กางเกงขาบาน',
    'ชุดเชฟ',
    'ชุดช่าง'
  ],
  vehicle: [
    'รถบรรทุกน้ำ',
    'รถตักดิน',
    'รถกระเช้า',
    'จักรยานพับได้',
    // AI-4 batch 3: reviewed additions; original batch 2 entries preserved.
    'เครื่องบินน้ำ',
    'จักรยานบรรทุกของ',
    'เรือคายัค',
    'รถบรรทุกขยะ'
  ],
  device: [
    'เครื่องทำวาฟเฟิล',
    'เครื่องนึ่งไฟฟ้า',
    'เครื่องบดกาแฟ',
    'เตาอบลมร้อน',
    // AI-4 batch 3: reviewed additions; original batch 2 entries preserved.
    'ตู้แช่แข็ง',
    'เตาแม่เหล็กไฟฟ้า',
    'เครื่องปิ้งขนมปัง',
    'เครื่องดูดควัน'
  ],
  tool: [
    'คีมปอกสายไฟ',
    'ดอกสกัดปูน',
    'ปืนยิงซิลิโคน',
    'แปรงลวด',
    // AI-4 batch 3: reviewed additions; original batch 2 entries preserved.
    'หัวแร้งบัดกรี',
    'คีมถ่างแหวน',
    'แคลมป์จับงาน',
    'เหล็กเจาะนำศูนย์'
  ],
  place: [
    'โรงไฟฟ้า',
    'พิพิธภัณฑ์สัตว์น้ำ',
    'สนามแข่งรถ',
    'ตลาดน้ำ',
    // AI-4 batch 3: reviewed additions; original batch 2 entries preserved.
    'ท่าเรือประมง',
    'โรงคัดแยกขยะ',
    'หอศิลป์',
    'โรงผลิตน้ำประปา'
  ]
} as const;
