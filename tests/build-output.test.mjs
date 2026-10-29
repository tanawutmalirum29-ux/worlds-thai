import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const admin='khw-admin-14c2a0bd51d3fb0266f2ce0c9beb67c16dbf1e4700c5efaa0842e1a5.html';
test('Vite production build emits both player and unlinked admin HTML',(t)=>{
  // Unit tests run before production build; verify output only after build.
  if(!existsSync(resolve('dist/index.html'))){t.skip('not built yet; checked again after vite build');return;}
  assert.ok(existsSync(resolve('dist/index.html')),'missing main game HTML');
  assert.ok(existsSync(resolve('dist',admin)),'missing admin HTML output');
  const html=readFileSync(resolve('dist',admin),'utf8');
  assert.match(html,/KHAMWAI|Word Workspace/);
  assert.doesNotMatch(readFileSync(resolve('dist/index.html'),'utf8'),/khw-admin-/);
});
