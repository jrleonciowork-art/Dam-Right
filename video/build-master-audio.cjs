const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ffmpeg = path.join(__dirname, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
const ffprobe = path.join(__dirname, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe");
const audioDir = path.join(__dirname, "public", "audio");

const SAMPLE_RATE = 44100;
const DURATION_SEC = 135;
const NUM_SAMPLES = SAMPLE_RATE * DURATION_SEC;

const SEGMENTS = [
  [0, 6],
  [6, 12],
  [12, 20],
  [20, 28],
  [28, 35],
  [35, 42],
  [42, 49],
  [49, 57],
  [57, 66],
  [66, 75],
  [75, 84],
  [84, 92],
  [92, 100],
  [100, 106],
  [106, 112],
  [112, 118],
  [118, 123],
  [123, 129],
  [129, 135],
];

function getDuration(file) {
  const out = execFileSync(ffprobe, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]).toString().trim();
  return parseFloat(out);
}

// Decode an MP3 to 44.1kHz mono Float32Array via standard 16-bit WAV
function decodeVoiceClip(file, atempo = 1.0) {
  const wavPath = file + ".tmp.wav";
  const filters = [];
  if (atempo > 1.005) filters.push(`atempo=${atempo.toFixed(3)}`);
  filters.push("aresample=44100");
  execFileSync(ffmpeg, [
    "-y", "-v", "error",
    "-i", file,
    "-af", filters.join(","),
    "-f", "wav", "-c:a", "pcm_s16le", "-ac", "1", "-ar", "44100",
    wavPath,
  ]);
  const buf = fs.readFileSync(wavPath);
  fs.unlinkSync(wavPath);
  // Find "data" chunk in WAV
  let dataOffset = 44;
  for (let i = 12; i < Math.min(buf.length - 8, 256); i++) {
    if (buf[i] === 0x64 && buf[i + 1] === 0x61 && buf[i + 2] === 0x74 && buf[i + 3] === 0x61) {
      dataOffset = i + 8;
      break;
    }
  }
  const numSamples = Math.floor((buf.length - dataOffset) / 2);
  const floatArr = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    floatArr[i] = buf.readInt16LE(dataOffset + i * 2) / 32768;
  }

  // Trim leading/trailing silence (< 0.008 amplitude) so voice timing is tight and immediate!
  let startIdx = 0;
  while (startIdx < floatArr.length && Math.abs(floatArr[startIdx]) < 0.01) startIdx++;
  startIdx = Math.max(0, startIdx - Math.floor(0.015 * SAMPLE_RATE));

  let endIdx = floatArr.length - 1;
  while (endIdx > startIdx && Math.abs(floatArr[endIdx]) < 0.008) endIdx--;
  endIdx = Math.min(floatArr.length, endIdx + Math.floor(0.04 * SAMPLE_RATE));

  const trimmed = floatArr.subarray(startIdx, endIdx);

  // Normalize peak to 0.88 with pure linear gain (zero non-linear saturation so the human timbre stays 100% natural)
  let peak = 0.001;
  for (let i = 0; i < trimmed.length; i++) {
    const a = Math.abs(trimmed[i]);
    if (a > peak) peak = a;
  }
  const gain = Math.min(1.35, 0.88 / peak);
  const out = new Float32Array(trimmed.length);
  for (let i = 0; i < trimmed.length; i++) {
    out[i] = trimmed[i] * gain;
  }
  return out;
}

