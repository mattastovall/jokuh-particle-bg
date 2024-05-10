import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { Canvas, useThree, useFrame, extend, useLoader } from '@react-three/fiber';
import { Suspense } from 'react';
import { Sphere, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import SimplexNoise from './components/SimplexNoise';
import NameText from './components/NameText';


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

function useConsistentNoiseUpdate(particleCount, spacing, gridDimensions, noiseScale) {
  const [particles, setParticles] = useState([]);
  const simplex = new SimplexNoise(Math.random());

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
  }, []);

  return particles;
}

function ParticleComponent({ onLoaded, targetPosition, setTargetPosition, showNameText }) {
  const { camera } = useThree();
  const [isParticleClicked, setIsParticleClicked] = useState(false);
  const [selectedParticle, setSelectedParticle] = useState(null);
  const opacity = 1;
  const particleScale = 0.05;

  const particleCount = 500; // Define the number of particles
  const spacing = 2;
  const noiseScale = 0.1;
  const sideLength = Math.ceil(Math.cbrt(particleCount)); // Calculate the side length of the cube to fit the particle count
  const gridDimensions = { x: sideLength, y: sideLength, z: sideLength }; // Use the side length to set grid dimensions

  const particles = useConsistentNoiseUpdate(particleCount, spacing, gridDimensions, noiseScale);

  useFrame(() => {
    if (isParticleClicked) {
      const currentPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
      const targetVec = new THREE.Vector3(targetPosition[0], targetPosition[1], targetPosition[2] + 0.2);
      const distance = currentPos.distanceTo(targetVec);
      const interpolationFactor = Math.min(0.1, 0.05 + 0.05 * (distance / 10));
      camera.position.lerp(targetVec, interpolationFactor);
    }
  });

  useEffect(() => {
    onLoaded(true);
  }, [onLoaded]);

  return (
    <group>
      {particles.map(particle => (
        <Sphere key={particle.key} position={particle.position} scale={particleScale} onClick={() => {
          setTargetPosition(particle.position);
          setIsParticleClicked(true);
          setSelectedParticle(particle);
        }}>
          <meshStandardMaterial attach="material" color="white" transparent opacity={opacity} />
        </Sphere>
      ))}
      {/* Conditionally render NameText based on selectedParticle and showNameText */}
      {selectedParticle && showNameText && (
        <NameText position={[selectedParticle.position[0], selectedParticle.position[1] + 0.1, selectedParticle.position[2]]} name="Particle Name" />
      )}
    </group>
  );
}

function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const cameraRef = useRef();
  const [isParticleClicked, setIsParticleClicked] = useState(false);
  const [targetPosition, setTargetPosition] = useState([0, 0, 0]);
  const [showNameText, setShowNameText] = useState(true);

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
      const duration = 1000;

      const checkPosition = () => {
        const currentPosition = new THREE.Vector3().copy(camera.position);
        if (currentPosition.distanceToSquared(endPosition) < 0.25) {
          setShowNameText(false);
        } else {
          setShowNameText(true);
        }
      };

      const animate = () => {
        const elapsedTime = Date.now() - startTime;
        let t = Math.min(1, elapsedTime / duration);
        t = customEasing(t);

        camera.position.lerpVectors(startPosition, endPosition, t);
        camera.quaternion.slerpQuaternions(startQuaternion, endQuaternion, t);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          camera.position.copy(endPosition);
          setShowNameText(false); // Hide the NameText when animation is complete and camera is in end position
        }
      };

      animate();
    }
  }, [cameraRef, isLoaded]);

  const handleBackgroundClick = () => {
    if (cameraRef.current) {
      const currentPos = cameraRef.current.position;
      const epsilon = 0.5;

      function isPositionCloseEnough(pos1, pos2, tolerance) {
        return Math.abs(pos1.x - pos2.x) < tolerance &&
               Math.abs(pos1.y - pos2.y) < tolerance &&
               Math.abs(pos1.z - pos2.z) < tolerance;
      }

      if (isPositionCloseEnough(currentPos, endPosition, epsilon)) {
        return;
      }
      setIsParticleClicked(false);
      setTargetPosition(endPosition.toArray());
      cameraRef.current.position.copy(endPosition);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Canvas onPointerMissed={handleBackgroundClick}>
        <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 0, 0]} fov={90} />
        <ambientLight intensity={0.5} />
        <Suspense fallback={<Html><div>Loading...</div></Html>}>
          <ParticleComponent onLoaded={setIsLoaded} targetPosition={targetPosition} setTargetPosition={setTargetPosition} showNameText={showNameText} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;