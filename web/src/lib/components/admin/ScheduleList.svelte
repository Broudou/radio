<script>
  import { onMount } from 'svelte';
  import { api } from '../../api.js';
  import ScheduleForm from './ScheduleForm.svelte';

  let entries = $state([]);
  let error = $state('');

  async function load() {
    try {
      entries = await api.get('/schedule');
    } catch (err) {
      error = err.message;
    }
  }

  onMount(load);

  function handleCreated() {
    load();
  }

  async function remove(entry) {
    if (!confirm('Delete this schedule entry?')) return;
    try {
      await api.delete(`/schedule/${entry._id}`);
      await load();
    } catch (err) {
      error = err.message;
    }
  }

  function formatRange(entry) {
    const start = new Date(entry.startAt);
    const end = new Date(entry.endAt);
    return `${start.toLocaleString()} → ${end.toLocaleString()}`;
  }
</script>

<div class="stack">
  <ScheduleForm onCreated={handleCreated} />

  {#if error}
    <p class="error-text">{error}</p>
  {/if}

  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Playlist</th>
          <th>When</th>
          <th>Label</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each entries as entry (entry._id)}
          <tr>
            <td>{entry.playlist?.name ?? '—'}</td>
            <td>{formatRange(entry)}</td>
            <td>{entry.label}</td>
            <td>
              <button class="btn-danger" onclick={() => remove(entry)}>Delete</button>
            </td>
          </tr>
        {:else}
          <tr><td colspan="4">No schedule entries yet — the default playlist plays at all times.</td></tr>
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
</style>
