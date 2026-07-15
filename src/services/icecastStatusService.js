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
 * Fetches and caches the raw status-json.xsl payload. Shared by both
 * getStreamStatus() (public, normalized) and getStreamMetadata() (admin,
 * full pass-through) so the two never drift and polling both doesn't double
 * the request rate against Icecast.
 */
async function fetchStatusJson() {
  if (cache.data && cache.expiresAt > Date.now()) {
    return cache.data;
  }

  let result;
  try {
    const response = await fetch(config.icecastStatusUrl, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`Icecast status returned ${response.status}`);
    const json = await response.json();
    result = { json, error: null };
  } catch (err) {
    result = { json: null, error: err.message };
  }

  cache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };
  return result;
}

/**
 * Icecast/Liquidsoap is the single source of truth for "what's on air" —
 * this proxies Icecast's own status-json.xsl rather than Node tracking
 * playback state itself, avoiding a second notion of "now playing" that
 * could drift after a Liquidsoap restart or crash.
 */
export async function getStreamStatus() {
  const { json } = await fetchStatusJson();
  const mount = json ? findMountSource(json) : null;

  if (!mount) {
    return { status: 'down', listeners: 0, title: null, artist: null };
  }

  const { title, artist } = splitTitle(mount.title);
  return {
    status: 'live',
    listeners: Number(mount.listeners) || 0,
    title,
    artist,
  };
}

/**
 * Full pass-through of every field Icecast reports — both for our mount and
 * at the server level — for the admin "stream metadata" panel. Unlike
 * getStreamStatus() this deliberately doesn't pick/normalize fields, so new
 * Icecast/Liquidsoap metadata (bitrate, genre, stream_start, audio_info,
 * etc.) shows up automatically without a code change here.
 */
export async function getStreamMetadata() {
  const { json, error } = await fetchStatusJson();
  if (!json) {
    return { reachable: false, error, mount: null, server: null };
  }

  const mount = findMountSource(json);
  const { source, ...server } = json.icestats ?? {};
  return { reachable: true, error: null, mount, server };
}
