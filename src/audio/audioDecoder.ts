import { SCREENING_CONFIG } from '../config/screeningConfig';
import type { AudioMetadata, AudioQualityMetrics } from '../types/audio';
import { validateDecodedAudio } from './audioValidator';

// Shared AudioContext instance managed cleanly
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  return sharedAudioContext;
}

export interface DecodedAudioResult {
  rawPcm: Float32Array; // Mono 16 kHz standardized PCM for DSP
  originalSampleRate: number;
  channels: number;
  durationSec: number;
  metadata: AudioMetadata;
  quality: AudioQualityMetrics;
}

/**
 * Decodes an audio ArrayBuffer, downmixes to mono, and standardizes to 16 kHz for feature extraction.
 */
export async function decodeAudioPayload(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  fileSizeBytes: number,
  formatHint?: string
): Promise<DecodedAudioResult> {
  const audioCtx = getAudioContext();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  // Clone arrayBuffer because decodeAudioData detaches the underlying buffer in some engines
  const bufferCopy = arrayBuffer.slice(0);
  
  let decodedBuffer: AudioBuffer;
  try {
    decodedBuffer = await audioCtx.decodeAudioData(bufferCopy);
  } catch (err) {
    throw new Error(
      `Audio decoding failed: The file could not be parsed by the browser's audio engine. (${(err as Error).message})`
    );
  }

  const originalSampleRate = decodedBuffer.sampleRate;
  const originalChannels = decodedBuffer.numberOfChannels;
  const durationSec = decodedBuffer.duration;

  // Validate buffer duration and channel count
  const validation = validateDecodedAudio(durationSec, originalSampleRate, originalChannels);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  // Downmix to mono
  const length = decodedBuffer.length;
  const monoOriginal = new Float32Array(length);
  for (let ch = 0; ch < originalChannels; ch++) {
    const channelData = decodedBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      monoOriginal[i] += channelData[i] / originalChannels;
    }
  }

  // Resample to target sample rate (16,000 Hz) using OfflineAudioContext for clean anti-aliased resampling
  const targetSampleRate = SCREENING_CONFIG.signalProcessing.targetSampleRate;
  const targetPcm = await resamplePcmTo16k(monoOriginal, originalSampleRate, targetSampleRate, durationSec);

  // Compute quality indicators
  const quality = computeAudioQuality(targetPcm, validation.warnings);

  const format = formatHint || detectFormatFromFileName(fileName);
  const metadata: AudioMetadata = {
    fileName,
    fileSizeBytes,
    format,
    sampleRate: originalSampleRate,
    channels: originalChannels,
    durationSec,
    bitDepthEstimate: '32-bit float (decoded)',
  };

  return {
    rawPcm: targetPcm,
    originalSampleRate,
    channels: originalChannels,
    durationSec,
    metadata,
    quality,
  };
}

/**
 * Resamples a mono Float32Array using an OfflineAudioContext.
 */
async function resamplePcmTo16k(
  pcm: Float32Array,
  sourceRate: number,
  targetRate: number,
  durationSec: number
): Promise<Float32Array> {
  if (sourceRate === targetRate) {
    return pcm;
  }

  const targetLength = Math.max(1, Math.round(durationSec * targetRate));
  const offlineCtx = new OfflineAudioContext(1, targetLength, targetRate);

  // Create temporary buffer
  const tempBuffer = offlineCtx.createBuffer(1, pcm.length, sourceRate);
  tempBuffer.getChannelData(0).set(pcm);

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = tempBuffer;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

/**
 * Measures signal peak, RMS, clipping ratio, and noise floor.
 */
function computeAudioQuality(pcm: Float32Array, initialWarnings: string[]): AudioQualityMetrics {
  const warnings = [...initialWarnings];
  const len = pcm.length;

  let peak = 0;
  let sumSquares = 0;
  let clippedSamples = 0;
  const clipThreshold = 0.995;

  // Window energy tracking for noise floor
  const windowSize = 320; // 20ms at 16kHz
  const frameEnergies: number[] = [];

  let curWindowSum = 0;
  let curWindowCount = 0;

  for (let i = 0; i < len; i++) {
    const val = pcm[i];
    const absVal = Math.abs(val);

    if (absVal > peak) {
      peak = absVal;
    }
    if (absVal >= clipThreshold) {
      clippedSamples++;
    }

    const sq = val * val;
    sumSquares += sq;
    curWindowSum += sq;
    curWindowCount++;

    if (curWindowCount >= windowSize) {
      const windowRms = Math.sqrt(curWindowSum / curWindowCount);
      const db = windowRms > 1e-6 ? 20 * Math.log10(windowRms) : -100;
      frameEnergies.push(db);
      curWindowSum = 0;
      curWindowCount = 0;
    }
  }

  const overallRms = Math.sqrt(sumSquares / Math.max(1, len));
  const peakDbfs = peak > 1e-6 ? 20 * Math.log10(peak) : -100;
  const rmsDbfs = overallRms > 1e-6 ? 20 * Math.log10(overallRms) : -100;
  const clippingRatio = clippedSamples / Math.max(1, len);
  const isClipped = clippingRatio > 0.005; // >0.5% samples clipped

  // Sort frame energies to estimate background noise floor (10th percentile)
  frameEnergies.sort((a, b) => a - b);
  const noiseFloorIdx = Math.floor(frameEnergies.length * 0.1);
  const backgroundNoiseDbfs = frameEnergies.length > 0 ? frameEnergies[noiseFloorIdx] : -80;
  const snrDbfsEstimate = Math.max(0, peakDbfs - backgroundNoiseDbfs);

  // Quality warnings
  if (isClipped) {
    warnings.push(
      `Clipping detected (${(clippingRatio * 100).toFixed(1)}% of samples near ±1.0). High clipping can distort harmonic features.`
    );
  }
  if (peakDbfs < -24) {
    warnings.push(
      `Audio peak level is very low (${peakDbfs.toFixed(1)} dBFS). Low signal level may reduce pitch tracking stability.`
    );
  }
  if (snrDbfsEstimate < 10) {
    warnings.push(
      `Estimated Signal-to-Noise Ratio is low (${snrDbfsEstimate.toFixed(1)} dB). Significant background noise may confound vocal measurements.`
    );
  }

  return {
    peakDbfs: Math.round(peakDbfs * 10) / 10,
    rmsDbfs: Math.round(rmsDbfs * 10) / 10,
    clippingRatio,
    isClipped,
    backgroundNoiseDbfs: Math.round(backgroundNoiseDbfs * 10) / 10,
    snrDbfsEstimate: Math.round(snrDbfsEstimate * 10) / 10,
    warnings,
  };
}

function detectFormatFromFileName(name: string): string {
  const parts = name.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toUpperCase();
  }
  return 'WAV/PCM';
}

/**
 * Releases memory and closes audio context if needed on session exit.
 */
export function cleanupAudioResources(): void {
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    sharedAudioContext.close().catch(() => {});
    sharedAudioContext = null;
  }
}
