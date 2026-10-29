import {canonicalAnswer} from '../amplify/functions/game/logic.ts';

/** Curated operational tags; not new playable categories. */
export const DESSERT_SUBTYPES=[
 {id:'thai',label:'ขนมไทยดั้งเดิม'},
 {id:'baked',label:'ขนมอบ'},
 {id:'fried',label:'ขนมทอด'},
 {id:'cold',label:'ขนมเย็น'},
 {id:'international',label:'ขนมต่างประเทศ'},
 {id:'unreviewed',label:'ยังไม่จัดประเภทย่อย'}
] as const;
export type DessertSubtype=(typeof DESSERT_SUBTYPES)[number]['id'];
const tags:Record<Exclude<DessertSubtype,'unreviewed'>,readonly string[]>={
 thai:[
  'กล้วยบวชชี','กล้วยเชื่อม','กะละแม','จ่ามงกุฎ','จาวตาลเชื่อม',
  'ตะโก้','ตังเม','เต้าฮวย','เต้าทึง','ทองหยิบ','ทองหยอด','ทองม้วน','ทับทิมกรอบ',
  'บัวลอย','บ้าบิ่น','ปุยฝ้าย','สาคู','สังขยา','อาลัว','อัญชันกะทิ',
  'ข้าวเหนียวมะม่วง','ข้าวต้มมัด','ทองเอก','อาโป','ข้าวเหนียวทุเรียน',
  'ข้าวเหนียวสังขยา','ข้าวเหนียวแก้ว','ข้าวเหนียวแดง','ข้าวเหนียวเปียกลำไย',
  'ข้าวเหนียวเปียกข้าวโพด','ข้าวตู','ข้าวแต๋น','ข้าวพอง','ข้าวเกรียบว่าว',
  'ข้าวเหนียวหน้ากุ้ง','ข้าวเหนียวหน้าปลาแห้ง','ข้าวเหนียวถั่วดำ',
  'ข้าวเหนียวเปียกเผือก','ข้าวเหนียวหน้านวล',
  'ขนมครก','ขนมชั้น','ขนมถ้วย','ขนมตาล','ขนมหม้อแกง','ขนมเปียกปูน',
  'ขนมกล้วย','ขนมฟักทอง','ขนมสอดไส้','ขนมเบื้อง','ขนมต้ม','ขนมผิง',
  'ขนมถังแตก','ขนมดอกลำดวน','ขนมเทียน','ขนมเข่ง','ขนมถั่วแปบ',
  'ขนมด้วง','ขนมฝักบัว','ขนมกรวย','ขนมขี้หนู','ขนมตะโก้',
  'ขนมถ้วยฟู','ขนมข้าวโพด','โรตีสายไหม'
 ],
 baked:[
  'คุกกี้','เค้ก','คัพเค้ก','ชีสเค้ก','ชูครีม','ดาคัวส์',
  'บราวนี','พายแอปเปิล','พายฟักทอง','มาการอง','ราสป์เบอร์รีทาร์ต',
  'สตรอว์เบอร์รีชีสเค้ก','เอแคลร์','บัตเตอร์เค้ก','ขนมไข่'
 ],
 fried:[
  'โดนัท','นมสดทอด','ปาท่องโก๋','ข้าวเม่าทอด','ไข่หงส์',
  'ขนมดอกจอก','ขนมกง','ขนมไข่นกกระทา'
 ],
 cold:['น้ำแข็งไส','บิงซู','ไอศกรีม','อัฟโฟกาโต'],
 international:[
  'กุหลาบจามุน','ช็อกโกแลต','คัสตาร์ด','พุดดิ้ง','มูส',
  'มาร์ชเมลโลว์','โรตี'
 ]
};
const types=new Map<string,DessertSubtype>();
for(const [type,names] of Object.entries(tags) as [DessertSubtype,readonly string[]][])
  for(const name of names)types.set(canonicalAnswer(name,'dessert'),type);
export function dessertSubtype(word:string):DessertSubtype {
  return types.get(canonicalAnswer(word,'dessert'))||'unreviewed';
}
export function dessertSubtypeLabel(type:DessertSubtype):string {
  return DESSERT_SUBTYPES.find(x=>x.id===type)?.label||'ยังไม่จัดประเภทย่อย';
}
