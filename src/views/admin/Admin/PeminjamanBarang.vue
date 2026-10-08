<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePeminjamanStore } from '@/stores/Admin/Peminjaman';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';
import CustomSelectSearch from '@/components/CustomSelectSearch.vue';
import KetersediaanKategori from '@/components/inventory/KetersediaanKategori.vue';
import SegmentedTabs, { type SegmentedTabOption } from '@/components/inventory/SegmentedTabs.vue';
import type { PeminjamanItem, PinjamItemForm } from '@/types/Admin/Peminjaman';

const page = ref({ title: 'Peminjaman Barang' });
const breadcrumbs = shallowRef([
  { title: 'IT', disabled: false, href: '#' },
  { title: 'Peminjaman Barang', disabled: true, href: '#' }
]);

const peminjamanStore = usePeminjamanStore();
const { openFormPinjam, addItemPinjam, removeItemPinjam, onSavePinjam, openFormKembali, onSaveKembali, openDetail, pilihPeminjam } =
  peminjamanStore;
const { dataTable, ketersediaan, filters, pinjamForm, kembaliForm, detailItems, dialog, formError } = storeToRefs(peminjamanStore);

const isLoading = ref(false);
const hasLoaded = ref(false);
const tableKey = ref(0);
const barangDipilih = ref<string | null>(null);

// Karyawan HR portal dipetakan ke bentuk CustomSelectSearch: NIK - Nama, departemen di baris kedua
interface EmployeeSelectItem {
  job_number: string;
  part_number: string;
  type: string;
}

const employeeOptions = computed<EmployeeSelectItem[]>(() =>
  peminjamanStore.employees.map((karyawan) => ({
    job_number: karyawan.nik,
    part_number: karyawan.nama,
    type: karyawan.departemen
  }))
);

// HR portal tidak membedakan IT dari PCD, jadi petugas IT yang boleh mengetahui & menerima barang didaftarkan per NIK
const PETUGAS_IT_NIK = [
  'M.2357', // M. YAHYA - INFRASTRUCTURE & NETWORK
  'M.9276', // MUHAMAD FARHAN PURNOMO ADJIE - INFRASTRUCTURE & NETWORK
  'A.9382', // ALIVIA HARIS - IT MRP PART
  'V.10202', // VIVKI SILVIA DELVI - IT SAP IFPP
  'S.10448', // SHERINA BELLA ADELIA - IT SAP IFRM
  'C.9824', // CHRISTOPER RICHARD SANTOSO - DEVELOPMENT SYSTEM HARDWARE & SOFTWARE
  'A.9131', // AZ ZAHRA HAZIMAH PUTRI BUDIONO - SAP MM
  'M.9149', // MOCH. THORIQ ALFARIDZI - SAP MM IRM
  'A.9214', // ARIEF RAHMAN ROSYIDI - SAP PP
  'M.10124', // MOCHAMAD FARHAN EKA WIDARTO - SAP FICO
  'D.9365', // DIVA AQILLA PUTRIE - PCD STAFF
  'E.9948', // EFRINO WAHYU EKO PAMBUDI - PCD STAFF
  'F.9964', // FARHAN AKMAL SHALEH - PCD STAFF
  'E.10336', // EKA YULIANTO - PCD STAFF
  'A.10525', // ANANDARU FANHASH ZAHAR - PCD STAFF
  'D.10780', // DHARMA SETIAWAN - PCD STAFF
  'J.10312', // JANUAR SETYO NEGORO - STAFF
  'M.4245', // M MALIK FITRIANTO - PCD DEPUTY DEPT. HEAD
  'S.9390' // SATRIYA RIFKI PANGESTU - PC WELDING
];

const petugasOptions = computed<EmployeeSelectItem[]>(() =>
  employeeOptions.value.filter((item) => PETUGAS_IT_NIK.includes(item.job_number))
);

// Dropdown karyawan memakai return-type object supaya trigger menampilkan "NIK - Nama"
const peminjamDipilih = ref<EmployeeSelectItem | null>(null);
const petugasSerahDipilih = ref<EmployeeSelectItem | null>(null);
const petugasTerimaDipilih = ref<EmployeeSelectItem | null>(null);

const onPilihPeminjam = (item: EmployeeSelectItem | null) => {
  pilihPeminjam(item ? item.job_number : '');
};

const onPilihPetugasSerah = (item: EmployeeSelectItem | null) => {
  pinjamForm.value.petugas_serah = item ? item.part_number : '';
};

const onPilihPetugasTerima = (item: EmployeeSelectItem | null) => {
  kembaliForm.value.petugas_terima = item ? item.part_number : '';
};

// Barang siap pinjam dipetakan ke bentuk yang dipakai CustomSelectSearch,
// sehingga kode & nama barang bisa dicari langsung dari dropdown
const barangOptions = computed(() =>
  peminjamanStore.barangTersedia.map((barang) => ({
    job_number: barang.kode_barang,
    part_number: barang.nama_barang,
    type: `${barang.merk || 'Tanpa merk'} · ${barang.nama_area || '-'} / Rak ${barang.rak || '-'} — ${barang.kondisi}`
  }))
);

