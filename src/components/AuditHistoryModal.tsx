import React from 'react';
import { X, FileSpreadsheet, Trash2, Download, History, AlertCircle } from 'lucide-react';
import {
  type StoredAuditRecord,
  deleteStoredAuditRecord,
  clearAllStoredAuditRecords,
} from '../utils/auditStorage';
import { exportSingleResultToExcel, exportAuditHistoryToExcel } from '../utils/excelExporter';

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: StoredAuditRecord[];
  onRefreshRecords: () => void;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  onRefreshRecords,
}) => {
  if (!isOpen) return null;

  const handleExportAll = () => {
    exportAuditHistoryToExcel(records);
  };

  const handleExportSingle = (record: StoredAuditRecord) => {
    exportSingleResultToExcel(record.screeningResult);
  };

  const handleDelete = (id: string) => {
    deleteStoredAuditRecord(id);
    onRefreshRecords();
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all stored screening history from this system?')) {
      clearAllStoredAuditRecords();
      onRefreshRecords();
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="audit-modal-title">
      <div className="modal-card" style={{ maxWidth: '850px' }}>
        <div className="modal-header">
          <div className="modal-title" id="audit-modal-title">
            <FileSpreadsheet size={20} style={{ color: '#22c55e' }} />
            Stored Screening Data & Excel Export
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(16, 22, 36, 0.6)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <History size={16} style={{ color: 'var(--accent-primary)' }} />
                Stored Audio Screening Records ({records.length})
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Screening results are stored locally in your system and can be exported to Excel (.xlsx) anytime.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleExportAll}
                disabled={records.length === 0}
                style={{ background: 'linear-gradient(135deg, #15803d, #166534)', borderColor: 'rgba(34, 197, 94, 0.3)' }}
              >
                <Download size={14} />
                Export All to Excel (.xlsx)
              </button>
              {records.length > 0 && (
                <button
                  type="button"
                  className="btn btn-danger-ghost btn-sm"
                  onClick={handleClearAll}
                  title="Purge all stored screening records"
                >
                  <Trash2 size={14} />
                  Clear All
                </button>
              )}
            </div>
          </div>

          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <FileSpreadsheet size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                No screening records stored yet
              </p>
              <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                When you screen an audio clip, its acoustic measurements, evidence cards, and metadata will be automatically saved here and can be exported to Excel whenever you want.
              </p>
            </div>
          ) : (
            <div className="tech-table-container">
              <table className="tech-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>File Name</th>
                    <th>Duration</th>
                    <th>Screening Outcome</th>
                    <th>Signal Index</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const res = rec.screeningResult;
                    return (
                      <tr key={rec.id}>
                        <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {new Date(rec.savedAt).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {res.audioMetadata.fileName}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {res.audioMetadata.durationSec.toFixed(1)}s
                        </td>
                        <td>
                          <span
                            className={`outcome-pill ${res.outcome}`}
                            style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
                          >
                            {res.outcomeTitle}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {res.prototypeSignalIndex} / 100
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleExportSingle(rec)}
                              title="Export this record to Excel (.xlsx)"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            >
                              <Download size={13} />
                              Excel (.xlsx)
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger-ghost btn-sm"
                              onClick={() => handleDelete(rec.id)}
                              title="Delete this record"
                              style={{ padding: '0.25rem 0.45rem' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.76rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>
              All screening audit data is kept in your device&apos;s local storage. Exported Excel (.xlsx) spreadsheets include complete metadata, 5-point evidence explanations, and DSP acoustic formulas.
            </span>
          </div>
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
