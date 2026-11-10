const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const envFile = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envFile, "utf8");
const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
const apiKey = match ? match[1].trim().replace(/^['"]|['"]$/g, "") : "";

const ffmpeg = path.join(__dirname, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
const ffprobe = path.join(__dirname, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe");
const audioDir = path.join(__dirname, "public", "audio");

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

async function generateVo08IfMissing() {
  const vo8 = path.join(audioDir, "vo_08.mp3");
  if (fs.existsSync(vo8) && fs.statSync(vo8).size > 1000) return;

  // Try EdgeTTS first after cooldown
  try {
    const { EdgeTTS } = require("node-edge-tts");
    const tts = new EdgeTTS({
      voice: "en-US-AndrewMultilingualNeural",
      lang: "en-US",
      outputFormat: "audio-24khz-96kbitrate-mono-mp3",
      rate: "+20%",
      pitch: "-2Hz",
    });
    await tts.ttsPromise(CAPTIONS[8][2], vo8);
    if (fs.existsSync(vo8) && fs.statSync(vo8).size > 1000) {
      console.log("Generated vo_08.mp3 via EdgeTTS");
      return;
    }
  } catch (e) {
    console.log("EdgeTTS still rate-limited, trying Gemini TTS...");
  }

  // Fallback: Gemini 2.5 Flash TTS
  if (apiKey) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: CAPTIONS[8][2] }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } },
            },
          },
        }),
      }
    );
    if (res.ok) {
      const json = await res.json();
      const inline = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inline?.data) {
        const pcmPath = path.join(audioDir, "vo_08.pcm");
        fs.writeFileSync(pcmPath, Buffer.from(inline.data, "base64"));
        execFileSync(ffmpeg, ["-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcmPath, "-b:a", "96k", vo8]);
        fs.unlinkSync(pcmPath);
        console.log("Generated vo_08.mp3 via Gemini TTS");
        return;
      }
    } else {
      console.log("Gemini TTS status:", res.status, await res.text());
    }
  }

  // Fallback 2: Google Translate TTS en-US
  const text = CAPTIONS[8][2];
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(vo8, buf);
    console.log("Generated vo_08.mp3 via Google TTS");
  }
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

(async () => {
  await generateVo08IfMissing();

  // Inspect actual durations of all 19 VO files and build ffmpeg filter_complex
  const inputs = ["-i", path.join(__dirname, "..", "DamRight_Demo_2m15s.mp4"), "-i", path.join(audioDir, "soundtrack.wav")];
  const filterParts = [
    "[1:a]volume=0.32[bgm]",
  ];
  const mixLabels = ["[bgm]"];

  for (let i = 0; i < CAPTIONS.length; i++) {
    const [start, end] = CAPTIONS[i];
    const windowSec = end - start;
    const file = path.join(audioDir, `vo_${String(i).padStart(2, "0")}.mp3`);
    const dur = getDuration(file);
    // Leave at least 0.22s breathing room at the end of each window
    const maxAllowed = windowSec - 0.22;
    let atempo = 1.0;
    if (dur > maxAllowed) {
      atempo = Math.min(1.45, Math.max(1.0, +(dur / maxAllowed).toFixed(3)));
    }
    const finalDur = (dur / atempo).toFixed(2);
    console.log(`Segment ${i} [${start}-${end}s]: raw=${dur.toFixed(2)}s, atempo=${atempo}, final=${finalDur}s`);

    inputs.push("-i", file);
    const inputIdx = i + 2;
    const delayMs = Math.round((start + 0.08) * 1000);
    const tempoFilter = atempo > 1.005 ? `atempo=${atempo},` : "";
    filterParts.push(`[${inputIdx}:a]${tempoFilter}volume=1.35,adelay=${delayMs}|${delayMs}[v${i}]`);
    mixLabels.push(`[v${i}]`);
  }

  filterParts.push(
    `${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0:normalize=0[aout]`
  );

  const outMp4 = path.join(__dirname, "out", "DamRight_Demo_With_Audio.mp4");
  const rootMp4 = path.join(__dirname, "..", "DamRight_Demo_2m15s.mp4");

  execFileSync(
    ffmpeg,
    [
      "-y",
      ...inputs,
      "-filter_complex", filterParts.join(";"),
      "-map", "0:v",
      "-map", "[aout]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      outMp4,
    ],
    { stdio: "inherit" }
  );

  fs.copyFileSync(outMp4, rootMp4);
  console.log("Final MP4 with voiceover + music ready:", rootMp4, (fs.statSync(rootMp4).size / 1024 / 1024).toFixed(2), "MB");
})();
