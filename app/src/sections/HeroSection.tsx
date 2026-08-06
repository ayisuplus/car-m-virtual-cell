import { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowDown, ChevronDown, Microscope, Cpu, Dna, Zap, Activity } from 'lucide-react';

/* ── Animated stat counter (enhanced) ─────────────────────────── */
interface StatBadgeProps {
  value: string;
  label: string;
  color: string;
  numeric?: boolean;
  target?: number;
  suffix?: string;
  icon?: React.ReactNode;
}

function StatBadge({ value, label, color, numeric, target, suffix = '', icon }: StatBadgeProps) {
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
        const duration = 2000;

        const tick = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // easeOutExpo for more dramatic effect
          const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
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
      className="group relative flex flex-col items-center rounded-xl border border-slate-700/60 bg-[#0b1621]/90 px-4 py-3.5 backdrop-blur-sm transition-colors hover:border-cyan-400/30"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ 
          background: `radial-gradient(circle at center, ${color}10 0%, transparent 70%)`,
          boxShadow: `0 0 30px ${color}20`
        }} 
      />
      {icon && <div className="mb-2 relative z-10" style={{ color }}>{icon}</div>}
      <div className="relative z-10 font-mono text-xl font-bold" style={{ color }}>
        {display}
      </div>
      <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1 relative z-10 font-medium">
        {label}
      </div>
    </div>
  );
}

