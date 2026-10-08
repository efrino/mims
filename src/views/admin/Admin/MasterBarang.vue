<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useMasterBarangStore } from '@/stores/Admin/MasterBarang';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import CustomSelectSearch from '@/components/CustomSelectSearch.vue';
import KetersediaanKategori from '@/components/inventory/KetersediaanKategori.vue';
import SegmentedTabs, { type SegmentedTabOption } from '@/components/inventory/SegmentedTabs.vue';
import type { ModeKodeExcel, AreaItem, RakItem } from '@/types/Admin/MasterBarang';
import { useMasterLokasiService } from '@/services/Admin/MasterLokasiService';

const page = ref({ title: 'Master Barang' });
const breadcrumbs = shallowRef([
  { title: 'IT', disabled: false, href: '#' },
  { title: 'Master Barang', disabled: true, href: '#' }
]);

const barangStore = useMasterBarangStore();
const {
  openFormBarang,
  onSaveBarang,
  deleteBarang,
  confirmDelete,
  updateFormData,
  downloadTemplate,
  uploadExcel,
  quickAddKategori,
  setKodeManual
} = barangStore;
const {
  dataTable,
  ringkasan,
  kategoriOptions,
  areaOptions,
  rakOptions,
  formData,
  kodeManual,
  previewKode,
  formError,
  action,
  dialog,
  deleteData,
  isDeleting
} = storeToRefs(barangStore);

const isLoading = ref(true);
const tableKey = ref(0);
const fileInput = ref<HTMLInputElement | null>(null);

// Modal Excel: pilih mode kode barang dulu, lalu download template atau upload file
const excelModal = ref<{ open: boolean; jenis: 'template' | 'upload' }>({ open: false, jenis: 'template' });
const excelMode = ref<ModeKodeExcel>('otomatis');
const excelFile = ref<File | null>(null);
const isDragging = ref(false);

const excelModeOptions: { value: ModeKodeExcel; judul: string; desc: string; contoh: string }[] = [
  {
    value: 'otomatis',
    judul: 'Kode Otomatis',
    desc: 'Unit belum berlabel. Tidak ada kolom kode, sistem membuat kode urut per kategori.',
    contoh: '001-LTP-TBN, 002-LTP-TBN, …'
  },
  {
    value: 'manual',
    judul: 'Kode Manual',
    desc: 'Unit sudah punya label kode. Kolom KODE BARANG wajib diisi sesuai label.',
    contoh: 'Kode dari label fisik unit'
  }
];

// Pratinjau kolom template sesuai mode (sama dengan kolom di backend)
const kolomExcel = computed(() => {
  const kolom = [
    { nama: 'KODE KATEGORI', wajib: true },
    { nama: 'NAMA BARANG', wajib: true },
    { nama: 'MERK', wajib: false },
    { nama: 'KODE AREA', wajib: true },
    { nama: 'RAK', wajib: false },
    { nama: 'KONDISI', wajib: false },
    { nama: 'KETERANGAN', wajib: false }
  ];
  return excelMode.value === 'manual' ? [{ nama: 'KODE BARANG', wajib: true }, ...kolom] : kolom;
});

const openExcelModal = (jenis: 'template' | 'upload') => {
  excelModal.value = { open: true, jenis };
  excelFile.value = null;
  barangStore.uploadError = '';
};

const pilihFile = (file?: File | null) => {
  if (!file) return;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['xlsx', 'xls'].includes(ext)) {
    barangStore.uploadError = 'Format file harus .xlsx atau .xls';
    return;
  }
  barangStore.uploadError = '';
  excelFile.value = file;
};

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  pilihFile(target.files?.[0]);
  target.value = '';
};

const onDropFile = (event: DragEvent) => {
  isDragging.value = false;
  pilihFile(event.dataTransfer?.files?.[0]);
};

