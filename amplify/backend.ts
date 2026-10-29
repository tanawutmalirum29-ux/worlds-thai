import { defineBackend } from '@aws-amplify/backend';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
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
// Durable aggregate usage data intentionally has no TTL; match records still expire.
const wordStats = new Table(stack, 'WordUsageStats', {
  partitionKey: { name:'id', type:AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  removalPolicy: RemovalPolicy.RETAIN
});
table.grantReadWriteData(backend.game.resources.lambda);
wordStats.grantReadWriteData(backend.game.resources.lambda);
// Pending, anonymous suggestions expire; original usage statistics never expire.
const wordSuggestions = new Table(stack,'DessertSuggestions',{
  partitionKey:{name:'id',type:AttributeType.STRING},
  billingMode:BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute:'ttl',
  removalPolicy:RemovalPolicy.RETAIN
});
wordSuggestions.grantReadWriteData(backend.game.resources.lambda);
(backend.game.resources.lambda as LambdaFunction).addEnvironment('MATCHES_TABLE', table.tableName);

(backend.game.resources.lambda as LambdaFunction).addEnvironment('WORD_STATS_TABLE',wordStats.tableName);

(backend.game.resources.lambda as LambdaFunction).addEnvironment('WORD_SUGGESTIONS_TABLE',wordSuggestions.tableName);
