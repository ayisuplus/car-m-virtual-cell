import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface CellModel {
  name: string;
  path: string;
  label: string;
  description: string;
  color: string;
}

const CELL_MODELS: CellModel[] = [
  {
    name: 'macrophage',
    path: '/models/macrophage.glb',
    label: 'CAR-Macrophage',
    description: 'Engineered immune cell with chimeric antigen receptors targeting tumor-specific antigens.',
    color: '#00ff88',
  },
  {
    name: 'tumor',
    path: '/models/tumor-cell.glb',
    label: 'Tumor Cell',
    description: 'Malignant cell expressing HER2 surface markers, target of CAR-M therapy.',
    color: '#cc66ff',
  },
];

export default function CellShowcase3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const frameRef = useRef<number>(0);
  const [activeModel, setActiveModel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const w = container.clientWidth;
    const h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 6;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
    controlsRef.current = controls;

    // Lights
    const ambient = new THREE.AmbientLight(0x404060, 0.8);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 4, 5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x00ccff, 0.8);
    rim.position.set(-3, 2, -3);
    scene.add(rim);

    const fill = new THREE.PointLight(0xcc66ff, 0.5, 10);
    fill.position.set(-2, -1, 3);
    scene.add(fill);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      controls.update();
      if (mixerRef.current) mixerRef.current.update(dt);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load model when activeModel changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const model = CELL_MODELS[activeModel];
    setIsLoading(true);
    setLoadError(null);

    // Remove old model group
    const existing = scene.getObjectByName('cell-model-group');
    if (existing) scene.remove(existing);

    const group = new THREE.Group();
    group.name = 'cell-model-group';

    const loader = new GLTFLoader();
    loader.load(
      model.path,
      (gltf) => {
        const root = gltf.scene;

        // Center and scale
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.0 / maxDim;
        root.scale.setScalar(scale);
        root.position.sub(center.multiplyScalar(scale));

        group.add(root);

        // Animations if available
        if (gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(root);
          const clip = gltf.animations[0];
          mixer.clipAction(clip).play();
          mixerRef.current = mixer;
        } else {
          mixerRef.current = null;
        }

        scene.add(group);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.warn('GLB load failed, using fallback sphere:', err);
        // Fallback: colored sphere
        const geo = new THREE.SphereGeometry(0.8, 64, 64);
        const mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(model.color),
          roughness: 0.3,
          metalness: 0.1,
          transmission: 0.4,
          thickness: 1.5,
          clearcoat: 0.3,
        });
        const sphere = new THREE.Mesh(geo, mat);
        group.add(sphere);
        scene.add(group);
        setLoadError('3D model not loaded — showing preview sphere');
        setIsLoading(false);
      }
    );
  }, [activeModel]);

  const current = CELL_MODELS[activeModel];

  return (
    <section className="py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/5 mb-4">
            <span className="text-xs text-cyan-400 font-medium uppercase">3D Cell Models</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Interactive <span className="text-cyan-400">3D</span> Cell Viewer
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Rotate and explore AI-generated 3D models of the key cell types in our simulation.
          </p>
        </div>

        {/* Model selector */}
        <div className="flex justify-center gap-2 mb-4">
          {CELL_MODELS.map((m, i) => (
            <button
              key={m.name}
              onClick={() => setActiveModel(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeModel === i
                  ? 'border-2 text-white'
                  : 'border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
              style={
                activeModel === i
                  ? { borderColor: m.color + '80', backgroundColor: m.color + '15' }
                  : undefined
              }
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 3D Viewer */}
        <div className="glass-panel rounded-xl overflow-hidden relative">
          <div
            ref={containerRef}
            className="w-full h-[400px] md:h-[500px]"
            style={{ background: 'radial-gradient(ellipse at center, #0f172a 0%, #080c14 100%)' }}
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#080c14]/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: current.color + '60', borderTopColor: 'transparent' }}
                />
                <span className="text-xs text-slate-400">Loading 3D model...</span>
              </div>
            </div>
          )}

          {/* Info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#080c14] to-transparent">
            <div className="flex items-end justify-between">
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: current.color }}
                >
                  {current.label}
                </h3>
                <p className="text-xs text-slate-400 max-w-md">{current.description}</p>
              </div>
              <div className="text-[10px] text-slate-500 text-right">
                <div>Drag to rotate</div>
                <div>Scroll to zoom</div>
                {loadError && <div className="text-yellow-500 mt-1">{loadError}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
