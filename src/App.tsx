import React, { useState } from 'react';
import { Header } from './components/Header';
import { HowItWorks } from './components/HowItWorks';
import { AudioIngestion } from './components/AudioIngestion';
import { AudioPlayerPreview } from './components/AudioPlayerPreview';
import { AnalysisProgress, type AnalysisStep } from './components/AnalysisProgress';
import { ScreeningBanner } from './components/ScreeningBanner';
import { EvidenceCards } from './components/EvidenceCards';
import { TechnicalDetails } from './components/TechnicalDetails';
import { WhatNextSection } from './components/WhatNextSection';
import { PrivacyModal } from './components/PrivacyModal';
import { MethodologyModal } from './components/MethodologyModal';
import { AuditHistoryModal } from './components/AuditHistoryModal';
import { extractAcousticFeatures } from './audio/featureExtractor';
import { runScreeningPipeline } from './screening/screeningEngine';
import { cleanupAudioResources } from './audio/audioDecoder';
import { getStoredAuditRecords, saveAuditRecord, type StoredAuditRecord } from './utils/auditStorage';
import type { AudioClip } from './types/audio';
import type { ScreeningResult } from './types/screening';
import { Shield, AlertCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  // App states
  const [activeClip, setActiveClip] = useState<AudioClip | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('preparing');
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIngestionLoading, setIsIngestionLoading] = useState(false);
  const [auditRecords, setAuditRecords] = useState<StoredAuditRecord[]>(() => getStoredAuditRecords());

  // Modals
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isAuditHistoryOpen, setIsAuditHistoryOpen] = useState(false);

  // When a clip is loaded from upload, recorder, or demo presets
  const handleClipReady = (clip: AudioClip) => {
    // Revoke previous blob if any
    if (activeClip && activeClip.blobUrl && !activeClip.isSample) {
      URL.revokeObjectURL(activeClip.blobUrl);
    }
    setActiveClip(clip);
    setScreeningResult(null);
    setErrorMessage(null);
  };

  // Run acoustic screening pipeline
  const handleStartAnalysis = async () => {
    if (!activeClip) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      setAnalysisStep('preparing');
      await new Promise((r) => setTimeout(r, 220));

      setAnalysisStep('pitch');
      await new Promise((r) => setTimeout(r, 280));

      setAnalysisStep('silence');
      await new Promise((r) => setTimeout(r, 260));

      // Deterministic feature extraction
      const features = extractAcousticFeatures(
        activeClip.rawPcm,
        16000,
        activeClip.quality.clippingRatio
      );

      setAnalysisStep('synthesis');
      await new Promise((r) => setTimeout(r, 240));

      // Screen against heuristic thresholds and evidence rules
      const result = runScreeningPipeline(features, activeClip.metadata, activeClip.quality);

      // Automatically store screening data in system storage (exportable to Excel anytime)
      saveAuditRecord(result);
      setAuditRecords(getStoredAuditRecords());

      setScreeningResult(result);
      setAnalysisStep('done');
    } catch (err) {
      setErrorMessage((err as Error).message || 'An error occurred during feature extraction.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Abort ongoing analysis
  const handleCancelAnalysis = () => {
    setIsAnalyzing(false);
    setAnalysisStep('preparing');
  };

  // Clear / Discard current clip
  const handleDiscardClip = () => {
    if (activeClip && activeClip.blobUrl && !activeClip.isSample) {
      URL.revokeObjectURL(activeClip.blobUrl);
    }
    setActiveClip(null);
    setScreeningResult(null);
    setErrorMessage(null);
    cleanupAudioResources();
  };

  // Completely purge all session audio and reset
  const handleClearAll = () => {
    handleDiscardClip();
  };

  return (
    <div className="app-container">
      <Header
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onOpenAuditHistory={() => setIsAuditHistoryOpen(true)}
        auditRecordCount={auditRecords.length}
        hasActiveClip={!!activeClip || !!screeningResult}
        onClearAll={handleClearAll}
      />

      <main className="main-content">
        {/* Privacy Callout Banner */}
        <div className="privacy-banner">
          <div className="privacy-banner-left">
            <span className="privacy-badge">
              <Shield size={13} />
              Zero Upload
            </span>
            <span>
              All audio processing and acoustic measurements occur locally in your browser. No voice audio, metadata, or telemetry leaves your device.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setIsPrivacyOpen(true)}
          >
            Privacy Details
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="warning-callout" role="alert" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong>Notice:</strong> {errorMessage}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Section 1: Ingestion or Preview */}
        {!activeClip && (
          <>
            <HowItWorks />
            <AudioIngestion
              onClipReady={handleClipReady}
              isLoading={isIngestionLoading}
              setIsLoading={setIsIngestionLoading}
              setError={setErrorMessage}
            />
          </>
        )}

        {activeClip && (
          <AudioPlayerPreview
            clip={activeClip}
            onAnalyze={handleStartAnalysis}
            onDiscard={handleDiscardClip}
            isAnalyzing={isAnalyzing}
          />
        )}

        {/* Section 2: Analysis Progress */}
        {isAnalyzing && (
          <AnalysisProgress currentStep={analysisStep} onCancel={handleCancelAnalysis} />
        )}

        {/* Section 3: Screening Results & Evidence */}
        {screeningResult && !isAnalyzing && (
          <>
            <ScreeningBanner
              result={screeningResult}
              onReset={() => {
                setScreeningResult(null);
              }}
              onClearAll={handleClearAll}
            />

            <EvidenceCards cards={screeningResult.evidenceCards} />

            <TechnicalDetails result={screeningResult} />

            <WhatNextSection />
          </>
        )}
      </main>

      {/* Accessible Modals */}
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <MethodologyModal isOpen={isMethodologyOpen} onClose={() => setIsMethodologyOpen(false)} />
      <AuditHistoryModal
        isOpen={isAuditHistoryOpen}
        onClose={() => setIsAuditHistoryOpen(false)}
        records={auditRecords}
        onRefreshRecords={() => setAuditRecords(getStoredAuditRecords())}
      />
    </div>
  );
};

export default App;
