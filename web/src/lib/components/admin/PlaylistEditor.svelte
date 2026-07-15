<script>
  import { onMount } from 'svelte';
  import { api } from '../../api.js';

  let { playlistId, onClose } = $props();

  let playlist = $state(null);
  let allTracks = $state([]);
  let selectedTrackToAdd = $state('');
  let error = $state('');

  async function load() {
    try {
      const [p, tracks] = await Promise.all([api.get(`/playlists/${playlistId}`), api.get('/tracks')]);
      playlist = p;
      allTracks = tracks;
    } catch (err) {
      error = err.message;
    }
  }

  onMount(load);

  let availableTracks = $derived(
    allTracks.filter((t) => !playlist?.tracks.some((pt) => pt.track._id === t._id))
  );

  async function addTrack() {
    if (!selectedTrackToAdd) return;
    try {
      playlist = await api.post(`/playlists/${playlistId}/tracks`, { trackId: selectedTrackToAdd });
      selectedTrackToAdd = '';
      await load(); // re-fetch populated tracks
    } catch (err) {
      error = err.message;
    }
  }

  async function removeTrack(trackId) {
    try {
      await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
      await load();
    } catch (err) {
      error = err.message;
    }
  }

  async function move(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= playlist.tracks.length) return;
    const ids = playlist.tracks.map((t) => t.track._id);
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    try {
      await api.patch(`/playlists/${playlistId}/tracks/reorder`, { trackIds: ids });
      await load();
    } catch (err) {
      error = err.message;
    }
  }
</script>

<div class="card editor">
  <div class="header">
    <h2>{playlist ? `Tracks in “${playlist.name}”` : 'Loading…'}</h2>
    <button class="btn btn-secondary" onclick={onClose}>Close</button>
  </div>

  {#if error}
    <p class="error-text">{error}</p>
  {/if}

  {#if playlist}
    <div class="add-row">
      <select bind:value={selectedTrackToAdd}>
        <option value="">Add a track…</option>
        {#each availableTracks as t (t._id)}
          <option value={t._id}>{t.title} — {t.artist}</option>
        {/each}
      </select>
      <button class="btn" onclick={addTrack} disabled={!selectedTrackToAdd}>Add</button>
    </div>

    <ol class="track-list">
      {#each playlist.tracks as entry, i (entry.track._id)}
        <li>
          <span class="track-name">{entry.track.title} — {entry.track.artist}</span>
          <span class="controls">
            <button class="btn-secondary" onclick={() => move(i, -1)} disabled={i === 0}>▲</button>
            <button class="btn-secondary" onclick={() => move(i, 1)} disabled={i === playlist.tracks.length - 1}>▼</button>
            <button class="btn-danger" onclick={() => removeTrack(entry.track._id)}>Remove</button>
          </span>
        </li>
      {:else}
        <li class="empty">No tracks in this playlist yet.</li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  .add-row {
    display: flex;
    gap: 0.5rem;
  }
  .add-row select {
    flex: 1;
  }
  .track-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .track-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 6px;
  }
  .controls {
    display: flex;
    gap: 0.4rem;
  }
  .controls button {
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
  }
  .empty {
    color: var(--text-dim);
    border: none !important;
  }
</style>
