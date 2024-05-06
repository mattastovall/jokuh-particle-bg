import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { Canvas, useThree, useFrame, extend, useLoader } from '@react-three/fiber';
import { Suspense } from 'react';
import { Sphere, PerspectiveCamera, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
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

function Particles({ onLoaded }) {
  useEffect(() => {
    setTimeout(() => {
      onLoaded(true);
    }, 1000);
  }, [onLoaded]);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 40 - 20;
      const y = Math.random() * 100 - 50;
      const z = Math.random() * 50 - 25;
      temp.push({ position: [x, y, z], key: i });
    }
    return temp;
  }, []);

  const { camera } = useThree();
  const [targetPosition, setTargetPosition] = useState([0, 0, 0]);
  const [isParticleClicked, setIsParticleClicked] = useState(false);
  const opacity = 1; // Set opacity directly to 1

  useFrame(() => {
    if (isParticleClicked) {
      camera.position.lerp({ x: targetPosition[0], y: targetPosition[1], z: targetPosition[2] + 1 }, 0.1);
    }
  });

  const particleScale = 0.05;

  return (
    <>
      {particles.map(particle => (
        <Sphere key={particle.key} position={particle.position} scale={particleScale} onClick={() => {
          setTargetPosition(particle.position);
          setIsParticleClicked(true);
        }}>
          <meshStandardMaterial attach="material" color="white" transparent opacity={opacity} />
        </Sphere>
      ))}
    </>
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
      const startPosition = new THREE.Vector3(0, 0, 200); // Initial position
      const endPosition = new THREE.Vector3(0, 0, 0); // Final position
      const startRotation = new THREE.Euler(10, 2, 10); // Initial rotation
      const endRotation = new THREE.Euler(0, 0, 0); // Final rotation

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
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={<Html><div>Loading...</div></Html>}>
          <Particles onLoaded={setIsLoaded} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
