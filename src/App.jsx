import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { Canvas, useThree, useFrame, extend, useLoader } from '@react-three/fiber';
import { Suspense } from 'react';
import { Sphere, PerspectiveCamera, Html, Svg, Plane } from '@react-three/drei';
import * as THREE from 'three';
import SimplexNoise from './components/SimplexNoise';
import NameText from './components/NameText';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { TextureLoader } from 'three';


const simplex = new SimplexNoise();

function cubicBezier(p0, p1, p2, p3, t) {
  const k = 1 - t;
  return (k * k * k * p0) +
         (3 * k * k * t * p1) +
         (3 * k * t * t * p2) +
         (t * t * t * p3);
}

function customEasing(t) {
  const result = cubicBezier(0.07, 0.62, 0.43, 1, t);
  return Math.min(result, 1); // Ensure the result does not exceed 1
}


function useConsistentNoiseUpdate(particleCount, spacing, gridDimensions, noiseScale, seed) {
  const [particles, setParticles] = useState([]);
  const simplex = new SimplexNoise(seed);  // Use a fixed seed

  useEffect(() => {
    const updatePositions = () => {
      const objects = [];
      for (let i = 0; i < gridDimensions.x; i++) {
        for (let j = 0; j < gridDimensions.y; j++) {
          for (let k = 0; k < gridDimensions.z; k++) {
            const basePosition = [
              (i - gridDimensions.x / 2) * spacing,
              (j - gridDimensions.y / 2) * spacing,
              (k - gridDimensions.z / 2) * spacing,
            ];
            const noiseOffset = [
              simplex.noise(basePosition[0] * noiseScale, basePosition[1] * noiseScale, basePosition[2] * noiseScale) * spacing,
              simplex.noise(basePosition[1] * noiseScale, basePosition[2] * noiseScale, basePosition[0] * noiseScale) * spacing,
              simplex.noise(basePosition[2] * noiseScale, basePosition[0] * noiseScale, basePosition[1] * noiseScale) * spacing
            ];
            const position = [
              basePosition[0] + noiseOffset[0],
              basePosition[1] + noiseOffset[1],
              basePosition[2] + noiseOffset[2]
            ];
            objects.push({ position, key: `${i}-${j}-${k}` });
          }
        }
      }
      setParticles(objects);
    };

    updatePositions(); // Initial update
    const intervalId = setInterval(updatePositions, 1000); // Update every 1000 ms

    return () => clearInterval(intervalId); // Clean up
  }, [seed]);  // Add seed to the dependency array

  return particles;
}

function SVGParticle({ position, onClick, scale }) {
  const mesh = useRef();
  
  // Load the SVG texture
  const texture = useLoader(TextureLoader, '/Star.svg'); // Ensure the path is correct

  // Create a material with the SVG texture
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    map: texture,
    emissive: texture, // Use the same texture for emissive color
    emissiveIntensity: 1,
    transparent: true, // Handle SVG transparency
    side: THREE.DoubleSide,
    alphaTest: 0.5 // Adjust based on your needs for handling alpha
  }), [texture]);

  return (
    <mesh
      ref={mesh}
      position={position}
      scale={scale}
      onClick={onClick}
      material={material}
    >
      <planeBufferGeometry attach="geometry" args={[1, 1]} />
    </mesh>
  );
}

