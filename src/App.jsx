import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { Canvas, useThree, useFrame, extend, useLoader } from '@react-three/fiber';
import { Suspense } from 'react';
import { Sphere, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

class SimplexNoise {
  constructor(seed) {
      this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
                    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
      this.p = [];
      for (let i = 0; i < 256; i++) {
          this.p[i] = Math.floor(seed * (i + 1) % 256);
      }
      // To remove the need for index wrapping, double the permutation table length
      this.perm = [];
      for(let i = 0; i < 512; i++) {
          this.perm[i] = this.p[i & 255];
      }
  }

  dot(g, x, y, z) {
      return g[0] * x + g[1] * y + g[2] * z;
  }

  noise(xin, yin, zin) {
      let n0, n1, n2, n3; // Noise contributions from the four corners
      // Skew the input space to determine which simplex cell we're in
      let F3 = 1.0 / 3.0;
      let s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
      let i = Math.floor(xin + s);
      let j = Math.floor(yin + s);
      let k = Math.floor(zin + s);
      let G3 = 1.0 / 6.0; // Very nice and simple unskew factor, too
      let t = (i + j + k) * G3;
      let X0 = i - t; // Unskew the cell origin back to (x,y,z) space
      let Y0 = j - t;
      let Z0 = k - t;
      let x0 = xin - X0; // The x,y,z distances from the cell origin
      let y0 = yin - Y0;
      let z0 = zin - Z0;
      // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
      // Determine which simplex we are in.
      let i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
      let i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
      if(x0 >= y0) {
          if(y0 >= z0)
              { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } // X Y Z order
          else if(x0 >= z0)
              { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } // X Z Y order
          else
              { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } // Z X Y order
      }
      else { // x0<y0
          if(y0 < z0)
              { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } // Z Y X order
          else if(x0 < z0)
              { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } // Y Z X order
          else
              { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } // Y X Z order
            }
            // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
            // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
            let x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
            let y1 = y0 - j1 + G3;
            let z1 = z0 - k1 + G3;
            let x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
            let y2 = y0 - j2 + 2.0 * G3;
            let z2 = z0 - k2 + 2.0 * G3;
            let x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
            let y3 = y0 - 1.0 + 3.0 * G3;
            let z3 = z0 - 1.0 + 3.0 * G3;
            // Work out the hashed gradient indices of the four simplex corners
            let ii = i & 255;
            let jj = j & 255;
            let kk = k & 255;
            let gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
            let gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
            let gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
            let gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;
            // Calculate the contribution from the four corners
            let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
            if(t0<0) n0 = 0.0;
            else {
                t0 *= t0;
                n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0);
            }
            let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
            if(t1<0) n1 = 0.0;
            else {
                t1 *= t1;
                n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1);
            }
            let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
            if(t2<0) n2 = 0.0;
            else {
                t2 *= t2;
                n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2);
            }
            let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
            if(t3<0) n3 = 0.0;
            else {
                t3 *= t3;
                n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3);
            }
            // Add contributions from each corner to get the final noise value.
            // The result is scaled to stay just inside [-1,1]
            return 32.0 * (n0 + n1 + n2 + n3);
        }
    }

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
