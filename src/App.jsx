import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { Canvas, useThree, useFrame, extend, useLoader } from '@react-three/fiber';
import { Suspense } from 'react';
import { Sphere, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import SimplexNoise from './components/SimplexNoise';

const simplex = new SimplexNoise();

function cubicBezier(p0, p1, p2, p3, t) {
  const k = 1 - t;
  return (k * k * k * p0) +
         (3 * k * k * t * p1) +
         (3 * k * t * t * p2) +
         (t * t * t * p3);
}

function customEasing(t) {
  return cubicBezier(0.07, 0.62, 0.43, 1, t);
}

function ParticleComponent({ onLoaded, targetPosition, setTargetPosition }) {
  const { camera } = useThree();
  const [isParticleClicked, setIsParticleClicked] = useState(false);
  const opacity = 1; // Set opacity directly to 1
  const particleScale = 0.05; // Adjust size as needed

  const simplex = new SimplexNoise(Math.random()); // Initialize SimplexNoise with a random seed

  useFrame(() => {
    if (isParticleClicked) {
      camera.position.lerp(new THREE.Vector3(targetPosition[0], targetPosition[1], targetPosition[2] + 0.5), 0.1);
    }
  });

  useEffect(() => {
    setTimeout(() => {
      onLoaded(true);
    }, 1000);
  }, [onLoaded]);

  const particlesRef = useRef();
  const particleColor = "white"; // Set a consistent color for all particles

  const particleCount = 400; // Total number of particles
  const spacing = 2; // Spacing between particles

  // Calculate grid dimensions based on the cube root of particleCount
  const sideLength = Math.ceil(Math.cbrt(particleCount));
  const gridDimensions = { x: sideLength, y: sideLength, z: sideLength };

  const noiseScale = 0.1; // Scale of the noise

  const particles = useMemo(() => {
    let objects = [];
    for (let i = 0; i < gridDimensions.x; i++) {
      for (let j = 0; j < gridDimensions.y; j++) {
        for (let k = 0; k < gridDimensions.z; k++) {
          const basePosition = [
            (i - gridDimensions.x / 2) * spacing,
            (j - gridDimensions.y / 2) * spacing,
            (k - gridDimensions.z / 2) * spacing,
          ];
          // Apply noise to position
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
    return objects;
  }, [gridDimensions, spacing, simplex]);

  return (
    <group ref={particlesRef}>
      {particles.map(particle => (
        <Sphere key={particle.key} position={particle.position} scale={particleScale} onClick={() => {
          setTargetPosition(particle.position);
          setIsParticleClicked(true);
        }}>
          <meshStandardMaterial attach="material" color={particleColor} transparent opacity={opacity} />
        </Sphere>
      ))}
    </group>
  );
}


function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const cameraRef = useRef();
  const [isParticleClicked, setIsParticleClicked] = useState(false); // Added state for isParticleClicked
  const [targetPosition, setTargetPosition] = useState([0, 0, 0]); // Move targetPosition state to App component

  // Define endPosition globally within the component
  const endPosition = new THREE.Vector3(0, 0, 10);

  useEffect(() => {
    if (cameraRef.current) {
      const camera = cameraRef.current;
      const startPosition = new THREE.Vector3(0, 0, 200);
      const startRotation = new THREE.Euler(0, 0, 0);
      const endRotation = new THREE.Euler(0, 0, 0);

      const startQuaternion = new THREE.Quaternion().setFromEuler(startRotation);
      const endQuaternion = new THREE.Quaternion().setFromEuler(endRotation);

      const startTime = Date.now();
      const duration = 1000; // 2 seconds

      const animate = () => {
        const elapsedTime = Date.now() - startTime;
        let t = Math.min(1, elapsedTime / duration);
        t = customEasing(t); // Apply custom cubic-bezier easing function

        // Interpolating position
        camera.position.lerpVectors(startPosition, endPosition, t);

        // Interpolating rotation using slerp
        camera.quaternion.slerpQuaternions(startQuaternion, endQuaternion, t);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          // Ensure the camera is exactly at the endPosition after animation
          camera.position.copy(endPosition);
        }
      };

      animate();
    }
  }, [cameraRef, isLoaded]);

  // Function to handle background click
  const handleBackgroundClick = () => {
    if (cameraRef.current) {
      const currentPos = cameraRef.current.position;
      const epsilon = 0.5; // Small tolerance for floating point inaccuracies

      // Custom function to compare vectors with a tolerance
      function isPositionCloseEnough(pos1, pos2, tolerance) {
        return Math.abs(pos1.x - pos2.x) < tolerance &&
               Math.abs(pos1.y - pos2.y) < tolerance &&
               Math.abs(pos1.z - pos2.z) < tolerance;
      }

      // Check if the camera is already close enough to the endPosition
      if (isPositionCloseEnough(currentPos, endPosition, epsilon)) {
        return; // Do nothing if the camera is already at or very close to the end position
      }
      setIsParticleClicked(false); // Set isParticleClicked to false
      setTargetPosition(endPosition.toArray()); // Set targetPosition to endPosition
      cameraRef.current.position.copy(endPosition);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Canvas onPointerMissed={handleBackgroundClick}>
        <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 0, 0]} fov={90} />
        <ambientLight intensity={0.5} />
        <Suspense fallback={<Html><div>Loading...</div></Html>}>
          <ParticleComponent onLoaded={setIsLoaded} targetPosition={targetPosition} setTargetPosition={setTargetPosition} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
