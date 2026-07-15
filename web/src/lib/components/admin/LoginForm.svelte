<script>
  import { login } from '../../state/auth.svelte.js';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let submitting = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    submitting = true;
    try {
      await login(email, password);
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="login-wrap">
  <form class="card login-form" onsubmit={handleSubmit}>
    <h1>Admin login</h1>
    <label>
      Email
      <input type="email" bind:value={email} required autocomplete="username" />
    </label>
    <label>
      Password
      <input type="password" bind:value={password} required autocomplete="current-password" />
    </label>
    {#if error}
      <p class="error-text">{error}</p>
    {/if}
    <button class="btn" type="submit" disabled={submitting}>
      {submitting ? 'Signing in…' : 'Sign in'}
    </button>
  </form>
</div>

<style>
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .login-form {
    width: 100%;
    max-width: 20rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    color: var(--text-dim);
  }
</style>
