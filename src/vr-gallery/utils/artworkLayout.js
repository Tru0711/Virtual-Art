const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const mainWallNames = ['north', 'west', 'east'];
const wallPriority = mainWallNames.reduce((priorityMap, wall, index) => {
  priorityMap[wall] = index;
  return priorityMap;
}, {});

const normalizeRoom = (room = {}) => ({
  width: Math.max(1, Number(room.width ?? room.w ?? 0)),
  depth: Math.max(1, Number(room.depth ?? room.d ?? 0)),
  height: Math.max(1, Number(room.height ?? room.h ?? 0)),
});

const normalizeOpening = (opening) => {
  if (opening == null) return null;

  if (Array.isArray(opening) && opening.length >= 2) {
    const start = Number(opening[0]);
    const end = Number(opening[1]);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return { start: Math.min(start, end), end: Math.max(start, end) };
    }
    return null;
  }

  if (typeof opening === 'number') {
    return { start: opening - 0.75, end: opening + 0.75 };
  }

  if (typeof opening !== 'object') return null;

  const rawStart = opening.start ?? opening.min ?? opening.from ?? opening.left;
  const rawEnd = opening.end ?? opening.max ?? opening.to ?? opening.right;

  if (Number.isFinite(Number(rawStart)) && Number.isFinite(Number(rawEnd))) {
    const start = Number(rawStart);
    const end = Number(rawEnd);
    if (end > start) {
      return { start, end };
    }
  }

  const center = Number(opening.center ?? opening.position ?? opening.x ?? 0);
  const width = Number(opening.width ?? opening.size ?? opening.span ?? opening.length ?? 1.5);
  if (Number.isFinite(center) && Number.isFinite(width) && width > 0) {
    return { start: center - (width / 2), end: center + (width / 2) };
  }

  return null;
};

const normalizeWallOpenings = (wallOpenings = {}) => mainWallNames.reduce((accumulator, wall) => {
  const value = wallOpenings[wall] ?? wallOpenings[`${wall}Openings`] ?? wallOpenings[`${wall}_openings`] ?? [];
  const openings = Array.isArray(value) ? value : [value];

  accumulator[wall] = openings
    .map(normalizeOpening)
    .filter((opening) => opening && Number.isFinite(opening.start) && Number.isFinite(opening.end) && opening.end > opening.start);

  return accumulator;
}, {});

const collectWallOpeningsFromScene = (scene, room) => {
  const sceneOpenings = scene?.userData?.wallOpenings
    ?? scene?.userData?.openings
    ?? scene?.userData?.openingRanges
    ?? room?.wallOpenings
    ?? room?.openings
    ?? {};

  return normalizeWallOpenings(sceneOpenings);
};

const cutSegments = (start, end, openings, padding) => {
  const sortedOpenings = [...openings]
    .map((opening) => ({ start: opening.start - padding, end: opening.end + padding }))
    .sort((left, right) => left.start - right.start);

  const segments = [];
  let cursor = start;

  sortedOpenings.forEach((opening) => {
    const safeEnd = Math.max(start, Math.min(end, opening.start));
    if (safeEnd > cursor) {
      segments.push({ start: cursor, end: safeEnd, length: safeEnd - cursor });
    }

    cursor = Math.max(cursor, Math.min(end, opening.end));
  });

  if (end > cursor) {
    segments.push({ start: cursor, end, length: end - cursor });
  }

  return segments.filter((segment) => segment.length > 0.05);
};

const buildWallSegments = (room, openings, options = {}) => {
  const normalizedRoom = normalizeRoom(room);
  const allowedWalls = Array.isArray(options.allowedWalls) && options.allowedWalls.length
    ? options.allowedWalls.filter((wall) => mainWallNames.includes(wall))
    : mainWallNames;

  const cornerPadding = Number(options.cornerPadding ?? 0.9);
  const openingPadding = Number(options.openingPadding ?? 1.1);
  const wallInset = Number(options.wallInset ?? 0.12);

  return allowedWalls.map((wall) => {
    const isNorth = wall === 'north';
    const wallLength = isNorth ? normalizedRoom.width : normalizedRoom.depth;
    const wallCoord = isNorth
      ? -normalizedRoom.depth / 2 + wallInset
      : wall === 'west'
        ? -normalizedRoom.width / 2 + wallInset
        : normalizedRoom.width / 2 - wallInset;

    const axisMin = -wallLength / 2 + cornerPadding;
    const axisMax = wallLength / 2 - cornerPadding;
    const wallOpenings = openings?.[wall] || [];
    const segments = cutSegments(axisMin, axisMax, wallOpenings, openingPadding);

    return {
      wall,
      wallCoord,
      wallX: wall === 'north' ? 0 : wallCoord,
      wallZ: wall === 'north' ? wallCoord : 0,
      minBound: axisMin,
      maxBound: axisMax,
      usableWidth: segments.reduce((sum, segment) => sum + segment.length, 0),
      segments,
      normal: isNorth ? [0, 0, 1] : wall === 'west' ? [1, 0, 0] : [-1, 0, 0],
    };
  });
};

