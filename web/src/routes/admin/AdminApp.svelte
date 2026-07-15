<script>
  import { onMount } from 'svelte';
  import { authState, checkSession, logout } from '../../lib/state/auth.svelte.js';
  import LoginForm from '../../lib/components/admin/LoginForm.svelte';
  import Dashboard from '../../lib/components/admin/Dashboard.svelte';
  import TrackList from '../../lib/components/admin/TrackList.svelte';
  import PlaylistList from '../../lib/components/admin/PlaylistList.svelte';
  import ScheduleList from '../../lib/components/admin/ScheduleList.svelte';
  import SystemStatus from '../../lib/components/admin/SystemStatus.svelte';

  onMount(() => {
    if (!authState.checked) checkSession();
  });

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', component: Dashboard },
    { id: 'tracks', label: 'Tracks', component: TrackList },
    { id: 'playlists', label: 'Playlists', component: PlaylistList },
    { id: 'schedule', label: 'Schedule', component: ScheduleList },
    { id: 'system-status', label: 'System status', component: SystemStatus },
  ];
  let activeTab = $state('dashboard');
  let ActiveComponent = $derived(tabs.find((t) => t.id === activeTab).component);
</script>

{#if !authState.checked}
  <p class="loading">Loading…</p>
{:else if !authState.user}
  <LoginForm />
{:else}
  <div class="admin-shell">
    <header>
      <h1>Radio admin</h1>
      <nav>
        {#each tabs as tab (tab.id)}
          <button class:active={activeTab === tab.id} onclick={() => (activeTab = tab.id)}>
            {tab.label}
          </button>
        {/each}
      </nav>
      <div class="user-info">
        <span>{authState.user.email}</span>
        <button class="btn btn-secondary" onclick={logout}>Sign out</button>
      </div>
    </header>
    <main>
      <ActiveComponent />
    </main>
  </div>
{/if}

<style>
  .loading {
    text-align: center;
    padding: 3rem;
    color: var(--text-dim);
  }
  .admin-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  h1 {
    margin: 0;
    font-size: 1.1rem;
    white-space: nowrap;
  }
  nav {
    display: flex;
    gap: 0.5rem;
    flex: 1;
  }
  nav button {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-dim);
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
  }
  nav button.active {
    color: var(--text);
    border-color: var(--border);
    background: var(--surface);
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
    color: var(--text-dim);
  }
  main {
    padding: 1.5rem;
    max-width: 60rem;
    width: 100%;
    margin: 0 auto;
  }
</style>
