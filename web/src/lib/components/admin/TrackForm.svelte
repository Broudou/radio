<script>
  import { api } from '../../api.js';

  let { onCreated } = $props();

  let title = $state('');
  let artist = $state('');
  let album = $state('');
  let trackFile = $state(null);
  let coverFile = $state(null);
  let error = $state('');
  let submitting = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!trackFile) {
      error = 'Choose an MP3 file';
      return;
    }
    error = '';
    submitting = true;
    try {
      const formData = new FormData();
      formData.append('track', trackFile);
      if (coverFile) formData.append('cover', coverFile);
      if (title) formData.append('title', title);
      if (artist) formData.append('artist', artist);
      if (album) formData.append('album', album);

      const created = await api.post('/tracks', formData);
      title = '';
      artist = '';
      album = '';
      trackFile = null;
      coverFile = null;
      e.target.reset();
      onCreated?.(created);
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }
</script>

<form class="card upload-form" onsubmit={handleSubmit}>
  <h2>Upload a track</h2>
  <label>
    MP3 file
    <input
      type="file"
      accept=".mp3,audio/mpeg"
      required
      onchange={(e) => (trackFile = e.target.files[0])}
    />
  </label>
  <div class="row">
    <label>
      Title <span class="hint">(optional — read from tags if blank)</span>
      <input type="text" bind:value={title} />
    </label>
    <label>
      Artist <span class="hint">(optional)</span>
      <input type="text" bind:value={artist} />
    </label>
  </div>
  <label>
    Album <span class="hint">(optional)</span>
    <input type="text" bind:value={album} />
  </label>
  <label>
    Cover image <span class="hint">(optional)</span>
    <input type="file" accept="image/jpeg,image/png,image/webp" onchange={(e) => (coverFile = e.target.files[0])} />
  </label>
  {#if error}
    <p class="error-text">{error}</p>
  {/if}
  <button class="btn" type="submit" disabled={submitting}>
    {submitting ? 'Uploading…' : 'Upload'}
  </button>
</form>

<style>
  .upload-form {
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
    color: var(--text-dim);
    font-weight: normal;
  }
</style>
