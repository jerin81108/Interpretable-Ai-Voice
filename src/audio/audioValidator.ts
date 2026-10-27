import { SCREENING_CONFIG } from '../config/screeningConfig';
import type { ValidationResult } from '../types/audio';

/**
 * Validates file properties before attempting audio decoding.
 */
export function validateAudioFile(file: File): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file existence and empty size
  if (!file || file.size === 0) {
    return {
      valid: false,
      errors: ['The selected file is empty (0 bytes). Please select a valid audio recording.'],
      warnings: [],
    };
  }

  // Check file size limits
  if (file.size > SCREENING_CONFIG.audioLimits.maxFileSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const maxMb = (SCREENING_CONFIG.audioLimits.maxFileSizeBytes / (1024 * 1024)).toFixed(0);
    errors.push(
      `File size (${sizeMb} MB) exceeds the maximum limit of ${maxMb} MB. Please upload a shorter or compressed audio clip.`
    );
  }

  // Check extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = SCREENING_CONFIG.audioLimits.supportedExtensions.some((ext) =>
    fileName.endsWith(ext)
  );

  // Check MIME type if available
  const mimeType = file.type.toLowerCase();
  const hasValidMime =
    !mimeType ||
    SCREENING_CONFIG.audioLimits.supportedMimeTypes.some((type) => mimeType.includes(type));

  if (!hasValidExtension && !hasValidMime) {
    errors.push(
      `Unsupported audio format. Supported formats are: ${SCREENING_CONFIG.audioLimits.supportedExtensions.join(
        ', '
      )}. If your file is valid audio, please convert it to WAV or MP3.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates decoded audio buffer characteristics prior to screening.
 */
export function validateDecodedAudio(
  durationSec: number,
  sampleRate: number,
  channels: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (durationSec < SCREENING_CONFIG.audioLimits.minDurationSec) {
    errors.push(
      `Clip duration (${durationSec.toFixed(2)}s) is too short for acoustic screening. Minimum required duration is ${SCREENING_CONFIG.audioLimits.minDurationSec} second.`
    );
  } else if (durationSec < SCREENING_CONFIG.audioLimits.recommendedMinDurationSec) {
    warnings.push(
      `Clip duration (${durationSec.toFixed(2)}s) is relatively brief. Measurements like pitch perturbation (jitter) and pause noise floor require at least ${SCREENING_CONFIG.audioLimits.recommendedMinDurationSec}s for optimal stability.`
    );
  }

  if (durationSec > SCREENING_CONFIG.audioLimits.maxDurationSec) {
    errors.push(
      `Clip duration (${(durationSec / 60).toFixed(1)} min) exceeds the maximum screening limit of ${(
        SCREENING_CONFIG.audioLimits.maxDurationSec / 60
      ).toFixed(0)} minutes. Please trim the clip.`
    );
  }

  if (sampleRate < 8000) {
    warnings.push(
      `Sample rate (${sampleRate} Hz) is very low. Higher speech frequencies and vocal harmonics may be attenuated.`
    );
  }

  if (channels > 2) {
    warnings.push(
      `Audio has ${channels} channels. Channels will be downmixed to mono for deterministic acoustic analysis.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
