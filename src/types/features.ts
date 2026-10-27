export type ValidityStatus = 'usable' | 'limited' | 'unavailable';

export type EvidenceDirection = 'synthetic_leaning' | 'natural_leaning' | 'neutral';

export interface TimelinePoint {
  timeSec: number;
  rms: number;
  f0: number | null; // null if unvoiced
  isVoiced: boolean;
  isPause: boolean;
  isDigitalSilence: boolean;
}

export interface PitchVoicingFeatures {
  medianF0Hz: number | null;
  minF0Hz: number | null;
  maxF0Hz: number | null;
  f0StdDevHz: number | null;
  f0RangeSemitones: number | null;
  voicedFrameRatio: number; // 0 to 1
  totalVoicedDurationSec: number;
  totalVoicedFrames: number;
  pitchValidity: ValidityStatus;
  pitchValidityReason: string;

  // Jitter (pitch perturbation)
  jitterLocalPercent: number | null; // e.g. 0.8%
  jitterValidity: ValidityStatus;
  jitterValidityReason: string;
}

export interface AmplitudeQualityFeatures {
  rmsEnergyVariance: number;
  dynamicRangeDbfs: number;
  // Shimmer (amplitude perturbation)
  shimmerLocalPercent: number | null; // e.g. 3.2%
  shimmerValidity: ValidityStatus;
  shimmerValidityReason: string;

  // Harmonic-to-Noise Ratio (HNR)
  hnrDb: number | null;
  hnrValidity: ValidityStatus;
  hnrValidityReason: string;
}

export interface PauseSilenceFeatures {
  totalSpeechDurationSec: number;
  totalPauseDurationSec: number;
  pauseRatio: number; // pause / total
  pauseSegmentCount: number;
  usablePauseDurationSec: number;
  
  // Digital silence vs acoustic room tone
  digitalZeroRatioInPauses: number; // percentage of pause duration that has near-zero audio (abs < 1e-4 / < -75dBFS)
  pauseAmbientNoiseFloorDbfs: number | null;
  pauseValidity: ValidityStatus;
  pauseValidityReason: string;
}

export interface BreathFeatures {
  candidateBreathEventsCount: number;
  breathValidity: ValidityStatus;
  breathValidityReason: string;
  notes: string;
}

export interface ExtractedAcousticFeatures {
  pitchVoicing: PitchVoicingFeatures;
  amplitudeQuality: AmplitudeQualityFeatures;
  pauseSilence: PauseSilenceFeatures;
  breath: BreathFeatures;
  timeline: TimelinePoint[];
  analysisSampleRate: number;
  frameSizeMs: number;
  hopSizeMs: number;
  totalFrames: number;
  extractionTimestamp: string;
}
