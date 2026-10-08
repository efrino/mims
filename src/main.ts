import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
// tailwind.css FIRST — declares @layer vendor before Tailwind's own layers so utilities always win
import './assets/tailwind.css';
import '@/scss/style.scss';
import '@/styles/welding-ui.css'; // standar tampilan halaman welding (acuan: Mutasi)
import '@/styles/dark-tailwind.css'; // mode gelap utk utilitas Tailwind terang tanpa varian dark:
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import 'vue3-perfect-scrollbar/style.css';
import VueTablerIcons from 'vue-tabler-icons';
import VueApexCharts from 'vue3-apexcharts';
import HighchartsVue from 'highcharts-vue'; // Import HighchartsVue
import 'apexcharts/dist/apexcharts.css'; // ApexCharts CSS
import Antd from 'ant-design-vue';
// ant-design-vue/dist/reset.css is now imported inside @layer vendor in tailwind.css
import '@mdi/font/css/materialdesignicons.css';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import 'flowbite';
import 'flowbite-datepicker';
import io  from "socket.io-client";

// Setelah deploy, nama file build berganti: tab yang dibuka sebelum deploy gagal memuat
// halaman (file lama sudah dihapus). Muat ulang sekali otomatis; flag mencegah loop reload.
const RELOAD_FLAG = 'mims-chunk-reload'
const reloadOnStaleBuild = () => {
  if (sessionStorage.getItem(RELOAD_FLAG)) return
  sessionStorage.setItem(RELOAD_FLAG, '1')
  window.location.reload()
}
window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); reloadOnStaleBuild() })
router.onError((err) => {
  if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String(err?.message))) reloadOnStaleBuild()
})
router.afterEach(() => sessionStorage.removeItem(RELOAD_FLAG))


const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(PerfectScrollbarPlugin);
axios.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
    config.headers.App = "mims";

  return config;
});
app.use(VueTablerIcons);
app.use(Antd);
app.use(VueApexCharts);

// Register HighchartsVue with Highcharts
app.use(HighchartsVue,);
const socket = io('http://192.168.10.67:4000', {
  autoConnect: true,
  reconnection: true
});

(window as any).$socket = socket

app.provide("socket", socket);

// Apply theme before mount so it overrides Flowbite's system-preference dark class
useThemeStore().init();

app.use(vuetify).mount('#app');
