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
      className="group relative flex flex-col items-center px-6 py-4 rounded-xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm hover:border-cyan-400/30 transition-all duration-300 hover-lift"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ 
          background: `radial-gradient(circle at center, ${color}10 0%, transparent 70%)`,
          boxShadow: `0 0 30px ${color}20`
        }} 
      />
      {icon && <div className="mb-2 relative z-10" style={{ color }}>{icon}</div>}
      <div className="text-2xl font-bold font-mono relative z-10 group-hover:neon-text transition-all duration-300" style={{ color }}>
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
    <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Layer 1: Base hero image with parallax */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.30] transition-transform duration-1000"
        style={{ 
          backgroundImage: 'url(/images/hero-bg.jpg)',
          transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px) scale(1.1)`
        }}
      />

      {/* Layer 2: Animated gradient mesh (more vibrant) */}
      <div className="absolute inset-0 animate-gradient-mesh opacity-70" />

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
      <div 
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        style={{ transform: `translate(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px)` }}
      >
        {/* Badge with pulse effect */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 mb-8 animate-shimmer">
          <div className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
          <span className="text-xs text-cyan-400 font-semibold tracking-widest uppercase">
            AI Virtual Cell Platform
          </span>
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
        </div>

        {/* Main title — enhanced with glitch effect */}
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-8 leading-[0.9]">
          <span className="inline-block text-white typewriter-carm glitch-text" data-text="CAR-M">
            CAR-M
          </span>
          <br />
          <span className="inline-block bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent title-sub fade-in-subtitle bg-[length:200%_auto] animate-[gradient-rotate_6s_linear_infinite]">
            Simulation Engine
          </span>
        </h1>

        {/* Subtitle with typing effect feel */}
        <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed font-light">
          A mechanism-informed <span className="text-cyan-400 font-medium">agent-based modeling</span> platform for exploring
          <br className="hidden md:block" />
          CAR-engineered macrophage behavior in the{' '}
          <span className="text-purple-400 font-medium">tumor microenvironment</span>
        </p>

        {/* Key statistics — enhanced cards */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-10">
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
        <div className="flex flex-wrap justify-center gap-4 mt-14 mb-14">
          {[
            { icon: <Dna className="w-4 h-4" />, label: 'Multi-scale ABM', color: '#00ff88' },
            { icon: <Cpu className="w-4 h-4" />, label: 'Neural Surrogate', color: '#00ccff' },
            { icon: <Microscope className="w-4 h-4" />, label: 'TME Dynamics', color: '#cc66ff' },
          ].map((pill, i) => (
            <div 
              key={i}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border backdrop-blur-sm hover-lift cursor-default"
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
          className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/50 text-cyan-400 hover:from-cyan-500/30 hover:to-purple-500/30 hover:border-cyan-400/70 transition-all duration-500 animate-cta-glow hover:scale-105 magnetic-hover overflow-hidden"
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 animate-[gradient-rotate_3s_linear_infinite] bg-[length:200%_100%]" />
          <span className="text-sm font-semibold relative z-10">Launch Simulation</span>
          <ArrowDown className="w-4 h-4 relative z-10 group-hover:translate-y-1 transition-transform duration-300" />
        </button>
      </div>

      {/* Scroll-down indicator — enhanced */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500"
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