function ParticleComponent({ onLoaded, targetPosition, setTargetPosition, showNameText, setShowNameText }) {
  const { camera } = useThree();
  const [selectedParticle, setSelectedParticle] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const particleScale = 0.05;

  const texture = new TextureLoader().load('/Circle.png');

  const particleCount = 100;
  const spacing = 2;
  const noiseScale = 0.1;
  const sideLength = Math.ceil(Math.cbrt(particleCount));
  const gridDimensions = { x: sideLength, y: sideLength, z: sideLength };

  const seed = 12345;
  const particles = useConsistentNoiseUpdate(particleCount, spacing, gridDimensions, noiseScale, seed);

  // Calculate opacity based on distance to camera
  const calculateOpacity = (position) => {
    const particlePosition = new THREE.Vector3(...position);
    const distance = camera.position.distanceTo(particlePosition);
    const maxDistance = 2;  // This value might need adjustment based on your scene's scale
    const opacity = Math.max(0.2, 1 - (distance / maxDistance * 0.5));
    return opacity;
  };

  // Function to start animation towards the target position
  const startAnimation = (newTargetPosition) => {
    setTargetPosition(newTargetPosition);
    setIsAnimating(true);
  };

  useFrame(() => {
    if (isAnimating && targetPosition) {
      const currentPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
      const targetVec = new THREE.Vector3(targetPosition[0], targetPosition[1], targetPosition[2] + 0.5);
      const distance = currentPos.distanceTo(targetVec);

      if (distance < 0.01) {
        camera.position.copy(targetVec);
        setIsAnimating(false); // Stop the animation once the target is reached
      } else {
        const interpolationFactor = 0.05; // Constant slow pace to prevent overshooting
        camera.position.lerp(targetVec, interpolationFactor);
      }
    }
  });

  useEffect(() => {
    onLoaded(true);
  }, [onLoaded]);

  return (
    <group>
      {particles.map(particle => {
        const opacity = calculateOpacity(particle.position);
        return (
          <Plane key={particle.key} position={particle.position} scale={particleScale} onClick={() => {
            startAnimation(particle.position);
            setSelectedParticle(particle);
            setShowNameText(true);
          }}>
            <meshStandardMaterial attach="material" color="white" emissive="white" transparent opacity={opacity} map={texture} />
          </Plane>
        );
      })}
      {selectedParticle && showNameText && (
        <NameText position={[selectedParticle.position[0], selectedParticle.position[1] + 0.1, selectedParticle.position[2]]} name="Particle Name" />
      )}
    </group>
  );
}

function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const cameraRef = useRef();
  const [targetPosition, setTargetPosition] = useState([0, 0, 0]);
  const [showNameText, setShowNameText] = useState(true);
  const [endPosition, setEndPosition] = useState(new THREE.Vector3(0, 0, 2));

  useEffect(() => {
    if (cameraRef.current) {
      const camera = cameraRef.current;
      const startPosition = new THREE.Vector3(0, 0, 200); // Starting position of the camera

      const startTime = Date.now();
      const duration = 1000; // Duration of the animation in milliseconds

      const animate = () => {
        const elapsedTime = Date.now() - startTime;
        const t = Math.min(1, elapsedTime / duration); // Normalize time to a range of 0 to 1
        const easedT = customEasing(t); // Apply easing function

        camera.position.lerpVectors(startPosition, endPosition, easedT); // Interpolate between start and end positions

        if (t < 1) {
          requestAnimationFrame(animate); // Continue the animation if t < 1
        } else {
          camera.position.copy(endPosition); // Ensure the camera exactly reaches the end position
          setShowNameText(false); // Optionally, update state or trigger other actions at the end of the animation
        }
      };

      animate(); // Start the animation
    }
  }, [cameraRef, isLoaded, endPosition]); // Include endPosition in the dependency array

  
  const handleBackgroundClick = () => {
    if (!cameraRef.current) return;
    if (cameraRef.current.position.distanceToSquared(endPosition) < 0.5) {
      return; // Do nothing if already at endPosition
    }
    setTargetPosition(endPosition.toArray());
    cameraRef.current.position.copy(endPosition);
    setShowNameText(false);
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Canvas onPointerMissed={handleBackgroundClick}>
        <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 0, 5]} fov={90} />
        <ambientLight intensity={0.5} />
        <Suspense fallback={<Html><div>Loading...</div></Html>}>
          <ParticleComponent onLoaded={setIsLoaded} targetPosition={targetPosition} setTargetPosition={setTargetPosition} showNameText={showNameText} setShowNameText={setShowNameText} />
          <EffectComposer>
            <Bloom luminanceThreshold={0.1} luminanceSmoothing={10} height={50} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;