// Unit siap pinjam per kategori, berkurang otomatis saat unit ditambahkan ke daftar pinjam
const stokPerKategori = computed(() => {
  const map = new Map<string, number>();
  peminjamanStore.barangTersedia.forEach((barang) => {
    const nama = barang.nama_kategori || 'Tanpa Kategori';
    map.set(nama, (map.get(nama) || 0) + 1);
  });
  return [...map.entries()].map(([nama, qty]) => ({ nama, qty }));
});

const kembaliDipilih = computed(() => kembaliForm.value.items.filter((item) => item.dikembalikan).length);

// Lama pinjam diatur per barang
const ubahLamaPinjam = (item: PinjamItemForm, delta: number) => {
  const lama = Math.floor(Number(item.lama_pinjam)) || 1;
  item.lama_pinjam = Math.max(1, lama + delta);
};

const inputClass =
  'block w-full rounded-[12px] border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-gray-700 dark:text-white';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

const kondisiButtons = [
  { value: 'BAIK', label: 'Baik', active: 'bg-green-500 text-white shadow-sm', dot: 'bg-green-500' },
  { value: 'SEDANG', label: 'Sedang', active: 'bg-amber-500 text-white shadow-sm', dot: 'bg-amber-500' },
  { value: 'RUSAK', label: 'Rusak', active: 'bg-red-500 text-white shadow-sm', dot: 'bg-red-500' }
];

const columns: TableColumn[] = [
  { key: 'no_pinjam', label: 'No Pinjam' },
  { key: 'waktu_pinjam', label: 'Waktu Pinjam' },
  { key: 'nama_peminjam', label: 'Peminjam' },
  { key: 'departemen', label: 'Departemen' },
  { key: 'barang_label', label: 'Barang' },
  { key: 'belum_kembali_label', label: 'Belum Kembali', align: 'center' },
  { key: 'keperluan', label: 'Keperluan' },
  { key: 'lokasi_penggunaan', label: 'Lokasi Penggunaan' },
  { key: 'tgl_jatuh_tempo', label: 'Jatuh Tempo' },
  { key: 'waktu_kembali', label: 'Waktu Kembali' },
  { key: 'lama_pinjam_label', label: 'Lama Pinjam' },
  { key: 'status', label: 'Status', align: 'center' }
];

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(String(value).replace(' ', 'T'));
  return isNaN(date.getTime()) ? null : date;
};

