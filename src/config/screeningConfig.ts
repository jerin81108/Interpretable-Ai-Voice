/**
 * Screening Configuration & Acoustic Thresholds
 * 
 * Version: 1.2.0-preview (Prototype Heuristic)
 * 
 * IMPORTANT:
 * These thresholds and weights are part of an interpretable heuristic prototype
 * designed for acoustic screening. They are NOT from a locked commercial classifier
 * and MUST NOT be presented as definitive proof of voice authenticity or fraud.
 */

export const SCREENING_CONFIG = {
  version: '1.2.0-prototype-heuristic',
  modelName: 'Voiceprint Acoustic Heuristic Pipeline',
  lastUpdated: '2026-10-27',
  
  audioLimits: {
    maxFileSizeBytes: 25 * 1024 * 1024, // 25 MB
    minDurationSec: 1.0, // Minimum for any meaningful acoustic measurement
    recommendedMinDurationSec: 2.5, // Recommended for stable jitter/shimmer
    maxDurationSec: 180.0, // 3 minutes limit for browser memory safety
    supportedExtensions: ['.wav', '.mp3', '.m4a', '.aac', '.ogg', '.flac', '.webm'],
    supportedMimeTypes: [
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      'audio/webm',
    ],
  },

  signalProcessing: {
    targetSampleRate: 16000, // 16 kHz standardized speech analysis
    frameSizeMs: 30, // 480 samples at 16kHz
    hopSizeMs: 10,   // 160 samples at 16kHz
    f0MinHz: 65,     // Low male voice limit
    f0MaxHz: 450,    // High female / juvenile voice limit
    
    // Voice Activity & Pause thresholds
    vadEnergyThresholdDb: -42, // Minimum RMS energy to consider candidate speech
    vadAdaptiveMarginDb: 8,    // Dynamic margin above background noise estimate
    minPauseDurationMs: 140,   // 14 consecutive hop frames
    digitalSilenceThresholdDbfs: -75, // Below this is effectively digital silence/zero
    pureZeroSampleTolerance: 0.00008, // Float32 absolute sample tolerance
  },

  featureSufficiency: {
    minVoicedFramesForF0: 25, // ~250ms of voiced speech
    minVoicedFramesForJitterShimmer: 50, // ~500ms of voiced speech for perturbation
    minPauseFramesForSilenceEval: 15, // ~150ms of detected pause
    maxAcceptableClippingRatio: 0.03, // >3% clipping invalidates shimmer and raises quality flags
  },

  acousticBaselines: {
    // Normal healthy adult conversational speech empirical baselines
    jitterLocalPercent: {
      minNatural: 0.25,
      maxNatural: 1.80,
      abnormallyLowThreshold: 0.12, // Hyper-periodic / vocoded robotic output
      abnormallyHighThreshold: 3.50, // Severe tracking jitter or concatenated splice artifacts
    },
    shimmerLocalPercent: {
      minNatural: 1.80,
      maxNatural: 6.50,
      abnormallyLowThreshold: 0.90, // Unnatural cycle-to-cycle amplitude sterility
      abnormallyHighThreshold: 11.0,
    },
    harmonicToNoiseRatioDb: {
      minNatural: 10.0,
      maxNatural: 24.0,
      hyperCleanThreshold: 26.5, // Unnaturally clean / absence of glottal aspiration
      severelyDegradedThreshold: 6.0,
    },
    f0RangeSemitones: {
      minNaturalConversational: 2.5, // Flatter than this in >3s speech suggests monotone vocoder
      maxNaturalConversational: 18.0,
    },
    digitalZeroInPausesPercent: {
      abnormalSyntheticThreshold: 35.0, // If >35% of pause windows are exact digital zero
      naturalAcousticLimit: 5.0, // Genuine room mics rarely have >5% pure digital zero
    },
  },

  // Transparent weights for prototype screening heuristic aggregation
  weights: {
    pauseDigitalZero: 1.8,
    pitchPeriodicityJitter: 1.4,
    amplitudeRegularityShimmer: 1.2,
    f0ContourDynamics: 1.0,
    harmonicToNoisePurity: 0.9,
    breathPresenceOrAbsence: 0.5,
  },

  inconclusiveGating: {
    minUsableFeaturesRequired: 3,
    snrFloorDbfs: 8.0, // Less than 8dB SNR makes observations too noisy to screen
  },
} as const;