const ukuranFile = (bytes: number): string => (bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

const submitExcel = async () => {
  if (excelModal.value.jenis === 'template') {
    await downloadTemplate(excelMode.value);
    excelModal.value.open = false;
    return;
  }
  if (!excelFile.value) {
    barangStore.uploadError = 'Pilih file excel terlebih dahulu';
    return;
  }
  const berhasil = await uploadExcel(excelFile.value, excelMode.value);
  if (berhasil) {
    excelModal.value.open = false;
    tableKey.value++;
  }
};

const statusOptions = ['AKTIF', 'NONAKTIF'];

const kondisiClass = (kondisi: unknown): string => {
  if (kondisi === 'BAIK') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  if (kondisi === 'SEDANG') return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
};

// Tampilan: daftar per unit atau ringkasan kondisi per nama barang
const viewMode = ref<string>('unit');
const viewOptions = computed<SegmentedTabOption[]>(() => [
  { value: 'unit', label: 'Daftar Unit', count: dataTable.value.length, tone: 'indigo' },
  { value: 'ringkasan', label: 'Ringkasan Kondisi', count: ringkasan.value.length, tone: 'green' }
]);

// Tabel dirender ulang saat berganti tampilan supaya filter kolom TableExcel tidak terbawa
watch(viewMode, () => {
  tableKey.value++;
});

const columns: TableColumn[] = [
  { key: 'kode_barang', label: 'Kode Barang' },
  { key: 'nama_kategori', label: 'Kategori' },
  { key: 'nama_barang', label: 'Nama Barang' },
  { key: 'merk', label: 'Merk' },
  { key: 'nama_area', label: 'Area' },
  { key: 'rak', label: 'Rak' },
  { key: 'kondisi', label: 'Kondisi', align: 'center' },
  { key: 'status_pinjam', label: 'Ketersediaan', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'keterangan', label: 'Keterangan' }
];

const ringkasanColumns: TableColumn[] = [
  { key: 'nama_kategori', label: 'Kategori' },
  { key: 'nama_barang', label: 'Nama Barang' },
  { key: 'merk', label: 'Merk' },
  { key: 'qty_total', label: 'Total Unit', align: 'center' },
  { key: 'qty_tersedia', label: 'Tersedia', align: 'center' },
  { key: 'qty_dipinjam', label: 'Dipinjam', align: 'center' },
  { key: 'qty_baik', label: 'Baik', align: 'center' },
  { key: 'qty_sedang', label: 'Sedang', align: 'center' },
  { key: 'qty_rusak', label: 'Rusak', align: 'center' },
  { key: 'persentase', label: 'Persentase Kondisi' }
];

const formatPersen = (value: unknown): string => `${Number(value || 0)}%`;

// Kategori dipetakan ke bentuk CustomSelectSearch: kode kategori sebagai job_number (nilai yang dikembalikan)
const kategoriSelectOptions = computed(() =>
  kategoriOptions.value.map((item) => ({
    job_number: item.kode_kategori,
    part_number: item.nama_kategori
  }))
);

// Rak dipilih setelah area. Input teks hanya muncul untuk rak lama yang belum terdaftar di area tersebut.
const showRakInput = ref(false);

const rakAreaOptions = computed(() => rakOptions.value.filter((item) => item.kode_area === formData.value.kode_area));

const pilihArea = (kode_area: string) => {
  if (formData.value.kode_area === kode_area) return;
  updateFormData('kode_area', kode_area);
  updateFormData('rak', '');
  showRakInput.value = false;
};

// Klik rak yang sama lagi untuk batal memilih (rak opsional)
const pilihRak = (nama_rak: string) => {
  showRakInput.value = false;
  updateFormData('rak', formData.value.rak === nama_rak ? '' : nama_rak);
};

const backToRakSelect = () => {
  showRakInput.value = false;
  updateFormData('rak', '');
};

// ===== Kelola area & rak langsung dari form barang (tambah / edit / hapus lewat modal kecil) =====
interface LokasiModalState {
  open: boolean;
  jenis: 'area' | 'rak';
  mode: 'Create' | 'Edit' | 'Delete';
  kode_lama: string;
  id_rak: string | number | null;
  kode_area: string;
  nama: string;
  nama_lama: string;
  status: string;
  error: string;
  saving: boolean;
}

const lokasiModal = ref<LokasiModalState>({
  open: false,
  jenis: 'area',
  mode: 'Create',
  kode_lama: '',
  id_rak: null,
  kode_area: '',
  nama: '',
  nama_lama: '',
  status: 'AKTIF',
  error: '',
  saving: false
});

const openAreaModal = (mode: 'Create' | 'Edit' | 'Delete', area?: AreaItem) => {
  lokasiModal.value = {
    open: true,
    jenis: 'area',
    mode,
    kode_lama: area?.kode_area || '',
    id_rak: null,
    kode_area: area?.kode_area || '',
    nama: area?.nama_area || '',
    nama_lama: area?.nama_area || '',
    status: 'AKTIF',
    error: '',
    saving: false
  };
};

const openRakModal = (mode: 'Create' | 'Edit' | 'Delete', rak?: RakItem) => {
  lokasiModal.value = {
    open: true,
    jenis: 'rak',
    mode,
    kode_lama: rak?.kode_area || formData.value.kode_area,
    id_rak: rak?.id_rak ?? null,
    kode_area: rak?.kode_area || formData.value.kode_area,
    nama: rak?.nama_rak || '',
    nama_lama: rak?.nama_rak || '',
    status: 'AKTIF',
    error: '',
    saving: false
  };
};

const onKodeAreaInput = (event: Event) => {
  lokasiModal.value.kode_area = (event.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  lokasiModal.value.error = '';
};

// Jumlah unit terdampak saat edit/hapus, dihitung dari data unit yang sudah dimuat
const unitTerdampak = computed(() => {
  const m = lokasiModal.value;
  if (m.mode === 'Create') return 0;
  return dataTable.value.filter((item) =>
    m.jenis === 'area' ? item.kode_area === m.kode_lama : item.kode_area === m.kode_lama && item.rak === m.nama_lama
  ).length;
});

const submitLokasi = async () => {
  const m = lokasiModal.value;
  const service = useMasterLokasiService();

  if (m.mode !== 'Delete') {
    const kosong: string[] = [];
    if (m.jenis === 'area' && !m.kode_area.trim()) kosong.push('Kode Area');
    if (!m.nama.trim()) kosong.push(m.jenis === 'area' ? 'Nama Area' : 'Nama Rak');
    if (kosong.length) {
      m.error = `${kosong.join(', ')} wajib diisi`;
      return;
    }
  }

  try {
    m.saving = true;
    m.error = '';
    if (m.jenis === 'area') {
      if (m.mode === 'Delete') await service.deleteArea(m.kode_lama);
      else await service.saveArea({ kode_lama: m.kode_lama, kode_area: m.kode_area, nama_area: m.nama.trim(), status: m.status }, m.mode);
    } else {
      if (m.mode === 'Delete') await service.deleteRak(m.id_rak as string | number);
      else await service.saveRak({ id_rak: m.id_rak, kode_area: m.kode_area, nama_rak: m.nama.trim(), status: m.status }, m.mode);
    }

    await barangStore.fetchLokasiOptions();

    // Sesuaikan pilihan di form barang dengan hasil tambah / edit / hapus
    if (m.jenis === 'area') {
      if (m.mode === 'Create') pilihArea(m.kode_area);
      else if (m.mode === 'Edit' && formData.value.kode_area === m.kode_lama) formData.value.kode_area = m.kode_area;
      else if (m.mode === 'Delete' && formData.value.kode_area === m.kode_lama) pilihArea('');
    } else if (m.mode === 'Create') {
      pilihRak(m.nama.trim());
    } else if (m.mode === 'Edit' && formData.value.rak === m.nama_lama) {
      updateFormData('rak', m.nama.trim());
    } else if (m.mode === 'Delete' && formData.value.rak === m.nama_lama) {
      updateFormData('rak', '');
    }

    // Area/rak yang diubah ikut memengaruhi data unit di tabel
    if (m.mode !== 'Create') await barangStore.fetchBarang();
    m.open = false;
  } catch (error) {
    m.error = error instanceof Error ? error.message : 'Gagal menyimpan data';
  } finally {
    m.saving = false;
  }
};

// Kelas input seragam untuk form barang
const inputClass =
  'block w-full rounded-[12px] border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

const kondisiCards = [
  { value: 'BAIK', label: 'Baik', desc: 'Normal, siap pakai', active: 'sel-green bg-green-50 ring-2 ring-green-500/20', dot: 'bg-green-500' },
  { value: 'SEDANG', label: 'Sedang', desc: 'Ada minus, masih layak', active: 'sel-amber bg-amber-50 ring-2 ring-amber-500/20', dot: 'bg-amber-500' },
  { value: 'RUSAK', label: 'Rusak', desc: 'Tidak bisa dipinjam', active: 'sel-red bg-red-50 ring-2 ring-red-500/20', dot: 'bg-red-500' }
];

// Modal kecil untuk menambah kategori baru langsung dari form Master Barang
const newKategoriKode = ref('');
const newKategoriNama = ref('');

const openTambahKategori = () => {
  newKategoriKode.value = '';
  newKategoriNama.value = '';
  dialog.value.tambahKategori = true;
};

const onKodeKategoriBaruInput = (event: Event) => {
  newKategoriKode.value = (event.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const saveKategoriBaru = async () => {
  await quickAddKategori(newKategoriKode.value, newKategoriNama.value);
};

const editRow = async (row: Record<string, unknown>) => {
  showRakInput.value = false;
  await openFormBarang('Edit', row);
  // Rak lama yang belum terdaftar di area tersebut ditampilkan sebagai input teks supaya nilainya tidak hilang
  showRakInput.value = !!formData.value.rak && !rakAreaOptions.value.some((item) => item.nama_rak === formData.value.rak);
};

const openCreateForm = async () => {
  showRakInput.value = false;
  await openFormBarang('Create');
};

const deleteRow = (row: Record<string, unknown>) => {
  confirmDelete(row.kode_barang as string, row.nama_barang as string);
};

onMounted(async () => {
  isLoading.value = true;
  await barangStore.fetchBarang();
  isLoading.value = false;
  tableKey.value++;
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-2" />

  <div>
    <div class="flex flex-wrap">
      <div class="flex items-center justify-between my-3 px-1 w-full">
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Tambah Data -->
          <button
            type="button"
            @click="openCreateForm"
            class="mx-2 flex items-center gap-2 text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            Tambah Data
          </button>

          <!-- Template Excel -->
          <button
            type="button"
            @click="openExcelModal('template')"
            class="mx-2 flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"
              />
            </svg>
            Template Excel
          </button>

          <!-- Upload Excel -->
          <button
            type="button"
            @click="openExcelModal('upload')"
            :disabled="barangStore.uploading"
            class="mx-2 flex items-center gap-2 text-white bg-purple-600 hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-300 font-medium rounded-full text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8"
              />
            </svg>
            Upload Excel
          </button>
        </div>
      </div>
    </div>

    <!-- Ketersediaan per kategori -->
    <KetersediaanKategori :items="ringkasan" class="mx-1" />

    <!-- Toolbar tabel: tab tampilan di kiri, keterangan warna di kanan -->
    <div class="mx-1 mb-3 mt-5 flex flex-wrap items-center justify-between gap-3">
      <SegmentedTabs v-model="viewMode" :options="viewOptions" />
      <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span class="font-medium">Kondisi:</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-green-500"></span>Baik</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-amber-400"></span>Sedang</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-500"></span>Rusak</span>
      </div>
    </div>

    <!-- Ringkasan kondisi per nama barang -->
    <TableExcel
      v-if="viewMode === 'ringkasan'"
      :key="`ringkasan-${tableKey}`"
      :columns="ringkasanColumns"
      :data="ringkasan as unknown as Record<string, unknown>[]"
      :loading="isLoading"
    >
      <template #cell-nama_kategori="{ row }">
        <span
          v-if="(row as any).nama_kategori"
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
        >
          {{ (row as any).nama_kategori }}
        </span>
        <span v-else class="text-gray-400">-</span>
      </template>
      <template #cell-merk="{ row }">{{ (row as any).merk || '-' }}</template>
      <template #cell-qty_total="{ row }">
        <span class="block text-center font-semibold">{{ (row as any).qty_total }}</span>
      </template>
      <template #cell-qty_tersedia="{ row }">
        <span class="block text-center font-semibold text-green-600">{{ (row as any).qty_tersedia }}</span>
      </template>
      <template #cell-qty_dipinjam="{ row }">
        <span v-if="Number((row as any).qty_dipinjam) > 0" class="block text-center font-semibold text-blue-600">
          {{ (row as any).qty_dipinjam }}
        </span>
        <span v-else class="block text-center text-gray-400">0</span>
      </template>
      <template #cell-qty_baik="{ row }">
        <span class="block text-center text-green-700">
          {{ (row as any).qty_baik }} <span class="text-xs text-gray-500">({{ formatPersen((row as any).persen_baik) }})</span>
        </span>
      </template>
      <template #cell-qty_sedang="{ row }">
        <span class="block text-center text-amber-700">
          {{ (row as any).qty_sedang }} <span class="text-xs text-gray-500">({{ formatPersen((row as any).persen_sedang) }})</span>
        </span>
      </template>
      <template #cell-qty_rusak="{ row }">
        <span class="block text-center text-red-700">
          {{ (row as any).qty_rusak }} <span class="text-xs text-gray-500">({{ formatPersen((row as any).persen_rusak) }})</span>
        </span>
      </template>
      <template #cell-persentase="{ row }">
        <div class="flex h-2.5 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div class="bg-green-500" :style="{ width: formatPersen((row as any).persen_baik) }" />
          <div class="bg-amber-400" :style="{ width: formatPersen((row as any).persen_sedang) }" />
          <div class="bg-red-500" :style="{ width: formatPersen((row as any).persen_rusak) }" />
        </div>
      </template>
      <template #empty>
        <div class="flex flex-col items-center justify-center py-20 text-gray-400 w-full">
          <p class="text-sm">Belum ada data barang.</p>
        </div>
      </template>
    </TableExcel>

    <TableExcel
      v-else
      :key="tableKey"
      :columns="columns"
      :data="dataTable as unknown as Record<string, unknown>[]"
      :loading="isLoading"
    >
      <template #cell-kode_barang="{ row }">
        <span class="font-mono">{{ (row as any).kode_barang || '-' }}</span>
      </template>
      <template #cell-nama_kategori="{ row }">
        <span
          v-if="(row as any).nama_kategori"
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
        >
          {{ (row as any).nama_kategori }}
        </span>
        <span v-else class="text-gray-400">-</span>
      </template>
      <template #cell-nama_barang="{ row }">{{ (row as any).nama_barang || '-' }}</template>
      <template #cell-merk="{ row }">{{ (row as any).merk || '-' }}</template>
      <template #cell-nama_area="{ row }">{{ (row as any).nama_area || '-' }}</template>
      <template #cell-keterangan="{ row }">
        <span class="block max-w-xs truncate text-gray-600 dark:text-gray-300" :title="(row as any).keterangan || ''">
          {{ (row as any).keterangan || '-' }}
        </span>
      </template>
      <template #cell-rak="{ row }">{{ (row as any).rak || '-' }}</template>
      <template #cell-kondisi="{ row }">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="kondisiClass((row as any).kondisi)">
          {{ (row as any).kondisi || '-' }}
        </span>
      </template>
      <template #cell-status_pinjam="{ row }">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="
            (row as any).status_pinjam === 'DIPINJAM'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
          "
        >
          {{ (row as any).status_pinjam || '-' }}
        </span>
      </template>
      <template #cell-status="{ row }">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="
            (row as any).status === 'AKTIF'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          "
        >
          {{ (row as any).status || '-' }}
        </span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-center space-x-2">
          <!-- Edit -->
          <button
            type="button"
            @click="editRow(row)"
            class="group relative inline-flex items-center justify-center p-2 text-sm font-medium text-white bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800 transition-all duration-200"
            title="Edit Data"
          >
            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>

          <!-- Delete -->
          <button
            type="button"
            @click="deleteRow(row)"
            class="inline-flex items-center justify-center p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200"
            title="Delete Data"
          >
            <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2-3h6a1 1 0 011 1v1H8V5a1 1 0 011-1z"
              />
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
          <p class="text-sm">Belum ada data barang.</p>
        </div>
      </template>
    </TableExcel>
  </div>

  <!-- ==================== Modal Form Barang ==================== -->
  <Transition name="modal">
    <div
      v-if="dialog.form"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      @click.self="dialog.form = false"
    >
      <div class="form-modern relative w-full max-w-3xl max-h-full">
        <div class="relative flex flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl dark:bg-gray-800">
          <!-- Header -->
          <div class="relative bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 px-6 py-5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white/15 ring-1 ring-white/30">
                  <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h1 class="text-xl font-bold text-white">{{ action === 'Edit' ? 'Edit Barang' : 'Tambah Barang' }}</h1>
                  <p class="mt-0.5 text-sm text-indigo-100">
                    <template v-if="action === 'Edit'">
                      Kode unit <span class="rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-white">{{ formData.kode_barang }}</span>
                    </template>
                    <template v-else>Satu data mewakili satu unit fisik barang</template>
                  </p>
                </div>
              </div>
              <button
                type="button"
                @click="dialog.form = false"
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
            <!-- Pesan gagal simpan / validasi -->
            <div
              v-if="formError"
              class="flex items-start gap-3 rounded-[12px] border bd-red-soft bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-gray-900 dark:text-red-400"
              role="alert"
            >
              <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="font-semibold">Data gagal disimpan</p>
                <p class="mt-0.5">{{ formError }}</p>
              </div>
              <button type="button" @click="formError = ''" class="text-red-500 hover:text-red-700" title="Tutup">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </button>
            </div>

            <!-- Section: Identitas -->
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">1</span>
                <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">Identitas Barang</h2>
              </div>
              <div class="grid grid-cols-1 gap-4 rounded-[16px] border bg-gray-50/60 p-4 sm:grid-cols-2 dark:border-gray-700 dark:bg-gray-900/40">
                <!-- Kode barang: otomatis dari kategori, atau manual jika unit sudah berlabel -->
                <div>
                  <div class="mb-1.5 flex h-6 items-center justify-between">
                    <label for="kode_barang" class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Kode Barang <span v-if="action === 'Create' && kodeManual" class="text-red-500">*</span>
                    </label>
                    <label v-if="action === 'Create'" class="flex cursor-pointer select-none items-center gap-2">
                      <span class="text-xs font-medium" :class="kodeManual ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'">Input manual</span>
                      <input
                        type="checkbox"
                        :checked="kodeManual"
                        @change="setKodeManual(($event.target as HTMLInputElement).checked)"
                        class="peer sr-only"
                      />
                      <div
                        class="relative h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-500 peer-checked:after:translate-x-4"
                      ></div>
                    </label>
                  </div>

                  <div
                    v-if="action === 'Edit'"
                    class="flex items-center gap-2 rounded-[12px] border bg-gray-100 px-3.5 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                  >
                    <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span class="font-mono font-semibold text-gray-600 dark:text-gray-300">{{ formData.kode_barang }}</span>
                  </div>
                  <template v-else-if="kodeManual">
                    <input
                      type="text"
                      id="kode_barang"
                      maxlength="20"
                      :value="formData.kode_barang"
                      @input="updateFormData('kode_barang', ($event.target as HTMLInputElement).value.toUpperCase().replace(/\s/g, ''))"
                      :class="[inputClass, 'font-mono']"
                      placeholder="Contoh: 001-CPU-TBN"
                    />
                    <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Sesuai label yang tertempel di unit</p>
                  </template>
                  <template v-else>
                    <div
                      class="flex items-center justify-between gap-2 rounded-[12px] border border-dashed dash-indigo bg-white px-3.5 py-2.5 text-sm dark:border-indigo-700 dark:bg-gray-700"
                    >
                      <span v-if="previewKode" class="font-mono font-semibold text-indigo-700 dark:text-indigo-300">{{ previewKode }}</span>
                      <span v-else class="text-gray-400">Pilih kategori dulu</span>
                      <span
                        class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                      >
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Otomatis
                      </span>
                    </div>
                    <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Dari kategori & nomor urut terakhir saat disimpan</p>
                  </template>
                </div>

                <!-- Kategori -->
                <div>
                  <div class="mb-1.5 flex h-6 items-center justify-between">
                    <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Kategori <span class="text-red-500">*</span>
                    </span>
                    <button
                      type="button"
                      @click="openTambahKategori"
                      class="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
                      </svg>
                      Kategori baru
                    </button>
                  </div>
                  <div class="select-modern">
                    <CustomSelectSearch
                      :model-value="formData.kode_kategori"
                      :items="kategoriSelectOptions"
                      label="Cari kode / nama kategori"
                      return-type="job_number"
                      @update:model-value="updateFormData('kode_kategori', ($event as string) || '')"
                    />
                  </div>
                </div>

                <div>
                  <label for="nama_barang" :class="labelClass">Nama Barang <span class="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="nama_barang"
                    :value="formData.nama_barang"
                    @input="updateFormData('nama_barang', ($event.target as HTMLInputElement).value)"
                    :class="inputClass"
                    placeholder="Contoh: Laptop ThinkPad E14"
                  />
                </div>
                <div>
                  <label for="merk" :class="labelClass">Merk</label>
                  <input
                    type="text"
                    id="merk"
                    :value="formData.merk"
                    @input="updateFormData('merk', ($event.target as HTMLInputElement).value)"
                    :class="inputClass"
                    placeholder="Contoh: Lenovo"
                  />
                </div>
              </div>
            </section>

            <!-- Section: Lokasi -->
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">2</span>
                <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">Lokasi Penyimpanan</h2>
              </div>
              <div class="space-y-4 rounded-[16px] border bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div>
                  <span :class="labelClass">Area <span class="text-red-500">*</span></span>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div v-for="area in areaOptions" :key="area.kode_area" class="group relative">
                      <button
                        type="button"
                        @click="pilihArea(area.kode_area)"
                        class="flex w-full items-center gap-2 rounded-[12px] border bg-white py-2.5 pl-3 pr-16 text-left text-sm transition-all dark:bg-gray-700"
                        :class="
                          formData.kode_area === area.kode_area
                            ? 'sel-indigo text-indigo-700 ring-2 ring-indigo-500/20 dark:text-indigo-300'
                            : 'text-gray-700 dark:text-gray-200'
                        "
                      >
                        <svg
                          class="h-4 w-4 shrink-0"
                          :class="formData.kode_area === area.kode_area ? 'text-indigo-500' : 'text-gray-400'"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          stroke-width="2"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span class="font-medium leading-tight">{{ area.nama_area }}</span>
                      </button>
                      <!-- Aksi kecil: muncul saat hover / area terpilih -->
                      <div
                        class="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 transition-opacity group-hover:opacity-100"
                        :class="formData.kode_area === area.kode_area ? 'opacity-100' : 'opacity-0'"
                      >
                        <button type="button" @click.stop="openAreaModal('Edit', area)" class="icon-aksi hover:bg-indigo-50 hover:text-indigo-600" title="Edit area">
                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                          </svg>
                        </button>
                        <button type="button" @click.stop="openAreaModal('Delete', area)" class="icon-aksi hover:bg-red-50 hover:text-red-600" title="Hapus area">
                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="openAreaModal('Create')"
                      class="flex items-center justify-center gap-1.5 rounded-[12px] border border-dashed dash-indigo px-3 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
                      </svg>
                      Area baru
                    </button>
                  </div>
                </div>

                <div>
                  <span :class="labelClass">Rak</span>
                  <p v-if="!formData.kode_area" class="rounded-[12px] border border-dashed px-3.5 py-3 text-sm text-gray-400 dark:border-gray-600">
                    Pilih area terlebih dahulu
                  </p>
                  <template v-else>
                    <div class="flex flex-wrap gap-2">
                      <div
                        v-for="item in rakAreaOptions"
                        :key="item.id_rak"
                        class="group inline-flex items-center rounded-full border transition-all"
                        :class="
                          !showRakInput && formData.rak === item.nama_rak
                            ? 'sel-indigo bg-indigo-500 text-white shadow-sm'
                            : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                        "
                      >
                        <button type="button" @click="pilihRak(item.nama_rak)" class="py-1.5 pl-3.5 pr-2 text-sm font-medium">
                          {{ item.nama_rak }}
                        </button>
                        <!-- Aksi kecil: melebar saat hover / rak terpilih -->
                        <span
                          class="flex items-center gap-0.5 overflow-hidden pr-1 transition-all duration-200 group-hover:max-w-[64px]"
                          :class="!showRakInput && formData.rak === item.nama_rak ? 'max-w-[64px]' : 'max-w-0'"
                        >
                          <button
                            type="button"
                            @click.stop="openRakModal('Edit', item)"
                            class="icon-aksi h-6 w-6"
                            :class="formData.rak === item.nama_rak ? 'text-white/80 hover:bg-white/20 hover:text-white' : 'hover:bg-indigo-50 hover:text-indigo-600'"
                            title="Edit rak"
                          >
                            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            @click.stop="openRakModal('Delete', item)"
                            class="icon-aksi h-6 w-6"
                            :class="formData.rak === item.nama_rak ? 'text-white/80 hover:bg-white/20 hover:text-white' : 'hover:bg-red-50 hover:text-red-600'"
                            title="Hapus rak"
                          >
                            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      </div>
                      <button
                        type="button"
                        @click="openRakModal('Create')"
                        class="flex items-center gap-1 rounded-full border border-dashed dash-indigo px-3.5 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400"
                      >
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
                        </svg>
                        Rak baru
                      </button>
                    </div>
                    <p v-if="!rakAreaOptions.length" class="mt-2 text-xs text-gray-400">Belum ada rak terdaftar di area ini</p>
                    <!-- Rak lama yang belum terdaftar di area ini -->
                    <div v-if="showRakInput" class="mt-3 flex gap-2">
                      <input
                        type="text"
                        :value="formData.rak"
                        @input="updateFormData('rak', ($event.target as HTMLInputElement).value)"
                        :class="inputClass"
                        placeholder="Nama rak"
                      />
                      <button
                        type="button"
                        @click="backToRakSelect"
                        class="shrink-0 rounded-[12px] border bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
                      >
                        Batal
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </section>

            <!-- Section: Kondisi -->
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">3</span>
                <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">Kondisi & Catatan</h2>
              </div>
              <div class="space-y-4 rounded-[16px] border bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    v-for="item in kondisiCards"
                    :key="item.value"
                    type="button"
                    @click="updateFormData('kondisi', item.value)"
                    class="flex items-start gap-3 rounded-[12px] border bg-white p-3 text-left transition-all dark:bg-gray-700"
                    :class="formData.kondisi === item.value ? item.active : 'border-[#e2e8f0] dark:border-gray-600'"
                  >
                    <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" :class="item.dot"></span>
                    <span>
                      <span class="block text-sm font-semibold text-gray-800 dark:text-gray-100">{{ item.label }}</span>
                      <span class="block text-xs text-gray-500 dark:text-gray-400">{{ item.desc }}</span>
                    </span>
                  </button>
                </div>

                <div v-if="action === 'Edit'">
                  <span :class="labelClass">Status Data</span>
                  <div class="inline-flex rounded-[12px] border bg-white p-1 dark:border-gray-600 dark:bg-gray-700">
                    <button
                      v-for="item in statusOptions"
                      :key="item"
                      type="button"
                      @click="updateFormData('status', item)"
                      class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all"
                      :class="
                        formData.status === item
                          ? item === 'AKTIF'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
                      "
                    >
                      {{ item === 'AKTIF' ? 'Aktif' : 'Nonaktif' }}
                    </button>
                  </div>
                </div>

                <div>
                  <label for="keterangan" :class="labelClass">Keterangan</label>
                  <textarea
                    id="keterangan"
                    rows="2"
                    :value="formData.keterangan"
                    @input="updateFormData('keterangan', ($event.target as HTMLTextAreaElement).value)"
                    :class="inputClass"
                    placeholder="Catatan tambahan, mis. serial number, kelengkapan charger (opsional)"
                  />
                </div>
              </div>
            </section>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/40">
            <p class="hidden items-center gap-1.5 text-xs text-gray-500 sm:flex dark:text-gray-400">
              <span class="text-red-500">*</span> wajib diisi
            </p>
            <div class="ml-auto flex items-center gap-2">
              <button
                @click="dialog.form = false"
                type="button"
                class="rounded-[12px] px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                @click="onSaveBarang"
                type="button"
                class="flex items-center gap-2 rounded-[12px] bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-indigo-300"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {{ action === 'Edit' ? 'Simpan Perubahan' : 'Simpan Barang' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- ==================== Modal Area / Rak (dari form barang) ==================== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="lokasiModal.open"
        class="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        @click.self="lokasiModal.open = false"
      >
        <div class="form-modern relative w-full max-w-sm overflow-hidden rounded-[18px] bg-white shadow-2xl dark:bg-gray-800">
          <!-- Header -->
          <div
            class="flex items-center justify-between px-5 py-4"
            :class="
              lokasiModal.mode === 'Delete'
                ? 'bg-gradient-to-r from-red-600 to-rose-500'
                : 'bg-gradient-to-r from-indigo-600 to-blue-500'
            "
          >
            <div class="flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/15 text-white ring-1 ring-white/30">
                <svg v-if="lokasiModal.mode === 'Delete'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <svg v-else-if="lokasiModal.mode === 'Edit'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
                </svg>
              </span>
              <h2 class="font-bold text-white">
                {{ lokasiModal.mode === 'Create' ? 'Tambah' : lokasiModal.mode === 'Edit' ? 'Edit' : 'Hapus' }}
                {{ lokasiModal.jenis === 'area' ? 'Area' : 'Rak' }}
              </h2>
            </div>
            <button
              type="button"
              @click="lokasiModal.open = false"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white"
              title="Tutup"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
              </svg>
            </button>
          </div>

          <div class="space-y-4 p-5">
            <div
              v-if="lokasiModal.error"
              class="flex items-start gap-2.5 rounded-[12px] border bd-red-soft bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              <svg class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{{ lokasiModal.error }}</p>
            </div>

            <!-- Konfirmasi hapus -->
            <template v-if="lokasiModal.mode === 'Delete'">
              <p class="text-sm text-gray-600 dark:text-gray-300">
                Hapus {{ lokasiModal.jenis === 'area' ? 'area' : 'rak' }}
                <span class="font-bold text-gray-900 dark:text-white">{{ lokasiModal.nama_lama }}</span>?
              </p>
              <p v-if="unitTerdampak" class="rounded-[10px] bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                Masih ada {{ unitTerdampak }} unit di {{ lokasiModal.jenis === 'area' ? 'area' : 'rak' }} ini, jadi tidak bisa dihapus. Pindahkan unitnya dulu.
              </p>
            </template>

            <!-- Form tambah / edit -->
            <template v-else>
              <div v-if="lokasiModal.jenis === 'area'" class="grid grid-cols-3 gap-3">
                <div>
                  <label :class="labelClass">Kode <span class="text-red-500">*</span></label>
                  <input
                    type="text"
                    maxlength="10"
                    :value="lokasiModal.kode_area"
                    @input="onKodeAreaInput"
                    :class="[inputClass, 'font-mono font-semibold uppercase']"
                    placeholder="GDIT"
                  />
                </div>
                <div class="col-span-2">
                  <label :class="labelClass">Nama Area <span class="text-red-500">*</span></label>
                  <input type="text" v-model="lokasiModal.nama" @input="lokasiModal.error = ''" :class="inputClass" placeholder="Contoh: Gudang IT" />
                </div>
              </div>
              <template v-else>
                <div>
                  <span :class="labelClass">Area</span>
                  <select v-model="lokasiModal.kode_area" :class="inputClass">
                    <option v-for="area in areaOptions" :key="area.kode_area" :value="area.kode_area">{{ area.nama_area }}</option>
                  </select>
                </div>
                <div>
                  <label :class="labelClass">Nama Rak <span class="text-red-500">*</span></label>
                  <input
                    type="text"
                    maxlength="30"
                    v-model="lokasiModal.nama"
                    @input="lokasiModal.error = ''"
                    :class="inputClass"
                    placeholder="Contoh: Rak 3, Kabinet A"
                  />
                </div>
              </template>

              <p
                v-if="lokasiModal.mode === 'Edit' && unitTerdampak"
                class="rounded-[10px] bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200"
              >
                {{ unitTerdampak }} unit di {{ lokasiModal.jenis === 'area' ? 'area' : 'rak' }} ini ikut menyesuaikan perubahan.
              </p>
            </template>
          </div>

          <div class="flex items-center justify-end gap-2 border-t bg-gray-50 px-5 py-3.5 dark:bg-gray-900/40">
            <button
              type="button"
              @click="lokasiModal.open = false"
              class="rounded-[10px] px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300"
            >
              Batal
            </button>
            <button
              type="button"
              @click="submitLokasi"
              :disabled="lokasiModal.saving || (lokasiModal.mode === 'Delete' && unitTerdampak > 0)"
              class="flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50"
              :class="
                lokasiModal.mode === 'Delete'
                  ? 'bg-red-600 shadow-red-500/30 hover:bg-red-700'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-500 shadow-indigo-500/30 hover:from-indigo-700 hover:to-blue-600'
              "
            >
              {{ lokasiModal.saving ? 'Menyimpan...' : lokasiModal.mode === 'Delete' ? 'Ya, Hapus' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ==================== Modal Tambah Kategori Cepat ==================== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="dialog.tambahKategori"
        class="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        @click.self="dialog.tambahKategori = false"
      >
        <div class="form-modern relative w-full max-w-sm bg-white rounded-[16px] shadow-2xl overflow-hidden dark:bg-gray-800">
          <div class="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-4 flex items-center justify-between">
            <h2 class="text-white font-bold text-lg">Tambah Kategori Baru</h2>
            <button
              @click="dialog.tambahKategori = false"
              class="text-white/80 hover:text-white hover:bg-white/20 rounded-lg w-8 h-8 inline-flex items-center justify-center transition-colors"
            >
              <svg class="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kode Kategori</label>
              <input
                type="text"
                :value="newKategoriKode"
                @input="onKodeKategoriBaruInput"
                maxlength="10"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500/20 focus:border-indigo-500 focus:ring-2 focus:outline-none block w-full p-2.5 font-mono uppercase dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Contoh: LP, PC, TLC"
              />
            </div>
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nama Kategori</label>
              <input
                type="text"
                v-model="newKategoriNama"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500/20 focus:border-indigo-500 focus:ring-2 focus:outline-none block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Contoh: Laptop, Komputer, TeleConference"
              />
            </div>
            <button
              type="button"
              @click="saveKategoriBaru"
              class="w-full text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 font-semibold rounded-[12px] shadow-md shadow-indigo-500/30 text-sm px-5 py-2.5 text-center"
            >
              Simpan & Pilih Kategori Ini
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ==================== Modal Template / Upload Excel ==================== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="excelModal.open"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        @click.self="excelModal.open = false"
      >
        <div class="form-modern relative w-full max-w-2xl overflow-hidden rounded-[18px] bg-white shadow-2xl dark:bg-gray-800">
          <!-- Header -->
          <div
            class="px-6 py-5"
            :class="
              excelModal.jenis === 'template'
                ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500'
            "
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white/15 ring-1 ring-white/30">
                  <svg v-if="excelModal.jenis === 'template'" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.8"
                      d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"
                    />
                  </svg>
                  <svg v-else class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.8"
                      d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8"
                    />
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-white">{{ excelModal.jenis === 'template' ? 'Download Template Excel' : 'Upload Data Excel' }}</h2>
                  <p class="mt-0.5 text-sm text-white/80">
                    {{ excelModal.jenis === 'template' ? 'Pilih jenis template sesuai kondisi label unit' : 'Pilih mode yang sama dengan template yang diisi' }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                @click="excelModal.open = false"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                title="Tutup"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <div class="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-6">
            <div
              v-if="barangStore.uploadError"
              class="flex items-start gap-3 rounded-[12px] border bd-red-soft bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-900 dark:text-red-400"
              role="alert"
            >
              <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="font-semibold">Upload gagal</p>
                <p class="mt-0.5">{{ barangStore.uploadError }}</p>
              </div>
            </div>

            <!-- Pilih mode kode barang -->
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-600">1</span>
                <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100">Mode Kode Barang</h3>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  v-for="item in excelModeOptions"
                  :key="item.value"
                  type="button"
                  @click="excelMode = item.value"
                  class="relative flex flex-col items-start gap-2 rounded-[14px] border bg-white p-4 text-left transition-all dark:bg-gray-700"
                  :class="excelMode === item.value ? 'sel-indigo ring-2 ring-indigo-500/20 bg-indigo-50/40' : 'hover:shadow-sm'"
                >
                  <span
                    class="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
                    :class="excelMode === item.value ? 'sel-indigo bg-indigo-500' : ''"
                  >
                    <span v-if="excelMode === item.value" class="h-2 w-2 rounded-full bg-white"></span>
                  </span>
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-[10px]"
                    :class="item.value === 'otomatis' ? 'bg-amber-50 text-amber-500' : 'bg-sky-50 text-sky-500'"
                  >
                    <svg v-if="item.value === 'otomatis'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </span>
                  <span class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ item.judul }}</span>
                  <span class="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ item.desc }}</span>
                  <span class="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-gray-600 dark:text-gray-200">{{ item.contoh }}</span>
                </button>
              </div>

              <!-- Kolom template -->
              <div class="mt-4 rounded-[12px] bg-slate-50 p-3 dark:bg-gray-900/40">
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Kolom pada template</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="kolom in kolomExcel"
                    :key="kolom.nama"
                    class="rounded-md px-2 py-1 text-[11px] font-semibold"
                    :class="kolom.wajib ? 'bg-indigo-600 text-white' : 'bg-slate-500 text-white'"
                  >
                    {{ kolom.nama }}
                  </span>
                </div>
                <p class="mt-2 text-[11px] text-gray-500"><span class="font-semibold text-indigo-600">Biru</span> wajib diisi, abu-abu opsional.</p>
              </div>
            </section>

            <!-- Pilih file (upload saja) -->
            <section v-if="excelModal.jenis === 'upload'">
              <div class="mb-3 flex items-center gap-2">
                <span class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-600">2</span>
                <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100">File Excel</h3>
              </div>

              <div
                v-if="!excelFile"
                @click="fileInput?.click()"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="onDropFile"
                class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed px-6 py-8 text-center transition-colors"
                :class="isDragging ? 'dash-indigo bg-indigo-50' : 'hover:bg-slate-50 dark:hover:bg-gray-700'"
              >
                <span class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-900/40">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8"
                    />
                  </svg>
                </span>
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Tarik file ke sini atau <span class="text-indigo-600">klik untuk memilih</span></p>
                <p class="text-xs text-gray-400">Format .xlsx / .xls</p>
              </div>
              <div v-else class="flex items-center gap-3 rounded-[14px] border bg-white px-4 py-3 dark:bg-gray-700">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-green-50 text-green-600">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{{ excelFile.name }}</p>
                  <p class="text-xs text-gray-500">{{ ukuranFile(excelFile.size) }}</p>
                </div>
                <button
                  type="button"
                  @click="excelFile = null"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Ganti file"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                  </svg>
                </button>
              </div>
              <input type="file" ref="fileInput" accept=".xlsx,.xls" class="hidden" @change="onFileChange" />
            </section>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 border-t bg-gray-50 px-6 py-4 dark:bg-gray-900/40">
            <button
              type="button"
              @click="excelModal.open = false"
              class="rounded-[12px] px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              type="button"
              @click="submitExcel"
              :disabled="barangStore.uploading || (excelModal.jenis === 'upload' && !excelFile)"
              class="flex items-center gap-2 rounded-[12px] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              :class="
                excelModal.jenis === 'template'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-500/30 hover:from-emerald-700 hover:to-teal-600'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-500 shadow-violet-500/30 hover:from-violet-700 hover:to-indigo-600'
              "
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <template v-if="excelModal.jenis === 'template'">Download Template {{ excelMode === 'manual' ? 'Manual' : 'Otomatis' }}</template>
              <template v-else>{{ barangStore.uploading ? 'Mengupload...' : 'Upload Data' }}</template>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ==================== Modal Delete Confirmation ==================== -->
  <Teleport to="body">
    <div v-if="dialog.delete" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 transition-opacity">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all scale-100">
        <button
          @click="dialog.delete = false"
          type="button"
          class="absolute top-3 right-3 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
        >
          <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </button>
        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">Delete Confirmation</h3>
          <p class="mb-5 text-lg font-normal text-gray-500">
            Apakah Anda yakin ingin menghapus barang<br />
            <span class="font-bold text-gray-800">{{ deleteData?.nama_barang }}</span>
          </p>
          <p class="mb-6 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
          <div class="flex justify-center gap-3">
            <button
              @click="deleteBarang"
              :disabled="isDeleting"
              type="button"
              class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isDeleting ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
            <button
              @click="dialog.delete = false"
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
            >
              Tidak, batalkan
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.border {
  border: 1px solid #e5e7eb !important;
}
/* CustomSelectSearch selalu merender label sendiri; di form ini label sudah ada di luar,
   jadi disembunyikan supaya input sejajar dengan field di sebelahnya */
/* Tombol ikon kecil edit/hapus pada area & rak */
.icon-aksi {
  display: inline-flex;
  height: 1.625rem;
  width: 1.625rem;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #94a3b8;
  transition: background-color 0.15s, color 0.15s;
}
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
  }
  .form-modern .dash-indigo {
    border-color: #a5b4fc !important;
  }
  .form-modern .bd-red-soft {
    border-color: #fecaca !important;
  }
  .form-modern .sel-indigo {
    border-color: #6366f1 !important;
  }
  .form-modern .sel-green {
    border-color: #22c55e !important;
  }
  .form-modern .sel-amber {
    border-color: #f59e0b !important;
  }
  .form-modern .sel-red {
    border-color: #ef4444 !important;
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
