<script>
  let { status, listeners } = $props();
</script>

<span class="badge" class:live={status === 'live'} class:down={status !== 'live'}>
  <span class="dot"></span>
  {status === 'live' ? 'On air' : 'Offline'}
  {#if status === 'live'}
    <span class="listeners">· {listeners} listening</span>
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--text-dim);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-dim);
  }
  .live .dot {
    background: #3ecf6e;
  }
  .down .dot {
    background: var(--danger);
  }
  .listeners {
    color: var(--text-dim);
  }
</style>
