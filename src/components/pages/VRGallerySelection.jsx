import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGalleryData } from '../../vr-gallery/hooks/useGalleryData';
import { buildGalleryCatalog } from '../../vr-gallery/utils/galleryCatalog';
import { preloadBinaryAsset } from '../../vr-gallery/utils/preloadAsset';

const VRGallerySelection = () => {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const { loading, error, artist, galleries } = useGalleryData(artistId);

  const galleryOptions = useMemo(() => {
    const list = buildGalleryCatalog(galleries);
    return list.length > 0 ? list : buildGalleryCatalog([]);
  }, [galleries]);

  return (
    <div className="min-h-screen text-white px-4 py-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(135deg,#050816_0%,#0a1020_55%,#05070f_100%)]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.34em] text-cyan-200">VR Gallery Selection</p>
          <h1 className="text-3xl sm:text-5xl font-bold mt-3">Choose a gallery environment</h1>
          <p className="text-sm text-slate-300 mt-3 max-w-2xl">
            Each gallery loads its own model, palette, and artwork grouping from the database so the rooms no longer look identical.
          </p>
          {artist?.artist_name && (
            <p className="text-xs text-slate-400 mt-2">Artist: {artist.artist_name}</p>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-slate-200 backdrop-blur">
            Loading galleries...
          </div>
        )}

        {error && !loading && (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 px-6 py-6 text-sm text-rose-100">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {galleryOptions.map((gallery) => (
              <button
                key={gallery.id || gallery.slug}
                type="button"
                onClick={() => {
                  void preloadBinaryAsset(gallery.modelUrl || gallery.model_url || '');
                  navigate(`/vr-gallery/${artistId}/${gallery.slug}`);
                }}
                onFocus={() => {
                  void preloadBinaryAsset(gallery.modelUrl || gallery.model_url || '');
                }}
                className="group text-left rounded-[1.5rem] border border-white/10 bg-white/6 backdrop-blur-xl overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:border-cyan-300/40"
              >
                <div
                  className="h-40 relative"
                  style={{
                    background: `linear-gradient(135deg, ${gallery.palette?.accent || '#38bdf8'} 0%, ${gallery.palette?.background || '#111827'} 100%)`,
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_40%)]" />
                  <div className="absolute left-4 bottom-4 right-4">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">{gallery.themeKey}</p>
                    <h2 className="text-2xl font-semibold mt-1 text-white drop-shadow">{gallery.name}</h2>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-300 line-clamp-3 min-h-[3.75rem]">{gallery.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{gallery.artworkCount || 0} artworks</span>
                    <span className="text-cyan-200">Enter gallery</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate(`/artists/${artistId}`)}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-cyan-100"
        >
          Back to Artist Profile
        </button>
      </div>
    </div>
  );
};

export default VRGallerySelection;
