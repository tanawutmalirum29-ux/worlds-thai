/**
 * Browser media fallback for mobile browsers that keep AudioContext suspended.
 * Both files are composed as PCM locally; they make no network requests.
 */
const SAMPLE_RATE = 16000;
const TAU = Math.PI * 2;

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function makeWav(seconds: number, sample: (time: number) => number): Blob {
  const samples = Math.round(SAMPLE_RATE * seconds);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  function textAt(offset: number, text: string) {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  }
  textAt(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  textAt(8, 'WAVE');
  textAt(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono: equally audible on either mobile speaker
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  textAt(36, 'data');
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const value = Math.max(-0.96, Math.min(0.96, sample(i / SAMPLE_RATE)));
    view.setInt16(44 + i * 2, Math.round(value * 32767), true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

const CHORDS: readonly (readonly number[])[] = [
  [60, 64, 67, 71], // Cmaj7
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
  [55, 60, 62, 67], // Gsus2
];
const MELODY = [0, 2, 1, 3, 2, 1, 0, 2] as const;

/** Eight seconds: warm chords, plucked melody, rounded bass. Seamless silent loop edges. */
export function synthesizeMusicWav(): Blob {
  return makeWav(8, t => {
    const chord = CHORDS[Math.floor(t / 2) % 4];
    const local = t % 2;
    const halfBeat = Math.floor(local / 0.25);
    const pluckTime = local % 0.25;
    const note = chord[MELODY[halfBeat]];
    const bass = midiToHz(chord[0] - 12);
    const chordFade = 0.7 + 0.3 * Math.exp(-local * 1.2);
    const bassVoice = Math.sin(TAU * bass * t) * (0.25 + 0.08 * Math.cos(TAU * 0.5 * t));
    const harmony =
      (Math.sin(TAU * midiToHz(chord[0]) * t) +
       Math.sin(TAU * midiToHz(chord[1]) * t) +
       Math.sin(TAU * midiToHz(chord[2]) * t)) * 0.105 * chordFade;
    const leadFrequency = midiToHz(note + 12);
    const lead = (Math.sin(TAU * leadFrequency * t) +
      0.3 * Math.sin(TAU * leadFrequency * 2 * t)) * 0.20 * Math.exp(-pluckTime * 7);
    const edge = Math.min(1, t / 0.08, (8 - t) / 0.08);
    return (bassVoice + harmony + lead) * Math.max(0, edge) * 0.86;
  });
}

/** Clear descending-three-pulse test sound, not a nearly inaudible single sine. */
export function synthesizeTestWav(): Blob {
  return makeWav(0.85, t => {
    const pulse = Math.floor(t / 0.25);
    if (pulse > 2) return 0;
    const local = t - pulse * 0.25;
    const amp = Math.min(1, local / 0.012) * Math.max(0, 1 - local / 0.20);
    const frequency = [988, 784, 659][pulse];
    return 0.69 * amp * (0.76 * Math.sin(TAU * frequency * t) +
      0.24 * Math.sin(TAU * 2 * frequency * t));
  });
}


/** Crisp short click for phones where Web Audio effects cannot start. */
export function synthesizeClickWav(): Blob {
  return makeWav(0.12, t => {
    const attack = Math.min(1, t / 0.006);
    const fade = Math.exp(-t * 27);
    return 0.72 * attack * fade *
      (0.72 * Math.sin(TAU * 940 * t) + 0.28 * Math.sin(TAU * 1410 * t));
  });
}
