import { useState, useMemo, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import { Sphere } from '@react-three/drei';

function Particles({ onLoaded }) {
  useEffect(() => {
    // Simulate any setup or asynchronous operations
    setTimeout(() => {
      onLoaded(true); // Notify that Particles is loaded
    }, 1000); // Assuming it takes 1 second to "load"
  }, [onLoaded]);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 10000; i++) {
      const x = Math.random() * 40 - 10; // Random x between -10 and 10
      const y = Math.random() * 100 - 10; // Random y between -10 and 10
      const z = Math.random() * 50 - 10; // Random z between -10 and 10
      temp.push({ position: [x, y, z], key: i });
    }
    return temp;
  }, []);

  const { camera } = useThree();
  const [targetPosition, setTargetPosition] = useState([0, 0, 0]);
  const [isParticleClicked, setIsParticleClicked] = useState(false);

  useFrame(() => {
    if (isParticleClicked) {
      camera.position.lerp({ x: targetPosition[0], y: targetPosition[1], z: targetPosition[2] + 5 }, 0.1);
    }
  });

  const particleScale = 0.1;

  return (
    <>
      {particles.map(particle => (
        <Sphere key={particle.key} position={particle.position} scale={particleScale} onClick={() => {
          setTargetPosition(particle.position);
          setIsParticleClicked(true);
        }}>
          <meshStandardMaterial attach="material" color="#FFFFFF" />
        </Sphere>
      ))}
    </>
  );
}

function CameraAnimator({ active, onAnimationComplete }) {
  const { camera } = useThree();
  const duration = 2; // Duration of the animation in seconds
  const initialPosition = new THREE.Vector3(0, 0, -5);
  const finalPosition = new THREE.Vector3(0, 0, 0);
  const initialRotation = new THREE.Euler(90 * Math.PI / 180, 90 * Math.PI / 180, 0, 'XYZ');
  const finalRotation = new THREE.Euler(0, 0, 0, 'XYZ');

  useFrame((state, delta) => {
    if (!active) return;

    let progress = state.clock.getElapsedTime() / duration;
    if (progress > 1) progress = 1;

    // Interpolate position
    camera.position.lerpVectors(initialPosition, finalPosition, progress);

    // Interpolate rotation using slerp for quaternions
    const initialQuaternion = new THREE.Quaternion().setFromEuler(initialRotation);
    const finalQuaternion = new THREE.Quaternion().setFromEuler(finalRotation);
    THREE.Quaternion.slerp(initialQuaternion, finalQuaternion, camera.quaternion, progress);

    if (progress === 1) {
      camera.position.copy(finalPosition);
      camera.rotation.copy(finalRotation);
      onAnimationComplete();
    }
  });

  return null;
}

function App() {
  const [cameraAnimating, setCameraAnimating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setCameraAnimating(true);
    }
  }, [isLoaded]);

  return (
    <div style={{ height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 10], rotation: [0, 0, 0] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={<div>Loading...</div>}>
          <Particles onLoaded={setIsLoaded} />
        </Suspense>
        <CameraAnimator active={cameraAnimating} onAnimationComplete={() => setCameraAnimating(false)} />
      </Canvas>
    </div>
  );
}

export default App;