<script>
  import { onMount } from 'svelte';
  import { api } from '../../api.js';

  let { onCreated } = $props();

  let playlists = $state([]);
  let playlistId = $state('');
  let startAt = $state('');
  let endAt = $state('');
  let label = $state('');
  let error = $state('');
  let submitting = $state(false);

  onMount(async () => {
    try {
      playlists = await api.get('/playlists');
    } catch (err) {
      error = err.message;
    }
  });

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    submitting = true;
    try {
      const created = await api.post('/schedule', {
        playlist: playlistId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        label,
      });
      playlistId = '';
      startAt = '';
      endAt = '';
      label = '';
      onCreated?.(created);
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }
</script>

<form class="card schedule-form" onsubmit={handleSubmit}>
  <h2>New schedule entry</h2>
  <label>
    Playlist
    <select bind:value={playlistId} required>
      <option value="" disabled>Select a playlist…</option>
      {#each playlists as p (p._id)}
        <option value={p._id}>{p.name}</option>
      {/each}
    </select>
  </label>
  <div class="row">
    <label>
      Start
      <input type="datetime-local" bind:value={startAt} required />
    </label>
    <label>
      End
      <input type="datetime-local" bind:value={endAt} required />
    </label>
  </div>
  <label>
    Label <span class="hint">(optional)</span>
    <input type="text" bind:value={label} placeholder="e.g. Friday night jazz" />
  </label>
  {#if error}
    <p class="error-text">{error}</p>
  {/if}
  <button class="btn" type="submit" disabled={submitting}>
    {submitting ? 'Saving…' : 'Add to schedule'}
  </button>
</form>

<style>
  .schedule-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  .row {
    display: flex;
    gap: 0.75rem;
  }
  .row label {
    flex: 1;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    color: var(--text-dim);
  }
  .hint {
    font-weight: normal;
  }
</style>