// Synthesize an upbeat, welcoming, attractive 118 BPM background track in G Major / D Major
function synthesizeUpbeatMusic() {
  const L = new Float32Array(NUM_SAMPLES);
  const R = new Float32Array(NUM_SAMPLES);
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // 1. Warm Stereo Synth Pad (Major 7th / Add9 chords)
  function addWarmPad(startSec, endSec, midiNotes, amp) {
    const s0 = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
    const s1 = Math.min(NUM_SAMPLES, Math.floor(endSec * SAMPLE_RATE));
    const attack = Math.min(0.35, (endSec - startSec) * 0.2);
    const release = Math.min(0.45, (endSec - startSec) * 0.25);

    midiNotes.forEach((midi, idx) => {
      const f = midiToFreq(midi);
      const fL = f * (1 - 0.0022 * (idx + 1));
      const fR = f * (1 + 0.0022 * (idx + 1));
      const pan = (idx - (midiNotes.length - 1) / 2) * 0.35;
      const gL = amp * (0.5 - pan * 0.35);
      const gR = amp * (0.5 + pan * 0.35);

      for (let i = s0; i < s1; i++) {
        const t = i / SAMPLE_RATE;
        const rel = t - startSec;
        const rem = endSec - t;
        let env = 1;
        if (rel < attack) env = 0.5 - 0.5 * Math.cos((Math.PI * rel) / attack);
        else if (rem < release) env = 0.5 - 0.5 * Math.cos((Math.PI * rem) / release);

        // Warm triangle + octave harmonic
        const wL = Math.sin(2 * Math.PI * fL * t) * 0.65 + Math.sin(4 * Math.PI * fL * t) * 0.22 + Math.sin(6 * Math.PI * fL * t) * 0.08;
        const wR = Math.sin(2 * Math.PI * fR * t) * 0.65 + Math.sin(4 * Math.PI * fR * t) * 0.22 + Math.sin(6 * Math.PI * fR * t) * 0.08;
        L[i] += wL * env * gL;
        R[i] += wR * env * gR;
      }
    });
  }

  // 2. Bright Welcoming Marimba / Acoustic-Electric Pluck with stereo delay
  function addPluckWithDelay(startSec, midi, amp, pan = 0) {
    const echoes = [
      [0, 1.0, pan],
      [0.127, 0.38, -pan * 0.8],
      [0.254, 0.16, pan * 0.6],
    ];
    const f = midiToFreq(midi);
    for (const [delay, decay, p] of echoes) {
      const t0 = startSec + delay;
      const dur = 0.36;
      const s0 = Math.max(0, Math.floor(t0 * SAMPLE_RATE));
      const s1 = Math.min(NUM_SAMPLES, Math.floor((t0 + dur) * SAMPLE_RATE));
      const gL = amp * decay * (0.5 - p * 0.42);
      const gR = amp * decay * (0.5 + p * 0.42);
      for (let i = s0; i < s1; i++) {
        const dt = (i - s0) / SAMPLE_RATE;
        const env = Math.min(1, dt / 0.004) * Math.exp(-dt * 9.5);
        // Marimba/kalimba-like woody overtone (fundamental + 3rd + 4th harmonic with fast decay)
        const tone =
          Math.sin(2 * Math.PI * f * dt) * 0.7 +
          Math.sin(4 * Math.PI * f * dt) * Math.exp(-dt * 18) * 0.25 +
          Math.sin(6 * Math.PI * f * dt) * Math.exp(-dt * 32) * 0.12;
        const val = tone * env;
        L[i] += val * gL;
        R[i] += val * gR;
      }
    }
  }

  // 3. Warm Bouncy Bassline (audible on laptop & mobile speakers via 2nd & 3rd harmonics)
  function addBassNote(startSec, durSec, midi, amp) {
    const s0 = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
    const s1 = Math.min(NUM_SAMPLES, Math.floor((startSec + durSec) * SAMPLE_RATE));
    const f = midiToFreq(midi);
    for (let i = s0; i < s1; i++) {
      const dt = (i - s0) / SAMPLE_RATE;
      const env = Math.min(1, dt / 0.008) * Math.exp(-dt * 4.2);
      const sig =
        Math.sin(2 * Math.PI * f * dt) * 0.55 +
        Math.sin(4 * Math.PI * f * dt) * 0.35 +
        Math.sin(6 * Math.PI * f * dt) * Math.exp(-dt * 10) * 0.15;
      const val = Math.tanh(sig * 1.4) * env * amp;
      L[i] += val;
      R[i] += val;
    }
  }

  // 4. Crisp Upbeat Drums (Kick, Warm Clap/Snare, Shaker/Hi-Hat)
  function addKick(startSec, amp) {
    const dur = 0.22;
    const s0 = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
    const s1 = Math.min(NUM_SAMPLES, Math.floor((startSec + dur) * SAMPLE_RATE));
    let phase = 0;
    for (let i = s0; i < s1; i++) {
      const dt = (i - s0) / SAMPLE_RATE;
      const freq = 54 + 115 * Math.exp(-dt * 34);
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      const click = Math.sin(2 * Math.PI * 1200 * dt) * Math.exp(-dt * 120) * 0.2;
      const val = (Math.sin(phase) + click) * Math.exp(-dt * 13) * amp;
      L[i] += val;
      R[i] += val;
    }
  }

  // Deterministic PRNG for clean shaker/clap noise
  let seed = 1234567;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  }

  function addHiHat(startSec, amp, open = false) {
    const dur = open ? 0.14 : 0.045;
    const s0 = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
    const s1 = Math.min(NUM_SAMPLES, Math.floor((startSec + dur) * SAMPLE_RATE));
    const decay = open ? 22 : 70;
    for (let i = s0; i < s1; i++) {
      const dt = (i - s0) / SAMPLE_RATE;
      // High-frequency metallic shimmer + filtered noise
      const n = rand() * Math.sin(2 * Math.PI * 6800 * dt);
      const val = n * Math.exp(-dt * decay) * amp;
      L[i] += val * 0.85;
      R[i] += val * 1.15;
    }
  }

  function addClap(startSec, amp) {
    const dur = 0.14;
    const s0 = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
    const s1 = Math.min(NUM_SAMPLES, Math.floor((startSec + dur) * SAMPLE_RATE));
    for (let i = s0; i < s1; i++) {
      const dt = (i - s0) / SAMPLE_RATE;
      const burst = dt < 0.018 ? Math.sin(dt * 900) : 1;
      const body = Math.sin(2 * Math.PI * 240 * dt) * Math.exp(-dt * 35) * 0.4;
      const noise = rand() * Math.sin(2 * Math.PI * 1900 * dt) * Math.exp(-dt * 28) * 0.6 * burst;
      const val = (body + noise) * amp;
      L[i] += val * 1.05;
      R[i] += val * 0.95;
    }
  }

  // 118 BPM => 1 beat = 0.50847s, 1 bar (4 beats) = 2.0339s
  const BEAT = 60 / 118;
  const BAR = BEAT * 4;

  // Welcoming, uplifting chord progressions in G Major / D Major:
  // Chords: [bassMidi, [padNotes], [arpNotes]]
  const PROG_MAIN = [
    // Gmaj9 (G2, B3, D4, F#4, A4)
    { bass: 43, pad: [55, 59, 62, 66, 69], arp: [67, 71, 74, 78, 81, 78, 74, 71] },
    // Dadd9 (D2, A3, D4, F#4, E5)
    { bass: 38, pad: [50, 57, 62, 66, 69], arp: [66, 69, 74, 76, 78, 76, 74, 69] },
    // Em7 (E2, B3, D4, G4, B4)
    { bass: 40, pad: [52, 59, 62, 67, 71], arp: [67, 71, 74, 79, 83, 79, 74, 71] },
    // Cmaj9 (C2, G3, B3, E4, G4)
    { bass: 36, pad: [48, 55, 59, 64, 67], arp: [64, 67, 71, 74, 79, 74, 71, 67] },
  ];

  const totalBars = Math.ceil(DURATION_SEC / BAR);
  for (let bar = 0; bar < totalBars; bar++) {
    const tBar = bar * BAR;
    if (tBar >= DURATION_SEC) break;
    const c = PROG_MAIN[bar % 4];

    // Warm synth pad on every bar
    addWarmPad(tBar, Math.min(DURATION_SEC, tBar + BAR + 0.08), c.pad, 0.14);

    // Upbeat 8th-note marimba/pluck arpeggio across stereo field
    for (let step = 0; step < 8; step++) {
      const tStep = tBar + step * (BEAT / 2);
      if (tStep >= DURATION_SEC) break;
      const pan = step % 2 === 0 ? -0.45 : 0.45;
      const note = c.arp[step % c.arp.length];
      addPluckWithDelay(tStep, note, 0.15, pan);
      // Occasional welcoming bell sparkle on beat 1 and beat 3.5
      if (step === 0 || (step === 5 && bar % 2 === 1)) {
        addPluckWithDelay(tStep, note + 12, 0.075, -pan);
      }
    }

    // Bouncy bassline (beats 1, 2.5, 3, 4.5)
    const bassPattern = [
      [0, 0.9 * BEAT, c.bass, 0.24],
      [1.5 * BEAT, 0.45 * BEAT, c.bass + 12, 0.18],
      [2.0 * BEAT, 0.9 * BEAT, c.bass, 0.22],
      [3.0 * BEAT, 0.45 * BEAT, c.bass + 7, 0.19],
      [3.5 * BEAT, 0.45 * BEAT, c.bass + 12, 0.18],
    ];
    for (const [offset, dur, bNote, bAmp] of bassPattern) {
      if (tBar + offset < DURATION_SEC) {
        addBassNote(tBar + offset, dur, bNote, bAmp);
      }
    }

    // Four-on-the-floor kick + crisp clap on beats 2 & 4 + 16th shaker groove
    for (let b = 0; b < 4; b++) {
      const tBeat = tBar + b * BEAT;
      if (tBeat >= DURATION_SEC) break;
      addKick(tBeat, 0.26);
      if (b === 1 || b === 3) {
        addClap(tBeat, 0.14);
      }
      // 16th-note shaker/hi-hat
      for (let sub = 0; sub < 4; sub++) {
        const tSub = tBeat + sub * (BEAT / 4);
        if (tSub >= DURATION_SEC) break;
        const isOffbeat = sub === 2;
        const hhAmp = isOffbeat ? 0.075 : sub === 0 ? 0.045 : 0.03;
        addHiHat(tSub, hhAmp, isOffbeat && b === 3);
      }
    }
  }

  // Subtle melodic bells / UI chimes at key story moments
  const ChimeEvents = [
    [0.05, [79, 83, 86]],   // Welcoming opening chime
    [28.15, [62, 67, 71, 74, 79, 86]], // Monumental Dam Right reveal chord & chime fanfare
    [53.2, [79, 86]],       // Engineer confirmation chime
    [92.0, [76, 79, 84]],   // Hero comparison transition
    [107.2, [79, 83, 91]],  // Checker confirmation chime
    [123.0, [74, 79, 83, 86]], // Final CTA uplift
  ];
  // Warm monumental sub-bass & pad bloom for "Meet... Dam Right." (28.0s - 31.5s)
  addWarmPad(28.0, 31.8, [38, 50, 55, 59, 62, 67, 71], 0.22);
  for (const [t, notes] of ChimeEvents) {
    notes.forEach((n, idx) => {
      addPluckWithDelay(t + idx * 0.09, n, 0.16, (idx - 1) * 0.35);
    });
  }

  return { L, R };
}

