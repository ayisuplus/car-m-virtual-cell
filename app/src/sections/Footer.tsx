import { Microscope, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-12 px-4 md:px-8 border-t border-slate-800/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <Microscope className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">CAR-M Simulator</div>
              <div className="text-[10px] text-slate-500">AI Virtual Cell Platform</div>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="#science"
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              Science
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="#clinical"
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              Clinical Data
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="#technology"
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              Architecture
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Credits */}
          <div className="text-center md:text-right">
            <div className="text-[10px] text-slate-500">
              Built for Cambridge Short-Term Research Program
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              Computational Immunology & Systems Biology
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/30 text-center">
          <p className="text-[10px] text-slate-600">
            Inspired by Carisma's CT-0508 trial, CZI Virtual Cell Initiative, and PhysiCell framework.
            For research and educational purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}
