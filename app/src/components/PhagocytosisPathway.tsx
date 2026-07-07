import React, { useState } from 'react';

const COLORS = {
  green: '#00ff88',
  cyan: '#00ccff',
  purple: '#cc66ff',
  rose: '#ff3366',
  yellow: '#ffcc00',
  orange: '#ff8800',
  red: '#ff4444',
};

interface NodeInfo {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  cx: number;
  cy: number;
  detail: string;
}

const nodes: NodeInfo[] = [
  {
    id: 'tumor',
    label: 'Tumor Cell',
    sublabel: 'HER2⁺ / CD47⁺',
    color: COLORS.purple,
    cx: 100,
    cy: 200,
    detail: 'Tumor cells overexpress HER2 antigen on their surface while co-expressing CD47 — the "don\'t eat me" signal that normally protects healthy cells from phagocytic clearance.',
  },
  {
    id: 'binding',
    label: 'CAR Binding',
    sublabel: 'scFv → HER2',
    color: COLORS.green,
    cx: 260,
    cy: 200,
    detail: 'The CAR-M scFv domain recognizes and binds HER2 on the tumor cell surface with high affinity, triggering the engineered receptor\'s signaling cascade.',
  },
  {
    id: 'signal',
    label: 'Signal Transduction',
    sublabel: 'Syk → PI3K → Actin',
    color: COLORS.cyan,
    cx: 420,
    cy: 200,
    detail: 'CAR engagement activates Syk kinase, which recruits PI3K and downstream actin cytoskeleton remodeling pathways. This drives the mechanical engulfment of the target cell.',
  },
  {
    id: 'cup',
    label: 'Phagocytosis',
    sublabel: 'Membrane engulfment',
    color: COLORS.yellow,
    cx: 580,
    cy: 200,
    detail: 'The macrophage extends pseudopods around the tumor cell, forming a phagocytic cup that progressively closes to internalize the target — overriding the CD47 "don\'t eat me" signal.',
  },
  {
    id: 'phagosome',
    label: 'Phagosome',
    sublabel: 'Tumor cell destroyed',
    color: COLORS.rose,
    cx: 740,
    cy: 200,
    detail: 'The internalized tumor cell is enclosed in a phagosome, which fuses with lysosomes. Cathepsins, ROS, and acidic pH degrade the tumor cell. Antigens are processed for MHC presentation.',
  },
];

