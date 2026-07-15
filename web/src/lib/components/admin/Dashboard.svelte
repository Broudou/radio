<script>
  import { onMount } from 'svelte';
  import { api } from '../../api.js';

  let counts = $state({ tracks: null, playlists: null, schedule: null });
  let error = $state('');

  onMount(async () => {
    try {
      const [tracks, playlists, schedule] = await Promise.all([
        api.get('/tracks'),
        api.get('/playlists'),
        api.get('/schedule'),
      ]);
      counts = { tracks: tracks.length, playlists: playlists.length, schedule: schedule.length };
    } catch (err) {
      error = err.message;
    }
  });
</script>

<div class="grid">
  {#if error}
    <p class="error-text">{error}</p>
  {/if}
  <div class="card stat">
    <span class="value">{counts.tracks ?? '—'}</span>
    <span class="label">Tracks</span>
  </div>
  <div class="card stat">
    <span class="value">{counts.playlists ?? '—'}</span>
    <span class="label">Playlists</span>
  </div>
  <div class="card stat">
    <span class="value">{counts.schedule ?? '—'}</span>
    <span class="label">Schedule entries</span>
  </div>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 1rem;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  .value {
    font-size: 2rem;
    font-weight: 700;
  }
  .label {
    color: var(--text-dim);
    font-size: 0.85rem;
  }
</style>
