import React from 'react';
import { X, CheckCircle, Clock } from 'lucide-react';

export type AnalysisStep = 'preparing' | 'pitch' | 'silence' | 'synthesis' | 'done';

interface AnalysisProgressProps {
  currentStep: AnalysisStep;
  onCancel: () => void;
}

const STEPS: { key: AnalysisStep; label: string }[] = [
  { key: 'preparing', label: 'Preparing audio signal and estimating background noise floor' },
  { key: 'pitch', label: 'Tracking fundamental frequency (F0), jitter, and vocal harmonics' },
  { key: 'silence', label: 'Segmenting pause windows and measuring digital silence ratio' },
  { key: 'synthesis', label: 'Building structured evidence cards and evaluating limits' },
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ currentStep, onCancel }) => {
  const getStepIndex = (step: AnalysisStep) => {
    switch (step) {
      case 'preparing': return 0;
      case 'pitch': return 1;
      case 'silence': return 2;
      case 'synthesis': return 3;
      case 'done': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="analysis-progress-card" role="region" aria-label="Acoustic Screening Progress">
      <div className="progress-spinner" aria-hidden="true" />
      <div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
          Screening Audio Clip
        </h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Computing acoustic measurements locally via Web Audio DSP...
        </p>
      </div>

      <div className="progress-steps-list">
        {STEPS.map((step, idx) => {
          const isCompleted = currentIndex > idx;
          const isActive = currentIndex === idx;
          return (
            <div
              key={step.key}
              className={`progress-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              {isCompleted ? (
                <CheckCircle size={16} />
              ) : isActive ? (
                <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
              ) : (
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: '1px solid var(--border-strong)',
                  }}
                />
              )}
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>

      <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
        <X size={15} />
        Cancel Analysis
      </button>
    </div>
  );
};
