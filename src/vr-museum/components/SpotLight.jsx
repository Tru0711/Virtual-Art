import { memo } from 'react';

export const SpotLight = memo(function SpotLight({ position, palette }) {
  return (
    <spotLight
      position={position}
      angle={0.32}
      penumbra={0.42}
      intensity={1.6}
      distance={18}
      color={palette?.spotlight || '#fff3d6'}
      castShadow
    />
  );
});

