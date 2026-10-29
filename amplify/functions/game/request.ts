// Amplify Gen 2 function resolvers can supply fieldName at the top level.
// The old handler dereferenced event.info.fieldName and crashed in production.
export function resolveOperation(event: any):'getGame'|'gameAction' {
  const field=event?.fieldName ?? event?.info?.fieldName;
  if(field==='getGame'||field==='gameAction')return field;
  const args=event?.arguments ?? event;
  if(args && typeof args==='object') {
    if(typeof args.action==='string')return 'gameAction';
    if(typeof args.roomId==='string')return 'getGame';
  }
  throw new Error('UNKNOWN_OPERATION');
}
