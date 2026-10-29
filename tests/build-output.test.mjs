import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const admin='khw-admin-14c2a0bd51d3fb0266f2ce0c9beb67c16dbf1e4700c5efaa0842e1a5.html';
test('Vite production build emits both player and unlinked admin HTML',(t)=>{
  if(!existsSync(resolve('dist/index.html'))){t.skip('not built yet; checked again after vite build');return;}
  assert.ok(existsSync(resolve('dist/index.html')),'missing main game HTML');
  assert.ok(existsSync(resolve('dist',admin)),'missing admin HTML output');
  const html=readFileSync(resolve('dist',admin),'utf8');
  assert.match(html,/KHAMWAI|Word Workspace/);
  assert.doesNotMatch(readFileSync(resolve('dist/index.html'),'utf8'),/khw-admin-/);
});

test('Share preview is an actual 1200x630 PNG and metadata is in the initial HTML',(t)=>{
  const game=resolve('dist/index.html'),image=resolve('dist/share-card.png');
  if(!existsSync(game)){t.skip('not built yet; checked again after vite build');return;}
  const html=readFileSync(game,'utf8');
  assert.match(html,/<meta property="og:image" content="[^"]+\/share-card\.png"/);
  assert.match(html,/<meta name="twitter:card" content="summary_large_image"/);
  assert.match(html,/<meta property="og:image:width" content="1200"/);
  assert.ok(existsSync(image),'missing social PNG in Vite output');
  const png=readFileSync(image);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),1200);
  assert.equal(png.readUInt32BE(20),630);
});
