import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertTriangle, Cpu, RotateCcw, Volume2 } from 'lucide-react';
import type { AudioClip } from '../types/audio';

interface AudioPlayerPreviewProps {
  clip: AudioClip;
  onAnalyze: () => void;
  onDiscard: () => void;
  isAnalyzing: boolean;
}

export const AudioPlayerPreview: React.FC<AudioPlayerPreviewProps> = ({
  clip,
  onAnalyze,
  onDiscard,
  isAnalyzing,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronize audio element state
  useEffect(() => {
    const audio = new Audio(clip.blobUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [clip]);

  // Toggle playback
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // Canvas Waveform Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const midY = height / 2;

    // Background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    // Gridlines
    ctx.strokeStyle = '#172033';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    const pcm = clip.rawPcm;
    const len = pcm.length;
    const step = Math.ceil(len / width);
    const amp = height * 0.45;

    // Draw waveform envelope
    ctx.fillStyle = '#38bdf8';
    for (let x = 0; x < width; x++) {
      const start = x * step;
      const end = Math.min(start + step, len);
      let minVal = 0;
      let maxVal = 0;

      for (let i = start; i < end; i++) {
        const val = pcm[i];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }

      const yTop = midY - maxVal * amp;
      const yBottom = midY - minVal * amp;
      const barHeight = Math.max(1.5, yBottom - yTop);

      ctx.fillRect(x, yTop, 1.2, barHeight);
    }

    // Draw Playhead cursor
    if (clip.metadata.durationSec > 0) {
      const playheadX = (currentTime / clip.metadata.durationSec) * width;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(playheadX - 1, 0, 2, height);
    }
  }, [clip, currentTime]);

  // Click on waveform to seek
  const handleWaveformClick = (e: React.MouseEvent<HTMLElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current || clip.metadata.durationSec <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekFraction = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = seekFraction * clip.metadata.durationSec;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatSec = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    const millis = Math.floor((totalSec % 1) * 10);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}.${millis}`;
  };

  return (
    <section className="player-preview-card" aria-label="Audio Clip Preview">
      <div className="preview-header">
        <div className="clip-info-main">
          <div className="clip-icon" aria-hidden="true">
            <Volume2 size={22} />
          </div>
          <div>
            <div className="clip-title-row">
              <h3 className="clip-name">{clip.name}</h3>
              {clip.isSample && (
                <span className="sample-indicator-pill">Demonstration Sample</span>
              )}
            </div>
            <div className="clip-meta-chips">
              <span className="meta-chip">Format: {clip.metadata.format}</span>
              <span className="meta-chip">Duration: {clip.metadata.durationSec.toFixed(2)}s</span>
              <span className="meta-chip">Rate: {clip.metadata.sampleRate} Hz</span>
              <span className="meta-chip">{clip.metadata.channels === 1 ? 'Mono' : 'Stereo'}</span>
              <span className="meta-chip">Peak: {clip.quality.peakDbfs.toFixed(1)} dBFS</span>
              <span className="meta-chip">Noise Floor: {clip.quality.backgroundNoiseDbfs.toFixed(1)} dBFS</span>
            </div>
          </div>
        </div>

        <div className="action-buttons-group">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onDiscard}
            disabled={isAnalyzing}
            title="Discard current audio clip and return to input"
          >
            <RotateCcw size={15} />
            Replace Clip
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            title="Begin client-side acoustic feature extraction and screening"
          >
            <Cpu size={18} />
            Analyze Clip
          </button>
        </div>
      </div>

      {/* Quality Warnings */}
      {clip.quality.warnings.length > 0 && (
        <div className="warning-callout" role="alert">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Audio Quality Notice:</strong>
            <ul>
              {clip.quality.warnings.map((warn, idx) => (
                <li key={idx}>{warn}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Waveform Canvas */}
      <div className="waveform-container" onClick={handleWaveformClick} title="Click to seek playback">
        <canvas ref={canvasRef} className="waveform-canvas" />
      </div>

      <div className="waveform-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#38bdf8' }} />
          <span>Speech Envelope (16kHz PCM)</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
          <span>Playback Cursor</span>
        </div>
      </div>

      {/* Player Controls Bar */}
      <div className="player-controls-bar">
        <div className="playback-controls-left">
          <button
            type="button"
            className="play-pause-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
          </button>
          <div className="time-display">
            {formatSec(currentTime)} / {formatSec(clip.metadata.durationSec)}
          </div>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Click waveform to scrub audio
        </div>
      </div>
    </section>
  );
};
