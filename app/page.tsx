import HydrostaticPanic from "@/components/HydrostaticPanic";
import LogoMark from "@/components/LogoMark";
import Link from "next/link";

const capabilities = [
  {
    number: "01",
    title: "Understand the load",
    body: "Translate water depth into transparent hydrostatic force and overturning demand for a one-metre wall strip.",
  },
  {
    number: "02",
    title: "Compare intent to reality",
    body: "Keep planned and as-built dimensions visible together so deviations cannot disappear inside a spreadsheet.",
  },
  {
    number: "03",
    title: "Escalate the right finding",
    body: "Turn factors of safety into an immediate review state while preserving the assumptions behind every result.",
  },
];

export default function Home() {
  return (
    <main className="bg-[#06151d] text-white">
      <HydrostaticPanic />

      <section className="border-y border-cyan-200/20 bg-cyan-300 px-5 py-6 text-slate-950 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-950">
              Purpose-built scope
            </p>
            <p className="mt-2 max-w-4xl font-[var(--font-display)] text-xl font-bold leading-tight sm:text-2xl">
              For flood-control projects: verify whether the approved plan and
              documented as-built structure are within configured standards and
              project tolerances.
            </p>
          </div>
          <p className="max-w-md shrink-0 text-xs font-semibold leading-5 text-cyan-950/80 lg:text-right">
            Review support only. A passed calculation or within-tolerance
            result is not certification or professional approval.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/10 px-5 py-24 sm:px-10 lg:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-cyan-400/8 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-300">
            From environmental load to engineering judgment
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <h2 className="text-balance font-[var(--font-display)] text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              A clearer way to review flood-control structures.
            </h2>
            <p className="max-w-xl text-base leading-7 text-slate-300 lg:justify-self-end">
              Dam Right connects field conditions, structural dimensions, and
              deterministic checks in one focused workflow. It is designed to
              expose assumptions—not hide them behind a score.
            </p>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {capabilities.map((capability) => (
              <article
                key={capability.number}
                className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-sm"
              >
                <p className="text-xs font-bold tracking-[0.24em] text-cyan-300">
                  {capability.number}
                </p>
                <h3 className="mt-8 font-[var(--font-display)] text-2xl font-semibold">
                  {capability.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {capability.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#081b24] px-5 py-24 sm:px-10 lg:py-32">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-300">
              Verification workflow
            </p>
            <h2 className="mt-5 text-balance font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Deliberately simple. Technically explicit.
            </h2>
          </div>

          <ol className="space-y-5">
            {[
              [
                "Establish",
                "Identify the project, approved plan revision, structure segment, design basis, and applicable standards pack.",
              ],
              [
                "Verify",
                "Record as-built measurements with uncertainty, method, instrument, and traceable field evidence.",
              ],
              [
                "Evaluate",
                "Run deterministic water, soil, uplift, sliding, overturning, bearing, and base-contact checks.",
              ],
              [
                "Resolve",
                "Disposition nonconformances and preserve the calculation trace for qualified engineer review.",
              ],
            ].map(([title, body], index) => (
              <li
                key={title}
                className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/35 p-6 sm:grid-cols-[4rem_1fr] sm:p-8"
              >
                <span className="text-sm font-bold text-cyan-300">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="font-[var(--font-display)] text-2xl font-semibold">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-10 lg:py-36">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-cyan-200/20 bg-[radial-gradient(circle_at_80%_20%,rgba(34,211,238,.14),transparent_34%),linear-gradient(135deg,#0a2631,#07161e)] px-6 py-16 shadow-[0_30px_100px_rgba(0,0,0,.32)] sm:px-12 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-300">
              Theory is dry. Reality is drowning.
            </p>
            <h2 className="mt-5 text-balance font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Choose what you need to prove.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Deep structural review for the people doing the math, or a
              straight answer for the people who just want the water out of
              their sala.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <article className="group flex flex-col rounded-3xl border border-cyan-200/20 bg-[#061820]/75 p-6 transition hover:-translate-y-1 hover:border-cyan-200/45 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
                  For professionals
                </p>
                <span className="rounded-full border border-cyan-200/20 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-100">
                  Engineering track
                </span>
              </div>

              <h3 className="mt-8 font-[var(--font-display)] text-3xl font-semibold tracking-[-0.03em]">
                Assess Structural Integrity
              </h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">
                Review deep engineering metrics, factors of safety, as-built
                deviations, and blueprint evidence in the professional
                workspace.
              </p>

              <Link
                href="/workspace"
                className="mt-8 inline-flex min-h-12 items-center justify-between rounded-full bg-cyan-200 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-950 transition group-hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
              >
                Open professional workspace
                <span aria-hidden="true">→</span>
              </Link>
            </article>

            <article className="group flex flex-col rounded-3xl border border-emerald-200/20 bg-[#071d1d]/75 p-6 transition hover:-translate-y-1 hover:border-emerald-200/45 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">
                  For the public
                </p>
                <span className="rounded-full border border-emerald-200/20 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-100">
                  Citizen track
                </span>
              </div>

              <h3 className="mt-8 font-[var(--font-display)] text-3xl font-semibold tracking-[-0.03em]">
                Check Flood Control Effectiveness
              </h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">
                See whether the multi-million peso project actually lowered
                floodwater—or whether the barangay still needs a boat.
              </p>

              <Link
                href="/public-evaluation"
                className="mt-8 inline-flex min-h-12 items-center justify-between rounded-full bg-emerald-300 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-emerald-950 transition group-hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200"
              >
                Check the project
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-xs text-slate-500 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2.5">
            <LogoMark className="size-5 text-cyan-300" />
            <span>Dam Right · Flood control mitigation and evaluation</span>
          </p>
          <p>Prototype calculations · Not for certification</p>
        </div>
      </footer>
    </main>
  );
}
