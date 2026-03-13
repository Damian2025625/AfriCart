
// Simple in-memory cache for server-side routes
const cache = new Map();

export function getCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }
  return cached.data;
}

export function setCache(key, data, ttlSeconds = 60) {
  cache.set(key, {
    data,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

export function clearCache() {
  cache.clear();
}
