import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mims/' : '/',
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => ['v-list-recognize-title', 'model-viewer'].includes(tag)
        }
      }
    }),
    vuetify({
      autoImport: true
    }),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/mspin': {
        target: 'https://mspin.newarmada.biz',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/mspin/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward the original Authorization header exactly as sent
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
        },
      },
      '/sto-v2': {
        target: 'http://192.168.10.55',
        changeOrigin: true,
      },
      '/finger-api': {
        target: 'http://192.168.10.8',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/finger-api/, '/maj-finger-api'),
      },
      '/hr-portal': {
        target: 'http://192.168.10.8',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/hr-portal/, '/maj-hr-portal'),
      },
      '/ai-api': {
        target: 'http:192.168.10.67',
        changeOrigin: true,
        secure: false
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'vue-i18n': 'vue-i18n/dist/vue-i18n.esm-bundler.js'
    }
  },
  css: {
    preprocessorOptions: {
      scss: {}
    }
  },
  build: {
    chunkSizeWarningLimit: 1024 * 1024, // Set the limit to 1 MB
    rollupOptions: {
      output: {
        // Pecah vendor berat jadi chunk sendiri supaya bundle utama tidak
        // menumpuk jadi satu file raksasa (index.js sempat ~6.8 MB).
        // Hanya library "daun" (tidak saling impor dengan kode app) yang
        // dipisah, biar urutan inisialisasi tetap aman.
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('vuetify')) return 'vendor-vuetify';
          if (id.includes('ant-design-vue') || id.includes('@ant-design')) return 'vendor-antd';
          if (id.includes('highcharts')) return 'vendor-highcharts';
          if (id.includes('apexcharts')) return 'vendor-apexcharts';
          if (id.includes('exceljs')) return 'vendor-exceljs';
          if (id.includes('jsrsasign')) return 'vendor-jsrsasign';
          if (id.includes('qz-tray')) return 'vendor-qz';
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['vuetify'],
    entries: ['./src/**/*.vue']
  }
}));
