import { api } from '../api.js';

export const authState = $state({
  user: null,
  checked: false,
});

export async function checkSession() {
  try {
    authState.user = await api.get('/auth/me');
  } catch {
    authState.user = null;
  } finally {
    authState.checked = true;
  }
}

export async function login(email, password) {
  authState.user = await api.post('/auth/login', { email, password });
}

export async function logout() {
  await api.post('/auth/logout');
  authState.user = null;
}
