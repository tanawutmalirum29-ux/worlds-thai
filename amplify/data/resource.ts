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
      answers: a.json()
    })
    .returns(a.ref('GameEvent'))
    .authorization(allow => [allow.guest()])
    .handler(a.handler.function(game)),
  gameUpdated: a.subscription()
    .for(a.ref('gameAction'))
    .arguments({ roomId: a.string().required() })
    .handler(a.handler.custom({ entry: './subscription.js' }))
    .authorization(allow => [allow.guest()])
});
export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema, authorizationModes: { defaultAuthorizationMode: 'iam' } });
