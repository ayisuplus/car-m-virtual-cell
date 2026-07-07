import { useState } from 'react';

const COLORS = {
  green: '#00ff88',
  cyan: '#00ccff',
  purple: '#cc66ff',
  rose: '#ff3366',
  yellow: '#ffcc00',
  orange: '#ff8800',
};

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
}

const normalModules: ModuleInfo[] = [
  {
    id: 'normal-extracellular',
    name: 'Extracellular Domain',
    description: 'Native receptor ectodomain. Binds cytokines or pathogen-associated molecular patterns to initiate innate immune signaling.',
  },
  {
    id: 'normal-membrane',
    name: 'Cell Membrane',
    description: 'Phospholipid bilayer of the macrophage. Transmembrane helices anchor the receptor and facilitate signal transduction.',
  },
  {
    id: 'normal-intracellular',
    name: 'Intracellular Domain',
    description: 'Contains ITAM/ITIM motifs that recruit kinases (Syk, ZAP70) upon ligand binding, triggering downstream signaling.',
  },
];

const carModules: ModuleInfo[] = [
  {
    id: 'car-scFv',
    name: 'scFv Domain',
    description: 'Single-chain variable fragment. Targets specific tumor antigens (e.g. HER2). Engineered from monoclonal antibodies for precise tumor recognition.',
  },
  {
    id: 'car-hinge',
    name: 'Hinge Region',
    description: 'Flexible linker connecting scFv to transmembrane domain. Provides spatial freedom for antigen binding and optimal receptor clustering.',
  },
  {
    id: 'car-transmembrane',
    name: 'Transmembrane Domain',
    description: 'Anchors the CAR in the macrophage membrane. Often derived from CD8α for optimal surface expression and stability.',
  },
  {
    id: 'car-cd3z',
    name: 'CD3ζ Signaling Domain',
    description: 'Contains 3 ITAM motifs. Activates Syk kinase cascade upon scFv engagement, driving phagocytosis, cytokine release, and metabolic reprogramming.',
  },
  {
    id: 'car-fcrg',
    name: 'FcRγ Domain',
    description: 'Co-stimulatory signaling module. Enhances phagocytic capacity and promotes M1 polarization via Syk-FcRγ axis. Synergizes with CD3ζ.',
  },
];

