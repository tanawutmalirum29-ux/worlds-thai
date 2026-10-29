/** Validate a complete invitation URL, not a typed room code. */
export const ROOM_ID=/^room-[a-f0-9]{20}$/;
export function parseInviteUrl(value:string, appUrl:string):string|null {
  try {
    const url=new URL(value.trim());
    const app=new URL(appUrl);
    if(url.origin!==app.origin || url.pathname!==app.pathname || !['http:','https:'].includes(url.protocol))return null;
    const matches=url.searchParams.getAll('match');
    return matches.length===1 && ROOM_ID.test(matches[0]) ? matches[0] : null;
  }catch{return null;}
}
/** AppSync AWSJSON input variables are serialized JSON strings. */
export function encodeGamePayload(answers?:Record<string,string>, settings?:{rounds:number;categories:number;seconds:number}) {
  return {
    ...(answers!==undefined?{answers:JSON.stringify(answers)}:{}),
    ...(settings!==undefined?{settings:JSON.stringify(settings)}:{})
  };
}