function buildMasterAudio() {
  console.log("Synthesizing upbeat, welcoming background music (118 BPM G Major)...");
  const music = synthesizeUpbeatMusic();

  const voTrack = new Float32Array(NUM_SAMPLES);

  // Place each voiceover clip so it starts BEFORE the subtitle appears on screen!
  // Subtitles in DamRightDemo.tsx are set to fade in at segStart + 0.42s.
  // For segment 0, voice starts at 0.02s (0.40s ahead of subtitle at 0.42s).
  // For segments 1..18, voice starts at segStart - 0.18s (0.60s ahead of subtitle at segStart + 0.42s!),
  // while ensuring at least 0.22s of clean breathing room after the previous clip finishes.
  let prevEndSec = 0;

  for (let i = 0; i < SEGMENTS.length; i++) {
    const [segStart, segEnd] = SEGMENTS[i];
    const file = path.join(audioDir, `vo_${String(i).padStart(2, "0")}.mp3`);
    const rawDur = getDuration(file);

    // Desired start time: ahead of the scene/subtitle boundary
    // For Segment 4 ("Meet, Dam Right."), start right at 27.92s so "Dam Right" lands monumentally as the logo reveals!
    const desiredStart = i === 0 ? 0.02 : i === 4 ? 27.92 : Math.max(prevEndSec + 0.18, segStart - 0.18);
    const maxFinish = segEnd - 0.15;
    const availWindow = Math.max(2.5, maxFinish - desiredStart);

    // Avoid time-stretching whenever possible so prosody stays 100% natural and human
    let atempo = 1.0;
    if (i !== 4 && rawDur * 0.94 > availWindow) {
      atempo = Math.min(1.16, Math.max(1.0, +((rawDur * 0.94) / availWindow).toFixed(3)));
    }

    const pcm = decodeVoiceClip(file, atempo);
    const clipDur = pcm.length / SAMPLE_RATE;
    const startSample = Math.floor(desiredStart * SAMPLE_RATE);

    for (let s = 0; s < pcm.length && startSample + s < NUM_SAMPLES; s++) {
      voTrack[startSample + s] += pcm[s];
    }

    prevEndSec = desiredStart + clipDur;
    const subtitleAppearSec = segStart + 0.42;
    const leadMs = Math.round((subtitleAppearSec - desiredStart) * 1000);
    console.log(
      `VO #${String(i).padStart(2, "0")}: audio=${desiredStart.toFixed(2)}s..${prevEndSec.toFixed(2)}s (dur=${clipDur.toFixed(2)}s, atempo=${atempo}) | subtitle=${subtitleAppearSec.toFixed(2)}s (voice leads by +${leadMs}ms)`
    );
  }

  // Compute smooth voice envelope for automatic music ducking
  // When voice is active: music plays at an audible, warm 0.36 gain (-9 dB)
  // When voice pauses: music swells smoothly to 0.62 gain so the upbeat rhythm shines!
  const envWindow = Math.floor(0.08 * SAMPLE_RATE);
  const voiceActive = new Float32Array(NUM_SAMPLES);
  let runningSq = 0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    runningSq += voTrack[i] * voTrack[i];
    if (i >= envWindow) {
      runningSq -= voTrack[i - envWindow] * voTrack[i - envWindow];
    }
    const rms = Math.sqrt(Math.max(0, runningSq) / Math.min(i + 1, envWindow));
    voiceActive[i] = rms > 0.018 ? 1.0 : 0.0;
  }

  // Smooth the ducking envelope (fast attack ~60ms, smooth release ~450ms)
  const duckGain = new Float32Array(NUM_SAMPLES);
  let curGain = 0.60;
  const attackCoeff = Math.exp(-1 / (0.06 * SAMPLE_RATE));
  const releaseCoeff = Math.exp(-1 / (0.45 * SAMPLE_RATE));
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const target = voiceActive[i] > 0.5 ? 0.35 : 0.60;
    const coeff = target < curGain ? attackCoeff : releaseCoeff;
    curGain = coeff * curGain + (1 - coeff) * target;
    duckGain[i] = curGain;
  }

  // Final master stereo mix with fade-in (0.6s) and fade-out (1.8s)
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataSize = NUM_SAMPLES * numChannels * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * numChannels * bytesPerSample, 28);
  buf.writeUInt16LE(numChannels * bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    let masterEnv = 1.0;
    if (t < 0.5) masterEnv = t / 0.5;
    else if (t > DURATION_SEC - 1.6) masterEnv = Math.max(0, (DURATION_SEC - t) / 1.6);

    const g = duckGain[i] * masterEnv;
    const v = voTrack[i] * 1.05;
    // Soft-knee mastering limiter
    const mixL = Math.tanh((music.L[i] * g + v) * 1.05) * 0.96;
    const mixR = Math.tanh((music.R[i] * g + v) * 1.05) * 0.96;

    buf.writeInt16LE(Math.floor(mixL * 32767), offset);
    buf.writeInt16LE(Math.floor(mixR * 32767), offset + 2);
    offset += 4;
  }

  const masterWav = path.join(audioDir, "master_mix.wav");
  fs.writeFileSync(masterWav, buf);
  console.log("Wrote master mix WAV:", masterWav, (buf.length / 1024 / 1024).toFixed(1), "MB");
}

buildMasterAudio();
