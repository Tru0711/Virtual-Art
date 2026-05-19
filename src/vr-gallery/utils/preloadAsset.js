const preloadCache = new Map();

export const preloadBinaryAsset = (assetUrl) => {
  const url = String(assetUrl || '').trim();
  if (!url) return Promise.resolve(null);

  if (preloadCache.has(url)) {
    return preloadCache.get(url);
  }

  const promise = fetch(url, {
    credentials: 'same-origin',
    cache: 'force-cache',
  })
    .then(() => url)
    .catch(() => url);

  preloadCache.set(url, promise);
  return promise;
};