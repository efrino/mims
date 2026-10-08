<script setup lang="ts">
import { computed } from 'vue';
import type { RingkasanBarangItem } from '@/types/Admin/MasterBarang';

const props = defineProps<{
  items: RingkasanBarangItem[];
  title?: string;
}>();

interface KategoriRingkas {
  nama: string;
  total: number;
  tersedia: number;
  dipinjam: number;
  baik: number;
  sedang: number;
  rusak: number;
}

// Ringkasan per nama barang dijumlahkan menjadi per kategori
const kategori = computed<KategoriRingkas[]>(() => {
  const map = new Map<string, KategoriRingkas>();
  props.items.forEach((item) => {
    const nama = item.nama_kategori || 'Tanpa Kategori';
    const row = map.get(nama) || { nama, total: 0, tersedia: 0, dipinjam: 0, baik: 0, sedang: 0, rusak: 0 };
    row.total += Number(item.qty_total);
    row.tersedia += Number(item.qty_tersedia);
    row.dipinjam += Number(item.qty_dipinjam);
    row.baik += Number(item.qty_baik);
    row.sedang += Number(item.qty_sedang);
    row.rusak += Number(item.qty_rusak);
    map.set(nama, row);
  });
  return [...map.values()];
});

const total = computed(() =>
  kategori.value.reduce(
    (acc, item) => ({ total: acc.total + item.total, tersedia: acc.tersedia + item.tersedia, dipinjam: acc.dipinjam + item.dipinjam }),
    { total: 0, tersedia: 0, dipinjam: 0 }
  )
);

const persen = (qty: number, jumlah: number): string => (jumlah ? `${(qty * 100) / jumlah}%` : '0%');
</script>

<template>
  <section v-if="kategori.length" class="rounded-[16px] bg-white p-4 shadow-sm ring-1 ring-inset ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </span>
        <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ title || 'Ketersediaan Barang' }}</h2>
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">{{ total.total }} unit</span>
        <span class="rounded-full bg-green-100 px-2.5 py-1 font-semibold text-green-700">{{ total.tersedia }} tersedia</span>
        <span class="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700">{{ total.dipinjam }} dipinjam</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      <div
        v-for="item in kategori"
        :key="item.nama"
        class="rounded-[12px] bg-slate-50 p-3 ring-1 ring-inset ring-slate-100 transition-shadow hover:shadow-sm dark:bg-gray-900/40 dark:ring-gray-700"
      >
        <p class="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" :title="item.nama">
          {{ item.nama }}
        </p>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="text-2xl font-bold" :class="item.tersedia ? 'text-gray-800 dark:text-gray-100' : 'text-red-500'">{{ item.tersedia }}</span>
          <span class="text-xs text-gray-500">/ {{ item.total }} tersedia</span>
        </div>
        <!-- Bar ketersediaan -->
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" :title="`${item.dipinjam} dipinjam`">
          <div class="h-full rounded-full bg-green-500" :style="{ width: persen(item.tersedia, item.total) }" />
        </div>
        <!-- Kondisi -->
        <div class="mt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span class="flex items-center gap-1" title="Baik"><span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>{{ item.baik }}</span>
          <span class="flex items-center gap-1" title="Sedang"><span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>{{ item.sedang }}</span>
          <span class="flex items-center gap-1" title="Rusak"><span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>{{ item.rusak }}</span>
          <span v-if="item.dipinjam" class="ml-auto font-medium text-blue-600">{{ item.dipinjam }} dipinjam</span>
        </div>
      </div>
    </div>
  </section>
</template>
