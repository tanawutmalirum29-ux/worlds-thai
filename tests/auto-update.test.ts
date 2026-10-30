import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CURRENT_BUILD_ID,BUILD_CHECK_INTERVAL_MS,VERSION_QUERY_KEY,
  parseDeployedBuild,isNewerBuild,safeToAutoUpdate,buildRefreshUrl
} from '../src/auto-update.ts';

const a='a'.repeat(32),b='b'.repeat(32);
test('build version must be a valid generated ID, not an HTML fallback or stale payload',()=>{
  assert.equal(CURRENT_BUILD_ID,'','node tests do not run through Vite define');
  assert.equal(BUILD_CHECK_INTERVAL_MS,35_000);
  assert.equal(parseDeployedBuild({build:a}),a);
  assert.equal(parseDeployedBuild({build:b}),b);
  for(const payload of [{build:'v1'}, {build:'../../index.html'}, {build:123},null,{},'html']){
    assert.equal(parseDeployedBuild(payload),null,JSON.stringify(payload));
  }
  assert.equal(isNewerBuild(a,b),true);
  assert.equal(isNewerBuild(a,a),false);
  assert.equal(isNewerBuild('',b),false);
  assert.equal(isNewerBuild(a,null),false);
});

test('active room, pending saved room or busy transition prevents automatic reload',()=>{
  assert.equal(safeToAutoUpdate('',null,false),true);
  assert.equal(safeToAutoUpdate('room-a',null,false),false);
  assert.equal(safeToAutoUpdate('', 'room-a',false),false);
  assert.equal(safeToAutoUpdate('',null,true),false);
});

test('fresh navigation busts cached HTML and keeps current path and hash',()=>{
  assert.equal(VERSION_QUERY_KEY,'__khamwai_build');
  assert.equal(buildRefreshUrl('https://example.com/?foo=bar#game',b),
    'https://example.com/?foo=bar&__khamwai_build='+b+'#game');
});

test('client polls no-cache version manifest, resumes on focus and never reloads mid-match',()=>{
  const game=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
  assert.match(game,/fetch\('\/version\.json\?checked='\+Date\.now\(\),\{cache:'no-store'\}\)/);
  assert.match(game,/window\.setInterval\(\(\)=>void check\(\),BUILD_CHECK_INTERVAL_MS\)/);
  assert.match(game,/document\.addEventListener\('visibilitychange',onResume\)/);
  assert.match(game,/window\.addEventListener\('focus',onResume\)/);
  assert.match(game,/window\.addEventListener\('online',onResume\)/);
  assert.match(game,/safeToAutoUpdate\(roomRef\.current,localStorage\.getItem\('khamwai-active-room'\)/);
  assert.match(game,/if\(pendingBuildRef\.current\)applyGameUpdate\(pendingBuildRef\.current\)/);
  assert.match(game,/window\.location\.replace\(buildRefreshUrl/);
  assert.match(vite,/define:\{__KHAMWAI_BUILD_ID__:JSON\.stringify\(buildId\)\}/);
  assert.match(vite,/fileName:'version\.json'/);
});
