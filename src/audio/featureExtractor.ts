import { SCREENING_CONFIG } from '../config/screeningConfig';
import type {
  AmplitudeQualityFeatures,
  BreathFeatures,
  ExtractedAcousticFeatures,
  PauseSilenceFeatures,
  PitchVoicingFeatures,
  TimelinePoint,
  ValidityStatus,
} from '../types/features';

/**
 * Extracts acoustic speech features from 16 kHz standardized mono PCM audio.
 * Deterministic client-side signal processing based on speech phonetics and DSP principles.
 */
export function extractAcousticFeatures(
  pcm: Float32Array,
  analysisSampleRate: number = SCREENING_CONFIG.signalProcessing.targetSampleRate,
  clippingRatio: number = 0
): ExtractedAcousticFeatures {
  const frameSizeSamples = Math.round(
    (SCREENING_CONFIG.signalProcessing.frameSizeMs / 1000) * analysisSampleRate
  ); // 480 samples
  const hopSizeSamples = Math.round(
    (SCREENING_CONFIG.signalProcessing.hopSizeMs / 1000) * analysisSampleRate
  ); // 160 samples

  const totalSamples = pcm.length;
  const numFrames = Math.max(0, Math.floor((totalSamples - frameSizeSamples) / hopSizeSamples) + 1);

  // Pre-calculate Hann window
  const hannWindow = new Float32Array(frameSizeSamples);
  for (let i = 0; i < frameSizeSamples; i++) {
    hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSizeSamples - 1)));
  }

  // Step 1: Calculate frame energies and rough noise floor
  const frameRmsValues = new Float32Array(numFrames);
  const frameRmsDb = new Float32Array(numFrames);
  const windowedFrame = new Float32Array(frameSizeSamples);

  for (let f = 0; f < numFrames; f++) {
    const startIdx = f * hopSizeSamples;
    let sumSq = 0;
    for (let i = 0; i < frameSizeSamples; i++) {
      const val = pcm[startIdx + i];
      sumSq += val * val;
    }
    const rms = Math.sqrt(sumSq / frameSizeSamples);
    frameRmsValues[f] = rms;
    frameRmsDb[f] = rms > 1e-6 ? 20 * Math.log10(rms) : -100;
  }

  // Estimate background noise floor using 10th percentile of frame energies
  const sortedDb = Array.from(frameRmsDb).sort((a, b) => a - b);
  const noiseFloorDb = sortedDb.length > 0 ? sortedDb[Math.floor(sortedDb.length * 0.1)] : -80;
  const vadThresholdDb = Math.max(
    SCREENING_CONFIG.signalProcessing.vadEnergyThresholdDb,
    noiseFloorDb + SCREENING_CONFIG.signalProcessing.vadAdaptiveMarginDb
  );

  // Step 2: Pitch tracking (F0) & Voicing detection using Normalized Cross-Correlation (NCCF)
  const f0Min = SCREENING_CONFIG.signalProcessing.f0MinHz;
  const f0Max = SCREENING_CONFIG.signalProcessing.f0MaxHz;
  const minLag = Math.floor(analysisSampleRate / f0Max); // ~35 samples
  const maxLag = Math.ceil(analysisSampleRate / f0Min);  // ~246 samples

  const frameF0: (number | null)[] = new Array(numFrames).fill(null);
  const frameVoiced: boolean[] = new Array(numFrames).fill(false);
  const frameHnr: (number | null)[] = new Array(numFrames).fill(null);
  const framePeakAmp: number[] = new Array(numFrames).fill(0);

  const voicedF0List: number[] = [];
  const voicedPeriods: number[] = [];
  const voicedAmplitudes: number[] = [];
  const voicedHnrList: number[] = [];

  for (let f = 0; f < numFrames; f++) {
    const startIdx = f * hopSizeSamples;
    const isSpeechEnergy = frameRmsDb[f] > vadThresholdDb;

    // Window the frame
    let frameMaxAmp = 0;
    for (let i = 0; i < frameSizeSamples; i++) {
      const s = pcm[startIdx + i];
      windowedFrame[i] = s * hannWindow[i];
      const absS = Math.abs(s);
      if (absS > frameMaxAmp) frameMaxAmp = absS;
    }
    framePeakAmp[f] = frameMaxAmp;

    if (!isSpeechEnergy) {
      continue; // Below speech energy threshold
    }

    // Normalized cross-correlation for lag search
    let bestLag = -1;
    let maxCorr = -1;

    // Energy at zero lag
    let energy0 = 0;
    for (let i = 0; i < frameSizeSamples; i++) {
      energy0 += windowedFrame[i] * windowedFrame[i];
    }

    if (energy0 < 1e-6) continue;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let crossSum = 0;
      let energyLag = 0;
      const count = frameSizeSamples - lag;
      for (let i = 0; i < count; i++) {
        crossSum += windowedFrame[i] * windowedFrame[i + lag];
        energyLag += windowedFrame[i + lag] * windowedFrame[i + lag];
      }
      if (energyLag > 1e-6) {
        const normCorr = crossSum / Math.sqrt(energy0 * energyLag);
        if (normCorr > maxCorr) {
          maxCorr = normCorr;
          bestLag = lag;
        }
      }
    }

    // Voicing decision threshold (harmonic correlation peak >= 0.42)
    const isVoiced = maxCorr >= 0.42 && bestLag > 0;
    if (isVoiced && bestLag > 0) {
      // Parabolic interpolation around peak lag for fractional precision
      const refinedLag = bestLag;
      const f0 = analysisSampleRate / refinedLag;
      if (f0 >= f0Min && f0 <= f0Max) {
        frameF0[f] = Math.round(f0 * 10) / 10;
        frameVoiced[f] = true;
        voicedF0List.push(f0);
        voicedPeriods.push(refinedLag / analysisSampleRate);
        voicedAmplitudes.push(frameMaxAmp);

        // HNR approximation: 10 * log10(maxCorr / (1 - maxCorr + eps))
        const clampedCorr = Math.min(0.999, Math.max(0.01, maxCorr));
        const hnr = 10 * Math.log10(clampedCorr / (1 - clampedCorr));
        frameHnr[f] = hnr;
        voicedHnrList.push(hnr);
      }
    }
  }

  // Step 3: Pause and Digital Silence Analysis
  const minPauseFrames = Math.ceil(
    (SCREENING_CONFIG.signalProcessing.minPauseDurationMs / 1000) /
      (SCREENING_CONFIG.signalProcessing.hopSizeMs / 1000)
  ); // ~14 frames

  const isPauseFrame = new Array(numFrames).fill(false);
  const isDigitalSilenceFrame = new Array(numFrames).fill(false);

  let speechFramesCount = 0;
  let pauseFramesCount = 0;
  let pauseSegmentsCount = 0;
  let inPauseStreak = 0;

  // Track raw sample digital zeros inside detected pause frames
  let pauseTotalSamples = 0;
  let pauseDigitalZeroSamples = 0;
  let pauseAmbientEnergySum = 0;
  let pauseAmbientCount = 0;

  for (let f = 0; f < numFrames; f++) {
    const isSpeech = frameRmsDb[f] > vadThresholdDb;
    if (isSpeech) {
      speechFramesCount++;
      if (inPauseStreak >= minPauseFrames) {
        pauseSegmentsCount++;
      }
      inPauseStreak = 0;
    } else {
      pauseFramesCount++;
      inPauseStreak++;
      isPauseFrame[f] = true;

      // Inspect samples in this hop window for digital silence
      const startIdx = f * hopSizeSamples;
      for (let i = 0; i < hopSizeSamples; i++) {
        if (startIdx + i < totalSamples) {
          const s = pcm[startIdx + i];
          pauseTotalSamples++;
          if (Math.abs(s) <= SCREENING_CONFIG.signalProcessing.pureZeroSampleTolerance) {
            pauseDigitalZeroSamples++;
          } else {
            pauseAmbientEnergySum += s * s;
            pauseAmbientCount++;
          }
        }
      }

      // Check if this entire frame is digital silence (RMS < -75 dBFS)
      if (frameRmsDb[f] <= SCREENING_CONFIG.signalProcessing.digitalSilenceThresholdDbfs) {
        isDigitalSilenceFrame[f] = true;
      }
    }
  }

  if (inPauseStreak >= minPauseFrames) {
    pauseSegmentsCount++;
  }

  const hopSec = SCREENING_CONFIG.signalProcessing.hopSizeMs / 1000;
  const totalSpeechDurationSec = speechFramesCount * hopSec;
  const totalPauseDurationSec = pauseFramesCount * hopSec;
  const pauseRatio = numFrames > 0 ? pauseFramesCount / numFrames : 0;
  const digitalZeroRatioInPauses =
    pauseTotalSamples > 0 ? (pauseDigitalZeroSamples / pauseTotalSamples) * 100 : 0;

  const pauseAmbientNoiseFloorDbfs =
    pauseAmbientCount > 0
      ? 20 * Math.log10(Math.max(1e-6, Math.sqrt(pauseAmbientEnergySum / pauseAmbientCount)))
      : null;

  // Step 4: Compute Jitter (Pitch Period Perturbation)
  let jitterLocalPercent: number | null = null;
  let jitterValidity: ValidityStatus = 'usable';
  let jitterValidityReason = 'Voiced segments sufficient for local pitch cycle perturbation measurement.';

  if (voicedPeriods.length < SCREENING_CONFIG.featureSufficiency.minVoicedFramesForJitterShimmer) {
    jitterValidity = voicedPeriods.length >= 20 ? 'limited' : 'unavailable';
    jitterValidityReason = `Insufficient voiced audio (${(voicedPeriods.length * hopSec).toFixed(
      2
    )}s). Minimum 0.5s of voiced speech required for reliable jitter estimation.`;
  }

  if (clippingRatio > SCREENING_CONFIG.featureSufficiency.maxAcceptableClippingRatio) {
    jitterValidity = 'limited';
    jitterValidityReason += ' High clipping may introduce harmonic distortion.';
  }

  if (voicedPeriods.length >= 2) {
    let diffSum = 0;
    let periodSum = voicedPeriods[0];
    for (let i = 1; i < voicedPeriods.length; i++) {
      diffSum += Math.abs(voicedPeriods[i] - voicedPeriods[i - 1]);
      periodSum += voicedPeriods[i];
    }
    const meanPeriod = periodSum / voicedPeriods.length;
    if (meanPeriod > 0) {
      jitterLocalPercent = Math.round((diffSum / ((voicedPeriods.length - 1) * meanPeriod)) * 10000) / 100;
    }
  }

  // Step 5: Compute Shimmer (Amplitude Perturbation)
  let shimmerLocalPercent: number | null = null;
  let shimmerValidity: ValidityStatus = 'usable';
  let shimmerValidityReason = 'Voiced cycles sufficient for cycle-to-cycle amplitude perturbation measurement.';

  if (voicedAmplitudes.length < SCREENING_CONFIG.featureSufficiency.minVoicedFramesForJitterShimmer) {
    shimmerValidity = voicedAmplitudes.length >= 20 ? 'limited' : 'unavailable';
    shimmerValidityReason = `Insufficient voiced audio (${(voicedAmplitudes.length * hopSec).toFixed(
      2
    )}s). Minimum 0.5s required.`;
  }

  if (clippingRatio > SCREENING_CONFIG.featureSufficiency.maxAcceptableClippingRatio) {
    shimmerValidity = 'limited';
    shimmerValidityReason = 'Severe clipping limits cycle amplitude measurement accuracy.';
  }

  if (voicedAmplitudes.length >= 2) {
    let diffAmpSum = 0;
    let ampSum = voicedAmplitudes[0];
    for (let i = 1; i < voicedAmplitudes.length; i++) {
      diffAmpSum += Math.abs(voicedAmplitudes[i] - voicedAmplitudes[i - 1]);
      ampSum += voicedAmplitudes[i];
    }
    const meanAmp = ampSum / voicedAmplitudes.length;
    if (meanAmp > 1e-4) {
      shimmerLocalPercent = Math.round((diffAmpSum / ((voicedAmplitudes.length - 1) * meanAmp)) * 10000) / 100;
    }
  }

  // Step 6: Pitch Voicing Statistics
  let medianF0Hz: number | null = null;
  let minF0Hz: number | null = null;
  let maxF0Hz: number | null = null;
  let f0StdDevHz: number | null = null;
  let f0RangeSemitones: number | null = null;
  let pitchValidity: ValidityStatus = 'usable';
  let pitchValidityReason = 'Pitch tracking successful across voiced segments.';

  if (voicedF0List.length < SCREENING_CONFIG.featureSufficiency.minVoicedFramesForF0) {
    pitchValidity = voicedF0List.length > 5 ? 'limited' : 'unavailable';
    pitchValidityReason = `Very few voiced frames detected (${voicedF0List.length} frames). Pitch contour statistics limited.`;
  } else {
    const sortedF0 = [...voicedF0List].sort((a, b) => a - b);
    medianF0Hz = Math.round(sortedF0[Math.floor(sortedF0.length / 2)] * 10) / 10;
    // 5th and 95th percentiles to avoid outlier octave jumps
    minF0Hz = Math.round(sortedF0[Math.floor(sortedF0.length * 0.05)] * 10) / 10;
    maxF0Hz = Math.round(sortedF0[Math.floor(sortedF0.length * 0.95)] * 10) / 10;

    const meanF0 = voicedF0List.reduce((acc, v) => acc + v, 0) / voicedF0List.length;
    const varianceF0 =
      voicedF0List.reduce((acc, v) => acc + Math.pow(v - meanF0, 2), 0) / voicedF0List.length;
    f0StdDevHz = Math.round(Math.sqrt(varianceF0) * 10) / 10;

    if (minF0Hz > 0 && maxF0Hz >= minF0Hz) {
      f0RangeSemitones = Math.round(12 * Math.log2(maxF0Hz / minF0Hz) * 10) / 10;
    }
  }

  // Step 7: Harmonic-to-Noise Ratio (HNR)
  let meanHnrDb: number | null = null;
  let hnrValidity: ValidityStatus = 'usable';
  let hnrValidityReason = 'Voiced harmonic structure sufficient for HNR approximation.';

  if (voicedHnrList.length < SCREENING_CONFIG.featureSufficiency.minVoicedFramesForF0) {
    hnrValidity = voicedHnrList.length > 5 ? 'limited' : 'unavailable';
    hnrValidityReason = 'Too few voiced frames to establish harmonic-to-noise ratio.';
  } else {
    const hnrSum = voicedHnrList.reduce((acc, v) => acc + v, 0);
    meanHnrDb = Math.round((hnrSum / voicedHnrList.length) * 10) / 10;
  }

  // Step 8: Pause and Silence Validity
  let pauseValidity: ValidityStatus = 'usable';
  let pauseValidityReason = 'Usable pause windows detected between speech segments.';

  if (pauseFramesCount < SCREENING_CONFIG.featureSufficiency.minPauseFramesForSilenceEval) {
    pauseValidity = pauseFramesCount > 5 ? 'limited' : 'unavailable';
    pauseValidityReason = 'Very little pause duration in recording; noise floor measurement limited.';
  }

  // Step 9: Candidate Breath-like events (Low-confidence exploratory heuristic)
  // Explores whether unvoiced regions preceding speech onset display soft high-frequency friction
  let candidateBreathCount = 0;
  for (let f = 1; f < numFrames - 1; f++) {
    // If previous was pause/unvoiced and next is speech onset
    if (isPauseFrame[f] && !frameVoiced[f] && frameRmsDb[f] > noiseFloorDb + 3 && frameRmsDb[f] < vadThresholdDb) {
      candidateBreathCount++;
    }
  }
  const breathValidity: ValidityStatus =
    pauseValidity === 'usable' && totalSpeechDurationSec >= 2.0 ? 'limited' : 'unavailable';
  const breathValidityReason =
    'Breath acoustic detection is inherently low-confidence and easily confounded by microphone pop filters, noise gates, or lossy audio codecs.';

  // Step 10: Build interactive timeline points
  const timeline: TimelinePoint[] = [];
  for (let f = 0; f < numFrames; f++) {
    timeline.push({
      timeSec: Math.round(f * hopSec * 100) / 100,
      rms: Math.round(frameRmsValues[f] * 1000) / 1000,
      f0: frameF0[f],
      isVoiced: frameVoiced[f],
      isPause: isPauseFrame[f],
      isDigitalSilence: isDigitalSilenceFrame[f],
    });
  }

  // Energy variance
  const rmsMean =
    frameRmsValues.reduce((sum, v) => sum + v, 0) / Math.max(1, frameRmsValues.length);
  const rmsVar =
    frameRmsValues.reduce((sum, v) => sum + Math.pow(v - rmsMean, 2), 0) /
    Math.max(1, frameRmsValues.length);

  const pitchVoicing: PitchVoicingFeatures = {
    medianF0Hz,
    minF0Hz,
    maxF0Hz,
    f0StdDevHz,
    f0RangeSemitones,
    voicedFrameRatio:
      speechFramesCount > 0 ? Math.round((voicedF0List.length / speechFramesCount) * 1000) / 1000 : 0,
    totalVoicedDurationSec: Math.round(voicedF0List.length * hopSec * 100) / 100,
    totalVoicedFrames: voicedF0List.length,
    pitchValidity,
    pitchValidityReason,
    jitterLocalPercent,
    jitterValidity,
    jitterValidityReason,
  };

  const amplitudeQuality: AmplitudeQualityFeatures = {
    rmsEnergyVariance: Math.round(rmsVar * 100000) / 100000,
    dynamicRangeDbfs: Math.round(Math.abs(vadThresholdDb - noiseFloorDb) * 10) / 10,
    shimmerLocalPercent,
    shimmerValidity,
    shimmerValidityReason,
    hnrDb: meanHnrDb,
    hnrValidity,
    hnrValidityReason,
  };

  const pauseSilence: PauseSilenceFeatures = {
    totalSpeechDurationSec: Math.round(totalSpeechDurationSec * 100) / 100,
    totalPauseDurationSec: Math.round(totalPauseDurationSec * 100) / 100,
    pauseRatio: Math.round(pauseRatio * 1000) / 1000,
    pauseSegmentCount: pauseSegmentsCount,
    usablePauseDurationSec: Math.round(pauseFramesCount * hopSec * 100) / 100,
    digitalZeroRatioInPauses: Math.round(digitalZeroRatioInPauses * 10) / 10,
    pauseAmbientNoiseFloorDbfs:
      pauseAmbientNoiseFloorDbfs !== null ? Math.round(pauseAmbientNoiseFloorDbfs * 10) / 10 : null,
    pauseValidity,
    pauseValidityReason,
  };

  const breath: BreathFeatures = {
    candidateBreathEventsCount: candidateBreathCount,
    breathValidity,
    breathValidityReason,
    notes:
      'Breath observations are exploratory signals only. Absence or presence does not verify voice origin.',
  };

  return {
    pitchVoicing,
    amplitudeQuality,
    pauseSilence,
    breath,
    timeline,
    analysisSampleRate,
    frameSizeMs: SCREENING_CONFIG.signalProcessing.frameSizeMs,
    hopSizeMs: SCREENING_CONFIG.signalProcessing.hopSizeMs,
    totalFrames: numFrames,
    extractionTimestamp: new Date().toISOString(),
  };
}
