/**
 * Asset Manager for CAR-M Virtual Cell Simulator
 * 
 * Manages loading and caching of generated assets (images and 3D models)
 * from RunningHub and Meshy APIs.
 */

// Asset configuration
export interface AssetConfig {
  id: string;
  name: string;
  type: 'image' | 'model';
  path: string;
  fallbackPath?: string;
  description?: string;
  metadata?: Record<string, any>;
}

// Asset registry
export const ASSET_REGISTRY: AssetConfig[] = [
  // Hero and background images (newly generated)
  {
    id: 'hero-bg',
    name: 'Hero Background',
    type: 'image',
    path: '/images/hero-bg.jpg',
    fallbackPath: '/images/hero-bg-old.jpg',
    description: 'Futuristic bioluminescent tumor microenvironment background',
  },
  
  // Scientific illustrations (newly generated)
  {
    id: 'm1-m2-polarization',
    name: 'M1/M2 Polarization Diagram',
    type: 'image',
    path: '/images/m1-m2-polarization.png',
    fallbackPath: '/images/m1-m2-polarization-old.png',
    description: 'Macrophage polarization spectrum illustration',
  },
  {
    id: 'phagocytosis-mechanism',
    name: 'Phagocytosis Mechanism',
    type: 'image',
    path: '/images/phagocytosis-mechanism.png',
    fallbackPath: '/images/phagocytosis-mechanism-old.png',
    description: 'Phagocytosis mechanism illustration',
  },
  {
    id: 'tme-ecosystem',
    name: 'TME Ecosystem',
    type: 'image',
    path: '/images/tme-ecosystem.png',
    fallbackPath: '/images/tme-ecosystem-old.png',
    description: 'Tumor microenvironment ecosystem visualization',
  },
  
  // 3D Models (newly generated)
  {
    id: 'macrophage-model',
    name: 'CAR-Macrophage 3D Model',
    type: 'model',
    path: '/models/macrophage.glb',
    fallbackPath: '/models/macrophage-enhanced.glb',
    description: 'Enhanced macrophage immune cell 3D model',
  },
  {
    id: 'tumor-cell-model',
    name: 'Tumor Cell 3D Model',
    type: 'model',
    path: '/models/tumor-cell.glb',
    description: 'Enhanced tumor cell with HER2 markers 3D model',
  },
  {
    id: 'dna-helix-model',
    name: 'DNA Helix 3D Model',
    type: 'model',
    path: '/models/dna-helix.glb',
    description: 'DNA double helix structure 3D model',
  },
  {
    id: 'macrophage-enhanced-model',
    name: 'Enhanced Macrophage 3D Model',
    type: 'model',
    path: '/models/macrophage-enhanced.glb',
    description: 'High-quality macrophage with bioluminescent glow',
  },
];

// Asset cache
const assetCache = new Map<string, HTMLImageElement | ArrayBuffer>();

// Preload images
export async function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Preload 3D models (just fetch the file)
export async function preloadModel(src: string): Promise<ArrayBuffer> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to load model: ${src}`);
  }
  return response.arrayBuffer();
}

// Get asset by ID
export function getAssetById(id: string): AssetConfig | undefined {
  return ASSET_REGISTRY.find(asset => asset.id === id);
}

// Get all assets of a type
export function getAssetsByType(type: 'image' | 'model'): AssetConfig[] {
  return ASSET_REGISTRY.filter(asset => asset.type === type);
}

// Check if asset exists
export async function checkAssetExists(path: string): Promise<boolean> {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Get asset path with fallback
export async function getAssetPath(asset: AssetConfig): Promise<string> {
  // Try primary path first
  if (await checkAssetExists(asset.path)) {
    return asset.path;
  }
  
  // Try fallback path
  if (asset.fallbackPath && await checkAssetExists(asset.fallbackPath)) {
    console.warn(`Using fallback for ${asset.id}: ${asset.fallbackPath}`);
    return asset.fallbackPath;
  }
  
  // Return primary path (will fail gracefully)
  console.warn(`Asset not found: ${asset.id} (${asset.path})`);
  return asset.path;
}

// Preload all assets
export async function preloadAllAssets(): Promise<void> {
  const imageAssets = getAssetsByType('image');
  const modelAssets = getAssetsByType('model');
  
  // Preload images
  await Promise.allSettled(
    imageAssets.map(async (asset) => {
      try {
        const path = await getAssetPath(asset);
        const img = await preloadImage(path);
        assetCache.set(asset.id, img);
      } catch (error) {
        console.warn(`Failed to preload image ${asset.id}:`, error);
      }
    })
  );
  
  // Preload models (just check if they exist)
  await Promise.allSettled(
    modelAssets.map(async (asset) => {
      try {
        const exists = await checkAssetExists(asset.path);
        if (exists) {
          console.log(`Model available: ${asset.id}`);
        } else {
          console.warn(`Model not found: ${asset.id}`);
        }
      } catch (error) {
        console.warn(`Failed to check model ${asset.id}:`, error);
      }
    })
  );
}

// Get cached asset
export function getCachedAsset(id: string): HTMLImageElement | ArrayBuffer | undefined {
  return assetCache.get(id);
}

// Clear cache
export function clearAssetCache(): void {
  assetCache.clear();
}

// Get asset statistics
export function getAssetStats(): { total: number; images: number; models: number } {
  const images = getAssetsByType('image').length;
  const models = getAssetsByType('model').length;
  return {
    total: images + models,
    images,
    models,
  };
}
