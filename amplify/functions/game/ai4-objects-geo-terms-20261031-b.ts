/**
 * AI-4 Objects & Geography — reviewed Thai vocabulary (31 Oct–3 Nov 2026, batches 2–31).
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
    'กางเกงเอี๊ยม',
    // AI-4 batch 8: recognizable, distinct clothing types.
    'ชุดกี่เพ้า',
    'กางเกงขาสามส่วน',
    'รองเท้าผ้าใบหุ้มข้อ',
    'ถุงเท้ายาว',
    // AI-4 batch 9: reviewed distinct clothing vocabulary.
    'ชุดอวกาศ',
    'ถุงมือหนัง',
    'ชุดป้องกันสารเคมี',
    'รองเท้าส้นเตี้ย',
    // AI-4 batch 10: reviewed, distinct vocabulary.
    'หมวกทรงกระบอก',
    'รองเท้าสเก็ตน้ำแข็ง',
    'หมวกบัณฑิต',
    'สนับแข้ง',
    // AI-4 batch 11: distinct reviewed terms, no changes to game logic.
    'เสื้อฮาวาย',
    'หมวกกะลาสี',
    'เสื้อกั๊กช่างภาพ',
    'ผ้าคลุมเจ้าสาว',
    // AI-4 batch 12: distinct real-world protective wear and footwear.
    'ถุงมือกันความร้อน',
    'สนับศอก',
    'รองเท้ากอล์ฟ',
    'เสื้อเกราะกันกระแทก',
    // AI-4 batch 13: independently named, playable objects and facilities.
    'ชุดสกี',
    'รองเท้าปีนผา',
    'ผ้ารัดข้อมือ',
    'ชุดเต้นบัลเลต์',
    // AI-4 batch 14: reviewed, distinct and playable Thai terms.
    'เสื้อกั๊กตกปลา',
    'รองเท้าบูตขี่ม้า',
    'ถุงมือทำสวน',
    'ถุงเท้ากันน้ำ',
    // AI-4 batch 15: reviewed distinct Thai vocabulary.
    'สนับเข่า',
    'รองเท้าฟุตซอล',
    'ชุดเวทสูท',
    'ถุงมือกอล์ฟ',
    // AI-4 batch 16: established protective and athletic wear.
    'เสื้อกั๊กถ่วงน้ำหนัก',
    'รองเท้าตะปู',
    'หมวกเชื่อมเหล็ก',
    'ผ้ากันเปื้อนช่างเชื่อม',
    // AI-4 batch 17: distinct reviewed Thai terms; no cross-team changes.
    'ถุงมือปั่นจักรยาน',
    'รองเท้าดำน้ำ',
    'ชุดป้องกันผึ้ง',
    'ผ้าปิดตานอน',
    // AI-4 batch 18: reviewed distinct practical vocabulary.
    'ถุงเท้าแยกนิ้ว',
    'ปลอกขากันโคลน',
    'ชุดมาสคอต',
    'ชุดเอี๊ยมกันน้ำ',
    // AI-4 batch 19: reviewed distinct real-world terms.
    'กางเกงมวยไทย',
    'รองเท้าวิ่งเทรล',
    'ชุดฟันดาบ',
    'เสื้อช็อปช่าง',
    // AI-4 batch 20: reviewed distinct equipment and real-world facility types.
    'ผ้าโพกศีรษะ',
    'ชุดสครับ',
    'ถุงมือฉนวนไฟฟ้า',
    'ชุดดรายสูท',
    // AI-4 batch 21: reviewed distinct equipment, apparel and facilities.
    'ชุดเทควันโด',
    'ชุดยูโด',
    'รองเท้าโบว์ลิ่ง',
    'เสื้อบาติก',
    // AI-4 batch 22: distinct everyday apparel.
    'ชุดกระโปรงเอี๊ยม',
    'ชุดซาฟารี',
    'กระโปรงกางเกง',
    'ชุดขี่ม้า',
    // AI-4 batch 23: distinct established apparel, vehicles, equipment and facilities.
    'ชุดอาบายะห์',
    'เสื้อปอนโช',
    'ชุดฮากามะ',
    // AI-4 batch 24: reviewed distinct vocabulary; no game logic changes.
    'รองเท้าแมรี่เจน',
    'รองเท้าโลฟเฟอร์',
    // AI-4 batch 25: distinct established apparel and uniforms.
    'รองเท้าดาร์บี้',
    'ชุดกะลาสี',
    'ชุดมวยปล้ำ',
    'รองเท้าอ็อกซ์ฟอร์ด',
    // AI-4 batch 26: distinct real apparel, measuring equipment, tools and facilities.
    'เสื้อชั้นในกีฬา',
    'ชุดไตรกีฬา',
    // AI-4 batch 27: screened distinct garments, equipment, workshop tools and places.
    'ถุงมือกันไฟฟ้าสถิต',
    'เสื้อตะกั่ว',
    // AI-4 batch 28: distinct sportswear and professional safety clothing.
    'ชุดว่ายน้ำวันพีซ',
    'ชุดนักแข่งรถ',
    // AI-4 batch 29: protective workwear with separate established functions.
    'เสื้อเกราะกันแทง',
    'รองเท้ากันไฟฟ้าสถิต',
    // AI-4 batch 30: distinct everyday objects and established facilities.
    'เสื้อกั๊กสูท',
    'กางเกงจ็อกเกอร์',
    // AI-4 batch 31: established formalwear, footwear and hat styles.
    'เสื้อบอมเบอร์',
    'รองเท้าส้นเตารีด',
    'หมวกโบว์เลอร์',
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
    'รถบ้าน',
    // AI-4 batch 8: distinct road, rail and water vehicles.
    'เรือกู้ภัย',
    'รถบัสสองชั้น',
    'รถกระบะสี่ประตู',
    'รถไฟฟ้ารางเดี่ยว',
    // AI-4 batch 9: reviewed distinct vehicle vocabulary.
    'รถขนส่งนักเรียน',
    'รถห้องเย็น',
    'เรือบรรทุกน้ำมัน',
    'รถขนส่งผู้ต้องขัง',
    // AI-4 batch 10: reviewed, distinct vocabulary.
    'รถลากจูงเครื่องบิน',
    'รถพ่นหมอกควัน',
    'เรือลากจูง',
    'รถเจาะเสาเข็ม',
    // AI-4 batch 11: distinct reviewed terms, no changes to game logic.
    'รถดับเพลิงบันไดสูง',
    'รถเครนล้อยาง',
    'เรือท้องกระจก',
    'รถตักหน้าขุดหลัง',
    // AI-4 batch 12: distinct land and underwater transport types.
    'รถปูยางมะตอย',
    'เรือดำน้ำท่องเที่ยว',
    'รถตักตีนตะขาบ',
    'รถฉีดน้ำล้างถนน',
    // AI-4 batch 13: independently named, playable objects and facilities.
    'รถไฟไอน้ำ',
    'รถไฟตรวจราง',
    'เรือกวาดทุ่นระเบิด',
    'รถขนส่งกระจก',
    // AI-4 batch 14: reviewed, distinct and playable Thai terms.
    'เครื่องบินเติมน้ำมันกลางอากาศ',
    'เรือพยาบาล',
    'รถตรวจวัดมลพิษ',
    'เรือเก็บขยะ',
    // AI-4 batch 15: reviewed distinct Thai vocabulary.
    'รถขนส่งไปรษณีย์',
    'เรือเก็บผักตบชวา',
    'เรือวิจัยสมุทรศาสตร์',
    'รถลากเรือ',
    // AI-4 batch 16: distinct specialist road and marine vehicles.
    'รถสูบคอนกรีต',
    'รถไถหิมะ',
    'เรือวางท่อ',
    'รถยกตู้คอนเทนเนอร์',
    // AI-4 batch 17: distinct reviewed Thai terms; no cross-team changes.
    'รถบรรทุกปูนผง',
    'รถไฟรางแม่เหล็ก',
    'เรือเก็บคราบน้ำมัน',
    'เรือใบสองเสา',
    // AI-4 batch 18: reviewed distinct practical vocabulary.
    'เรือตัดน้ำแข็ง',
    'รถรางขึ้นเขา',
    'เรือแอร์โบ๊ท',
    'รถบรรทุกเครื่องจักร',
    // AI-4 batch 19: reviewed distinct real-world terms.
    'รถขนส่งเงินสด',
    'รถสุขาเคลื่อนที่',
    'เรือวางสายเคเบิล',
    'รถขนสัมภาระสนามบิน',
    // AI-4 batch 20: reviewed distinct equipment and real-world facility types.
    'รถบรรทุกปศุสัตว์',
    'เรือใบไตรมารัน',
    'เรือบรรทุกสารเคมี',
    'รถไฟไฮโดรเจน',
    // AI-4 batch 21: reviewed distinct equipment, apparel and facilities.
    'รถเกี่ยวข้าวโพด',
    'เรือวางทุ่น',
    // AI-4 batch 23: distinct established apparel, vehicles, equipment and facilities.
    'รถดูดสิ่งปฏิกูล',
    'เรือบรรทุกก๊าซธรรมชาติเหลว',
    // AI-4 batch 24: reviewed distinct vocabulary; no game logic changes.
    'รถบรรทุกก๊าซ',
    // AI-4 batch 25: distinct industrial and agricultural vehicles.
    'รถพ่วงบรรทุกอ้อย',
    'รถตีเส้นจราจร',
    // AI-4 batch 28: electric-powered passenger vessel.
    'เรือโดยสารไฟฟ้า',
    // AI-4 batch 29: small single-hull sailing dinghy.
    'เรือใบดิงกี้',
    // AI-4 batch 30: distinct everyday objects and established facilities.
    'รถสามล้อไฟฟ้า',
    'เรือยางท้องแข็ง',
    'รถไฟสองชั้น',
    // AI-4 batch 31: distinct mobile catering and passenger/sailing vessels.
    'รถฟู้ดทรัค',
    'เรือโดยสารสองชั้น',
    'เรือใบเลเซอร์',
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
    'นาฬิกาปลุกดิจิทัล',
    // AI-4 batch 8: familiar electrical appliances and measuring devices.
    'เตาไฟฟ้า',
    'เครื่องไล่ยุงไฟฟ้า',
    'เครื่องนวดไฟฟ้า',
    'เครื่องวัดฝุ่น',
    // AI-4 batch 9: reviewed distinct device vocabulary.
    'เครื่องสแกนลายนิ้วมือ',
    'เครื่องตรวจน้ำตาลในเลือด',
    'เครื่องนับธนบัตร',
    'เครื่องนึ่งขวดนม',
    // AI-4 batch 10: reviewed, distinct vocabulary.
    'เครื่องทำสายไหม',
    'เครื่องนับเหรียญ',
    'เครื่องอ่านบัตรประชาชน',
    'เครื่องทำป๊อปคอร์น',
    // AI-4 batch 11: distinct reviewed terms, no changes to game logic.
    'เครื่องวัดออกซิเจนปลายนิ้ว',
    'เครื่องฆ่าเชื้อยูวี',
    'เครื่องตรวจจับโลหะ',
    'เครื่องให้อาหารสัตว์อัตโนมัติ',
    // AI-4 batch 12: separate appliance functions.
    'เครื่องซีลสูญญากาศ',
    'เครื่องตรวจจับก๊าซ',
    'เครื่องอบผลไม้',
    'เครื่องเคลือบบัตร',
    // AI-4 batch 13: independently named, playable objects and facilities.
    'เครื่องทำโยเกิร์ต',
    'เครื่องอุ่นนม',
    'เครื่องพ่นละอองยา',
    'เครื่องตรวจวัดคุณภาพน้ำ',
    // AI-4 batch 14: reviewed, distinct and playable Thai terms.
    'เครื่องตัดกระดาษไฟฟ้า',
    'เครื่องบันทึกเสียงดิจิทัล',
    'ป้ายไฟวิ่ง',
    'นาฬิกาจับเวลาดิจิทัล',
    // AI-4 batch 15: reviewed distinct Thai vocabulary.
    'เครื่องตรวจจับน้ำรั่ว',
    'เครื่องดูดไรฝุ่น',
    'เครื่องอบจาน',
    'เครื่องวัดความชื้นดิน',
    // AI-4 batch 16: separate electrical and electronic device functions.
    'เครื่องตรวจธนบัตรปลอม',
    'เครื่องฟักไข่',
    'เครื่องทดสอบแบตเตอรี่',
    'เครื่องพับกระดาษอัตโนมัติ',
    // AI-4 batch 17: distinct reviewed Thai terms; no cross-team changes.
    'เครื่องล้างอัลตราโซนิก',
    'เครื่องบันทึกภาพกล้องวงจรปิด',
    'เครื่องวัดแสง',
    'เครื่องทำฟองนม',
    // AI-4 batch 18: reviewed distinct practical vocabulary.
    'แปรงสีฟันไฟฟ้า',
    'หูฟังไร้สาย',
    'เครื่องชงกาแฟแคปซูล',
    'เครื่องวัดอุณหภูมิอินฟราเรด',
    // AI-4 batch 19: reviewed distinct real-world terms.
    'เครื่องทำความสะอาดไอน้ำ',
    'เครื่องดูดเสมหะ',
    'เครื่องบดเนื้อไฟฟ้า',
    'เครื่องวัดระดับเสียง',
    // AI-4 batch 20: reviewed distinct equipment and real-world facility types.
    'เครื่องทำแซนด์วิช',
    'เครื่องวัดความเร็วลม',
    'เครื่องบันทึกคลื่นไฟฟ้าหัวใจ',
    'เครื่องทดสอบสายแลน',
    // AI-4 batch 21: reviewed distinct equipment, apparel and facilities.
    'เครื่องปั๊มนมไฟฟ้า',
    'เครื่องสกัดน้ำผลไม้',
    'ตู้บ่มเพาะเชื้อ',
    'ป้ายไฟทางออกฉุกเฉิน',
    // AI-4 batch 22: distinct electrical and electronic appliances.
    'เครื่องตรวจจับการเคลื่อนไหว',
    'เครื่องวัดความขุ่นของน้ำ',
    'เครื่องทำไอศกรีม',
    'เครื่องแยกเหรียญ',
    // AI-4 batch 23: distinct established apparel, vehicles, equipment and facilities.
    'เครื่องวัดความเค็ม',
    'เครื่องบันทึกอุณหภูมิ',
    'เครื่องวัดรังสี',
    'เครื่องอ่านหนังสืออิเล็กทรอนิกส์',
    // AI-4 batch 24: reviewed distinct vocabulary; no game logic changes.
    'เครื่องทำขนมปัง',
    'เครื่องทำเส้นพาสต้าไฟฟ้า',
    'เครื่องนับจำนวนคน',
    'เครื่องฉายดาว',
    // AI-4 batch 25: independently functioning electrical measuring and warming devices.
    'เครื่องวัดออกซิเจนละลายน้ำ',
    'เครื่องวัดแรงสั่นสะเทือน',
    'เครื่องอุ่นผ้าขนหนู',
    'เครื่องวัดความต้านทานฉนวน',
    // AI-4 batch 26: distinct real apparel, measuring equipment, tools and facilities.
    'เครื่องวัดความชื้นอากาศ',
    'เครื่องปั่นไฟ',
    'เครื่องวัดความเร็วรอบ',
    'เครื่องวัดความถี่ไฟฟ้า',
    'เครื่องวัดการนำไฟฟ้า',
    'เครื่องวัดความหนาสี',
    // AI-4 batch 27: screened distinct garments, equipment, workshop tools and places.
    'เครื่องนับก้าว',
    'เครื่องฉายภาพข้ามศีรษะ',
    'เครื่องวัดความชื้นในไม้',
    // AI-4 batch 28: distinct electronic diagnostic and measuring devices.
    'เครื่องตรวจคลื่นไฟฟ้าสมอง',
    'เครื่องสแกนม่านตา',
    'เครื่องวัดก๊าซคาร์บอนไดออกไซด์',
    'เครื่องวัดสนามแม่เหล็ก',
    // AI-4 batch 29: distinct flow and magnetic-card instruments.
    'เครื่องวัดอัตราการไหล',
    'เครื่องอ่านบัตรแม่เหล็ก',
    // AI-4 batch 30: distinct everyday objects and established facilities.
    'เครื่องวัดความเร็วกระแสน้ำ',
    'เครื่องวัดความเข้มสนามไฟฟ้า',
    'เครื่องตรวจจับเปลวไฟ',
    // AI-4 batch 31: separate film, translation and carbonation devices.
    'เครื่องสแกนฟิล์ม',
    'เครื่องแปลภาษาอิเล็กทรอนิกส์',
    'เครื่องทำโซดา',
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
    'คีมถอนตะปู',
    // AI-4 batch 8: distinct workshop and construction tools.
    'เหล็กขีด',
    'แปรงทาสี',
    'ประแจตัวที',
    'เกรียงฉาบปูน',
    // AI-4 batch 9: reviewed distinct tool vocabulary.
    'ประแจปากตาย',
    'ปากกาจับท่อ',
    'ที่ดัดท่อ',
    'คีมย้ำสายแลน',
    // AI-4 batch 10: reviewed, distinct vocabulary.
    'ที่เจาะรูเข็มขัด',
    'เกจวัดลมยาง',
    'เหล็กตอกตัวอักษร',
    'ตัวดูดลูกปืน',
    // AI-4 batch 11: distinct reviewed terms, no changes to game logic.
    'ประแจโซ่',
    'เหล็กงัดยาง',
    'เลื่อยหางหนู',
    'ปืนพ่นสี',
    // AI-4 batch 12: measurement, pneumatic and lifting tools.
    'เครื่องวัดระยะเลเซอร์',
    'ปืนเป่าลม',
    'คีมตัดสายเคเบิล',
    'ตัวดูดกระจก',
    // AI-4 batch 13: independently named, playable objects and facilities.
    'เกจวัดเกลียว',
    'ไม้ฉากปรับมุม',
    'มีดปาดสี',
    'ค้อนทองแดง',
    // AI-4 batch 14: reviewed, distinct and playable Thai terms.
    'เกจวัดรัศมี',
    'คีมถอดคลิปพลาสติก',
    'ประแจถอดกรองน้ำมันเครื่อง',
    'ตะไบเพชร',
    // AI-4 batch 15: reviewed distinct Thai vocabulary.
    'ปืนอัดจาระบี',
    'เครื่องตัดโฟมลวดร้อน',
    'เครื่องลับดอกสว่าน',
    'มีดแกะสลักไม้',
    // AI-4 batch 16: distinct practical workshop tools.
    'เลื่อยญี่ปุ่น',
    'ตะไบครึ่งวงกลม',
    'เกจวัดความลึก',
    'คีมตัดกระเบื้อง',
    // AI-4 batch 17: distinct reviewed Thai terms; no cross-team changes.
    'ประแจขันซี่ลวด',
    'เกจวัดมุม',
    'ดอกสว่านเจาะกระจก',
    'ค้อนทุบกระจก',
    // AI-4 batch 18: reviewed distinct practical vocabulary.
    'เลื่อยตัดกิ่ง',
    'ปืนเป่าลมร้อน',
    'ประแจขันหัวเทียน',
    'เกรียงขัดมัน',
    // AI-4 batch 19: reviewed distinct real-world terms.
    'คีมดัดลวด',
    'ตะไบหางหนู',
    'เกจวัดช่องว่าง',
    'ประแจแหวนฟรี',
    // AI-4 batch 20: reviewed distinct equipment and real-world facility types.
    'ประแจหัวบาน',
    'เกจวัดรู',
    'ดอกสว่านขั้นบันได',
    'คีมปากแหลมงอ',
    // AI-4 batch 21: reviewed distinct equipment, apparel and facilities.
    'เกจวัดรอยเชื่อม',
    'เลื่อยตัดกระเบื้อง',
    'เกจวัดแรงดันน้ำ',
    'บล็อกถอดล้อ',
    // AI-4 batch 22: workshop tools with different functions.
    'เกจวัดความหนา',
    'ดอกต๊าปเกลียว',
    'ที่ขูดยาแนว',
    'ประแจตีนกา',
    // AI-4 batch 23: distinct established apparel, vehicles, equipment and facilities.
    'ที่ตัดโซ่จักรยาน',
    'คีมปากกลม',
    'มีดตัดอะคริลิก',
    // AI-4 batch 24: reviewed distinct vocabulary; no game logic changes.
    'คีมย้ำสายโคแอกเชียล',
    'ไขควงกระแทก',
    // AI-4 batch 25: specialized automotive and electronics hand tools.
    'บล็อกถอดไส้กรองน้ำมันเครื่อง',
    'ไขควงหัวสามแฉก',
    'คีมถอดแคลมป์รัดท่อ',
    // AI-4 batch 26: distinct real apparel, measuring equipment, tools and facilities.
    'เหล็กตอกตัวเลข',
    // AI-4 batch 27: screened distinct garments, equipment, workshop tools and places.
    'เกจวัดความตึงสายพาน',
    'ที่ถอดสายนาฬิกา',
    'แปรงขัดร่องยาแนว',
    'ตะไบสี่เหลี่ยม',
    // AI-4 batch 28: dedicated automotive, measurement and electrical tools.
    'ที่ถอดลูกหมาก',
    'เกจวัดแรงดึง',
    // AI-4 batch 29: dedicated measurement and hole-finishing tools.
    'เกจวัดความสูง',
    'คีมย้ำรีเวทนัท',
    // AI-4 batch 30: distinct everyday objects and established facilities.
    'ประแจหกเหลี่ยมหัวบอล',
    'คีมปากแบน',
    'เกจวัดความกลม',
    // AI-4 batch 31: specialized chain-sharpening and electrical/welding tools.
    'แท่นตั้งศูนย์ล้อจักรยาน',
    'คีมถอดฟิวส์',
    'คีมจับลวดเชื่อม',
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
    'สนามแข่งม้า',
    // AI-4 batch 8: real public facilities and workplaces.
    'โรงงานน้ำตาล',
    'ศูนย์อพยพ',
    'สถานีรถไฟฟ้า',
    'โรงเรียนสอนขับรถ',
    // AI-4 batch 9: reviewed distinct place vocabulary.
    'โรงฆ่าสัตว์',
    'สถานีตรวจอากาศ',
    'หอควบคุมการบิน',
    'โรงงานประกอบรถยนต์',
    // AI-4 batch 10: reviewed, distinct vocabulary.
    'สถานีสูบน้ำ',
    'โรงคั่วกาแฟ',
    'ลานจอดเฮลิคอปเตอร์',
    'อู่ซ่อมรถไฟ',
    // AI-4 batch 11: distinct reviewed terms, no changes to game logic.
    'โรงน้ำแข็ง',
    'สถานสงเคราะห์เด็ก',
    'อาคารจอดรถ',
    'ห้องเก็บเอกสาร',
    // AI-4 batch 12: established agricultural, industrial and service facilities.
    'โรงเพาะเห็ด',
    'โรงงานทอผ้า',
    'โรงเก็บเรือ',
    'สถานีชาร์จรถยนต์ไฟฟ้า',
    // AI-4 batch 13: independently named, playable objects and facilities.
    'สนามซ้อมกอล์ฟ',
    'โรงงานผลิตกระดาษ',
    'สถานีเรดาร์',
    'ลานสเก็ตบอร์ด',
    // AI-4 batch 14: reviewed, distinct and playable Thai terms.
    'โรงงานผลิตปุ๋ย',
    'สถานีตรวจสภาพรถ',
    'โรงงานผลิตกระจก',
    'ท่าเรือน้ำลึก',
    // AI-4 batch 15: reviewed distinct Thai vocabulary.
    'โรงงานผลิตสบู่',
    'โรงเก็บรถไฟ',
    'โรงงานผลิตยางรถยนต์',
    'สถานีขนส่งสินค้า',
    // AI-4 batch 16: established real-world facility types.
    'โรงหล่อโลหะ',
    'ลานฝึกขับรถ',
    'สนามแข่งจักรยาน',
    'โรงฝึกมวย',
    // AI-4 batch 17: distinct reviewed Thai terms; no cross-team changes.
    'โรงงานผลิตอิฐ',
    'ท่าเรือเฟอร์รี',
    'โรงเพาะเลี้ยงสัตว์น้ำ',
    'ลานจอดรถบรรทุก',
    // AI-4 batch 18: reviewed distinct practical vocabulary.
    'สนามทดสอบรถยนต์',
    'อู่ต่อเรือ',
    'โรงงานผลิตรองเท้า',
    'โรงงานผลิตอาหารสัตว์',
    // AI-4 batch 19: reviewed distinct real-world terms.
    'โรงคัดแยกพัสดุ',
    'โรงงานผลิตยา',
    'สถานรับบริจาคโลหิต',
    'โรงเรียนการบิน',
    // AI-4 batch 20: reviewed distinct equipment and real-world facility types.
    'โรงงานผลิตปูนซีเมนต์',
    'โรงงานผลิตกระเบื้อง',
    'โรงงานผลิตสี',
    'โรงงานผลิตเฟอร์นิเจอร์',
    // AI-4 batch 21: reviewed distinct equipment, apparel and facilities.
    'โรงงานผลิตแบตเตอรี่',
    'สนามฝึกสุนัข',
    'หอจดหมายเหตุ',
    'โรงเรียนสอนว่ายน้ำ',
    // AI-4 batch 22: established industrial, logistics and monitoring sites.
    'ลานพักตู้คอนเทนเนอร์',
    'โรงงานผลิตน้ำดื่ม',
    'สถานีตรวจวัดแผ่นดินไหว',
    'สถานีเพาะเลี้ยงสัตว์ป่า',
    // AI-4 batch 23: distinct established apparel, vehicles, equipment and facilities.
    'สถานีรับสัญญาณดาวเทียม',
    'โรงบ่มไวน์',
    'โรงซ่อมเครื่องบิน',
    // AI-4 batch 24: reviewed distinct vocabulary; no game logic changes.
    'โรงงานผลิตแก้ว',
    'โรงงานผลิตเครื่องสำอาง',
    'สถานีวิทยุชุมชน',
    // AI-4 batch 25: real facilities distinct from existing generic locations.
    'โรงคัดแยกผลไม้',
    'โรงงานผลิตแผงโซลาร์เซลล์',
    'โรงงานผลิตสายไฟฟ้า',
    'สถานีตรวจวัดคุณภาพอากาศ',
    // AI-4 batch 26: distinct real apparel, measuring equipment, tools and facilities.
    'สนามแข่งโกคาร์ต',
    'โรงงานแปรรูปยางพารา',
    'โรงงานผลิตชิ้นส่วนรถยนต์',
    'สนามฝึกดับเพลิง',
    // AI-4 batch 27: screened distinct garments, equipment, workshop tools and places.
    'พิพิธภัณฑ์รถไฟ',
    'สถานีตำรวจน้ำ',
    'ท่าเรือสำราญ',
    'ลานตากข้าว',
    // AI-4 batch 28: established shelters, teaching and monitoring facilities.
    'สถานพักพิงสัตว์',
    'โรงเรียนสอนดำน้ำ',
    'สถานีตรวจวัดระดับน้ำ',
    'พิพิธภัณฑ์ธนบัตร',
    // AI-4 batch 29: real museums, polar research and manufacturing facilities.
    'พิพิธภัณฑ์หุ่นขี้ผึ้ง',
    'สถานีวิจัยขั้วโลก',
    'โรงงานผลิตเซรามิก',
    'โรงงานผลิตเส้นใยสังเคราะห์',
    'โรงงานผลิตถุงมือยาง',
    // AI-4 batch 30: distinct everyday objects and established facilities.
    'สถานีวิจัยทะเล',
    'โรงเรียนสอนภาษา',
    // AI-4 batch 31: verified real-world international landmarks.
    'หอไอเฟล',
    'ทัชมาฮาล',
    'พิพิธภัณฑ์ลูฟวร์',
    'พระราชวังแวร์ซาย',
  ]
} as const;
