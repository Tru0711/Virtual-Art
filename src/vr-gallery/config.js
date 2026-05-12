// Central config to force a single VR gallery model for the entire app.
// Change `SELECTED_MODEL_KEY` to the key of the model you want to always use.
import { galleryModelAssets } from './utils/galleryCatalog';

export const SELECTED_MODEL_KEY = 'vr_gallery'; // choose one of the keys from galleryCatalog

export const SELECTED_GALLERY_MODEL = galleryModelAssets[SELECTED_MODEL_KEY] || galleryModelAssets.vr_gallery;

// Toggle to force-only the selected model when rendering VR galleries.
export const FORCE_SINGLE_GALLERY_MODEL = true;
