import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { synthesizeMusicWav, synthesizeTestWav } from '../src/audio-media.ts';

const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const audio = readFileSync(new URL('../src/audio.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

async function inspectWav(blob: Blob, expectedSeconds: number) {
  const raw = await blob.arrayBuffer();
  const data = new DataView(raw);
  const tag = (at: number) => String.fromCharCode(...new Uint8Array(raw, at, 4));
  assert.equal(blob.type, 'audio/wav');
  assert.equal(tag(0), 'RIFF');
  assert.equal(tag(8), 'WAVE');
  assert.equal(tag(12), 'fmt ');
  assert.equal(tag(36), 'data');
  assert.equal(data.getUint16(20, true), 1);
  assert.equal(data.getUint16(22, true), 1);
  assert.equal(data.getUint32(24, true), 16000);
  assert.equal(data.getUint16(34, true), 16);
  assert.equal(data.getUint32(40, true), Math.round(16000 * expectedSeconds) * 2);
  const samples = new Int16Array(raw, 44);
  assert.ok(samples.some(v => Math.abs(v) > 5000), 'WAV should have audible nonzero PCM samples');
}

test('background soundtrack is a real, audible 8-second WAV', async () => {
  await inspectWav(synthesizeMusicWav(), 8);
});

test('direct sound test synthesizes three bright PCM beeps', async () => {
  await inspectWav(synthesizeTestWav(), 0.85);
});

test('music tries HTMLMediaElement on user gesture and falls back to oscillators', () => {
  assert.match(audio, /new Audio\(this\.musicUrl\)/);
  assert.match(audio, /this\.media\.play\(\)/);
  assert.match(audio, /this\.startSynthMusic\(\)/);
  assert.match(audio, /synthesizeMusicWav\(\)/);
  assert.match(audio, /void started\.then\(/);
  assert.match(audio, /this\.media\?\.pause\(\)/);
  assert.match(audio, /URL\.revokeObjectURL\(this\.musicUrl\)/);
});

test('sound test is a direct click with mobile gesture unlock and visible status', () => {
  assert.match(main, /document\.addEventListener\('touchstart',unlock/);
  assert.match(main, /document\.addEventListener\('click',unlock\)/);
  assert.match(main, /className="sound-test" aria-label="ทดสอบเสียงเพลงและเอฟเฟกต์"/);
  assert.match(main, /onClick=\{\(\)=>void testSound\(\)\}/);
  assert.match(main, /const started=await audio\.test\(\)/);
  assert.match(main, /role="status" aria-live="polite"/);
  assert.match(css, /\.sound-test\{display:inline-flex/);
  assert.match(css, /@media\(max-width:720px\)\{/);
});
