import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
// Real Dam Right calculation engine and defaults — keeps the demo numerically accurate.
import { calculateWallReview, type ReviewStatus } from "../../lib/engineering/wall";
import { DEFAULT_WALL_INPUT } from "../../lib/engineering/defaults";

export const FPS = 30;
export const TOTAL_FRAMES = 135 * FPS; // 2:15

/* ---------- Brand ---------- */
const C = {
  ink: "#14202B",
  tide: "#087E8B",
  green: "#138A5B",
  red: "#C9362B",
  mist: "#EEF3F4",
  white: "#FFFFFF",
  amber: "#D97706",
  violet: "#6D28D9",
  line: "#C9D6DA",
  muted: "#5B6B77",
};
const SANS = "Inter, 'Segoe UI', Arial, sans-serif";
const DISPLAY = "'Space Grotesk', 'Segoe UI Semibold', 'Segoe UI', Arial, sans-serif";
const MONO = "'JetBrains Mono', Consolas, 'Courier New', monospace";

const PROJECT = "Project Bantay-Ilog Flood Wall";
const PROJECT_LOC = "Sample Riverside Barangay · Mock-up";

/* ---------- Engine (real) ---------- */
const INPUT = {
  ...DEFAULT_WALL_INPUT,
  project: { ...DEFAULT_WALL_INPUT.project, name: PROJECT, location: PROJECT_LOC },
  geometry: { ...DEFAULT_WALL_INPUT.geometry, stemThicknessM: 0.47 },
};
const CALC = calculateWallReview(INPUT);
const V = CALC.values;

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pass: "Passed",
  fail: "Failed",
  warning: "Review",
  insufficient_information: "Incomplete",
  unsupported: "Unsupported",
  not_evaluated: "Not evaluated",
  not_applicable: "N/A",
} as Record<ReviewStatus, string>;
const STATUS_COLOR: Record<string, string> = {
  pass: C.green,
  fail: C.red,
  warning: C.amber,
  insufficient_information: C.violet,
  unsupported: C.muted,
  not_evaluated: C.muted,
  not_applicable: C.muted,
};

/* ---------- Helpers ---------- */
const ease = Easing.bezier(0.4, 0, 0.2, 1);
const fi = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const typed = (s: string, f: number, start: number, cps = 40) =>
  s.slice(0, Math.max(0, Math.floor(((f - start) / FPS) * cps)));

