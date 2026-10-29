import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

test('homepage keeps room controls and removes redundant feature pills', () => {
  assert.match(source, /className="room-mode-switch"/);
  assert.match(source, /สร้างห้อง<\/button>/);
  assert.match(source, /เข้าร่วมห้อง<\/button>/);
  assert.doesNotMatch(source, /className="feature-chips"/);
});

test('mobile letter and live countdown stay pinned while answering', () => {
  assert.match(source, /game-layout-playing/);
  assert.match(source, /topbar-playing/);
  assert.match(source, /className="challenge-banner"/);
  assert.match(source, /className="time-box"/);
  assert.match(styles, /\.game-layout-playing \.challenge-banner\{position:sticky;top:env\(safe-area-inset-top,0px\);z-index:6/);
  assert.match(styles, /\.app-shell\{overflow:clip\}/);
});

test('mobile introduction does not reserve an empty decorative gap', () => {
  assert.match(styles, /\.welcome-copy\{padding:0\}/);
  assert.match(styles, /\.welcome-copy \.floating-letters\{position:relative/);
});

test('room setup controls use equal-height single-line triggers and a stable mode slot', () => {
  assert.match(source, /className="room-intro"/);
  assert.match(source, /className="room-mode-content"/);
  assert.match(styles, /\.room-mode-content\{height:365px;display:flex;flex-direction:column;min-width:0\}/);
  assert.match(styles, /\.settings-choice-trigger\{height:52px;min-height:52px;max-height:52px;white-space:nowrap;/);
  assert.match(styles, /\.settings-choice-label\{min-height:34px;/);
  assert.match(styles, /html\{scrollbar-gutter:stable\}/);
});

test('audio messages float outside main and are dismissed without layout shift', () => {
  assert.match(source, /className="audio-toast-region" aria-live="polite"/);
  assert.match(source, /window\.setTimeout\(\(\)=>setAudioNotice\(/);
  assert.match(source, /3200\)/);
  assert.match(styles, /\.audio-toast-region\{position:fixed;/);
  assert.match(styles, /pointer-events:none/);
  assert.doesNotMatch(source, /<main className="container">\s*\{audioNotice/);
});
