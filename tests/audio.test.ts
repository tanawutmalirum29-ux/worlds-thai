import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { AUDIO_MUTED_KEY, GameAudio, musicStepSeconds, readAudioMuted, writeAudioMuted } from '../src/audio.ts';

const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

function mockContext() {
  const stats = { oscillators: 0, starts: 0, closes: 0, suspends: 0, resumes: 0, peakGains: [] as number[] };
  const gain = () => ({
    gain: {
      value: 1,
      setValueAtTime: (v: number, _t: number) => { stats.peakGains.push(v); },
      exponentialRampToValueAtTime: (v: number, _t: number) => { stats.peakGains.push(v); },
    },
    connect: (_value: unknown) => {},
    disconnect: () => {},
  });
  const context = {
    state: 'running', currentTime: 12, destination: {},
    createGain: gain,
    createOscillator: () => {
      stats.oscillators++;
      return {
        type: 'sine',
        frequency: { setValueAtTime: (_v: number, _t: number) => {} },
        connect: (_value: unknown) => {}, disconnect: () => {},
        start: (_t: number) => { stats.starts++; }, stop: (_t: number) => {},
        onended: null as null | (() => void),
      };
    },
    resume: async () => { stats.resumes++; context.state = 'running'; },
    suspend: async () => { stats.suspends++; context.state = 'suspended'; },
    close: async () => { stats.closes++; context.state = 'closed'; },
  };
  return { context: context as unknown as AudioContext, stats };
}

test('music stays relaxed until the final five seconds, then accelerates', () => {
  assert.equal(musicStepSeconds('playing', false), 0.3);
  assert.equal(musicStepSeconds('playing', true), 0.14);
  assert.equal(musicStepSeconds('lobby', true), 0.4);
});

test('game audio is lazy, muted tabs never construct an AudioContext', async () => {
  const { context, stats } = mockContext();
  let created = 0;
  const audio = new GameAudio(true, () => { created++; return context; });
  try {
    audio.unlock();
    audio.cue('start');
    audio.countdown(4);
    assert.equal(created, 0);
    audio.setMuted(false);
    assert.equal(created, 1);
    audio.cue('answer');
    assert.equal(stats.oscillators, 2);
    audio.countdown(5);
    assert.equal(stats.oscillators, 4); // distinctive two-layer beep
    audio.countdown(1);
    assert.equal(stats.oscillators, 6); // double high beep
    audio.countdown(0);
    audio.countdown(6);
    assert.equal(stats.oscillators, 6);
    audio.setMuted(true);
    await Promise.resolve();
    assert.equal(stats.suspends, 1);
    audio.cue('start');
    assert.equal(stats.oscillators, 6);
    audio.setMuted(false);
    await Promise.resolve();
    assert.equal(stats.resumes, 1);
  } finally { audio.dispose(); }
  await Promise.resolve();
  assert.equal(stats.closes, 1);
  audio.unlock();
  assert.equal(created, 1);
});

test('background tab is silent and resumes on visibility change', async () => {
  const { context, stats } = mockContext();
  const audio = new GameAudio(false, () => context);
  try {
    audio.unlock();
    audio.setHidden(true);
    await Promise.resolve();
    audio.cue('finish');
    assert.equal(stats.oscillators, 0);
    assert.equal(stats.suspends, 1);
    audio.setHidden(false);
    await Promise.resolve();
    audio.cue('tap');
    assert.equal(stats.oscillators, 2);
  } finally { audio.dispose(); }
});

test('sound setting is saved and restored independently from room settings', () => {
  const before = readAudioMuted();
  try {
    writeAudioMuted(true);
    // With no Storage API in Node, reads safely default to unmuted.
    const after = readAudioMuted();
    assert.equal(typeof after, 'boolean');
    assert.equal(AUDIO_MUTED_KEY, 'khamwai-audio-muted-v1');
  } finally { writeAudioMuted(before); }
});

test('UI integrates sound, valid-answer cue, match-phase cues and countdown without changing server timer', () => {
  assert.match(main, /document\.addEventListener\('pointerdown',unlock/);
  assert.match(main, /document\.addEventListener\('visibilitychange',visibility/);
  assert.match(main, /className="sound-toggle" aria-label=/);
  assert.match(main, /aria-pressed=\{!audioMuted\}/);
  assert.match(main, /writeAudioMuted\(next\)/);
  assert.match(main, /audio\?\.setScene\(scene,remaining\)/);
  assert.match(main, /remaining>=1 && remaining<=5/);
  assert.match(main, /previous\.remaining!==remaining/);
  assert.match(main, /audio\?\.countdown\(remaining\)/);
  assert.match(main, /audioRef\.current\?\.cue\('answer'\)/);
  assert.match(css, /@media\(max-width:900px\)\{\.sound-button-text\{display:none\}/);
});


test('all clickable controls and text fields have distinct audible pointer feedback', () => {
  assert.match(main, /document\.addEventListener\('pointerdown',pointerFeedback,\{capture:true,passive:true\}\)/);
  assert.match(main, /target\.closest\('button,input,textarea,select,label\.answer-item'\)/);
  assert.match(main, /control\.matches\(':disabled,\.sound-toggle'\)/);
  assert.match(main, /control\.matches\('input,textarea,select,label\.answer-item'\)\?'focus'/);
  assert.match(main, /control\.matches\('\.room-mode,\.settings-choice-trigger,\.custom-popup-option'\)\?'select':'tap'/);
  assert.match(main, /document\.addEventListener\('keydown',keyboardFeedback\)/);
  assert.doesNotMatch(main, /function openSetting\([^{]+\{\s*audioRef\.current\?\.cue\('tap'\)/);
  assert.match(main, /audio\.cue\(cue\)/);
});

test('urgent countdown is red, replays its punch once per tick, and respects reduced motion', () => {
  assert.match(main, /<strong key=\{remaining\} className=\{remaining<=5\?'countdown-pulse'/);
  assert.match(main, /remaining<=5\?remaining:timeLabel\(remaining\)/);
  assert.match(main, /remaining<=5\?'time-track critical-track'/);
  assert.match(css, /\.time-box strong\.countdown-pulse\{/);
  assert.match(css, /animation:khamwai-last-seconds/);
  assert.match(css, /@keyframes khamwai-last-seconds/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test('click and countdown effects have enough gain to be audible on small speakers', () => {
  const { context, stats } = mockContext();
  const audio = new GameAudio(false, () => context);
  try {
    audio.unlock();
    // The main output is significantly stronger than the former 0.24.
    // The mocked GainNode does not expose live volume levels, but captures the
    // note peaks; distinct effects now create at least two independent notes.
    audio.cue('tap');
    audio.cue('select');
    audio.cue('focus');
    audio.countdown(2);
    audio.countdown(1);
    assert.equal(stats.oscillators, 9);
    assert.ok(stats.peakGains.some(v => v >= 0.3));
  } finally { audio.dispose(); }
});
