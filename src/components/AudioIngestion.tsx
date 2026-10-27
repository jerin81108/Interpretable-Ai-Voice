import React, { useState, useRef } from 'react';
import { Upload, Mic, Disc, StopCircle, ArrowRight } from 'lucide-react';
import { SCREENING_CONFIG } from '../config/screeningConfig';
import { validateAudioFile } from '../audio/audioValidator';
import { decodeAudioPayload } from '../audio/audioDecoder';
import { VoiceprintRecorder } from '../audio/recorder';
import { DEMO_PRESETS, pcmToWavBlob, type DemoSampleDefinition } from '../data/demoSamples';
import type { AudioClip } from '../types/audio';

interface AudioIngestionProps {
  onClipReady: (clip: AudioClip) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  setError: (msg: string | null) => void;
}

export const AudioIngestion: React.FC<AudioIngestionProps> = ({
  onClipReady,
  isLoading,
  setIsLoading,
  setError,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'samples'>('upload');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordElapsedSec, setRecordElapsedSec] = useState(0);
  const [recordLevel, setRecordLevel] = useState(0);
  const recorderRef = useRef<VoiceprintRecorder | null>(null);

  // Handle file selection from drag-and-drop or file picker
  const handleFileSelection = async (file: File) => {
    setError(null);
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setError(validation.errors.join(' '));
      return;
    }

    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await decodeAudioPayload(arrayBuffer, file.name, file.size, file.type);
      const blobUrl = URL.createObjectURL(file);

      const clip: AudioClip = {
        id: `upload-${Date.now()}`,
        name: file.name,
        source: 'upload',
        isSample: false,
        blobUrl,
        rawPcm: decoded.rawPcm,
        sampleRate: decoded.metadata.sampleRate,
        metadata: decoded.metadata,
        quality: decoded.quality,
      };

      onClipReady(clip);
    } catch (err) {
      setError((err as Error).message || 'Failed to decode audio clip.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // Recording handlers
  const handleStartRecording = async () => {
    setError(null);
    try {
      const recorder = new VoiceprintRecorder();
      recorderRef.current = recorder;

      recorder.onTimeUpdate = (sec) => setRecordElapsedSec(sec);
      recorder.onLevelUpdate = (lvl) => setRecordLevel(lvl);

      await recorder.start();
      setIsRecording(true);
      setRecordElapsedSec(0);
    } catch (err) {
      setError((err as Error).message);
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    setIsLoading(true);
    try {
      const { blob } = await recorderRef.current.stop();
      setIsRecording(false);
      setRecordLevel(0);

      const arrayBuffer = await blob.arrayBuffer();
      const decoded = await decodeAudioPayload(
        arrayBuffer,
        `Browser Recording (${new Date().toLocaleTimeString()}).wav`,
        blob.size,
        blob.type
      );
      const blobUrl = URL.createObjectURL(blob);

      const clip: AudioClip = {
        id: `record-${Date.now()}`,
        name: `Microphone Clip (${decoded.durationSec.toFixed(1)}s)`,
        source: 'record',
        isSample: false,
        blobUrl,
        rawPcm: decoded.rawPcm,
        sampleRate: decoded.metadata.sampleRate,
        metadata: decoded.metadata,
        quality: decoded.quality,
      };

      onClipReady(clip);
    } catch (err) {
      setError((err as Error).message || 'Failed to process recorded audio.');
      setIsRecording(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Demonstration sample handler
  const handleSelectSample = async (preset: DemoSampleDefinition) => {
    setError(null);
    setIsLoading(true);
    try {
      const targetRate = SCREENING_CONFIG.signalProcessing.targetSampleRate;
      const pcm = preset.generatePcm(targetRate);
      const wavBlob = pcmToWavBlob(pcm, targetRate);
      const arrayBuffer = await wavBlob.arrayBuffer();

      const decoded = await decodeAudioPayload(arrayBuffer, `${preset.name}.wav`, wavBlob.size, 'audio/wav');
      const blobUrl = URL.createObjectURL(wavBlob);

      const clip: AudioClip = {
        id: `sample-${preset.id}`,
        name: preset.name,
        source: 'sample',
        isSample: true,
        blobUrl,
        rawPcm: decoded.rawPcm,
        sampleRate: targetRate,
        metadata: {
          ...decoded.metadata,
          fileName: `${preset.name} (Illustrative Demo)`,
        },
        quality: decoded.quality,
      };

      onClipReady(clip);
    } catch (err) {
      setError((err as Error).message || 'Failed to initialize demonstration sample.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatSec = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="ingestion-card">
      <div className="tabs-header" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upload'}
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => {
            if (!isRecording) setActiveTab('upload');
          }}
        >
          <Upload size={18} />
          Upload Audio
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'record'}
          className={`tab-btn ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => {
            if (!isRecording) setActiveTab('record');
          }}
        >
          <Mic size={18} />
          Record Audio
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'samples'}
          className={`tab-btn ${activeTab === 'samples' ? 'active' : ''}`}
          onClick={() => {
            if (!isRecording) setActiveTab('samples');
          }}
        >
          <Disc size={18} />
          Try a Demonstration Sample
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'upload' && (
          <div
            className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept={SCREENING_CONFIG.audioLimits.supportedExtensions.join(',')}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelection(e.target.files[0]);
                }
              }}
            />
            <div className="dropzone-icon">
              <Upload size={26} />
            </div>
            <h3 className="dropzone-title">Drop your voice clip here, or browse files</h3>
            <p className="dropzone-subtitle">
              Select an audio message or speech recording to inspect acoustic patterns locally in your browser.
            </p>
            <div className="dropzone-limits">
              <span className="limit-badge">Formats: WAV, MP3, M4A, AAC, OGG, FLAC, WEBM</span>
              <span className="limit-badge">Max: 25 MB</span>
              <span className="limit-badge">Duration: 1s – 180s</span>
            </div>
          </div>
        )}

        {activeTab === 'record' && (
          <div className="recording-panel">
            {!isRecording ? (
              <>
                <button
                  type="button"
                  className="mic-button"
                  onClick={handleStartRecording}
                  disabled={isLoading}
                  title="Click to request microphone permission and begin recording"
                  aria-label="Start recording speech"
                >
                  <Mic size={32} />
                </button>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Record Voice from Microphone
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
                    Microphone access is requested only when you click record. Audio is held strictly in local memory and not recorded in the background.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mic-pulse-container">
                  <div className="mic-pulse-circle" />
                  <button
                    type="button"
                    className="mic-button recording"
                    onClick={handleStopRecording}
                    aria-label="Stop recording"
                  >
                    <StopCircle size={36} />
                  </button>
                </div>

                <div className="recording-timer" aria-live="polite">
                  {formatSec(recordElapsedSec)}
                </div>

                <div className="level-meter-bar" title="Live audio input level">
                  <div className="level-meter-fill" style={{ width: `${Math.round(recordLevel * 100)}%` }} />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStopRecording}
                  style={{ marginTop: '0.5rem' }}
                >
                  <StopCircle size={18} />
                  Stop & Preview Clip
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'samples' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Demonstration Presets (Illustrative Example Data)
              </h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                Select an illustrative speech sample to test the complete acoustic screening workflow without uploading your own audio.
              </p>
            </div>

            <div className="samples-grid">
              {DEMO_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="sample-preset-card"
                  onClick={() => handleSelectSample(preset)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelectSample(preset);
                  }}
                >
                  <div className="sample-card-top">
                    <span className="sample-badge">{preset.badge}</span>
                    <h4 className="sample-name">{preset.name}</h4>
                    <p className="sample-desc">{preset.description}</p>
                  </div>
                  <div className="sample-card-footer">
                    <span>{preset.durationSec}s audio</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-primary)' }}>
                      Load sample <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
