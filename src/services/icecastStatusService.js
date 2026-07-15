import { config } from '../config/env.js';

const CACHE_TTL_MS = 5000;
let cache = { data: null, expiresAt: 0 };

function splitTitle(icyTitle) {
  if (!icyTitle) return { title: null, artist: null };
  const separatorIndex = icyTitle.indexOf(' - ');
  if (separatorIndex === -1) {
    return { title: icyTitle, artist: null };
  }
  return {
    artist: icyTitle.slice(0, separatorIndex),
    title: icyTitle.slice(separatorIndex + 3),
  };
}

function findMountSource(statusJson) {
  const source = statusJson?.icestats?.source;
  if (!source) return null;
  const sources = Array.isArray(source) ? source : [source];
  return (
    sources.find((s) => s.listenurl?.endsWith(config.icecastMount)) ?? sources[0] ?? null
  );
}

/**
 * Icecast/Liquidsoap is the single source of truth for "what's on air" —
 * this proxies Icecast's own status-json.xsl rather than Node tracking
 * playback state itself, avoiding a second notion of "now playing" that
 * could drift after a Liquidsoap restart or crash.
 */
export async function getStreamStatus() {
  if (cache.data && cache.expiresAt > Date.now()) {
    return cache.data;
  }

  let result;
  try {
    const response = await fetch(config.icecastStatusUrl, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`Icecast status returned ${response.status}`);
    const json = await response.json();
    const mount = findMountSource(json);

    if (!mount) {
      result = { status: 'down', listeners: 0, title: null, artist: null };
    } else {
      const { title, artist } = splitTitle(mount.title);
      result = {
        status: 'live',
        listeners: Number(mount.listeners) || 0,
        title,
        artist,
      };
    }
  } catch (err) {
    result = { status: 'down', listeners: 0, title: null, artist: null };
  }

  cache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };
  return result;
}
