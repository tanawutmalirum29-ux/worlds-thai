import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { game } from '../functions/game/resource';

const schema = a.schema({
  // A server-calculated, public, non-sensitive game snapshot.
  GameEvent: a.customType({
    roomId: a.string().required(),
    snapshot: a.json().required()
  }),
  getGame: a.query()
    .arguments({ roomId: a.string().required() })
    .returns(a.json())
    .authorization(allow => [allow.guest()])
    .handler(a.handler.function(game)),
  gameAction: a.mutation()
    .arguments({
      action: a.string().required(),
      roomId: a.string(),
      name: a.string(),
      answers: a.json(),
      settings: a.json()
    })
    .returns(a.ref('GameEvent'))
    .authorization(allow => [allow.guest()])
    .handler(a.handler.function(game)),
  // No custom AppSync subscription: Amplify Gen 2 disallows guest IAM
  // authorization on a.handler.custom. Multiplayer uses guest-authorized
  // server polling and Lambda-owned game state instead.
});
export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema, authorizationModes: { defaultAuthorizationMode: 'iam' } });
