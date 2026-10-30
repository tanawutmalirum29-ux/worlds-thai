// Amplify Gen 2 function resolvers can supply fieldName at the top level.
// The old handler dereferenced event.info.fieldName and crashed in production.
export function resolveOperation(event: any):'getGame'|'listRooms'|'getWordStats'|'adminSession'|'gameAction' {
  const field=event?.fieldName ?? event?.info?.fieldName;
  if(field==='getGame'||field==='gameAction'||field==='listRooms'||field==='getWordStats'||field==='adminSession')return field;
  const args=event?.arguments ?? event;
  if(args && typeof args==='object') {
    if(args.request==='stats'||args.request==='dessert-suggestions'||args.request==='rarity')return 'getWordStats';
    if(['login','check','logout','logoutAll'].includes(args.action))return 'adminSession';
    if(typeof args.action==='string')return 'gameAction';
    if(typeof args.roomId==='string')return 'getGame';
    if (event?.arguments && typeof event.arguments==='object') return 'listRooms';
  }
  throw new Error('UNKNOWN_OPERATION');
}
