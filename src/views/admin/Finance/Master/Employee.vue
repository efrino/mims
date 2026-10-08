<script setup lang="ts">
import { onMounted, shallowRef, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import Autocomplete from '@/components/form/Autocomplete.vue';
import { useEmployeeStore } from '@/stores/Finance/Master/EmployeeStore';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons-vue';

const breadcrumbs = shallowRef([
  { title: 'Finance', disabled: false, href: '#' },
  { title: 'Master', disabled: false, href: '#' },
  { title: 'Employee', disabled: true, href: '#' }
]);

const store = useEmployeeStore();
const {
  dialog,
  activeListTab,
  selectedRow,
  loading,
  permissions,
  stagingList,
  addKasbonLimit,
  pickerNik,
  availablePickerOptions,
  editForm,
  editDocumentPreviewName,
  activeRows,
  inactiveRows,
  tableRows
} = storeToRefs(store);

const tableColumns: TableColumn[] = [
  { key: 'nik', label: 'NIK', width: '110px' },
  { key: 'name', label: 'Nama', width: '180px' },
  { key: 'department', label: 'Departemen', width: '160px' },
  { key: 'division', label: 'Divisi', width: '160px' },
  { key: 'job_title', label: 'Jabatan', width: '160px' },
  { key: 'emp_status', label: 'Status Pegawai', width: '130px' },
  { key: 'kasbon_limit', label: 'Limit Kasbon', width: '110px', align: 'center' },
  // { key: 'document', label: 'Dokumen', width: '160px' },
  { key: 'status_label', label: 'Status', width: '100px', align: 'center', sortable: false }
];

function toRows(rows: typeof tableRows.value) {
  return rows.map((r) => ({
    ...r,
    status_label: Number(r.active) !== 0 ? 'Aktif' : 'Nonaktif'
  }));
}

const activeTableData = computed(() => toRows(activeRows.value));
const inactiveTableData = computed(() => toRows(inactiveRows.value));
const allTableData = computed(() => toRows(tableRows.value));

// Pilih karyawan dari hasil rekomendasi (source) → langsung masuk daftar staging untuk ditambahkan
watch(pickerNik, (nik) => {
  if (nik) store.addToStaging(nik);
});

function onDocumentFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  store.setEditDocumentFile(file);
  input.value = ''; // supaya memilih file yang sama lagi tetap memicu event change
}

onMounted(() => {
  store.fetchData();
});
</script>

