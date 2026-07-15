<script>
  import { playerState } from '../../state/player.svelte.js';

  let audioEl;
  let playbackState = $state('stopped'); // 'stopped' | 'loading' | 'playing' | 'paused'

  function play() {
    if (!playerState.streamUrl) return;
    if (playbackState === 'stopped') {
      // Fresh connection to the live stream — cache-bust so the browser
      // doesn't try to resume a stale/closed connection.
      audioEl.src = `${playerState.streamUrl}?_=${Date.now()}`;
    }
    playbackState = 'loading';
    audioEl.play().catch(() => {
      playbackState = 'stopped';
    });
  }

  function pause() {
    audioEl.pause();
    playbackState = 'paused';
  }

  function stop() {
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
    playbackState = 'stopped';
  }

  function onPlaying() {
    playbackState = 'playing';
  }
</script>

<div class="player">
  <audio bind:this={audioEl} onplaying={onPlaying} preload="none"></audio>

  <div class="controls">
    {#if playbackState === 'playing'}
      <button class="btn" onclick={pause}>Pause</button>
    {:else}
      <button class="btn" onclick={play} disabled={playerState.status !== 'live' && playbackState === 'stopped'}>
        {playbackState === 'loading' ? 'Connecting…' : 'Play'}
      </button>
    {/if}
    <button class="btn btn-secondary" onclick={stop} disabled={playbackState === 'stopped'}>Stop</button>
  </div>
</div>

<style>
  .player {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .controls {
    display: flex;
    gap: 0.75rem;
  }
  .controls .btn {
    min-width: 6rem;
  }
</style>