/* ---------- Primitives ---------- */
const Grid: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <AbsoluteFill style={{ background: dark ? C.ink : C.mist }}>
    <svg width="100%" height="100%">
      <defs>
        <pattern id={dark ? "gs-d" : "gs"} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke={dark ? "#22323F" : "#DCE6E9"} strokeWidth="1" />
        </pattern>
        <pattern id={dark ? "gl-d" : "gl"} width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill={`url(#${dark ? "gs-d" : "gs"})`} />
          <path d="M200 0H0V200" fill="none" stroke={dark ? "#2C4050" : "#C9D6DA"} strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${dark ? "gl-d" : "gl"})`} />
    </svg>
  </AbsoluteFill>
);

const Kinetic: React.FC<{
  text: string;
  f: number;
  start: number;
  end?: number;
  size?: number;
  color?: string;
  x?: number | string;
  y: number;
  align?: "left" | "center";
  weight?: number;
  font?: string;
  width?: number | string;
}> = ({ text, f, start, end, size = 72, color = C.ink, x = 0, y, align = "center", weight = 700, font = DISPLAY, width = "100%" }) => {
  const a = fi(f, start, start + 15) * (end ? 1 - fi(f, end - 12, end) : 1);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        textAlign: align,
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        letterSpacing: font === DISPLAY ? "0.02em" : 0,
        color,
        opacity: a,
        transform: `translateY(${(1 - a) * 24}px)`,
        lineHeight: 1.15,
      }}
    >
      {text}
    </div>
  );
};

const Chip: React.FC<{ label: string; color: string; solid?: boolean; dashed?: boolean; size?: number }> = ({ label, color, solid, dashed, size = 18 }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "5px 12px",
      borderRadius: 999,
      border: `2px ${dashed ? "dashed" : "solid"} ${color}`,
      background: solid ? color : `${color}14`,
      color: solid ? C.white : color,
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: size,
      whiteSpace: "nowrap",
    }}
  >
    <StatusIcon color={solid ? C.white : color} label={label} />
    {label}
  </span>
);

const StatusIcon: React.FC<{ color: string; label: string }> = ({ color, label }) => {
  const l = label.toLowerCase();
  const s = 14;
  if (l.includes("pass") || l.includes("within") || l.includes("accepted") || l.includes("confirmed"))
    return (<svg width={s} height={s} viewBox="0 0 14 14"><path d="M2 7.5l3 3 7-7" stroke={color} strokeWidth="2.4" fill="none" /></svg>);
  if (l.includes("fail") || l.includes("outside") || l.includes("blocked"))
    return (<svg width={s} height={s} viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8" stroke={color} strokeWidth="2.4" /></svg>);
  if (l.includes("incomplete") || l.includes("missing") || l.includes("not measured"))
    return (<svg width={s} height={s} viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" stroke={color} strokeWidth="2" strokeDasharray="3 2" fill="none" /></svg>);
  return (<svg width={s} height={s} viewBox="0 0 14 14"><path d="M7 1.5L13 12H1z" stroke={color} strokeWidth="2" fill="none" /><path d="M7 5.5v3" stroke={color} strokeWidth="2" /></svg>);
};

const LogoMark: React.FC<{ size?: number; color?: string }> = ({ size = 48, color = "#5ED3DE" }) => (
  <svg width={size} height={(size * 528) / 620} viewBox="0 0 620 528" fill="none">
    <path d="M41 34H171V366H503V496H41V34Z" fill={color} />
    <path d="M243 172C278 145 300 128 332 128C380 128 415 171 467 171C504 171 528 152 560 140" stroke="#387984" strokeWidth="54" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M243 275C278 248 300 231 332 231C380 231 415 274 467 274C504 274 528 255 560 243" stroke="#4BA6B1" strokeWidth="54" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/* Wall cross-section (1 m = scale px). Toe on dry side (left), wet side (right). */
const WallSection: React.FC<{
  x: number;
  y: number;
  scale?: number;
  draw?: number;
  stem?: number;
  water?: number;
  forces?: number[]; // [hydro, uplift, weight, earth]
  stroke?: string;
  fill?: string;
  labels?: boolean;
}> = ({ x, y, scale = 140, draw = 1, stem = 0.5, water = 0, forces = [0, 0, 0, 0], stroke = C.ink, fill = "#FFFFFF", labels = true }) => {
  const g = INPUT.geometry;
  const B = g.baseWidthM * scale;
  const tb = g.baseThicknessM * scale;
  const H = g.wallHeightM * scale;
  const toe = g.toeWidthM * scale;
  const st = stem * scale;
  const path = `M0 0 H${B} V${-tb} H${toe + st} V${-H} H${toe} V${-tb} H0 Z`;
  const wl = water * scale;
  const hx = toe + st;
  return (
    <svg style={{ position: "absolute", left: x - 40, top: y - H - 80, overflow: "visible" }} width={B + 400} height={H + 200}>
      <g transform={`translate(40 ${H + 80})`}>
        {/* ground */}
        <line x1={-40} y1={0} x2={B + 320} y2={0} stroke={C.muted} strokeWidth={2} opacity={draw} />
        {/* water on wet side */}
        {water > 0 && (
          <g>
            <rect x={hx} y={-wl} width={B + 300 - hx} height={wl} fill={C.tide} opacity={0.14} />
            <line x1={hx} y1={-wl} x2={B + 300} y2={-wl} stroke={C.tide} strokeWidth={3} />
            {labels && (
              <text x={B + 300} y={-wl - 12} textAnchor="end" fontFamily={MONO} fontSize={20} fill={C.tide}>
                ▽ Wet-side level {fmt(water, 2)} m
              </text>
            )}
          </g>
        )}
        <path d={path} fill={fill} fillOpacity={draw} stroke={stroke} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        {/* hydrostatic */}
        {forces[0] > 0 && (
          <g opacity={forces[0]}>
            <path d={`M${hx} ${-wl} L${hx + wl * 0.55} 0 L${hx} 0 Z`} fill={C.tide} opacity={0.25} stroke={C.tide} strokeWidth={2} />
            {[0.35, 0.6, 0.85].map((t) => (
              <g key={t}>
                <line x1={hx + wl * 0.55 * t + 6} y1={-wl * (1 - t)} x2={hx + 8} y2={-wl * (1 - t)} stroke={C.tide} strokeWidth={3} />
                <path d={`M${hx + 8} ${-wl * (1 - t)} l10 -6 v12z`} fill={C.tide} />
              </g>
            ))}
            {labels && <text x={hx + wl * 0.6 + 12} y={-wl / 3} fontFamily={MONO} fontSize={18} fill={C.tide}>HYDROSTATIC {fmt(V.wetWaterForceKNM, 1)} kN/m</text>}
          </g>
        )}
        {/* uplift */}
        {forces[1] > 0 && (
          <g opacity={forces[1]}>
            {[0.15, 0.4, 0.65, 0.9].map((t) => (
              <g key={t}>
                <line x1={B * t} y1={46 - 10 * t} x2={B * t} y2={10} stroke={C.violet} strokeWidth={3} />
                <path d={`M${B * t} 6 l-6 10 h12z`} fill={C.violet} />
              </g>
            ))}
            {labels && <text x={0} y={80} fontFamily={MONO} fontSize={18} fill={C.violet}>UPLIFT {fmt(V.upliftForceKNM, 1)} kN/m</text>}
          </g>
        )}
        {/* self weight */}
        {forces[2] > 0 && (
          <g opacity={forces[2]}>
            <line x1={toe + st / 2} y1={-H * 0.55} x2={toe + st / 2} y2={-tb - 14} stroke={C.ink} strokeWidth={4} />
            <path d={`M${toe + st / 2} ${-tb - 4} l-8 -14 h16z`} fill={C.ink} />
            {labels && <text x={toe - 210} y={-H * 0.6} fontFamily={MONO} fontSize={18} fill={C.ink}>SELF-WEIGHT {fmt(V.totalWeightKNM, 1)} kN/m</text>}
          </g>
        )}
        {/* earth pressure (0 for this load case) */}
        {forces[3] > 0 && labels && (
          <text x={-30} y={-H - 20} fontFamily={MONO} fontSize={18} fill={C.muted} opacity={forces[3]}>
            EARTH PRESSURE {fmt(V.earthForceKNM, 1)} kN/m · retained soil {fmt(INPUT.loadCase.retainedSoilHeightM, 1)} m
          </text>
        )}
      </g>
    </svg>
  );
};

/* ---------- App window mock-up (mirrors real workspace tabs) ---------- */
const TABS = ["AI Blueprint Intake", "Plan & Design", "Engineering Checks", "As-Built Verification", "Findings & Report"];

const AppWindow: React.FC<{ tab: number; f: number; children: React.ReactNode; tabLight?: (i: number) => number }> = ({ tab, f, children, tabLight }) => {
  const a = fi(f, 0, 15);
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 40,
        width: 1760,
        height: 850,
        background: C.white,
        borderRadius: 18,
        boxShadow: "0 18px 50px rgba(20,32,43,0.18)",
        overflow: "hidden",
        opacity: a,
        transform: `translateY(${(1 - a) * 30}px)`,
        fontFamily: SANS,
        color: C.ink,
      }}
    >
      <div style={{ height: 76, background: C.ink, display: "flex", alignItems: "center", padding: "0 28px", gap: 16 }}>
        <LogoMark size={40} color="#5ED3DE" />
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, color: C.white }}>Dam Right</div>
        <div style={{ marginLeft: 30, color: "#9FE7EE", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>PROJECT</div>
        <div style={{ color: C.white, fontSize: 18 }}>{PROJECT} · {INPUT.project.structureId}</div>
        <div style={{ marginLeft: "auto", color: "#9FE7EE", fontSize: 14 }}>Engineering review assistant · Not a certification tool</div>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "14px 28px 0", borderBottom: `1px solid ${C.line}`, background: "#F7FAFB" }}>
        {TABS.map((t, i) => {
          const lit = tabLight ? tabLight(i) : i === tab ? 1 : 0;
          return (
            <div
              key={t}
              style={{
                padding: "12px 20px",
                fontWeight: 700,
                fontSize: 18,
                borderRadius: "10px 10px 0 0",
                background: lit > 0.5 ? C.white : "transparent",
                color: lit > 0.5 ? C.tide : C.muted,
                borderBottom: `3px solid ${lit > 0.5 ? C.tide : "transparent"}`,
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", height: 850 - 76 - 62 }}>{children}</div>
    </div>
  );
};

const Panel: React.FC<{ x: number; y: number; w: number; h: number; title?: string; eyebrow?: string; children?: React.ReactNode; opacity?: number; dark?: boolean }> = ({ x, y, w, h, title, eyebrow, children, opacity = 1, dark }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, border: `1px solid ${dark ? "#2C4050" : C.line}`, borderRadius: 14, background: dark ? C.ink : C.white, padding: 22, opacity, color: dark ? C.white : C.ink, overflow: "hidden" }}>
    {eyebrow && <div style={{ fontSize: 13, letterSpacing: "0.14em", fontWeight: 700, color: dark ? "#67E8F9" : C.tide, textTransform: "uppercase" }}>{eyebrow}</div>}
    {title && <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>{title}</div>}
    {children}
  </div>
);

const Cursor: React.FC<{ x: number; y: number; click?: number }> = ({ x, y, click = 0 }) => (
  <svg style={{ position: "absolute", left: x, top: y, overflow: "visible" }} width={30} height={30}>
    {click > 0 && <circle cx={4} cy={4} r={10 + click * 20} fill="none" stroke={C.tide} strokeWidth={2} opacity={1 - click} />}
    <path d="M0 0 L0 24 L7 18 L12 28 L16 26 L11 16 L20 16 Z" fill={C.ink} stroke={C.white} strokeWidth={2} />
  </svg>
);

/* ---------- Evidence cards (abstract, no people) ---------- */
const EVIDENCE = [
  { label: "DRAWINGS", x: 200, y: 180, kind: "dwg" },
  { label: "SPREADSHEETS", x: 760, y: 120, kind: "xls" },
  { label: "SURVEY RECORDS", x: 1340, y: 200, kind: "svy" },
  { label: "LAB RESULTS", x: 260, y: 600, kind: "lab" },
  { label: "INSPECTION PHOTOS", x: 820, y: 640, kind: "img" },
  { label: "WATER LEVELS", x: 1380, y: 600, kind: "wl" },
];
const EvidenceCard: React.FC<{ e: (typeof EVIDENCE)[number]; dx?: number; dy?: number; s?: number; o?: number }> = ({ e, dx = 0, dy = 0, s = 1, o = 1 }) => (
  <div style={{ position: "absolute", left: e.x + dx, top: e.y + dy, width: 340, height: 230, background: C.white, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: "0 10px 30px rgba(20,32,43,0.12)", transform: `scale(${s})`, opacity: o, padding: 18, fontFamily: SANS }}>
    <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "0.12em", color: C.muted }}>{e.label}</div>
    <svg width={300} height={160} style={{ marginTop: 10 }}>
      {e.kind === "dwg" && (<g stroke={C.tide} fill="none" strokeWidth={2}><path d="M30 140h220v-20h-130v-100h-30v100h-60z" /><path d="M20 20h260M20 20v8M280 20v8" strokeDasharray="4 4" /></g>)}
      {e.kind === "xls" && [0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={10 + c * 72} y={6 + r * 30} width={68} height={26} fill={r === 0 ? "#DCE6E9" : "#F3F6F7"} />))}
      {e.kind === "svy" && [[40, 120], [90, 90], [140, 100], [190, 60], [240, 75], [270, 40]].map(([a, b], i) => (<g key={i}><circle cx={a} cy={b} r={6} fill={C.tide} /><text x={a + 8} y={b - 8} fontFamily={MONO} fontSize={12} fill={C.muted}>{`P${i + 1}`}</text></g>))}
      {e.kind === "lab" && (<g fontFamily={MONO} fontSize={16} fill={C.ink}><text x={10} y={30}>f'c test  22.4 MPa</text><text x={10} y={64}>Slump     95 mm</text><text x={10} y={98}>Cylinder  #A-03</text><text x={10} y={132}>Age       28 d</text></g>)}
      {e.kind === "img" && (<g><rect x={10} y={6} width={280} height={148} fill="#DCE6E9" /><path d="M10 154l90-80 60 50 40-30 90 60z" fill="#B8C9CF" /><circle cx={230} cy={44} r={16} fill="#B8C9CF" /></g>)}
      {e.kind === "wl" && (<path d="M10 120 C60 120 70 50 110 60 S170 130 210 80 S260 30 290 50" stroke={C.tide} strokeWidth={3} fill="none" />)}
    </svg>
  </div>
);

/* =================================================================== */
/* SCENES                                                               */
/* =================================================================== */

/* 0:00–0:12 Opening hook */
const S1: React.FC = () => {
  const f = useCurrentFrame();
  const wx = 300, wy = 820;
  const sc = 160;
  const stemX = wx + INPUT.geometry.toeWidthM * sc;
  const red = fi(f, 190, 215);
  return (
    <AbsoluteFill>
      <Grid />
      <WallSection x={wx} y={wy} scale={sc} draw={fi(f, 5, 95)} stem={0.5} labels={false} />
      {/* approved dimension */}
      <div style={{ position: "absolute", left: stemX - 20, top: 210, opacity: fi(f, 70, 90), fontFamily: MONO, color: C.tide, fontSize: 26 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, letterSpacing: "0.14em" }}>APPROVED DESIGN</div>
        <svg width={120} height={30}><path d={`M4 15H${0.5 * sc - 4}M4 5v20M${0.5 * sc - 4} 5v20`} stroke={C.tide} strokeWidth={2} /></svg>
        <div>STEM 500 mm</div>
      </div>
      {/* as-built dimension */}
      <div style={{ position: "absolute", left: stemX + 160, top: 330, opacity: fi(f, 170, 190), fontFamily: MONO, color: C.ink, fontSize: 26 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, letterSpacing: "0.14em" }}>AS-BUILT EVIDENCE</div>
        <div>STEM 470 mm</div>
      </div>
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        <line x1={stemX + 0.47 * sc} y1={400} x2={stemX + 0.47 * sc + (0.5 - 0.47) * sc * red + 1} y2={400} stroke={C.red} strokeWidth={6} />
        <line x1={stemX + 0.47 * sc} y1={300} x2={stemX + 0.47 * sc} y2={700} stroke={C.red} strokeWidth={2} strokeDasharray="8 6" opacity={red} />
      </svg>
      <div style={{ position: "absolute", left: stemX + 160, top: 420, fontFamily: MONO, fontSize: 30, fontWeight: 700, color: C.red, opacity: red }}>Δ −30 mm</div>
      <Kinetic f={f} start={225} text="Was it built according to plan—" size={58} x={940} width={900} align="left" y={560} />
      <Kinetic f={f} start={262} text="and can every decision be proven?" size={58} x={940} width={900} align="left" y={640} color={C.tide} />
    </AbsoluteFill>
  );
};

/* 0:12–0:28 Problem */
const S2: React.FC = () => {
  const f = useCurrentFrame();
  const dim = 1 - 0.7 * fi(f, 240, 270);
  return (
    <AbsoluteFill>
      <Grid />
      {EVIDENCE.map((e, i) => (
        <EvidenceCard key={e.label} e={e} dx={Math.sin((f + i * 40) / 50) * 18 + (i % 2 ? 1 : -1) * f * 0.06} dy={Math.cos((f + i * 30) / 60) * 14} o={fi(f, i * 14, i * 14 + 20) * dim} />
      ))}
      <AbsoluteFill style={{ background: C.mist, opacity: 0.75 * fi(f, 240, 270) }} />
      <Kinetic f={f} start={250} text="BUILT DOES NOT ALWAYS MEAN VERIFIED" size={86} y={410} />
      <Kinetic f={f} start={320} text="A completed structure is not automatically a verified structure." size={36} y={540} weight={500} font={SANS} color={C.muted} />
      {/* hidden discrepancy markers */}
      {[640, 960, 1280].map((x, i) => (
        <div key={x} style={{ position: "absolute", left: x, top: 680, width: 18, height: 18, borderRadius: 9, border: `3px solid ${C.red}`, opacity: fi(f, 340 + i * 15, 360 + i * 15) * (0.35 + 0.25 * Math.sin(f / 12 + i)) }} />
      ))}
      <div style={{ position: "absolute", left: 560, top: 700, width: 800, height: 6, background: C.ink, opacity: fi(f, 330, 350) * 0.8 }} />
    </AbsoluteFill>
  );
};

/* 0:28–0:42 Introduce Dam Right */
const S3: React.FC = () => {
  const f = useCurrentFrame();
  const conv = fi(f, 0, 70);
  const logo = fi(f, 60, 90) * (1 - fi(f, 195, 215));
  const sweep = fi(f, 0, 60);
  const flow = ["APPROVED DESIGN", "CALCULATIONS", "FIELD MEASUREMENTS", "REVIEW EVIDENCE"];
  return (
    <AbsoluteFill>
      <Grid />
      {f < 90 && EVIDENCE.map((e) => (
        <EvidenceCard key={e.label} e={e} dx={(960 - 170 - e.x) * conv} dy={(540 - 115 - e.y) * conv} s={1 - conv * 0.9} o={(1 - conv) * 0.6 + 0.1} />
      ))}
      <div style={{ position: "absolute", left: 0, top: 538, height: 4, width: 1920 * sweep, background: C.tide, opacity: 1 - fi(f, 80, 110) }} />
      <div style={{ position: "absolute", width: "100%", top: 360, display: "flex", flexDirection: "column", alignItems: "center", opacity: logo, transform: `scale(${0.94 + 0.06 * logo})` }}>
        <LogoMark size={150} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 120, color: C.ink, letterSpacing: "0.06em" }}>DAM RIGHT</div>
        <div style={{ height: 5, width: 520 * logo, background: C.tide }} />
      </div>
      {f >= 200 && (
        <Sequence from={200} layout="none">
          <AppWindow tab={-1} f={f - 200} tabLight={(i) => (f > 240 + i * 22 ? 1 : 0)}>
            <Panel x={28} y={28} w={820} h={250} eyebrow="Project" title={PROJECT}>
              <div style={{ fontFamily: MONO, fontSize: 20, lineHeight: 1.7, color: C.muted }}>
                Structure ID {INPUT.project.structureId}<br />{PROJECT_LOC}<br />{INPUT.project.standardPack}
              </div>
            </Panel>
            <Panel x={876} y={28} w={828} h={250} eyebrow="Review state" title="Current decision state">
              <Chip label="Engineer review required" color={C.amber} />
              <div style={{ marginTop: 16, fontSize: 20, color: C.muted }}>Professional approval remains with the licensed engineer.</div>
            </Panel>
            <div style={{ position: "absolute", left: 28, top: 330, width: 1676, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {flow.map((t, i) => (
                <React.Fragment key={t}>
                  <div style={{ flex: 1, padding: "34px 10px", textAlign: "center", borderRadius: 14, border: `2px solid ${C.tide}`, background: `${C.tide}10`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, color: C.tide, opacity: fi(f, 250 + i * 25, 265 + i * 25) }}>{t}</div>
                  {i < 3 && <div style={{ width: 60, height: 4, background: C.tide, opacity: fi(f, 265 + i * 25, 280 + i * 25) }} />}
                </React.Fragment>
              ))}
            </div>
            <Kinetic f={f} start={350} text="One traceable workflow." size={56} y={560} color={C.ink} />
          </AppWindow>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

/* 0:42–0:57 Blueprint & project intake */
const CANDIDATES = [
  { k: "Stem thickness", v: "500 mm", src: "S-05 · Section A-A", bx: 168, by: 120, bw: 90, bh: 40 },
  { k: "Base width", v: "2400 mm", src: "S-05 · Section A-A", bx: 60, by: 420, bw: 360, bh: 40 },
  { k: "Wall height", v: "3.00 m", src: "S-05 · Section A-A", bx: 420, by: 150, bw: 90, bh: 220 },
  { k: "Concrete cover (note)", v: "75 mm", src: "S-05 · General notes", bx: 40, by: 30, bw: 260, bh: 34 },
];
const S4: React.FC = () => {
  const f = useCurrentFrame();
  const scan = fi(f, 40, 130);
  const fields = [
    ["Project name", PROJECT],
    ["Structure ID", INPUT.project.structureId],
    ["Location", PROJECT_LOC],
    ["Approved drawing revision", "AFD-001 · Revision 0"],
  ];
  const showCand = f > 205;
  const confirmClick = fi(f, 335, 355);
  return (
    <AbsoluteFill>
      <Grid />
      <AppWindow tab={0} f={f}>
        <Panel x={28} y={24} w={820} h={670} eyebrow="AI Blueprint Intake" title="Blueprint Ingestion & Code Compliance">
          <div style={{ display: "flex", gap: 12, alignItems: "center", opacity: fi(f, 10, 25), transform: `translateY(${(1 - fi(f, 10, 25)) * -30}px)` }}>
            <div style={{ padding: "8px 14px", borderRadius: 8, background: C.mist, fontFamily: MONO, fontSize: 18 }}>📄 S-05_FloodWall_AFD-001_R0.pdf</div>
            <div style={{ padding: "8px 14px", borderRadius: 8, background: C.mist, fontFamily: MONO, fontSize: 18 }}>📄 Calc_Stability_R0.pdf</div>
          </div>
          <div style={{ position: "relative", marginTop: 18, width: 770, height: 520, background: "#0F2A3A", borderRadius: 10, overflow: "hidden" }}>
            <svg width={770} height={520}>
              <g stroke="#7DD3FC" fill="none" strokeWidth={2}>
                <path d="M60 440H420V400H258V140H168V400H60Z" />
                <path d="M60 470H420M60 462v16M420 462v16" />
                <path d="M168 110H258M168 102v16M258 102v16" />
                <path d="M470 140V440M462 140h16M462 440h16" />
              </g>
              <g fontFamily={MONO} fontSize={16} fill="#BAE6FD">
                <text x={190} y={98}>500</text>
                <text x={210} y={495}>2400</text>
                <text x={480} y={295}>3000</text>
                <text x={40} y={52}>NOTE: CONCRETE COVER 75 mm U.N.O.</text>
                <text x={520} y={500}>SECTION A-A · S-05 · REV 0</text>
              </g>
              {showCand && CANDIDATES.map((c, i) => (
                <rect key={c.k} x={c.bx} y={c.by} width={c.bw} height={c.bh} fill="none" stroke={i === 0 && confirmClick >= 1 ? "#5EEAD4" : C.amber} strokeWidth={3} strokeDasharray={i === 0 && confirmClick >= 1 ? "0" : "8 6"} opacity={fi(f, 210 + i * 12, 225 + i * 12)} />
              ))}
            </svg>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: 4, background: "#67E8F9", boxShadow: "0 0 24px #67E8F9", transform: `translateX(${scan * 770}px)`, opacity: scan > 0 && scan < 1 ? 1 : 0 }} />
            {f > 40 && f < 140 && <div style={{ position: "absolute", left: 20, bottom: 16, color: "#BAE6FD", fontFamily: SANS, fontSize: 18 }}>AI analyzing structural plans...</div>}
          </div>
        </Panel>
        {!showCand || f < 200 ? (
          <Panel x={876} y={24} w={828} h={670} eyebrow="Plan & Design" title="Project and revision identity">
            {fields.map(([k, v], i) => (
              <div key={k} style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 16, color: C.muted, fontWeight: 600 }}>{k}</div>
                <div style={{ marginTop: 6, padding: "12px 14px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 22, fontFamily: i === 1 || i === 3 ? MONO : SANS, minHeight: 30 }}>{typed(v, f, 60 + i * 30, 45)}</div>
              </div>
            ))}
          </Panel>
        ) : (
          <Panel x={876} y={24} w={828} h={670} eyebrow="AI-assisted extraction" title="Extracted candidates" opacity={fi(f, 205, 220)}>
            <div style={{ marginBottom: 16 }}><Chip label="Candidate — Engineer confirmation required" color={C.amber} dashed /></div>
            {CANDIDATES.map((c, i) => {
              const ok = i === 0 && confirmClick >= 1;
              return (
                <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", marginBottom: 12, borderRadius: 10, border: `2px ${ok ? "solid" : "dashed"} ${ok ? C.tide : C.amber}`, opacity: fi(f, 215 + i * 15, 230 + i * 15) }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 21 }}>{c.k} <span style={{ fontFamily: MONO, color: C.tide }}>{c.v}</span></div>
                    <div style={{ fontSize: 15, color: C.muted, fontFamily: MONO }}>{c.src} · Rev 0</div>
                  </div>
                  {ok ? <Chip label="Accepted by engineer" color={C.tide} solid size={15} /> : <Chip label="Unreviewed" color={C.amber} size={15} />}
                  <div style={{ padding: "8px 14px", borderRadius: 8, background: i === 0 ? C.tide : C.mist, color: i === 0 ? C.white : C.muted, fontWeight: 700, fontSize: 15 }}>Confirm</div>
                </div>
              );
            })}
            <div style={{ marginTop: 10, fontSize: 17, color: C.muted }}>Candidates never enter calculations until an engineer accepts or corrects them.</div>
          </Panel>
        )}
        {showCand && <Cursor x={interpolate(f, [290, 335], [1400, 1620], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })} y={interpolate(f, [290, 335], [560, 205], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })} click={confirmClick > 0 && confirmClick < 1 ? confirmClick : 0} />}
      </AppWindow>
      <div style={{ position: "absolute", right: 110, top: 905, display: "flex", gap: 14, opacity: fi(f, 230, 245) }}>
        <Chip label="AI ASSISTS" color={C.tide} size={22} />
        <Chip label="ENGINEER CONFIRMATION REQUIRED" color={C.amber} size={22} />
      </div>
    </AbsoluteFill>
  );
};

/* 0:57–1:15 Inputs & load case */
const INPUT_ROWS: [string, string, string, number][] = [
  ["Required wall geometry", "Wall height", "m", INPUT.geometry.wallHeightM],
  ["", "Planned stem thickness", "m", INPUT.geometry.plannedStemThicknessM],
  ["", "Base width", "m", INPUT.geometry.baseWidthM],
  ["", "Base thickness", "m", INPUT.geometry.baseThicknessM],
  ["", "Toe width", "m", INPUT.geometry.toeWidthM],
  ["Materials and geotechnical basis", "Concrete unit weight", "kN/m³", INPUT.materials.concreteUnitWeightKNM3],
  ["", "Soil unit weight", "kN/m³", INPUT.materials.soilUnitWeightKNM3],
  ["", "Base friction coefficient", "", INPUT.materials.frictionCoefficient],
  ["Current hydraulic and load case", "Wet-side level", "m", INPUT.loadCase.wetSideLevelM],
  ["", "Dry-side level", "m", INPUT.loadCase.drySideLevelM],
  ["", "Uniform surcharge", "kPa", INPUT.loadCase.surchargeKPa],
  ["", "Drainage efficiency", "0-1", INPUT.loadCase.drainageEfficiency],
];
const S5: React.FC = () => {
  const f = useCurrentFrame();
  const water = interpolate(f, [230, 310], [0, INPUT.loadCase.wetSideLevelM], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <AbsoluteFill>
      <Grid />
      <AppWindow tab={1} f={f}>
        <Panel x={28} y={24} w={700} h={670} eyebrow="Approved baseline" title="Engineering inputs">
          {INPUT_ROWS.map(([grp, k, u, v], i) => {
            const a = fi(f, 15 + i * 15, 30 + i * 15);
            return (
              <div key={k} style={{ opacity: a }}>
                {grp && <div style={{ marginTop: i ? 10 : 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.1em", color: C.tide, textTransform: "uppercase" }}>{grp}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.mist}`, fontSize: 19 }}>
                  <span>{k}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700 }}>{fmt(v * a, v % 1 ? 2 : 1)} <span style={{ color: C.muted, fontWeight: 400 }}>{u}</span></span>
                </div>
              </div>
            );
          })}
        </Panel>
        <Panel x={756} y={24} w={948} h={470} eyebrow="Section model" title={INPUT.loadCase.name}>
          <WallSection x={250} y={410} scale={92} draw={fi(f, 20, 120)} stem={INPUT.geometry.plannedStemThicknessM} water={water} forces={[fi(f, 320, 340), fi(f, 350, 370), fi(f, 380, 400), fi(f, 410, 430)]} />
          <div style={{ position: "absolute", left: 30, top: 380, fontSize: 15, color: C.muted, fontWeight: 700 }}>Dry side</div>
        </Panel>
        <Panel x={756} y={510} w={948} h={184} eyebrow="Acceptance criteria" title="Project-specific limits" opacity={fi(f, 430, 450)}>
          <div style={{ display: "flex", gap: 40, fontSize: 21, alignItems: "center" }}>
            <div>Minimum sliding FS <b style={{ fontFamily: MONO }}>{fmt(INPUT.limits.minimumSlidingFs, 1)}</b></div>
            <div>Minimum overturning FS <b style={{ fontFamily: MONO }}>{fmt(INPUT.limits.minimumOverturningFs, 1)}</b></div>
            <div>No tension required</div>
          </div>
          <div style={{ marginTop: 16 }}><Chip label="Unapproved draft · locked" color={C.amber} size={16} /></div>
        </Panel>
      </AppWindow>
    </AbsoluteFill>
  );
};

