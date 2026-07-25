import { useState } from 'react';
import { Settings, Box, Image, Zap, Terminal, ExternalLink } from 'lucide-react';
import AssetStatus from '@/components/AssetStatus';
import DNAHelixViewer from '@/components/DNAHelixViewer';

export default function AssetSection() {
  const [showTerminal, setShowTerminal] = useState(false);

  return (
    <section id="assets" className="py-20 px-4 md:px-8 bg-slate-900/30">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/5 mb-4">
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-cyan-400 font-medium uppercase">Asset Management</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Generated <span className="text-cyan-400">Resources</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            High-quality images and 3D models generated using RunningHub and Meshy APIs.
            These resources enhance the visual impact of the CAR-M Simulator for academic presentations.
          </p>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column: Asset status */}
          <div>
            <AssetStatus onGenerateClick={() => setShowTerminal(!showTerminal)} />
            
            {/* Terminal instructions */}
            {showTerminal && (
              <div className="mt-6 glass-panel p-6 rounded-xl gradient-border">
                <div className="flex items-center gap-2 mb-4">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-white">Generation Commands</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-2">1. Install RunningHub CLI:</p>
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/50">
                      <code className="text-xs text-cyan-400 font-mono">
                        cd E:/workspace/hermes/RH_CLI && pip install .
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-400 mb-2">2. Configure API keys:</p>
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/50">
                      <code className="text-xs text-cyan-400 font-mono">
                        rh auth set-key YOUR_RUNNINGHUB_KEY<br />
                        export MESHY_API_KEY=msy_YOUR_MESHY_KEY
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-400 mb-2">3. Generate all assets:</p>
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/50">
                      <code className="text-xs text-cyan-400 font-mono">
                        cd E:/projects/AI虚拟细胞/car-m-virtual-cell<br />
                        bash scripts/generate-assets.sh all
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-400 mb-2">4. Or generate specific assets:</p>
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/50">
                      <code className="text-xs text-cyan-400 font-mono">
                        bash scripts/generate-assets.sh images  # Images only<br />
                        bash scripts/generate-assets.sh models  # 3D models only<br />
                        bash scripts/generate-assets.sh dna-helix  # DNA helix only
                      </code>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400">
                      <span className="font-medium text-slate-300">Pro tip:</span> For scientific illustrations, 
                      use prompts without text/labels and overlay annotations via code for zero spelling errors.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column: DNA Helix preview */}
          <div>
            <div className="glass-panel p-6 rounded-xl gradient-border">
              <div className="flex items-center gap-2 mb-4">
                <Box className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-semibold text-white">DNA Helix Preview</h4>
              </div>
              
              <p className="text-xs text-slate-400 mb-4">
                Preview of the DNA double helix structure. If the 3D model is available, 
                it will be loaded; otherwise, a procedural fallback is shown.
              </p>
              
              <div className="rounded-xl overflow-hidden border border-slate-800/50">
                <DNAHelixViewer width={500} height={400} />
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-[10px] text-slate-400">Interactive 3D viewer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-[10px] text-slate-400">Procedural fallback</span>
                </div>
              </div>
            </div>
            
            {/* Quick links */}
            <div className="mt-6 glass-panel p-6 rounded-xl gradient-border">
              <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                Useful Links
              </h4>
              
              <div className="space-y-3">
                <a
                  href="https://www.runninghub.cn/enterprise-api/sharedApi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-colors duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                    <Image className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm text-white group-hover:text-cyan-400 transition-colors duration-200">
                      RunningHub API
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Get API key for image generation
                    </div>
                  </div>
                </a>
                
                <a
                  href="https://www.meshy.ai/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-colors duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-400/10 flex items-center justify-center">
                    <Box className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-white group-hover:text-purple-400 transition-colors duration-200">
                      Meshy API
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Get API key for 3D model generation
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
