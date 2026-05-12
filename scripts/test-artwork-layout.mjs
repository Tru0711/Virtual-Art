import { buildArtworkPlacements, analyzeWallStructure } from '../src/vr-gallery/utils/artworkLayout.js';

const room = { width: 12, depth: 10, height: 20.0 };
const openings = { north: [[-0.6, 0.6]], east: [], west: [[-1.5, -0.5]] };

const cornerPadding = 0.9;

const axisBoundsForWall = (wall, roomWidth, roomDepth) => {
  const isNorth = wall === 'north';
  const wallLength = isNorth ? roomWidth : roomDepth;
  return {
    min: -wallLength / 2 + cornerPadding,
    max: wallLength / 2 - cornerPadding,
  };
};

const makeArtworks = (n) => Array.from({ length: n }, (_, i) => ({ _id: `art-${i+1}` }));

const tests = [1, 8, 16, 24, 50];

for (const n of tests) {
  const artworks = makeArtworks(n);
  const placements = buildArtworkPlacements(artworks, room, { wallOpenings: openings });
  const perWall = {};
  let outOfBounds = 0;

  placements.forEach((p) => {
    perWall[p.wall] = (perWall[p.wall] || 0) + 1;
    const bounds = axisBoundsForWall(p.wall, room.width, room.depth);
    const axisCenter = p.wall === 'north' ? p.position[0] : p.position[2];
    if (axisCenter < bounds.min - 0.001 || axisCenter > bounds.max + 0.001) {
      outOfBounds += 1;
    }
  });

  console.log(`\n--- Test n=${n} --- placements=${placements.length} perWall=${JSON.stringify(perWall)} outOfBounds=${outOfBounds}`);
}

console.log('\nDone tests.');
