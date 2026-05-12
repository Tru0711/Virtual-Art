import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, useGLTF } from '@react-three/drei';
import ArtworkFrame from '../components/ArtworkFrame';
import GalleryRoom from '../components/GalleryRoom';
import { buildGalleryProfile } from '../utils/galleryCatalog';
import { analyzeWallStructure, buildArtworkPlacements } from '../utils/artworkLayout';
import { SELECTED_GALLERY_MODEL, FORCE_SINGLE_GALLERY_MODEL, SELECTED_MODEL_KEY } from '../config';
import { Suspense } from 'react';

const CameraController = ({ room, lockSelector }) => {
  const controls = useRef();
  const keys = useRef({});
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const moveDirection = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 1.7, room.depth / 2 - 3.2);
    camera.lookAt(0, 1.7, 0);
  }, [camera, room.depth]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      keys.current[event.code] = true;
    };

    const handleKeyUp = (event) => {
      keys.current[event.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    const controller = controls.current;
    if (!controller || !controller.isLocked) return;

    const moveX = Number(keys.current.KeyD || keys.current.ArrowRight) - Number(keys.current.KeyA || keys.current.ArrowLeft);
    const moveZ = Number(keys.current.KeyS || keys.current.ArrowDown) - Number(keys.current.KeyW || keys.current.ArrowUp);

    moveDirection.set(moveX, 0, moveZ);

    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize();
      state.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, up).normalize();

      const movement = new THREE.Vector3()
        .addScaledVector(right, moveDirection.x)
        .addScaledVector(forward, -moveDirection.z);

      state.camera.position.addScaledVector(movement, delta * 4.2);
    }

    const halfWidth = room.width / 2 - 1.35;
    const halfDepth = room.depth / 2 - 1.35;
    state.camera.position.x = THREE.MathUtils.clamp(state.camera.position.x, -halfWidth, halfWidth);
    state.camera.position.z = THREE.MathUtils.clamp(state.camera.position.z, -halfDepth, halfDepth);
    state.camera.position.y = 1.7;
  });

  return <PointerLockControls ref={controls} selector={lockSelector} />;
};

const ArtworkCluster = ({ placements, palette, artistName, onSelectArtwork }) => {
  const room = placements[0]?.room || null;
  const { camera } = useThree();
  const viewDistance = Math.max(room.width, room.depth) * 1.05;

  return placements.map((placement) => {
    const artwork = placement.artwork;
    const [x, y, z] = placement.position;
    const spotlightY = room ? room.height - 0.2 : 7.2;
    const [normalX, , normalZ] = placement.wallNormal || [0, 0, 0];
    const spotlightPosition = [
      x + normalX * 1.15,
      spotlightY,
      z + normalZ * 1.15,
    ];

    const distance = camera.position.distanceTo(new THREE.Vector3(x, y, z));
    const shouldRenderArtwork = distance <= viewDistance;
    const shouldCastShadow = placement.id === placements[0]?.id;

    return (
      <group key={placement.id}>
        <spotLight
          position={spotlightPosition}
          angle={0.3}
          penumbra={0.55}
          intensity={shouldRenderArtwork ? 1.25 : 0}
          distance={Math.max(10, viewDistance)}
          color={palette.spotlight}
          castShadow={shouldCastShadow}
        />
        {shouldRenderArtwork ? (
          <ArtworkFrame
            artwork={artwork}
            position={placement.position}
            rotation={placement.rotation}
            wall={placement.wall}
            palette={palette}
            frameScale={placement.frameScale}
            frameWidth={placement.frameWidth}
            frameHeight={placement.frameHeight}
            frameStyle={placement.frameStyle}
            artistName={artistName}
            onSelect={onSelectArtwork}
          />
        ) : null}
      </group>
    );
  });
};

