const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { EdgeTTS } = require("node-edge-tts");

const ffmpeg = path.join(__dirname, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
const ffprobe = path.join(__dirname, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe");
const outDir = path.join(__dirname, "public", "audio");
const VOICE = "en-US-AndrewMultilingualNeural";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getDuration(file) {
  const out = execFileSync(ffprobe, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]).toString().trim();
  return parseFloat(out);
}

async function synthClip(text, rate, outPath) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const tts = new EdgeTTS({
        voice: VOICE,
        lang: "en-US",
        outputFormat: "audio-24khz-96kbitrate-mono-mp3",
        rate,
        pitch: "default",
        volume: "default",
        timeout: 20000,
      });
      await tts.ttsPromise(text, outPath);
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) return;
    } catch (e) {
      await sleep(attempt * 2500);
    }
  }
  throw new Error(`Failed: ${text}`);
}

function decodeWavMono(mp3File) {
  const wavFile = mp3File + ".tmp.wav";
  execFileSync(ffmpeg, [
    "-y", "-v", "error",
    "-i", mp3File,
    "-af", "aresample=44100",
    "-f", "wav", "-c:a", "pcm_s16le", "-ac", "1", "-ar", "44100",
    wavFile,
  ]);
  const buf = fs.readFileSync(wavFile);
  fs.unlinkSync(wavFile);
  let dataOffset = 44;
  for (let i = 12; i < Math.min(buf.length - 8, 256); i++) {
    if (buf[i] === 0x64 && buf[i + 1] === 0x61 && buf[i + 2] === 0x74 && buf[i + 3] === 0x61) {
      dataOffset = i + 8;
      break;
    }
  }
  const n = Math.floor((buf.length - dataOffset) / 2);
  const arr = new Float32Array(n);
  for (let i = 0; i < n; i++) arr[i] = buf.readInt16LE(dataOffset + i * 2) / 32768;

  let s0 = 0;
  while (s0 < arr.length && Math.abs(arr[s0]) < 0.008) s0++;
  s0 = Math.max(0, s0 - Math.floor(0.02 * 44100));

  let s1 = arr.length - 1;
  while (s1 > s0 && Math.abs(arr[s1]) < 0.008) s1--;
  s1 = Math.min(arr.length, s1 + Math.floor(0.05 * 44100));

  return arr.subarray(s0, s1);
}

