import * as fs from 'fs';
import { buildArtworkPlacements } from '../src/vr-gallery/utils/artworkLayout.js';

console.log('type:', typeof buildArtworkPlacements);
console.log('source length:', buildArtworkPlacements.toString().length);
console.log('preview:\n', buildArtworkPlacements.toString().slice(0,1200));
