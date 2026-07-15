import { api } from '../api.js';

const POLL_INTERVAL_MS = 12000;

export const playerState = $state({
  status: 'down', // 'live' | 'down'
  listeners: 0,
  title: null,
  artist: null,
  streamUrl: null,
  stationName: null,
});

let pollTimer = null;

async function refresh() {
  try {
    const data = await api.get('/status');
    Object.assign(playerState, data);
  } catch {
    playerState.status = 'down';
  }
}

export function startPolling() {
  if (pollTimer) return;
  refresh();
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') refresh();
  }, POLL_INTERVAL_MS);
}

export function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
