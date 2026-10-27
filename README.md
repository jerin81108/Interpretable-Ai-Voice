# Voiceprint

> **Browser-Based Interpretable Acoustic Screening Prototype for Synthetic Speech Signals**

Voiceprint is a client-side web application designed to help individuals, incident response teams, and researchers screen uploaded or recorded voice clips for acoustic patterns often associated with synthetic or manipulated speech.

Voiceprint treats **interpretability as a first-class feature**: every observation is tied directly to a measured acoustic feature, an explicit threshold, and a plain-language explanation of what was observed, why it matters, and what alternative explanations (confounders) exist.

> [!IMPORTANT]
> **Advisory Screening Only:** Voiceprint provides screening signals, **not proof of authenticity**. It does not and cannot conclusively determine whether a voice is genuine or synthetic. It must never be used as an automated blocking/allowing firewall or for automated fraud decisions. For high-impact or financial requests, always execute independent out-of-band verification.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Prerequisites & Installation](#prerequisites--installation)
3. [Running the Application](#running-the-application)
4. [Supported Browsers & Audio Formats](#supported-browsers--audio-formats)
5. [Architecture & Zero-Upload Privacy](#architecture--zero-upload-privacy)
6. [Feature Definitions & Measurement Methodology](#feature-definitions--measurement-methodology)
7. [Screening Logic, Thresholds & Versioning](#screening-logic-thresholds--versioning)
8. [Why the Result is Not Proof of Authenticity](#why-the-result-is-not-proof-of-authenticity)
9. [Known Limitations & Acoustic Confounders](#known-limitations--acoustic-confounders)
10. [Roadmap: Integrating Validated Machine Learning Models](#roadmap-integrating-validated-machine-learning-models)
11. [Configuration & Tuning](#configuration--tuning)

---

## 1. Key Features

- **Multi-Modal Audio Ingestion**:
  - Drag-and-drop or file-picker upload.
  - In-browser microphone recording with live level metering and explicit permission control (no background recording).
  - Built-in demonstration presets (Synthetic Demo, Natural Demo, Degraded/Inconclusive Demo) with real-time procedural audio synthesis.
- **Client-Side Audio Validation & Preview**:
  - File size, format, duration, channel count, and decode verification.
  - Interactive audio player with scrubbable waveform envelope and time tracking.
  - Automatic detection of audio clipping, dynamic range, and ambient noise floor.
- **Deterministic Acoustic Feature Extraction (Web Audio DSP)**:
  - Fundamental pitch ($F_0$) tracking via Normalized Cross-Correlation (NCCF) in the human speech range (65 Hz – 450 Hz).
  - Voiced frame classification and semitone intonation range.
  - Pitch period perturbation (**Local Jitter**) and cycle amplitude perturbation (**Local Shimmer**).
  - Harmonic-to-Noise Ratio (**HNR**) approximation.
  - Pause window segmentation and **digital silence vs. room tone** ratio analysis.
  - Candidate breath-like pre-speech onset acoustic analysis.
- **Calibrated, Interpretable Evidence Cards**:
  - Every card answers the 5 required forensic questions:
    1. *What was measured?*
    2. *What did the measurement show?*
    3. *Why might that matter?*
    4. *What other factors could explain it (confounders/caveats)?*
    5. *How much usable data supported this observation?*
- **Safe "Inconclusive" Gating**:
  - Automatically returns an inconclusive outcome when a clip is too short ($< 1.0$s), too noisy ($\text{SNR} < 8$ dB), severely clipped ($> 3\%$), or contains too few voiced phonemes ($< 0.4$s).
- **Technical Audit Drawer & Timeline Visualizer**:
  - Interactive canvas rendering fundamental frequency ($F_0$) track, RMS energy envelope, and pause intervals.
  - Complete data table of raw features, units, formulas, and validity flags.
  - JSON forensic audit export.
- **Persistent Local System Storage & Multi-Sheet Excel (.xlsx) Export**:
  - Automatically saves each completed screening run into local system storage.
  - One-click **"Export to Excel (.xlsx)"** button for the current result generating a 4-sheet workbook (*Screening Summary*, *Evidence Observations*, *Raw Acoustic Features*, and *Timeline Track*).
  - Dedicated **"📊 Excel & History"** modal allowing users to review past screened clips and export a master multi-clip Excel audit spreadsheet at any time.
- **Instant Memory Purge**:
  - "Delete Clip & Data" releases all `AudioBuffer` allocations, revokes object URLs, and resets state.

---

## 2. Prerequisites & Installation

- **Node.js**: v18.0.0 or higher (tested on Node v24.21.0)
- **NPM**: v9.0.0 or higher

Clone or open the project folder in your terminal:

```bash
cd "d:/PERSONAL/Interpretable AI-voice"
npm install
```

---

## 3. Running the Application

### Development Mode
To start the local Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open your browser to `http://localhost:5173/` (or `http://127.0.0.1:5173/`).

### Production Build & Linting
To check linting with `oxlint` and compile the optimized production bundle:

```bash
npm run lint
npm run build
```

To preview the built production bundle locally:

```bash
npm run preview
```

---

## 4. Supported Browsers & Audio Formats

### Supported Browsers
- **Google Chrome** (v90+)
- **Mozilla Firefox** (v88+)
- **Apple Safari** (v14.1+)
- **Microsoft Edge** (v90+)

### Supported Formats & File Limits
- **Container Formats**: `.wav`, `.mp3`, `.m4a`, `.aac`, `.ogg`, `.flac`, `.webm`
- **Maximum File Size**: 25 MB
- **Minimum Duration**: 1.0 second (recommended $\ge 2.5$ seconds for stable perturbation)
- **Maximum Duration**: 180 seconds (3 minutes)

---

## 5. Architecture & Zero-Upload Privacy

Voiceprint executes **100% inside your local web browser session**.

```
[User Audio / Mic] ──> [Web Audio API: decodeAudioData]
                             │
                             ▼
                    [Mono 16 kHz Resampling]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Quality & Noise Metrics]       [Acoustic Feature Extractor]
   - Peak dBFS                     - Pitch (F0) & Voicing (NCCF)
   - Clipping ratio                - Local Jitter & Shimmer
   - Ambient noise floor           - Pause Digital Zero vs Room Tone
   - SNR estimate                  - Harmonic-to-Noise Ratio (HNR)
            │                                 │
            └────────────────┬────────────────┘
                             ▼
              [Screening Engine & Gating]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Screening Banner]              [5-Point Evidence Cards]
   - Synthetic-leaning             - What was measured
   - Natural-leaning               - What was observed
   - Inconclusive                  - Why it matters
                                   - Caveats & confounders
                                   - Usable sample support
```

- **Zero Network Transmission**: Raw audio, PCM buffers, and derived acoustic measurements never leave your computer.
- **No Speaker Biometrics**: The tool does not perform speaker identification, voice matching, or demographic profiling.
- **No Transcription**: Voiceprint does not transcribe speech content.
- **Session-Only Memory**: Audio is stored strictly in ephemeral JavaScript heap memory. Clicking **"Delete Clip & Data"** revokes all blob URLs and frees memory immediately.

---

## 6. Feature Definitions & Measurement Methodology

All digital signal processing is executed on standardized 16,000 Hz 32-bit float PCM audio using 30ms Hann window frames with a 10ms hop size.

| Feature Identifier | Display Name | Unit | DSP Extraction Method & Parameters | Baseline Expected Range |
| :--- | :--- | :--- | :--- | :--- |
| `pause-digital-silence` | Pause Digital Silence | % of pause duration | Energy-gated Voice Activity Detection (VAD). Samples in pause windows with absolute amplitude $\le 0.00008$ ($< -75$ dBFS) are counted as digital zeros. | Physical microphones exhibit continuous ambient room tone ($-65$ to $-40$ dBFS); $< 5\%$ digital zeros. |
| `pitch-jitter` | Local Pitch Jitter | % period variation | Normalized Cross-Correlation (NCCF) pitch tracking ($65-450$ Hz). Calculates mean relative absolute difference between consecutive fundamental pitch periods. | Natural adult conversational speech: $0.25\% - 1.80\%$. |
| `amplitude-shimmer` | Local Amplitude Shimmer | % amplitude variation | Peak envelope extraction across contiguous voiced frames. Calculates mean relative absolute difference between cycle peak amplitudes. | Natural human speech: $1.80\% - 6.50\%$. |
| `pitch-contour-dynamics` | Intonation / F0 Range | semitones | Semitone logarithmic interval between 5th and 95th percentiles of voiced fundamental frequency track ($12 \cdot \log_2(F_{0,95} / F_{0,05})$). | Conversational speech: $2.5 - 14.0$ semitones. |
| `harmonic-to-noise` | Harmonic-to-Noise Ratio (HNR) | dB | Autocorrelation maximum approximation ($10 \cdot \log_{10}(r_{\max} / (1 - r_{\max}))$) in voiced phonemes. | Typical human glottal voicing: $10.0 - 24.0$ dB. |
| `breath-naturalness` | Candidate Breath Transitions | detected events | Low-energy unvoiced pre-speech friction detection in phrase boundary windows. | Low-confidence exploratory indicator. |

---

## 7. Screening Logic, Thresholds & Versioning

### Engine Version
`v1.2.0-prototype-heuristic` (Configured in [`src/config/screeningConfig.ts`](file:///d:/PERSONAL/Interpretable%20AI-voice/src/config/screeningConfig.ts))

### Inconclusive Gating Rules
Before aggregating scores, the pipeline checks whether the audio clip meets minimal validity criteria:
1. **Clip Duration**: $< 1.0$ second $\rightarrow$ `Inconclusive`
2. **Voiced Speech**: $< 0.4$ seconds of voiced phonemes $\rightarrow$ `Inconclusive`
3. **Severe Clipping**: $> 3.0\%$ clipped samples $\rightarrow$ `Inconclusive`
4. **Noise Floor**: $\text{SNR} < 8.0$ dB $\rightarrow$ `Inconclusive`
5. **Feature Sufficiency**: $< 3$ usable features $\rightarrow$ `Inconclusive`

### Transparent Aggregation
Each usable feature contributes a weighted score between $-1.0$ (strongly natural-leaning) and $+1.0$ (strongly synthetic-leaning), multiplied by a confidence factor based on usable frame count.

$$\text{Net Score} = \frac{\sum (c_i \cdot w_i \cdot \text{conf}_i)}{\sum (w_i \cdot \text{conf}_i)}$$

- $\text{Net Score} \ge +0.28 \implies$ **"Signals Consistent with Synthetic Speech"**
- $\text{Net Score} \le -0.22 \implies$ **"Signals More Consistent with Natural Speech"**
- Otherwise $\implies$ **"Inconclusive: Mixed Acoustic Patterns"**

The **Prototype Signal Index (0 – 100)** normalizes this net heuristic score for visual evaluation. It is explicitly labeled as an experimental heuristic index, **not** a mathematical probability of truth.

---

## 8. Why the Result is Not Proof of Authenticity

1. **No Ground Truth Access**: Passive acoustic screening examines surface signal artifacts. It cannot prove identity, source intent, or cryptographic provenance.
2. **Asymmetric Risk**: A "natural-leaning" result does **not** establish that a clip is authentic. Modern generative AI voice clones (e.g., flow-matching or diffusion speech models) trained on high-quality human datasets can synthesize organic pitch dynamics and room acoustics.
3. **False Positives on Real Speech**: Clean studio recordings with downward expanders, noise gates, or lossy codec compression can appear synthetic-leaning to heuristic algorithms.

---

## 9. Known Limitations & Acoustic Confounders

- **Audio Editing & Noise Gates**: Professional podcasters and audio engineers often use software noise gates that drop signal levels to digital zero during pauses, mirroring synthetic splice artifacts.
- **Telephony & VoIP Codecs**: GSM, AMR, and low-bitrate Opus codecs heavily compress phase information, alter vocal harmonics, and distort jitter and shimmer measurements.
- **Short Audio Samples**: Clips under 2.5 seconds lack sufficient statistical cycles for stable pitch perturbation measurements.
- **Background Noise & Reverberation**: Echo and ambient room noise obscure vocal tract harmonics and lower the effective Signal-to-Noise Ratio.
- **Speaker Diversity**: Natural anatomical variations, regional dialects, vocal fatigue, and speech pathologies vary widely across the global population.

---

## 10. Roadmap: Integrating Validated Machine Learning Models

When representative, legally permissible, and properly evaluated speech datasets become available:

1. **Dataset Provenance & Partitioning**:
   - Establish speaker-disjoint train, validation, and test splits across multiple recording devices, codecs, and demographics.
2. **Model Architecture**:
   - Replace or augment heuristic weights with a calibrated linear/logistic model or shallow gradient-boosted decision tree on extracted acoustic features (e.g., ONNX runtime client-side inference).
3. **Calibration & Gaps**:
   - Calibrate output probabilities using Platt scaling or isotonic regression on a held-out evaluation set.
   - Disclose explicit False Acceptance Rate (FAR) and False Rejection Rate (FRR) curves across diverse codecs.

---

## 11. Configuration & Tuning

All thresholds, feature weights, and timing parameters are centralized in [`src/config/screeningConfig.ts`](file:///d:/PERSONAL/Interpretable%20AI-voice/src/config/screeningConfig.ts).

Key adjustable parameters:
- `audioLimits.maxFileSizeBytes`: Maximum accepted file size (default: 25 MB).
- `audioLimits.minDurationSec`: Minimum acceptable duration (default: 1.0s).
- `signalProcessing.targetSampleRate`: Standardized resampling rate (default: 16,000 Hz).
- `acousticBaselines.jitterLocalPercent`: Expected human vocal jitter range ($0.25\% - 1.80\%$).
- `acousticBaselines.digitalZeroInPausesPercent`: Synthetic pause threshold ($35\%$).
- `inconclusiveGating.minUsableFeaturesRequired`: Minimum usable features for valid screening (default: 3).

---

## License

Prototype released for research and educational acoustic screening demonstration purposes.
