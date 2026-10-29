import { defineAuth } from '@aws-amplify/backend';

// Amplify Gen 2 enables Cognito identity-pool guest credentials by default.
// Email sign-in is defined for a future opt-in account mode; game needs no login.
export const auth = defineAuth({ loginWith: { email: true } });
