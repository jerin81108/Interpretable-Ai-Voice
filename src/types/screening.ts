import type { AudioMetadata, AudioQualityMetrics } from './audio';
import type { EvidenceDirection, ExtractedAcousticFeatures, TimelinePoint, ValidityStatus } from './features';

export type ScreeningOutcomeType = 
  | 'synthetic_leaning' 
  | 'natural_leaning' 
  | 'inconclusive';

export interface EvidenceCard {
  id: string;
  category: 'pitch' | 'silence' | 'shimmer_jitter' | 'hnr' | 'breath' | 'quality';
  title: string;
  direction: EvidenceDirection;
  validity: ValidityStatus;
  measuredValueFormatted: string;
  unit: string;
  measurementMethod: string;
  parameters: string;
  baselineExpectedText: string;

  // The 5 mandatory questions answered in plain language
  whatWasMeasured: string;
  whatWasObserved: string;
  whyItMatters: string;
  alternativeExplanations: string; // Caveats and confounders
  usableDataAmount: string;

  contributionScore: number; // e.g. -1.0 to +1.0
  confidenceWeight: number; // 0.0 to 1.0 based on sample adequacy
}

export interface ScreeningResult {
  version: string;
  timestamp: string;
  outcome: ScreeningOutcomeType;
  outcomeTitle: string;
  outcomeSummary: string;
  disclaimer: string;
  
  // Explicitly labeled prototype signal index (not a ground truth probability)
  prototypeSignalIndex: number; // 0 to 100
  signalIndexLabel: string;
  
  usableFeaturesCount: number;
  limitedFeaturesCount: number;
  unavailableFeaturesCount: number;

  primaryObservations: string[];
  evidenceCards: EvidenceCard[];
  qualityWarnings: string[];
  
  timeline: TimelinePoint[];
  audioMetadata: AudioMetadata;
  qualityMetrics: AudioQualityMetrics;
  rawFeatures: ExtractedAcousticFeatures;
}
