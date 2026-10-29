import {Amplify} from 'aws-amplify';
import {fetchAuthSession,signIn,signOut} from 'aws-amplify/auth';
import {generateClient} from 'aws-amplify/data';
import type {RarityMetaRecord} from './admin-rarity-data.ts';

let configured=false;
async function configure(){
  if(configured)return;
  const response=await fetch('/amplify_outputs.json',{cache:'no-store'});
  if(!response.ok)throw new Error('ไม่พบการตั้งค่า AWS Amplify — ตรวจการ Deploy backend');
  Amplify.configure(await response.json());
  configured=true;
}
export async function hasRarityAdminSession():Promise<boolean>{
  await configure();
  try{
    const session=await fetchAuthSession();
    const groups=session.tokens?.idToken?.payload?.['cognito:groups'];
    return Array.isArray(groups) && groups.includes('RARITY_ADMINS');
  }catch{return false;}
}
export async function loginRarityAdmin(email:string,password:string):Promise<void>{
  await configure();
  const attempt=await signIn({username:email.trim(),password});
  if(attempt.nextStep.signInStep!=='DONE')throw new Error(
    'บัญชีต้องดำเนินการยืนยัน/เปลี่ยนรหัสผ่านใน Cognito ให้เสร็จก่อน'
  );
  if(!(await hasRarityAdminSession())){
    await signOut();
    throw new Error('บัญชีนี้ไม่ได้อยู่ในกลุ่ม RARITY_ADMINS');
  }
}
export async function logoutRarityAdmin():Promise<void>{await signOut();}
export async function queryRarityAdmin():Promise<RarityMetaRecord[]>{
  await configure();
  if(!(await hasRarityAdminSession()))throw new Error('ต้องล็อกอินด้วยบัญชี RARITY_ADMINS');
  const client=(generateClient as any)();
  const rows:RarityMetaRecord[]=[];
  let cursor:string|null=null;
  const seen=new Set<string>();
  for(let page=0;page<40;page++){
    const response:{data:unknown;errors?:{message:string}[]}=await client.queries.getAdminRarity(
      cursor?{cursor}:{},{authMode:'userPool'}
    );
    if(response.errors?.length)throw new Error(response.errors.map((v:{message:string})=>v.message).join('; '));
    const payload:{items?:RarityMetaRecord[];nextToken?:string|null}|null=(typeof response.data==='string'?JSON.parse(response.data):response.data) as {items?:RarityMetaRecord[];nextToken?:string|null}|null;
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
