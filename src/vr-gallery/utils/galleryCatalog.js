import { normalizeAbsoluteUrl } from '../../lib/appConfig';

const galleryModelAssets = {
  vr_gallery: {
    url: new URL('../../../Galleries/vr_gallery.glb', import.meta.url).href,
    scale: 1,
  },
  modern_vr_art_gallery_pyramid: {
    url: new URL('../../../Galleries/modern_vr_art_gallery_pyramid.glb', import.meta.url).href,
    scale: 1,
  },
  vr_art_gallery_01: {
    url: new URL('../../../Galleries/vr_art_gallery_01 (1).glb', import.meta.url).href,
    scale: 1,
  },
  vr_gallery_showcase_presentation_building: {
    url: new URL('../../../Galleries/vr_gallery_showcase_presentation_building.glb', import.meta.url).href,
    scale: 1,
  },
  vr_round_art_gallery: {
    url: new URL('../../../Galleries/vr_round_art_gallery.glb', import.meta.url).href,
    scale: 1,
  },
  looniversal_crypto_arvr_art_gallery: {
    url: new URL('../../../Galleries/looniversal_crypto_arvr_art_gallery.glb', import.meta.url).href,
    scale: 1,
  },
};

const galleryThemeCatalog = {
  modern: {
    background: '#15161c',
    fog: '#1b1d27',
    floor: '#d8c7b2',
    wall: '#f5efe8',
    ceiling: '#fbf8f4',
    accent: '#6b5bd2',
    ambient: 0.72,
    directional: 1.05,
    spotlight: '#fff3d6',
    text: '#f8f3ec',
  },
  nature: {
    background: '#0f1811',
    fog: '#1d2b20',
    floor: '#bccfb0',
    wall: '#eef5eb',
    ceiling: '#f7fbf7',
    accent: '#4a8f53',
    ambient: 0.8,
    directional: 0.95,
    spotlight: '#fff7db',
    text: '#f4faf3',
  },
  abstract: {
    background: '#130f1d',
    fog: '#241835',
    floor: '#d5c7f3',
    wall: '#f4efff',
    ceiling: '#faf7ff',
    accent: '#ee7bb7',
    ambient: 0.76,
    directional: 1.02,
    spotlight: '#ffefe8',
    text: '#fbf7ff',
  },
  classic: {
    background: '#19140f',
    fog: '#241c16',
    floor: '#ccb79b',
    wall: '#f2e8d7',
    ceiling: '#faf3e7',
    accent: '#ab7b3b',
    ambient: 0.68,
    directional: 1,
    spotlight: '#fff2cc',
    text: '#fff9ef',
  },
  crypto: {
    background: '#0c1014',
    fog: '#172028',
    floor: '#8ca2b6',
    wall: '#e7eef5',
    ceiling: '#f7fbff',
    accent: '#39c3ff',
    ambient: 0.78,
    directional: 1.08,
    spotlight: '#d8f7ff',
    text: '#f4fbff',
  },
  round: {
    background: '#10151a',
    fog: '#1a222b',
    floor: '#ced6e0',
    wall: '#eef3f8',
    ceiling: '#f8fbfd',
    accent: '#f59e0b',
    ambient: 0.74,
    directional: 1.02,
    spotlight: '#fff0d3',
    text: '#f8fbfd',
  },
  showcase: {
    background: '#111214',
    fog: '#1c1f22',
    floor: '#d0c7b8',
    wall: '#f5f2eb',
    ceiling: '#fcfbf8',
    accent: '#4f9cf9',
    ambient: 0.7,
    directional: 1.06,
    spotlight: '#fef0cc',
    text: '#fcfbf8',
  },
};

const normalizeGalleryToken = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const humanizeGalleryName = (value) => {
  const text = String(value || '').trim().replace(/[_-]+/g, ' ');
  return text.replace(/\s+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) || 'Gallery';
};

const hashString = (value) => Array.from(String(value || '')).reduce(
  (sum, character) => sum + character.charCodeAt(0),
  0
);

const pickThemeKey = (slug) => {
  const normalized = normalizeGalleryToken(slug);
  if (normalized.includes('nature') || normalized.includes('garden') || normalized.includes('forest')) return 'nature';
  if (normalized.includes('abstract') || normalized.includes('color')) return 'abstract';
  if (normalized.includes('crypto') || normalized.includes('neon')) return 'crypto';
  if (normalized.includes('round') || normalized.includes('circle')) return 'round';
  if (normalized.includes('showcase') || normalized.includes('presentation')) return 'showcase';
  if (normalized.includes('classic') || normalized.includes('heritage')) return 'classic';
  const themes = ['modern', 'nature', 'abstract', 'classic', 'crypto', 'round', 'showcase'];
  return themes[hashString(normalized) % themes.length];
};

const pickModelKey = (slug) => {
  const normalized = normalizeGalleryToken(slug);
  if (normalized.includes('nature') || normalized.includes('garden')) return 'vr_gallery';
  if (normalized.includes('abstract')) return 'vr_art_gallery_01';
  if (normalized.includes('crypto')) return 'looniversal_crypto_arvr_art_gallery';
  if (normalized.includes('round')) return 'vr_round_art_gallery';
  if (normalized.includes('showcase')) return 'vr_gallery_showcase_presentation_building';
  if (normalized.includes('pyramid')) return 'modern_vr_art_gallery_pyramid';
  if (normalized.includes('classic')) return 'vr_art_gallery_01';
  const models = [
    'vr_gallery',
    'modern_vr_art_gallery_pyramid',
    'vr_art_gallery_01',
    'vr_gallery_showcase_presentation_building',
    'vr_round_art_gallery',
    'looniversal_crypto_arvr_art_gallery',
  ];
  return models[hashString(normalized) % models.length];
};

