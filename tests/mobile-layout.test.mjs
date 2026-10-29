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
