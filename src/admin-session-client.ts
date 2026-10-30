import {Amplify} from 'aws-amplify';
import {generateClient} from 'aws-amplify/data';

export const ADMIN_SESSION_STORAGE_KEY='khamwai-admin-session-v1';
export type SavedAdminSession={token:string;expiresAt:number};
export type AdminSessionReply={valid:boolean;token?:string;expiresAt?:number|null;revokedAll?:boolean};
type Action='login'|'check'|'logout'|'logoutAll';
const TOKEN_PATTERN=/^[a-f0-9]{64}$/;
let clientPromise:Promise<any>|null=null;

function appClient():Promise<any>{
  if(!clientPromise)clientPromise=(async()=>{
    const response=await fetch('/amplify_outputs.json',{cache:'no-store'});
    if(!response.ok)throw new Error('ไม่พบการตั้งค่า AWS Amplify');
    Amplify.configure(await response.json());
    return generateClient() as any;
  })().catch(error=>{clientPromise=null;throw error;});
  return clientPromise;
}
export async function adminSessionRequest(
  action:Action,token?:string,pin?:string
):Promise<AdminSessionReply>{
  const client=await appClient();
  const result=await client.mutations.adminSession(
    {action,...(token?{token}:{}),...(pin?{pin}:{})},{authMode:'identityPool'});
  if(result.errors?.length)throw new Error(result.errors.map((e:{message:string})=>e.message).join('; '));
  const value=typeof result.data==='string'?JSON.parse(result.data):result.data;
  if(!value || typeof value.valid!=='boolean')throw new Error('ข้อมูลเซสชันไม่ถูกต้อง');
  return value as AdminSessionReply;
}
/** Read only a shaped, unexpired opaque token; never persist the PIN. */
export function parseAdminSession(value:unknown,now=Date.now()):SavedAdminSession|null{
  if(!value||typeof value!=='object')return null;
  const record=value as Partial<SavedAdminSession>;
  if(!TOKEN_PATTERN.test(String(record.token||'')) ||
    typeof record.expiresAt!=='number'||!Number.isFinite(record.expiresAt)||
    record.expiresAt<=now||record.expiresAt>now+31*86400_000)return null;
  return {token:record.token!,expiresAt:record.expiresAt};
}
export function readAdminSession(now=Date.now()):SavedAdminSession|null{
  try {
    const value=localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if(!value)return null;
    const parsed=parseAdminSession(JSON.parse(value),now);
    if(!parsed)localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    return parsed;
  }catch{return null;}
}
export function saveAdminSession(session:SavedAdminSession):void{
  try{localStorage.setItem(ADMIN_SESSION_STORAGE_KEY,JSON.stringify(session));}
  catch{/* Session still works until the tab closes if local storage is blocked. */}
}
export function clearAdminSession():void{
  try{localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);}
  catch{/* Private browsing may not permit localStorage. */}
}
