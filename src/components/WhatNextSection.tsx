import React from 'react';
import { PhoneCall, Key, Users, AlertOctagon } from 'lucide-react';

export const WhatNextSection: React.FC = () => {
  return (
    <section className="what-next-card" aria-labelledby="what-next-heading">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <AlertOctagon size={20} style={{ color: 'var(--accent-primary)' }} />
        <div>
          <h3 id="what-next-heading" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recommended Protocol: What to Do Next
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Acoustic screening is an advisory signal. For any high-stakes, financial, or credential request, execute independent out-of-band verification.
          </p>
        </div>
      </div>

      <div className="verification-protocols-grid">
        <div className="protocol-box">
          <div className="protocol-title">
            <PhoneCall size={16} style={{ color: 'var(--accent-primary)' }} />
            1. Out-of-Band Callback
          </div>
          <p className="protocol-desc">
            Never reply directly to the inbound number or channel. Call the alleged sender back on a previously established, verified internal extension or known mobile number.
          </p>
        </div>

        <div className="protocol-box">
          <div className="protocol-title">
            <Key size={16} style={{ color: 'var(--accent-primary)' }} />
            2. Challenge & Pre-Shared Secret
          </div>
          <p className="protocol-desc">
            Use organizational dual-control verbal passphrases or ask a contextual reference question only the real individual could answer without relying on public bio details.
          </p>
        </div>

        <div className="protocol-box">
          <div className="protocol-title">
            <Users size={16} style={{ color: 'var(--accent-primary)' }} />
            3. Multi-Party Authorization
          </div>
          <p className="protocol-desc">
            Mandate written four-eyes approval (two authorized corporate officers) for urgent wire transfers, payroll changes, or critical security credential modifications.
          </p>
        </div>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
        <strong>Forensic Notice:</strong> If this clip is associated with an active fraud incident, preserve the original uncompressed audio file, call detail records (CDR), and headers intact for professional forensic examination and legal chain-of-custody.
      </div>
    </section>
  );
};
