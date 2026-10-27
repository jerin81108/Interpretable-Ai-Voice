import { SCREENING_CONFIG } from '../config/screeningConfig';
import type { AudioMetadata, AudioQualityMetrics } from '../types/audio';
import type { ExtractedAcousticFeatures } from '../types/features';
import type { ScreeningOutcomeType, ScreeningResult } from '../types/screening';
import { generateEvidenceCards } from './evidenceGenerator';

/**
 * Runs the transparent screening heuristic engine.
 * Synthesizes evidence cards and determines whether the clip presents signals consistent with
 * synthetic speech, natural speech, or is inconclusive.
 */
export function runScreeningPipeline(
  features: ExtractedAcousticFeatures,
  metadata: AudioMetadata,
  quality: AudioQualityMetrics
): ScreeningResult {
  const evidenceCards = generateEvidenceCards(features, quality);

  // Count feature usability
  let usableCount = 0;
  let limitedCount = 0;
  let unavailableCount = 0;

  for (const card of evidenceCards) {
    if (card.validity === 'usable') usableCount++;
    else if (card.validity === 'limited') limitedCount++;
    else unavailableCount++;
  }

  // Check Inconclusive gating conditions
  const isTooShort = metadata.durationSec < SCREENING_CONFIG.audioLimits.minDurationSec;
  const isSevereClipping = quality.clippingRatio > SCREENING_CONFIG.featureSufficiency.maxAcceptableClippingRatio;
  const isInsufficientVoiced =
    features.pitchVoicing.totalVoicedFrames < SCREENING_CONFIG.featureSufficiency.minVoicedFramesForF0;
  const isLowSnr = quality.snrDbfsEstimate < SCREENING_CONFIG.inconclusiveGating.snrFloorDbfs;
  const tooFewUsable = usableCount < SCREENING_CONFIG.inconclusiveGating.minUsableFeaturesRequired;

  const qualityWarnings = [...quality.warnings];

  // Outcome decision logic
  let outcome: ScreeningOutcomeType = 'inconclusive';
  let outcomeTitle = 'Inconclusive Screening';
  let outcomeSummary = '';
  let prototypeSignalIndex = 50; // Centered
  const primaryObservations: string[] = [];

  if (isTooShort || isInsufficientVoiced || tooFewUsable || isSevereClipping || isLowSnr) {
    outcome = 'inconclusive';
    outcomeTitle = 'Inconclusive: Insufficient Acoustic Data';
    outcomeSummary =
      'The audio clip did not contain sufficient clean voiced speech or quiet pause intervals to form a reliable acoustic screening assessment. Key measurements were compromised by brevity, noise, or clipping.';
    prototypeSignalIndex = 50;

    if (isTooShort) {
      primaryObservations.push(
        `Clip length (${metadata.durationSec.toFixed(2)}s) is below the minimum required duration (${SCREENING_CONFIG.audioLimits.minDurationSec}s).`
      );
    }
    if (isInsufficientVoiced) {
      primaryObservations.push(
        `Very little voiced speech was detected (${features.pitchVoicing.totalVoicedDurationSec.toFixed(2)}s). Vocal cord perturbation cannot be measured reliably.`
      );
    }
    if (isSevereClipping) {
      primaryObservations.push(
        `Severe audio clipping (${(quality.clippingRatio * 100).toFixed(1)}% of samples) distorts harmonic and energy features.`
      );
    }
    if (isLowSnr) {
      primaryObservations.push(
        `High background noise (SNR ${quality.snrDbfsEstimate.toFixed(1)} dB) obscures fine vocal micro-variations.`
      );
    }
  } else {
    // Calculate weighted contribution from usable/limited evidence cards
    // Negative score = natural-leaning, Positive score = synthetic-leaning
    let weightedScoreSum = 0;
    let totalWeightSum = 0;

    for (const card of evidenceCards) {
      if (card.validity === 'unavailable' || card.id === 'signal-recording-integrity') {
        continue;
      }

      // Feature specific weight multiplier from config
      let categoryWeight = 1.0;
      if (card.id === 'pause-digital-silence') categoryWeight = SCREENING_CONFIG.weights.pauseDigitalZero;
      else if (card.id === 'pitch-jitter') categoryWeight = SCREENING_CONFIG.weights.pitchPeriodicityJitter;
      else if (card.id === 'amplitude-shimmer') categoryWeight = SCREENING_CONFIG.weights.amplitudeRegularityShimmer;
      else if (card.id === 'pitch-contour-dynamics') categoryWeight = SCREENING_CONFIG.weights.f0ContourDynamics;
      else if (card.id === 'harmonic-to-noise') categoryWeight = SCREENING_CONFIG.weights.harmonicToNoisePurity;
      else if (card.id === 'breath-naturalness') categoryWeight = SCREENING_CONFIG.weights.breathPresenceOrAbsence;

      const effectiveWeight = categoryWeight * card.confidenceWeight;
      weightedScoreSum += card.contributionScore * effectiveWeight;
      totalWeightSum += effectiveWeight;

      // Collect primary observations
      if (card.direction === 'synthetic_leaning') {
        primaryObservations.push(card.whatWasObserved);
      } else if (card.direction === 'natural_leaning') {
        primaryObservations.push(card.whatWasObserved);
      }
    }

    const netScore = totalWeightSum > 0 ? weightedScoreSum / totalWeightSum : 0;
    
    // Scale netScore [-1.0, 1.0] to a 0-100 heuristic index
    // 0 = strong natural signals, 50 = neutral/balanced, 100 = strong synthetic signals
    prototypeSignalIndex = Math.round(Math.min(100, Math.max(0, 50 + netScore * 45)));

    // Categorization thresholds
    if (netScore >= 0.28) {
      outcome = 'synthetic_leaning';
      outcomeTitle = 'Signals Consistent with Synthetic Speech';
      outcomeSummary =
        'Measured acoustic features exhibit anomalies frequently observed in synthesized speech, such as mathematical digital silence in pause windows, unnatural pitch periodicity, or sterile amplitude consistency.';
    } else if (netScore <= -0.22) {
      outcome = 'natural_leaning';
      outcomeTitle = 'Signals More Consistent with Natural Speech';
      outcomeSummary =
        'Measured acoustic features exhibit organic micro-perturbations, physical ambient room noise in pauses, and expected human vocal tract variations. Note that sophisticated voice clones can sometimes mimic these patterns.';
    } else {
      outcome = 'inconclusive';
      outcomeTitle = 'Inconclusive: Mixed Acoustic Patterns';
      outcomeSummary =
        'The audio clip presents balanced or conflicting signals. Some features align with natural recordings while others border on synthetic patterns. Independent verification is advised.';
    }
  }

  // Ensure at least two primary observation bullets exist
  if (primaryObservations.length === 0) {
    primaryObservations.push(
      'Acoustic features fell within overlapping baseline regions without strong deviation in either direction.'
    );
  }

  const disclaimer =
    'This assessment is a screening signal generated by client-side acoustic heuristics for prototype evaluation. It does NOT provide definitive proof of voice authenticity or manipulation. Do not make financial, legal, or high-stakes decisions based solely on this result.';

  return {
    version: SCREENING_CONFIG.version,
    timestamp: new Date().toISOString(),
    outcome,
    outcomeTitle,
    outcomeSummary,
    disclaimer,
    prototypeSignalIndex,
    signalIndexLabel: 'Prototype Acoustic Heuristic Index (Experimental)',
    usableFeaturesCount: usableCount,
    limitedFeaturesCount: limitedCount,
    unavailableFeaturesCount: unavailableCount,
    primaryObservations: primaryObservations.slice(0, 4),
    evidenceCards,
    qualityWarnings,
    timeline: features.timeline,
    audioMetadata: metadata,
    qualityMetrics: quality,
    rawFeatures: features,
  };
}
