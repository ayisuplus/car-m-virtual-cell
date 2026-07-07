# Task: Add 3D Tumor Microenvironment Visualization

You are working on the AI Virtual Macrophage (CAR-M) project at:
E:\projects\AI虚拟细胞\Kimi_Agent_AI巨噬细胞MVP\app

## Goal
Add a stunning 3D visualization of the tumor microenvironment using Three.js. This will be a separate view mode alongside the existing 2D Canvas, toggled by a button. The 3D view reads cell positions from the existing ABMEngine and renders them as glowing 3D spheres in a dark volumetric environment. This is for a Cambridge visiting scholarship presentation — it needs to look impressive.

## Setup

First install Three.js:
```bash
cd "E:\projects\AI虚拟细胞\Kimi_Agent_AI巨噬细胞MVP\app"
npm install three @types/three
```

## Files to Create/Modify

1. **CREATE** `src/components/Simulation3D.tsx` — The 3D renderer component
2. **MODIFY** `src/sections/SimSection.tsx` — Add 2D/3D toggle button
3. **MODIFY** `src/context/SimContext.tsx` — Add viewMode state (if needed, or use local state)

**Do NOT modify** `src/lib/simulation/` — the engine stays untouched.

---

## Task 1: Create Simulation3D Component

### `src/components/Simulation3D.tsx`

This component:
- Renders a Three.js scene showing all cells as 3D spheres
- Reads cell data from the ABMEngine (same engine instance shared with 2D view)
- Shows a dark volumetric background with subtle grid
- Each cell type has distinct material (emissive glow, transparency, size)
- Camera can be orbited with mouse drag (OrbitControls)
- Auto-rotates slowly when not interacting
- Renders at 60fps, syncs with engine state

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useSim } from '@/context/SimContext';

// Cell colors matching 2D view
const CELL_COLORS: Record<string, THREE.ColorRepresentation> = {
  CAR_MACROPHAGE: 0x00ff88,
  WILD_TYPE_MACROPHAGE: 0x00ccff,
  TUMOR_CELL: 0xcc66ff,
  CD8_T_CELL: 0xffcc00,
};

const CELL_SIZES: Record<string, number> = {
  CAR_MACROPHAGE: 1.0,
  WILD_TYPE_MACROPHAGE: 0.9,
  TUMOR_CELL: 1.4,
  CD8_T_CELL: 0.6,
};

// Polarization colors for wild-type macrophages
const POLARIZATION_COLORS: Record<string, THREE.ColorRepresentation> = {
  M1: 0xff3366,
  M2: 0x00ccff,
  MIXED: 0x8899aa,
};