export function analyzeWallStructure(scene, room = {}) {
  const normalizedRoom = normalizeRoom(room);

  return {
    room: normalizedRoom,
    wallOpenings: collectWallOpeningsFromScene(scene, room),
  };
}

export function buildArtworkPlacements(artworks = [], room = {}, options = {}) {
  if (!Array.isArray(artworks) || artworks.length === 0) return [];
  const normalizedRoom = normalizeRoom(room);
  const wallOrder = ['north', 'east', 'west'];
  const allowedWalls = Array.isArray(options.allowedWalls) && options.allowedWalls.length
    ? wallOrder.filter((wall) => options.allowedWalls.includes(wall))
    : wallOrder;
  const orderedWalls = wallOrder.filter((wall) => allowedWalls.includes(wall));
  const perWallCapacity = 8;
  const maxPlacements = orderedWalls.length * perWallCapacity;
  const cappedArtworks = artworks.slice(0, maxPlacements);

  if (artworks.length > maxPlacements) {
    // eslint-disable-next-line no-console
    console.warn('[artworkLayout] artwork count exceeds strict 3-wall grid capacity; extra artworks were not placed', {
      artworkCount: artworks.length,
      maxPlacements,
    });
  }

  const wallMeasurements = orderedWalls.map((wall) => {
    const wallLength = wall === 'north' ? normalizedRoom.width : normalizedRoom.depth;
    return Math.max(0.5, wallLength - 1.8);
  });
  const minUsableSpan = wallMeasurements.length > 0
    ? Math.min(...wallMeasurements)
    : Math.max(4, Math.min(normalizedRoom.width, normalizedRoom.depth) - 1.8);

  const preferredFrameWidth = clamp(minUsableSpan / 5.55, 1.45, 2.9);
  const preferredGap = clamp(preferredFrameWidth * 0.28, 0.35, 0.68);
  const preferredGridSpan = (preferredFrameWidth * 4) + (preferredGap * 3);
  const scale = preferredGridSpan > minUsableSpan ? (minUsableSpan / preferredGridSpan) : 1;
  const frameWidth = preferredFrameWidth * scale;
  const frameHeight = clamp(frameWidth * 0.74, 1.05, 2.25);
  const gap = preferredGap * scale;

  const topRowY = clamp(1.8, frameHeight / 2 + 0.55, normalizedRoom.height - (frameHeight / 2) - 0.9);
  const bottomRowY = clamp(1.1, frameHeight / 2 + 0.35, topRowY - Math.max(0.48, frameHeight * 0.62));

  const wallPositionByName = {
    north: { coord: -normalizedRoom.depth / 2 + 0.12, rotation: [0, 0, 0] },
    east: { coord: normalizedRoom.width / 2 - 0.12, rotation: [0, -Math.PI / 2, 0] },
    west: { coord: -normalizedRoom.width / 2 + 0.12, rotation: [0, Math.PI / 2, 0] },
  };

  const placements = [];
  cappedArtworks.forEach((artwork, index) => {
    const wallIndex = Math.min(Math.floor(index / perWallCapacity), orderedWalls.length - 1);
    const wall = orderedWalls[wallIndex];
    const wallConfig = wallPositionByName[wall];

    if (!wallConfig) {
      return;
    }

    const slotIndex = index % perWallCapacity;
    const row = Math.floor(slotIndex / 4);
    const column = slotIndex % 4;
    const rowY = row === 0 ? topRowY : bottomRowY;
    const gridWidth = (frameWidth * 4) + (gap * 3);
    const startOffset = -gridWidth / 2 + frameWidth / 2;
    const axisCenter = startOffset + (column * (frameWidth + gap));
    const position = wall === 'north'
      ? [axisCenter, rowY, wallConfig.coord]
      : [wallConfig.coord, rowY, axisCenter];

    placements.push({
      id: artwork._id || artwork.id || `artwork-${placements.length}`,
      artwork,
      position,
      rotation: wallConfig.rotation,
      wall,
      row,
      column,
      frameStyle: 'gold',
      frameScale: 1,
      frameWidth,
      frameHeight,
      labelOffset: 0.95,
      wallNormal: wall === 'north' ? [0, 0, 1] : wall === 'east' ? [-1, 0, 0] : [1, 0, 0],
    });
  });

  return placements;
}
