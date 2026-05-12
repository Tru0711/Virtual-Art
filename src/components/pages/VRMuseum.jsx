import { VRMuseumPage } from '../../vr-museum/MuseumScene';
import { useParams } from 'react-router-dom';

const VRMuseum = () => {
  const { artistId } = useParams();
  return <VRMuseumPage apiArtistId={artistId} />;
};

export default VRMuseum;

