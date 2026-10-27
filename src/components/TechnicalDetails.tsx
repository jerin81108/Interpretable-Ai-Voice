import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Download, Table, Activity } from 'lucide-react';
import type { ScreeningResult } from '../types/screening';
import { exportSingleResultToExcel } from '../utils/excelExporter';

interface TechnicalDetailsProps {
  result: ScreeningResult;
}

export const TechnicalDetails: React.FC<TechnicalDetailsProps> = ({ result }) => {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render pitch and energy timeline canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, width, height);

    const timeline = result.timeline;
    if (!timeline || timeline.length === 0) return;

    // Time mapping
    const totalDuration = result.audioMetadata.durationSec;
    const scaleX = width / Math.max(0.1, totalDuration);

    // Draw pause and digital silence regions
    timeline.forEach((pt, i) => {
      const nextTime = i < timeline.length - 1 ? timeline[i + 1].timeSec : pt.timeSec + 0.01;
      const x1 = pt.timeSec * scaleX;
      const x2 = nextTime * scaleX;
      const w = Math.max(1, x2 - x1);

      if (pt.isDigitalSilence) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Digital zero alert tint
        ctx.fillRect(x1, 0, w, height);
      } else if (pt.isPause) {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.15)'; // Natural room noise pause tint
        ctx.fillRect(x1, 0, w, height);
      }
    });

    // Draw RMS Energy Trace
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let startedRms = false;
    timeline.forEach((pt) => {
      const x = pt.timeSec * scaleX;
      // Map RMS 0..0.5 to height..0
      const y = height - (Math.min(0.5, pt.rms) / 0.5) * (height * 0.45) - 10;
      if (!startedRms) {
        ctx.moveTo(x, y);
        startedRms = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw F0 Pitch Track
    ctx.fillStyle = '#f59e0b';
    const minF0 = 65;
    const maxF0 = 450;
    timeline.forEach((pt) => {
      if (pt.f0 !== null && pt.isVoiced) {
        const x = pt.timeSec * scaleX;
        const normF0 = (pt.f0 - minF0) / (maxF0 - minF0);
        // Map F0 to top half of canvas
        const y = height * 0.5 - normF0 * (height * 0.4);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Top & Bottom grid reference labels
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    ctx.fillText('450 Hz (F0)', 8, 16);
    ctx.fillText('65 Hz (F0)', 8, height * 0.5 - 4);
    ctx.fillText('Energy (RMS)', 8, height - 8);
  }, [isOpen, result]);

  // Export JSON report
  const handleExportJson = () => {
    const reportData = {
      product: 'Voiceprint Interpretable AI-Voice Screening',
      version: result.version,
      timestamp: result.timestamp,
      fileMetadata: result.audioMetadata,
      qualityMetrics: result.qualityMetrics,
      screeningAssessment: {
        outcome: result.outcome,
        outcomeTitle: result.outcomeTitle,
        outcomeSummary: result.outcomeSummary,
        prototypeSignalIndex: result.prototypeSignalIndex,
        disclaimer: result.disclaimer,
      },
      evidenceCards: result.evidenceCards,
      rawAcousticFeatures: result.rawFeatures,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceprint-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const raw = result.rawFeatures;

  return (
    <section className="technical-drawer" aria-label="Technical Details and Signal Audit">
      <div
        className="drawer-header"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen);
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Table size={18} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Technical Feature Audit & Timeline Inspection
            </h4>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Raw acoustic parameters, timeline tracks, and structured JSON export
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              exportSingleResultToExcel(result);
            }}
            title="Export screening results, evidence cards, and raw features to Microsoft Excel (.xlsx)"
            style={{ background: 'linear-gradient(135deg, #15803d, #166534)', borderColor: 'rgba(34, 197, 94, 0.4)' }}
          >
            <Download size={14} />
            Export to Excel (.xlsx)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleExportJson();
            }}
            title="Download full forensic JSON audit file"
          >
            <Download size={14} />
            Export JSON
          </button>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isOpen && (
        <div className="drawer-content">
          {/* Signal Timeline Visualizer */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Activity size={14} style={{ color: '#f59e0b' }} />
                Acoustic Timeline (F0 Pitch Track & Energy Envelope)
              </span>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} /> F0 Track
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 2, backgroundColor: '#38bdf8' }} /> RMS Trace
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, backgroundColor: 'rgba(239, 68, 68, 0.4)' }} /> Digital Zero Silence
                </span>
              </div>
            </div>
            <div className="timeline-canvas-container">
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
          </div>

          {/* Structured Table */}
          <div className="tech-table-container">
            <table className="tech-table">
              <thead>
                <tr>
                  <th>Feature Parameter</th>
                  <th>Extracted Value</th>
                  <th>Unit</th>
                  <th>Data Validity</th>
                  <th>DSP Method & Parameters</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Median Fundamental Frequency (F0)</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{raw.pitchVoicing.medianF0Hz ?? 'N/A'}</td>
                  <td>Hz</td>
                  <td>{raw.pitchVoicing.pitchValidity}</td>
                  <td>NCCF lag search (65 - 450 Hz)</td>
                </tr>
                <tr>
                  <td>Pitch Semitone Dynamic Range</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{raw.pitchVoicing.f0RangeSemitones ?? 'N/A'}</td>
                  <td>semitones</td>
                  <td>{raw.pitchVoicing.pitchValidity}</td>
                  <td>12 * log2(P95 / P05)</td>
                </tr>
                <tr>
                  <td>Voiced Frame Proportion</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{(raw.pitchVoicing.voicedFrameRatio * 100).toFixed(1)}%</td>
                  <td>% of speech</td>
                  <td>usable</td>
                  <td>Voiced frames / speech frames</td>
                </tr>
                <tr>
                  <td>Local Pitch Perturbation (Jitter)</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{raw.pitchVoicing.jitterLocalPercent ?? 'N/A'}%</td>
                  <td>% cycle-to-cycle</td>
                  <td>{raw.pitchVoicing.jitterValidity}</td>
                  <td>Relative mean period difference</td>
                </tr>
                <tr>
                  <td>Local Amplitude Perturbation (Shimmer)</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{raw.amplitudeQuality.shimmerLocalPercent ?? 'N/A'}%</td>
                  <td>% amp-to-amp</td>
                  <td>{raw.amplitudeQuality.shimmerValidity}</td>
                  <td>Relative peak amplitude difference</td>
                </tr>
                <tr>
                  <td>Harmonic-to-Noise Ratio (HNR)</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{raw.amplitudeQuality.hnrDb ?? 'N/A'}</td>
                  <td>dB</td>
                  <td>{raw.amplitudeQuality.hnrValidity}</td>
                  <td>Autocorrelation peak-to-residual approximation</td>
                </tr>
                <tr>
                  <td>Pause Digital Zero Ratio</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{raw.pauseSilence.digitalZeroRatioInPauses.toFixed(1)}%</td>
                  <td>% pause samples</td>
                  <td>{raw.pauseSilence.pauseValidity}</td>
                  <td>Sample abs &lt; 0.00008 in pause windows</td>
                </tr>
                <tr>
                  <td>Pause Ambient Room Tone</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {raw.pauseSilence.pauseAmbientNoiseFloorDbfs !== null
                      ? `${raw.pauseSilence.pauseAmbientNoiseFloorDbfs.toFixed(1)} dBFS`
                      : 'N/A'}
                  </td>
                  <td>dBFS</td>
                  <td>{raw.pauseSilence.pauseValidity}</td>
                  <td>RMS of non-zero pause samples</td>
                </tr>
                <tr>
                  <td>Usable Voiced Duration</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{raw.pitchVoicing.totalVoicedDurationSec.toFixed(2)}</td>
                  <td>seconds</td>
                  <td>usable</td>
                  <td>{raw.pitchVoicing.totalVoicedFrames} frames at 10ms hop</td>
                </tr>
                <tr>
                  <td>Usable Pause Duration</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{raw.pauseSilence.totalPauseDurationSec.toFixed(2)}</td>
                  <td>seconds</td>
                  <td>usable</td>
                  <td>{raw.pauseSilence.pauseSegmentCount} distinct pause intervals</td>
                </tr>
                <tr>
                  <td>Sample Clipping Ratio</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{(result.qualityMetrics.clippingRatio * 100).toFixed(2)}%</td>
                  <td>% of total</td>
                  <td>usable</td>
                  <td>Sample abs &gt; 0.995</td>
                </tr>
                <tr>
                  <td>Signal-to-Noise Ratio (SNR)</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{result.qualityMetrics.snrDbfsEstimate.toFixed(1)}</td>
                  <td>dB</td>
                  <td>usable</td>
                  <td>Peak dBFS - 10th percentile noise floor</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
