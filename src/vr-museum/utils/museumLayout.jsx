import React from 'react';
import { Vector3 } from 'three';

export class MuseumLayout {
  constructor({ artistsCount = 1 } = {}) {
    this.palette = {
      background: '#0b0f1a',
      fog: '#1b2236',
      floor: '#141a24',
      wall: '#f5efe8',
      ceiling: '#fbf8f4',
      accent: '#6b5bd2',
      ambient: 0.75,
      directional: 1.05,
      spotlight: '#fff3d6',
      text: '#f8f3ec',
    };

    const width = 70;
    const depth = 70;
    const height = 10;
    this.size = new Vector3(width, height, depth);
    this.ceilingY = height;

    this.startPosition = new Vector3(0, 1.7, -22);

    this.bounds = {
      minX: -width / 2 + 2,
      maxX: width / 2 - 2,
      minZ: -depth / 2 + 2,
      maxZ: depth / 2 - 2,
      minY: 1.2,
      maxY: 2.2,
    };
  }

  getArtistWallPlacements(artistId, artworks) {
    const list = Array.isArray(artworks) ? artworks : [];

    const wallInsetZ = 1.05;
    const wallHeightY = 3.2;

    const sectionSlots = this._sectionSlots(list.length);

    const cols = sectionSlots.cols;
    const rows = sectionSlots.rows;
    const gapX = 0.78;
    const gapY = 1.45;

    const artworkOuterW = 1.95;
    const artworkOuterH = 1.45;

    const placement = [];

    const artistIndex = this._artistIndex(artistId);

    const wallConfigs = [
      { pos: new Vector3(-16.5, 0, -3.5), rotationY: 0 },
      { pos: new Vector3(16.5, 0, -3.5), rotationY: Math.PI },
      { pos: new Vector3(0, 0, -20.5), rotationY: Math.PI / 2 },
      { pos: new Vector3(0, 0, 20.5), rotationY: -Math.PI / 2 },
    ];

    const cfg = wallConfigs[artistIndex % wallConfigs.length];

    const startX = cfg.pos.x - ((cols - 1) * (artworkOuterW + gapX)) / 2;
    const startY = wallHeightY + ((rows - 1) * gapY) / 2;

    for (let i = 0; i < list.length; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;

      const x = startX + c * (artworkOuterW + gapX);
      const y = startY - r * (artworkOuterH + gapY);

      const wallLocalZ = wallInsetZ;
      let position;
      let rotation;

      if (Math.abs(cfg.rotationY) < 1e-6) {
        position = [x, y, cfg.pos.z + wallLocalZ];
        rotation = [0, 0, 0];
      } else {
        position = [x, y, cfg.pos.z - wallLocalZ];
        rotation = [0, cfg.rotationY, 0];
      }

      placement.push({
        id: String(list[i]?._id || list[i]?.id || `a-${i}`),
        artwork: list[i],
        position,
        rotation,
        wall: 'artist-wall',
        frameStyle: list[i]?.frameStyle || list[i]?.frame_style || 'classic',
        frameScale: 1,
        frameWidth: artworkOuterW,
        frameHeight: artworkOuterH,
      });
    }

    return placement;
  }

  _artistIndex(artistId) {
    const s = String(artistId || '');
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash + s.charCodeAt(i) * (i + 1)) % 100000;
    return hash;
  }

  _sectionSlots(artworkCount) {
    const capped = Math.min(artworkCount, 48);
    const cols = 4;
    const rows = Math.max(1, Math.ceil(capped / cols));
    return { cols, rows };
  }
}

export function Shell({ museum }) {
  const w = museum.size.x;
  const d = museum.size.z;
  const h = museum.size.y;
  const wallT = 0.18;

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={museum.palette.floor} roughness={0.95} metalness={0.02} />
      </mesh>

      <mesh position={[0, h, 0]} rotation-x={Math.PI / 2} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={museum.palette.ceiling} roughness={0.98} metalness={0.01} />
      </mesh>

      <mesh position={[0, h / 2, -d / 2]} receiveShadow castShadow>
        <boxGeometry args={[w, h, wallT]} />
        <meshStandardMaterial color={museum.palette.wall} roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh position={[0, h / 2, d / 2]} receiveShadow castShadow>
        <boxGeometry args={[w, h, wallT]} />
        <meshStandardMaterial color={museum.palette.wall} roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]} rotation-y={Math.PI / 2} receiveShadow castShadow>
        <boxGeometry args={[d, h, wallT]} />
        <meshStandardMaterial color={museum.palette.wall} roughness={0.9} metalness={0.03} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} rotation-y={Math.PI / 2} receiveShadow castShadow>
        <boxGeometry args={[d, h, wallT]} />
        <meshStandardMaterial color={museum.palette.wall} roughness={0.9} metalness={0.03} />
      </mesh>

      {/* Hallway dividers (premium feel) */}
      <mesh position={[-14, h / 2, -10]} receiveShadow castShadow>
        <boxGeometry args={[0.35, h, 22]} />
        <meshStandardMaterial color={museum.palette.wall} roughness={0.9} metalness={0.03} />
      </mesh>
      <mesh position={[14, h / 2, -10]} receiveShadow castShadow>
        <boxGeometry args={[0.35, h, 22]} />
        <meshStandardMaterial color={museum.palette.wall} roughness={0.9} metalness={0.03} />
      </mesh>

      <mesh position={[0, h / 2, 10]} receiveShadow castShadow>
        <boxGeometry args={[28, h, 0.35]} />
        <meshStandardMaterial color={museum.palette.wall} roughness={0.9} metalness={0.03} />
      </mesh>
    </>
  );
}

