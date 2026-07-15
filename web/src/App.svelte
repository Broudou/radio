<script>
  import Router from 'svelte-spa-router';
  import './lib/styles.css';
  import Home from './routes/Home.svelte';
  import AdminApp from './routes/admin/AdminApp.svelte';

  const routes = {
    '/': Home,
    '/admin': AdminApp,
    '*': Home,
  };
</script>

<Router {routes} />
