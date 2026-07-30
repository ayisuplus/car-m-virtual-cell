import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ABMEngine } from '@/lib/simulation/engine';
import type { Cell } from '@/lib/simulation/cell';
import type { PolarizationState } from '@/types/simulation';

function hasPolarization(cell: Cell): cell is Cell & { polarization: PolarizationState } {
  return 'polarization' in cell;
}

function hasPhagocytosisFlag(cell: Cell): cell is Cell & { isPhagocytosing: boolean } {
  return 'isPhagocytosing' in cell;
}

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

const POLARIZATION_COLORS: Record<PolarizationState, THREE.ColorRepresentation> = {
  M1: 0xff3366,
  M2: 0x00ccff,
  MIXED: 0x8899aa,
};

function lcg(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

interface Simulation3DProps {
  engine: ABMEngine | null;
}

export default function Simulation3D({ engine }: Simulation3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cellMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const frameIdRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);
  // Mirror engine prop into a ref so the animate closure always reads the latest
  // instance without retriggering the [isReady] effect.
  const engineRef = useRef(engine);
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);
    scene.fog = new THREE.FogExp2(0x050810, 0.003);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 80, 120);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.maxDistance = 300;
    controls.minDistance = 30;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x111122, 0.5);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x00ccff, 2, 300);
    light1.position.set(-50, 80, -50);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xff3366, 2, 300);
    light2.position.set(50, 80, 50);
    scene.add(light2);

    const light3 = new THREE.PointLight(0x00ff88, 1.5, 200);
    light3.position.set(0, -40, 0);
    scene.add(light3);

    const gridHelper = new THREE.GridHelper(200, 40, 0x112233, 0x0a1520);
    gridHelper.position.y = -20;
    scene.add(gridHelper);

    const coreGeom = new THREE.SphereGeometry(30, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xcc66ff,
      transparent: true,
      opacity: 0.04,
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    scene.add(core);

    const ecmParticles = 200;
    const ecmGeom = new THREE.BufferGeometry();
    const ecmPositions = new Float32Array(ecmParticles * 3);
    const rand = lcg(20250706);
    for (let i = 0; i < ecmParticles; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = rand() * Math.PI;
      const r = 20 + rand() * 40;
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

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
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

  useEffect(() => {
    if (!isReady) return;

    const scene = sceneRef.current!;
    const camera = cameraRef.current!;
    const renderer = rendererRef.current!;
    const controls = controlsRef.current!;
    const meshes = cellMeshesRef.current;

    const sphereGeom = new THREE.SphereGeometry(1, 16, 16);
    const glowGeom = new THREE.SphereGeometry(1.5, 12, 12);

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      const engine = engineRef.current;
      if (!engine) return;

      const cells = engine.cells;
      const bounds = engine.bounds;
      const cx = bounds.width / 2;
      const cy = bounds.height / 2;
      const seenIds = new Set<string>();

      for (const cell of cells) {
        if (!cell.alive) continue;
        seenIds.add(cell.id);

        let mesh = meshes.get(cell.id);
        let glowMesh = meshes.get(`${cell.id}_glow`);

        const color =
          cell.type === 'WILD_TYPE_MACROPHAGE' && hasPolarization(cell)
            ? (POLARIZATION_COLORS[cell.polarization] ?? 0x8899aa)
            : (CELL_COLORS[cell.type] ?? 0xffffff);

        if (!mesh) {
          const size = CELL_SIZES[cell.type] ?? 1;

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

          const glowMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.12,
          });
          glowMesh = new THREE.Mesh(glowGeom, glowMat);
          glowMesh.scale.setScalar(size);
          scene.add(glowMesh);
          meshes.set(`${cell.id}_glow`, glowMesh);
        }

        const x = (cell.position.x - cx) * 0.2;
        const z = (cell.position.y - cy) * 0.2;
        const y =
          cell.type === 'TUMOR_CELL'
            ? Math.sin(cell.age * 0.5) * 2
            : cell.type === 'CD8_T_CELL'
              ? 3 + Math.sin(cell.age * 2) * 1.5
              : 0;

        mesh.position.set(x, y, z);
        glowMesh?.position.copy(mesh.position);

        if (cell.type === 'WILD_TYPE_MACROPHAGE' && hasPolarization(cell)) {
          const polColor = POLARIZATION_COLORS[cell.polarization] ?? 0x8899aa;
          if (mesh.material instanceof THREE.MeshPhongMaterial) {
            mesh.material.color.set(polColor);
            mesh.material.emissive.set(polColor);
          }
          if (glowMesh && glowMesh.material instanceof THREE.MeshBasicMaterial) {
            glowMesh.material.color.set(polColor);
          }
        }

        const baseSize = CELL_SIZES[cell.type] ?? 1;
        const phagocytosing = hasPhagocytosisFlag(cell) && cell.isPhagocytosing;
        if (phagocytosing) {
          const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;
          mesh.scale.setScalar(baseSize * pulse);
          glowMesh?.scale.setScalar(baseSize * pulse);
        } else {
          mesh.scale.setScalar(baseSize);
          glowMesh?.scale.setScalar(baseSize);
        }
      }

        for (const [id, mesh] of meshes) {
        if (!seenIds.has(id.replace('_glow', ''))) {
          scene.remove(mesh);
          if (mesh.material instanceof THREE.Material) {
            mesh.material.dispose();
          }
          meshes.delete(id);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      for (const mesh of meshes.values()) {
        scene.remove(mesh);
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
      meshes.clear();
      sphereGeom.dispose();
      glowGeom.dispose();
    };
  }, [isReady]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '500px' }}
    />
  );
}
