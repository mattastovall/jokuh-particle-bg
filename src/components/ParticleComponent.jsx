import { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { TextureLoader, Vector2, Vector3, SphereGeometry, MeshBasicMaterial, Mesh, Raycaster } from 'three';

function ParticleComponent({ onLoaded, targetPosition, setTargetPosition, showNameText, setShowNameText, selectParticle }) {
  const { camera } = useThree();
  const refGroup = useRef();
  const interactionSphereRef = useRef();

  const [selectedParticle, setSelectedParticle] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const texture = new TextureLoader().load('/Circle.png');
  const particleScale = 0.05;

  const particleCount = 900;
  const spacing = 5;
  const noiseScale = 0.1;
  const sideLength = Math.ceil(Math.cbrt(particleCount));
  const gridDimensions = { x: sideLength, y: sideLength, z: sideLength };
  const seed = 12345;
  const particles = useConsistentNoiseUpdate(particleCount, spacing, gridDimensions, noiseScale, seed);

  // Create the invisible sphere
  const sphereRadius = 10; // Adjust the radius based on your needs
  const sphereGeometry = new SphereGeometry(sphereRadius, 32, 32);
  const sphereMaterial = new MeshBasicMaterial({ visible: false }); // Invisible material
  const interactionSphere = new Mesh(sphereGeometry, sphereMaterial);
  
  useFrame((state, delta) => {
    if (refGroup.current) {
      const rotationSpeed = 0.01;
      const smoothDelta = Math.min(delta, 0.016);
      refGroup.current.rotation.x += smoothDelta * rotationSpeed;
      refGroup.current.children.forEach((child) => {
        if (child instanceof Mesh) {
          child.lookAt(camera.position);
        }
      });
    }

    if (selectedParticle && refGroup.current) {
      const particleWorldPosition = new Vector3(...selectedParticle.position);
      refGroup.current.localToWorld(particleWorldPosition);

      if (isAnimating) {
        const targetVec = new Vector3(particleWorldPosition.x, particleWorldPosition.y, particleWorldPosition.z + 0.5);
        camera.position.lerp(targetVec, 0.05);
        if (camera.position.distanceTo(targetVec) < 0.01) {
          setIsAnimating(false);
        }
      }
      camera.lookAt(particleWorldPosition);
    }
  });

  useEffect(() => {
    if (refGroup.current) {
      refGroup.current.add(interactionSphere); // Add the sphere to the group
      interactionSphereRef.current = interactionSphere; // Assign the ref
    }
    onLoaded(true);
  }, [onLoaded]);

  const raycaster = new Raycaster();
  raycaster.params.Points.threshold = 9999999999;

  const onMouseClick = (event) => {
    const mouse = new Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const zoomFactor = camera.zoom;
    raycaster.params.Points.threshold = 10 * zoomFactor;
    const intersects = raycaster.intersectObjects([interactionSphereRef.current]);

    if (intersects.length > 0) {
      selectParticle(intersects[0].point);
    }
  };

  useEffect(() => {
    window.addEventListener('click', onMouseClick);
    return () => {
      window.removeEventListener('click', onMouseClick);
    };
  }, []);

  return (
    <group ref={refGroup}>
      {particles.map((particle, index) => (
        <mesh
          key={index}
          position={particle.position}
          scale={particleScale}
          onClick={(event) => {
            const mouse = new Vector2(
              (event.clientX / window.innerWidth) * 2 - 1,
              -(event.clientY / window.innerHeight) * 2 + 1
            );
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([event.object]);
            if (intersects.length > 0) {
              event.stopPropagation();
              console.log('Particle clicked:', particle);
              startAnimation(particle);
              selectParticle(particle.position);
            }
          }}
        >
          <meshStandardMaterial attach="material" color="white" emissive="white" transparent opacity={Math.max(0.2, opacity)} map={texture} />
        </mesh>
      ))}
      {selectedParticle && (
        <NameText position={[selectedParticle.position[0], selectedParticle.position[1] + 0.1, selectedParticle.position[2]]} name="Particle Name" />
      )}
    </group>
  );
}

export default ParticleComponent;
