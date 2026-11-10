const fs = require("fs");
const path = require("path");
const { EdgeTTS } = require("node-edge-tts");

const outDir = path.join(__dirname, "public", "audio");
fs.mkdirSync(outDir, { recursive: true });

// [startSec, endSec, text]
const CAPTIONS = [
  [0, 6, "Every flood wall begins as an approved plan. But once it's built, two questions matter:"],
  [6, 12, "was it built according to plan—and can every decision be proven?"],
  [12, 20, "Today, critical evidence lives in separate places—drawings, spreadsheets, survey records, lab results, inspection photos."],
  [20, 28, "A structure can look complete while small discrepancies stay hidden. A completed structure is not automatically a verified structure."],
  [28, 35, "Meet Dam Right. Dam Right connects approved designs,"],
  [35, 42, "engineering calculations, field measurements, and review evidence in one traceable workflow."],
  [42, 49, "Start by uploading the blueprint and calculation documents. Identify the project, structure, location, and approved revision."],
  [49, 57, "AI assistance flags candidate dimensions and notes—but each one waits for engineer confirmation."],
  [57, 66, "Next, define the wall: geometry, soil and concrete properties, water levels on both sides, surcharge, drainage, and your project's own safety limits."],
  [66, 75, "The section updates as you work, showing every load acting on the structure."],
  [75, 84, "Dam Right checks sliding, overturning, uplift, and bearing pressure—and it never hides the math."],
  [84, 92, "Every input, equation, assumption, and result stays visible, so findings are clear: passed, failed, review, or incomplete."],
  [92, 100, "Compare design to reality. The approved stem is 500 millimeters; the field measures 470, plus or minus five."],
  [100, 106, "Even allowing for uncertainty, it falls below the 490 minimum. That segment is flagged, and release is blocked until an engineer decides."],
  [106, 112, "A checker confirms survey evidence, and the result is accepted."],
  [112, 118, "Every value has a source. AI helps discover information and conflicts."],
  [118, 123, "Engineers control what becomes an approved input. Unreviewed or conflicting data never reaches the calculation."],
  [123, 129, "From approved plan to built reality, make every engineering decision traceable."],
  [129, 135, "Pilot Dam Right on your next flood-control or retaining-wall project."],
];

async function generateVoiceovers() {
  for (let i = 0; i < CAPTIONS.length; i++) {
    const [start, end, text] = CAPTIONS[i];
    const windowSec = end - start;
    const words = text.split(/\s+/).length;
    const wps = words / windowSec;
    // Calibrate rate so every clip finishes inside its window with natural pauses
    let rate = "+6%";
    if (wps > 2.8) rate = "+34%";
    else if (wps > 2.3) rate = "+26%";
    else if (wps > 2.0) rate = "+20%";
    else if (wps > 1.7) rate = "+14%";

    const tts = new EdgeTTS({
      voice: "en-US-AndrewMultilingualNeural",
      lang: "en-US",
      outputFormat: "audio-24khz-96kbitrate-mono-mp3",
      rate,
      pitch: "-2Hz",
      timeout: 20000,
    });
    const file = path.join(outDir, `vo_${String(i).padStart(2, "0")}.mp3`);
    await tts.ttsPromise(text, file);
    const stat = fs.statSync(file);
    const estDur = (stat.size / 12000).toFixed(2);
    console.log(`vo_${String(i).padStart(2, "0")}.mp3: window=${windowSec}s, est=${estDur}s, rate=${rate}`);
  }
}

