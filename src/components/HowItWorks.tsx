import React from 'react';
import { AudioWaveform, Sliders, FileText } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <section aria-labelledby="how-it-works-heading" className="how-it-works-section">
      <div className="how-it-works-grid">
        <div className="how-step-card">
          <div className="how-step-header">
            <span className="step-number">1</span>
            <AudioWaveform size={18} />
            <h3 className="how-step-title">Inspect the Audio Signal</h3>
          </div>
          <p className="how-step-desc">
            Decodes PCM locally in your browser. Verifies sample adequacy, clipping ratio, dynamic range, and background ambient noise floor.
          </p>
        </div>

        <div className="how-step-card">
          <div className="how-step-header">
            <span className="step-number">2</span>
            <Sliders size={18} />
            <h3 className="how-step-title">Measure Acoustic Features</h3>
          </div>
          <p className="how-step-desc">
            Tracks fundamental pitch (F0), cycle perturbation (jitter & shimmer), harmonic-to-noise ratio, and digital zero presence within pause windows.
          </p>
        </div>

        <div className="how-step-card">
          <div className="how-step-header">
            <span className="step-number">3</span>
            <FileText size={18} />
            <h3 className="how-step-title">Review Observations & Limits</h3>
          </div>
          <p className="how-step-desc">
            Examines structured evidence cards showing measured values, confounders, and data quality. Results are screening signals, not proof of origin.
          </p>
        </div>
      </div>
    </section>
  );
};
