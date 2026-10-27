import React from 'react';
import { Activity, Shield, BookOpen, Trash2 } from 'lucide-react';
import { SCREENING_CONFIG } from '../config/screeningConfig';

interface HeaderProps {
  onOpenPrivacy: () => void;
  onOpenMethodology: () => void;
  onOpenAuditHistory: () => void;
  auditRecordCount: number;
  hasActiveClip: boolean;
  onClearAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPrivacy,
  onOpenMethodology,
  onOpenAuditHistory,
  auditRecordCount,
  hasActiveClip,
  onClearAll,
}) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-section">
          <div className="brand-icon-wrapper" aria-hidden="true">
            <Activity size={22} />
          </div>
          <div>
            <div className="brand-title">
              Voiceprint
              <span className="version-pill" title="Prototype acoustic heuristic version">
                v{SCREENING_CONFIG.version}
              </span>
            </div>
            <p className="brand-tagline">
              Inspect acoustic patterns in a voice clip. Results are screening signals, not proof of authenticity.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenAuditHistory}
            title="View screening history and export records to Excel (.xlsx)"
            style={{ borderColor: 'rgba(34, 197, 94, 0.4)' }}
          >
            <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              📊 Excel & History
              {auditRecordCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#166534',
                    color: '#86efac',
                    borderRadius: '10px',
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}
                >
                  {auditRecordCount}
                </span>
              )}
            </span>
          </button>

          {hasActiveClip && (
            <button
              type="button"
              className="btn btn-danger-ghost btn-sm"
              onClick={onClearAll}
              title="Purge audio data and reset session"
            >
              <Trash2 size={15} />
              Delete Clip & Data
            </button>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onOpenPrivacy}
            title="Review client-side privacy architecture"
          >
            <Shield size={15} />
            Privacy & Security
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenMethodology}
            title="Review acoustic feature formulas and limitations"
          >
            <BookOpen size={15} />
            Methodology & Limits
          </button>
        </div>
      </div>
    </header>
  );
};
