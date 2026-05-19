import { memo, useEffect, useMemo, useState, useRef } from 'react';
import {
  ClampToEdgeWrapping,
  FrontSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import { Text, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { getImageUrl } from '../../lib/imageUtils';

/**
 * HD Texture Loader - Load full-resolution images without compression
 */
const useHDTexture = (imageUrl) => {
  const textureRef = useRef(null);
  const [texture, setTexture] = useState(null);
  const { gl } = useThree();

  useEffect(() => {
    if (!imageUrl) return;

    const textureLoader = new TextureLoader();
    textureLoader.load(
      imageUrl,
      (loadedTexture) => {
        applyHDTextureSettings(loadedTexture, gl);
        textureRef.current = loadedTexture;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.warn('[ArtworkFrame] Texture load error:', error);
      }
    );
  }, [imageUrl, gl]);

  return texture;
};

/**
 * Apply comprehensive HD texture settings
 */
const applyHDTextureSettings = (texture, gl) => {
  try {
    if ('colorSpace' in texture) {
      texture.colorSpace = SRGBColorSpace;
    }

    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;

    const maxAniso = gl?.capabilities?.getMaxAnisotropy?.() || 16;
    texture.anisotropy = Math.min(maxAniso, 16);
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
  } catch (e) {
    console.warn('[ArtworkFrame] Texture setting error:', e);
  }
};

/**
 * Premium Frame Style Definitions
 */
const frameStyles = {
  matteBlack: {
    outer: '#161616',
    middle: '#242424',
    inner: '#f4f0e7',
    metalness: 0.08,
    roughness: 0.88,
    name: 'Matte Black Premium',
  },
  darkWalnut: {
    outer: '#4a3322',
    middle: '#5e412b',
    inner: '#f4f0e7',
    metalness: 0.1,
    roughness: 0.9,
    name: 'Dark Walnut',
  },
  gold: {
    outer: '#caa23a',
    middle: '#99751d',
    inner: '#fbf7ef',
    metalness: 0.7,
    roughness: 0.28,
    name: 'Gold Gallery',
  },
  silver: {
    outer: '#b8bcc6',
    middle: '#8f949f',
    inner: '#f5f6f8',
    metalness: 0.92,
    roughness: 0.22,
    name: 'Silver Gallery',
  },
  classic: {
    outer: '#caa23a',
    middle: '#99751d',
    inner: '#fbf7ef',
    metalness: 0.68,
    roughness: 0.3,
    name: 'Gallery Classic',
  },
  modern: {
    outer: '#161616',
    middle: '#2b2b2b',
    inner: '#f4f0e7',
    metalness: 0.1,
    roughness: 0.84,
    name: 'Modern Gallery',
  },
};

const clampSize = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Premium Museum-Quality Artwork Frame Component
 * Features:
 * - Professional rectangular frame with depth
 * - Realistic 3D appearance with beveled edges
 * - Premium frame materials (walnut, black, gold, silver)
 * - Proper shadow and lighting
 * - Auto-scaling based on artwork dimensions
 * - Equal border spacing on all sides
 */
const ArtworkFrame = ({
  artwork,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  wall = 'north',
  palette,
  frameScale = 1,
  frameWidth,
  frameHeight,
  frameStyle = 'classic',
  artistName = 'Artist',
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);
  const { gl } = useThree();

  const resolveImageSrc = (art) => {
    if (!art) return null;

    const selectedUrl =
      art.watermarked_image_url ||
      art.watermarkedImage ||
      art.original_image_url ||
      art.originalImage ||
      art.image_url ||
      art.imageUrl ||
      (art.image && (art.image.url || art.image.src)) ||
      (Array.isArray(art.files) && art.files[0] && (art.files[0].url || art.files[0].src)) ||
      art.uploaded_url ||
      art.url ||
      null;

    return selectedUrl ? getImageUrl(selectedUrl) : null;
  };

  const src = resolveImageSrc(artwork);
  const texture = useHDTexture(src);
  const fallbackTexture = useTexture(src || null);
  const finalTexture = texture || fallbackTexture;

  // Frame configuration
  const selectedStyle = frameStyles[frameStyle] || frameStyles.classic;
  
  const imageAspect = useMemo(() => {
    const width = finalTexture?.image?.width || artwork.width || 4;
    const height = finalTexture?.image?.height || artwork.height || 3;
    return width / Math.max(height, 1);
  }, [artwork.height, artwork.width, finalTexture]);

  const outerFrameWidth = Math.max(1.5, (frameWidth || 3.05) * frameScale);
  const outerFrameHeight = Math.max(1.1, (frameHeight || 2.2) * frameScale);
  const shortestSide = Math.min(outerFrameWidth, outerFrameHeight);
  const frameBorderWidth = clampSize(shortestSide * 0.18, 0.24, 0.6);
  const frameLipWidth = clampSize(frameBorderWidth * 0.42, 0.04, 0.12);
  const matBorderWidth = clampSize(shortestSide * 0.07, 0.06, 0.18);
  const frameDepth = clampSize(shortestSide * 0.13, 0.22, 0.42);
  const frameBackDepth = clampSize(shortestSide * 0.05, 0.05, 0.12);
  const imageInsetDepth = frameDepth * 0.28;
  const glassDepth = frameDepth * 0.46;
  const highlightDepth = frameDepth * 0.51;

  const innerWindowWidth = Math.max(0.4, outerFrameWidth - frameBorderWidth * 2);
  const innerWindowHeight = Math.max(0.4, outerFrameHeight - frameBorderWidth * 2);

  // Calculate artwork display size (respecting aspect ratio)
  const maxImageWidth = Math.max(0.28, innerWindowWidth - (matBorderWidth * 2));
  const maxImageHeight = Math.max(0.28, innerWindowHeight - (matBorderWidth * 2));
  
  let imageWidth = maxImageWidth;
  let imageHeight = maxImageHeight;
  const safeAspect = Math.max(imageAspect, 0.25);

  if (safeAspect >= maxImageWidth / maxImageHeight) {
    imageWidth = maxImageWidth;
    imageHeight = maxImageWidth / safeAspect;
  } else {
    imageHeight = maxImageHeight;
    imageWidth = maxImageHeight * safeAspect;
  }

  const matWidth = Math.min(innerWindowWidth, imageWidth + (matBorderWidth * 2));
  const matHeight = Math.min(innerWindowHeight, imageHeight + (matBorderWidth * 2));
  const hoverDepth = hovered ? frameDepth * 1.12 : frameDepth;
  const hoverScale = hovered ? 1.02 : 1;
  const mountDirection = wall === 'east' || wall === 'west' ? -1 : 1;
  const wallPlaneOffset = 0.02;
  const backBoardCenter = mountDirection * ((frameBackDepth / 2) + wallPlaneOffset);
  const frameRailCenter = mountDirection * (frameBackDepth + (hoverDepth / 2) + wallPlaneOffset);
  const matCenter = mountDirection * (frameBackDepth + hoverDepth + 0.016 + wallPlaneOffset);
  const artCenter = mountDirection * (frameBackDepth + hoverDepth + 0.032 + wallPlaneOffset);
  const glassCenter = mountDirection * (frameBackDepth + hoverDepth + 0.048 + wallPlaneOffset);
  const sheenCenter = mountDirection * (frameBackDepth + hoverDepth + 0.052 + wallPlaneOffset);

  return (
    <group position={position} rotation={rotation} scale={hoverScale}>
      {/* Backer board for shadow depth */}
      <mesh position={[0, 0, backBoardCenter]} castShadow receiveShadow renderOrder={1}>
        <boxGeometry args={[outerFrameWidth - 0.02, outerFrameHeight - 0.02, frameBackDepth]} />
        <meshStandardMaterial
          color="#141414"
          roughness={0.95}
          metalness={0.02}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Outer frame rails */}
      <mesh position={[0, outerFrameHeight / 2 - frameBorderWidth / 2, frameRailCenter]} castShadow receiveShadow renderOrder={2}>
        <boxGeometry args={[outerFrameWidth, frameBorderWidth, hoverDepth]} />
        <meshStandardMaterial
          color={selectedStyle.outer}
          metalness={selectedStyle.metalness}
          roughness={selectedStyle.roughness}
          side={FrontSide}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      <mesh position={[0, -(outerFrameHeight / 2 - frameBorderWidth / 2), frameRailCenter]} castShadow receiveShadow renderOrder={2}>
        <boxGeometry args={[outerFrameWidth, frameBorderWidth, hoverDepth]} />
        <meshStandardMaterial
          color={selectedStyle.outer}
          metalness={selectedStyle.metalness}
          roughness={selectedStyle.roughness}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      <mesh position={[-(outerFrameWidth / 2 - frameBorderWidth / 2), 0, frameRailCenter]} castShadow receiveShadow renderOrder={2}>
        <boxGeometry args={[frameBorderWidth, innerWindowHeight, hoverDepth]} />
        <meshStandardMaterial
          color={selectedStyle.middle}
          metalness={selectedStyle.metalness * 0.9}
          roughness={selectedStyle.roughness * 1.02}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      <mesh position={[(outerFrameWidth / 2 - frameBorderWidth / 2), 0, frameRailCenter]} castShadow receiveShadow renderOrder={2}>
        <boxGeometry args={[frameBorderWidth, innerWindowHeight, hoverDepth]} />
        <meshStandardMaterial
          color={selectedStyle.middle}
          metalness={selectedStyle.metalness * 0.9}
          roughness={selectedStyle.roughness * 1.02}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Inner mat */}
      <mesh position={[0, 0, matCenter]} castShadow receiveShadow renderOrder={3}>
        <boxGeometry args={[matWidth, matHeight, 0.03]} />
        <meshPhysicalMaterial
          color={selectedStyle.inner}
          metalness={0}
          roughness={0.96}
          clearcoat={0}
          transmission={0}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Subtle inset lip around the artwork opening */}
      <mesh position={[0, 0, artCenter]} castShadow receiveShadow renderOrder={4}>
        <boxGeometry args={[matWidth - frameLipWidth, matHeight - frameLipWidth, 0.015]} />
        <meshStandardMaterial
          color={selectedStyle.middle}
          metalness={selectedStyle.metalness * 0.4}
          roughness={selectedStyle.roughness * 1.1}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Artwork Image Plane (inner image content) */}
      <mesh
        position={[0, 0, artCenter + 0.002]}
        castShadow={false}
        receiveShadow={false}
        renderOrder={20}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          if (onSelect) onSelect(artwork);
        }}
      >
        <planeGeometry args={[imageWidth, imageHeight]} />
        <meshBasicMaterial
          map={finalTexture}
          transparent={false}
          toneMapped={false}
          side={FrontSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Glass / reflection layer */}
      <mesh position={[0, 0, glassCenter]} castShadow={false} receiveShadow={false} renderOrder={21}>
        <planeGeometry args={[imageWidth + 0.03, imageHeight + 0.03]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.12}
          roughness={0.08}
          metalness={0}
          transmission={0.12}
          clearcoat={1}
          clearcoatRoughness={0.12}
          reflectivity={0.45}
          depthWrite={false}
          side={FrontSide}
        />
      </mesh>

      <mesh position={[imageWidth * 0.2, imageHeight * 0.18, sheenCenter]} renderOrder={22}>
        <planeGeometry args={[Math.max(0.35, imageWidth * 0.46), Math.max(0.12, imageHeight * 0.18)]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={hovered ? 0.1 : 0.06}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {hovered && (
        <mesh position={[outerFrameWidth * 0.24, outerFrameHeight * 0.18, sheenCenter + 0.02]}>
          <circleGeometry args={[0.09 * frameScale, 18]} />
          <meshBasicMaterial
            color="#ffffff"
            opacity={0.08}
            transparent
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      )}
    </group>
  );
};

export default memo(ArtworkFrame);
