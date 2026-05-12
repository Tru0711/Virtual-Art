import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { buildGalleryCatalog, buildGalleryProfile } from '../utils/galleryCatalog';
import { FORCE_SINGLE_GALLERY_MODEL, SELECTED_GALLERY_MODEL, SELECTED_MODEL_KEY } from '../config';

const initialState = {
  loading: true,
  error: '',
  artist: null,
  gallery: null,
  galleries: [],
  artworks: [],
};

export const useGalleryData = (artistId, gallerySlug) => {
  const [state, setState] = useState(initialState);

  const normalizedGallerySlug = useMemo(() => String(gallerySlug || '').trim(), [gallerySlug]);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      if (!artistId) {
        if (isActive) {
          setState({ ...initialState, loading: false, error: 'Missing artist id.' });
        }
        return;
      }

      try {
        setState((current) => ({ ...current, loading: true, error: '' }));

        const collection = await api.getArtistVrGalleries(artistId);
        const artist = collection?.artist || null;
        const galleries = buildGalleryCatalog(Array.isArray(collection?.galleries) ? collection.galleries : []);
        const artworks = Array.isArray(collection?.artworks) ? collection.artworks : [];

        // If configured to force a single gallery, ignore gallery selection and use a single forced gallery profile
        if (FORCE_SINGLE_GALLERY_MODEL) {
          const forcedGalleryBase = {
            name: 'Gallery',
            slug: SELECTED_MODEL_KEY || 'gallery',
            modelUrl: SELECTED_GALLERY_MODEL?.url,
            modelKey: SELECTED_MODEL_KEY || 'vr_gallery',
            themeKey: 'modern',
          };

          const forcedProfile = buildGalleryProfile(forcedGalleryBase, artworks.length);

          if (isActive) {
            setState({
              loading: false,
              error: '',
              artist,
              gallery: forcedProfile,
              galleries: [forcedProfile],
              artworks,
            });
          }
        } else {
          let gallery = null;
          if (normalizedGallerySlug) {
            gallery = galleries.find((item) => String(item.slug) === normalizedGallerySlug || String(item.id) === normalizedGallerySlug) || null;
          }

          if (!gallery) {
            if (collection?.gallery) {
              gallery = buildGalleryProfile(collection.gallery, artworks.length);
            } else if (galleries.length > 0) {
              gallery = galleries[0];
            } else if (artworks.length > 0) {
              gallery = buildGalleryProfile({}, artworks.length);
            }
          }

          if (gallery && normalizedGallerySlug && gallery.slug !== normalizedGallerySlug) {
            try {
              const detail = await api.getArtistVrGallery(artistId, normalizedGallerySlug);
              if (detail?.gallery) {
                gallery = buildGalleryProfile(detail.gallery, Array.isArray(detail.artworks) ? detail.artworks.length : artworks.length);
              }
            } catch (detailError) {
              if (import.meta.env.DEV) {
                console.warn('VR gallery detail fetch failed, using collection fallback:', detailError);
              }
            }
          }

          const selectedGallery = gallery || galleries[0] || buildGalleryProfile({}, artworks.length);

          if (isActive) {
            setState({
              loading: false,
              error: '',
              artist,
              gallery: selectedGallery,
              galleries,
              artworks,
            });
          }
        }
      } catch (error) {
        if (isActive) {
          setState({
            ...initialState,
            loading: false,
            error: error?.message || 'Failed to load VR gallery data.',
          });
        }
      }
    };

    loadData();

    return () => {
      isActive = false;
    };
  }, [artistId, normalizedGallerySlug]);

  return state;
};
