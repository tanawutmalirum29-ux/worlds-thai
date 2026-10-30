import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');

test('waiting room shows distinct owner and guest letter and heading',()=>{
  assert.match(source,/\{isOwner\?'จ':'ร'\}/);
  assert.match(source,/\{isOwner\?'เจ้าของห้อง':'รอเจ้าของห้องเริ่มเกม'\}/);
});

test('exit only leaves the game after custom confirmation',()=>{
  assert.match(source,/className="exit-btn" onClick=\{e=>\{openerRef.current=e.currentTarget;setExitConfirm\(true\);\}\}/);
  assert.match(source,/role="alertdialog" aria-modal="true"/);
  assert.match(source,/className="popup-cancel" data-initial-focus onClick=\{closeCustomDialog\}/);
  assert.match(source,/className="popup-danger" onClick=\{confirmExit\}/);
  assert.match(source,/function confirmExit\(\)\{\s*setExitConfirm\(false\);\s*void leave\(\);/);
});

test('both room screens use the same CSS selection popup, not OS select',()=>{
  assert.equal((source.match(/\{settingsControls\}/g)||[]).length,2);
  assert.doesNotMatch(source,/<select\b/);
  assert.match(source,/SETTINGS_CHOICES\.map/);
  assert.match(source,/activeChoice\.options\.map/);
  assert.match(source,/aria-pressed=\{value===draftSettings\[activeChoice.field\]\}/);
  assert.match(source,/updateRoomSetting\(activeChoice.field,value\)/);
  assert.match(css,/\.custom-popup-backdrop\{position:fixed/);
  assert.match(css,/\.custom-popup-options\{display:grid/);
});

test('dialog supports keyboard Escape and traps Tab focus',()=>{
  assert.match(source,/event.key==='Escape'/);
  assert.match(source,/event.key==='Tab'/);
  assert.match(source,/openerRef\.current\?\.focus\(\)/);
});
