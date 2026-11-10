"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import HydraulicScene3D from "./HydraulicScene3D";
import LogoMark from "./LogoMark";

function NarrativeCard({
  children,
  eyebrow,
  opacity,
  y,
}: {
  children: React.ReactNode;
  eyebrow: string;
  opacity: ReturnType<typeof useTransform<number, number>>;
  y: ReturnType<typeof useTransform<number, number>>;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-4 bottom-[10%] z-50 mx-auto max-w-3xl text-center sm:inset-x-8 sm:bottom-[9%]"
      style={{ opacity, y }}
    >
      <div className="rounded-2xl border border-white/10 bg-[#03121c]/78 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,.42)] backdrop-blur-xl sm:rounded-3xl sm:px-9 sm:py-7">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200 sm:mb-4 sm:text-xs sm:tracking-[0.32em]">
          {eyebrow}
        </p>
        <p className="text-balance font-[var(--font-display)] text-[clamp(1.75rem,6vw,3.75rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.9)]">
          {children}
        </p>
      </div>
    </motion.div>
  );
}

export default function HydrostaticPanic() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const sky = useTransform(
    scrollYProgress,
    [0, 0.45, 0.78, 1],
    [
      "linear-gradient(155deg, #071a28 0%, #0b3042 48%, #102331 100%)",
      "linear-gradient(155deg, #0b1720 0%, #1b2a31 44%, #0d1a22 100%)",
      "linear-gradient(155deg, #111316 0%, #303238 46%, #101216 100%)",
      "linear-gradient(155deg, #190e11 0%, #372126 46%, #120b0d 100%)",
    ],
  );
  const pressureFill = useTransform(scrollYProgress, [0, 1], ["6%", "100%"]);
  const needleRotate = useTransform(scrollYProgress, [0, 0.74, 0.82, 0.9, 1], [-128, 35, 18, 50, 132]);
  const criticalTint = useTransform(scrollYProgress, [0.76, 1], [0, 0.42]);
  const stormOpacity = useTransform(scrollYProgress, [0.18, 0.82], [0, 0.8]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.11, 0.18], [1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.18], [0, -30]);

  const copyOneOpacity = useTransform(scrollYProgress, [0.16, 0.22, 0.35, 0.42], [0, 1, 1, 0]);
  const copyOneY = useTransform(scrollYProgress, [0.16, 0.22, 0.4], [20, 0, -16]);
  const copyTwoOpacity = useTransform(scrollYProgress, [0.46, 0.52, 0.65, 0.72], [0, 1, 1, 0]);
  const copyTwoY = useTransform(scrollYProgress, [0.46, 0.52, 0.7], [20, 0, -16]);
  const copyThreeOpacity = useTransform(scrollYProgress, [0.76, 0.82, 0.98, 1], [0, 1, 1, 1]);
  const copyThreeY = useTransform(scrollYProgress, [0.76, 0.82], [20, 0]);

  return (
    <section id="top" ref={sectionRef} className="relative h-[300vh] bg-[#071a28]" aria-label="Dam Right flood-control simulation">
      <motion.div
        className="sticky top-0 h-[100svh] min-h-[620px] overflow-hidden text-white"
        style={{ background: sky }}
      >
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 z-[1] opacity-0"
          style={{ opacity: stormOpacity }}
        >
          <div className="absolute -left-[12%] top-[4%] h-44 w-[74%] rounded-full bg-slate-200/10 blur-3xl" />
          <div className="absolute right-[2%] top-[14%] h-56 w-[62%] rounded-full bg-slate-300/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,rgba(255,255,255,0.1),transparent_42%)]" />
        </motion.div>

        <div className="absolute inset-0 z-[2] opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute inset-0 z-[3] bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,.5)_100%)]" />

        <HydraulicScene3D progress={scrollYProgress} reduceMotion={Boolean(reduceMotion)} />

        <header className="absolute inset-x-0 top-0 z-[70] flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
          <a href="#top" className="group flex items-center gap-3" aria-label="Dam Right home">
            <span className="grid size-10 place-items-center rounded-xl border border-cyan-200/40 bg-[#14202B]/90 text-[#5ED3DE] shadow-[0_0_20px_rgba(94,211,222,0.25)] backdrop-blur-md transition group-hover:border-cyan-300">
              <LogoMark className="size-7" color="#5ED3DE" />
            </span>
            <span className="font-[var(--font-display)] text-base font-bold uppercase tracking-[0.2em] text-white">Dam Right</span>
          </a>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/workspace"
              className="rounded-full border border-cyan-300/40 bg-cyan-950/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-200 backdrop-blur-md transition hover:border-cyan-200 hover:bg-cyan-900/80 hover:text-white"
            >
              Workspace
            </Link>
            <Link
              href="/public-evaluation"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
            >
              Public Tracker
            </Link>
          </nav>
        </header>

        <motion.div
          className="absolute inset-x-5 top-[11%] z-40 mx-auto text-center sm:top-[12%] lg:left-[15%] lg:right-[19%]"
          style={{ opacity: titleOpacity, y: titleY }}
        >
          {/* Prominent glowing brand emblem above title */}
          <div className="mb-4 flex justify-center sm:mb-5">
            <div className="flex size-20 items-center justify-center rounded-2xl border border-cyan-300/40 bg-[#14202B]/90 p-3.5 text-[#5ED3DE] shadow-[0_0_40px_rgba(94,211,222,0.35)] backdrop-blur-xl sm:size-24 sm:p-4">
              <LogoMark className="size-14 sm:size-16" color="#5ED3DE" />
            </div>
          </div>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300 sm:mb-5 sm:text-xs sm:tracking-[0.32em]">
            Flood mitigation evaluation system
          </p>
          <h1
            className="relative isolate mx-auto w-fit text-balance font-[var(--font-display)] text-[clamp(4rem,10vw,8.75rem)] font-medium leading-[0.88] tracking-[-0.07em]"
            aria-label="Dam Right!"
          >
            <span aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 h-[0.7em] w-[115%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/12 blur-3xl" />
            <span className="block text-white drop-shadow-[0_14px_32px_rgba(0,0,0,.7)] sm:inline">
              Dam
            </span>
            <span className="relative block text-cyan-200 drop-shadow-[0_14px_32px_rgba(0,0,0,.7)] sm:ml-[0.12em] sm:inline">
              Right!
              <span aria-hidden="true" className="absolute -bottom-[0.06em] left-[0.08em] h-[0.025em] w-[78%] bg-gradient-to-r from-transparent via-cyan-200/90 to-transparent shadow-[0_0_18px_rgba(103,232,249,.85)]" />
            </span>
          </h1>
        </motion.div>

        <aside className="absolute left-4 top-[48%] z-40 sm:left-10 sm:top-[41%] lg:top-[39%]" aria-label="Hydrostatic pressure gauge">
          <div className="relative grid size-28 place-items-center rounded-full border border-white/15 bg-[#07131c]/70 shadow-[0_18px_60px_rgba(0,0,0,.4)] backdrop-blur-md sm:size-40">
            <div className="absolute inset-2 rounded-full border border-white/10 sm:inset-3" />
            {[0, 1, 2, 3, 4, 5].map((tick) => (
              <span
                key={tick}
                className="absolute left-1/2 top-2 h-2 w-px origin-[50%_48px] bg-white/40 sm:top-3 sm:h-3 sm:origin-[50%_68px]"
                style={{ transform: `translateX(-50%) rotate(${-65 + tick * 26}deg)` }}
              />
            ))}
            <motion.div
              className="absolute left-1/2 top-1/2 h-px w-[35%] origin-left bg-gradient-to-r from-red-300 to-red-500 shadow-[0_0_9px_rgba(248,113,113,.95)]"
              style={{ rotate: needleRotate }}
            />
            <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-100 shadow-[0_0_0_4px_rgba(255,255,255,.1)]" />
            <div className="absolute bottom-[18%] text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pressure</p>
              <p className="mt-0.5 font-[var(--font-display)] text-xs font-bold text-white sm:text-sm">Hydrostatic</p>
            </div>
          </div>
          <div className="mx-auto mt-3 h-1 w-20 overflow-hidden rounded-full bg-white/10 sm:w-28">
            <motion.div className="h-full origin-left bg-gradient-to-r from-cyan-400 via-amber-300 to-red-500" style={{ width: pressureFill }} />
          </div>
          <p className="mt-2 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">0 — critical</p>
        </aside>

        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 bg-red-700 mix-blend-multiply" style={{ opacity: criticalTint }} />

        <NarrativeCard eyebrow="Design specification · 00.5 m" opacity={copyOneOpacity} y={copyOneY}>
          The blueprint said <span className="text-cyan-200">0.5 meters</span> thick...
        </NarrativeCard>
        <NarrativeCard eyebrow="Site verification · deviation detected" opacity={copyTwoOpacity} y={copyTwoY}>
          The contractor poured <span className="text-amber-300">0.4 meters</span>...
        </NarrativeCard>
        <NarrativeCard eyebrow="Failure threshold · imminent" opacity={copyThreeOpacity} y={copyThreeY}>
          Because <span className="text-red-300">&ldquo;bahala na&rdquo;</span> is not a valid Factor of Safety.
        </NarrativeCard>

        <motion.div
          className="absolute bottom-5 left-1/2 z-50 -translate-x-1/2 text-center sm:bottom-6"
          style={{ opacity: titleOpacity }}
          aria-hidden="true"
        >
          <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-300 sm:tracking-[0.28em]">Scroll to apply pressure</span>
          <span className="mx-auto mt-3 block h-10 w-px bg-gradient-to-b from-cyan-300 to-transparent" />
        </motion.div>

        <div className="absolute bottom-5 right-5 z-50 hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block sm:right-10">
          Simulation · illustrative only
        </div>
      </motion.div>
    </section>
  );
}
