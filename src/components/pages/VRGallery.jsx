import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGalleryData } from '../../vr-gallery/hooks/useGalleryData';
import GalleryScene from '../../vr-gallery/GalleryScene';

const VRGallery = () => {
  const { artistId, galleryId } = useParams();
  const navigate = useNavigate();
  const { loading, error, artist, gallery, galleries, artworks } = useGalleryData(artistId, galleryId);
  const [selectedArtwork, setSelectedArtwork] = useState(null);

  const galleryLabel = useMemo(() => gallery?.name || gallery?.slug || galleryId || 'Gallery', [gallery, galleryId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03040a] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-xl font-semibold">Loading VR Gallery...</p>
          <p className="text-sm text-slate-300 mt-2">Preparing the room, textures, and artwork placements.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#03040a] text-white flex items-center justify-center px-4">
        <div className="text-center max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-xl font-semibold">Unable to open VR Gallery</p>
          <p className="text-sm text-rose-200 mt-3">{error}</p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => navigate(`/artists/${artistId}`)}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to artist
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fallbackGallery = gallery || galleries[0] || null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#03040a]">
      <div className="absolute inset-0">
        <GalleryScene
          artist={artist}
          gallery={fallbackGallery}
          artworks={artworks}
          onSelectArtwork={setSelectedArtwork}
          lockSelector="#enter-gallery-button"
        />
      </div>

      <div className="absolute top-4 left-4 z-20 max-w-sm rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-white backdrop-blur-md shadow-2xl">
        <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">VR Gallery</p>
        <p className="font-semibold mt-1">{artist?.artist_name || artist?.full_name || 'Artist'}</p>
        <p className="text-xs text-slate-300 mt-1">{galleryLabel}</p>
      </div>

      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-3">
        {selectedArtwork?.title && (
          <div className="max-w-xs rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-white backdrop-blur-md shadow-2xl">
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Selected Artwork</p>
            <p className="font-semibold mt-1 line-clamp-2">{selectedArtwork.title}</p>
            <p className="text-xs text-slate-400 mt-1">{selectedArtwork.gallery_name || selectedArtwork.gallery_slug || fallbackGallery?.name}</p>
          </div>
        )}

        <button
          id="enter-gallery-button"
          type="button"
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
        >
          Click to walk
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-20 flex gap-3">
        <button
          type="button"
          onClick={() => navigate(`/artists/${artistId}`)}
          className="rounded-full border border-white/20 bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md"
        >
          Exit VR
        </button>
      </div>
    </div>
  );
};

export default VRGallery;
