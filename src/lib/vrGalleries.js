export const vrGalleries = [
  {
    id: 1,
    key: 'looniversal_crypto_arvr_art_gallery',
    name: 'Crypto Gallery',
    model: new URL('../../Galleries/looniversal_crypto_arvr_art_gallery.glb', import.meta.url).href,
  },
  {
    id: 2,
    key: 'modern_vr_art_gallery_pyramid',
    name: 'Pyramid Gallery',
    model: new URL('../../Galleries/modern_vr_art_gallery_pyramid.glb', import.meta.url).href,
  },
  {
    id: 3,
    key: 'vr_art_gallery_01',
    name: 'Classic Gallery',
    model: new URL('../../Galleries/vr_art_gallery_01 (1).glb', import.meta.url).href,
  },
  {
    id: 4,
    key: 'vr_gallery',
    name: 'Simple Gallery',
    model: new URL('../../Galleries/vr_gallery.glb', import.meta.url).href,
  },
  {
    id: 5,
    key: 'vr_gallery_showcase_presentation_building',
    name: 'Showcase Building',
    model: new URL('../../Galleries/vr_gallery_showcase_presentation_building.glb', import.meta.url).href,
  },
  {
    id: 6,
    key: 'vr_round_art_gallery',
    name: 'Round Gallery',
    model: new URL('../../Galleries/vr_round_art_gallery.glb', import.meta.url).href,
  },
];

const normalizeToken = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');

export const resolveArtworkGalleryId = (artwork) => {
  const raw =
    artwork?.gallery_id ||
    artwork?.galleryId ||
    artwork?.gallery ||
    artwork?.gallery_name ||
    artwork?.collection ||
    artwork?.category ||
    '';

  const normalized = normalizeToken(raw);
  if (!normalized) return null;

  const numericValue = Number(raw);
  if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 6) {
    return numericValue;
  }

  const matched = vrGalleries.find((gallery) => {
    const key = normalizeToken(gallery.key);
    const name = normalizeToken(gallery.name);
    const genericName = name.replace('_gallery', '');
    return normalized === key || normalized === name || normalized === genericName;
  });

  return matched?.id ?? null;
};
