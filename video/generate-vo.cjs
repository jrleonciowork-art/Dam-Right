const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { EdgeTTS } = require("node-edge-tts");

const ffmpeg = path.join(__dirname, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
const ffprobe = path.join(__dirname, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe");
const outDir = path.join(__dirname, "public", "audio");
fs.mkdirSync(outDir, { recursive: true });

// Use Microsoft's most natural flagship conversational voice with ZERO pitch warping (pitch: "default")
// and natural human punctuation (no repetitive artificial '!' on every line).
const VOICE = "en-US-AndrewMultilingualNeural";

// [startSec, endSec, rate, spokenText]
const SEGMENTS = [
  [0, 6, "+6%", "Every flood wall begins as an approved plan. But once it's built, two questions matter:"],
  [6, 12, "+4%", "Was it built according to plan, and can every decision be proven?"],
  [12, 20, "+8%", "Today, critical evidence lives in separate places—drawings, spreadsheets, survey records, lab results, inspection photos."],
  [20, 28, "+8%", "A structure can look complete while small discrepancies stay hidden. A completed structure is not automatically a verified structure."],
  // Segment 4 (28-35s) is custom-staged below for a natural yet monumental "Meet... Dam Right." reveal!
  [28, 35, "CUSTOM_MONUMENTAL", "Meet Dam Right. Dam Right connects approved designs,"],
  [35, 42, "+6%", "engineering calculations, field measurements, and review evidence, in one traceable workflow."],
  [42, 49, "+8%", "Start by uploading the blueprint and calculation documents. Identify the project, structure, location, and approved revision."],
  [49, 57, "+6%", "AI assistance flags candidate dimensions and notes—but each one waits for engineer confirmation."],
  [57, 66, "+10%", "Next, define the wall: geometry, soil and concrete properties, water levels on both sides, surcharge, drainage, and your project's own safety limits."],
  [66, 75, "+6%", "The section updates as you work, showing every load acting on the structure."],
  [75, 84, "+6%", "Dam Right checks sliding, overturning, uplift, and bearing pressure—and it never hides the math."],
  [84, 92, "+10%", "Every input, equation, assumption, and result stays visible, so findings are clear: passed, failed, review, or incomplete."],
  [92, 100, "+8%", "Now, compare design to reality. The approved stem is 500 millimeters; the field measures 470, plus or minus five."],
  [100, 106, "+12%", "Even allowing for uncertainty, it falls below the 490 minimum. That segment is flagged, and release is blocked until an engineer decides."],
  [106, 112, "+6%", "A checker confirms survey evidence, and the result is accepted."],
  [112, 118, "+6%", "Every value has a source. AI helps discover information and conflicts."],
  [118, 123, "+12%", "Engineers control what becomes an approved input. Unreviewed or conflicting data never reaches the calculation."],
  [123, 129, "+4%", "From approved plan to built reality, make every engineering decision traceable."],
  [129, 135, "+6%", "Pilot Dam Right on your next flood-control or retaining-wall project."],
];

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
        pitch: "default", // CRITICAL: never pitch-shift neural TTS, keeps 100% natural human timbre
        volume: "default",
        timeout: 20000,
      });
      await tts.ttsPromise(text, outPath);
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
        return;
      }
    } catch (e) {
      console.log(`Retry ${attempt} for "${text.slice(0, 28)}..." after ${attempt * 2500}ms`);
      await sleep(attempt * 2500);
    }
  }
  throw new Error(`Failed to synthesize: ${text}`);
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
  s1 = Math.min(arr.length, s1 + Math.floor(0.04 * 44100));

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

// Build Segment 4 ("Meet Dam Right. Dam Right connects approved designs,")
// with natural, monumental keynote cadence:
// 1. "Meet... Dam Right." synthesized with deliberate, grounded gravitas (-6% rate),
//    with a natural 240ms poised breath before "Dam Right." and a subtle warm acoustic bloom on "Dam Right.",
// 2. Followed by a 580ms monumental pause while the logo reveal chord shines,
// 3. Followed by "Dam Right connects approved designs," at a warm, engaging +5% pace.
async function buildMonumentalMeetDamRight(outFile) {
  const pA = path.join(outDir, "vo_04_partA.mp3");
  const pB = path.join(outDir, "vo_04_partB.mp3");

  // Synthesize "Meet, Dam Right." with a comma so the neural model gives "Meet" a warm, expectant sustain
  // and drops into a resonant, grounded, authoritative cadence on "Dam Right."
  await synthClip("Meet, Dam Right.", "-6%", pA);
  await sleep(1000);
  await synthClip("Dam Right connects approved designs,", "+5%", pB);

  const a = decodeWavMono(pA);
  const b = decodeWavMono(pB);
  fs.unlinkSync(pA);
  fs.unlinkSync(pB);

  // Add a subtle, warm keynote-hall acoustic bloom (early reflections at 32ms and 68ms, 12% wet)
  // to "Meet, Dam Right." so it feels monumental yet completely natural
  const sr = 44100;
  const tailSamples = Math.floor(0.55 * sr); // 550ms dramatic pause + warm decay tail before part B
  const aWithBloom = new Float32Array(a.length + tailSamples);
  for (let i = 0; i < a.length; i++) {
    aWithBloom[i] += a[i] * 1.06;
    if (i + Math.floor(0.028 * sr) < aWithBloom.length) {
      aWithBloom[i + Math.floor(0.028 * sr)] += a[i] * 0.11;
    }
    if (i + Math.floor(0.062 * sr) < aWithBloom.length) {
      aWithBloom[i + Math.floor(0.062 * sr)] += a[i] * 0.06;
    }
  }

  const combined = new Float32Array(aWithBloom.length + b.length);
  combined.set(aWithBloom, 0);
  combined.set(b, aWithBloom.length);

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

async function run() {
  for (let i = 0; i < SEGMENTS.length; i++) {
    const [start, end, rate, text] = SEGMENTS[i];
    const windowSec = end - start;
    const outFile = path.join(outDir, `vo_${String(i).padStart(2, "0")}.mp3`);

    if (rate === "CUSTOM_MONUMENTAL") {
      await buildMonumentalMeetDamRight(outFile);
    } else {
      await synthClip(text, rate, outFile);
    }
    const dur = getDuration(outFile);
    console.log(`vo_${String(i).padStart(2, "0")}.mp3: window=${windowSec}s, dur=${dur.toFixed(2)}s, rate=${rate}`);
    await sleep(1100);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
