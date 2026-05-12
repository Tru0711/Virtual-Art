/* eslint-disable no-unused-vars */
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Sparkles } from '@react-three/drei';

import { MuseumLayout } from './utils/museumLayout.jsx';
import { ArtistSection } from './components/ArtistSection';
import { useMuseumData } from './hooks/useMuseumData';


const MuseumCanvas = ({ apiArtistId }) => {
  const { artists, artworksByArtist, loading, error } = useMuseumData(apiArtistId);
  const museum = useMemo(() => new MuseumLayout({ artistsCount: artists.length }), [artists.length]);

  // Reserved for future: selected artwork modal/hover details
  const [, setSelectedArtwork] = useState(null);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#03040a] text-white">
        Loading museum...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#03040a] text-white">
        {error}
      </div>
    );
  }

  const startPos = museum.startPosition;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: startPos.toArray(), fov: 58, near: 0.1, far: 250 }}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <PointerLockControls selector="#enter-museum-button" />

      {/* World Lighting */}
      <color attach="background" args={[museum.palette.background]} />
      <fog attach="fog" args={[museum.palette.fog, 60, 210]} />

      <ambientLight intensity={museum.palette.ambient} color="#ffffff" />
      <directionalLight
        castShadow
        intensity={museum.palette.directional}
        position={[12, 24, 8]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <hemisphereLight skyColor="#ffffff" groundColor={museum.palette.floor} intensity={0.25} />

      <spotLight
        position={[0, museum.ceilingY - 0.2, 0]}
        angle={0.48}
        penumbra={0.45}
        intensity={1.3}
        distance={80}
        color={museum.palette.spotlight}
        castShadow
      />

      <Sparkles
        count={45}
        scale={[museum.size.x, museum.size.y, museum.size.z]}
        size={1.2}
        speed={0.2}
        color={museum.palette.accent}
        opacity={0.12}
      />

      {/* Museum Shell */}
      <MuseumLayout.Shell museum={museum} />

      {/* Artist sections */}
      {artists.map((artist) => (
        <ArtistSection
          key={artist.id}
          artist={artist}
          placements={museum.getArtistWallPlacements(artist.id, artworksByArtist[artist.id] || [])}
          palette={museum.palette}
          onSelectArtwork={setSelectedArtwork}
        />
      ))}
    </Canvas>
  );
};

export const VRMuseumPage = ({ apiArtistId }) => {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#03040a]">
      <div className="absolute top-4 left-4 z-20 max-w-sm rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-white backdrop-blur-md shadow-2xl">
        <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Virtual Museum</p>
        <p className="text-xs text-slate-300 mt-1">Dynamic artist sections + artworks from database</p>
        <p className="text-xs text-slate-400 mt-1">Click to walk inside the museum</p>
      </div>

      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-3">
        <button
          id="enter-museum-button"
          type="button"
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
        >
          Click to walk
        </button>
      </div>

      <div className="absolute inset-0">
        <MuseumCanvas apiArtistId={apiArtistId} />
      </div>
    </div>
  );
};

export default VRMuseumPage;

