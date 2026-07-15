<script>
  import { onMount, onDestroy } from 'svelte';
  import { playerState, startPolling, stopPolling } from '../lib/state/player.svelte.js';
  import Player from '../lib/components/public/Player.svelte';
  import NowPlaying from '../lib/components/public/NowPlaying.svelte';
  import StatusBadge from '../lib/components/public/StatusBadge.svelte';

  onMount(startPolling);
  onDestroy(stopPolling);
</script>

<main>
  <div class="card station">
    <h1>{playerState.stationName || 'Radio'}</h1>
    <StatusBadge status={playerState.status} listeners={playerState.listeners} />
    <NowPlaying title={playerState.title} artist={playerState.artist} status={playerState.status} />
    <Player />
  </div>
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .station {
    width: 100%;
    max-width: 26rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    text-align: center;
  }
  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
</style>
