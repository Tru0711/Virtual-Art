const stripTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const normalizeOrigin = (value) => {
  const trimmed = stripTrailingSlash(value);
  if (!trimmed) return '';

  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  }

  return `https://${trimmed}`;
};

const toUrlBase = (value, fallback) => normalizeOrigin(value || fallback);

export const API_ORIGIN_FALLBACK = 'https://virtual-art-backend.onrender.com';
export const FRONTEND_ORIGIN_FALLBACK = 'https://virtual-art-psi.vercel.app';

export const getApiOrigin = () => toUrlBase(import.meta.env.VITE_API_URL, API_ORIGIN_FALLBACK).replace(/\/api$/, '');

export const getApiBaseUrl = () => `${getApiOrigin()}/api`;

export const getAssetBaseUrl = () => normalizeOrigin(import.meta.env.VITE_ASSET_URL || getApiOrigin());

export const getFrontendOrigin = () => normalizeOrigin(import.meta.env.VITE_FRONTEND_URL || FRONTEND_ORIGIN_FALLBACK);

export const normalizeAbsoluteUrl = (value, baseUrl = getAssetBaseUrl()) => {
  if (!value) return null;

  const text = String(value).trim();
  if (!text) return null;

  if (/^(https?:)?\/\//i.test(text) || text.startsWith('blob:') || text.startsWith('data:')) {
    return text.startsWith('//') ? `https:${text}` : text;
  }

  const cleanBase = stripTrailingSlash(baseUrl);
  const cleanPath = text.replace(/^\/+/, '');
  return cleanBase ? `${cleanBase}/${cleanPath}` : `/${cleanPath}`;
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
