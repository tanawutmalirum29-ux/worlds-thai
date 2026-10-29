/**
 * Lightweight procedural soundtrack for คำไว.
 * All notes are generated with Web Audio after the first user gesture; no remote
 * tracks, audio downloads, or background autoplay permissions are required.
 */
export type AudioScene = 'home' | 'lobby' | 'playing' | 'review' | 'final';
export type AudioCue = 'tap' | 'select' | 'focus' | 'join' | 'start' | 'answer' | 'review' | 'finish' | 'timeout' | 'exit';

export const AUDIO_MUTED_KEY = 'khamwai-audio-muted-v1';

export function readAudioMuted(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(AUDIO_MUTED_KEY) === 'true'; }
  catch { return false; }
}

export function writeAudioMuted(muted: boolean): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(AUDIO_MUTED_KEY, String(muted)); }
  catch { /* Private browsing may disable storage; audio still works for this visit. */ }
}

export function musicStepSeconds(scene: AudioScene, lastFiveSeconds: boolean): number {
  if (lastFiveSeconds && scene === 'playing') return 0.14;
  return scene === 'playing' ? 0.3 : 0.4;
}

function hz(midi: number): number { return 440 * Math.pow(2, (midi - 69) / 12); }

const CHORDS = [
  [60, 64, 67, 71], // Cmaj7
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
  [55, 60, 62, 67], // Gsus(add9)
] as const;
const ARPEGGIO = [0, 2, 1, 3, 2, 1, 0, 2] as const;

function createBrowserAudioContext(): AudioContext {
  const vendor = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const Constructor = vendor.AudioContext || vendor.webkitAudioContext;
  if (!Constructor) throw new Error('Web Audio is unavailable');
  return new Constructor();
}