function writeWavMono(floatArr, wavPath) {
  const sr = 44100;
  const dataSize = floatArr.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < floatArr.length; i++) {
    const v = Math.max(-0.98, Math.min(0.98, floatArr[i]));
    buf.writeInt16LE(Math.floor(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(wavPath, buf);
}

// Craft Segment 4 (28-35s) so "Meet... Dam Right." feels genuinely natural yet monumental:
// - We synthesize "Meet — Dam Right." at -8% rate so the neural model gives "Meet" an expectant, poised sustain
//   and drops naturally into a warm, authoritative, resonant cadence on "Dam Right."
// - We also widen the natural pause before "Dam Right." by +220ms so the reveal lands right as the logo locks on screen,
//   add a subtle warm keynote-hall bloom (early reflections at 26ms, 54ms, 88ms),
// - Hold a 1.05-second monumental pause after "Dam Right." while the musical fanfare blooms,
// - Then flow warmly into "Dam Right connects approved designs," (+4% rate).
async function buildMonumentalMeetDamRight(outFile) {
  const pA = path.join(outDir, "vo_04_partA.mp3");
  const pB = path.join(outDir, "vo_04_partB.mp3");

  await synthClip("Meet... Dam Right.", "-8%", pA);
  await sleep(900);
  await synthClip("Dam Right connects approved designs,", "+4%", pB);

  const rawA = decodeWavMono(pA);
  const b = decodeWavMono(pB);
  fs.unlinkSync(pA);
  fs.unlinkSync(pB);

  const sr = 44100;
  // Find the natural dip between "Meet" and "Dam Right" (between 20% and 55% of rawA) and insert 220ms of poised room breath
  const searchStart = Math.floor(rawA.length * 0.18);
  const searchEnd = Math.floor(rawA.length * 0.55);
  let minRms = 999;
  let splitIdx = Math.floor(rawA.length * 0.32);
  const win = Math.floor(0.02 * sr);
  for (let i = searchStart; i < searchEnd - win; i += Math.floor(0.005 * sr)) {
    let sum = 0;
    for (let k = 0; k < win; k++) sum += rawA[i + k] * rawA[i + k];
    const rms = Math.sqrt(sum / win);
    if (rms < minRms) {
      minRms = rms;
      splitIdx = i + Math.floor(win / 2);
    }
  }

  const prePause = Math.floor(0.22 * sr); // +220ms poised breath between "Meet..." and "Dam Right."
  const postPause = Math.floor(1.05 * sr); // 1.05s monumental pause after "Dam Right." before "Dam Right connects..."
  const aStaged = new Float32Array(rawA.length + prePause + postPause);

  // Copy "Meet..."
  for (let i = 0; i < splitIdx; i++) {
    aStaged[i] = rawA[i] * 1.02;
  }
  // Copy "Dam Right." with warm keynote-hall acoustic bloom (subtle early reflections, 100% natural)
  for (let i = splitIdx; i < rawA.length; i++) {
    const dst = i + prePause;
    const sample = rawA[i] * 1.10;
    aStaged[dst] += sample;
    if (dst + Math.floor(0.026 * sr) < aStaged.length) aStaged[dst + Math.floor(0.026 * sr)] += sample * 0.12;
    if (dst + Math.floor(0.054 * sr) < aStaged.length) aStaged[dst + Math.floor(0.054 * sr)] += sample * 0.08;
    if (dst + Math.floor(0.088 * sr) < aStaged.length) aStaged[dst + Math.floor(0.088 * sr)] += sample * 0.045;
  }

  const combined = new Float32Array(aStaged.length + b.length);
  combined.set(aStaged, 0);
  combined.set(b, aStaged.length);

  const tmpWav = outFile + ".combined.wav";
  writeWavMono(combined, tmpWav);
  execFileSync(ffmpeg, [
    "-y", "-v", "error",
    "-i", tmpWav,
    "-c:a", "libmp3lame", "-b:a", "128k",
    outFile,
  ]);
  fs.unlinkSync(tmpWav);
}

const DENSE_FIXES = [
  [2, 8, "+18%", "Today, critical evidence lives in separate places—drawings, spreadsheets, survey records, lab results, inspection photos."],
  [3, 8, "+18%", "A structure can look complete while small discrepancies stay hidden. A completed structure is not automatically a verified structure."],
  [6, 7, "+20%", "Start by uploading the blueprint and calculation documents. Identify the project, structure, location, and approved revision."],
  [8, 9, "+20%", "Next, define the wall: geometry, soil and concrete properties, water levels on both sides, surcharge, drainage, and your project's own safety limits."],
  [11, 8, "+24%", "Every input, equation, assumption, and result stays visible, so findings are clear: passed, failed, review, or incomplete."],
  [12, 8, "+18%", "Now, compare design to reality. The approved stem is 500 millimeters; the field measures 470, plus or minus five."],
  [13, 6, "+32%", "Even allowing for uncertainty, it falls below the 490 minimum. That segment is flagged, and release is blocked until an engineer decides."],
  [16, 5, "+28%", "Engineers control what becomes an approved input. Unreviewed or conflicting data never reaches the calculation."],
];

(async () => {
  const vo4 = path.join(outDir, "vo_04.mp3");
  await buildMonumentalMeetDamRight(vo4);
  console.log("vo_04.mp3 (monumental Meet Dam Right) dur:", getDuration(vo4).toFixed(2), "s");
  await sleep(900);

  for (const [idx, win, rate, text] of DENSE_FIXES) {
    const f = path.join(outDir, `vo_${String(idx).padStart(2, "0")}.mp3`);
    await synthClip(text, rate, f);
    console.log(`vo_${String(idx).padStart(2, "0")}.mp3: win=${win}s, dur=${getDuration(f).toFixed(2)}s`);
    await sleep(900);
  }
})();
