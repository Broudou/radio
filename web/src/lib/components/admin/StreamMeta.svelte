<script>
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../../api.js';

  const REFRESH_MS = 10000;

  let audioEl;
  let playbackState = $state('stopped'); // 'stopped' | 'loading' | 'playing' | 'paused'
  let playerError = $state('');
  let volume = $state(1);

  let reachable = $state(false);
  let fetchError = $state('');
  let mount = $state(null);
  let server = $state(null);
  let streamUrl = $state(null);
  let loading = $state(true);
  let lastCheckedAt = $state(null);
  let timer = null;

  $effect(() => {
    if (audioEl) audioEl.volume = volume;
  });

  async function load() {
    try {
      const data = await api.get('/stream-meta');
      reachable = data.reachable;
      fetchError = data.error;
      mount = data.mount;
      server = data.server;
      streamUrl = data.streamUrl;
      lastCheckedAt = new Date();
    } catch (err) {
      reachable = false;
      fetchError = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    load();
    timer = setInterval(load, REFRESH_MS);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
    if (audioEl) audioEl.pause();
  });

  function play() {
    if (!streamUrl) return;
    playerError = '';
    if (playbackState === 'stopped') {
      audioEl.src = `${streamUrl}?_=${Date.now()}`;
    }
    playbackState = 'loading';
    audioEl.play().catch((err) => {
      playbackState = 'stopped';
      playerError = 'Could not connect to the stream. Please try again.';
      console.error('Playback failed:', err);
    });
  }

  function pause() {
    audioEl.pause();
    playbackState = 'paused';
  }

  function stop() {
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
    playbackState = 'stopped';
  }

  function onPlaying() {
    playbackState = 'playing';
    playerError = '';
  }

  function onError() {
    if (playbackState === 'stopped') return;
    playbackState = 'stopped';
    playerError = 'Stream connection lost. Please try again.';
  }

  function formatKey(key) {
    const label = key.replace(/_/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
</script>

<div class="stack">
  <div class="header-row">
    <h2>Stream metadata</h2>
    <div class="header-actions">
      {#if lastCheckedAt}
        <span class="checked-at">Checked {lastCheckedAt.toLocaleTimeString()}</span>
      {/if}
      <button class="btn btn-secondary" onclick={load} disabled={loading}>Refresh</button>
    </div>
  </div>

  <div class="card">
    <h3>Listen</h3>
    <audio bind:this={audioEl} onplaying={onPlaying} onerror={onError} preload="none"></audio>
    <div class="listen-row">
      {#if playbackState === 'playing'}
        <button class="btn" onclick={pause}>Pause</button>
      {:else}
        <button class="btn" onclick={play} disabled={!streamUrl}>
          {playbackState === 'loading' ? 'Connecting…' : 'Play'}
        </button>
      {/if}
      <button class="btn btn-secondary" onclick={stop} disabled={playbackState === 'stopped'}>Stop</button>
      <input type="range" min="0" max="1" step="0.01" bind:value={volume} aria-label="Volume" />
    </div>
    {#if playerError}
      <p class="error-text">{playerError}</p>
    {/if}
  </div>

  {#if loading && !lastCheckedAt}
    <p class="loading">Checking…</p>
  {:else}
    {#if !reachable}
      <p class="error-text">Icecast unreachable{fetchError ? ` — ${fetchError}` : ''}</p>
    {:else if !mount}
      <p class="error-text">Icecast is reachable but no source is connected on this mount.</p>
    {/if}

    {#if server}
      <div class="card">
        <h3>Server</h3>
        <table class="meta-table">
          <tbody>
            {#each Object.entries(server) as [key, value] (key)}
              <tr>
                <th>{formatKey(key)}</th>
                <td>{formatValue(value)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if mount}
      <div class="card">
        <h3>Mount</h3>
        <table class="meta-table">
          <tbody>
            {#each Object.entries(mount) as [key, value] (key)}
              <tr>
                <th>{formatKey(key)}</th>
                <td>{formatValue(value)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  h3 {
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .checked-at {
    color: var(--text-dim);
    font-size: 0.8rem;
  }
  .loading {
    color: var(--text-dim);
  }
  .listen-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .listen-row input[type='range'] {
    flex: 1;
    max-width: 10rem;
  }
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .meta-table tr {
    border-bottom: 1px solid var(--border);
  }
  .meta-table tr:last-child {
    border-bottom: none;
  }
  .meta-table th {
    text-align: left;
    font-weight: 600;
    color: var(--text-dim);
    padding: 0.4rem 0.75rem 0.4rem 0;
    white-space: nowrap;
    vertical-align: top;
  }
  .meta-table td {
    padding: 0.4rem 0;
    word-break: break-word;
  }
</style>
