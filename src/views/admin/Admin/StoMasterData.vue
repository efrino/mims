<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import StoAksesHeader from '@/components/sto/StoAksesHeader.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import { useStoMasterDataStore } from '@/stores/Admin/StoMasterData';
import type { StoMasterFormData, StoMasterItem } from '@/types/Admin/StoMasterData';

const page = shallowRef({ title: 'Master Data STO' });
const breadcrumbs = shallowRef([
  { title: 'Admin', disabled: false, href: '#' },
  { title: 'STO', disabled: false, href: '#' },
  { title: 'Master Data STO', disabled: true, href: '#' }
]);

const columns: TableColumn[] = [
  { key: 'area', label: 'Area', align: 'center' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'material_description', label: 'Deskripsi', width: '18rem' },
  { key: 'type', label: 'Type', align: 'center' },
  { key: 'status_part', label: 'Status Part', align: 'center' },
  { key: 'customer', label: 'Customer', align: 'center' },
  { key: 'model', label: 'Model', align: 'center' },
  { key: 'total_tag', label: 'Dipakai Tag', align: 'center' }
];

// Kolom opsional (plant/process/category/model) NULL-able di database;
// sisanya NOT NULL dan divalidasi backend.
type SaranKey = 'area' | 'type' | 'status_part' | 'customer' | 'plant' | 'process' | 'category' | 'model';

interface FormField {
  key: keyof StoMasterFormData;
  label: string;
  wajib: boolean;
  /** Kolom VARCHAR bebas -- diberi datalist berisi nilai yang sudah dipakai. */
  saran?: SaranKey;
  lebar?: boolean;
}

const formFields: FormField[] = [
  { key: 'area', label: 'Area', wajib: true, saran: 'area' },
  { key: 'part_number', label: 'Part Number', wajib: true },
  { key: 'job_number', label: 'Job Number', wajib: true },
  { key: 'material_description', label: 'Deskripsi Material', wajib: true, lebar: true },
  { key: 'type', label: 'Type', wajib: true, saran: 'type' },
  { key: 'status_part', label: 'Status Part', wajib: true, saran: 'status_part' },
  { key: 'customer', label: 'Customer', wajib: true, saran: 'customer' },
  { key: 'plant', label: 'Plant', wajib: false, saran: 'plant' },
  { key: 'process', label: 'Process', wajib: false, saran: 'process' },
  { key: 'category', label: 'Category', wajib: false, saran: 'category' },
  { key: 'model', label: 'Model', wajib: false, saran: 'model' }
];

const store = useStoMasterDataStore();
const {
  fetchItems,
  cariBertahap,
  terapkanFilter,
  resetFilter,
  loadForm,
  confirmDelete,
  openDetail,
  onSave,
  submitDelete,
  resetForm,
  keluarSto
} = store;
const {
  nik,
  dataTable,
  totalSemua,
  filter,
  areaOptions,
  isLoggingOut,
  formData,
  action,
  duplicateFrom,
  deleteTarget,
  detail,
  isLoading,
  isSaving,
  isDeleting,
  lastError,
  dialog,
  permissions,
  adaFilterAktif,
  saranKolom
} = storeToRefs(store);

onMounted(() => {
  fetchItems();
});

function asItem(row: Record<string, unknown>): StoMasterItem {
  return row as unknown as StoMasterItem;
}

const rentang = computed(() => {
  if (dataTable.value.length === 0) return '0';
  const awal = filter.value.offset + 1;
  return `${awal} - ${filter.value.offset + dataTable.value.length}`;
});

const judulForm = computed(() =>
  action.value === 'Edit' ? 'Ubah Master Data' : action.value === 'Duplicate' ? 'Duplikat Master Data' : 'Tambah Master Data'
);

const tutupForm = () => {
  dialog.value.form = false;
  resetForm();
};

