import React from 'react';
import { AlertCircle, HelpCircle, ShieldAlert, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import type { ScreeningResult } from '../types/screening';
import { exportSingleResultToExcel } from '../utils/excelExporter';

interface ScreeningBannerProps {
  result: ScreeningResult;
  onReset: () => void;
  onClearAll: () => void;
}

export const ScreeningBanner: React.FC<ScreeningBannerProps> = ({
  result,
  onReset,
  onClearAll,
}) => {
  const getOutcomeIcon = () => {
    switch (result.outcome) {
      case 'synthetic_leaning':
        return <ShieldAlert size={18} />;
      case 'natural_leaning':
        return <CheckCircle2 size={18} />;
      case 'inconclusive':
      default:
        return <HelpCircle size={18} />;
    }
  };

  const getPillLabel = () => {
    switch (result.outcome) {
      case 'synthetic_leaning':
        return 'Synthetic-Leaning Signals';
      case 'natural_leaning':
        return 'Natural-Leaning Signals';
      case 'inconclusive':
      default:
        return 'Inconclusive Result';
    }
  };

  // Color gradient for the gauge
  const getGaugeFillStyle = () => {
    if (result.outcome === 'synthetic_leaning') {
      return { width: `${result.prototypeSignalIndex}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' };
    } else if (result.outcome === 'natural_leaning') {
      return { width: `${result.prototypeSignalIndex}%`, background: 'linear-gradient(90deg, #0d9488, #2dd4bf)' };
    } else {
      return { width: `${result.prototypeSignalIndex}%`, background: '#94a3b8' };
    }
  };

  return (
    <div className={`screening-banner-card ${result.outcome}`} role="region" aria-label="Screening Outcome Summary">
      <div className="screening-banner-top">
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div className="outcome-badge-row">
            <span className={`outcome-pill ${result.outcome}`}>
              {getOutcomeIcon()}
              {getPillLabel()}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Analysis Pipeline: v{result.version}
            </span>
          </div>

          <h2 className="outcome-title">{result.outcomeTitle}</h2>
          <p className="outcome-summary-text">{result.outcomeSummary}</p>
        </div>

        {/* Prototype Signal Index Gauge */}
        <div className="gauge-box">
          <div className="gauge-header">
            <span>PROTOTYPE SIGNAL INDEX</span>
            <span title="Experimental prototype heuristic scale: 0 = strong natural acoustic characteristics, 100 = strong synthetic anomalies.">
              Experimental
            </span>
          </div>
          <div className="gauge-value">{result.prototypeSignalIndex} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span></div>
          <div className="gauge-track">
            <div className="gauge-fill" style={getGaugeFillStyle()} />
          </div>
          <div className="gauge-track-labels">
            <span>0 Natural</span>
            <span>50 Neutral</span>
            <span>100 Synthetic</span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3, marginTop: '0.2rem' }}>
            Calibrated heuristic index for prototype evaluation. Not a mathematical probability of truth.
          </p>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="mandatory-disclaimer-callout">
        <strong>Important Limitation:</strong> {result.disclaimer}
      </div>

      {/* Primary Observations */}
      <div className="observations-container">
        <h4 className="observations-title">
          <AlertCircle size={16} style={{ color: 'var(--accent-primary)' }} />
          Key Acoustic Observations
        </h4>
        <ul className="observations-list">
          {result.primaryObservations.map((obs, idx) => (
            <li key={idx} className="observation-item">
              <span className="observation-dot" />
              <span>{obs}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#4ade80' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
          <span>Saved to local system audit log • Exportable to Excel anytime</span>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => exportSingleResultToExcel(result)}
            title="Download full forensic screening report as an Excel spreadsheet (.xlsx)"
            style={{ background: 'linear-gradient(135deg, #15803d, #166534)', borderColor: 'rgba(34, 197, 94, 0.4)' }}
          >
            📊 Export to Excel (.xlsx)
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onReset}>
            <RotateCcw size={15} />
            Analyze Another Clip
          </button>
          <button type="button" className="btn btn-danger-ghost btn-sm" onClick={onClearAll}>
            <Trash2 size={15} />
            Delete Clip & Results
          </button>
        </div>
      </div>
    </div>
  );
};