// Lama pinjam dihitung sampai hari ini selama barang belum kembali, atau sampai waktu kembali jika sudah selesai
const hitungLamaHari = (item: PeminjamanItem): number => {
  const mulai = toDate(item.waktu_pinjam);
  if (!mulai) return 0;

  const akhir = (item.status === 'SELESAI' && toDate(item.waktu_kembali)) || new Date();
  return Math.max(0, Math.floor((akhir.getTime() - mulai.getTime()) / 86400000));
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Status jatuh tempo untuk barang yang belum kembali: AMAN (belum jatuh tempo), HARI_INI, TERLAMBAT
const statusJatuhTempo = (item: PeminjamanItem): 'AMAN' | 'HARI_INI' | 'TERLAMBAT' | 'SELESAI' => {
  if (item.status === 'SELESAI') return 'SELESAI';

  const tempo = toDate(item.tgl_jatuh_tempo);
  if (!tempo) return 'AMAN';

  const sekarang = new Date();
  if (sekarang.getTime() > tempo.getTime()) return 'TERLAMBAT';
  if (isSameDay(sekarang, tempo)) return 'HARI_INI';
  return 'AMAN';
};

// Hijau: belum jatuh tempo, kuning: jatuh tempo hari ini, merah: lewat jatuh tempo
const tempoClass = (statusTempo: unknown): string => {
  if (statusTempo === 'TERLAMBAT') return 'text-red-600 font-semibold';
  if (statusTempo === 'HARI_INI') return 'text-yellow-600 font-semibold';
  if (statusTempo === 'AMAN') return 'text-green-600 font-semibold';
  return 'text-gray-500 dark:text-gray-400';
};

const kondisiClass = (kondisi: unknown): string => {
  if (kondisi === 'BAIK') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  if (kondisi === 'SEDANG') return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
};

// Pratinjau jatuh tempo per barang di form, lama pinjam kosong dianggap 1 hari
const previewJatuhTempo = (lamaPinjam: unknown): string => {
  const lama = Math.floor(Number(lamaPinjam));
  const tempo = new Date();
  tempo.setDate(tempo.getDate() + (lama >= 1 ? lama : 1));
  return formatTanggalIndo(tempo, false);
};

// Format tanggal Indonesia. Lengkap: "Kamis, 17 September 2026 pukul 16.38 WIB", singkat: "17 Sep 2026, 16.38"
const formatTanggalIndo = (value: unknown, lengkap = true): string => {
  const date = value instanceof Date ? value : toDate(value);
  if (!date) return '-';
  const tanggal = date.toLocaleDateString('id-ID', {
    weekday: lengkap ? 'long' : undefined,
    day: 'numeric',
    month: lengkap ? 'long' : 'short',
    year: 'numeric'
  });
  const jam = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return lengkap ? `${tanggal} pukul ${jam} WIB` : `${tanggal}, ${jam}`;
};

const inisial = (nama: string): string =>
  nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join('')
    .toUpperCase();

const detailInfo = computed(() => detailItems.value[0] || null);
const detailBelumKembali = computed(() => detailItems.value.filter((item) => item.status !== 'SELESAI').length);

const statusClass = (status: unknown): string => {
  if (status === 'SELESAI') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
};

// Data lama bisa berstatus SEBAGIAN KEMBALI; di tampilan unit itu dianggap belum kembali
const statusUnit = (status: unknown): string => (status === 'SELESAI' ? 'SELESAI' : 'DIPINJAM');

interface UnitBaris {
  kode_barang: string;
  nama_barang: string;
  selesai: boolean;
  lama_hari: number;
  lama_pinjam: number;
  tgl_jatuh_tempo: string | null;
  waktu_kembali: string | null;
  status_tempo: string;
}

// Filter status dilakukan di sisi tampilan, data hasil Load Data tidak diambil ulang
const statusFilter = ref('SEMUA');

// Tabel ditampilkan 1 baris per nomor pinjam. Statusnya SELESAI hanya jika seluruh unit sudah kembali.
// Lama pinjam, jatuh tempo, dan waktu kembali tetap dihitung per barang (units).
const tableRows = computed(() => {
  const grup = new Map<string, PeminjamanItem[]>();
  dataTable.value.forEach((item) => {
    grup.set(item.no_pinjam, [...(grup.get(item.no_pinjam) || []), item]);
  });

  return [...grup.values()].map((items) => {
    const units: UnitBaris[] = items.map((item) => {
      const unit = { ...item, status: statusUnit(item.status) };
      return {
        kode_barang: item.kode_barang,
        nama_barang: item.nama_barang,
        selesai: unit.status === 'SELESAI',
        lama_hari: hitungLamaHari(unit),
        lama_pinjam: Number(item.lama_pinjam) || 1,
        tgl_jatuh_tempo: item.tgl_jatuh_tempo,
        waktu_kembali: unit.status === 'SELESAI' ? item.waktu_kembali : null,
        status_tempo: statusJatuhTempo(unit)
      };
    });
    const belumKembali = units.filter((unit) => !unit.selesai).length;

    return {
      ...items[0],
      status: belumKembali ? 'DIPINJAM' : 'SELESAI',
      units,
      jumlah_unit: units.length,
      belum_kembali: belumKembali,
      // Label teks dipakai filter & sort kolom TableExcel
      barang_label: units.map((unit) => unit.nama_barang).join(', '),
      belum_kembali_label: belumKembali ? `${belumKembali} dari ${units.length} unit` : 'Semua kembali',
      lama_pinjam_label: units.map((unit) => `${unit.lama_hari}/${unit.lama_pinjam} hari`).join(', '),
      waktu_kembali: units.every((unit) => unit.selesai) ? units.map((unit) => unit.waktu_kembali || '').sort().pop() || null : null
    };
  });
});

const countStatus = (status: string): number => tableRows.value.filter((item) => item.status === status).length;

const statusOptions = computed<SegmentedTabOption[]>(() => [
  { value: 'SEMUA', label: 'Semua', count: tableRows.value.length, tone: 'gray' },
  { value: 'DIPINJAM', label: 'Dipinjam', count: countStatus('DIPINJAM'), tone: 'blue' },
  { value: 'SELESAI', label: 'Selesai', count: countStatus('SELESAI'), tone: 'green' }
]);

const filteredData = computed(() =>
  statusFilter.value === 'SEMUA' ? tableRows.value : tableRows.value.filter((item) => item.status === statusFilter.value)
);

watch(statusFilter, () => {
  tableKey.value++;
});

onMounted(() => {
  peminjamanStore.fetchKetersediaan();
});

const onTambahBarang = () => {
  if (!barangDipilih.value) return;
  addItemPinjam(barangDipilih.value);
  barangDipilih.value = null;
};

const onLoadData = async () => {
  if (!filters.value.date_from) {
    alert('Silakan pilih tanggal mulai terlebih dahulu.');
    return;
  }
  isLoading.value = true;
  try {
    await peminjamanStore.fetchPeminjaman();
    hasLoaded.value = true;
    tableKey.value++;
  } finally {
    isLoading.value = false;
  }
};

// Setelah transaksi tersimpan store ikut me-refresh data, tabel langsung ditampilkan
watch(dataTable, (rows) => {
  if (rows.length) hasLoaded.value = true;
});

// Pilihan dropdown ikut direset tiap form dibuka supaya tidak membawa data lama
const onBukaFormPinjam = async () => {
  peminjamDipilih.value = null;
  petugasSerahDipilih.value = null;
  await openFormPinjam();
};

const kembaliRow = async (row: Record<string, unknown>) => {
  petugasTerimaDipilih.value = null;
  await openFormKembali(row.no_pinjam as string);
};

const detailRow = (row: Record<string, unknown>) => {
  openDetail(row.no_pinjam as string);
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-2" />

  <div>
    <div class="flex flex-wrap">
      <div class="flex items-center justify-between my-3 px-1 w-full">
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Filter tanggal (start + end, dua button) -->
          <DateRangePickerSplitButton
            v-model:start="filters.date_from"
            v-model:end="filters.date_to"
            start-label="Dari"
            end-label="Sampai"
          />

          <!-- Load Data Button -->
          <button
            type="button"
            @click="onLoadData"
            :disabled="isLoading || !filters.date_from"
            class="mx-2 flex items-center gap-2 text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 font-medium rounded-full text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Loading...' : 'Load Data' }}
          </button>

          <!-- Catat Peminjaman -->
          <button
            type="button"
            @click="onBukaFormPinjam"
            class="mx-2 flex items-center gap-2 text-white bg-cyan-600 hover:bg-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14" />
            </svg>
            Catat Peminjaman
          </button>
        </div>
      </div>
    </div>

    <!-- Ketersediaan barang, tampil tanpa menunggu Load Data -->
    <KetersediaanKategori :items="ketersediaan" class="mx-1" />

    <div
      v-if="!hasLoaded"
      class="mx-1 mt-5 flex flex-col items-center justify-center gap-2 rounded-[16px] bg-white py-16 text-gray-400 shadow-sm ring-1 ring-inset ring-slate-200 dark:bg-gray-800 dark:ring-gray-700"
    >
      <svg class="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-sm">
        Pilih tanggal <span class="font-semibold text-indigo-500">Dari &amp; Sampai</span>, lalu tekan
        <span class="font-semibold text-indigo-500">Load Data</span> untuk menampilkan data peminjaman.
      </p>
    </div>

    <!-- Toolbar tabel: filter status di kiri, keterangan warna jatuh tempo di kanan -->
    <div v-if="hasLoaded" class="mx-1 mb-3 mt-5 flex flex-wrap items-center justify-between gap-3">
      <SegmentedTabs v-model="statusFilter" :options="statusOptions" />
      <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span class="font-medium">Jatuh tempo:</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-green-500"></span>Aman</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-yellow-500"></span>Hari ini</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-500"></span>Terlambat</span>
      </div>
    </div>

    <TableExcel
      v-if="hasLoaded"
      :key="tableKey"
      :columns="columns"
      :data="filteredData as unknown as Record<string, unknown>[]"
      :loading="isLoading"
    >
      <template #cell-waktu_pinjam="{ row }">
        <span class="whitespace-nowrap">{{ formatTanggalIndo((row as any).waktu_pinjam, false) }}</span>
      </template>
      <!-- Kolom per barang: satu baris per unit supaya sejajar antar kolom -->
      <template #cell-barang_label="{ row }">
        <ul class="space-y-1">
          <li v-for="unit in (row as any).units" :key="unit.kode_barang" class="flex h-5 items-center gap-1.5 whitespace-nowrap">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="unit.selesai ? 'bg-green-500' : 'bg-blue-500'"></span>
            <span class="max-w-[220px] truncate" :title="`${unit.kode_barang} - ${unit.nama_barang}`">{{ unit.nama_barang }}</span>
          </li>
        </ul>
      </template>
      <template #cell-belum_kembali_label="{ row }">
        <span
          v-if="Number((row as any).belum_kembali) > 0"
          class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900 dark:text-orange-300"
        >
          {{ (row as any).belum_kembali_label }}
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Semua kembali
        </span>
      </template>
      <template #cell-tgl_jatuh_tempo="{ row }">
        <ul class="space-y-1">
          <li v-for="unit in (row as any).units" :key="unit.kode_barang" class="flex h-5 items-center whitespace-nowrap" :class="tempoClass(unit.status_tempo)">
            {{ formatTanggalIndo(unit.tgl_jatuh_tempo, false) }}
          </li>
        </ul>
      </template>
      <template #cell-waktu_kembali="{ row }">
        <ul class="space-y-1">
          <li v-for="unit in (row as any).units" :key="unit.kode_barang" class="flex h-5 items-center whitespace-nowrap">
            <span v-if="unit.selesai">{{ formatTanggalIndo(unit.waktu_kembali, false) }}</span>
            <span v-else class="text-xs font-medium text-orange-600">Belum kembali</span>
          </li>
        </ul>
      </template>
      <template #cell-lama_pinjam_label="{ row }">
        <ul class="space-y-1">
          <li
            v-for="unit in (row as any).units"
            :key="unit.kode_barang"
            class="flex h-5 items-center gap-1 whitespace-nowrap"
            :class="tempoClass(unit.status_tempo)"
            :title="unit.status_tempo === 'TERLAMBAT' ? 'Lewat jatuh tempo' : unit.status_tempo === 'HARI_INI' ? 'Jatuh tempo hari ini' : ''"
          >
            <svg
              v-if="unit.status_tempo === 'TERLAMBAT' || unit.status_tempo === 'HARI_INI'"
              class="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {{ unit.lama_hari }} / {{ unit.lama_pinjam }} hari
          </li>
        </ul>
      </template>
      <template #cell-status="{ row }">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="statusClass((row as any).status)">
          {{ (row as any).status || '-' }}
        </span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-center space-x-2">
          <!-- Detail -->
          <button
            type="button"
            @click="detailRow(row)"
            class="inline-flex items-center justify-center p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200"
            title="Lihat Catatan Peminjaman"
          >
            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>

          <!-- Proses pengembalian -->
          <button
            v-if="(row as any).status !== 'SELESAI'"
            type="button"
            @click="kembaliRow(row)"
            class="inline-flex items-center justify-center p-2 text-sm font-medium text-white bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800 transition-all duration-200"
            title="Proses Pengembalian"
          >
            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h11a4 4 0 010 8h-1M3 10l4-4M3 10l4 4" />
            </svg>
          </button>
        </div>
      </template>

      <template #empty>
        <div class="flex flex-col items-center justify-center py-20 text-gray-400 w-full">
          <svg
            class="w-12 h-12 mb-3 text-gray-300"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm">Tidak ada data peminjaman untuk rentang tanggal yang dipilih.</p>
        </div>
      </template>
    </TableExcel>
  </div>

  <!-- ==================== Modal Catat Peminjaman ==================== -->
  <Transition name="modal">
    <div
      v-if="dialog.pinjam"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      @click.self="dialog.pinjam = false"
    >
      <div class="form-modern relative w-full max-w-3xl max-h-full">
        <div class="relative flex flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl dark:bg-gray-800">
          <!-- Header -->
          <div class="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 px-6 py-5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white/15 ring-1 ring-white/30">
                  <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <div>
                  <h1 class="text-xl font-bold text-white">Catat Peminjaman</h1>
                  <p class="mt-0.5 text-sm text-indigo-100">Tanggal & jam pinjam terisi otomatis saat disimpan</p>
                </div>
              </div>
              <button
                type="button"
                @click="dialog.pinjam = false"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                title="Tutup"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-6">
            <div
              v-if="formError"
              class="flex items-start gap-3 rounded-[12px] border bd-red-soft bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-900 dark:text-red-400"
              role="alert"
            >
              <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="font-semibold">Peminjaman gagal disimpan</p>
                <p class="mt-0.5">{{ formError }}</p>
              </div>
              <button type="button" @click="formError = ''" class="text-red-500 hover:text-red-700" title="Tutup">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </button>
            </div>

            <!-- Section 1: Peminjam -->
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="step-badge">1</span>
                <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">Data Peminjam</h2>
              </div>
              <div class="section-card grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span :class="labelClass">Peminjam <span class="text-red-500">*</span></span>
                  <div class="select-modern">
                    <CustomSelectSearch v-model="peminjamDipilih" :items="employeeOptions" label="Cari NIK / nama karyawan" @change="onPilihPeminjam" />
                  </div>
                </div>
                <div>
                  <span :class="labelClass">Departemen</span>
                  <div class="flex min-h-[42px] items-center gap-2 rounded-[12px] border bg-gray-100 px-3.5 text-sm dark:bg-gray-700">
                    <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span v-if="pinjamForm.departemen" class="font-medium text-gray-700 dark:text-gray-200">{{ pinjamForm.departemen }}</span>
                    <span v-else class="text-gray-400">Terisi otomatis dari peminjam</span>
                  </div>
                </div>
                <div>
                  <label for="keperluan" :class="labelClass">Keperluan <span class="text-red-500">*</span></label>
                  <input type="text" id="keperluan" v-model="pinjamForm.keperluan" :class="inputClass" placeholder="Contoh: meeting vendor" />
                </div>
                <div>
                  <label for="lokasi_penggunaan" :class="labelClass">Lokasi Penggunaan <span class="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="lokasi_penggunaan"
                    v-model="pinjamForm.lokasi_penggunaan"
                    :class="inputClass"
                    placeholder="Contoh: Ruang Meeting Lt.2"
                  />
                </div>
              </div>
            </section>

            <!-- Section 2: Petugas -->
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="step-badge">2</span>
                <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">Petugas & Catatan</h2>
              </div>
              <div class="section-card grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span :class="labelClass">Diketahui Oleh <span class="text-red-500">*</span></span>
                  <div class="select-modern">
                    <CustomSelectSearch
                      v-model="petugasSerahDipilih"
                      :items="petugasOptions"
                      label="Pilih petugas IT"
                      @change="onPilihPetugasSerah"
                    />
                  </div>
                </div>
                <div class="sm:col-span-2">
                  <label for="ket_pinjam" :class="labelClass">Keterangan</label>
                  <input type="text" id="ket_pinjam" v-model="pinjamForm.ket" :class="inputClass" placeholder="Catatan tambahan (opsional)" />
                </div>
              </div>
            </section>

            <!-- Section 3: Barang -->
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="step-badge">3</span>
                <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">Barang Dipinjam</h2>
                <span
                  v-if="pinjamForm.items.length"
                  class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                >
                  {{ pinjamForm.items.length }} unit
                </span>
              </div>
              <div class="section-card space-y-4">
                <!-- Qty tersedia per kategori -->
                <div>
                  <span :class="labelClass">Tersedia per Kategori</span>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="item in stokPerKategori"
                      :key="item.nama"
                      class="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {{ item.nama }}
                      <span class="rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-700">{{ item.qty }}</span>
                    </span>
                    <span v-if="!stokPerKategori.length" class="text-xs text-gray-400">Tidak ada unit yang tersedia</span>
                  </div>
                </div>

                <div>
                  <span :class="labelClass">Pilih Unit <span class="text-red-500">*</span></span>
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <div class="select-modern w-full">
                      <CustomSelectSearch
                        v-model="barangDipilih"
                        :items="barangOptions"
                        label="Cari kode / nama barang"
                        return-type="job_number"
                      />
                    </div>
                    <button
                      type="button"
                      @click="onTambahBarang"
                      :disabled="!barangDipilih"
                      class="flex h-[42px] items-center justify-center gap-1.5 whitespace-nowrap rounded-[12px] bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
                      </svg>
                      Tambah
                    </button>
                  </div>
                </div>

                <div v-if="!pinjamForm.items.length" class="rounded-[12px] border border-dashed px-4 py-6 text-center text-sm text-gray-400">
                  Belum ada unit dipilih
                </div>
                <ul v-else class="space-y-2">
                  <li
                    v-for="(item, index) in pinjamForm.items"
                    :key="item.kode_barang"
                    class="flex items-center gap-3 rounded-[12px] border bg-white px-4 py-3 dark:bg-gray-700"
                  >
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 dark:bg-indigo-900/40">
                      <svg class="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-300">{{ item.kode_barang }}</span>
                        <span v-if="item.nama_kategori" class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-200">
                          {{ item.nama_kategori }}
                        </span>
                      </div>
                      <p class="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {{ item.nama_barang }} <span class="font-normal text-gray-500">· {{ item.merk || 'Tanpa merk' }}</span>
                      </p>
                      <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                        {{ item.lokasi }} ·
                        <span class="rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="kondisiClass(item.kondisi)">{{ item.kondisi }}</span>
                      </p>
                    </div>
                    <!-- Lama pinjam per barang -->
                    <div class="flex shrink-0 flex-col items-end gap-1">
                      <div class="flex items-center overflow-hidden rounded-[10px] border bg-white dark:bg-gray-700">
                        <button
                          type="button"
                          @click="ubahLamaPinjam(item, -1)"
                          class="flex h-8 w-8 items-center justify-center font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                          title="Kurangi"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          v-model="item.lama_pinjam"
                          class="h-8 w-10 border-0 bg-transparent p-0 text-center text-sm font-semibold text-gray-800 focus:outline-none focus:ring-0 dark:text-white"
                          placeholder="1"
                        />
                        <button
                          type="button"
                          @click="ubahLamaPinjam(item, 1)"
                          class="flex h-8 w-8 items-center justify-center font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                          title="Tambah"
                        >
                          +
                        </button>
                        <span class="pr-2.5 text-xs text-gray-500">hari</span>
                      </div>
                      <span class="text-[11px] text-indigo-600 dark:text-indigo-300">Tempo {{ previewJatuhTempo(item.lama_pinjam) }}</span>
                    </div>
                    <button
                      type="button"
                      @click="removeItemPinjam(index)"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Hapus unit"
                    >
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2-3h6a1 1 0 011 1v1H8V5a1 1 0 011-1z"
                        />
                      </svg>
                    </button>
                  </li>
                </ul>
              </div>
            </section>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4 dark:bg-gray-900/40">
            <p class="hidden text-xs text-gray-500 sm:block dark:text-gray-400"><span class="text-red-500">*</span> wajib diisi</p>
            <div class="ml-auto flex items-center gap-2">
              <button
                @click="dialog.pinjam = false"
                type="button"
                class="rounded-[12px] px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                @click="onSavePinjam"
                type="button"
                class="flex items-center gap-2 rounded-[12px] bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-indigo-300"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Simpan Peminjaman
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- ==================== Modal Pengembalian ==================== -->
  <Transition name="modal">
    <div
      v-if="dialog.kembali"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      @click.self="dialog.kembali = false"
    >
      <div class="form-modern relative w-full max-w-3xl max-h-full">
        <div class="relative flex flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl dark:bg-gray-800">
          <!-- Header -->
          <div class="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white/15 ring-1 ring-white/30">
                  <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h11a4 4 0 010 8h-1M3 10l4-4M3 10l4 4" />
                  </svg>
                </div>
                <div>
                  <h1 class="text-xl font-bold text-white">Pengembalian Barang</h1>
                  <p class="mt-0.5 text-sm text-emerald-50">
                    <span class="rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-white">{{ kembaliForm.no_pinjam }}</span>
                    · {{ kembaliForm.nama_peminjam }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                @click="dialog.kembali = false"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                title="Tutup"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-6">
            <div
              v-if="formError"
              class="flex items-start gap-3 rounded-[12px] border bd-red-soft bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-900 dark:text-red-400"
              role="alert"
            >
              <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="font-semibold">Pengembalian gagal disimpan</p>
                <p class="mt-0.5">{{ formError }}</p>
              </div>
              <button type="button" @click="formError = ''" class="text-red-500 hover:text-red-700" title="Tutup">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </button>
            </div>

            <!-- Section 1: Cek unit -->
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="step-badge step-badge-green">1</span>
                <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">Cek Unit yang Dikembalikan</h2>
                <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {{ kembaliDipilih }} / {{ kembaliForm.items.length }} unit
                </span>
              </div>
              <ul class="section-card space-y-2">
                <li
                  v-for="item in kembaliForm.items"
                  :key="item.kode_barang"
                  class="flex flex-col gap-3 rounded-[12px] border bg-white px-4 py-3 transition-all sm:flex-row sm:items-center dark:bg-gray-700"
                  :class="item.dikembalikan ? 'sel-green' : 'opacity-60'"
                >
                  <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" v-model="item.dikembalikan" class="peer sr-only" />
                    <span
                      class="check-box flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-white text-transparent transition-colors peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:text-white"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span class="min-w-0">
                      <span class="block font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">{{ item.kode_barang }}</span>
                      <span class="block truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {{ item.nama_barang }} <span class="font-normal text-gray-500">· {{ item.merk || 'Tanpa merk' }}</span>
                      </span>
                    </span>
                  </label>
                  <div class="flex items-center gap-2 sm:justify-end">
                    <span class="text-xs text-gray-500 sm:hidden">Kondisi:</span>
                    <div class="inline-flex rounded-[10px] border bg-gray-50 p-1 dark:bg-gray-800">
                      <button
                        v-for="kondisi in kondisiButtons"
                        :key="kondisi.value"
                        type="button"
                        :disabled="!item.dikembalikan"
                        @click="item.kondisi_kembali = kondisi.value"
                        class="flex items-center gap-1.5 rounded-[8px] px-3 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed"
                        :class="item.kondisi_kembali === kondisi.value ? kondisi.active : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'"
                      >
                        <span v-if="item.kondisi_kembali !== kondisi.value" class="h-2 w-2 rounded-full" :class="kondisi.dot"></span>
                        {{ kondisi.label }}
                      </button>
                    </div>
                  </div>
                </li>
              </ul>
            </section>

            <!-- Section 2: Serah terima -->
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="step-badge step-badge-green">2</span>
                <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">Serah Terima</h2>
              </div>
              <div class="section-card grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span :class="labelClass">Diterima Oleh <span class="text-red-500">*</span></span>
                  <div class="select-modern">
                    <CustomSelectSearch
                      v-model="petugasTerimaDipilih"
                      :items="petugasOptions"
                      label="Pilih petugas IT"
                      @change="onPilihPetugasTerima"
                    />
                  </div>
                </div>
                <div>
                  <label for="ket_kembali" :class="labelClass">Keterangan Hasil Cek</label>
                  <input
                    type="text"
                    id="ket_kembali"
                    v-model="kembaliForm.ket"
                    :class="inputClass"
                    placeholder="Contoh: lengkap, charger ikut"
                  />
                </div>
              </div>
            </section>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4 dark:bg-gray-900/40">
            <p class="hidden text-xs text-gray-500 sm:block dark:text-gray-400">Tanggal & jam kembali terisi otomatis</p>
            <div class="ml-auto flex items-center gap-2">
              <button
                @click="dialog.kembali = false"
                type="button"
                class="rounded-[12px] px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                @click="onSaveKembali"
                type="button"
                class="flex items-center gap-2 rounded-[12px] bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-all hover:from-emerald-700 hover:to-teal-600 focus:outline-none focus:ring-4 focus:ring-emerald-300"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Konfirmasi Serah Terima
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- ==================== Modal Detail ==================== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="dialog.detail"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        @click.self="dialog.detail = false"
      >
        <div class="form-modern relative w-full max-w-3xl overflow-hidden rounded-[18px] bg-white shadow-2xl dark:bg-gray-800">
          <!-- Header: judul + nomor peminjaman -->
          <div class="bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 px-6 py-5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white/15 ring-1 ring-white/30">
                  <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-white">Catatan Peminjaman</h2>
                  <p v-if="detailInfo" class="mt-1">
                    <span class="rounded-md bg-white/15 px-2 py-0.5 font-mono text-sm font-semibold tracking-wide text-white">
                      {{ detailInfo.no_pinjam }}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                @click="dialog.detail = false"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                title="Tutup"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <div class="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">
            <template v-if="detailInfo">
              <!-- Peminjam (highlight) -->
              <div class="flex items-center gap-4 rounded-[16px] bg-gradient-to-r from-sky-50 to-blue-50 p-4 ring-1 ring-inset ring-sky-100 dark:from-gray-900 dark:to-gray-900 dark:ring-gray-700">
                <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white shadow-md shadow-sky-500/30">
                  {{ inisial(detailInfo.nama_peminjam) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">Peminjam</p>
                  <p class="truncate text-lg font-bold text-gray-900 dark:text-white">{{ detailInfo.nama_peminjam }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    <span class="font-mono">{{ detailInfo.nik_peminjam }}</span>
                    <span v-if="detailInfo.departemen"> · {{ detailInfo.departemen }}</span>
                  </p>
                </div>
              </div>

              <!-- Info peminjaman -->
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="section-card">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Waktu Pinjam</p>
                  <p class="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{{ formatTanggalIndo(detailInfo.waktu_pinjam) }}</p>
                </div>
                <div class="section-card">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Belum Kembali</p>
                  <p class="mt-1 text-sm font-semibold" :class="detailBelumKembali ? 'text-orange-600' : 'text-green-600'">
                    {{ detailBelumKembali ? `${detailBelumKembali} dari ${detailItems.length} unit` : 'Semua unit sudah kembali' }}
                  </p>
                </div>
                <div class="section-card">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Keperluan</p>
                  <p class="mt-1 text-sm text-gray-800 dark:text-gray-100">{{ detailInfo.keperluan }}</p>
                </div>
                <div class="section-card">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Lokasi Penggunaan</p>
                  <p class="mt-1 text-sm text-gray-800 dark:text-gray-100">{{ detailInfo.lokasi_penggunaan }}</p>
                </div>
                <div class="section-card">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Diketahui Oleh</p>
                  <p class="mt-1 text-sm text-gray-800 dark:text-gray-100">{{ detailInfo.petugas_serah }}</p>
                </div>
                <div class="section-card">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Keterangan</p>
                  <p class="mt-1 text-sm text-gray-800 dark:text-gray-100">{{ detailInfo.ket || '-' }}</p>
                </div>
              </div>
            </template>

            <!-- Unit -->
            <div>
              <div class="mb-2 flex items-center gap-2">
                <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100">Barang Dipinjam</h3>
                <span class="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">{{ detailItems.length }} unit</span>
              </div>
              <p v-if="!detailItems.length" class="rounded-[12px] border border-dashed px-4 py-6 text-center text-sm text-gray-400">Tidak ada data</p>
              <ul v-else class="space-y-2">
                <li
                  v-for="item in detailItems"
                  :key="item.kode_barang"
                  class="flex flex-col gap-3 rounded-[12px] border bg-white px-4 py-3 sm:flex-row sm:items-center dark:bg-gray-700"
                >
                  <div class="min-w-0 flex-1">
                    <span class="font-mono text-xs font-semibold text-sky-700 dark:text-sky-300">{{ item.kode_barang }}</span>
                    <p class="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {{ item.nama_barang }} <span v-if="item.merk" class="font-normal text-gray-500">· {{ item.merk }}</span>
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Lama {{ item.lama_pinjam || 1 }} hari · jatuh tempo
                      <span :class="tempoClass(statusJatuhTempo({ ...item, status: statusUnit(item.status) }))">
                        {{ formatTanggalIndo(item.tgl_jatuh_tempo, false) }}
                      </span>
                    </p>
                    <p v-if="item.status === 'SELESAI'" class="text-xs text-gray-500 dark:text-gray-400">
                      Kembali {{ formatTanggalIndo(item.waktu_kembali, false) }} · diterima {{ item.petugas_terima || '-' }}
                    </p>
                    <p v-else class="text-xs font-medium text-orange-600">Belum kembali</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="item.kondisi_kembali"
                      class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      :class="kondisiClass(item.kondisi_kembali)"
                    >
                      {{ item.kondisi_kembali }}
                    </span>
                    <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusClass(statusUnit(item.status))">
                      {{ statusUnit(item.status) }}
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.border {
  border: 1px solid #e5e7eb !important;
}
.step-badge {
  display: flex;
  height: 1.5rem;
  width: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background-color: #e0e7ff;
  font-size: 0.75rem;
  font-weight: 700;
  color: #4f46e5;
}
.step-badge-green {
  background-color: #d1fae5;
  color: #059669;
}
.section-card {
  border-radius: 16px;
  background-color: rgb(248 250 252 / 0.8);
  padding: 1rem;
  box-shadow: inset 0 0 0 1px #edf1f7;
}
/* CustomSelectSearch selalu merender label sendiri; label field sudah ada di luar */
.select-modern :deep(label) {
  display: none;
}
.select-modern :deep(.relative.mt-1) {
  margin-top: 0;
}
.select-modern :deep(.relative.mt-1 > .cursor-pointer) {
  min-height: 42px;
  border-radius: 12px;
  background-color: #fff;
  border-color: #e2e8f0 !important;
  padding: 0.625rem 0.875rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
/* Utilitas .border Vuetify ada di @layer vendor dengan !important (menang atas CSS tanpa layer),
   jadi warna border form diatur di layer yang sama dengan selector lebih spesifik */
@layer vendor {
  .form-modern .border {
    border-color: #e2e8f0 !important;
  }
  .form-modern .border:focus {
    border-color: #6366f1 !important;
  }
  .form-modern .border-dashed {
    border-style: dashed !important;
    border-color: #cbd5e1 !important;
  }
  .form-modern .bd-red-soft {
    border-color: #fecaca !important;
  }
  .form-modern .sel-green {
    border-color: #10b981 !important;
  }
  .form-modern .peer:checked + .check-box {
    border-color: #10b981 !important;
  }
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>