// Procedural Stereo WAV synthesizer for soundtrack + subtle UI sound design (44.1 kHz, 16-bit stereo)
function generateSoundtrackWav(filePath) {
  const sampleRate = 44100;
  const duration = 135;
  const numSamples = sampleRate * duration;
  const L = new Float32Array(numSamples);
  const R = new Float32Array(numSamples);

  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Soft warm pad synth note with stereo detune and low-pass character
  function addPad(startSec, endSec, midi, amp, pan = 0) {
    const s0 = Math.max(0, Math.floor(startSec * sampleRate));
    const s1 = Math.min(numSamples, Math.floor(endSec * sampleRate));
    const f1 = midiToFreq(midi);
    const f2 = f1 * 1.003;
    const f3 = f1 * 0.997;
    const attack = Math.min(1.2, (endSec - startSec) * 0.25);
    const release = Math.min(1.5, (endSec - startSec) * 0.3);
    for (let i = s0; i < s1; i++) {
      const t = i / sampleRate;
      const relT = t - startSec;
      const remT = endSec - t;
      let env = 1;
      if (relT < attack) env = 0.5 - 0.5 * Math.cos((Math.PI * relT) / attack);
      else if (remT < release) env = 0.5 - 0.5 * Math.cos((Math.PI * remT) / release);
      const sigL = Math.sin(2 * Math.PI * f1 * t) * 0.55 + Math.sin(2 * Math.PI * f2 * t) * 0.35 + Math.sin(4 * Math.PI * f1 * t) * 0.1;
      const sigR = Math.sin(2 * Math.PI * f1 * t) * 0.55 + Math.sin(2 * Math.PI * f3 * t) * 0.35 + Math.sin(4 * Math.PI * f3 * t) * 0.1;
      L[i] += sigL * env * amp * (1 - Math.max(0, pan));
      R[i] += sigR * env * amp * (1 + Math.min(0, pan));
    }
  }

  // Pluck / arpeggio pulse note
  function addPluck(startSec, durSec, midi, amp, pan = 0) {
    const s0 = Math.max(0, Math.floor(startSec * sampleRate));
    const s1 = Math.min(numSamples, Math.floor((startSec + durSec) * sampleRate));
    const f = midiToFreq(midi);
    for (let i = s0; i < s1; i++) {
      const dt = (i - s0) / sampleRate;
      const env = Math.min(1, dt / 0.008) * Math.exp(-dt * 7.5);
      const val = (Math.sin(2 * Math.PI * f * dt) + 0.35 * Math.sin(4 * Math.PI * f * dt) * Math.exp(-dt * 14)) * env * amp;
      L[i] += val * (0.5 - pan * 0.4);
      R[i] += val * (0.5 + pan * 0.4);
    }
  }

  // Soft electronic kick / heartbeat pulse
  function addKick(startSec, amp) {
    const dur = 0.28;
    const s0 = Math.max(0, Math.floor(startSec * sampleRate));
    const s1 = Math.min(numSamples, Math.floor((startSec + dur) * sampleRate));
    let phase = 0;
    for (let i = s0; i < s1; i++) {
      const dt = (i - s0) / sampleRate;
      const freq = 48 + 95 * Math.exp(-dt * 28);
      phase += (2 * Math.PI * freq) / sampleRate;
      const env = Math.exp(-dt * 11);
      const val = Math.sin(phase) * env * amp;
      L[i] += val;
      R[i] += val;
    }
  }

  // Subtle UI sound effects
  function addTick(startSec, freq = 1400, amp = 0.06, dur = 0.035) {
    const s0 = Math.max(0, Math.floor(startSec * sampleRate));
    const s1 = Math.min(numSamples, Math.floor((startSec + dur) * sampleRate));
    for (let i = s0; i < s1; i++) {
      const dt = (i - s0) / sampleRate;
      const val = Math.sin(2 * Math.PI * freq * dt) * Math.exp(-dt * 95) * amp;
      L[i] += val;
      R[i] += val;
    }
  }

  // 1. Act I (0:00 - 0:28): Restrained tension in D minor (D2, A2, F3, A3, E4)
  const act1Chords = [
    [0, 7, [38, 45, 53, 57, 64]],   // Dm9
    [7, 14, [34, 41, 50, 57, 62]],  // Bbmaj7
    [14, 21, [33, 40, 48, 55, 60]], // Am7
    [21, 28, [38, 45, 52, 57, 62]], // Dsus2
  ];
  for (const [t0, t1, notes] of act1Chords) {
    notes.forEach((n, idx) => addPad(t0, t1 + 0.4, n, idx < 2 ? 0.055 : 0.032, (idx - 2) * 0.25));
  }
  // Sparse tension pulse in Act I (80 BPM = 0.75s per beat)
  for (let t = 0.5; t < 27.5; t += 1.5) {
    addKick(t, 0.06);
    addPluck(t + 0.75, 0.4, 62, 0.03, 0.2);
  }

  // 2. Act II (0:28 - 1:32): Momentum & clarity (100 BPM = 0.6s per beat)
  // Chord progression loop every 9.6s (16 beats): Dm7 -> Bbmaj7 -> Fmaj7 -> C6
  const progAct2 = [
    [38, 45, 53, 57, 60, 64], // Dm9
    [34, 41, 50, 53, 57, 62], // Bbmaj7
    [41, 48, 53, 57, 60, 64], // Fmaj7
    [36, 43, 52, 55, 60, 64], // C
  ];
  for (let t = 28; t < 92; t += 2.4) {
    const idx = Math.floor((t - 28) / 2.4) % 4;
    const chord = progAct2[idx];
    const tEnd = Math.min(92, t + 2.5);
    chord.slice(0, 4).forEach((n, i) => addPad(t, tEnd, n, i < 2 ? 0.055 : 0.03, (i - 1.5) * 0.25));
    // Arpeggio 8th notes (every 0.3s)
    const arpNotes = [chord[2], chord[3], chord[4], chord[5], chord[4], chord[3], chord[2], chord[4]];
    for (let s = 0; s < 8 && t + s * 0.3 < 92; s++) {
      addPluck(t + s * 0.3, 0.32, arpNotes[s] + 12, 0.035, (s % 2 === 0 ? -0.35 : 0.35));
    }
    // Kick on beats 1 and 3
    addKick(t, 0.09);
    if (t + 1.2 < 92) addKick(t + 1.2, 0.08);
  }

  // 3. Hero Moment (1:32 - 1:52): Tight focused pulse (As-built verification & Release Blocked)
  for (let t = 92; t < 112; t += 2.4) {
    const isTension = t < 106;
    const chord = isTension ? [38, 45, 53, 56, 62] : [41, 48, 53, 57, 60];
    chord.forEach((n, i) => addPad(t, Math.min(112, t + 2.5), n, i < 2 ? 0.055 : 0.028, 0));
    for (let b = 0; b < 4 && t + b * 0.6 < 112; b++) {
      addKick(t + b * 0.6, 0.095);
      addPluck(t + b * 0.6 + 0.3, 0.25, isTension ? 69 : 72, 0.035, (b % 2 ? 0.3 : -0.3));
    }
  }

  // 4. Act III (1:52 - 2:15): Authoritative, optimistic resolve in D Major / G Major / A / D Major
  const act3Chords = [
    [112, 118, [38, 45, 50, 57, 62, 66]], // D major
    [118, 123, [35, 42, 50, 57, 61, 66]], // Bm7 -> A
    [123, 129, [43, 50, 55, 59, 62, 67]], // Gmaj7 -> warm lift
    [129, 135, [38, 45, 50, 57, 62, 66]], // D major final sustain
  ];
  for (const [t0, t1, notes] of act3Chords) {
    notes.forEach((n, idx) => addPad(t0, t1, n, idx < 2 ? 0.065 : 0.038, (idx - 2.5) * 0.22));
    if (t0 < 129) {
      for (let s = t0; s < t1; s += 0.4) {
        const note = notes[2 + (Math.floor((s - t0) / 0.4) % 4)] + 12;
        addPluck(s, 0.45, note, 0.036, 0.25);
      }
    }
  }

  // 5. Restrained UI sound design cues matched to storyboard events
  // 0:06.5 red variance warning pulse
  addPluck(6.4, 0.6, 45, 0.09, 0);
  // 0:28 logo reveal chime
  addPluck(28.0, 1.2, 74, 0.08, -0.2);
  addPluck(28.15, 1.2, 81, 0.08, 0.2);
  // 0:36-0:40 4 workflow modules click in
  [36.3, 37.1, 38.0, 38.8].forEach((t, i) => addTick(t, 1100 + i * 140, 0.065));
  // 0:43.5 scan sweep + keystrokes
  for (let t = 44.0; t < 48.0; t += 0.22) addTick(t, 1500, 0.035, 0.02);
  // 0:53.2 engineer confirm click + chime
  addTick(53.2, 1600, 0.07);
  addPluck(53.3, 0.7, 76, 0.075, 0);
  // 0:58 - 1:05 input ticks
  for (let i = 0; i < 12; i++) addTick(57.5 + i * 0.5, 1250 + (i % 3) * 100, 0.04, 0.025);
  // 1:15.5 - 1:21 calculation trace sequence ticks
  for (let t = 75.5; t < 81.0; t += 0.18) addTick(t, 1750, 0.035, 0.018);
  // 1:41.3 Release Blocked lock clunk + low pulse
  addKick(101.3, 0.18);
  addPluck(101.35, 0.8, 41, 0.11, 0);
  // 1:47.2 Checker confirmation chime
  addTick(107.2, 1500, 0.07);
  addPluck(107.3, 0.8, 79, 0.08, 0.1);
  addPluck(107.45, 0.9, 84, 0.08, -0.1);
  // 1:52.5 - 1:56.5 Traceability node snaps
  for (let i = 0; i < 7; i++) addTick(112.4 + i * 0.6, 1200 + i * 90, 0.055);
  // 2:09 Final logo lock chime
  addPluck(129.0, 1.8, 74, 0.075, -0.15);
  addPluck(129.15, 2.0, 86, 0.075, 0.15);

  // Write 16-bit PCM Stereo WAV
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buf.writeUInt16LE(numChannels * bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const cl = Math.max(-0.95, Math.min(0.95, L[i]));
    const cr = Math.max(-0.95, Math.min(0.95, R[i]));
    buf.writeInt16LE(Math.floor(cl * 32767), offset);
    buf.writeInt16LE(Math.floor(cr * 32767), offset + 2);
    offset += 4;
  }
  fs.writeFileSync(filePath, buf);
  console.log("Wrote soundtrack:", filePath, (buf.length / 1024 / 1024).toFixed(1), "MB");
}

(async () => {
  const sfxPath = path.join(outDir, "soundtrack.wav");
  if (!fs.existsSync(sfxPath)) generateSoundtrackWav(sfxPath);
  await generateVoiceovers();
})();

function unused_old() {}
