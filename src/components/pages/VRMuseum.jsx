import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import LoadingScreen from '../common/LoadingScreen.jsx';

const VRMuseumPage = lazy(() => import('../../vr-museum/MuseumScene'));

const VRMuseum = () => {
  const { artistId } = useParams();
  return (
    <Suspense fallback={<LoadingScreen variant="immersive" title="Loading Virtual Museum" subtitle="Resolving the museum scene and artwork layout..." />}>
      <VRMuseumPage apiArtistId={artistId} />
    </Suspense>
  );
};

export default VRMuseum;