const GalleryScene = ({
  artist,
  gallery,
  artworks = [],
  onSelectArtwork,
  lockSelector = '#enter-gallery-button',
}) => {
  const layoutWalls = useMemo(() => ['north', 'east', 'west'], []);
  const sceneGallery = useMemo(() => buildGalleryProfile(gallery || {}, artworks.length), [artworks.length, gallery]);
  // If configured, force the scene to use only the selected gallery model from Galleries/
  if (FORCE_SINGLE_GALLERY_MODEL && SELECTED_GALLERY_MODEL) {
    sceneGallery.modelUrl = SELECTED_GALLERY_MODEL.url;
    sceneGallery.modelScale = SELECTED_GALLERY_MODEL.scale || sceneGallery.modelScale;
    sceneGallery.modelKey = SELECTED_MODEL_KEY || sceneGallery.modelKey;
  }
  const architectureModel = useGLTF(sceneGallery.modelUrl || new URL('../../../Galleries/vr_gallery.glb', import.meta.url).href);
  const analyzedScene = useMemo(() => {
    const scene = architectureModel?.scene?.clone(true);
    if (!scene) return null;

    scene.rotation.y = Math.PI;
    scene.updateMatrixWorld(true);
    return scene;
  }, [architectureModel?.scene]);
  const wallStructure = useMemo(
    () => analyzeWallStructure(analyzedScene, sceneGallery.room),
    [analyzedScene, sceneGallery.room],
  );
  const placementGallery = useMemo(
    () => ({
      ...sceneGallery,
      room: wallStructure.room,
      wallOpenings: wallStructure.wallOpenings,
    }),
    [sceneGallery, wallStructure],
  );

  const placements = useMemo(
    () => buildArtworkPlacements(artworks, placementGallery.room, {
      wallOpenings: placementGallery.wallOpenings,
      allowedWalls: layoutWalls,
    }).map((placement) => ({
      ...placement,
      room: placementGallery.room,
    })),
    [artworks, layoutWalls, placementGallery],
  );

  // Debug: log placement summary to help diagnose missing artwork rendering
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.info('[GalleryScene] placements', placements.length, 'artworks', artworks.length);
      placements.forEach((p, i) => {
        // eslint-disable-next-line no-console
        console.debug(`[GalleryScene] #${i}`, p.id, p.position, p.rotation, p.artwork?.image_url || p.artwork?.imageUrl || p.artwork?.watermarked_image_url);
      });
    } catch (e) {
      // ignore
    }
  }, [placements, artworks]);

  return (
    <Canvas
      shadows
      onCreated={({ gl }) => {
        try {
          // ===== RENDERER OPTIMIZATION FOR HD TEXTURES =====
          // Shadow mapping
          if (gl && 'shadowMap' in gl) {
            gl.shadowMap = gl.shadowMap || {};
            gl.shadowMap.type = THREE.PCFShadowMap;
            gl.shadowMap.autoUpdate = true;
          }
          
          // Lighting
          gl.physicallyCorrectLights = true;
          
          // Texture rendering quality
          gl.gammaOutput = true;
          gl.gammaFactor = 2.2;
          
          // Performance mode for high-quality rendering
          if (gl.capabilities) {
            gl.capabilities.precision = 'highp';
          }
          
          // Pixel ratio for retina displays
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          gl.setPixelRatio(dpr);
          
          // Power preference for better texture filtering
          gl.info.autoReset = true;
        } catch (e) {
          console.warn('[GalleryScene] Renderer optimization warning:', e);
        }
      }}
      dpr={[1, 2]}
      camera={{
        position: [0, 1.7, placementGallery.room.depth / 2 - 3.2],
        fov: 52,
        near: 0.01,
        far: 200,
        zoom: 1
      }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
        precision: 'highp',
        stencil: false,
        depth: true,
        alpha: false,
        logarithmicDepthBuffer: false,
        failIfMajorPerformanceCaveat: false
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraController room={placementGallery.room} lockSelector={lockSelector} />
      <Suspense fallback={null}>
        <GalleryRoom gallery={placementGallery} />
        <ArtworkCluster
          placements={placements}
          palette={placementGallery.palette}
          artistName={artist?.artist_name || artist?.full_name || 'Artist'}
          onSelectArtwork={onSelectArtwork}
        />
      </Suspense>
    </Canvas>
  );
};

export default GalleryScene;
