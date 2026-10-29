import { defineFunction } from '@aws-amplify/backend';
export const game = defineFunction({
  name: 'worlds-thai-game',
  entry: './handler.ts',
  timeoutSeconds: 15,
  memoryMB: 256
});
