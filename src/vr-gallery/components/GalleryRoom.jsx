import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Environment, Sparkles, Text, useGLTF } from '@react-three/drei';
import { SELECTED_GALLERY_MODEL, FORCE_SINGLE_GALLERY_MODEL } from '../config';

const GalleryArchitecture = ({ gallery }) => {
  const model = useGLTF(gallery.modelUrl);
  const scene = useMemo(() => model.scene.clone(true), [model.scene]);

  return (
    <primitive
      object={scene}
      scale={gallery.modelScale || 1}
      position={[0, 0, 0]}
      rotation={[0, Math.PI, 0]}
    />
  );
};

const GalleryRoom = ({ gallery }) => {
  const room = gallery.room;
  const palette = gallery.palette;
  const width = room.width;
  const depth = room.depth;
  const height = room.height;
  const wallThickness = 0.18;

  const ceilingPosition = height;
  const lightPositions = useMemo(() => ([
    [0, height - 0.2, 0],
    [-width / 2 + 2, height - 0.3, -depth / 2 + 2],
    [width / 2 - 2, height - 0.3, -depth / 2 + 2],
    [-width / 2 + 2, height - 0.3, depth / 2 - 2],
    [width / 2 - 2, height - 0.3, depth / 2 - 2],
  ]), [depth, height, width]);

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.fog, Math.max(width, depth), Math.max(width, depth) * 2.8]} />

      <ambientLight intensity={palette.ambient} color="#fff7ef" />
      <directionalLight
        castShadow
        position={[4, height + 6, 5]}
        intensity={palette.directional}
        color="#ffffff"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight skyColor="#ffffff" groundColor={palette.floor} intensity={0.3} />

      {/* If a model URL is provided (and we're forcing a single gallery model), avoid rendering the procedural architecture to prevent duplicates. */}
      {!(gallery.modelUrl) && (
        <>
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[width, depth]} />
            <meshStandardMaterial color={palette.floor} roughness={0.9} metalness={0.04} />
          </mesh>

          <mesh position={[0, ceilingPosition, 0]} rotation-x={Math.PI / 2} receiveShadow>
            <planeGeometry args={[width, depth]} />
            <meshStandardMaterial color={palette.ceiling} roughness={0.95} metalness={0.02} />
          </mesh>

          <mesh position={[0, height / 2, -depth / 2]} receiveShadow castShadow>
            <boxGeometry args={[width, height, wallThickness]} />
            <meshStandardMaterial color={palette.wall} roughness={0.88} metalness={0.04} />
          </mesh>
          <mesh position={[0, height / 2, depth / 2]} receiveShadow castShadow>
            <boxGeometry args={[width, height, wallThickness]} />
            <meshStandardMaterial color={palette.wall} roughness={0.88} metalness={0.04} />
          </mesh>
          <mesh position={[-width / 2, height / 2, 0]} rotation-y={Math.PI / 2} receiveShadow castShadow>
            <boxGeometry args={[depth, height, wallThickness]} />
            <meshStandardMaterial color={palette.wall} roughness={0.9} metalness={0.03} />
          </mesh>
          <mesh position={[width / 2, height / 2, 0]} rotation-y={Math.PI / 2} receiveShadow castShadow>
            <boxGeometry args={[depth, height, wallThickness]} />
            <meshStandardMaterial color={palette.wall} roughness={0.9} metalness={0.03} />
          </mesh>
        </>
      )}

      {lightPositions.slice(0, 2).map((position, index) => (
        <spotLight
          key={`room-spot-${index}`}
          position={position}
          angle={0.45}
          penumbra={0.5}
          intensity={1.05}
          distance={Math.max(width, depth) * 1.2}
          color={palette.spotlight}
          castShadow={false}
        />
      ))}

      <pointLight position={[0, height - 0.1, 0]} intensity={0.35} distance={Math.max(width, depth)} color={palette.accent} />

      <Suspense fallback={null}>
        {gallery.modelUrl && <GalleryArchitecture gallery={gallery} />}
      </Suspense>

      <Text
        position={[0, height + 0.2, -depth / 2 + 0.2]}
        fontSize={0.28}
        color={palette.text}
        anchorX="center"
        anchorY="middle"
      >
        {gallery.name}
      </Text>

      <Environment preset="studio" />
      <Sparkles count={35} scale={[width, height, depth]} size={1.4} speed={0.25} color={palette.accent} opacity={0.18} />
    </>
  );
};

// Preload only the forced selected gallery model to avoid loading multiple models.
if (FORCE_SINGLE_GALLERY_MODEL && SELECTED_GALLERY_MODEL?.url) {
  useGLTF.preload?.(SELECTED_GALLERY_MODEL.url);
} else {
  useGLTF.preload?.(new URL('../../../Galleries/vr_gallery.glb', import.meta.url).href);
}

export default GalleryRoom;
