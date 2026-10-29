/** AppSync AWSJSON input variables require JSON strings rather than JS objects. */
export function encodeGamePayload(answers?:Record<string,string>, settings?:{rounds:number;categories:number;seconds:number}) {
  return {
    ...(answers!==undefined?{answers:JSON.stringify(answers)}:{}),
    ...(settings!==undefined?{settings:JSON.stringify(settings)}:{})
  };
}
