export interface DemoSampleDefinition {
  id: string;
  name: string;
  badge: string;
  description: string;
  expectedOutcome: string;
  durationSec: number;
  generatePcm: (sampleRate: number) => Float32Array;
}

/**
 * Creates audio waveforms procedurally for the 3 demonstration presets.
 * Allows instant, self-contained playback in the browser without external asset dependencies.
 */
function createSyntheticDemoWave(sampleRate: number): Float32Array {
  // 4.0 seconds of synthesized voice-like harmonic tone with EXACT zero pauses
  const durationSec = 4.0;
  const numSamples = Math.round(durationSec * sampleRate);
  const pcm = new Float32Array(numSamples);

  const phrase1End = Math.round(1.5 * sampleRate);
  const pauseEnd = Math.round(2.3 * sampleRate); // Exact digital zero pause
  const phrase2End = Math.round(3.8 * sampleRate);

  const baseF0 = 140; // Flat monotone F0

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    if (i < phrase1End) {
      // Harmonic sum (robotic, hyper-regular, minimal jitter)
      let sample = 0.4 * Math.sin(2 * Math.PI * baseF0 * t);
      sample += 0.25 * Math.sin(2 * Math.PI * 2 * baseF0 * t);
      sample += 0.15 * Math.sin(2 * Math.PI * 3 * baseF0 * t);
      sample += 0.08 * Math.sin(2 * Math.PI * 4 * baseF0 * t);
      pcm[i] = sample * 0.7;
    } else if (i >= phrase1End && i < pauseEnd) {
      // PURE DIGITAL ZERO SILENCE (characteristic synthetic splice artifact)
      pcm[i] = 0.0;
    } else if (i >= pauseEnd && i < phrase2End) {
      let sample = 0.4 * Math.sin(2 * Math.PI * baseF0 * t);
      sample += 0.25 * Math.sin(2 * Math.PI * 2 * baseF0 * t);
      sample += 0.15 * Math.sin(2 * Math.PI * 3 * baseF0 * t);
      pcm[i] = sample * 0.7;
    } else {
      pcm[i] = 0.0;
    }
  }
  return pcm;
}

function createNaturalDemoWave(sampleRate: number): Float32Array {
  // 4.2 seconds of natural-like vocal tone with subtle vibrato, micro-jitter, and continuous room noise
  const durationSec = 4.2;
  const numSamples = Math.round(durationSec * sampleRate);
  const pcm = new Float32Array(numSamples);

  const phrase1End = Math.round(1.6 * sampleRate);
  const pauseEnd = Math.round(2.4 * sampleRate);
  const phrase2End = Math.round(4.0 * sampleRate);

  let phase = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Ambient room acoustic noise (-52 dBFS approx)
    const ambientNoise = (Math.random() * 2 - 1) * 0.005;

    if (i < phrase1End || (i >= pauseEnd && i < phrase2End)) {
      // Dynamic pitch with 5 Hz vibrato and conversational drift
      const instF0 = 165 + 18 * Math.sin(2 * Math.PI * 1.8 * t) + (Math.random() * 2 - 1) * 1.2;
      phase += (2 * Math.PI * instF0) / sampleRate;

      let speech = 0.4 * Math.sin(phase);
      speech += 0.22 * Math.sin(phase * 2);
      speech += 0.12 * Math.sin(phase * 3);
      // Slight amplitude fluctuation (shimmer)
      const envelope = 0.8 + 0.15 * Math.sin(2 * Math.PI * 3.5 * t);
      pcm[i] = speech * envelope * 0.65 + ambientNoise;
    } else {
      // Natural room acoustic tone in pause
      pcm[i] = ambientNoise;
    }
  }
  return pcm;
}

function createDegradedInconclusiveWave(sampleRate: number): Float32Array {
  // 1.8 seconds heavily clipped, loud noise floor, high distortion
  const durationSec = 1.8;
  const numSamples = Math.round(durationSec * sampleRate);
  const pcm = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Loud background hiss
    const noise = (Math.random() * 2 - 1) * 0.25;
    const tone = Math.sin(2 * Math.PI * 220 * t) * 1.8; // Heavily saturated
    let s = tone + noise;
    // Hard clip at +/- 0.999
    if (s > 0.999) s = 0.999;
    if (s < -0.999) s = -0.999;
    pcm[i] = s;
  }
  return pcm;
}

export const DEMO_PRESETS: DemoSampleDefinition[] = [
  {
    id: 'demo-synthetic',
    name: 'Demonstration Clip A (Synthetic-leaning signals)',
    badge: 'Illustrative Example',
    description: 'Demonstrates mathematically quiet digital-zero pauses (< -80 dBFS) and hyper-regular pitch period harmonics.',
    expectedOutcome: 'Signals consistent with synthetic speech',
    durationSec: 4.0,
    generatePcm: createSyntheticDemoWave,
  },
  {
    id: 'demo-natural',
    name: 'Demonstration Clip B (Natural-leaning signals)',
    badge: 'Illustrative Example',
    description: 'Demonstrates continuous ambient room acoustic tone in pause windows, vocal tract pitch variation, and organic micro-jitter.',
    expectedOutcome: 'Signals more consistent with natural speech',
    durationSec: 4.2,
    generatePcm: createNaturalDemoWave,
  },
  {
    id: 'demo-inconclusive',
    name: 'Demonstration Clip C (Degraded / Inconclusive)',
    badge: 'Illustrative Example',
    description: 'Demonstrates audio with severe clipping (> 15%) and low SNR, triggering the safe inconclusive gating mechanism.',
    expectedOutcome: 'Inconclusive: Insufficient Acoustic Data',
    durationSec: 1.8,
    generatePcm: createDegradedInconclusiveWave,
  },
];

/**
 * Encodes a Float32Array mono buffer to a standard WAV Blob for in-browser playback.
 */
export function pcmToWavBlob(pcm: Float32Array, sampleRate: number): Blob {
  const numSamples = pcm.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