export default function PhagocytosisPathway() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const selectedInfo = nodes.find((n) => n.id === selectedNode);
  const hoveredInfo = nodes.find((n) => n.id === hoveredNode);

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 840 320"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="pglow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pglow-strong">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow-cyan" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.cyan} opacity="0.7" />
          </marker>
          <marker id="arrow-red" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.red} opacity="0.7" />
          </marker>
          <marker id="arrow-green-x" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.green} opacity="0.7" />
          </marker>
          <style>{`
            @keyframes pulse-arrow {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 1; }
            }
            .flow-arrow { animation: pulse-arrow 2s ease-in-out infinite; }
            .flow-arrow-delay-1 { animation-delay: 0.3s; }
            .flow-arrow-delay-2 { animation-delay: 0.6s; }
            .flow-arrow-delay-3 { animation-delay: 0.9s; }
            .flow-arrow-delay-4 { animation-delay: 1.2s; }
            @keyframes dash-flow {
              to { stroke-dashoffset: -16; }
            }
            .dashed-flow { animation: dash-flow 1s linear infinite; }
          `}</style>
        </defs>

        {/* === MAIN FLOW: 5 NODES === */}
        {/* Flow arrows between nodes */}
        {[0, 1, 2, 3].map((i) => {
          const from = nodes[i];
          const to = nodes[i + 1];
          const x1 = from.cx + 44;
          const x2 = to.cx - 44;
          return (
            <g key={`arrow-${i}`}>
              <line
                x1={x1} y1={from.cy} x2={x2} y2={to.cy}
                stroke={COLORS.cyan}
                strokeWidth="2"
                opacity="0.3"
                markerEnd="url(#arrow-cyan)"
              />
              <line
                x1={x1} y1={from.cy} x2={x2} y2={to.cy}
                stroke={COLORS.cyan}
                strokeWidth="2"
                opacity="0.5"
                markerEnd="url(#arrow-cyan)"
                className={`flow-arrow flow-arrow-delay-${i}`}
              />
            </g>
          );
        })}

        {/* Node circles */}
        {nodes.map((node, i) => {
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNode === node.id;
          const isDimmed = (hoveredNode && hoveredNode !== node.id) || (selectedNode && selectedNode !== node.id && !isHovered);

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              style={{ transition: 'opacity 0.3s ease' }}
              opacity={isDimmed ? 0.4 : 1}
              filter={isHovered || isSelected ? 'url(#pglow-strong)' : undefined}
            >
              {/* Outer ring */}
              <circle
                cx={node.cx} cy={node.cy} r="40"
                fill={node.color + '15'}
                stroke={node.color}
                strokeWidth={isHovered || isSelected ? 3 : 2}
                opacity={isHovered || isSelected ? 1 : 0.7}
              />
              {/* Inner glow */}
              <circle
                cx={node.cx} cy={node.cy} r="30"
                fill={node.color + '25'}
              />
              {/* Center dot */}
              <circle
                cx={node.cx} cy={node.cy} r="6"
                fill={node.color}
                opacity="0.9"
              />
              {/* Label */}
              <text
                x={node.cx} y={node.cy - 50}
                textAnchor="middle"
                fill={node.color}
                fontSize="11"
                fontWeight="600"
                fontFamily="Inter, sans-serif"
              >
                {node.label}
              </text>
              {/* Sub-label */}
              <text
                x={node.cx} y={node.cy - 38}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="8"
                fontFamily="Inter, sans-serif"
              >
                {node.sublabel}
              </text>
              {/* Step number */}
              <text
                x={node.cx} y={node.cy + 4}
                textAnchor="middle"
                fill={node.color}
                fontSize="12"
                fontWeight="700"
                fontFamily="Inter, sans-serif"
                opacity="0.6"
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* === INHIBITORY PATHWAY (above main flow) === */}
        {/* CD47 box */}
        <g opacity="0.8">
          <rect x="320" y="80" width="60" height="28" rx="6" fill={COLORS.red + '20'} stroke={COLORS.red} strokeWidth="1.5" strokeDasharray="4,3" />
          <text x="350" y="98" textAnchor="middle" fill={COLORS.red} fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">CD47</text>
        </g>

        {/* Dashed arrow CD47 → SIRPα */}
        <line x1="380" y1="94" x2="430" y2="94" stroke={COLORS.red} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" markerEnd="url(#arrow-red)" />
        <line x1="380" y1="94" x2="430" y2="94" stroke={COLORS.red} strokeWidth="1.5" strokeDasharray="4,3" className="dashed-flow" opacity="0.4" />

        {/* SIRPα box */}
        <g opacity="0.8">
          <rect x="434" y="80" width="60" height="28" rx="6" fill={COLORS.red + '20'} stroke={COLORS.red} strokeWidth="1.5" strokeDasharray="4,3" />
          <text x="464" y="98" textAnchor="middle" fill={COLORS.red} fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">SIRPα</text>
        </g>

        {/* Dashed arrow SIRPα → "Don't Eat Me" */}
        <line x1="494" y1="94" x2="540" y2="94" stroke={COLORS.red} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" markerEnd="url(#arrow-red)" />
        <line x1="494" y1="94" x2="540" y2="94" stroke={COLORS.red} strokeWidth="1.5" strokeDasharray="4,3" className="dashed-flow" opacity="0.4" />

        {/* "Don't Eat Me" label */}
        <g opacity="0.8">
          <rect x="544" y="76" width="96" height="36" rx="6" fill={COLORS.red + '15'} stroke={COLORS.red} strokeWidth="1.5" />
          <text x="592" y="91" textAnchor="middle" fill={COLORS.red} fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">"Don't Eat Me"</text>
          <text x="592" y="103" textAnchor="middle" fill={COLORS.red} fontSize="7" fontFamily="Inter, sans-serif" opacity="0.7">inhibitory signal</text>
        </g>

        {/* α-CD47 checkpoint blockade (green X over the dashed line) */}
        <g>
          {/* Green X */}
          <line x1="507" y1="82" x2="527" y2="106" stroke={COLORS.green} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
          <line x1="527" y1="82" x2="507" y2="106" stroke={COLORS.green} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
          {/* Label */}
          <rect x="485" y="112" width="54" height="20" rx="4" fill={COLORS.green + '20'} stroke={COLORS.green} strokeWidth="1" />
          <text x="512" y="126" textAnchor="middle" fill={COLORS.green} fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif">α-CD47</text>
        </g>

        {/* Inhibition label */}
        <text x="460" y="70" textAnchor="middle" fill={COLORS.red} fontSize="8" fontFamily="Inter, sans-serif" opacity="0.6">
          Inhibitory Checkpoint Pathway
        </text>

        {/* Blockade label */}
        <text x="512" y="142" textAnchor="middle" fill={COLORS.green} fontSize="7" fontFamily="Inter, sans-serif" opacity="0.6">
          Checkpoint Blockade
        </text>

        {/* Downward dashed lines from inhibitory to main flow */}
        <line x1="400" y1="108" x2="400" y2="158" stroke={COLORS.red} strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
        <line x1="490" y1="108" x2="490" y2="158" stroke={COLORS.red} strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
      </svg>

      {/* Tooltip on hover */}
      {hoveredInfo && !selectedNode && (
        <div className="glass-panel rounded-lg p-3 mx-auto max-w-sm mt-3 border border-cyan-400/20" style={{ transition: 'opacity 0.2s ease' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredInfo.color }} />
            <span className="text-sm font-semibold text-white">{hoveredInfo.label}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{hoveredInfo.detail}</p>
        </div>
      )}

      {/* Expanded panel on click */}
      {selectedInfo && (
        <div className="glass-panel rounded-lg p-4 mx-auto max-w-md mt-3 border border-cyan-400/20" style={{ transition: 'all 0.3s ease' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedInfo.color }} />
              <span className="text-sm font-bold text-white">{selectedInfo.label}</span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-500 hover:text-white text-xs transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{selectedInfo.detail}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] border" style={{ color: selectedInfo.color, borderColor: selectedInfo.color + '40', backgroundColor: selectedInfo.color + '10' }}>
              {selectedInfo.sublabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