export default function SciCarDiagram() {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const allModules = [...normalModules, ...carModules];
  const hoveredInfo = allModules.find((m) => m.id === hoveredModule);

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 800 380"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="membrane-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#64748b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Background labels */}
        <text x="200" y="24" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">
          Normal Macrophage
        </text>
        <text x="600" y="24" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">
          CAR-M Engineered
        </text>

        {/* === LEFT SIDE: Normal Macrophage Receptor === */}
        {/* Cell membrane band */}
        <rect
          x="30" y="180" width="340" height="24" rx="4"
          fill="url(#membrane-grad)" opacity="0.7"
        />
        <text x="200" y="196" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="Inter, sans-serif" opacity="0.7">
          MEMBRANE
        </text>

        {/* Extracellular labels */}
        <text x="200" y="50" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="Inter, sans-serif" opacity="0.5">
          Extracellular
        </text>
        <text x="200" y="340" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="Inter, sans-serif" opacity="0.5">
          Intracellular
        </text>

        {/* Normal receptor - Extracellular Y-shape */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setHoveredModule('normal-extracellular')}
          onMouseLeave={() => setHoveredModule(null)}
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={hoveredModule && hoveredModule !== 'normal-extracellular' ? 0.5 : 1}
          filter={hoveredModule === 'normal-extracellular' ? 'url(#glow-strong)' : undefined}
        >
          {/* Left arm */}
          <path d="M170 175 L150 100 L140 80" stroke={COLORS.purple} strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="138" cy="76" r="8" fill={COLORS.purple} opacity="0.9" />
          {/* Right arm */}
          <path d="M230 175 L250 100 L260 80" stroke={COLORS.purple} strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="262" cy="76" r="8" fill={COLORS.purple} opacity="0.9" />
          {/* Stem */}
          <line x1="200" y1="130" x2="200" y2="178" stroke={COLORS.purple} strokeWidth="5" strokeLinecap="round" />
          {/* Junction */}
          <circle cx="200" cy="130" r="6" fill={COLORS.purple} opacity="0.8" />
        </g>

        {/* Normal receptor - Intracellular domain */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setHoveredModule('normal-intracellular')}
          onMouseLeave={() => setHoveredModule(null)}
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={hoveredModule && hoveredModule !== 'normal-intracellular' ? 0.5 : 1}
          filter={hoveredModule === 'normal-intracellular' ? 'url(#glow-strong)' : undefined}
        >
          <line x1="200" y1="204" x2="200" y2="260" stroke={COLORS.yellow} strokeWidth="5" strokeLinecap="round" />
          <rect x="185" y="260" width="30" height="40" rx="4" fill={COLORS.yellow} opacity="0.8" />
          <text x="200" y="285" textAnchor="middle" fill="#0a0f1a" fontSize="7" fontWeight="700" fontFamily="Inter, sans-serif">ITAM</text>
        </g>

        {/* Normal receptor membrane anchor (part of membrane) */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setHoveredModule('normal-membrane')}
          onMouseLeave={() => setHoveredModule(null)}
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={hoveredModule && hoveredModule !== 'normal-membrane' ? 0.5 : 1}
          filter={hoveredModule === 'normal-membrane' ? 'url(#glow-strong)' : undefined}
        >
          <rect x="192" y="178" width="16" height="26" rx="3" fill="#64748b" opacity="0.9" />
        </g>

        {/* Normal label */}
        <text x="200" y="316" textAnchor="middle" fill="#cc66ff" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">
          Normal Receptor
        </text>

        {/* === RIGHT SIDE: CAR-M Structure === */}
        {/* Cell membrane band */}
        <rect
          x="430" y="180" width="340" height="24" rx="4"
          fill="url(#membrane-grad)" opacity="0.7"
        />
        <text x="600" y="196" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="Inter, sans-serif" opacity="0.7">
          MEMBRANE
        </text>

        {/* Extracellular labels */}
        <text x="600" y="50" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="Inter, sans-serif" opacity="0.5">
          Extracellular
        </text>
        <text x="600" y="340" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="Inter, sans-serif" opacity="0.5">
          Intracellular
        </text>

        {/* CAR-M: scFv Y-shape (top) */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setHoveredModule('car-scFv')}
          onMouseLeave={() => setHoveredModule(null)}
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={hoveredModule && hoveredModule !== 'car-scFv' ? 0.5 : 1}
          filter={hoveredModule === 'car-scFv' ? 'url(#glow-strong)' : undefined}
        >
          {/* Left arm */}
          <path d="M570 160 L550 90 L540 70" stroke={COLORS.green} strokeWidth="5" strokeLinecap="round" fill="none" />
          <rect x="528" y="58" width="24" height="16" rx="3" fill={COLORS.green} opacity="0.9" />
          <text x="540" y="70" textAnchor="middle" fill="#0a0f1a" fontSize="6" fontWeight="700" fontFamily="Inter, sans-serif">VH</text>
          {/* Right arm */}
          <path d="M630 160 L650 90 L660 70" stroke={COLORS.green} strokeWidth="5" strokeLinecap="round" fill="none" />
          <rect x="648" y="58" width="24" height="16" rx="3" fill={COLORS.green} opacity="0.9" />
          <text x="660" y="70" textAnchor="middle" fill="#0a0f1a" fontSize="6" fontWeight="700" fontFamily="Inter, sans-serif">VL</text>
          {/* Junction */}
          <circle cx="600" cy="118" r="6" fill={COLORS.green} opacity="0.8" />
          {/* Stem */}
          <line x1="600" y1="118" x2="600" y2="160" stroke={COLORS.green} strokeWidth="5" strokeLinecap="round" />
          {/* scFv label */}
          <text x="600" y="100" textAnchor="middle" fill={COLORS.green} fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif" opacity="0.8">
            scFv
          </text>
        </g>

        {/* Hinge region */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setHoveredModule('car-hinge')}
          onMouseLeave={() => setHoveredModule(null)}
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={hoveredModule && hoveredModule !== 'car-hinge' ? 0.5 : 1}
          filter={hoveredModule === 'car-hinge' ? 'url(#glow-strong)' : undefined}
        >
          <line x1="600" y1="160" x2="600" y2="178" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" strokeDasharray="4,3" />
        </g>

        {/* Transmembrane domain */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setHoveredModule('car-transmembrane')}
          onMouseLeave={() => setHoveredModule(null)}
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={hoveredModule && hoveredModule !== 'car-transmembrane' ? 0.5 : 1}
          filter={hoveredModule === 'car-transmembrane' ? 'url(#glow-strong)' : undefined}
        >
          <rect x="585" y="178" width="30" height="28" rx="4" fill={COLORS.green} opacity="0.85" />
          <text x="600" y="196" textAnchor="middle" fill="#0a0f1a" fontSize="6" fontWeight="700" fontFamily="Inter, sans-serif">TM</text>
        </g>

        {/* CD3ζ signaling domain */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setHoveredModule('car-cd3z')}
          onMouseLeave={() => setHoveredModule(null)}
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={hoveredModule && hoveredModule !== 'car-cd3z' ? 0.5 : 1}
          filter={hoveredModule === 'car-cd3z' ? 'url(#glow-strong)' : undefined}
        >
          <line x1="600" y1="206" x2="600" y2="240" stroke={COLORS.yellow} strokeWidth="5" strokeLinecap="round" />
          <rect x="580" y="240" width="40" height="32" rx="4" fill={COLORS.yellow} opacity="0.8" />
          <text x="600" y="260" textAnchor="middle" fill="#0a0f1a" fontSize="6" fontWeight="700" fontFamily="Inter, sans-serif">CD3ζ</text>
          <text x="600" y="270" textAnchor="middle" fill="#0a0f1a" fontSize="5" fontFamily="Inter, sans-serif">3×ITAM</text>
        </g>

        {/* FcRγ domain (offset to right) */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setHoveredModule('car-fcrg')}
          onMouseLeave={() => setHoveredModule(null)}
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={hoveredModule && hoveredModule !== 'car-fcrg' ? 0.5 : 1}
          filter={hoveredModule === 'car-fcrg' ? 'url(#glow-strong)' : undefined}
        >
          <line x1="620" y1="206" x2="660" y2="240" stroke={COLORS.orange} strokeWidth="4" strokeLinecap="round" />
          <rect x="642" y="240" width="36" height="28" rx="4" fill={COLORS.orange} opacity="0.8" />
          <text x="660" y="258" textAnchor="middle" fill="#0a0f1a" fontSize="6" fontWeight="700" fontFamily="Inter, sans-serif">FcRγ</text>
        </g>

        {/* CAR-M label */}
        <text x="600" y="316" textAnchor="middle" fill={COLORS.green} fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">
          CAR-M
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredInfo && (
        <div
          className="glass-panel rounded-lg p-3 mx-auto max-w-sm mt-3 border border-cyan-400/20"
          style={{ transition: 'opacity 0.2s ease' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-sm font-semibold text-white">{hoveredInfo.name}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{hoveredInfo.description}</p>
        </div>
      )}
    </div>
  );
}
