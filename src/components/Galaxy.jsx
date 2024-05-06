import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Star } from './Star';
import { Haze } from './Haze';
import { ARMS, ARM_X_DIST, ARM_X_MEAN, ARM_Y_DIST, ARM_Y_MEAN, CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS, HAZE_RATIO, NUM_STARS, OUTER_CORE_X_DIST, OUTER_CORE_Y_DIST } from './config/galaxyConfig';
import { gaussianRandom, spiral } from '../utils';

function Galaxy() {
  const stars = useMemo(() => generateObjects(NUM_STARS, (pos) => <Star position={pos} />), []);
  const haze = useMemo(() => generateObjects(NUM_STARS * HAZE_RATIO, (pos) => <Haze position={pos} />), []);

  function generateObjects(numObjects, element) {
    let objects = [];

    // Core stars
    for (let i = 0; i < numObjects / 4; i++) {
      let pos = new THREE.Vector3(gaussianRandom(0, CORE_X_DIST), gaussianRandom(0, CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
      objects.push(element(pos));
    }

    // Outer core stars
    for (let i = 0; i < numObjects / 4; i++) {
      let pos = new THREE.Vector3(gaussianRandom(0, OUTER_CORE_X_DIST), gaussianRandom(0, OUTER_CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
      objects.push(element(pos));
    }

    // Spiral arms
    for (let j = 0; j < ARMS; j++) {
      for (let i = 0; i < numObjects / 4; i++) {
        let pos = spiral(gaussianRandom(ARM_X_MEAN, ARM_X_DIST), gaussianRandom(ARM_Y_MEAN, ARM_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS), j * 2 * Math.PI / ARMS);
        objects.push(element(pos));
      }
    }

    return objects;
  }

  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {stars}
      {haze}
    </Canvas>
  );
}

export default Galaxy;
