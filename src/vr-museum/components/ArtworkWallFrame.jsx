import { memo, useMemo, useState, useEffect } from 'react';
import { SRGBColorSpace } from 'three';
import { RoundedBox, Text, useTexture } from '@react-three/drei';

const FRAME_MATERIALS = {
  classic: { frame: '#8b5e34', edge: '#6f4622', plate: '#171717' },
  modern: { frame: '#111827', edge: '#394150', plate: '#0b1120' },
  floating: { frame: '#e5e7eb', edge: '#bfc5d0', plate: '#0f172a' },
  minimal: { frame: '#f3f4f6', edge: '#cbd5e1', plate: '#111827' },
};

const isValidUrl = (v) => typeof v === 'string' && v.trim().length > 5;

export const ArtworkWallFrame = memo(function ArtworkWallFrame({
  artwork,
  position,
  rotation,
  palette,
  frameScale = 1,
  frameStyle = 'classic',
  artistName,
  onSelect,
}) {
  const [hovered, setHovered] = useState(false);

  const url = artwork?.image_url || artwork?.watermarked_image_url || artwork?.imageUrl || artwork?.watermarkedImage || '';
  const safeUrl = isValidUrl(url) ? url : null;

  // Only call useTexture when we have a URL.
  const texture = useTexture(safeUrl || undefined);

  useEffect(() => {
    if (!texture || !safeUrl) return;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture, safeUrl]);

  const aspect = useMemo(() => {
    const w = texture?.image?.width || artwork?.width || 4;
    const h = texture?.image?.height || artwork?.height || 3;
    return w / Math.max(h, 1);
  }, [texture, artwork]);

  const colors = FRAME_MATERIALS[frameStyle] || FRAME_MATERIALS.classic;

  const outerW = 1.95 * frameScale;
  const outerH = 1.45 * frameScale;
  const innerW = 1.58 * frameScale;
  const innerH = 1.08 * frameScale;
  const safeAspect = Math.max(aspect, 0.25);

  let imgW = innerW;
  let imgH = innerH;
  if (safeAspect >= innerW / innerH) {
    imgW = innerW;
    imgH = innerW / safeAspect;
  } else {
    imgH = innerH;
    imgW = innerH * safeAspect;
  }

  const hoverScale = hovered ? 1.025 : 1;
  const zLift = hovered ? 0.07 : 0.05;

  return (
    <group position={position} rotation={rotation} scale={hoverScale}>
      <group
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(artwork);
          }}
        >
          <RoundedBox args={[outerW, outerH, 0.16]} radius={0.08} smoothness={6} castShadow receiveShadow>
            <meshStandardMaterial color={colors.frame} metalness={0.14} roughness={0.7} />
          </RoundedBox>

          <RoundedBox
            args={[outerW - 0.1, outerH - 0.1, 0.05]}
            radius={0.06}
            position={[0, 0, 0.055]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={colors.edge} metalness={0.08} roughness={0.82} />
          </RoundedBox>

          <mesh position={[0, 0, zLift]} castShadow receiveShadow>
            <planeGeometry args={[imgW, imgH]} />
            <meshStandardMaterial
              map={safeUrl ? texture : null}
              transparent={false}
              roughness={0.55}
              metalness={0.02}
              toneMapped={false}
              color={safeUrl ? '#ffffff' : '#111827'}
            />
          </mesh>

          <mesh position={[0, -outerH / 2 - 0.06, 0.07]} castShadow receiveShadow>
            <boxGeometry args={[outerW * 0.82, 0.12, 0.08]} />
            <meshStandardMaterial color={colors.plate} metalness={0.06} roughness={0.92} />
          </mesh>

          <Text
            position={[0, -outerH / 2 - 0.02, 0.1]}
            fontSize={0.13}
            color={palette?.text || '#f8f3ec'}
            anchorX="center"
            anchorY="middle"
            maxWidth={2.2}
          >
            {artwork?.title || 'Untitled'}
          </Text>

          <Text
            position={[0, -outerH / 2 - 0.21, 0.1]}
            fontSize={0.07}
            color={palette?.text || '#f8f3ec'}
            anchorX="center"
            anchorY="middle"
            maxWidth={2.2}
          >
            {artistName}
          </Text>
        </group>
    </group>

  );
});

