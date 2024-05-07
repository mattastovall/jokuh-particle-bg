import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { Canvas, useThree, useFrame, extend, useLoader } from '@react-three/fiber';
import { Suspense } from 'react';
import { Sphere, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import GalaxyView from './components/GalaxyView'; // Adjust the path as necessary

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

function ParticleComponent({ onLoaded }) {
  const { camera } = useThree();
  const [targetPosition, setTargetPosition] = useState([0, 0, 0]);
  const [isParticleClicked, setIsParticleClicked] = useState(false);
  const opacity = 1; // Set opacity directly to 1
  const particleScale = 0.05; // Adjust size as needed

  useFrame(() => {
    if (isParticleClicked) {
      camera.position.lerp(new THREE.Vector3(targetPosition[0], targetPosition[1], targetPosition[2] + 10), 0.1);
    }
  });

  useEffect(() => {
    setTimeout(() => {
      onLoaded(true);
    }, 1000);
  }, [onLoaded]);

  const particlesRef = useRef();
  const particleColor = "white"; // Set a consistent color for all particles

  const {
    count = 2500,
    radius = 25,
    branches = 5,
    spin = 0.4,
    randomness = 0.03,
    randomnessPower = 2,
    rotationSpeed = 0.01
  } = {}; // Default values, adjust as needed

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.getElapsedTime() * rotationSpeed;
    }
  });

  const particles = useMemo(() => {
    let objects = [];
    for (let i = 0; i < count; i++) {
      const pRadius = Math.random() * radius;
      const sAngle = pRadius * spin;
      const bAngle = ((i % branches) / branches) * Math.PI * 2;
      const rndX = Math.pow(Math.random(), randomnessPower) * (Math.random() > 0.5 ? 1 : -1) * randomness * radius;
      const rndY = Math.pow(Math.random(), randomnessPower) * (Math.random() > 0.5 ? 1 : -1) * randomness * radius;
      const rndZ = Math.pow(Math.random(), randomnessPower) * (Math.random() > 0.5 ? 1 : -1) * randomness * radius;
      const position = [Math.cos(bAngle + sAngle) * pRadius + rndX, rndY, Math.sin(bAngle + sAngle) * pRadius + rndZ];
      objects.push({ position, key: i });
    }
    return objects;
  }, [count, radius, branches, spin, randomness, randomnessPower]);

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
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef();

  useEffect(() => {
    if (isLoaded) {
      // Camera logic on load can be handled if necessary
    }
  }, [isLoaded]);

  useEffect(() => {
    if (cameraRef.current) {
      const camera = cameraRef.current;
      const startPosition = new THREE.Vector3(0, 0, 200);
      const endPosition = new THREE.Vector3(0, 20, 10);
      const startRotation = new THREE.Euler(0, 2, 0);
      const endRotation = new THREE.Euler(-1.1, 0, 0);

      const startQuaternion = new THREE.Quaternion().setFromEuler(startRotation);
      const endQuaternion = new THREE.Quaternion().setFromEuler(endRotation);

      const startTime = Date.now();
      const duration = 2000; // 2 seconds

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
        }
      };

      animate();
    }
  }, [cameraRef, isLoaded]); // Ensure this runs once the camera is ready and loaded

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Canvas>
        <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 0, 0]} fov={90} />
        <ambientLight intensity={0.5} />
        <Suspense fallback={<Html><div>Loading...</div></Html>}>
          <ParticleComponent onLoaded={setIsLoaded} />
          <GalaxyView />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