/** One engine for one browser tab; dispose it on React unmount. */
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private scene: AudioScene = 'home';
  private remaining = 0;
  private urgent = false;
  private hidden = false;
  private nextNoteAt = 0;
  private step = 0;
  private disposed = false;
  private muted: boolean;
  private readonly makeContext: () => AudioContext;

  constructor(muted = false, makeContext: () => AudioContext = createBrowserAudioContext) {
    this.muted = muted;
    this.makeContext = makeContext;
  }

  /** Call directly from pointerdown/keydown, for iOS and other autoplay policies. */
  unlock(): void {
    if (this.disposed || this.muted || this.hidden) return;
    try {
      if (!this.context) {
        const context = this.makeContext();
        const master = context.createGain();
        // Previous 0.24 output was nearly inaudible on phone speakers.
        // Keep headroom while giving both music and short feedback a real presence.
        master.gain.value = 0.85;
        master.connect(context.destination);
        this.context = context;
        this.master = master;
      }
      const context = this.context;
      if (context.state !== 'running') void context.resume().catch(() => {});
      if (!this.interval) {
        this.nextNoteAt = 0;
        this.interval = setInterval(() => this.schedule(), 70);
      }
    } catch {
      // Audio must never stop the game working on unsupported/restricted devices.
    }
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted || this.disposed) return;
    this.muted = muted;
    if (muted) {
      this.stopMusic();
      if (this.context) void this.context.suspend().catch(() => {});
    } else {
      this.unlock();
    }
  }

  setHidden(hidden: boolean): void {
    if (this.hidden === hidden || this.disposed) return;
    this.hidden = hidden;
    if (hidden) {
      this.stopMusic();
      if (this.context) void this.context.suspend().catch(() => {});
    } else {
      this.unlock();
    }
  }

  setScene(scene: AudioScene, remaining: number): void {
    const urgent = scene === 'playing' && remaining > 0 && remaining <= 5;
    if (scene !== this.scene || urgent !== this.urgent) {
      this.step = 0;
      // Drop previously queued notes on the next scheduling cycle.
      this.nextNoteAt = 0;
    }
    this.scene = scene;
    this.remaining = remaining;
    this.urgent = urgent;
  }

  /** Audible, short feedback. Text inputs are cued on tap/focus, never per keystroke. */
  cue(name: AudioCue): void {
    const at = this.readyTime();
    if (at === null) return;
    switch (name) {
      case 'tap':
        this.note(81, at, 0.10, 0.22, 'triangle');
        this.note(69, at, 0.075, 0.10, 'sine');
        break;
      case 'select':
        this.note(79, at, 0.10, 0.19, 'triangle');
        this.note(84, at + 0.075, 0.16, 0.20, 'sine');
        break;
      case 'focus':
        this.note(72, at, 0.14, 0.16, 'triangle');
        break;
      case 'join':
        this.note(67, at, 0.17, 0.18);
        this.note(72, at + 0.10, 0.23, 0.19);
        break;
      case 'start':
        this.note(72, at, 0.16, 0.17);
        this.note(76, at + 0.12, 0.17, 0.18);
        this.note(79, at + 0.24, 0.33, 0.19);
        break;
      case 'answer':
        this.note(79, at, 0.13, 0.13);
        this.note(84, at + 0.07, 0.18, 0.14);
        break;
      case 'review':
        this.note(79, at, 0.17, 0.17);
        this.note(76, at + 0.14, 0.18, 0.16);
        this.note(72, at + 0.28, 0.39, 0.16);
        break;
      case 'finish':
        [72, 76, 79, 84].forEach((pitch, i) => this.note(pitch, at + i * 0.14, 0.39, 0.18));
        break;
      case 'timeout':
        this.note(79, at, 0.22, 0.28, 'square');
        this.note(67, at + 0.18, 0.36, 0.28, 'triangle');
        this.note(60, at + 0.34, 0.47, 0.23, 'sine');
        break;
      case 'exit':
        this.note(67, at, 0.13, 0.13);
        this.note(60, at + 0.12, 0.17, 0.13);
        break;
    }
  }

  countdown(second: number): void {
    if (second < 1 || second > 5) return;
    const at = this.readyTime();
    if (at === null) return;
    // One distinct metronome-like "beep" on 5,4,3,2; a doubled high beep on 1.
    // Do not use arpeggio-like rising notes here: they sound like music, not a timer.
    if (second === 1) {
      this.note(88, at, 0.19, 0.31, 'triangle');
      this.note(88, at + 0.17, 0.24, 0.31, 'triangle');
    } else {
      this.note(83, at, 0.19, 0.30, 'triangle');
      this.note(71, at, 0.12, 0.12, 'sine');
    }
  }

  private readyTime(): number | null {
    const context = this.context;
    // Audio may still be resuming on the first mobile pointerdown. Web Audio
    // accepts scheduled notes while suspended and plays them as soon as it resumes.
    return this.disposed || this.muted || this.hidden || !context || context.state === 'closed'
      ? null : context.currentTime + 0.025;
  }

  private note(
    pitch: number, at: number, duration: number, volume: number,
    wave: OscillatorType = 'sine',
  ): void {
    const context = this.context, master = this.master;
    if (!context || !master || this.disposed || this.muted || this.hidden) return;
    const start = Math.max(at, context.currentTime + 0.005);
    const end = start + Math.max(0.04, duration);
    const osc = context.createOscillator();
    const envelope = context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz(pitch), start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.016);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(envelope);
    envelope.connect(master);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
    osc.start(start);
    osc.stop(end + 0.02);
  }

  private schedule(): void {
    const context = this.context;
    if (!context || this.muted || this.hidden || context.state !== 'running') return;
    if (this.scene === 'playing' && this.remaining <= 0) return;
    if (this.nextNoteAt < context.currentTime || this.nextNoteAt > context.currentTime + 1) {
      this.nextNoteAt = context.currentTime + 0.025;
    }
    const stepSeconds = musicStepSeconds(this.scene, this.urgent);
    // Schedule a short window, so changes in countdown/scene are audible quickly.
    let scheduled = 0;
    while (this.nextNoteAt < context.currentTime + 0.17 && scheduled++ < 3) {
      this.musicStep(this.nextNoteAt, this.step++, stepSeconds);
      this.nextNoteAt += stepSeconds;
    }
  }

  private musicStep(at: number, step: number, length: number): void {
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    const index = step % 8;
    const quiet = this.scene === 'home' || this.scene === 'lobby' || this.scene === 'final';
    // Keep music lively but leave space for the final five loud timer beeps.
    const velocity = this.urgent ? 0.50 : quiet ? 0.84 : 1;
    if (index === 0) {
      // Soft, airy harmony with a warm low note.
      this.note(chord[0] - 12, at, length * 6.8, 0.098 * velocity, 'sine');
      [0, 1, 2].forEach(i => this.note(chord[i], at, length * 7.5, 0.060 * velocity, 'sine'));
    } else if (index === 4) {
      this.note(chord[0] - 12, at, length * 3.2, 0.068 * velocity, 'sine');
    }
    // Gently rotating, plucked melody (one note at a time).
    if (index !== 6 || this.urgent) {
      const octave = this.urgent ? 12 : 0;
      this.note(chord[ARPEGGIO[index]] + octave, at, length * 1.28, 0.165 * velocity, 'triangle');
    }
    // For the last five seconds, synthesize a light double-time pulse.
    if (this.urgent && step % 2 === 0) {
      this.note(48, at, 0.07, 0.064, 'sine');
    }
  }

  private stopMusic(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.nextNoteAt = 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopMusic();
    const context = this.context;
    this.context = null;
    this.master = null;
    if (context) void context.close().catch(() => {});
  }
}
