import {Amplify} from 'aws-amplify';
import {generateClient} from 'aws-amplify/data';
import type {RarityMetaRecord} from './admin-rarity-data.ts';

// No second sign-in: the vocabulary workspace's existing front-end PIN
// controls panel visibility. This is NOT backend authorization; the response
// contains public aggregates only, never individual player observation rows.
let configured=false;
async function configure(){
  if(configured)return;
  const response=await fetch('/amplify_outputs.json',{cache:'no-store'});
  if(!response.ok)throw new Error('ไม่พบการตั้งค่า AWS Amplify — ตรวจการ Deploy backend');
  Amplify.configure(await response.json());
  configured=true;
}
type RarityResponse={items?:RarityMetaRecord[];nextToken?:string|null};
export async function queryRarityAdmin():Promise<RarityMetaRecord[]>{
  await configure();
  const client=(generateClient as any)();
  const rows:RarityMetaRecord[]=[];
  let cursor:string|null=null;
  const seen=new Set<string>();
  for(let page=0;page<40;page++){
    const response:{data:unknown;errors?:{message:string}[]}=await client.queries.getWordStats(
      {request:'rarity',...(cursor?{cursor}:{})},{authMode:'identityPool'}
    );
    if(response.errors?.length)throw new Error(response.errors.map(v=>v.message).join('; '));
    const payload:RarityResponse|null=(typeof response.data==='string'?
      JSON.parse(response.data):response.data) as RarityResponse|null;
    if(!Array.isArray(payload?.items))throw new Error('เซิร์ฟเวอร์ตอบกลับข้อมูลความหายากผิดรูปแบบ');
    for(const item of payload.items){
      if(!item||typeof item.letter!=='string'||typeof item.category!=='string')continue;
      const key=item.category+'#'+item.letter;
      if(seen.has(key))throw new Error('ข้อมูลความหายากซ้ำระหว่างหน้าที่โหลด');
      seen.add(key);
      rows.push(item);
    }
    cursor=payload.nextToken||null;
    if(!cursor)return rows;
  }
  throw new Error('ข้อมูลมากเกินจำนวนหน้าสูงสุด ไม่แสดงข้อมูลบางส่วนเพื่อหลีกเลี่ยงความเข้าใจผิด');
}
