<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';

const router = useRouter();

const page = ref({ title: 'Scan Out Pallet' });

const menus = [
  {
    name:        'logistik-scan-ok-pallet',
    label:       'Scan OK Pallet',
    gradient:    'from-emerald-500 to-green-600',
    shadow:      'shadow-green-200',
    hover:       'hover:shadow-green-300',
    badge:       'OK',
    badgeBg:     'bg-green-100 text-green-700',
  },
  {
    name:        'logistik-scan-out-pallet-adm',
    label:       'Scan Out — ADM',
    gradient:    'from-blue-500 to-red-600',
    shadow:      'shadow-blue-200',
    hover:       'hover:shadow-blue-300',
    badge:       'ADM',
    badgeBg:     'bg-blue-100 text-red-700',
  },
  {
    name:        'logistik-scan-out-pallet-hmmi',
    label:       'Scan Out — GROUP 2',
    gradient:    'from-blue-500 to-red-600',
    shadow:      'shadow-blue-200',
    hover:       'hover:shadow-blue-300',
    badge:       'GROUP 2',
    badgeBg:     'bg-blue-100 text-red-700',
  },
  {
    name:        'logistik-scan-out-pallet-tmmin',
    label:       'Scan Out — TMMIN',
    gradient:    'from-blue-500 to-red-600',
    shadow:      'shadow-blue-200',
    hover:       'hover:shadow-blue-300',
    badge:       'TMMIN',
    badgeBg:     'bg-blue-100 text-red-700',
  },
  {
    name:        'logistik-scan-out-pallet-polybox',
    label:       'Scan Out — Polybox',
    gradient:    'from-teal-500 to-cyan-600',
    shadow:      'shadow-teal-200',
    hover:       'hover:shadow-teal-300',
    badge:       'POLYBOX',
    badgeBg:     'bg-teal-100 text-teal-700',
  },
];

const navigate = (routeName: string) => {
  router.push({ name: routeName });
};
</script>

<template>
  <div>
    <!-- ─── Wrapper tengah ───────────────────────────────────── -->
    <div class="min-h-[70vh] flex flex-col items-center justify-center px-4">

      <!-- Header -->
      <div class="text-center mb-10">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight">
          Pilih Scan yang akan digunakan
        </h1>
      </div>

      <!-- ─── Grid 4 Button ────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        <button
          v-for="menu in menus"
          :key="menu.name"
          type="button"
          class="group relative flex flex-col items-start text-left bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-300 cursor-pointer overflow-hidden"
          :class="[menu.shadow, menu.hover, 'shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]']"
          @click="navigate(menu.name)"
        >
          <!-- Background dekorasi -->
          <div
            class="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-all duration-300 group-hover:opacity-20 group-hover:scale-110 bg-gradient-to-br"
            :class="menu.gradient"
          />

          <!-- Badge -->
          <span
            class="mb-2 inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            :class="menu.badgeBg"
          >
            {{ menu.badge }}
          </span>

          <!-- Label & description -->
          <p class="font-bold text-gray-800 text-base leading-snug mb-1">
            {{ menu.label }}
          </p>

          <!-- Arrow -->
          <div class="mt-4 flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">
            <span>Buka</span>
            <svg
              class="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      <!-- Footer info -->
      <p class="mt-10 text-xs text-gray-300 text-center">
        © 2024 IT Department · PT MEKAR ARMADA JAYA
      </p>

    </div>
  </div>
</template>