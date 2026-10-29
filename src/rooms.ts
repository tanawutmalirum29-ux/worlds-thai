/** AppSync AWSJSON input variables require JSON strings rather than JS objects. */
export function encodeGamePayload(answers?:Record<string,string>, settings?:{rounds:number;categories:number;seconds:number;mode?:'letter'|'category'}) {
  return {
    ...(answers!==undefined?{answers:JSON.stringify(answers)}:{}),
    ...(settings!==undefined?{settings:JSON.stringify(settings)}:{})
  };
}
