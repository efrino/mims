import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';

export default [
  {
    // Build output & file referensi lama jangan ikut dilint — kalau tidak,
    // `eslint .` melaporkan puluhan ribu "error" dari bundle terminifikasi.
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'src/router/list_jangan-dipake-lagi(buat referensi aja).js'
    ]
  },
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        parser: '@typescript-eslint/parser'
      }
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    rules: {
      // Vuetify pakai slot bertitik (`v-slot:item.nama`, `v-slot:header.qty`).
      // Tanpa allowModifiers, eslint-plugin-vue salah baca titiknya sebagai
      // modifier dan melaporkan puluhan error palsu.
      'vue/valid-v-slot': ['error', { allowModifiers: true }]
    }
  }
];
