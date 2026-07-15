<script>
  import { onMount } from 'svelte';
  import { api } from '../../api.js';
  import TrackForm from './TrackForm.svelte';

  let tracks = $state([]);
  let error = $state('');
  let editingId = $state(null);
  let editDraft = $state({ title: '', artist: '', album: '' });

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }

  async function load() {
    try {
      tracks = await api.get('/tracks');
    } catch (err) {
      error = err.message;
    }
  }

  onMount(load);

  function handleCreated(track) {
    tracks = [track, ...tracks];
  }

  function startEdit(track) {
    editingId = track._id;
    editDraft = { title: track.title, artist: track.artist, album: track.album };
  }

  async function saveEdit(track) {
    try {
      const formData = new FormData();
      formData.append('title', editDraft.title);
      formData.append('artist', editDraft.artist);
      formData.append('album', editDraft.album);
      const updated = await api.put(`/tracks/${track._id}`, formData);
      tracks = tracks.map((t) => (t._id === track._id ? updated : t));
      editingId = null;
    } catch (err) {
      error = err.message;
    }
  }

  async function remove(track) {
    if (!confirm(`Delete "${track.title}"? This removes it from any playlists.`)) return;
    try {
      await api.delete(`/tracks/${track._id}`);
      tracks = tracks.filter((t) => t._id !== track._id);
    } catch (err) {
      error = err.message;
    }
  }
</script>

<div class="stack">
  <TrackForm onCreated={handleCreated} />

  {#if error}
    <p class="error-text">{error}</p>
  {/if}

  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Artist</th>
          <th>Album</th>
          <th>Duration</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each tracks as track (track._id)}
          <tr>
            {#if editingId === track._id}
              <td><input type="text" bind:value={editDraft.title} /></td>
              <td><input type="text" bind:value={editDraft.artist} /></td>
              <td><input type="text" bind:value={editDraft.album} /></td>
              <td>{formatDuration(track.duration)}</td>
              <td class="actions">
                <button class="btn" onclick={() => saveEdit(track)}>Save</button>
                <button class="btn btn-secondary" onclick={() => (editingId = null)}>Cancel</button>
              </td>
            {:else}
              <td>{track.title}</td>
              <td>{track.artist}</td>
              <td>{track.album}</td>
              <td>{formatDuration(track.duration)}</td>
              <td class="actions">
                <button class="btn btn-secondary" onclick={() => startEdit(track)}>Edit</button>
                <button class="btn-danger" onclick={() => remove(track)}>Delete</button>
              </td>
            {/if}
          </tr>
        {:else}
          <tr><td colspan="5">No tracks uploaded yet.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    white-space: nowrap;
  }
</style>
