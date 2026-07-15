<script>
  let { title, artist, status } = $props();
</script>

<div class="now-playing">
  {#if status !== 'live'}
    <p class="muted">The station is currently offline.</p>
  {:else if title}
    <p class="title">{title}</p>
    {#if artist}
      <p class="artist">{artist}</p>
    {/if}
  {:else}
    <p class="muted">Now playing…</p>
  {/if}
</div>

<style>
  .now-playing {
    text-align: center;
    min-height: 3.5rem;
  }
  .title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }
  .artist {
    font-size: 1rem;
    color: var(--text-dim);
    margin: 0.25rem 0 0;
  }
  .muted {
    color: var(--text-dim);
    margin: 0;
  }
</style>