const pickFrameStyle = (themeKey) => {
  if (themeKey === 'nature') return 'floating';
  if (themeKey === 'crypto') return 'modern';
  if (themeKey === 'abstract') return 'minimal';
  if (themeKey === 'round') return 'modern';
  if (themeKey === 'showcase') return 'classic';
  return 'classic';
};

const getModelAsset = (modelKey) => galleryModelAssets[modelKey] || galleryModelAssets.vr_gallery;

const galleryModelAssetsByFileName = Object.values(galleryModelAssets).reduce((accumulator, asset) => {
  try {
    const fileName = new URL(asset.url).pathname.split('/').pop();
    if (fileName) {
      accumulator[fileName] = asset;
    }
  } catch (error) {
    // ignore malformed asset URLs
  }
  return accumulator;
}, {});

export const resolveGalleryModelUrl = (value, fallbackModelKey = 'vr_gallery') => {
  if (!value) {
    return getModelAsset(fallbackModelKey).url;
  }

  const text = String(value).trim();
  if (!text) {
    return getModelAsset(fallbackModelKey).url;
  }

  if (/^(https?:)?\/\//i.test(text) || text.startsWith('blob:') || text.startsWith('data:')) {
    return text.startsWith('//') ? `https:${text}` : text;
  }

  const fileName = text.split(/[\\/]/).pop();
  if (fileName && galleryModelAssetsByFileName[fileName]) {
    return galleryModelAssetsByFileName[fileName].url;
  }

  if (galleryModelAssets[text]) {
    return galleryModelAssets[text].url;
  }

  if (text.startsWith('/')) {
    const fromBase = normalizeAbsoluteUrl(text, typeof window !== 'undefined' ? window.location.origin : '');
    if (fromBase) {
      return fromBase;
    }
  }

  return getModelAsset(fallbackModelKey).url;
};

export const fallbackGalleryCatalog = [
  {
    id: 1,
    slug: 'modern-art-gallery',
    name: 'Modern Art Gallery',
    themeKey: 'modern',
    modelKey: 'modern_vr_art_gallery_pyramid',
  },
  {
    id: 2,
    slug: 'nature-exhibition',
    name: 'Nature Exhibition',
    themeKey: 'nature',
    modelKey: 'vr_gallery',
  },
  {
    id: 3,
    slug: 'abstract-room',
    name: 'Abstract Room',
    themeKey: 'abstract',
    modelKey: 'vr_art_gallery_01',
  },
  {
    id: 4,
    slug: 'classic-museum',
    name: 'Classic Museum',
    themeKey: 'classic',
    modelKey: 'vr_gallery_showcase_presentation_building',
  },
  {
    id: 5,
    slug: 'crypto-gallery',
    name: 'Crypto Gallery',
    themeKey: 'crypto',
    modelKey: 'looniversal_crypto_arvr_art_gallery',
  },
  {
    id: 6,
    slug: 'round-gallery',
    name: 'Round Gallery',
    themeKey: 'round',
    modelKey: 'vr_round_art_gallery',
  },
].map((gallery) => buildGalleryProfile(gallery, 0));

export function buildGalleryProfile(gallery = {}, artworkCount = 0) {
  const slug = normalizeGalleryToken(
    gallery.slug
    || gallery.gallery_slug
    || gallery.gallerySlug
    || gallery.name
    || gallery.gallery_name
    || 'gallery'
  );
  const name = gallery.name || gallery.gallery_name || humanizeGalleryName(slug);
  const themeKey = gallery.themeKey || gallery.theme_key || pickThemeKey(slug);
  const modelKey = gallery.modelKey || gallery.model_key || pickModelKey(slug);
  const palette = gallery.palette || galleryThemeCatalog[themeKey] || galleryThemeCatalog.modern;
  const modelAsset = getModelAsset(modelKey);
  const resolvedModelUrl = resolveGalleryModelUrl(gallery.modelUrl || gallery.model_url || modelAsset.url, modelKey);
  const roomSize = Math.max(18, 16 + Math.ceil(artworkCount / 4) * 3);

  return {
    ...gallery,
    slug,
    name,
    themeKey,
    modelKey,
    modelUrl: resolvedModelUrl,
    modelScale: modelAsset.scale,
    palette,
    frameStyle: gallery.frameStyle || gallery.frame_style || pickFrameStyle(themeKey),
    room: {
      width: roomSize,
      depth: roomSize,
      height: Math.max(7.5, 7.5 + Math.min(artworkCount / 10, 3)),
    },
    artworkCount,
  };
}

export function buildGalleryCatalog(galleries = []) {
  if (!Array.isArray(galleries) || galleries.length === 0) {
    return fallbackGalleryCatalog;
  }

  return galleries
    .map((gallery) => buildGalleryProfile(gallery, gallery.artworkCount || gallery.artworks_count || 0))
    .sort((left, right) => (left.displayOrder || 0) - (right.displayOrder || 0) || left.name.localeCompare(right.name));
}

export function getGalleryBySlug(galleries = [], gallerySlug = '') {
  const normalized = normalizeGalleryToken(gallerySlug);
  return (Array.isArray(galleries) ? galleries : []).find((gallery) => {
    const candidate = normalizeGalleryToken(gallery.slug || gallery.name || gallery.id);
    return candidate === normalized || String(gallery.id) === String(gallerySlug);
  }) || null;
}

export {
  normalizeGalleryToken,
  humanizeGalleryName,
  pickThemeKey,
  pickModelKey,
  pickFrameStyle,
  galleryThemeCatalog,
  galleryModelAssets,
};
