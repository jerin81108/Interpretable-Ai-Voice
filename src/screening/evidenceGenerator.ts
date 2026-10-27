import { SCREENING_CONFIG } from '../config/screeningConfig';
import type { AudioQualityMetrics } from '../types/audio';
import type { ExtractedAcousticFeatures } from '../types/features';
import type { EvidenceCard } from '../types/screening';

/**
 * Generates structured, interpretable evidence cards tied directly to measured features.
 * Every card explicitly answers the 5 required questions:
 * 1. What was measured?
 * 2. What was observed?
 * 3. Why might that matter?
 * 4. What other factors could explain it?
 * 5. How much usable data supported this observation?
 */
export function generateEvidenceCards(
  features: ExtractedAcousticFeatures,
  quality: AudioQualityMetrics
): EvidenceCard[] {
  const cards: EvidenceCard[] = [];
  const cfg = SCREENING_CONFIG.acousticBaselines;

  // -------------------------------------------------------------
  // Card 1: Pause Silence & Acoustic Room Tone
  // -------------------------------------------------------------
  const pause = features.pauseSilence;
  const digZero = pause.digitalZeroRatioInPauses;
  let pauseDirection: EvidenceCard['direction'] = 'neutral';
  let pauseScore = 0;
  let pauseObserved = '';

  if (pause.pauseValidity === 'unavailable') {
    pauseDirection = 'neutral';
    pauseObserved = 'No usable pause windows detected in this clip.';
  } else if (digZero >= cfg.digitalZeroInPausesPercent.abnormalSyntheticThreshold) {
    pauseDirection = 'synthetic_leaning';
    pauseScore = 0.85;
    pauseObserved = `${digZero.toFixed(1)}% of detected pause duration contains near-digital-zero samples (< -75 dBFS). Natural acoustic background noise was largely absent during silences.`;
  } else if (digZero <= cfg.digitalZeroInPausesPercent.naturalAcousticLimit && pause.pauseAmbientNoiseFloorDbfs !== null) {
    pauseDirection = 'natural_leaning';
    pauseScore = -0.7;
    pauseObserved = `Pauses contain continuous ambient acoustic room tone (approx. ${pause.pauseAmbientNoiseFloorDbfs.toFixed(1)} dBFS) with only ${digZero.toFixed(1)}% digital zero samples.`;
  } else {
    pauseDirection = 'neutral';
    pauseScore = 0.1;
    pauseObserved = `Pause windows display mixed room noise with ${digZero.toFixed(1)}% digital silence.`;
  }

  cards.push({
    id: 'pause-digital-silence',
    category: 'silence',
    title: 'Pause Structure & Digital Silence',
    direction: pauseDirection,
    validity: pause.pauseValidity,
    measuredValueFormatted: `${digZero.toFixed(1)}% digital zero`,
    unit: '% of pause duration',
    measurementMethod: 'Energy-gated pause window segmentation with sample-level digital zero count (tolerance < 0.00008).',
    parameters: `Min pause: ${SCREENING_CONFIG.signalProcessing.minPauseDurationMs}ms, digital silence threshold: ${SCREENING_CONFIG.signalProcessing.digitalSilenceThresholdDbfs} dBFS`,
    baselineExpectedText: `Physical microphone recordings typically exhibit continuous acoustic ambient noise (-65 to -40 dBFS) with < 5% digital zero. Many TTS systems output exact numerical zeros between phoneme phrases.`,
    whatWasMeasured: 'The amplitude and noise floor characteristics exclusively inside detected speech pauses.',
    whatWasObserved: pauseObserved,
    whyItMatters:
      'Synthetic speech engines frequently generate mathematically quiet silence or zero-pad splice boundaries. Natural human recordings captured through physical microphones almost always exhibit persistent thermal noise and room reflections.',
    alternativeExplanations:
      'Aggressive noise-gate plugins, podcast editing software, compression expanders, or high studio sound isolation can also remove background noise from genuine human speech.',
    usableDataAmount: `${pause.totalPauseDurationSec.toFixed(2)} seconds across ${pause.pauseSegmentCount} pause segments (${pause.pauseValidityReason}).`,
    contributionScore: pauseScore,
    confidenceWeight: pause.pauseValidity === 'usable' ? 0.95 : 0.4,
  });

  // -------------------------------------------------------------
  // Card 2: Pitch Perturbation (Jitter)
  // -------------------------------------------------------------
  const pitch = features.pitchVoicing;
  const jitter = pitch.jitterLocalPercent;
  let jitterDirection: EvidenceCard['direction'] = 'neutral';
  let jitterScore = 0;
  let jitterObserved = '';

  if (pitch.jitterValidity === 'unavailable' || jitter === null) {
    jitterDirection = 'neutral';
    jitterObserved = 'Jitter measurement unavailable due to insufficient voiced speech.';
  } else if (jitter < cfg.jitterLocalPercent.abnormallyLowThreshold) {
    jitterDirection = 'synthetic_leaning';
    jitterScore = 0.8;
    jitterObserved = `Measured local jitter is ${jitter.toFixed(2)}%, which is unusually low and indicates hyper-regular cycle-to-cycle periodicity.`;
  } else if (jitter > cfg.jitterLocalPercent.abnormallyHighThreshold) {
    jitterDirection = 'synthetic_leaning';
    jitterScore = 0.6;
    jitterObserved = `Measured local jitter is ${jitter.toFixed(2)}%, which is elevated. This may reflect phase discontinuities or vocoder tracking artifacts.`;
  } else if (jitter >= cfg.jitterLocalPercent.minNatural && jitter <= cfg.jitterLocalPercent.maxNatural) {
    jitterDirection = 'natural_leaning';
    jitterScore = -0.75;
    jitterObserved = `Measured local jitter is ${jitter.toFixed(2)}%, falling within typical human laryngeal perturbation range.`;
  } else {
    jitterDirection = 'neutral';
    jitterScore = 0.0;
    jitterObserved = `Measured local jitter is ${jitter.toFixed(2)}%, near borderline boundaries.`;
  }

  cards.push({
    id: 'pitch-jitter',
    category: 'pitch',
    title: 'Pitch Period Perturbation (Local Jitter)',
    direction: jitterDirection,
    validity: pitch.jitterValidity,
    measuredValueFormatted: jitter !== null ? `${jitter.toFixed(2)}%` : 'Unavailable',
    unit: '% cycle variation',
    measurementMethod: 'Relative average difference between consecutive fundamental pitch periods (Normalized Cross-Correlation peak tracking).',
    parameters: `Voicing correlation threshold >= 0.42, search range ${SCREENING_CONFIG.signalProcessing.f0MinHz} - ${SCREENING_CONFIG.signalProcessing.f0MaxHz} Hz`,
    baselineExpectedText: `Typical adult human speech exhibits natural micro-variability in vocal fold vibration of approximately 0.25% to 1.80%.`,
    whatWasMeasured: 'Cycle-to-cycle variability in the duration of fundamental pitch periods during voiced phonemes.',
    whatWasObserved: jitterObserved,
    whyItMatters:
      'Human vocal folds have biomechanical irregularities producing small involuntary timing variations. Some older or lower-complexity speech synthesizers produce unnaturally periodic, sterile pitch pulses.',
    alternativeExplanations:
      'Professional singers or trained speakers can produce highly steady tones. Severe microphone clipping, room reverberation, or lossy MP3 compression can also distort pitch period boundaries.',
    usableDataAmount: `${pitch.totalVoicedDurationSec.toFixed(2)}s voiced speech (${pitch.totalVoicedFrames} analysis frames). Status: ${pitch.jitterValidityReason}`,
    contributionScore: jitterScore,
    confidenceWeight: pitch.jitterValidity === 'usable' ? 0.9 : 0.35,
  });

  // -------------------------------------------------------------
  // Card 3: Amplitude Perturbation (Shimmer)
  // -------------------------------------------------------------
  const amp = features.amplitudeQuality;
  const shimmer = amp.shimmerLocalPercent;
  let shimmerDirection: EvidenceCard['direction'] = 'neutral';
  let shimmerScore = 0;
  let shimmerObserved = '';

  if (amp.shimmerValidity === 'unavailable' || shimmer === null) {
    shimmerDirection = 'neutral';
    shimmerObserved = 'Shimmer measurement unavailable.';
  } else if (shimmer < cfg.shimmerLocalPercent.abnormallyLowThreshold) {
    shimmerDirection = 'synthetic_leaning';
    shimmerScore = 0.75;
    shimmerObserved = `Measured local shimmer is ${shimmer.toFixed(2)}%, showing unusually low amplitude variability across consecutive cycles.`;
  } else if (shimmer >= cfg.shimmerLocalPercent.minNatural && shimmer <= cfg.shimmerLocalPercent.maxNatural) {
    shimmerDirection = 'natural_leaning';
    shimmerScore = -0.7;
    shimmerObserved = `Measured local shimmer is ${shimmer.toFixed(2)}%, consistent with natural vocal tract pressure fluctuation.`;
  } else {
    shimmerDirection = 'neutral';
    shimmerObserved = `Measured local shimmer is ${shimmer.toFixed(2)}%.`;
  }

  cards.push({
    id: 'amplitude-shimmer',
    category: 'shimmer_jitter',
    title: 'Amplitude Perturbation (Local Shimmer)',
    direction: shimmerDirection,
    validity: amp.shimmerValidity,
    measuredValueFormatted: shimmer !== null ? `${shimmer.toFixed(2)}%` : 'Unavailable',
    unit: '% amplitude variation',
    measurementMethod: 'Relative average difference between peak amplitudes of consecutive pitch periods.',
    parameters: 'Peak envelope extraction across contiguous voiced frames.',
    baselineExpectedText: 'Typical human conversational speech exhibits cycle amplitude fluctuation between 1.80% and 6.50%.',
    whatWasMeasured: 'Short-term cycle-to-cycle fluctuation in acoustic amplitude during voiced sounds.',
    whatWasObserved: shimmerObserved,
    whyItMatters:
      'Synthetic vocoders with rigid parametric models can produce flat, artificial energy envelopes, whereas natural human subglottic pressure fluctuates continuously.',
    alternativeExplanations:
      'Audio limiters, dynamic compressors, radio broadcast mastering, or microphone clipping can compress amplitude variation in genuine human speech.',
    usableDataAmount: `${pitch.totalVoicedDurationSec.toFixed(2)}s voiced speech. Status: ${amp.shimmerValidityReason}`,
    contributionScore: shimmerScore,
    confidenceWeight: amp.shimmerValidity === 'usable' ? 0.85 : 0.3,
  });

  // -------------------------------------------------------------
  // Card 4: Fundamental Frequency (F0) Dynamics
  // -------------------------------------------------------------
  const semitones = pitch.f0RangeSemitones;
  let pitchRangeDirection: EvidenceCard['direction'] = 'neutral';
  let pitchRangeScore = 0;
  let pitchRangeObserved = '';

  if (pitch.pitchValidity === 'unavailable' || semitones === null) {
    pitchRangeDirection = 'neutral';
    pitchRangeObserved = 'Pitch dynamics unavailable due to lack of sustained voiced phonemes.';
  } else if (semitones < cfg.f0RangeSemitones.minNaturalConversational && pitch.totalVoicedDurationSec >= 2.0) {
    pitchRangeDirection = 'synthetic_leaning';
    pitchRangeScore = 0.65;
    pitchRangeObserved = `Pitch range is restricted (${semitones.toFixed(1)} semitones; median F0: ${pitch.medianF0Hz} Hz), indicating an unusually flat or monotone intonation contour.`;
  } else if (semitones >= cfg.f0RangeSemitones.minNaturalConversational) {
    pitchRangeDirection = 'natural_leaning';
    pitchRangeScore = -0.5;
    pitchRangeObserved = `Pitch dynamic range spans ${semitones.toFixed(1)} semitones (median: ${pitch.medianF0Hz} Hz, range: ${pitch.minF0Hz} - ${pitch.maxF0Hz} Hz), displaying natural prosodic inflection.`;
  } else {
    pitchRangeDirection = 'neutral';
    pitchRangeObserved = `Pitch range spans ${semitones.toFixed(1)} semitones.`;
  }

  cards.push({
    id: 'pitch-contour-dynamics',
    category: 'pitch',
    title: 'Intonation & Pitch Dynamic Range',
    direction: pitchRangeDirection,
    validity: pitch.pitchValidity,
    measuredValueFormatted: semitones !== null ? `${semitones.toFixed(1)} semitones` : 'Unavailable',
    unit: 'semitones (F0 span)',
    measurementMethod: 'Semitone logarithmic interval between 5th and 95th percentiles of fundamental frequency track.',
    parameters: `Median: ${pitch.medianF0Hz ?? 'N/A'} Hz, Min: ${pitch.minF0Hz ?? 'N/A'} Hz, Max: ${pitch.maxF0Hz ?? 'N/A'} Hz`,
    baselineExpectedText: 'Spoken dialogue typically modulates pitch across 2.5 to 14.0 semitones depending on emotion and language.',
    whatWasMeasured: 'The breadth and distribution of vocal pitch variation across the entire clip.',
    whatWasObserved: pitchRangeObserved,
    whyItMatters:
      'Natural prosody involves expressive pitch contours reflecting emotion, emphasis, and grammar. Monotone or robotic pitch contours can indicate primitive synthetic voices.',
    alternativeExplanations:
      'Monotone speech can occur in human speakers due to fatigue, reading formal text, neurodivergence, or cultural speaking styles. Modern neural TTS can also produce rich prosody.',
    usableDataAmount: `${pitch.totalVoicedDurationSec.toFixed(2)}s voiced speech (${(pitch.voicedFrameRatio * 100).toFixed(0)}% of speech frames voiced).`,
    contributionScore: pitchRangeScore,
    confidenceWeight: pitch.pitchValidity === 'usable' ? 0.8 : 0.4,
  });

  // -------------------------------------------------------------
  // Card 5: Harmonic-to-Noise Ratio (HNR)
  // -------------------------------------------------------------
  const hnr = amp.hnrDb;
  let hnrDirection: EvidenceCard['direction'] = 'neutral';
  let hnrScore = 0;
  let hnrObserved = '';

  if (amp.hnrValidity === 'unavailable' || hnr === null) {
    hnrDirection = 'neutral';
    hnrObserved = 'HNR measurement unavailable.';
  } else if (hnr > cfg.harmonicToNoiseRatioDb.hyperCleanThreshold) {
    hnrDirection = 'synthetic_leaning';
    hnrScore = 0.55;
    hnrObserved = `Estimated HNR is exceptionally high (${hnr.toFixed(1)} dB), reflecting an unnaturally sterile harmonic structure devoid of typical glottal aspiration.`;
  } else if (hnr >= cfg.harmonicToNoiseRatioDb.minNatural && hnr <= cfg.harmonicToNoiseRatioDb.maxNatural) {
    hnrDirection = 'natural_leaning';
    hnrScore = -0.5;
    hnrObserved = `Estimated HNR is ${hnr.toFixed(1)} dB, matching typical voiced speech harmonic purity.`;
  } else {
    hnrDirection = 'neutral';
    hnrObserved = `Estimated HNR is ${hnr.toFixed(1)} dB.`;
  }

  cards.push({
    id: 'harmonic-to-noise',
    category: 'hnr',
    title: 'Harmonic-to-Noise Ratio (HNR Approximation)',
    direction: hnrDirection,
    validity: amp.hnrValidity,
    measuredValueFormatted: hnr !== null ? `${hnr.toFixed(1)} dB` : 'Unavailable',
    unit: 'dB harmonic purity',
    measurementMethod: 'Autocorrelation peak energy ratio vs residual aperiodic energy in voiced frames.',
    parameters: 'Voiced window autocorrelation maximum approximation (Praat-approximate formulation).',
    baselineExpectedText: 'Normal healthy adult vocal cord vibration typically produces HNR between 10.0 dB and 24.0 dB.',
    whatWasMeasured: 'The proportion of harmonic acoustic energy compared to aperiodic noise in voiced phonemes.',
    whatWasObserved: hnrObserved,
    whyItMatters:
      'Human voices produce a natural blend of periodic harmonic vibration and soft turbulent aspiration noise. Purely synthetic or over-smoothed speech can show artificial harmonic sterility.',
    alternativeExplanations:
      'High-end studio condenser microphones with noise cancellation can produce unusually clean recordings. Background room noise or raspy vocal hoarseness can lower HNR.',
    usableDataAmount: `${pitch.totalVoicedDurationSec.toFixed(2)}s voiced audio evaluated.`,
    contributionScore: hnrScore,
    confidenceWeight: amp.hnrValidity === 'usable' ? 0.75 : 0.3,
  });

  // -------------------------------------------------------------
  // Card 6: Candidate Breath & Pause Naturalness
  // -------------------------------------------------------------
  const breath = features.breath;
  let breathDirection: EvidenceCard['direction'] = 'neutral';
  let breathObserved = '';

  if (breath.breathValidity === 'unavailable') {
    breathDirection = 'neutral';
    breathObserved = 'Breath analysis unavailable (insufficient speech/pause duration or low signal quality).';
  } else if (breath.candidateBreathEventsCount > 0) {
    breathDirection = 'natural_leaning';
    breathObserved = `${breath.candidateBreathEventsCount} candidate breath-like acoustic transitions detected prior to speech onset windows.`;
  } else {
    breathDirection = 'neutral';
    breathObserved = 'No clear breath-like acoustic transitions detected before speech onset windows.';
  }

  cards.push({
    id: 'breath-naturalness',
    category: 'breath',
    title: 'Candidate Breath & Transition Naturalness',
    direction: breathDirection,
    validity: breath.breathValidity,
    measuredValueFormatted: `${breath.candidateBreathEventsCount} candidate events`,
    unit: 'detected events',
    measurementMethod: 'Pre-speech onset energy rise and low-energy turbulent friction detection.',
    parameters: 'Experimental low-confidence acoustic heuristic.',
    baselineExpectedText: 'Natural human speech frequently contains subtle inhalation or exhalation sounds near phrase boundaries.',
    whatWasMeasured: 'Acoustic indicators of airflow and gentle breath intake preceding speech phrases.',
    whatWasObserved: breathObserved,
    whyItMatters:
      'Human speakers require breathing cycles to sustain speech. Some synthetic systems jump abruptly from digital zero to speech without natural pre-voicing airflow.',
    alternativeExplanations:
      'Breath sounds are routinely removed by human audio editors, suppressed by lavalier mic noise gates, or omitted in professional dubbing. Modern generative AI models can also synthesize breath sounds.',
    usableDataAmount: `Exploratory heuristic over ${pause.pauseSegmentCount} phrase boundaries (${breath.breathValidityReason}).`,
    contributionScore: breathDirection === 'natural_leaning' ? -0.3 : 0,
    confidenceWeight: 0.35, // Intentionally low weight because breath is non-conclusive
  });

  // -------------------------------------------------------------
  // Card 7: Signal Quality & Recording Integrity
  // -------------------------------------------------------------
  let qualityDirection: EvidenceCard['direction'] = 'neutral';
  let qualityValidity: EvidenceCard['validity'] = 'usable';
  let qualityObserved = `Peak amplitude: ${quality.peakDbfs.toFixed(1)} dBFS, estimated noise floor: ${quality.backgroundNoiseDbfs.toFixed(1)} dBFS (SNR: ${quality.snrDbfsEstimate.toFixed(1)} dB).`;

  if (quality.isClipped) {
    qualityDirection = 'neutral';
    qualityValidity = 'limited';
    qualityObserved += ` Warning: ${(quality.clippingRatio * 100).toFixed(1)}% of samples are clipped near full scale.`;
  }
  if (quality.warnings.length > 0) {
    qualityValidity = 'limited';
  }

  cards.push({
    id: 'signal-recording-integrity',
    category: 'quality',
    title: 'Signal Quality & Recording Integrity',
    direction: qualityDirection,
    validity: qualityValidity,
    measuredValueFormatted: `${quality.snrDbfsEstimate.toFixed(1)} dB SNR`,
    unit: 'dB SNR',
    measurementMethod: 'Global peak search, sample clipping ratio, and 10th percentile energy distribution analysis.',
    parameters: `Clipping threshold: ±0.995, Peak: ${quality.peakDbfs} dBFS`,
    baselineExpectedText: 'Acoustic analysis is most reliable with unclipped signals and at least 15 dB SNR.',
    whatWasMeasured: 'Clipping, dynamic range, and background ambient noise level.',
    whatWasObserved: qualityObserved,
    whyItMatters:
      'Severe clipping or excessive background noise distorts pitch tracking, alters harmonics, and impairs perturbation measurements.',
    alternativeExplanations:
      'Recording equipment, gain levels, microphone distance, and environmental conditions directly impact signal quality independently of voice origin.',
    usableDataAmount: `Evaluated across all ${features.totalFrames} audio frames.`,
    contributionScore: 0,
    confidenceWeight: 1.0,
  });

  return cards;
}
