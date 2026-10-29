import { util, extensions } from '@aws-appsync/utils';
export function request() { return { payload: null }; }
export function response(ctx) {
  extensions.setSubscriptionFilter(util.transform.toSubscriptionFilter({ roomId: { eq: ctx.args.roomId } }));
  return null;
}
