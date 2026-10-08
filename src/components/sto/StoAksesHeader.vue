<script setup lang="ts">
import { stoNikAktif } from '@/services/Admin/StoApi';

/**
 * Blok "Diakses sebagai" yang dipakai berulang di kepala setiap submenu
 * Admin > STO. NIK-nya tidak lagi bisa diganti dari sini -- lihat catatan di
 * StoPinModal.vue -- jadi yang ditampilkan cuma NIK yang sedang aktif dan
 * tombol Logout. Ganti identitas dilakukan lewat dropdown pilih-NIK pada
 * modal PIN, dipicu ulang dengan Logout di sini.
 *
 * NIK yang ditampilkan diambil dari `stoNikAktif` (sumber reaktif tunggal),
 * BUKAN prop `nik`/`store.nik`: yang terakhir bisa tertinggal berisi NIK lama
 * setelah sesi dicabut (401 / gagal cek token). Selagi belum masuk atau sudah
 * logout, `stoNikAktif` kosong -- NIK dan tombol Logout disembunyikan.
 */
withDefaults(
  defineProps<{
    nik?: string;
    /** Keterangan singkat di bawah NIK, beda-beda tiap halaman. */
    keterangan?: string;
    loading?: boolean;
  }>(),
  { nik: '', keterangan: '', loading: false }
);

const emit = defineEmits<{ logout: [] }>();
</script>

<template>
  <div class="pr-8">
    <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Diakses sebagai</span>
    <div class="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
      {{ stoNikAktif || '-' }}
      <button
        v-if="stoNikAktif"
        type="button"
        title="Keluar dari sesi STO"
        :disabled="loading"
        class="inline-flex items-center justify-center w-6 h-6 rounded-md !border !border-gray-300 text-gray-400 hover:text-red-600 hover:!border-red-400 transition disabled:cursor-not-allowed disabled:opacity-50"
        @click="emit('logout')"
      >
        <i class="mdi text-sm" :class="loading ? 'mdi-loading mdi-spin' : 'mdi-logout'" />
      </button>
    </div>
    <span v-if="keterangan && stoNikAktif" class="text-[11px] text-gray-400">{{ keterangan }}</span>
  </div>
</template>
