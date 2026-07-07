import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ChevronDown, Microscope, Cpu, Dna } from 'lucide-react';

/* ── Animated stat counter ──────────────────────────────────────── */
interface StatBadgeProps {
  value: string;
  label: string;
  color: string;
  numeric?: boolean;
  target?: number;
  suffix?: string;
}

function StatBadge({ value, label, color, numeric, target, suffix = '' }: StatBadgeProps) {
  const [display, setDisplay] = useState(numeric ? '0' : value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!numeric || !target) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const duration = 1500;

        const tick = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);
          setDisplay(`${current}${suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [numeric, target, suffix]);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm"
    >
      <div className="text-xl font-bold font-mono" style={{ color }}>{display}</div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

/* ── Deterministic particles (subtler) ──────────────────────────── */
function lcg(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const rand = lcg(20250705);
const particles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  size: 2 + rand() * 4,
  x: rand() * 100,
  y: rand() * 100,
  duration: 18 + rand() * 25,
  delay: rand() * 12,
  color: ['#00ff88', '#00ccff', '#cc66ff', '#ff3366', '#ffcc00'][i % 5],
}));

/* ── Hero Section ───────────────────────────────────────────────── */
export default function HeroSection() {
  const [scrollIndicatorVisible, setScrollIndicatorVisible] = useState(true);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  const scrollToSim = () => {
    document.getElementById('simulation')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fade out scroll indicator when hero leaves viewport
  useEffect(() => {
    const heroEl = document.querySelector('section.hero-section');
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrollIndicatorVisible(entry.isIntersecting && entry.intersectionRatio > 0.15);
      },
      { threshold: [0.15, 0] }
    );

    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Layer 1: Base hero image at low opacity */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.30]"
        style={{ backgroundImage: 'url(/images/hero-bg.jpg)' }}
      />

      {/* Layer 2: Animated gradient mesh */}
      <div className="absolute inset-0 animate-gradient-mesh opacity-60" />

      {/* Layer 3: Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a]/70 via-[#0a0f1a]/40 to-[#0a0f1a]/90" />

      {/* Floating particles (subtler) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full animate-float opacity-[0.12]"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              backgroundColor: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/5 mb-6">
          <Microscope className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs text-cyan-400 font-medium tracking-wide uppercase">
            AI Virtual Cell Platform
          </span>
        </div>

        {/* Main title — typewriter + fade-in */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="inline-block text-white typewriter-carm">
            CAR-M
          </span>
          <br />
          <span className="inline-block bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent title-sub fade-in-subtitle">
            Simulation Engine
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
          A mechanism-informed <span className="text-cyan-400">agent-based modeling</span> platform for exploring
          CAR-engineered macrophage behavior in the tumor microenvironment — designed for hypothesis generation
          and therapy design education.
        </p>

        {/* Key statistics — animated counters */}
        <div className="flex flex-wrap justify-center gap-6 mt-8">
          <StatBadge value="4" label="Cell Types" color="#00ff88" numeric target={4} />
          <StatBadge value="9" label="Cytokine Factors" color="#00ccff" numeric target={9} />
          <StatBadge value="Seeded" label="Reproducible Runs" color="#ffcc00" />
          <StatBadge value="CT-0508" label="Clinical Context" color="#ff3366" />
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-12 mb-12">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <Dna className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-300">Multi-scale ABM</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-slate-300">Neural Surrogate</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <Microscope className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-300">TME Dynamics</span>
          </div>
        </div>

        {/* CTA — pulsing glow */}
        <button
          onClick={scrollToSim}
          className="group inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-cyan-500/10 border border-cyan-400/40 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-all duration-300 animate-cta-glow hover:scale-105"
        >
          <span className="text-sm font-medium">Launch Simulation</span>
          <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* Scroll-down indicator — fades out on scroll */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce transition-opacity duration-500"
        style={{ opacity: scrollIndicatorVisible ? 1 : 0 }}
      >
        <ChevronDown className="w-6 h-6 text-cyan-400/50" />
      </div>
    </section>
  );
}
