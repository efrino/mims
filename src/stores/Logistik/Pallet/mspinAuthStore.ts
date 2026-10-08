// stores/Logistik/Auth/mspinAuthStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import mspinApi from '@/stores/Logistik/Pallet/mspinApi';

export const useMspinAuthStore = defineStore('mspinAuth', () => {
  const token = ref<string | null>(localStorage.getItem('mspin_token'));
  const username = ref<string | null>(localStorage.getItem('mspin_username'));
  const isAuthenticated = ref(!!token.value);

  async function login(identity: string, password: string): Promise<boolean> {
    try {
      const response = await mspinApi.post('/sto/auth/login-app', {
        identity,
        password,
        remember: false,
      }, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
      });
      const data = response.data;
      if (data.status === true && data.token) {
        token.value = data.token;
        username.value = identity;
        localStorage.setItem('mspin_token', data.token);
        localStorage.setItem('mspin_username', identity);
        isAuthenticated.value = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  function logout() {
    token.value = null;
    username.value = null;
    localStorage.removeItem('mspin_token');
    localStorage.removeItem('mspin_username');
    isAuthenticated.value = false;
  }

  function getToken(): string | null {
    return token.value;
  }

  return { token, username, isAuthenticated, login, logout, getToken };
});