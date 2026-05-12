import { memo, useMemo } from 'react';
import { SpotLight } from './SpotLight';
import { ArtworkWallFrame } from './ArtworkWallFrame';

export const ArtistSection = memo(function ArtistSection({ artist, placements, artworks, palette, onSelectArtwork }) {
  const name = artist?.artist_name || artist?.full_name || 'Artist';

  const wallLabelPosition = useMemo(() => {
    // Put label near first placement if available
    const p = placements[0]?.position;
    if (!p) return [0, 4.8, 0];
    return [p[0], 4.8, p[2]];
  }, [placements]);

  return (
    <group>
      {placements.map((pl, idx) => (
        <group key={pl.id || idx}>
          <SpotLight position={pl.spotPosition || [pl.position[0], 8.2, pl.position[2]]} palette={palette} />
          <ArtworkWallFrame
            artwork={pl.artwork}
            position={pl.position}
            rotation={pl.rotation}
            palette={palette}
            frameStyle={pl.frameStyle}
            frameScale={pl.frameScale}
            artistName={name}
            onSelect={onSelectArtwork}
          />
        </group>
      ))}

      {/* optional section label */}
      {/* Text component not used to avoid font loading complexity in this phase */}
      <mesh position={wallLabelPosition}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.0} />
      </mesh>
    </group>
  );
});

