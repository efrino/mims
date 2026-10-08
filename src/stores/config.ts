/* eslint-disable no-prototype-builtins */
import { defineStore } from 'pinia';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

const origin = window.location.origin.replace('http://', '');
let apiUrl = '192.168.10.67';
let socketUrl = '192.168.10.67';
const findTerm = (term: string) => {
  if (origin.includes(term)) {
    return origin;
  }
};
switch (window.location.origin.replace('http://', '')) {
  //Development
  case findTerm('localhost'):
    // Default API server 67. Pakai API lokal (Laragon) dengan VITE_API_HOST=localhost di
    // .env.local masing-masing — jangan diubah di sini supaya localhost orang lain tidak ikut pindah.
    apiUrl = import.meta.env.VITE_API_HOST || '192.168.10.67';
    break;
  // case findTerm('192.168.10.80'):
  //   apiUrl = '192.168.10.80';
  //   socketUrl = '192.168.10.80';
  //   break;

  default:
    apiUrl = '192.168.10.67';
    socketUrl = '192.168.10.67';
    break;
}
const socketIoUrlParts = socketUrl.split(':');
const socketIoUrl = `http://${socketIoUrlParts[0]}:4000`;
const tokenID = 'token-mims';
export const useConfigStore = defineStore('config', {
  state: () => ({
    apiUrl,
    socketIoUrl,
    tokenID,
    sideBar: {
      drawer: true,
      topbar: true,
      width: 300
    },
    currentLayout: 'layout-blank',
    page: {
      name: '',
      navigations: [],
      drawer: false
    },
    router: null as Router | null,
    route: null as RouteLocationNormalizedLoaded | null
  }),
  actions: {
    onError(error: any) {
      console.error(error);

      if (error?.response?.data?.status === 'Expired token') {
        this.router?.push({ name: 'login' });
      }
    }
  }
});
