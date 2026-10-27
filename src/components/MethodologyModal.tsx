import React from 'react';
import { X, BookOpen, AlertTriangle, Cpu, Sliders } from 'lucide-react';
import { SCREENING_CONFIG } from '../config/screeningConfig';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="methodology-modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title" id="methodology-modal-title">
            <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
            Methodology, Heuristic Logic & Limitations
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <section>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Cpu size={16} style={{ color: 'var(--accent-primary)' }} />
              Pipeline Overview ({SCREENING_CONFIG.modelName})
            </h4>
            <p>
              Voiceprint executes a transparent, deterministic client-side signal processing pipeline. 
              Audio is decoded to 32-bit float PCM, downmixed to mono, and standardized to 16,000 Hz. 
              It uses 30ms Hann window frames with a 10ms hop size to extract acoustic speech phonetics.
            </p>
          </section>

          <section>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sliders size={16} style={{ color: 'var(--accent-primary)' }} />
              Acoustic Features & Mathematical Formulations
            </h4>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Pause Digital Silence:</strong> Analyzes raw sample amplitudes exclusively inside detected pause intervals (speech energy &lt; adaptive VAD threshold). Flags when pause segments contain exact numerical zeros (abs &lt; 0.00008 or &lt; -75 dBFS), which frequently occurs in concatenated or unconditioned TTS engines.
              </li>
              <li>
                <strong>Pitch Period Perturbation (Local Jitter):</strong> Measures the cycle-to-cycle variation in fundamental pitch period duration across contiguous voiced phonemes:
                <br />
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-primary)' }}>
                  Jitter = [ &sum; |T_i - T_(i-1)| / ((N - 1) &times; mean(T)) ] &times; 100%
                </code>
              </li>
              <li>
                <strong>Amplitude Perturbation (Local Shimmer):</strong> Measures the cycle-to-cycle variation in peak acoustic amplitude across voiced periods:
                <br />
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-primary)' }}>
                  Shimmer = [ &sum; |A_i - A_(i-1)| / ((N - 1) &times; mean(A)) ] &times; 100%
                </code>
              </li>
              <li>
                <strong>Harmonic-to-Noise Ratio (HNR):</strong> Approximates the ratio of periodic harmonic energy to aperiodic aspiration noise using autocorrelation maximum in voiced frames.
              </li>
              <li>
                <strong>Candidate Breath Events:</strong> Low-confidence acoustic heuristic scanning pre-speech intervals for soft unvoiced turbulence.
              </li>
            </ul>
          </section>

          <section>
            <h4 style={{ color: '#fb923c', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={16} />
              Known Confounders & Limitations
            </h4>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#fed7aa' }}>
              <li>
                <strong>Studio Post-Processing:</strong> Downward expanders, noise gates, and podcast mastering tools routinely strip room tone, creating false synthetic-leaning pause signals.
              </li>
              <li>
                <strong>Lossy Compression:</strong> Heavy MP3/AAC or cellular GSM/VoLTE codecs introduce phase distortion and quantization noise, degrading jitter and HNR stability.
              </li>
              <li>
                <strong>Short Audio:</strong> Clips under 2.5 seconds have insufficient voiced cycles to compute statistically reliable perturbation.
              </li>
              <li>
                <strong>Advanced Neural TTS:</strong> State-of-the-art diffusion and flow-matching speech synthesis models can incorporate synthetic room reverberation, breathing sounds, and expressive prosody, which may appear natural-leaning to acoustic heuristics.
              </li>
              <li>
                <strong>Human Diversity:</strong> Vocal fold anatomy, accents, emotional states, fatigue, and language cadence create substantial natural variation.
              </li>
            </ul>
          </section>

          <section>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Why Results are Screening Signals, Not Proof
            </h4>
            <p>
              In forensic science, acoustic screening serves as an early triage indicator to prompt secondary independent verification. 
              <strong> A &ldquo;natural-leaning&rdquo; result does NOT prove a voice is genuine, and a &ldquo;synthetic-leaning&rdquo; result does NOT prove fraud.</strong>
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
