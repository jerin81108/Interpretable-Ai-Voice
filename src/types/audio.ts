export type AudioSourceType = 'upload' | 'record' | 'sample';

export interface AudioMetadata {
  fileName: string;
  fileSizeBytes: number;
  format: string;
  sampleRate: number;
  channels: number;
  durationSec: number;
  bitDepthEstimate: string;
}

export interface AudioQualityMetrics {
  peakDbfs: number;
  rmsDbfs: number;
  clippingRatio: number; // Fraction of samples at or near [-1.0, 1.0]
  isClipped: boolean;
  backgroundNoiseDbfs: number;
  snrDbfsEstimate: number;
  warnings: string[];
}

export interface AudioClip {
  id: string;
  name: string;
  source: AudioSourceType;
  isSample: boolean;
  blobUrl: string;
  rawPcm: Float32Array; // Mono downmixed Float32 audio for deterministic signal processing
  sampleRate: number;
  metadata: AudioMetadata;
  quality: AudioQualityMetrics;
}

export interface AudioValidationRule {
  maxSizeBytes: number;
  maxDurationSec: number;
  minDurationSec: number;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
