/**
 * AI-4 Objects & Geography — reviewed Thai vocabulary (31 Oct 2026, batches 2–7).
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
    'ชุดช่าง',
    // AI-4 batch 4: reviewed distinct vocabulary.
    'หมวกนิรภัย',
    'เสื้อกั๊กกันกระสุน',
    'ชุดดับเพลิง',
    'ชุดคลุมท้อง',
    // AI-4 batch 5: reviewed clothing terms.
    'เสื้อกาวน์',
    'รองเท้าหนัง',
    'ชุดฮันบก',
    'กางเกงขากระบอก',
    // AI-4 batch 6: vetted distinct clothing terms.
    'รองเท้าหัวเหล็ก',
    'เสื้อราชปะแตน',
    'รองเท้าบัลเลต์',
    'เสื้อคอกระเช้า',
    // AI-4 batch 7: recognizable clothing and practical workwear.
    'รองเท้าบูตยาง',
    'ถุงเท้ากีฬา',
    'เสื้อยืดคอกลม',
    'กางเกงเอี๊ยม'
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
    'รถบรรทุกขยะ',
    // AI-4 batch 4: reviewed distinct vocabulary.
    'รถไถนา',
    'รถพ่วงข้าง',
    'รถบรรทุกตู้คอนเทนเนอร์',
    'เรือท้องแบน',
    // AI-4 batch 5: distinct transport types.
    'รถขุดตีนตะขาบ',
    'รถกวาดถนน',
    'เรือบรรทุกสินค้า',
    'รถไฟความเร็วสูง',
    // AI-4 batch 6: vetted distinct vehicle terms.
    'จักรยานล้อเดียว',
    'รถบดถนน',
    'เรือแจว',
    'เรือกอนโดลา',
    // AI-4 batch 7: distinct, real passenger and utility vehicles.
    'เรือสปีดโบ๊ต',
    'เครื่องบินใบพัด',
    'รถสามล้อถีบ',
    'รถบ้าน'
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
    'เครื่องดูดควัน',
    // AI-4 batch 4: reviewed distinct vocabulary.
    'ตู้กดน้ำ',
    'เครื่องอบรองเท้า',
    'เครื่องชั่งดิจิทัล',
    'เครื่องพิมพ์ฉลาก',
    // AI-4 batch 5: distinct electrical appliances.
    'เครื่องทำน้ำแข็ง',
    'กริ่งไฟฟ้า',
    'เครื่องวัดความดันโลหิต',
    'เตาย่างไฟฟ้า',
    // AI-4 batch 6: vetted distinct device terms.
    'เครื่องดูดความชื้น',
    'ตู้กดบัตรคิว',
    'เครื่องสแกนเอกสาร',
    'เครื่องเป่ามือ',
    // AI-4 batch 7: identifiable electrical and electronic devices.
    'หุ่นยนต์ดูดฝุ่น',
    'เครื่องตรวจจับควัน',
    'พัดลมไร้ใบพัด',
    'นาฬิกาปลุกดิจิทัล'
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
    'เหล็กเจาะนำศูนย์',
    // AI-4 batch 4: reviewed distinct vocabulary.
    'ไขควงหัวดาว',
    'คีมตัดท่อ',
    'ฉากช่างไม้',
    'เครื่องยิงตะปู',
    // AI-4 batch 5: distinct workshop tools.
    'บล็อกลม',
    'เลื่อยสายพาน',
    'ที่ดูดตะกั่ว',
    'ปืนยิงรีเวท',
    // AI-4 batch 6: vetted distinct tool terms.
    'บักเต้า',
    'คีมตัดลวด',
    'ตะไบสามเหลี่ยม',
    'ค้อนหัวกลม',
    // AI-4 batch 7: distinct workshop and trade tools.
    'ปืนยิงลวด',
    'ประแจสายพาน',
    'เวอร์เนียร์คาลิปเปอร์',
    'คีมถอนตะปู'
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
    'โรงผลิตน้ำประปา',
    // AI-4 batch 4: reviewed distinct vocabulary.
    'อู่ซ่อมรถ',
    'โรงพิมพ์',
    'โรงงานรีไซเคิล',
    'สถานีขนส่งผู้โดยสาร',
    // AI-4 batch 5: established place types.
    'ศาลากลางจังหวัด',
    'ทัณฑสถาน',
    'ศูนย์กีฬา',
    'ศูนย์ประชุม',
    // AI-4 batch 6: vetted distinct place terms.
    'โรงสีข้าว',
    'สถานีวิทยุ',
    'ศูนย์ฝึกอาชีพ',
    'บ่อบำบัดน้ำเสีย',
    // AI-4 batch 7: real, familiar public places and facilities.
    'สนามยิงธนู',
    'ท่ารถตู้',
    'ห้องสมุดประชาชน',
    'สนามแข่งม้า'
  ]
} as const;
