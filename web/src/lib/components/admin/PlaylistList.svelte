<script>
  import { onMount } from 'svelte';
  import { api } from '../../api.js';
  import PlaylistEditor from './PlaylistEditor.svelte';

  let playlists = $state([]);
  let error = $state('');
  let name = $state('');
  let description = $state('');
  let creating = $state(false);
  let editingPlaylistId = $state(null);

  async function load() {
    try {
      playlists = await api.get('/playlists');
    } catch (err) {
      error = err.message;
    }
  }

  onMount(load);

  async function createPlaylist(e) {
    e.preventDefault();
    if (!name.trim()) return;
    creating = true;
    error = '';
    try {
      await api.post('/playlists', { name, description });
      name = '';
      description = '';
      await load();
    } catch (err) {
      error = err.message;
    } finally {
      creating = false;
    }
  }

  async function toggleEnabled(playlist) {
    error = '';
    try {
      await api.patch(`/playlists/${playlist._id}/enable`, { enabled: !playlist.enabled });
      await load();
    } catch (err) {
      error = err.message;
    }
  }

  async function setDefault(playlist) {
    error = '';
    try {
      await api.patch(`/playlists/${playlist._id}/set-default`, {});
      await load();
    } catch (err) {
      error = err.message;
    }
  }

  async function remove(playlist) {
    if (!confirm(`Delete playlist "${playlist.name}"?`)) return;
    error = '';
    try {
      await api.delete(`/playlists/${playlist._id}`);
      await load();
    } catch (err) {
      error = err.message;
    }
  }
</script>

<div class="stack">
  <form class="card create-form" onsubmit={createPlaylist}>
    <h2>New playlist</h2>
    <div class="row">
      <input type="text" placeholder="Name" bind:value={name} required />
      <input type="text" placeholder="Description (optional)" bind:value={description} />
      <button class="btn" type="submit" disabled={creating}>Create</button>
    </div>
  </form>

  {#if error}
    <p class="error-text">{error}</p>
  {/if}

  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Tracks</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each playlists as playlist (playlist._id)}
          <tr>
            <td>{playlist.name}</td>
            <td>{playlist.tracks.length}</td>
            <td>
              {playlist.enabled ? 'Enabled' : 'Disabled'}
              {#if playlist.isDefault}<strong> · Default</strong>{/if}
            </td>
            <td class="actions">
              <button class="btn btn-secondary" onclick={() => (editingPlaylistId = playlist._id)}>
                Manage tracks
              </button>
              <button class="btn btn-secondary" onclick={() => toggleEnabled(playlist)}>
                {playlist.enabled ? 'Disable' : 'Enable'}
              </button>
              {#if !playlist.isDefault}
                <button class="btn btn-secondary" onclick={() => setDefault(playlist)}>Set default</button>
              {/if}
              <button class="btn-danger" onclick={() => remove(playlist)}>Delete</button>
            </td>
          </tr>
        {:else}
          <tr><td colspan="4">No playlists yet.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if editingPlaylistId}
    <PlaylistEditor playlistId={editingPlaylistId} onClose={() => (editingPlaylistId = null)} />
  {/if}
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
  }
  .row input {
    flex: 1;
  }
  .actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
</style>
