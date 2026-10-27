/**
 * In-Browser Audio Recording Module
 * Handles MediaRecorder lifecycle, audio level metering, track cleanup, and error boundaries.
 */

export interface RecorderState {
  isRecording: boolean;
  elapsedSec: number;
  currentLevel: number; // 0 to 1 for visual meter
  error: string | null;
}

export class VoiceprintRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private timerId: number | null = null;
  private meterAnimId: number | null = null;

  public onTimeUpdate?: (elapsedSec: number) => void;
  public onLevelUpdate?: (level: number) => void;
  public onError?: (errorMsg: string) => void;

  /**
   * Checks whether the user's browser supports audio recording APIs.
   */
  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Starts recording from the microphone after explicit user interaction.
   */
  public async start(): Promise<void> {
    if (!VoiceprintRecorder.isSupported()) {
      throw new Error(
        'In-browser audio recording is not supported in this browser. Please use the upload feature or switch to a modern browser (Chrome, Firefox, Safari, Edge).'
      );
    }

    this.cleanup();
    this.audioChunks = [];

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Keep raw speech characteristics unaltered
          noiseSuppression: false, // Prevent browser from scrubbing ambient acoustic noise
          autoGainControl: false,  // Preserve natural dynamic range
          channelCount: 1,
        },
      });
    } catch (err) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error(
          'Microphone permission was denied. Please allow microphone access in your browser settings to record audio.'
        );
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error(
          'No microphone was detected on this device. Please connect a microphone or use the upload feature.'
        );
      }
      throw new Error(`Microphone access failed: ${error.message}`);
    }

    // Set up audio analyzer for live metering
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.startMetering();
    } catch {
      // Metering failure should not block recording
    }

    // Choose preferred mime type
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    }

    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // Emit chunks every 250ms

    // Start elapsed timer
    const startTime = Date.now();
    this.timerId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      this.onTimeUpdate?.(elapsed);
    }, 500);
  }

  private startMetering(): void {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / (dataArray.length * 255);
      this.onLevelUpdate?.(Math.min(1, avg * 2.2)); // scaled for visual presence
      this.meterAnimId = requestAnimationFrame(update);
    };

    this.meterAnimId = requestAnimationFrame(update);
  }

  /**
   * Stops recording and returns the recorded audio Blob.
   */
  public async stop(): Promise<{ blob: Blob; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        reject(new Error('Recorder is not active.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();
        resolve({ blob, mimeType });
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Discards any ongoing recording and releases microphone hardware immediately.
   */
  public cleanup(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.meterAnimId !== null) {
      cancelAnimationFrame(this.meterAnimId);
      this.meterAnimId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}