/* 1:15–1:32 Transparent structural review */
const S6: React.FC = () => {
  const f = useCurrentFrame();
  const lines = [
    `Total weight            W  = ${fmt(V.totalWeightKNM)} kN/m`,
    `Uplift force            U  = ${fmt(V.upliftForceKNM)} kN/m`,
    `Effective vertical    V' = W − U = ${fmt(V.effectiveVerticalForceKNM)} kN/m`,
    `Net horizontal force    H  = ${fmt(V.netHorizontalForceKNM)} kN/m`,
    `FS_sliding = μ·V' / H = ${fmt(V.fsSliding)}  (min ${fmt(INPUT.limits.minimumSlidingFs)})`,
    `Resisting moment      M_R = ${fmt(V.resistingMomentKNMPerM)} kN·m/m`,
    `Overturning moment    M_O = ${fmt(V.overturningMomentKNMPerM)} kN·m/m`,
    `FS_overturning = M_R / M_O = ${fmt(V.fsOverturning)}`,
    `e = ${fmt(V.eccentricityM, 3)} m   q = (V'/B)(1 ± 6e/B)`,
    `q_toe = ${fmt(V.toePressureKPa)} kPa   q_heel = ${fmt(V.heelPressureKPa)} kPa`,
  ];
  const metrics: [string, string, string][] = [
    ["Sliding FS", fmt(V.fsSliding), `Required ${fmt(INPUT.limits.minimumSlidingFs)}`],
    ["Overturning FS", fmt(V.fsOverturning), `Required ${fmt(INPUT.limits.minimumOverturningFs)}`],
    ["Toe pressure", `${fmt(V.toePressureKPa, 1)} kPa`, ""],
    ["Heel pressure", `${fmt(V.heelPressureKPa, 1)} kPa`, ""],
    ["Uplift force", `${fmt(V.upliftForceKNM, 1)} kN/m`, ""],
    ["Net horizontal force", `${fmt(V.netHorizontalForceKNM, 1)} kN/m`, ""],
  ];
  const findings = CALC.findings.slice(0, 6);
  return (
    <AbsoluteFill>
      <Grid />
      <AppWindow tab={2} f={f}>
        <Panel x={28} y={24} w={860} h={670} eyebrow="Deterministic evaluation" title="Calculation trace" dark>
          {lines.map((l, i) => (
            <div key={i} style={{ fontFamily: MONO, fontSize: 19, lineHeight: 2.05, color: i === 4 || i === 7 ? "#67E8F9" : "#E2E8F0", whiteSpace: "pre" }}>
              {typed(l, f, 10 + i * 16, 90)}
            </div>
          ))}
        </Panel>
        <div style={{ position: "absolute", left: 912, top: 24, width: 792, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {metrics.map(([k, v, n], i) => (
            <div key={k} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, opacity: fi(f, 60 + i * 12, 75 + i * 12) }}>
              <div style={{ fontSize: 15, color: C.muted, fontWeight: 600 }}>{k}</div>
              <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 14, color: C.muted }}>{n || " "}</div>
            </div>
          ))}
        </div>
        <Panel x={912} y={300} w={792} h={394} eyebrow="Review findings" title="Findings">
          {findings.map((fd, i) => (
            <div key={fd.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.mist}`, opacity: fi(f, 230 + i * 18, 245 + i * 18) }}>
              <span style={{ fontSize: 19, fontWeight: 600 }}>{fd.title}</span>
              <Chip label={STATUS_LABEL[fd.status] ?? fd.status} color={STATUS_COLOR[fd.status] ?? C.muted} size={15} />
            </div>
          ))}
        </Panel>
      </AppWindow>
      <div style={{ position: "absolute", left: 110, top: 905, display: "flex", gap: 14, opacity: fi(f, 380, 395) }}>
        <Chip label="Passed" color={C.green} size={20} />
        <Chip label="Failed" color={C.red} size={20} />
        <Chip label="Review" color={C.amber} size={20} />
        <Chip label="Incomplete" color={C.violet} size={20} />
      </div>
      <Kinetic f={f} start={150} text="CALCULATIONS YOU CAN TRACE" size={34} x={0} width={1810} align="left" y={905} color={C.tide} />
    </AbsoluteFill>
  );
};

/* 1:32–1:52 Approved design vs as-built */
const S7: React.FC = () => {
  const f = useCurrentFrame();
  const checked = f > 470;
  const rows = [
    { c: "Stem thickness", seg: "Wall Segment A · P02", ap: "500 mm", m: "470 mm", u: "±5 mm", r: "≥ 490 mm", ev: "SR-014 · Survey", chk: true, st: "Outside tolerance", col: C.red },
    { c: "Base width", seg: "Wall Segment B · P05", ap: "2400 mm", m: "2395 mm", u: "±5 mm", r: "≥ 2380 mm", ev: "TS-03 · Total station", chk: checked, st: checked ? "Within tolerance" : "Awaiting check", col: checked ? C.green : C.amber },
    { c: "Concrete compressive strength", seg: "Wall Segment A", ap: "20.7 MPa", m: "22.4 MPa", u: "±0.3 MPa", r: "≥ 20.7 MPa", ev: "LAB-07 · Cylinder test", chk: true, st: "Within tolerance", col: C.green },
    { c: "Concrete cover", seg: "Wall Segment A · P01", ap: "75 mm", m: "78 mm", u: "±2 mm", r: "65–85 mm", ev: "INS-11 · Cover meter", chk: true, st: "Within tolerance", col: C.green },
  ];
  const cols = ["Characteristic", "Approved", "As built", "Uncertainty ±", "Accepted range", "Evidence reference", "Checker", "Result"];
  const widths = [330, 150, 150, 160, 170, 260, 130, 290];
  const band = fi(f, 110, 160);
  const panels = fi(f, 200, 300);
  const banner = fi(f, 280, 300);
  const click = fi(f, 455, 470);
  return (
    <AbsoluteFill>
      <Grid />
      <AppWindow tab={3} f={f}>
        <div style={{ position: "absolute", left: 28, top: 18 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.14em", fontWeight: 700, color: C.tide }}>FIELD VERIFICATION</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700 }}>Approved design versus as built</div>
          <div style={{ fontSize: 17, color: C.muted }}>Results use the adverse uncertainty bound and require checker-confirmed evidence.</div>
        </div>
        <div style={{ position: "absolute", right: 28, top: 26, display: "flex", gap: 10 }}>
          <Chip label="Approved baseline · AFD-001 · Revision 0" color={C.tide} size={15} />
          <Chip label="As-built working set · ASB-001 · Unsigned" color={C.muted} size={15} />
        </div>
        <div style={{ position: "absolute", left: 28, top: 128, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", background: C.ink, color: C.white, fontSize: 15, fontWeight: 700 }}>
            {cols.map((c, i) => (<div key={c} style={{ width: widths[i], padding: "12px 14px", opacity: fi(f, i * 6, i * 6 + 10) }}>{c}</div>))}
          </div>
          {rows.map((r, ri) => (
            <div key={r.c} style={{ display: "flex", alignItems: "center", fontSize: 18, borderTop: `1px solid ${C.line}`, background: ri === 0 && banner > 0 ? `${C.red}0D` : C.white, opacity: fi(f, 30 + ri * 15, 45 + ri * 15) }}>
              <div style={{ width: widths[0], padding: "12px 14px" }}><b>{r.c}</b><div style={{ fontSize: 14, color: C.muted }}>{r.seg}</div></div>
              <div style={{ width: widths[1], padding: 14, fontFamily: MONO }}>{r.ap}</div>
              <div style={{ width: widths[2], padding: 14, fontFamily: MONO, fontWeight: 700 }}>{r.m}</div>
              <div style={{ width: widths[3], padding: 14, fontFamily: MONO }}>{r.u}</div>
              <div style={{ width: widths[4], padding: 14, fontFamily: MONO }}>{r.r}</div>
              <div style={{ width: widths[5], padding: 14, fontFamily: MONO, fontSize: 15, color: C.tide }}>🔗 {r.ev}</div>
              <div style={{ width: widths[6], padding: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, border: `2px solid ${r.chk ? C.green : C.muted}`, background: r.chk ? C.green : C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {r.chk && <svg width={16} height={16}><path d="M2 8l4 4 8-9" stroke="#fff" strokeWidth={3} fill="none" /></svg>}
                </div>
              </div>
              <div style={{ width: widths[7], padding: 14 }}><Chip label={r.st} color={r.col} solid={ri === 0} size={15} /></div>
            </div>
          ))}
        </div>
        {/* uncertainty band */}
        <div style={{ position: "absolute", left: 28, top: 482, width: 820, height: 215, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, opacity: fi(f, 100, 115) }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.12em", color: C.tide }}>MEASURED WITH UNCERTAINTY · STEM THICKNESS</div>
          <svg width={780} height={120} style={{ marginTop: 6 }}>
            <line x1={20} y1={60} x2={760} y2={60} stroke={C.line} strokeWidth={2} />
            {[460, 470, 480, 490, 500, 510].map((v) => { const x = 20 + ((v - 455) / 60) * 740; return (<g key={v}><line x1={x} y1={54} x2={x} y2={66} stroke={C.muted} /><text x={x} y={90} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={C.muted}>{v}</text></g>); })}
            {(() => { const x = (v: number) => 20 + ((v - 455) / 60) * 740; return (<g>
              <rect x={x(470) - (x(475) - x(470)) * band} y={46} width={(x(475) - x(465)) * band} height={28} fill={C.red} opacity={0.3} />
              <circle cx={x(470)} cy={60} r={7} fill={C.red} />
              <line x1={x(490)} y1={20} x2={x(490)} y2={100} stroke={C.ink} strokeWidth={3} />
              <text x={x(490) + 6} y={22} fontFamily={MONO} fontSize={14} fill={C.ink}>min 490</text>
              <circle cx={x(500)} cy={60} r={6} fill={C.tide} />
              <text x={x(500)} y={38} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={C.tide}>approved 500</text>
            </g>); })()}
          </svg>
          <div style={{ fontSize: 17, color: C.red, opacity: band }}>Conservative minimum 465 is below 490 mm. Engineering disposition is required.</div>
        </div>
        {/* stations & panels */}
        <div style={{ position: "absolute", left: 870, top: 482, width: 834, height: 215, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, opacity: fi(f, 190, 205) }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.12em", color: C.tide }}>SEGMENTS · PANELS · STATIONS</div>
          <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => {
              const on = panels * 8 > i;
              const bad = i === 1;
              return (<div key={i} style={{ flex: 1, height: 70, borderRadius: 6, background: on ? (bad ? C.red : i === 4 && !checked ? C.amber : C.green) : C.mist, color: C.white, fontFamily: MONO, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{`P0${i + 1}`}</div>);
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: MONO, fontSize: 14, color: C.muted }}>
            {[0, 10, 20, 30, 40, 50, 60, 70, 80].map((s) => <span key={s}>0+{String(s).padStart(3, "0")}</span>)}
          </div>
          <div style={{ marginTop: 6, fontSize: 15, color: C.muted }}>Wall Segment A: P01–P04 · Wall Segment B: P05–P08 · <span style={{ color: C.red, fontWeight: 700 }}>P02 · STA 0+010–0+020</span></div>
        </div>
        {/* release banner */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 742 - 14, height: 0 }} />
        {f > 400 && <Cursor x={interpolate(f, [400, 455], [1500, 1243], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })} y={interpolate(f, [400, 455], [600, 280], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })} click={click > 0 && click < 1 ? click : 0} />}
      </AppWindow>
      <div style={{ position: "absolute", left: 80, top: 905, width: 1760, height: 76, borderRadius: 14, background: C.red, color: C.white, display: "flex", alignItems: "center", gap: 24, padding: "0 30px", opacity: banner, transform: `translateY(${(1 - banner) * 30}px)`, fontFamily: SANS }}>
        <svg width={34} height={34}><rect x={7} y={15} width={20} height={16} rx={3} fill="#fff" /><path d="M11 15v-4a6 6 0 0112 0v4" stroke="#fff" strokeWidth={3} fill="none" /></svg>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 32 }}>RELEASE BLOCKED. ENGINEERING DISPOSITION REQUIRED.</div>
        <div style={{ marginLeft: "auto", fontSize: 18 }}>As-built evidence blocks release · {checked ? "1 outside · 0 awaiting · 3 within" : "1 outside · 1 awaiting · 2 within"}</div>
      </div>
    </AbsoluteFill>
  );
};

/* 1:52–2:03 Traceability & responsible AI */
const S8: React.FC = () => {
  const f = useCurrentFrame();
  const nodes = ["Blueprint", "Extracted candidate", "Engineer confirmation", "Calculation", "Finding", "Evidence", "Approval"];
  const blocked = ["Superseded source", "Conflicting candidate", "Missing unit", "Unreviewed"];
  const nx = (i: number) => 120 + i * 270;
  return (
    <AbsoluteFill>
      <Grid />
      <Kinetic f={f} start={0} text="EVERY VALUE HAS A SOURCE" size={64} y={120} />
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        <line x1={nx(0)} y1={400} x2={nx(0) + (nx(6) - nx(0)) * fi(f, 10, 140)} y2={400} stroke={C.tide} strokeWidth={4} />
      </svg>
      {nodes.map((n, i) => (
        <div key={n} style={{ position: "absolute", left: nx(i) - 115, top: 345, width: 230, height: 110, borderRadius: 14, background: i === 2 || i === 6 ? C.ink : C.white, color: i === 2 || i === 6 ? C.white : C.ink, border: `2px solid ${C.tide}`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, padding: 10, opacity: fi(f, 10 + i * 18, 25 + i * 18), transform: `scale(${0.9 + 0.1 * fi(f, 10 + i * 18, 25 + i * 18)})` }}>{n}</div>
      ))}
      {/* barrier before Calculation */}
      <div style={{ position: "absolute", left: nx(3) - 150, top: 500, width: 8, height: 380, background: C.red, opacity: fi(f, 160, 175) }} />
      {blocked.map((b, i) => {
        const p = fi(f, 170 + i * 10, 215 + i * 10);
        return (
          <div key={b} style={{ position: "absolute", left: 160 + p * (nx(3) - 150 - 160 - 400), top: 520 + i * 90, width: 390, padding: "14px 18px", borderRadius: 10, border: `2px dashed ${C.red}`, background: C.white, fontFamily: SANS, fontWeight: 700, fontSize: 22, color: C.red, opacity: fi(f, 165 + i * 10, 175 + i * 10), display: "flex", gap: 10, alignItems: "center" }}>
            <StatusIcon color={C.red} label="blocked" /> {b.toUpperCase()}
          </div>
        );
      })}
      <Kinetic f={f} start={225} text="BLOCKED FROM CALCULATION" size={30} x={nx(3) - 120} width={600} align="left" y={560} color={C.red} />
      <Kinetic f={f} start={240} text="AI ASSISTS." size={72} x={nx(3) - 120} width={900} align="left" y={650} color={C.tide} />
      <Kinetic f={f} start={262} text="ENGINEERS DECIDE." size={72} x={nx(3) - 120} width={900} align="left" y={740} color={C.ink} />
    </AbsoluteFill>
  );
};

/* 2:03–2:15 CTA */
const S9: React.FC = () => {
  const f = useCurrentFrame();
  const end = fi(f, 170, 190);
  return (
    <AbsoluteFill>
      <Grid dark />
      <svg style={{ position: "absolute", left: 0, top: 0, opacity: 0.35 }} width={1920} height={1080}>
        <path d={`M0 900 H600 V720 H660 V900 H1920`} stroke="#5ED3DE" strokeWidth={3} fill="none" />
        <path d="M660 800 H1920" stroke={C.tide} strokeWidth={2} strokeDasharray="10 8" />
      </svg>
      <div style={{ position: "absolute", width: "100%", top: 130, display: "flex", flexDirection: "column", alignItems: "center", opacity: fi(f, 0, 25) }}>
        <LogoMark size={110} color="#5ED3DE" />
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 96, color: C.white, letterSpacing: "0.06em" }}>DAM RIGHT</div>
        <div style={{ height: 5, width: 460 * fi(f, 10, 50), background: C.tide }} />
      </div>
      <div style={{ opacity: 1 - end }}>
        <Kinetic f={f} start={30} text="From approved plan to built reality," size={52} y={480} color={C.white} weight={600} />
        <Kinetic f={f} start={60} text="make every engineering decision traceable." size={52} y={550} color="#5ED3DE" weight={600} />
      </div>
      <div style={{ opacity: end, position: "absolute", width: "100%", top: 450, textAlign: "center", fontFamily: DISPLAY, color: C.white }}>
        {["Verify the design.", "Check the build.", "Protect the public."].map((t, i) => (
          <div key={t} style={{ fontSize: 50, fontWeight: 700, opacity: fi(f, 175 + i * 12, 190 + i * 12) }}>{t}</div>
        ))}
        <div style={{ marginTop: 40, fontSize: 32, fontFamily: SANS, opacity: fi(f, 220, 235) }}>Pilot the engineering review platform.</div>
        <div style={{ marginTop: 16, fontSize: 30, fontFamily: MONO, color: "#5ED3DE", opacity: fi(f, 230, 245) }}>dam-right-olive.vercel.app</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Captions (voiceover script, burned-in) ---------- */
const CAPTIONS: [number, number, string][] = [
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
const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  // Delay subtitle appearance by +0.42s so the energetic voiceover plays slightly ahead of the on-screen subtitles
  const SUB_LAG = 0.42;
  const cur = CAPTIONS.find(([a, b]) => t >= a + SUB_LAG && t < b);
  if (!cur) return null;
  const startFrame = (cur[0] + SUB_LAG) * FPS;
  const endFrame = cur[1] * FPS;
  const a = fi(f, startFrame, startFrame + 6) * (1 - fi(f, endFrame - 6, endFrame));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ maxWidth: 1500, background: "rgba(20,32,43,0.82)", color: C.white, fontFamily: SANS, fontSize: 26, lineHeight: 1.35, padding: "8px 20px", borderRadius: 8, textAlign: "center" }}>{cur[2]}</div>
    </div>
  );
};

/* ---------- Timeline ---------- */
const SCENES: [number, number, React.FC][] = [
  [0, 12, S1],
  [12, 28, S2],
  [28, 42, S3],
  [42, 57, S4],
  [57, 75, S5],
  [75, 92, S6],
  [92, 112, S7],
  [112, 123, S8],
  [123, 135, S9],
];

export const DamRightDemo: React.FC = () => (
  <AbsoluteFill style={{ background: C.mist }}>
    <Audio src={staticFile("audio/master_mix.wav")} volume={1} />
    {SCENES.map(([a, b, Comp], i) => (
      <Sequence key={i} from={a * FPS} durationInFrames={(b - a) * FPS}>
        <Comp />
      </Sequence>
    ))}
    <Captions />
  </AbsoluteFill>
);

