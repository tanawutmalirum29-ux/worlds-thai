/**
 * AI-1 Nature Dictionary: reviewed, category-specific Thai names.
 * The gameplay's existing category-prefix canonicalization remains authoritative.
 * Names here are distinct from the main dictionary as of 31 October 2026.
 */
export const AI1_NATURE_TERMS: Readonly<Record<string, readonly string[]>> = {
  animal: [
    'เมียร์แคต',
    'อาร์มาดิลโล',
    'หมาไน',
  ],
  bird: [
    'นกกะรางหัวขวาน',
    'นกเป็ดผี',
  ],
  fish: [
    'ปลาสิงโต',
    'ปลาตีน',
  ],
  insect: [
    'แมลงช้างปีกใส',
    'แมลงกระชอน',
  ],
  plant: [
    'แหนแดง',
    'หญ้าแพรก',
    'กกสามเหลี่ยม',
    'สาหร่ายหางกระรอก',
  ],
  tree: [
    'ประดู่ป่า',
    'ยมหอม',
  ],
  flower: [
    'บัวดิน',
    'ชมนาด',
  ],
  nature: [
    'น้ำขึ้นน้ำลง',
  ],
};
