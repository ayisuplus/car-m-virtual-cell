import { ArrowDownRight, Atom, Braces, Check, FlaskConical, Play, ShieldCheck } from 'lucide-react';

const MODEL_LAYERS = [
  { label: 'Cell agents', detail: 'CAR-M · Tumor · CD8+', color: '#5eead4' },
  { label: 'TME fields', detail: '9 coupled factors', color: '#67e8f9' },
  { label: 'Surrogate', detail: 'Seeded inference', color: '#c4b5fd' },
];

export default function HeroSection() {
  return (
    <section className="hero-section relative isolate min-h-[calc(100vh-72px)] overflow-hidden border-b border-white/[0.04]">
      <div className="absolute inset-0 -z-30 bg-[#071019]" />
      <div className="absolute inset-0 -z-20 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-[0.17] mix-blend-screen" />
      <div className="hero-grid absolute inset-0 -z-10 opacity-40" />
      <div className="absolute -left-40 top-12 -z-10 h-[520px] w-[520px] rounded-full bg-cyan-400/[0.08] blur-[120px]" />
      <div className="absolute -right-40 bottom-0 -z-10 h-[560px] w-[560px] rounded-full bg-violet-500/[0.08] blur-[130px]" />

      <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1500px] items-center gap-16 px-6 py-16 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Mechanistic virtual-cell platform
          </div>

          <h1 className="max-w-4xl text-[clamp(3.5rem,7vw,7.4rem)] font-semibold leading-[0.88] tracking-[-0.065em] text-white">
            Design CAR-M.
            <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-teal-300 to-violet-300 bg-clip-text text-transparent">Explore the TME.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-base leading-7 text-slate-300/80 md:text-lg md:leading-8">
            A mechanism-informed research workbench for testing how engineered macrophages behave inside a dynamic tumor microenvironment—before moving hypotheses to the wet lab.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#simulation" className="hero-primary group">
              <Play className="h-4 w-4 fill-current" />
              Launch simulation
              <ArrowDownRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
            </a>
            <a href="#science" className="hero-secondary">
              <FlaskConical className="h-4 w-4" />
              Review the model
            </a>
          </div>

          <div className="mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 border-t border-white/[0.08] pt-7 sm:grid-cols-4">
            <Metric value="4" label="cell populations" />
            <Metric value="9" label="diffusion fields" />
            <Metric value="2D / 3D" label="spatial views" />
            <Metric value="Seeded" label="reproducibility" />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px] lg:mx-0 lg:justify-self-end">
          <div className="absolute -inset-12 -z-10 rounded-full bg-cyan-300/[0.06] blur-3xl" />
          <div className="instrument-panel overflow-hidden rounded-[28px]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><Atom className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-semibold text-white">Virtual TME model</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">Experiment 01 · Baseline</p>
                </div>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-emerald-300/[0.08] px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Ready
              </span>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr] md:p-5">
              <div className="relative min-h-[330px] overflow-hidden rounded-2xl border border-white/[0.07] bg-[#050b12]">
                <div className="absolute inset-0 bg-[url('/images/tme-ecosystem.png')] bg-contain bg-center bg-no-repeat opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050b12] via-transparent to-cyan-200/[0.03]" />
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-[#071019]/80 px-3 py-2 text-[10px] text-slate-400 backdrop-blur">
                  <Braces className="h-3.5 w-3.5 text-cyan-300" /> Agent-based spatial field
                </div>
                <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">
                  <MiniReading label="Tumor" value="−18.4%" tone="text-rose-300" />
                  <MiniReading label="CAR-M" value="+12.7%" tone="text-emerald-300" />
                  <MiniReading label="Step" value="0240" tone="text-cyan-200" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Model layers</p>
                  <div className="space-y-4">
                    {MODEL_LAYERS.map((layer) => (
                      <div key={layer.label} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: layer.color, boxShadow: `0 0 12px ${layer.color}` }} />
                        <div>
                          <p className="text-xs font-medium text-slate-200">{layer.label}</p>
                          <p className="mt-1 text-[10px] text-slate-500">{layer.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="mb-3 flex items-center justify-between text-[10px] text-slate-500"><span>Run confidence</span><span className="text-slate-300">High</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full w-[86%] rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" /></div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-200"><ShieldCheck className="h-3.5 w-3.5" /> Deterministic seed locked</div>
                </div>

                <div className="mt-auto flex items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-3 text-[10px] text-cyan-100/80">
                  <Check className="h-3.5 w-3.5" /> Runs locally in your browser
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
    </div>
  );
}

function MiniReading({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#071019]/85 px-3 py-2.5 backdrop-blur">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-xs font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
