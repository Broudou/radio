import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { config } from '../config/env.js';
import { getDefaultPlaylistStatus, getRadioLiqPath } from './liquidsoapService.js';

/**
 * `systemctl is-active` needs no privilege to query (unlike start/stop/restart),
 * so this works under the same non-root deploy user described in
 * docs/DEPLOYMENT.md without any extra sudoers rule. On a non-systemd host
 * (e.g. a developer's machine) the binary itself is missing — that's reported
 * as 'unavailable' rather than treated as the service being down.
 */
function systemctlIsActive(serviceName) {
  return new Promise((resolve) => {
    execFile('systemctl', ['is-active', serviceName], (error, stdout) => {
      const state = String(stdout || '').trim();
      if (state) {
        resolve(state);
        return;
      }
      resolve(error?.code === 'ENOENT' ? 'unavailable' : 'unknown');
    });
  });
}

async function checkIcecast() {
  try {
    const response = await fetch(config.icecastStatusUrl, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      return { reachable: false, error: `HTTP ${response.status}`, mountLive: false, listeners: 0 };
    }
    const json = await response.json();
    const source = json?.icestats?.source;
    const sources = Array.isArray(source) ? source : source ? [source] : [];
    const mount = sources.find((s) => s.listenurl?.endsWith(config.icecastMount));
    return {
      reachable: true,
      error: null,
      mountLive: Boolean(mount),
      listeners: mount ? Number(mount.listeners) || 0 : 0,
    };
  } catch (err) {
    return { reachable: false, error: err.message, mountLive: false, listeners: 0 };
  }
}

async function checkRadioLiq() {
  try {
    const stat = await fs.stat(getRadioLiqPath());
    return { exists: true, generatedAt: stat.mtime };
  } catch {
    return { exists: false, generatedAt: null };
  }
}

/**
 * Returns a flat list of pass/fail checks covering the whole Icecast +
 * Liquidsoap chain, so a "station shows offline" report can be diagnosed
 * from the admin panel without shelling into the VPS first.
 */
export async function getSystemStatus() {
  const [icecastService, liquidsoapService, icecast, radioLiq, defaultPlaylist] = await Promise.all([
    systemctlIsActive('icecast2'),
    systemctlIsActive('liquidsoap'),
    checkIcecast(),
    checkRadioLiq(),
    getDefaultPlaylistStatus(),
  ]);

  const serviceCheckState = (state) => {
    if (state === 'active') return 'ok';
    if (state === 'unavailable') return 'unknown';
    return 'error';
  };

  const checks = [
    {
      id: 'icecastService',
      label: 'Icecast service (systemd)',
      state: serviceCheckState(icecastService),
      detail:
        icecastService === 'unavailable'
          ? 'systemctl not available on this host (expected in local dev)'
          : `systemctl reports: ${icecastService}`,
    },
    {
      id: 'icecastReachable',
      label: 'Icecast reachable',
      state: icecast.reachable ? 'ok' : 'error',
      detail: icecast.reachable
        ? `Responding at ${config.icecastStatusUrl}`
        : `Could not reach ${config.icecastStatusUrl}${icecast.error ? ` — ${icecast.error}` : ''}`,
    },
    {
      id: 'streamMountLive',
      label: 'Stream mount live',
      state: !icecast.reachable ? 'unknown' : icecast.mountLive ? 'ok' : 'error',
      detail: !icecast.reachable
        ? 'Cannot check — Icecast unreachable'
        : icecast.mountLive
          ? `${icecast.listeners} listener(s) on ${config.icecastMount}`
          : `No source connected on ${config.icecastMount} — check Liquidsoap is running and its Icecast source password matches icecast.xml`,
    },
    {
      id: 'liquidsoapService',
      label: 'Liquidsoap service (systemd)',
      state: serviceCheckState(liquidsoapService),
      detail:
        liquidsoapService === 'unavailable'
          ? 'systemctl not available on this host (expected in local dev)'
          : `systemctl reports: ${liquidsoapService}`,
    },
    {
      id: 'radioLiqGenerated',
      label: 'radio.liq generated',
      state: radioLiq.exists ? 'ok' : 'warn',
      detail: radioLiq.exists
        ? `Last generated ${new Date(radioLiq.generatedAt).toLocaleString()}`
        : 'Not generated yet — set a default playlist with at least one track',
    },
    {
      id: 'defaultPlaylist',
      label: 'Default playlist',
      state: defaultPlaylist.valid ? 'ok' : 'error',
      detail: defaultPlaylist.valid ? 'A valid, enabled, non-empty default playlist is configured' : defaultPlaylist.reason,
    },
    {
      id: 'autoRestart',
      label: 'Auto-restart on structural changes',
      state: config.liquidsoapRestartEnabled ? 'ok' : 'warn',
      detail: config.liquidsoapRestartEnabled
        ? 'Enabled — playlist/schedule structural changes restart Liquidsoap automatically'
        : 'Disabled (LIQUIDSOAP_RESTART_ENABLED=false) — structural changes will not restart Liquidsoap; this should only be false in local dev',
    },
  ];

  return { checks };
}