export default function Simulation3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cellMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const frameIdRef = useRef<number>(0);
  const { state } = useSim();
  const [isReady, setIsReady] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);
    scene.fog = new THREE.FogExp2(0x050810, 0.003);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 80, 120);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.maxDistance = 300;
    controls.minDistance = 30;
    controlsRef.current = controls;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x111122, 0.5);
    scene.add(ambientLight);

    // Point lights for dramatic effect
    const light1 = new THREE.PointLight(0x00ccff, 2, 300);
    light1.position.set(-50, 80, -50);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xff3366, 2, 300);
    light2.position.set(50, 80, 50);
    scene.add(light2);

    const light3 = new THREE.PointLight(0x00ff88, 1.5, 200);
    light3.position.set(0, -40, 0);
    scene.add(light3);

    // Ground plane (subtle grid)
    const gridHelper = new THREE.GridHelper(200, 40, 0x112233, 0x0a1520);
    gridHelper.position.y = -20;
    scene.add(gridHelper);

    // Tumor core glow (transparent sphere at center)
    const coreGeom = new THREE.SphereGeometry(30, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xcc66ff,
      transparent: true,
      opacity: 0.04,
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    scene.add(core);

    // ECM cloud (particle system for dense ECM areas)
    const ecmParticles = 200;
    const ecmGeom = new THREE.BufferGeometry();
    const ecmPositions = new Float32Array(ecmParticles * 3);
    for (let i = 0; i < ecmParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 20 + Math.random() * 40;
      ecmPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      ecmPositions[i * 3 + 1] = r * Math.cos(phi) * 0.3;
      ecmPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    ecmGeom.setAttribute('position', new THREE.BufferAttribute(ecmPositions, 3));
    const ecmMat = new THREE.PointsMaterial({
      color: 0x8b5a2b,
      size: 0.8,
      transparent: true,
      opacity: 0.15,
    });
    const ecmCloud = new THREE.Points(ecmGeom, ecmMat);
    scene.add(ecmCloud);

    setIsReady(true);

    // Handle resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Animation loop — sync cell meshes with engine state
  useEffect(() => {
    if (!isReady) return;

    const scene = sceneRef.current!;
    const camera = cameraRef.current!;
    const renderer = rendererRef.current!;
    const controls = controlsRef.current!;
    const meshes = cellMeshesRef.current;

    // Create shared geometries for performance
    const sphereGeom = new THREE.SphereGeometry(1, 16, 16);
    const glowGeom = new THREE.SphereGeometry(1.5, 12, 12);

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      // Get engine from the SimContext (we need access to engine.cells)
      // The engine is managed by SimulationCanvas — we read from a global ref
      const engine = (window as any).__carmEngine;
      if (!engine) return;

      const cells = engine.cells as any[];
      const seenIds = new Set<string>();

      for (const cell of cells) {
        if (!cell.alive) continue;
        seenIds.add(cell.id);

        let mesh = meshes.get(cell.id);
        let glowMesh = meshes.get(cell.id + '_glow');

        if (!mesh) {
          // Create cell mesh
          const size = CELL_SIZES[cell.type] || 1;
          const color = cell.type === 'WILD_TYPE_MACROPHAGE'
            ? (POLARIZATION_COLORS[cell.polarization] || 0x8899aa)
            : (CELL_COLORS[cell.type] || 0xffffff);

          const mat = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.9,
            shininess: 80,
          });
          mesh = new THREE.Mesh(sphereGeom, mat);
          mesh.scale.setScalar(size);
          scene.add(mesh);
          meshes.set(cell.id, mesh);

          // Add glow sphere
          const glowMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.12,
          });
          glowMesh = new THREE.Mesh(glowGeom, glowMat);
          glowMesh.scale.setScalar(size);
          scene.add(glowMesh);
          meshes.set(cell.id + '_glow', glowMesh);
        }

        // Update position (map 2D canvas coords to 3D space)
        const x = (cell.position.x - 400) * 0.2; // Center and scale
        const z = (cell.position.y - 300) * 0.2;
        const y = cell.type === 'TUMOR_CELL' ? Math.sin(cell.age * 0.5) * 2 : 
                  cell.type === 'CD8_T_CELL' ? 3 + Math.sin(cell.age * 2) * 1.5 : 0;
        
        mesh.position.set(x, y, z);
        if (glowMesh) glowMesh.position.copy(mesh.position);

        // Update color for polarization changes (wild-type macrophages)
        if (cell.type === 'WILD_TYPE_MACROPHAGE') {
          const polColor = POLARIZATION_COLORS[cell.polarization] || 0x8899aa;
          (mesh.material as THREE.MeshPhongMaterial).color.set(polColor);
          (mesh.material as THREE.MeshPhongMaterial).emissive.set(polColor);
          if (glowMesh) {
            (glowMesh.material as THREE.MeshBasicMaterial).color.set(polColor);
          }
        }

        // Phagocytosis effect — scale up temporarily
        if (cell.isPhagocytosing) {
          const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;
          mesh.scale.setScalar((CELL_SIZES[cell.type] || 1) * pulse);
        } else {
          mesh.scale.setScalar(CELL_SIZES[cell.type] || 1);
        }
      }

      // Remove meshes for dead cells
      for (const [id, mesh] of meshes) {
        if (!seenIds.has(id.replace('_glow', ''))) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
          meshes.delete(id);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();
  }, [isReady]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-lg" />
  );
}
```

### Key implementation notes:
- Map 2D canvas coordinates to 3D space: `(x - 400) * 0.2, y_offset, (y - 300) * 0.2`
- Tumor cells bob up/down slightly (alive motion)
- CD8 T cells hover above the plane (immune surveillance feel)
- Wild-type macrophages change color with polarization
- Phagocytosis creates a pulsing scale effect
- ECM is shown as scattered brown particles
- Tumor core has a subtle purple glow sphere
- Auto-rotate at 0.5 speed, user can drag to orbit

---

## Task 2: Add View Toggle to SimSection

### In `src/sections/SimSection.tsx`:
Add a 2D/3D toggle button above the canvas area.

Read the current file first. Add state and toggle:

```tsx
const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
```

Add toggle buttons above the canvas:
```tsx
{/* View mode toggle */}
<div className="flex gap-1 mb-3">
  <button
    onClick={() => setViewMode('2d')}
    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
      viewMode === '2d'
        ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-400'
        : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white'
    }`}
  >
    2D View
  </button>
  <button
    onClick={() => setViewMode('3d')}
    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
      viewMode === '3d'
        ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-400'
        : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white'
    }`}
  >
    3D View
  </button>
</div>
```

Conditionally render 2D or 3D:
```tsx
{/* Canvas area */}
<div className="flex-1 min-h-[500px] lg:min-h-[650px] rounded-xl overflow-hidden border border-slate-700/50 bg-[#080c14]">
  {viewMode === '2d' ? <SimulationCanvas /> : <Simulation3D />}
</div>
```

Import Simulation3D at the top:
```tsx
import Simulation3D from '@/components/Simulation3D';
```

---

## Task 3: Expose Engine to Window for 3D Access

The 3D component needs access to the engine's cell data. The SimulationCanvas owns the engine. We need to expose it.

### In `src/components/SimulationCanvas.tsx`:
After creating the engine, expose it on window:

Find where the engine is created (likely in a useEffect or useRef initialization). Add:
```typescript
// Expose engine for 3D view access
(window as any).__carmEngine = engine.current;
```

And in cleanup:
```typescript
delete (window as any).__carmEngine;
```

This is a simple bridge pattern — the 3D renderer reads from the same engine instance.

---

## Task 4: Responsive Sizing

Make sure the 3D container fills its parent properly. The container div should have explicit height:

```tsx
<div ref={containerRef} className="w-full h-full" style={{ minHeight: '500px' }} />
```

---

## Visual Style
- Dark background (#050810) with subtle fog
- Cell glow uses emissive materials + transparent outer spheres
- Dramatic lighting: cyan from left, red from right, green from below
- Grid plane at y=-20 for spatial reference
- ACES filmic tone mapping for cinematic look
- Anti-aliased, 2x pixel ratio cap

## Commit
After all changes:
```bash
cd "E:\projects\AI虚拟细胞\Kimi_Agent_AI巨噬细胞MVP\app"
git add src/components/Simulation3D.tsx src/sections/SimSection.tsx src/components/SimulationCanvas.tsx package.json package-lock.json
git commit -m "feat: 3D tumor microenvironment visualization with Three.js — orbit camera, glowing cells, dramatic lighting"
```
