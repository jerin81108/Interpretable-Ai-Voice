import React from 'react';
import { X, ShieldCheck, Lock, EyeOff, Trash2 } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title" id="privacy-modal-title">
            <ShieldCheck size={20} style={{ color: '#4ade80' }} />
            Privacy Architecture & Data Handling
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <section>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={16} style={{ color: 'var(--accent-primary)' }} />
              100% Client-Side Processing
            </h4>
            <p>
              Voiceprint processes audio entirely inside your local web browser session using the standard Web Audio API. 
              <strong> Audio files and microphone recordings are never uploaded to any remote server, cloud bucket, or external API.</strong>
            </p>
          </section>

          <section>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <EyeOff size={16} style={{ color: 'var(--accent-primary)' }} />
              No Biometrics, Transcription, or Identity Profiling
            </h4>
            <p>
              Voiceprint is strictly an acoustic screening tool. It does NOT perform speaker identification, voiceprint biometrics, gender or age inference, or emotion detection. 
              No transcription is generated or retained.
            </p>
          </section>

          <section>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trash2 size={16} style={{ color: '#f87171' }} />
              Session-Only In-Memory Retention & Instant Purge
            </h4>
            <p>
              Audio buffers and derived feature measurements are stored exclusively in temporary JavaScript memory (RAM). 
              Clicking <strong>&ldquo;Delete Clip &amp; Data&rdquo;</strong> instantly releases all allocated AudioBuffers, revokes local blob URLs, and resets the analysis pipeline state. Closing or refreshing your browser tab immediately frees all session memory.
            </p>
          </section>

          <section>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Zero Telemetry
            </h4>
            <p>
              No user audio, filenames, metadata, or diagnostic traces are tracked or transmitted to third-party analytics services.
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