<template>
  <BaseBreadcrumb title="Employee" :breadcrumbs="breadcrumbs" class="mb-6" />

  <div class="flex flex-col gap-5">
    <!-- ── Filter Bar ─────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-end gap-3">
      <button
        @click="store.fetchData()"
        type="button"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 font-medium rounded-full text-sm px-5 py-2 whitespace-nowrap"
      >
        <SyncOutlined />
        Reload
      </button>

      <div class="flex-1" />

      <button
        v-if="permissions.create"
        @click="store.openAdd()"
        type="button"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 font-medium rounded-full text-sm px-5 py-2 whitespace-nowrap shadow"
      >
        <PlusOutlined />
        Tambah Karyawan
      </button>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────────────── -->
    <div class="flex border-b border-gray-200 dark:border-gray-700 gap-1">
      <button
        @click="activeListTab = 'active'"
        type="button"
        class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeListTab === 'active' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Aktif
        <span
          class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          :class="activeListTab === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'"
          >{{ activeRows.length }}</span
        >
      </button>
      <button
        @click="activeListTab = 'inactive'"
        type="button"
        class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeListTab === 'inactive' ? 'border-gray-600 text-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Nonaktif
        <span
          class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          :class="activeListTab === 'inactive' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'"
          >{{ inactiveRows.length }}</span
        >
      </button>
      <button
        @click="activeListTab = 'all'"
        type="button"
        class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeListTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Semua
        <span
          class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          :class="activeListTab === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'"
          >{{ tableRows.length }}</span
        >
      </button>
    </div>

    <!-- ── Table Aktif ────────────────────────────────────────────── -->
    <div v-show="activeListTab === 'active'">
      <TableExcel :columns="tableColumns" :data="activeTableData" :loading="loading">
        <template #cell-document="{ value }">
          <span v-if="value" class="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <i class="mdi mdi-file-pdf-box text-red-500" />
            {{ value }}
          </span>
          <span v-else class="text-gray-300">-</span>
        </template>
        <template #cell-status_label="{ value }">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
            {{ value }}
          </span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-center gap-1">
            <button
              type="button"
              title="Lihat Detail"
              @click="store.openDetail(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              <i class="mdi mdi-eye-outline text-sm" />
            </button>
            <button
              v-if="(row as any).document"
              type="button"
              title="Lihat Dokumen"
              @click="store.viewDocument((row as any).nik)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <i class="mdi mdi-file-pdf-box text-sm" />
            </button>
            <button
              v-if="permissions.update"
              type="button"
              title="Edit Data"
              @click="store.openEdit(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
              <i class="mdi mdi-pencil-outline text-sm" />
            </button>
            <!-- <button
              v-if="permissions.update"
              type="button"
              title="Sync dari Master"
              @click="store.onSync(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100"
            >
              <i class="mdi mdi-sync text-sm" />
            </button> -->
            <button
              v-if="permissions.update"
              type="button"
              title="Nonaktifkan"
              @click="store.onToggle(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100"
            >
              <i class="mdi mdi-toggle-switch-off-outline text-sm" />
            </button>
            <button
              v-if="permissions.delete"
              type="button"
              title="Hapus dari Whitelist"
              @click="store.onDelete(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <i class="mdi mdi-trash-can-outline text-sm" />
            </button>
          </div>
        </template>
      </TableExcel>
    </div>

    <!-- ── Table Nonaktif ─────────────────────────────────────────── -->
    <div v-show="activeListTab === 'inactive'">
      <TableExcel :columns="tableColumns" :data="inactiveTableData" :loading="loading">
        <template #cell-document="{ value }">
          <span v-if="value" class="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <i class="mdi mdi-file-pdf-box text-red-500" />
            {{ value }}
          </span>
          <span v-else class="text-gray-300">-</span>
        </template>
        <template #cell-status_label="{ value }">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 text-gray-600">
            {{ value }}
          </span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-center gap-1">
            <button
              type="button"
              title="Lihat Detail"
              @click="store.openDetail(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              <i class="mdi mdi-eye-outline text-sm" />
            </button>
            <button
              v-if="(row as any).document"
              type="button"
              title="Lihat Dokumen"
              @click="store.viewDocument((row as any).nik)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <i class="mdi mdi-file-pdf-box text-sm" />
            </button>
            <button
              v-if="permissions.update"
              type="button"
              title="Edit Data"
              @click="store.openEdit(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
              <i class="mdi mdi-pencil-outline text-sm" />
            </button>
            <button
              v-if="permissions.update"
              type="button"
              title="Sync dari Master"
              @click="store.onSync(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100"
            >
              <i class="mdi mdi-sync text-sm" />
            </button>
            <button
              v-if="permissions.update"
              type="button"
              title="Aktifkan"
              @click="store.onToggle(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            >
              <i class="mdi mdi-toggle-switch-outline text-sm" />
            </button>
            <button
              v-if="permissions.delete"
              type="button"
              title="Hapus dari Whitelist"
              @click="store.onDelete(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <i class="mdi mdi-trash-can-outline text-sm" />
            </button>
          </div>
        </template>
      </TableExcel>
    </div>

    <!-- ── Table Semua ────────────────────────────────────────────── -->
    <div v-show="activeListTab === 'all'">
      <TableExcel :columns="tableColumns" :data="allTableData" :loading="loading">
        <template #cell-document="{ value }">
          <span v-if="value" class="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <i class="mdi mdi-file-pdf-box text-red-500" />
            {{ value }}
          </span>
          <span v-else class="text-gray-300">-</span>
        </template>
        <template #cell-status_label="{ value }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            :class="value === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'"
          >
            {{ value }}
          </span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-center gap-1">
            <button
              type="button"
              title="Lihat Detail"
              @click="store.openDetail(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              <i class="mdi mdi-eye-outline text-sm" />
            </button>
            <button
              v-if="(row as any).document"
              type="button"
              title="Lihat Dokumen"
              @click="store.viewDocument((row as any).nik)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <i class="mdi mdi-file-pdf-box text-sm" />
            </button>
            <button
              v-if="permissions.update"
              type="button"
              title="Edit Data"
              @click="store.openEdit(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
              <i class="mdi mdi-pencil-outline text-sm" />
            </button>
            <button
              v-if="permissions.update"
              type="button"
              title="Sync dari Master"
              @click="store.onSync(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100"
            >
              <i class="mdi mdi-sync text-sm" />
            </button>
            <button
              v-if="permissions.update"
              type="button"
              title="Toggle Status"
              @click="store.onToggle(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100"
            >
              <i class="mdi mdi-swap-horizontal text-sm" />
            </button>
            <button
              v-if="permissions.delete"
              type="button"
              title="Hapus dari Whitelist"
              @click="store.onDelete(row as any)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <i class="mdi mdi-trash-can-outline text-sm" />
            </button>
          </div>
        </template>
      </TableExcel>
    </div>
  </div>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Tambah Karyawan (rekomendasi dari source, autofill)
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div v-if="dialog.add" class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4" @click.self="dialog.add = false">
      <div class="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <i class="mdi mdi-account-plus-outline text-emerald-600" />
            </div>
            <h3 class="text-base font-bold text-gray-800 dark:text-gray-100">Tambah Karyawan ke Whitelist</h3>
          </div>
          <button type="button" @click="dialog.add = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <!-- Picker: rekomendasi dari data source, otomatis exclude yang sudah whitelist/staged -->
          <Autocomplete
            v-model="pickerNik"
            label="Cari Karyawan (Source)"
            placeholder="Cari NIK atau nama karyawan..."
            :options="availablePickerOptions"
          />
          <p class="text-[11px] text-gray-400 -mt-2">
            Daftar hanya menampilkan karyawan dari data source yang belum masuk whitelist. Data Nama, Departemen, Divisi, dan Jabatan
            otomatis terisi dari data source.
          </p>

          <!-- Limit Kasbon — hanya berlaku untuk single add, batch pakai default backend (3) -->
          <div v-if="stagingList.length === 1" class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Limit Kasbon Aktif</label>
            <input
              v-model.number="addKasbonLimit"
              type="number"
              min="1"
              placeholder="3"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
            <p class="text-[11px] text-gray-400">
              Jumlah maksimal kasbon non-Closed yang boleh aktif bersamaan untuk NIK ini. Kosongkan untuk pakai default (3).
            </p>
          </div>
          <p v-else-if="stagingList.length > 1" class="text-[11px] text-amber-500 -mt-2">
            Tambah batch memakai limit kasbon default (3) untuk semua NIK — edit satu per satu setelahnya kalau perlu nilai berbeda.
          </p>

          <!-- Staged list -->
          <div class="flex flex-col gap-2">
            <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Karyawan Dipilih ({{ stagingList.length }})</p>

            <div
              v-if="stagingList.length === 0"
              class="flex flex-col items-center justify-center py-8 gap-2 text-gray-400 border-1 border-dashed border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <i class="mdi mdi-account-search-outline text-2xl" />
              <p class="text-xs">Belum ada karyawan dipilih</p>
            </div>

            <div
              v-for="emp in stagingList"
              :key="emp.nik"
              class="flex items-start justify-between gap-3 rounded-lg border-1 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">
                  {{ emp.name }} <span class="font-normal text-gray-400">· {{ emp.nik }}</span>
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ emp.department }}<span v-if="emp.division"> · {{ emp.division }}</span>
                </p>
                <p v-if="emp.job_title" class="text-[11px] text-gray-400 mt-0.5">{{ emp.job_title }}</p>
              </div>
              <button
                type="button"
                title="Hapus dari daftar"
                @click="store.removeFromStaging(emp.nik)"
                class="flex-shrink-0 text-gray-400 hover:text-red-500"
              >
                <i class="mdi mdi-close-circle-outline text-lg" />
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            type="button"
            @click="dialog.add = false"
            class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="stagingList.length === 0"
            @click="store.onSubmitAdd()"
            class="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
          >
            Simpan ({{ stagingList.length }})
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Edit Data Karyawan (manual, tidak menyentuh field `active`)
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="dialog.edit && selectedRow"
      class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4"
      @click.self="dialog.edit = false"
    >
      <div class="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <i class="mdi mdi-pencil-outline text-indigo-600" />
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-800 dark:text-gray-100">Edit Data Karyawan</h3>
              <p class="text-xs text-gray-400 leading-tight">{{ selectedRow.nik }}</p>
            </div>
          </div>
          <button type="button" @click="dialog.edit = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <p class="text-[11px] text-gray-400 -mt-1">
            Perubahan di sini hanya berlaku untuk data whitelist, tidak mengubah data karyawan di source. Status aktif/nonaktif diatur lewat
            tombol toggle, bukan di sini.
          </p>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Nama</label>
            <input
              v-model="editForm.name"
              type="text"
              placeholder="Nama karyawan"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Gender</label>
              <input
                v-model="editForm.gender"
                type="text"
                placeholder="Male / Female"
                class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Pegawai</label>
              <input
                v-model="editForm.emp_status"
                type="text"
                placeholder="Permanent / Contract"
                class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Departemen</label>
            <input
              v-model="editForm.department"
              type="text"
              placeholder="Departemen"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Divisi</label>
            <input
              v-model="editForm.division"
              type="text"
              placeholder="Divisi"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Jabatan</label>
            <input
              v-model="editForm.job_title"
              type="text"
              placeholder="Jabatan"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Limit Kasbon Aktif</label>
            <input
              v-model.number="editForm.kasbon_limit"
              type="number"
              min="1"
              placeholder="3"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
            <p class="text-[11px] text-gray-400">
              Jumlah maksimal kasbon non-Closed yang boleh aktif bersamaan untuk NIK ini. Tidak ikut ter-reset saat Sync dari Master.
            </p>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Dokumen (PDF)</label>
            <div
              v-if="selectedRow.document && !editDocumentPreviewName"
              class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              <i class="mdi mdi-file-pdf-box text-red-500" />
              <span>Tersimpan: {{ selectedRow.document }}</span>
            </div>
            <div v-if="editDocumentPreviewName" class="flex items-center gap-2 text-xs text-emerald-600 mb-1">
              <i class="mdi mdi-file-check-outline" />
              <span>Akan diupload: {{ editDocumentPreviewName }}</span>
            </div>
            <input
              type="file"
              accept=".pdf"
              @change="onDocumentFileChange"
              class="text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
            />
            <p class="text-[11px] text-gray-400">
              Maks. 5 MB, format PDF. Upload baru akan menggantikan dokumen sebelumnya. Kosongkan jika tidak ingin mengubah dokumen.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            type="button"
            @click="dialog.edit = false"
            class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full"
          >
            Batal
          </button>
          <button
            type="button"
            @click="store.onUpdate()"
            class="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-full"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Detail Karyawan
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="dialog.detail && selectedRow"
      class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4"
      @click.self="dialog.detail = false"
    >
      <div class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="flex items-center gap-3">
            <h3 class="text-base font-bold text-gray-800 dark:text-gray-100">{{ selectedRow.name }}</h3>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              :class="Number(selectedRow.active) !== 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'"
              >{{ Number(selectedRow.active) !== 0 ? 'Aktif' : 'Nonaktif' }}</span
            >
          </div>
          <button type="button" @click="dialog.detail = false" class="text-gray-400 hover:text-gray-600">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 overflow-y-auto">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">NIK</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.nik }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Gender</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.gender || '-' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Departemen</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.department }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Divisi</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.division || '-' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Jabatan</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.job_title || '-' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Status Pegawai</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.emp_status || '-' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Limit Kasbon Aktif</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.kasbon_limit }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Dokumen</p>
              <div class="flex items-center gap-2">
                <p class="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <i v-if="selectedRow.document" class="mdi mdi-file-pdf-box text-red-500" />
                  {{ selectedRow.document || '-' }}
                </p>
                <button
                  v-if="selectedRow.document"
                  type="button"
                  @click="store.viewDocument(selectedRow.nik)"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full"
                >
                  <i class="mdi mdi-eye-outline" />
                  Lihat Dokumen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            type="button"
            @click="dialog.detail = false"
            class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
