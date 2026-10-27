import * as XLSX from 'xlsx';
import type { ScreeningResult } from '../types/screening';
import type { StoredAuditRecord } from './auditStorage';

/**
 * Exports a single screening result to a multi-sheet Microsoft Excel (.xlsx) workbook.
 */
export function exportSingleResultToExcel(result: ScreeningResult): void {
  const wb = XLSX.utils.book_new();

  // ---------------------------------------------------------
  // Sheet 1: Screening Summary
  // ---------------------------------------------------------
  const summaryRows = [
    ['VOICEPRINT - INTERPRETABLE AI-VOICE SCREENING REPORT', ''],
    ['Report Generated', new Date().toLocaleString()],
    ['Analysis Version', result.version],
    ['', ''],
    ['1. AUDIO FILE METADATA', ''],
    ['File Name', result.audioMetadata.fileName],
    ['Duration (seconds)', result.audioMetadata.durationSec.toFixed(2)],
    ['Original Sample Rate (Hz)', result.audioMetadata.sampleRate],
    ['Channels', result.audioMetadata.channels === 1 ? 'Mono' : 'Stereo'],
    ['Format', result.audioMetadata.format],
    ['Bit Depth Estimate', result.audioMetadata.bitDepthEstimate],
    ['Peak Level (dBFS)', result.qualityMetrics.peakDbfs],
    ['Noise Floor (dBFS)', result.qualityMetrics.backgroundNoiseDbfs],
    ['Signal-to-Noise Ratio (dB)', result.qualityMetrics.snrDbfsEstimate],
    ['Clipping Ratio', `${(result.qualityMetrics.clippingRatio * 100).toFixed(2)}%`],
    ['', ''],
    ['2. SCREENING ASSESSMENT', ''],
    ['Top-level Outcome', result.outcomeTitle],
    ['Outcome Category', result.outcome],
    ['Prototype Signal Index (0-100)', result.prototypeSignalIndex],
    ['Outcome Summary', result.outcomeSummary],
    ['Usable Features Count', result.usableFeaturesCount],
    ['Limited Features Count', result.limitedFeaturesCount],
    ['Unavailable Features Count', result.unavailableFeaturesCount],
    ['', ''],
    ['3. PRIMARY OBSERVATIONS', ''],
    ...result.primaryObservations.map((obs, idx) => [`Observation ${idx + 1}`, obs]),
    ['', ''],
    ['4. QUALITY NOTICES & WARNINGS', ''],
    ...(result.qualityWarnings.length > 0
      ? result.qualityWarnings.map((w, idx) => [`Warning ${idx + 1}`, w])
      : [['Quality Status', 'Clean recording without significant clipping or noise flags.']]),
    ['', ''],
    ['5. MANDATORY LIMITATION & DISCLAIMER', ''],
    ['Disclaimer', result.disclaimer],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Screening Summary');

  // ---------------------------------------------------------
  // Sheet 2: Evidence Cards (5-point forensic questions)
  // ---------------------------------------------------------
  const evidenceHeaders = [
    'Evidence ID',
    'Feature Title',
    'Direction Signal',
    'Data Validity',
    'Measured Value',
    'Unit',
    'Expected Baseline',
    '1. What Was Measured',
    '2. What Was Observed',
    '3. Why It Matters',
    '4. Alternative Explanations (Caveats & Confounders)',
    '5. Usable Sample Support',
    'Method & Parameters',
  ];

  const evidenceRows = result.evidenceCards.map((card) => [
    card.id,
    card.title,
    card.direction,
    card.validity,
    card.measuredValueFormatted,
    card.unit,
    card.baselineExpectedText,
    card.whatWasMeasured,
    card.whatWasObserved,
    card.whyItMatters,
    card.alternativeExplanations,
    card.usableDataAmount,
    `${card.measurementMethod} (Params: ${card.parameters})`,
  ]);

  const wsEvidence = XLSX.utils.aoa_to_sheet([evidenceHeaders, ...evidenceRows]);
  wsEvidence['!cols'] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 35 },
    { wch: 40 },
    { wch: 45 },
    { wch: 45 },
    { wch: 50 },
    { wch: 30 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEvidence, 'Evidence Observations');

  // ---------------------------------------------------------
  // Sheet 3: Raw Acoustic Features Table
  // ---------------------------------------------------------
  const raw = result.rawFeatures;
  const rawFeatureRows = [
    ['Feature Name', 'Extracted Value', 'Unit', 'Data Validity', 'Mathematical DSP Method & Parameters'],
    ['Median Fundamental Frequency (F0)', raw.pitchVoicing.medianF0Hz ?? 'N/A', 'Hz', raw.pitchVoicing.pitchValidity, 'NCCF lag search (65 - 450 Hz)'],
    ['Pitch 5th Percentile (Min F0)', raw.pitchVoicing.minF0Hz ?? 'N/A', 'Hz', raw.pitchVoicing.pitchValidity, '5th percentile of voiced pitch contour'],
    ['Pitch 95th Percentile (Max F0)', raw.pitchVoicing.maxF0Hz ?? 'N/A', 'Hz', raw.pitchVoicing.pitchValidity, '95th percentile of voiced pitch contour'],
    ['Pitch Standard Deviation', raw.pitchVoicing.f0StdDevHz ?? 'N/A', 'Hz', raw.pitchVoicing.pitchValidity, 'Standard deviation of voiced pitch values'],
    ['Intonation Dynamic Range', raw.pitchVoicing.f0RangeSemitones ?? 'N/A', 'semitones', raw.pitchVoicing.pitchValidity, '12 * log2(P95 / P05)'],
    ['Voiced Frame Ratio', `${(raw.pitchVoicing.voicedFrameRatio * 100).toFixed(1)}%`, '% speech frames', 'usable', 'Voiced frames / speech frames'],
    ['Total Voiced Duration', raw.pitchVoicing.totalVoicedDurationSec, 'seconds', 'usable', `${raw.pitchVoicing.totalVoicedFrames} frames at 10ms hop`],
    ['Local Pitch Perturbation (Jitter)', raw.pitchVoicing.jitterLocalPercent !== null ? `${raw.pitchVoicing.jitterLocalPercent}%` : 'N/A', '% cycle-to-cycle', raw.pitchVoicing.jitterValidity, 'Mean relative period difference'],
    ['Local Amplitude Perturbation (Shimmer)', raw.amplitudeQuality.shimmerLocalPercent !== null ? `${raw.amplitudeQuality.shimmerLocalPercent}%` : 'N/A', '% amp-to-amp', raw.amplitudeQuality.shimmerValidity, 'Mean relative peak amplitude difference'],
    ['Harmonic-to-Noise Ratio (HNR)', raw.amplitudeQuality.hnrDb !== null ? `${raw.amplitudeQuality.hnrDb} dB` : 'N/A', 'dB', raw.amplitudeQuality.hnrValidity, 'Autocorrelation peak maximum approximation'],
    ['Pause Digital Zero Ratio', `${raw.pauseSilence.digitalZeroRatioInPauses.toFixed(1)}%`, '% pause duration', raw.pauseSilence.pauseValidity, 'Samples abs < 0.00008 in pause windows'],
    ['Pause Ambient Room Tone', raw.pauseSilence.pauseAmbientNoiseFloorDbfs !== null ? `${raw.pauseSilence.pauseAmbientNoiseFloorDbfs} dBFS` : 'N/A', 'dBFS', raw.pauseSilence.pauseValidity, 'RMS of non-zero pause samples'],
    ['Total Pause Duration', raw.pauseSilence.totalPauseDurationSec, 'seconds', 'usable', `${raw.pauseSilence.pauseSegmentCount} distinct pause intervals`],
    ['Candidate Breath Transitions', raw.breath.candidateBreathEventsCount, 'events', raw.breath.breathValidity, 'Pre-speech unvoiced acoustic friction indicator'],
  ];

  const wsFeatures = XLSX.utils.aoa_to_sheet(rawFeatureRows);
  wsFeatures['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsFeatures, 'Raw Acoustic Features');

  // ---------------------------------------------------------
  // Sheet 4: Timeline Points (Sampled for reasonable size)
  // ---------------------------------------------------------
  const timelineHeaders = ['Time (s)', 'RMS Energy', 'F0 Pitch (Hz)', 'Voiced (Y/N)', 'Pause (Y/N)', 'Digital Silence (Y/N)'];
  const timelineRows = result.timeline.map((pt) => [
    pt.timeSec,
    pt.rms,
    pt.f0 ?? '',
    pt.isVoiced ? 'Y' : 'N',
    pt.isPause ? 'Y' : 'N',
    pt.isDigitalSilence ? 'Y' : 'N',
  ]);

  const wsTimeline = XLSX.utils.aoa_to_sheet([timelineHeaders, ...timelineRows]);
  wsTimeline['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsTimeline, 'Timeline Track');

  // Trigger download
  const cleanName = result.audioMetadata.fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Voiceprint_Report_${cleanName}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Exports the complete stored audit history of multiple screened audio clips into a master Excel workbook.
 */
export function exportAuditHistoryToExcel(records: StoredAuditRecord[]): void {
  if (records.length === 0) {
    alert('No audit records are currently stored in the system.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // ---------------------------------------------------------
  // Sheet 1: Master History Log
  // ---------------------------------------------------------
  const logHeaders = [
    'Record ID',
    'Saved Timestamp',
    'File Name',
    'Duration (s)',
    'Format',
    'Sample Rate (Hz)',
    'Channels',
    'Screening Outcome',
    'Prototype Signal Index (0-100)',
    'Median F0 (Hz)',
    'F0 Semitone Range',
    'Local Jitter (%)',
    'Local Shimmer (%)',
    'HNR (dB)',
    'Pause Digital Zero (%)',
    'Pause Room Tone (dBFS)',
    'Peak (dBFS)',
    'SNR (dB)',
    'Clipping (%)',
    'Primary Observations Summary',
  ];

  const logRows = records.map((rec) => {
    const res = rec.screeningResult;
    const raw = res.rawFeatures;
    return [
      rec.id,
      new Date(rec.savedAt).toLocaleString(),
      res.audioMetadata.fileName,
      res.audioMetadata.durationSec.toFixed(2),
      res.audioMetadata.format,
      res.audioMetadata.sampleRate,
      res.audioMetadata.channels === 1 ? 'Mono' : 'Stereo',
      res.outcomeTitle,
      res.prototypeSignalIndex,
      raw.pitchVoicing.medianF0Hz ?? 'N/A',
      raw.pitchVoicing.f0RangeSemitones ?? 'N/A',
      raw.pitchVoicing.jitterLocalPercent ?? 'N/A',
      raw.amplitudeQuality.shimmerLocalPercent ?? 'N/A',
      raw.amplitudeQuality.hnrDb ?? 'N/A',
      raw.pauseSilence.digitalZeroRatioInPauses.toFixed(1),
      raw.pauseSilence.pauseAmbientNoiseFloorDbfs ?? 'N/A',
      res.qualityMetrics.peakDbfs,
      res.qualityMetrics.snrDbfsEstimate,
      (res.qualityMetrics.clippingRatio * 100).toFixed(2),
      res.primaryObservations.join(' | '),
    ];
  });

  const wsLog = XLSX.utils.aoa_to_sheet([logHeaders, ...logRows]);
  wsLog['!cols'] = [
    { wch: 22 },
    { wch: 20 },
    { wch: 28 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 12 },
    { wch: 32 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, wsLog, 'Screening History Log');

  // ---------------------------------------------------------
  // Sheet 2: Detailed Evidence Archive
  // ---------------------------------------------------------
  const evidenceArchiveHeaders = [
    'Record ID',
    'File Name',
    'Date',
    'Feature Title',
    'Direction Signal',
    'Data Validity',
    'Measured Value',
    'Observation Summary',
    'Alternative Explanations (Caveats)',
  ];

  const archiveRows: (string | number)[][] = [];
  records.forEach((rec) => {
    const res = rec.screeningResult;
    res.evidenceCards.forEach((card) => {
      archiveRows.push([
        rec.id,
        res.audioMetadata.fileName,
        new Date(rec.savedAt).toLocaleDateString(),
        card.title,
        card.direction,
        card.validity,
        card.measuredValueFormatted,
        card.whatWasObserved,
        card.alternativeExplanations,
      ]);
    });
  });

  const wsArchive = XLSX.utils.aoa_to_sheet([evidenceArchiveHeaders, ...archiveRows]);
  wsArchive['!cols'] = [
    { wch: 20 },
    { wch: 26 },
    { wch: 12 },
    { wch: 26 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 45 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, wsArchive, 'All Evidence Archive');

  // Trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Voiceprint_Master_Audit_History_${dateStr}.xlsx`);
}
