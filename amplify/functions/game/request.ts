// Amplify Gen 2 function resolvers can supply fieldName at the top level.
// The old handler dereferenced event.info.fieldName and crashed in production.
export function resolveOperation(event: any):'getGame'|'listRooms'|'getWordStats'|'gameAction' {
  const field=event?.fieldName ?? event?.info?.fieldName;
  if(field==='getGame'||field==='gameAction'||field==='listRooms'||field==='getWordStats')return field;
  const args=event?.arguments ?? event;
  if(args && typeof args==='object') {
    if(args.request==='stats')return 'getWordStats';
    if(typeof args.action==='string')return 'gameAction';
    if(typeof args.roomId==='string')return 'getGame';
    if (event?.arguments && typeof event.arguments==='object') return 'listRooms';
  }
  throw new Error('UNKNOWN_OPERATION');
}
