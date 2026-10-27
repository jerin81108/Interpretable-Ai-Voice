import fs from 'fs';
import path from 'path';

/**
 * WAV Header Generator (16-bit PCM Mono)
 */
function createWavBuffer(samples, sampleRate) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32); // BlockAlign (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16 bits)

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

const SAMPLE_RATE = 16000; // 16kHz standard for speech analysis

/**
 * 1. Synthetic AI Speech:
 * - Monotone flat F0 (140 Hz)
 * - Artificial harmonics
 * - Exact digital zero silence (< -90 dBFS) during pauses
 * - Negligible jitter (< 0.2%)
 */
function generateSyntheticAi(durationSec = 4.5) {
  const total = Math.round(durationSec * SAMPLE_RATE);
  const pcm = new Float32Array(total);
  const baseF0 = 145;

  const phrase1 = Math.round(1.5 * SAMPLE_RATE);
  const pause1 = Math.round(2.2 * SAMPLE_RATE); // Digital zero pause
  const phrase2 = Math.round(3.8 * SAMPLE_RATE);

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    if (i < phrase1 || (i >= pause1 && i < phrase2)) {
      // Extremely regular synthetic formant synthesis
      let s = 0.45 * Math.sin(2 * Math.PI * baseF0 * t);
      s += 0.25 * Math.sin(2 * Math.PI * 2 * baseF0 * t);
      s += 0.15 * Math.sin(2 * Math.PI * 3 * baseF0 * t);
      s += 0.08 * Math.sin(2 * Math.PI * 4 * baseF0 * t);
      pcm[i] = s * 0.7;
    } else {
      // Precise absolute digital silence (synthetic telltale)
      pcm[i] = 0.0;
    }
  }
  return pcm;
}

/**
 * 2. Natural Human Speech:
 * - Expressive F0 vibrato & intonation contour (140 - 190 Hz)
 * - Micro-jitter and shimmer
 * - Natural acoustic room noise floor in pauses (~ -50 dBFS)
 * - Breath / aspiration noise
 */
function generateNaturalHuman(durationSec = 5.0) {
  const total = Math.round(durationSec * SAMPLE_RATE);
  const pcm = new Float32Array(total);

  const phrase1 = Math.round(1.8 * SAMPLE_RATE);
  const pause1 = Math.round(2.6 * SAMPLE_RATE);
  const phrase2 = Math.round(4.4 * SAMPLE_RATE);

  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    // Ambient room acoustic floor
    const roomNoise = (Math.random() * 2 - 1) * 0.004;

    if (i < phrase1 || (i >= pause1 && i < phrase2)) {
      // Natural pitch intonation curve with micro-jitter
      const pitchContour = 160 + 25 * Math.sin(2 * Math.PI * 1.5 * t) + (Math.random() * 2 - 1) * 2.0;
      phase += (2 * Math.PI * pitchContour) / SAMPLE_RATE;

      let voice = 0.4 * Math.sin(phase);
      voice += 0.22 * Math.sin(phase * 2);
      voice += 0.12 * Math.sin(phase * 3);
      voice += 0.06 * Math.sin(phase * 4);

      // Amplitude shimmer envelope
      const shimmer = 0.85 + 0.15 * Math.sin(2 * Math.PI * 4 * t);
      // Faint breath turbulence
      const breath = (Math.random() * 2 - 1) * 0.012;

      pcm[i] = (voice * shimmer * 0.65) + breath + roomNoise;
    } else {
      // Breath in pause + ambient room tone (never 0.0)
      const inhale = Math.exp(-Math.pow((t - 2.2) / 0.18, 2)) * 0.015 * (Math.random() * 2 - 1);
      pcm[i] = roomNoise + inhale;
    }
  }
  return pcm;
}

/**
 * 3. Deepfake Voice Clone:
 * - Cloned vocal timbre with subtle phase discontinuities and synthetic splice boundaries
 */
function generateVoiceClone(durationSec = 4.0) {
  const total = Math.round(durationSec * SAMPLE_RATE);
  const pcm = new Float32Array(total);
  const f0 = 175;

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    if (t < 1.3 || (t > 1.8 && t < 3.4)) {
      // Neural vocoder-like artifacts (phase jitter + robotic harmonic balance)
      let s = 0.42 * Math.sin(2 * Math.PI * f0 * t);
      s += 0.28 * Math.sin(2 * Math.PI * 2 * f0 * t + 0.5);
      s += 0.18 * Math.sin(2 * Math.PI * 3 * f0 * t + 1.1);
      s += 0.10 * Math.sin(2 * Math.PI * 4 * f0 * t);
      // High-frequency vocoder buzz
      s += (Math.random() * 2 - 1) * 0.008;
      pcm[i] = s * 0.7;
    } else {
      // Unnaturally suppressed pause (< -85 dB)
      pcm[i] = (Math.random() * 2 - 1) * 0.00003;
    }
  }
  return pcm;
}

/**
 * 4. Degraded / Clipped Audio (Testing Inconclusive Gating):
 * - Heavily saturated audio causing clipping (> 15%)
 * - Loud hiss floor
 */
function generateDegradedAudio(durationSec = 3.0) {
  const total = Math.round(durationSec * SAMPLE_RATE);
  const pcm = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const loudTone = Math.sin(2 * Math.PI * 220 * t) * 1.8;
    const loudHiss = (Math.random() * 2 - 1) * 0.35;
    const raw = loudTone + loudHiss;
    // Hard clipping
    pcm[i] = Math.max(-0.999, Math.min(0.999, raw));
  }
  return pcm;
}

// Generate files into test_audio and public/samples
const outDirs = [
  path.resolve(process.cwd(), 'test_audio'),
  path.resolve(process.cwd(), 'public', 'samples'),
];

outDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const files = [
  { name: '1_synthetic_ai_speech.wav', pcm: generateSyntheticAi() },
  { name: '2_natural_human_speech.wav', pcm: generateNaturalHuman() },
  { name: '3_voice_clone_deepfake.wav', pcm: generateVoiceClone() },
  { name: '4_degraded_clipped_audio.wav', pcm: generateDegradedAudio() },
];

for (const { name, pcm } of files) {
  const wav = createWavBuffer(pcm, SAMPLE_RATE);
  for (const dir of outDirs) {
    const targetPath = path.join(dir, name);
    fs.writeFileSync(targetPath, wav);
  }
  console.log(`Generated: ${name} (${(pcm.length / SAMPLE_RATE).toFixed(1)}s, ${wav.length} bytes)`);
}

console.log('\nAll test audio files successfully generated!');
