import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('guest game schema avoids unsupported AppSync custom subscription handler', () => {
  const schema = readFileSync(new URL('../amplify/data/resource.ts', import.meta.url), 'utf8');
  assert.match(schema, /getGame:\s*a\.query\(\)/);
  assert.match(schema, /gameAction:\s*a\.mutation\(\)/);
  assert.match(schema, /\.authorization\(allow => \[allow\.guest\(\)\]\)/);
  assert.ok(!schema.includes('getAdminRarity:'));
  assert.ok(!schema.includes('RARITY_ADMINS'));
  assert.ok(!schema.includes('a.handler.custom('),
    'Amplify Gen 2 CDK Assembly rejects guest IAM auth with custom JS handlers');
  assert.ok(!schema.includes('gameUpdated: a.subscription('),
    'Do not deploy a subscription until a supported guest IAM handler has been tested');
});

test('multiplayer UI has a live polling path without a subscription', () => {
  const ui = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.match(ui, /api\.queries\.getGame\(\{roomId:id\}/);
  assert.match(ui, /setInterval\(refresh,2000\)/);
  assert.match(ui, /call\('pulse',id\)/);
  assert.ok(!ui.includes('api.subscriptions.gameUpdated'));
});
