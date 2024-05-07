import * as THREE from 'three';
import { useMemo, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { gaussianRandom, spiral } from '../utils';
import { ARMS, ARM_X_DIST, ARM_X_MEAN, ARM_Y_DIST, ARM_Y_MEAN, CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS, OUTER_CORE_X_DIST, OUTER_CORE_Y_DIST } from './config/galaxyConfig';

const GalaxyView = () => {
  const particles = useMemo(() => generateObjects(5000, (pos, key) => ({
    position: [pos.x, pos.y, pos.z],
    key: key
  })), []);

  function generateObjects(numObjects, element) {
    let objects = [];

    // Core particles
    for (let i = 0; i < numObjects / 4; i++) {
      let pos = new THREE.Vector3(
        gaussianRandom(0, CORE_X_DIST), 
        gaussianRandom(0, CORE_Y_DIST), 
        gaussianRandom(0, GALAXY_THICKNESS)
      );
      objects.push(element(pos, i));
    }

    // Outer core particles
    for (let i = numObjects / 4; i < numObjects / 2; i++) {
      let pos = new THREE.Vector3(
        gaussianRandom(0, OUTER_CORE_X_DIST), 
        gaussianRandom(0, OUTER_CORE_Y_DIST), 
        gaussianRandom(0, GALAXY_THICKNESS)
      );
      objects.push(element(pos, i));
    }

    // Spiral arms
    let armSize = numObjects / 2 / ARMS;
    for (let j = 0; j < ARMS; j++) {
      for (let i = 0; i < armSize; i++) {
        let index = numObjects / 2 + j * armSize + i;
        let pos = spiral(
          gaussianRandom(ARM_X_MEAN, ARM_X_DIST), 
          gaussianRandom(ARM_Y_MEAN, ARM_Y_DIST), 
          gaussianRandom(0, GALAXY_THICKNESS), 
          j * 2 * Math.PI / ARMS
        );
        objects.push(element(pos, index));
      }
    }

    return objects;
  }

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
        <mesh key={particle.key} position={particle.position} scale={particleScale} onClick={() => {
          setTargetPosition(particle.position);
          setIsParticleClicked(true);
        }}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial attach="material" color="white" transparent opacity={opacity} />
        </mesh>
      ))}
    </>
  );
};

export default GalaxyView;