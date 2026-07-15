<script>
  import { playerState } from '../../state/player.svelte.js';

  let audioEl;
  let playbackState = $state('stopped'); // 'stopped' | 'loading' | 'playing' | 'paused'
  let error = $state('');
  let volume = $state(1);
  let muted = $state(false);

  $effect(() => {
    if (audioEl) audioEl.volume = volume;
  });

  function play() {
    if (!playerState.streamUrl) return;
    error = '';
    if (playbackState === 'stopped') {
      // Fresh connection to the live stream — cache-bust so the browser
      // doesn't try to resume a stale/closed connection.
      audioEl.src = `${playerState.streamUrl}?_=${Date.now()}`;
    }
    playbackState = 'loading';
    audioEl.play().catch((err) => {
      playbackState = 'stopped';
      error = 'Could not connect to the stream. Please try again.';
      console.error('Playback failed:', err);
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
    error = '';
  }

  function onError() {
    if (playbackState === 'stopped') return;
    playbackState = 'stopped';
    error = 'Stream connection lost. Please try again.';
  }

  function toggleMute() {
    muted = !muted;
    audioEl.muted = muted;
  }
</script>

<div class="player">
  <audio bind:this={audioEl} onplaying={onPlaying} onerror={onError} preload="none"></audio>

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

  <div class="volume">
    <button class="mute-btn" onclick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
      {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
    </button>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      bind:value={volume}
      oninput={() => (muted = false)}
      aria-label="Volume"
    />
  </div>

  {#if error}
    <p class="error-text">{error}</p>
  {/if}
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
  .volume {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    max-width: 14rem;
  }
  .mute-btn {
    background: transparent;
    border: none;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0.2rem;
  }
  .volume input[type='range'] {
    flex: 1;
    padding: 0;
  }
</style>