const detailRows = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return [
    { label: 'ID Item', value: String(d.id_item) },
    { label: 'Area', value: d.area },
    { label: 'Part Number', value: d.part_number },
    { label: 'Job Number', value: d.job_number },
    { label: 'Deskripsi', value: d.material_description },
    { label: 'Type', value: d.type },
    { label: 'Status Part', value: d.status_part },
    { label: 'Customer', value: d.customer },
    { label: 'Plant', value: d.plant || '-' },
    { label: 'Process', value: d.process || '-' },
    { label: 'Category', value: d.category || '-' },
    { label: 'Model', value: d.model || '-' },
    { label: 'Dipakai Tag', value: `${d.total_tag} tag STO` },
    { label: 'Dibuat', value: d.created_at || '-' },
    { label: 'Diperbarui', value: d.updated_at || '-' }
  ];
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <!-- ── Panel atas: info + filter ─────────────────────────────────── -->
  <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
    <div class="flex items-start justify-between flex-wrap gap-4 px-5 py-4">
      <div class="flex items-stretch flex-wrap gap-y-3">
        <StoAksesHeader :nik="nik" keterangan="NIK ber-role admin" :loading="isLoggingOut" @logout="keluarSto" />

        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Cocok Filter</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ totalSemua }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Ditampilkan</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ rentang }}</div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span v-if="lastError" class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 !border !border-red-200">
          {{ lastError }}
        </span>
        <button
          v-if="permissions.create"
          type="button"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-blue-600 hover:bg-blue-700 transition"
          @click="loadForm('Create')"
        >
          <PlusOutlined />
          Tambah Data
        </button>
      </div>
    </div>

    <!-- Filter -->
    <div class="flex items-center gap-2 flex-wrap px-5 py-3 !border-t !border-gray-300 bg-gray-50">
      <!-- Live search -->
      <div class="relative">
        <i class="mdi mdi-magnify absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
        <input
          v-model="filter.q"
          type="text"
          placeholder="Cari part / job / deskripsi / customer / model..."
          class="w-80 h-9 pl-8 pr-8 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @input="cariBertahap"
          @keydown.enter="terapkanFilter"
        />
        <i v-if="isLoading" class="mdi mdi-loading mdi-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 text-base" />
      </div>

      <select
        v-model="filter.area"
        class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
        @change="terapkanFilter"
      >
        <option value="">Semua area</option>
        <option v-for="a in areaOptions" :key="a" :value="a">{{ a }}</option>
      </select>

      <button
        type="button"
        title="Muat ulang"
        class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
        @click="terapkanFilter"
      >
        <ReloadOutlined />
        Muat Ulang
      </button>

      <button
        v-if="adaFilterAktif"
        type="button"
        class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
        @click="resetFilter"
      >
        Reset Filter
      </button>
    </div>
  </div>

  <!-- ── Tabel ─────────────────────────────────────────────────────── -->
  <div class="sto-table rounded-lg overflow-hidden !border !border-gray-300">
    <TableExcel :columns="columns" :data="dataTable" :loading="isLoading" thead-class="bg-gray-50">
      <template #cell-material_description="{ value }">
        <span class="block max-w-[18rem] truncate" :title="String(value || '')">{{ value || '-' }}</span>
      </template>
      <template #cell-total_tag="{ value }">
        <span
          class="px-2 py-0.5 rounded-full text-xs font-semibold"
          :class="Number(value) > 0 ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500'"
          :title="Number(value) > 0 ? 'Baris ini dipakai tag STO -- tidak bisa dihapus' : 'Belum dipakai tag'"
        >
          {{ value }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-center gap-1">
          <button
            type="button"
            title="Detail"
            class="inline-flex items-center justify-center p-1.5 text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition"
            @click="openDetail(asItem(row))"
          >
            <i class="mdi mdi-eye-outline text-sm" />
          </button>
          <button
            v-if="permissions.create"
            type="button"
            title="Duplikat baris ini"
            class="inline-flex items-center justify-center p-1.5 text-white bg-violet-500 rounded-lg hover:bg-violet-600 transition"
            @click="loadForm('Duplicate', asItem(row))"
          >
            <i class="mdi mdi-content-duplicate text-sm" />
          </button>
          <button
            v-if="permissions.update"
            type="button"
            title="Ubah"
            class="inline-flex items-center justify-center p-1.5 text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition"
            @click="loadForm('Edit', asItem(row))"
          >
            <i class="mdi mdi-pencil-outline text-sm" />
          </button>
          <button
            v-if="permissions.delete"
            type="button"
            :title="asItem(row).total_tag > 0 ? 'Dipakai tag STO -- tidak bisa dihapus' : 'Hapus'"
            :disabled="asItem(row).total_tag > 0"
            class="inline-flex items-center justify-center p-1.5 text-white bg-red-500 rounded-lg hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
            @click="confirmDelete(asItem(row))"
          >
            <i class="mdi mdi-trash-can-outline text-sm" />
          </button>
        </div>
      </template>
      <template #empty>
        <div class="w-full">
          <span class="px-5 py-12 text-center text-gray-400 text-sm">
            {{ adaFilterAktif ? 'Tidak ada baris yang cocok dengan filter ini.' : 'Belum ada master data.' }}
          </span>
        </div>
      </template>
    </TableExcel>

    <div class="flex items-center justify-between gap-3 flex-wrap px-5 py-3 !border-t !border-gray-300 bg-white">
      <span class="text-xs text-gray-500">
        Seluruh <span class="font-semibold text-gray-700">{{ totalSemua }}</span> baris yang cocok filter sudah dimuat.
        Penyaringan per kolom dan halaman diatur di tabel.
      </span>
    </div>
  </div>

  <!-- ==================== Modal Form (Tambah / Duplikat / Ubah) ==================== -->
  <Teleport to="body">
    <div v-if="dialog.form" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="flex items-center justify-between p-5 !border-b !border-gray-300">
          <h3 class="text-lg font-bold text-gray-800">{{ judulForm }}</h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-700 rounded-lg w-8 h-8 inline-flex justify-center items-center"
            @click="tutupForm"
          >
            <i class="mdi mdi-close" />
          </button>
        </div>

        <form @submit.prevent="onSave">
          <div class="p-5 max-h-[70vh] overflow-y-auto">
            <!-- Catatan penggandaan: part_number sengaja dikosongkan karena
                 (area, part_number) itu UNIQUE di database. -->
            <div
              v-if="action === 'Duplicate' && duplicateFrom"
              class="mb-4 px-4 py-3 rounded-lg text-sm bg-violet-50 text-violet-800 !border !border-violet-200"
            >
              Menggandakan
              <span class="font-semibold">{{ duplicateFrom.area }} / {{ duplicateFrom.part_number }}</span
              >. Semua kolom sudah terisi mengikuti baris asal — cukup ubah bagian yang berbeda. Part Number dikosongkan karena satu part
              hanya boleh sekali per area.
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="f in formFields" :key="f.key" :class="f.lebar ? 'md:col-span-2' : ''">
                <label class="block mb-1 text-sm font-medium text-gray-700">
                  {{ f.label }}
                  <span v-if="f.wajib" class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData[f.key]"
                  type="text"
                  :list="f.saran ? `saran-${f.key}` : undefined"
                  :placeholder="f.wajib ? `Isi ${f.label.toLowerCase()}` : 'Boleh dikosongkan'"
                  class="w-full h-9 px-3 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
                />
                <datalist v-if="f.saran" :id="`saran-${f.key}`">
                  <option v-for="s in saranKolom[f.saran]" :key="s" :value="s" />
                </datalist>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 p-5 !border-t !border-gray-300">
            <button
              type="button"
              class="inline-flex items-center h-9 font-medium rounded-lg text-sm px-4 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 transition"
              @click="tutupForm"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="isSaving" class="mdi mdi-loading mdi-spin" />
              {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Hapus ==================== -->
  <Teleport to="body">
    <div v-if="dialog.delete" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="flex items-center justify-between p-5 !border-b !border-gray-300">
          <h3 class="text-lg font-bold text-gray-800">Hapus Master Data</h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-700 rounded-lg w-8 h-8 inline-flex justify-center items-center"
            @click="dialog.delete = false"
          >
            <i class="mdi mdi-close" />
          </button>
        </div>

        <div class="p-5">
          <p class="text-sm text-gray-600">
            Hapus baris
            <span class="font-semibold text-gray-800">{{ deleteTarget?.area }} / {{ deleteTarget?.part_number }}</span>
            ({{ deleteTarget?.material_description }})?
          </p>
          <p class="mt-2 text-xs text-gray-500">Baris yang sudah dipakai tag STO akan ditolak backend dan tidak bisa dipaksa.</p>
        </div>

        <div class="flex items-center justify-end gap-2 p-5 !border-t !border-gray-300">
          <button
            type="button"
            class="inline-flex items-center h-9 font-medium rounded-lg text-sm px-4 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 transition"
            @click="dialog.delete = false"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="isDeleting"
            class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            @click="submitDelete"
          >
            <i v-if="isDeleting" class="mdi mdi-loading mdi-spin" />
            {{ isDeleting ? 'Menghapus...' : 'Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Detail ==================== -->
  <Teleport to="body">
    <div v-if="dialog.detail" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="flex items-center justify-between p-5 !border-b !border-gray-300">
          <h3 class="text-lg font-bold text-gray-800">Detail Master Data</h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-700 rounded-lg w-8 h-8 inline-flex justify-center items-center"
            @click="dialog.detail = false"
          >
            <i class="mdi mdi-close" />
          </button>
        </div>

        <div class="p-5 max-h-[70vh] overflow-y-auto">
          <dl class="divide-y divide-gray-200">
            <div v-for="r in detailRows" :key="r.label" class="flex gap-4 py-2">
              <dt class="w-40 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ r.label }}</dt>
              <dd class="text-sm text-gray-800 break-words">{{ r.value || '-' }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sto-select {
  background-size: 0.85em 0.85em;
  background-position: right 0.625rem center;
}

/* Vuetify mendaftarkan utility bernama sama dengan Tailwind (`border`,
   `border-b`, ...) memakai !important di dalam layer `vendor`, sehingga garis
   milik TableBasic selalu memakai warna Vuetify yang nyaris tak terlihat.
   Override-nya ditaruh di layer yang sama supaya specificity yang menentukan. */
@layer vendor {
  .sto-table :deep(thead tr) {
    border-bottom-color: #cbd5e1 !important;
  }

  .sto-table :deep(tbody tr) {
    border-bottom-color: #e5e7eb !important;
  }
}
</style>
