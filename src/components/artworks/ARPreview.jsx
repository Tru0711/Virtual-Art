import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ARButton, XR, Controllers, Hands } from '@react-three/xr';
import { Text, Html } from '@react-three/drei';
import { X, Eye } from 'lucide-react';
import { TextureLoader } from 'three';
import { getImageUrl } from '../../lib/imageUtils';


const ARArtwork = ({ imageUrl, title, onClose }) => {
  const [texture, setTexture] = useState(null);

  React.useEffect(() => {
    const loader = new TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
        // Fallback to default image
        loader.load(
          'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg',
          (fallbackTexture) => setTexture(fallbackTexture)
        );
      }
    );
  }, [imageUrl]);

  if (!texture) {
    return (
      <Html position={[0, 0, -2]}>
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Loading artwork...</p>
        </div>
      </Html>
    );
  }

  return (
    <>
      {/* AR Plane with artwork image */}
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={texture} />
      </mesh>

      {/* Title text */}
      <Text
        position={[0, -1.5, -2]}
        fontSize={0.1}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>

      {/* Close button */}
      <Html position={[1, 1, -2]}>
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
          style={{ fontSize: '16px' }}
        >
          <X size={20} />
        </button>
      </Html>
    </>
  );
};

const ARPreview = ({ artwork, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <X size={20} />
          Close AR Preview
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <ARButton />
      </div>

      <Canvas>
        <XR>
          <Controllers />
          <Hands />
          <Suspense fallback={
            <Html center>
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Loading AR...</p>
              </div>
            </Html>
          }>
            <ARArtwork
              imageUrl={getImageUrl(artwork.image_url)}
              title={artwork.title}
              onClose={onClose}
            />
          </Suspense>
        </XR>
      </Canvas>

      <div className="absolute bottom-4 left-4 right-4 text-white text-center">
        <p className="text-sm opacity-75">
          Point your camera at a surface and tap to place the artwork in AR
        </p>
      </div>
    </div>
  );
};

export default ARPreview;
