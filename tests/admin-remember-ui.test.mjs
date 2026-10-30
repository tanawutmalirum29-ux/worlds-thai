import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const admin=readFileSync(new URL('../src/admin.tsx',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/admin-session-client.ts',import.meta.url),'utf8');
const backend=readFileSync(new URL('../amplify/backend.ts',import.meta.url),'utf8');
const schema=readFileSync(new URL('../amplify/data/resource.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/admin.css',import.meta.url),'utf8');

test('admin remembers an opaque token for 30 days, not the access PIN',()=>{
  assert.match(client,/ADMIN_SESSION_STORAGE_KEY='khamwai-admin-session-v1'/);
  assert.match(client,/localStorage\.setItem\(ADMIN_SESSION_STORAGE_KEY,JSON\.stringify\(session\)\)/);
  assert.match(client,/record\.expiresAt<=now/);
  assert.doesNotMatch(client,/localStorage\.setItem\([^\n]*pin/);
  assert.match(admin,/const \[sessionChecking,setSessionChecking\]/);
  assert.match(admin,/adminSessionRequest\('login',undefined,pin\)/);
  assert.match(admin,/adminSessionRequest\('check',saved\.token\)/);
  assert.match(admin,/adminSessionRequest\('check',checkedToken\)/);
  assert.match(admin,/window\.setInterval\(\(\)=>void verify\(\),15000\)/);
  assert.match(admin,/window\.addEventListener\('storage',onStorage\)/);
});

test('global device signout needs explicit consent and a server-confirmed revocation',()=>{
  assert.match(admin,/ออกจากระบบทุกเครื่อง/);
  assert.match(admin,/confirmLogoutAll/);
  assert.match(admin,/role="dialog" aria-modal="true"/);
  assert.match(admin,/adminSessionRequest\('logoutAll',session\.token\)/);
  assert.match(admin,/if\(!result\.revokedAll\)throw/);
  assert.match(admin,/adminSessionRequest\('logout',session\.token\)/);
  assert.match(schema,/adminSession: a\.mutation\(\)/);
  assert.match(backend,/AdminAccessSessions/);
  assert.match(backend,/ADMIN_SESSIONS_TABLE/);
  assert.match(css,/\.admin-confirm-backdrop\{position:fixed/);
});

test('frontend no longer uses public PIN as its local authorization source',()=>{
  assert.doesNotMatch(admin,/pin!==EXPORT_PROMPT_CODE/);
  assert.doesNotMatch(admin,/import \{EXPORT_PROMPT_CODE/);
});
