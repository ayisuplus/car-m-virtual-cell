import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface DNAHelixViewerProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function DNAHelixViewer({ 
  width = 400, 
  height = 400, 
  className = '' 
}: DNAHelixViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modelPath, setModelPath] = useState<string | null>(null);

  // Check if DNA helix model exists
  useEffect(() => {
    const checkModel = async () => {
      try {
        const response = await fetch('/models/dna-helix.glb', { method: 'HEAD' });
        if (response.ok) {
          setModelPath('/models/dna-helix.glb');
        } else {
          // Fallback to SVG-based DNA helix
          setModelPath(null);
        }
      } catch {
        setModelPath(null);
      }
    };
    
    checkModel();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);
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
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;
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
      clock.getDelta(); // Keep clock running
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
  }, [width, height]);

  // Load 3D model if available
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !modelPath) return;

    setIsLoading(true);
    setLoadError(null);

    // Remove existing model
    const existing = scene.getObjectByName('dna-helix-model');
    if (existing) scene.remove(existing);

    const group = new THREE.Group();
    group.name = 'dna-helix-model';

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        const root = gltf.scene;

        // Center and scale
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.0 / maxDim;
        root.scale.setScalar(scale);
        root.position.sub(center.multiplyScalar(scale));

        group.add(root);
        scene.add(group);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.warn('GLB load failed, using fallback:', err);
        // Create fallback DNA helix using Three.js geometry
        createFallbackDNAHelix(group);
        scene.add(group);
        setLoadError('3D model not loaded — showing procedural helix');
        setIsLoading(false);
      }
    );
  }, [modelPath]);

  // Create fallback DNA helix using Three.js geometry
  const createFallbackDNAHelix = (group: THREE.Group) => {
    const helixRadius = 0.5;
    const helixHeight = 4;
    const pointsPerTurn = 32;
    const totalPoints = pointsPerTurn * 3; // 3 turns
    
    // Create two helix strands
    const createHelixStrand = (offset: number) => {
      const points: THREE.Vector3[] = [];
      
      for (let i = 0; i <= totalPoints; i++) {
        const t = (i / totalPoints) * Math.PI * 6; // 3 full turns
        const x = Math.cos(t + offset) * helixRadius;
        const y = (i / totalPoints) * helixHeight - helixHeight / 2;
        const z = Math.sin(t + offset) * helixRadius;
        
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, totalPoints * 2, 0.05, 8, false);
      
      const material = new THREE.MeshPhysicalMaterial({
        color: offset === 0 ? 0x00ccff : 0xcc66ff,
        emissive: offset === 0 ? 0x00ccff : 0xcc66ff,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.1,
        transmission: 0.3,
        thickness: 0.5,
      });
      
      return new THREE.Mesh(tubeGeometry, material);
    };
    
    // Create connecting rungs
    const createRungs = () => {
      const rungs: THREE.Mesh[] = [];
      
      for (let i = 0; i < totalPoints; i += 4) { // Every 4 points
        const t = (i / totalPoints) * Math.PI * 6;
        const y = (i / totalPoints) * helixHeight - helixHeight / 2;
        
        const x1 = Math.cos(t) * helixRadius;
        const z1 = Math.sin(t) * helixRadius;
        
        const x2 = Math.cos(t + Math.PI) * helixRadius;
        const z2 = Math.sin(t + Math.PI) * helixRadius;
        
        const points = [
          new THREE.Vector3(x1, y, z1),
          new THREE.Vector3(x2, y, z2),
        ];
        
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, 1, 0.03, 8, false);
        
        const material = new THREE.MeshPhysicalMaterial({
          color: 0x00ff88,
          emissive: 0x00ff88,
          emissiveIntensity: 0.3,
          roughness: 0.4,
          metalness: 0.1,
        });
        
        rungs.push(new THREE.Mesh(tubeGeometry, material));
      }
      
      return rungs;
    };
    
    // Add strands to group
    group.add(createHelixStrand(0));
    group.add(createHelixStrand(Math.PI));
    
    // Add rungs to group
    createRungs().forEach(rung => group.add(rung));
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ 
          width, 
          height,
          background: 'radial-gradient(ellipse at center, #0f172a 0%, #080c14 100%)'
        }}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#080c14]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400/60 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading DNA helix...</span>
          </div>
        </div>
      )}
      
      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#080c14] to-transparent">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-lg font-bold text-cyan-400">
              DNA Double Helix
            </h3>
            <p className="text-xs text-slate-400">
              {modelPath ? '3D Model' : 'Procedural Generation'}
            </p>
          </div>
          <div className="text-[10px] text-slate-500 text-right">
            <div>Drag to rotate</div>
            <div>Scroll to zoom</div>
            {loadError && <div className="text-yellow-500 mt-1">{loadError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
