import { Microscope, Github, Mail, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative py-16 px-4 md:px-8 border-t border-slate-800/30 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060a14] to-transparent opacity-50" />
      
      {/* Animated dots pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0, 204, 255, 0.5) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Logo & tagline */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 flex items-center justify-center">
                <Microscope className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-base font-bold text-white">CAR-M Simulator</div>
                <div className="text-xs text-slate-400">AI Virtual Cell Platform</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed text-center md:text-left max-w-xs">
              A mechanism-informed agent-based modeling platform for exploring CAR-engineered macrophage behavior in the tumor microenvironment.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Quick Links</h4>
            {[
              { href: '#science', label: 'Scientific Foundation' },
              { href: '#clinical', label: 'Clinical Data' },
              { href: '#technology', label: 'Architecture' },
              { href: '#data', label: 'scRNA-seq Data' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs text-slate-400 hover:text-cyan-400 transition-all duration-300 flex items-center gap-1.5 group"
              >
                <span className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-cyan-400 transition-colors duration-300" />
                {link.label}
              </a>
            ))}
          </div>

          {/* Credits & Social */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="text-center md:text-right">
              <div className="text-sm font-medium text-slate-300">
                Cambridge Short-Term Research Program
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Computational Immunology & Systems Biology
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="#" className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition-all duration-300">
                <Github className="w-3.5 h-3.5" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition-all duration-300">
                <Mail className="w-3.5 h-3.5" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition-all duration-300">
                <Globe className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="section-divider mb-8" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-600 text-center md:text-left">
            Inspired by Carisma's CT-0508 trial, CZI Virtual Cell Initiative, and PhysiCell framework.
          </p>
          <p className="text-[11px] text-slate-600">
            For research and educational purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