/* ── DNA Helix Background Component ───────────────────────────── */
function DNAHelix() {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 30; i++) {
      const t = (i / 30) * Math.PI * 4;
      pts.push({
        x: 50 + Math.sin(t) * 20,
        y: (i / 30) * 100,
        size: 3 + Math.sin(t + Math.PI) * 2,
        delay: i * 0.1,
      });
    }
    return pts;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Double helix strands */}
        <path
          d={`M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
          fill="none"
          stroke="url(#helix-gradient)"
          strokeWidth="0.3"
          className="animate-dna"
        />
        <path
          d={`M ${points.map(p => `${100 - p.x} ${p.y}`).join(' L ')}`}
          fill="none"
          stroke="url(#helix-gradient)"
          strokeWidth="0.3"
          className="animate-dna"
          style={{ animationDelay: '-10s' }}
        />
        {/* Connecting rungs */}
        {points.filter((_, i) => i % 3 === 0).map((p, i) => (
          <line
            key={i}
            x1={p.x}
            y1={p.y}
            x2={100 - p.x}
            y2={p.y}
            stroke="rgba(0, 204, 255, 0.15)"
            strokeWidth="0.2"
          />
        ))}
        <defs>
          <linearGradient id="helix-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00ccff" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#cc66ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00ff88" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ── Enhanced Particles ────────────────────────────────────────── */
function lcg(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const rand = lcg(20250705);
const particles = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  size: 2 + rand() * 6,
  x: rand() * 100,
  y: rand() * 100,
  duration: 15 + rand() * 30,
  delay: rand() * 15,
  color: ['#00ff88', '#00ccff', '#cc66ff', '#ff3366', '#ffcc00'][i % 5],
  type: i % 3 === 0 ? 'orbit' : 'float',
}));

function AssayPreview() {
  const cells = [
    { left: '13%', top: '22%', color: '#00ff88', size: 18 },
    { left: '28%', top: '62%', color: '#00ccff', size: 14 },
    { left: '46%', top: '31%', color: '#00ff88', size: 20 },
    { left: '67%', top: '19%', color: '#ffcc00', size: 11 },
    { left: '75%', top: '68%', color: '#00ff88', size: 17 },
    { left: '86%', top: '42%', color: '#00ccff', size: 13 },
  ];

  return (
    <div className="instrument-panel w-full overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Virtual assay 01</div>
          <div className="mt-1 text-sm font-semibold text-white">HER2+ Tumor Microenvironment</div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          Ready
        </div>
      </div>

      <div className="assay-grid relative h-[440px] overflow-hidden bg-[#050b12]">
        <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400/20 bg-purple-500/5 shadow-[0_0_70px_rgba(168,85,247,0.14)]" />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-300/40 bg-purple-500/20 shadow-[0_0_35px_rgba(192,132,252,0.35)]">
          <div className="absolute inset-5 rounded-full border border-purple-200/30 bg-purple-300/10" />
        </div>
        {cells.map((cell, index) => (
          <div
            key={index}
            className="absolute rounded-full border border-white/20"
            style={{
              left: cell.left,
              top: cell.top,
              width: cell.size,
              height: cell.size,
              backgroundColor: `${cell.color}55`,
              boxShadow: `0 0 16px ${cell.color}99`,
            }}
          />
        ))}
        <div className="absolute left-5 top-5 rounded-md border border-slate-700/70 bg-[#081019]/80 px-3 py-2 font-mono text-[10px] text-slate-400">
          55 cells · t=0.0 min
        </div>
        <div className="absolute bottom-5 right-5 flex gap-2">
          <span className="rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1 text-[10px] text-cyan-300">CYTOKINES ON</span>
          <span className="rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[10px] text-slate-400">ECM OFF</span>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-700/60 border-t border-slate-700/60 bg-[#0a141f]">
        {[
          ['12', 'CAR-M cells', '#00ff88'],
          ['25', 'Tumor cells', '#cc66ff'],
          ['50%', 'O₂ level', '#00ccff'],
        ].map(([value, label, color]) => (
          <div key={label} className="px-5 py-4">
            <div className="font-mono text-xl font-bold" style={{ color }}>{value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Hero Section (Enhanced) ──────────────────────────────────── */
export default function HeroSection() {
  const [scrollIndicatorVisible, setScrollIndicatorVisible] = useState(true);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const scrollToSim = () => {
    document.getElementById('simulation')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Parallax mouse effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
    <section className="hero-section relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-10 py-20">
      {/* Layer 1: Base hero image with parallax */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.18] transition-transform duration-1000"
        style={{ 
          backgroundImage: 'url(/images/hero-bg.jpg)',
          transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px) scale(1.1)`
        }}
      />

      {/* Layer 2: Animated gradient mesh (more vibrant) */}
      <div className="absolute inset-0 animate-gradient-mesh opacity-30" />

      {/* Layer 3: DNA Helix background */}
      <DNAHelix />

      {/* Layer 4: Animated grid pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 204, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 204, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gradient-mesh 30s linear infinite'
        }}
      />

      {/* Layer 5: Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a]/60 via-[#0a0f1a]/30 to-[#0a0f1a]/90" />

      {/* Layer 6: Radial glow behind content */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(0, 204, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />

      {/* Floating particles (enhanced) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className={`absolute rounded-full ${p.type === 'orbit' ? 'animate-orbit' : 'animate-float'}`}
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              backgroundColor: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              opacity: 0.2 + (rand() * 0.3),
            }}
          />
        ))}
      </div>

      {/* Content with parallax */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1320px] flex-col gap-12">
        <div className="flex w-full flex-col">
        {/* Badge with pulse effect */}
        <div className="mb-7 inline-flex self-start items-center gap-2 rounded-full border border-cyan-400/30 bg-[#0a1722]/90 px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
          <span className="text-xs text-cyan-400 font-semibold tracking-widest uppercase">
            AI Virtual Cell Platform
          </span>
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
        </div>

        {/* Main title — enhanced with glitch effect */}
        <h1 className="mb-7 overflow-visible py-2 text-7xl font-black leading-[1.15] tracking-[-0.025em] xl:text-8xl">
          <span className="block text-white">CAR-M</span>
          <span className="mt-1 block overflow-visible bg-gradient-to-r from-cyan-300 via-cyan-400 to-emerald-300 bg-clip-text pb-[0.2em] leading-[1.2] text-transparent">
            Simulation Engine
          </span>
        </h1>

        {/* Subtitle with typing effect feel */}
        <p className="mb-8 max-w-4xl text-lg font-light leading-relaxed text-slate-300 xl:text-xl">
          A mechanism-informed <span className="text-cyan-400 font-medium">agent-based modeling</span> platform for exploring
          <br className="hidden md:block" />
          CAR-engineered macrophage behavior in the{' '}
          <span className="text-purple-400 font-medium">tumor microenvironment</span>
        </p>

        {/* Key statistics — enhanced cards */}
        <div className="order-5 grid grid-cols-4 gap-3">
          <StatBadge value="4" label="Cell Types" color="#00ff88" numeric target={4} icon={<Microscope className="w-5 h-5" />} />
          <StatBadge value="9" label="TME Factors" color="#00ccff" numeric target={9} icon={<Activity className="w-5 h-5" />} />
          <StatBadge value="≈8×" label="Surrogate Speedup" color="#ffcc00" icon={<Zap className="w-5 h-5" />} />
          <StatBadge value="100%" label="Seeded Reproducibility" color="#ff3366" icon={<Cpu className="w-5 h-5" />} />
        </div>
        <p className="mt-4 text-[11px] text-slate-500 max-w-xl mx-auto">
          Speedup: surrogate vs RK4 ODE per-call latency, measured by scripts/benchmark-surrogate.mjs
          (hardware-dependent; ~8× in the paper benchmark). See the Neural Surrogate panel for live
          micro-benchmarks.
        </p>

        {/* Feature pills — enhanced */}
        <div className="order-6 mt-5 flex flex-wrap gap-3">
          {[
            { icon: <Dna className="w-4 h-4" />, label: 'Multi-scale ABM', color: '#00ff88' },
            { icon: <Cpu className="w-4 h-4" />, label: 'Neural Surrogate', color: '#00ccff' },
            { icon: <Microscope className="w-4 h-4" />, label: 'TME Dynamics', color: '#cc66ff' },
          ].map((pill, i) => (
            <div 
              key={i}
              className="flex cursor-default items-center gap-2.5 rounded-lg border px-4 py-2 backdrop-blur-sm"
              style={{ 
                borderColor: `${pill.color}30`,
                backgroundColor: `${pill.color}08`,
                color: pill.color
              }}
            >
              {pill.icon}
              <span className="text-sm font-medium">{pill.label}</span>
            </div>
          ))}
        </div>

        {/* CTA — enhanced with animated gradient */}
        <button
          onClick={scrollToSim}
          className="group relative order-4 mb-7 inline-flex w-fit items-center gap-3 overflow-hidden rounded-lg border border-cyan-200 bg-cyan-300 px-8 py-3.5 text-[#061019] shadow-[0_14px_45px_rgba(34,211,238,0.16)] transition-colors hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-sm font-semibold relative z-10">Launch Simulation</span>
          <ArrowDown className="w-4 h-4 relative z-10 group-hover:translate-y-1 transition-transform duration-300" />
        </button>
        </div>
        <AssayPreview />
      </div>

      {/* Scroll-down indicator — enhanced */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-500"
        style={{ opacity: scrollIndicatorVisible ? 1 : 0 }}
      >
        <span className="text-[10px] text-cyan-400/60 uppercase tracking-widest">Scroll to explore</span>
        <ChevronDown className="w-5 h-5 text-cyan-400/50 animate-bounce" />
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0f1a] to-transparent" />
    </section>
  );
}
