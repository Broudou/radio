<script>
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../../api.js';

  const REFRESH_MS = 10000;

  let checks = $state([]);
  let error = $state('');
  let loading = $state(true);
  let lastCheckedAt = $state(null);
  let timer = null;

  async function load() {
    try {
      const data = await api.get('/system-status');
      checks = data.checks;
      error = '';
      lastCheckedAt = new Date();
    } catch (err) {
      error = err.message;
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
  });

  const stateLabel = { ok: 'OK', warn: 'Warning', error: 'Problem', unknown: 'Unknown' };
</script>

<div class="stack">
  <div class="header-row">
    <h2>Icecast &amp; Liquidsoap status</h2>
    <div class="header-actions">
      {#if lastCheckedAt}
        <span class="checked-at">Checked {lastCheckedAt.toLocaleTimeString()}</span>
      {/if}
      <button class="btn btn-secondary" onclick={load} disabled={loading}>Refresh</button>
    </div>
  </div>

  {#if error}
    <p class="error-text">{error}</p>
  {/if}

  {#if loading && checks.length === 0}
    <p class="loading">Checking…</p>
  {:else}
    <div class="card">
      <ul class="checks">
        {#each checks as check (check.id)}
          <li>
            <span class="dot" class:ok={check.state === 'ok'} class:warn={check.state === 'warn'} class:err={check.state === 'error'} class:unknown={check.state === 'unknown'}></span>
            <div class="check-body">
              <div class="check-label">
                {check.label}
                <span class="state-tag" class:ok={check.state === 'ok'} class:warn={check.state === 'warn'} class:err={check.state === 'error'} class:unknown={check.state === 'unknown'}>
                  {stateLabel[check.state] ?? check.state}
                </span>
              </div>
              <div class="check-detail">{check.detail}</div>
            </div>
          </li>
        {/each}
      </ul>
    </div>
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
  .checks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .checks li {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }
  .dot {
    margin-top: 0.3rem;
    width: 10px;
    height: 10px;
    min-width: 10px;
    border-radius: 50%;
    background: var(--text-dim);
  }
  .dot.ok {
    background: #3ecf6e;
  }
  .dot.warn {
    background: #e5b93e;
  }
  .dot.err {
    background: var(--danger);
  }
  .dot.unknown {
    background: var(--text-dim);
  }
  .check-body {
    flex: 1;
  }
  .check-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }
  .state-tag {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    color: var(--text-dim);
    border: 1px solid var(--border);
  }
  .state-tag.ok {
    color: #3ecf6e;
    border-color: #3ecf6e;
  }
  .state-tag.warn {
    color: #e5b93e;
    border-color: #e5b93e;
  }
  .state-tag.err {
    color: var(--danger);
    border-color: var(--danger);
  }
  .check-detail {
    color: var(--text-dim);
    font-size: 0.85rem;
    margin-top: 0.15rem;
  }
</style>
