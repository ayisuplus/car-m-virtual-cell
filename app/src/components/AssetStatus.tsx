import { useState, useEffect } from 'react';
import { 
  Image, Box, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Loader2, Settings, Zap
} from 'lucide-react';
import { 
  ASSET_REGISTRY, checkAssetExists, getAssetStats, preloadAllAssets 
} from '@/lib/assetManager';

interface AssetStatusProps {
  onGenerateClick?: () => void;
}

export default function AssetStatus({ onGenerateClick }: AssetStatusProps) {
  const [assetStatus, setAssetStatus] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);
  const [stats, setStats] = useState({ total: 0, images: 0, models: 0 });

  // Check asset availability
  useEffect(() => {
    const checkAssets = async () => {
      setIsLoading(true);
      const statusMap = new Map<string, boolean>();
      
      await Promise.allSettled(
        ASSET_REGISTRY.map(async (asset) => {
          try {
            const exists = await checkAssetExists(asset.path);
            statusMap.set(asset.id, exists);
          } catch {
            statusMap.set(asset.id, false);
          }
        })
      );
      
      setAssetStatus(statusMap);
      setStats(getAssetStats());
      setIsLoading(false);
    };
    
    checkAssets();
  }, []);

  // Preload all assets
  const handlePreload = async () => {
    setIsPreloading(true);
    try {
      await preloadAllAssets();
      // Re-check status after preload
      const statusMap = new Map<string, boolean>();
      await Promise.allSettled(
        ASSET_REGISTRY.map(async (asset) => {
          try {
            const exists = await checkAssetExists(asset.path);
            statusMap.set(asset.id, exists);
          } catch {
            statusMap.set(asset.id, false);
          }
        })
      );
      setAssetStatus(statusMap);
    } catch (error) {
      console.error('Preload failed:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  // Get status icon
  const getStatusIcon = (assetId: string) => {
    if (isLoading) {
      return <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />;
    }
    
    const exists = assetStatus.get(assetId);
    if (exists === undefined) {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
    
    return exists ? (
      <CheckCircle className="w-4 h-4 text-emerald-400" />
    ) : (
      <XCircle className="w-4 h-4 text-rose-400" />
    );
  };

  // Get status text
  const getStatusText = (assetId: string) => {
    if (isLoading) return 'Checking...';
    
    const exists = assetStatus.get(assetId);
    if (exists === undefined) return 'Unknown';
    
    return exists ? 'Available' : 'Missing';
  };

  // Get status color
  const getStatusColor = (assetId: string) => {
    if (isLoading) return 'text-slate-400';
    
    const exists = assetStatus.get(assetId);
    if (exists === undefined) return 'text-yellow-400';
    
    return exists ? 'text-emerald-400' : 'text-rose-400';
  };

  return (
    <div className="glass-panel p-6 rounded-xl gradient-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Asset Status
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Manage generated images and 3D models
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreload}
            disabled={isPreloading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPreloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Preload
          </button>
          
          {onGenerateClick && (
            <button
              onClick={onGenerateClick}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all duration-200 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Generate
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Assets</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
          <div className="text-2xl font-bold text-cyan-400">{stats.images}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Images</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
          <div className="text-2xl font-bold text-purple-400">{stats.models}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">3D Models</div>
        </div>
      </div>

      {/* Asset list */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Image className="w-3.5 h-3.5" />
          Images
        </h4>
        
        {ASSET_REGISTRY.filter(a => a.type === 'image').map((asset) => (
          <div
            key={asset.id}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-slate-800/30 hover:border-slate-700/50 transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(asset.id)}
              <div>
                <div className="text-sm text-white font-medium">{asset.name}</div>
                <div className="text-[10px] text-slate-500">{asset.description}</div>
              </div>
            </div>
            <span className={`text-xs font-medium ${getStatusColor(asset.id)}`}>
              {getStatusText(asset.id)}
            </span>
          </div>
        ))}
        
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mt-6">
          <Box className="w-3.5 h-3.5" />
          3D Models
        </h4>
        
        {ASSET_REGISTRY.filter(a => a.type === 'model').map((asset) => (
          <div
            key={asset.id}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-slate-800/30 hover:border-slate-700/50 transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(asset.id)}
              <div>
                <div className="text-sm text-white font-medium">{asset.name}</div>
                <div className="text-[10px] text-slate-500">{asset.description}</div>
              </div>
            </div>
            <span className={`text-xs font-medium ${getStatusColor(asset.id)}`}>
              {getStatusText(asset.id)}
            </span>
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className="mt-6 p-4 rounded-lg bg-slate-900/50 border border-slate-800/50">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 leading-relaxed">
            <p className="font-medium text-slate-300 mb-1">How to generate assets:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Install rh CLI: <code className="px-1 py-0.5 rounded bg-slate-800 text-cyan-400">cd /path/to/RH_CLI && pip install .</code></li>
              <li>Configure API key: <code className="px-1 py-0.5 rounded bg-slate-800 text-cyan-400">rh auth set-key YOUR_KEY</code></li>
              <li>Set Meshy API key: <code className="px-1 py-0.5 rounded bg-slate-800 text-cyan-400">export MESHY_API_KEY=msy_YOUR_KEY</code></li>
              <li>Run generation script: <code className="px-1 py-0.5 rounded bg-slate-800 text-cyan-400">bash scripts/generate-assets.sh all</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
