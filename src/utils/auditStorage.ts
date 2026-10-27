import type { ScreeningResult } from '../types/screening';

export interface StoredAuditRecord {
  id: string;
  savedAt: string;
  screeningResult: ScreeningResult;
}

const STORAGE_KEY = 'voiceprint_audit_records';

/**
 * Retrieves all stored screening audit records from localStorage.
 */
export function getStoredAuditRecords(): StoredAuditRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to read audit records from localStorage:', err);
    return [];
  }
}

/**
 * Saves a new screening result into the system's local audit storage.
 */
export function saveAuditRecord(result: ScreeningResult): StoredAuditRecord {
  const records = getStoredAuditRecords();
  const newRecord: StoredAuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    savedAt: new Date().toISOString(),
    screeningResult: result,
  };

  // Add to top of list
  records.unshift(newRecord);

  // Keep up to 100 historical runs to preserve browser storage limits
  const trimmed = records.slice(0, 100);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to write audit record to localStorage:', err);
  }

  return newRecord;
}

/**
 * Removes a specific audit record by ID.
 */
export function deleteStoredAuditRecord(id: string): void {
  const records = getStoredAuditRecords();
  const filtered = records.filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to update audit records in localStorage:', err);
  }
}

/**
 * Purges all stored audit records from the system.
 */
export function clearAllStoredAuditRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear audit records:', err);
  }
}
