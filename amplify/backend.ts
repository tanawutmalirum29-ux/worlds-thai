import { defineBackend } from '@aws-amplify/backend';
import { AttributeType, BillingMode, Table, RemovalPolicy } from 'aws-cdk-lib/aws-dynamodb';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { game } from './functions/game/resource';

const backend = defineBackend({ auth, data, game });
const stack = backend.createStack('game-state');
const table = new Table(stack, 'PublicMatches', {
  partitionKey: { name: 'id', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'ttl',
  removalPolicy: RemovalPolicy.RETAIN
});
table.grantReadWriteData(backend.game.resources.lambda);
backend.game.resources.lambda.addEnvironment('MATCHES_TABLE', table.tableName);
