/**
 * Familiar bird names omitted from the original dictionary.
 * Store only actual named birds / species, not synthesized color permutations.
 * Flamingo spelling variants are handled in logic.ts as aliases, NOT as
 * extra rarity/statistics candidates.
 * Reference: https://korat.zoothailand.org/animal_view.php?c_id=48&detail_id=96
 * Reference: https://ubon.zoothailand.org/animal_view.php?c_id=&detail_id=270
 * Reference: https://www.trueplookpanya.com/learning/detail/36116
 */
export const FAMILIAR_BIRD_TERMS: Readonly<Record<'bird'|'animal', readonly string[]>> = {
  "bird": [
    "ฟลามิงโกใหญ่",
    "ฟลามิงโกเล็ก",
    "เพนกวินจักรพรรดิ",
    "เพนกวินราชา",
    "เพนกวินอะเดลี",
    "เพนกวินเจนทู",
    "เพนกวินฮัมโบลต์",
    "เพนกวินแมกเจลแลน",
    "เลิฟเบิร์ด",
    "ลอรี่",
    "ฟอพัส",
    "ค็อกคาเทล",
    "คอนัวร์",
    "คอนัวร์แก้มเขียว",
    "กระตั้วหงอนเหลือง",
    "กระตั้วหงอนขาว",
    "กระตั้วดำ",
    "กระสาปากพลั่ว",
    "ไก่ฟ้า",
    "ไก่ฟ้าสีทอง",
    "ไก่ป่า",
    "ไก่แจ้",
    "ไก่งวง",
    "ไก่ต๊อก",
    "เป็ดแมนดาริน",
    "เป็ดหัวเขียว",
    "เป็ดปักกิ่ง",
    "เป็ดหงส์",
    "หงส์ดำ",
    "หงส์ขาว",
    "เหยี่ยวเพเรกริน",
    "พัฟฟินแอตแลนติก",
    "อัลบาทรอส",
    "มาคอว์ไฮยาซินธ์",
    "มาคอว์สีแดง",
    "มาคอว์สีฟ้า",
    "นางนวลแกลบ",
    "ช้อนหอยแดง",
    "กระเต็นอกขาว",
    "กระเต็นน้อย",
    "กระเรียนมงกุฎเทา",
    "นกพิราบขาว",
    "กระจอกบ้าน",
    "กระจิบหญ้า"
  ],
  "animal": [
    "ฟลามิงโก",
    "ฟลามิงโกใหญ่",
    "ฟลามิงโกเล็ก",
    "เพนกวิน",
    "ไก่งวง",
    "ไก่ฟ้า",
    "เลิฟเบิร์ด",
    "ค็อกคาเทล",
    "คอนัวร์",
    "อัลบาทรอส"
  ]
};
