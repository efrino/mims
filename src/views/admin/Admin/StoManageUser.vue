<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import StoAksesHeader from '@/components/sto/StoAksesHeader.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import MultiSelectDropdown, { type OpsiPilihan } from '@/components/form/MultiSelectDropdown.vue';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import { useStoManageUserStore } from '@/stores/Admin/StoManageUser';
import type { StoUserRow } from '@/types/Admin/StoManageUser';

const page = shallowRef({ title: 'Manage User' });
const breadcrumbs = shallowRef([
  { title: 'Admin', disabled: false, href: '#' },
  { title: 'STO', disabled: false, href: '#' },
  { title: 'Manage User STO', disabled: true, href: '#' }
]);

/**
 * Daftar area dan permission memang ditulis di sini, bukan diturunkan dari
 * data yang sudah ada. Menurunkannya dari data membuat nilai salah ketik ikut
 * jadi pilihan yang sah, dan area baru tidak akan pernah muncul sampai ada
 * yang terlanjur memakainya.
 *
 * Nilai permission-nya adalah kunci yang dibaca backend apa adanya, jadi
 * hurufnya tidak boleh diubah -- 'prepareOk' bukan 'prepareok'.
 */
const OPSI_AREA: OpsiPilihan[] = [
  { value: 'IFRM', label: 'IFRM' },
  { value: 'IFPP', label: 'IFPP' },
  { value: 'PRESS', label: 'PRESS' },
  { value: 'WELD', label: 'WELD' },
  { value: 'IFPD', label: 'IFPD' }
];

const OPSI_PERMISSION: OpsiPilihan[] = [
  { value: 'prepare', label: 'Prepare Tag STO', ket: 'prepare' },
  { value: 'scan', label: 'Scan Tag STO', ket: 'scan' },
  { value: 'cancel', label: 'Cancel Tag STO', ket: 'cancel' },
  { value: 'prepareOk', label: 'Prepare Tag OK', ket: 'prepareOk' },
  { value: 'scanOk', label: 'Scan Tag OK', ket: 'scanOk' },
  { value: 'cancelOk', label: 'Cancel Tag OK', ket: 'cancelOk' }
];

const headerTable: TableColumn[] = [
  { key: 'nik', label: 'NIK' },
  { key: 'role', label: 'Role', align: 'center' },
  { key: 'tim', label: 'Tim', align: 'center' },
  { key: 'device_name', label: 'Perangkat' },
  { key: 'area', label: 'Area' },
  { key: 'permissions', label: 'Permissions' },
  { key: 'created_at', label: 'Dibuat', align: 'center' },
  { key: 'updated_at', label: 'Diubah', align: 'center' }
];

const store = useStoManageUserStore();
const { fetchAll, onSave, loadForm, confirmDelete, submitDelete, keluarSto, resetDelete } = store;
const {
  dataTable,
  devices,
  adminNik,
  isLoggingOut,
  search,
  limit,
  formData,
  dialog,
  action,
  deleteTarget,
  deleteJejak,
  needForce,
  isLoading,
  isSaving,
  isDeleting,
  lastError,
  permissions,
  totalAdmin
} = storeToRefs(store);

onMounted(() => {
  fetchAll();
});

function asItem(row: Record<string, unknown>): StoUserRow {
  return row as unknown as StoUserRow;
}

// Role dibatasi dua pilihan. Kolomnya di database VARCHAR bebas, jadi nilai
// lama di luar daftar tetap ditampilkan supaya tidak terhapus diam-diam saat
// user itu diedit.
const ROLE_CHOICES = ['admin', 'operator'];
const roleChoices = computed(() =>
  formData.value.role && !ROLE_CHOICES.includes(formData.value.role) ? [...ROLE_CHOICES, formData.value.role] : ROLE_CHOICES
);

function asList(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

// ── Delete: konfirmasi ketik NIK saat backend meminta force ──────────
const deleteConfirmText = ref('');
const isDeleteConfirmed = computed(() => deleteConfirmText.value.trim() === (deleteTarget.value?.nik ?? ''));

watch(
  () => dialog.value.delete,
  (open) => {
    if (!open) {
      deleteConfirmText.value = '';
      resetDelete();
    }
  }
);

const jejakRows = computed(() => {
  const j = deleteJejak.value;
  if (!j) return [];
  return [
    { label: 'Tag dicetak', value: j.tag_dicetak },
    { label: 'Riwayat scan', value: j.scan },
    { label: 'Area terdaftar', value: j.area },
    { label: 'Akun didaftarkan', value: j.akun_didaftarkan }
  ];
});

async function onDeleteClick() {
  await submitDelete(needForce.value);
}

// ── Pencarian dilayani backend (parameter q) ─────────────────────────
function applySearch() {
  fetchAll();
}
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <!-- ── Panel atas: info akses + toolbar ──────────────────────────── -->
  <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
    <!-- Info akses admin STO -->
    <div class="flex items-start justify-between flex-wrap gap-4 px-5 py-4">
      <div class="flex items-stretch flex-wrap gap-y-3">
        <StoAksesHeader :nik="adminNik" keterangan="Seluruh endpoint STO wajib NIK ber-role admin" :loading="isLoggingOut" @logout="keluarSto" />

        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total User</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ dataTable.length }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Admin</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ totalAdmin }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Perangkat</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ devices.length }}</div>
        </div>
      </div>

      <span v-if="lastError" class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 !border !border-red-200">
        {{ lastError }}
      </span>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center justify-between flex-wrap gap-2 px-5 py-3 !border-t !border-gray-300 bg-gray-50">
      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative">
          <i class="mdi mdi-magnify absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari NIK atau role..."
            class="w-64 h-9 pl-8 pr-3 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
            @keydown.enter="applySearch"
          />
        </div>

        <select
          v-model.number="limit"
          class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @change="applySearch"
        >
          <option :value="50">50 baris</option>
          <option :value="100">100 baris</option>
          <option :value="250">250 baris</option>
          <option :value="500">500 baris</option>
        </select>

        <button
          type="button"
          title="Muat ulang data dari server"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
          @click="applySearch"
        >
          <ReloadOutlined />
          Terapkan
        </button>
      </div>

      <button
        v-if="permissions.create"
        class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-blue-600 !border !border-blue-600 hover:bg-blue-700 hover:!border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
        @click="loadForm('Create')"
      >
        <PlusOutlined />
        Tambah User
      </button>
    </div>
  </div>

  <!-- ── Table ─────────────────────────────────────────────────────── -->
  <div class="sto-table rounded-lg overflow-hidden !border !border-gray-300">
    <TableExcel :columns="headerTable" :data="dataTable" :loading="isLoading" thead-class="bg-gray-50">
    <template #cell-role="{ value }">
      <span
        class="px-2 py-0.5 rounded-full text-xs font-semibold"
        :class="String(value).toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'"
      >
        {{ value || '-' }}
      </span>
    </template>
    <template #cell-tim="{ value }">
      <span v-if="value" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Tim {{ value }}</span>
      <span v-else class="text-gray-400">-</span>
    </template>
    <template #cell-device_name="{ row }">
      <div v-if="asItem(row).device_name">
        <div class="font-medium text-gray-700">{{ asItem(row).device_name }}</div>
        <div class="text-[11px] text-gray-400">{{ asItem(row).android_id || '-' }}</div>
      </div>
      <span v-else class="text-gray-400">-</span>
    </template>
    <template #cell-area="{ value }">
      <div v-if="asList(value).length" class="flex flex-wrap gap-1 max-w-xs">
        <span v-for="a in asList(value)" :key="a" class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-100 text-sky-700">
          {{ a }}
        </span>
      </div>
      <span v-else class="text-gray-400">-</span>
    </template>
    <template #cell-permissions="{ value }">
      <div v-if="asList(value).length" class="flex flex-wrap gap-1 max-w-xs">
        <span v-for="p in asList(value)" :key="p" class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
          {{ p }}
        </span>
      </div>
      <span v-else class="text-gray-400">-</span>
    </template>
    <template #cell-created_at="{ value }">{{ value || '-' }}</template>
    <template #cell-updated_at="{ value }">{{ value || '-' }}</template>
    <template #actions="{ row }">
      <div class="flex items-center justify-center gap-1.5">
        <button
          v-if="permissions.update"
          type="button"
          title="Edit User"
          class="inline-flex items-center justify-center p-1.5 text-white bg-cyan-500 rounded-lg hover:bg-cyan-600 transition"
          @click="loadForm('Edit', asItem(row))"
        >
          <i class="mdi mdi-pencil text-sm" />
        </button>
        <button
          v-if="permissions.delete"
          type="button"
          title="Hapus User"
          class="inline-flex items-center justify-center p-1.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
          @click="confirmDelete(asItem(row))"
        >
          <i class="mdi mdi-delete text-sm" />
        </button>
      </div>
    </template>
    <template #empty>
      <div class="w-full">
        <span class="px-5 py-12 text-center text-gray-400 text-sm">Belum ada user STO.</span>
      </div>
    </template>
    </TableExcel>
  </div>

  <!-- ==================== Modal Form User ==================== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="dialog.form"
        class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
        role="dialog"
        aria-modal="true"
        @click.self="dialog.form = false"
      >
        <div class="relative p-4 w-full max-w-2xl max-h-full">
          <div class="relative bg-white rounded-xl shadow-xl !border !border-gray-300 dark:bg-gray-800 dark:!border-gray-600">
            <div class="flex items-center justify-between p-5 !border-b rounded-t !border-gray-300 dark:!border-gray-700">
              <h1 class="text-gray-600 dark:text-gray-300 text-xl font-semibold">{{ action }} User STO</h1>
              <button
                type="button"
                class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
                @click="dialog.form = false"
              >
                <i class="mdi mdi-close" />
              </button>
            </div>

            <div class="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label for="sto_nik" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">NIK</label>
                  <input
                    id="sto_nik"
                    v-model="formData.nik"
                    type="text"
                    maxlength="50"
                    :disabled="action === 'Edit'"
                    class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5 disabled:bg-gray-100 disabled:text-gray-500 dark:bg-gray-700 dark:!border-gray-600 dark:text-white"
                    placeholder="Contoh: S.10445"
                  />
                  <p v-if="action === 'Edit'" class="mt-1 text-[11px] text-gray-400">
                    NIK tidak bisa diubah.
                  </p>
                </div>

                <div>
                  <label for="sto_role" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Role</label>
                  <select
                    id="sto_role"
                    v-model="formData.role"
                    class="sto-select bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full py-2.5 pl-3 pr-9 cursor-pointer dark:bg-gray-700 dark:!border-gray-600 dark:text-white"
                  >
                    <option value="">- Pilih Role -</option>
                    <option v-for="r in roleChoices" :key="r" :value="r">{{ r }}</option>
                  </select>
                </div>

                <div>
                  <label for="sto_tim" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tim</label>
                  <select
                    id="sto_tim"
                    v-model="formData.tim"
                    class="sto-select bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full py-2.5 pl-3 pr-9 cursor-pointer dark:bg-gray-700 dark:!border-gray-600 dark:text-white"
                  >
                    <option value="">- Tanpa Tim -</option>
                    <option value="A">Tim A</option>
                    <option value="B">Tim B</option>
                  </select>
                </div>

                <div>
                  <label for="sto_device" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Perangkat</label>
                  <select
                    id="sto_device"
                    v-model="formData.device_id"
                    class="sto-select bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full py-2.5 pl-3 pr-9 cursor-pointer dark:bg-gray-700 dark:!border-gray-600 dark:text-white"
                  >
                    <option :value="null">- Tanpa Perangkat -</option>
                    <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.name }} ({{ d.android_id }})</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Area</label>
                <MultiSelectDropdown v-model="formData.area" :options="OPSI_AREA" placeholder="- Pilih area -" />
                <p class="mt-1 text-[11px] text-gray-400">Boleh lebih dari satu area.</p>
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Permissions</label>
                <MultiSelectDropdown
                  v-model="formData.permissions"
                  :options="OPSI_PERMISSION"
                  placeholder="- Pilih permission -"
                />
                <p class="mt-1 text-[11px] text-gray-400">Boleh lebih dari satu permission.</p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 p-5 !border-t !border-gray-300 dark:!border-gray-700">
              <button
                type="button"
                class="text-gray-900 bg-white !border !border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:!border-gray-600 dark:hover:bg-gray-700"
                @click="dialog.form = false"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="isSaving || !formData.role || (action === 'Create' && !formData.nik)"
                class="flex gap-2 text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                @click="onSave"
              >
                {{ isSaving ? 'Menyimpan...' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ==================== Modal Hapus User ==================== -->
  <Teleport to="body">
    <div v-if="dialog.delete" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <i class="mdi mdi-account-remove-outline text-4xl text-red-600" />
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">Hapus User STO</h3>
          <p class="mb-3 text-lg font-normal text-gray-500">
            Hapus akun <span class="font-bold text-gray-800">{{ deleteTarget?.nik }}</span
            >?
          </p>

          <!-- Jejak dari balasan "confirm" backend -->
          <div v-if="needForce" class="mb-4 text-left">
            <p class="mb-2 text-xs text-gray-500">
              User ini masih meninggalkan jejak. Menghapusnya TIDAK menghapus tag maupun riwayat scan-nya, tapi area user ikut terhapus dan
              jejak pencetak pada tag dikosongkan.
            </p>
            <div class="grid grid-cols-2 gap-2 mb-3">
              <div v-for="j in jejakRows" :key="j.label" class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                <div class="text-[11px] text-gray-500">{{ j.label }}</div>
                <div class="text-sm font-semibold text-gray-800">{{ j.value }}</div>
              </div>
            </div>
            <label class="block mb-1.5 text-xs font-medium text-gray-600">
              Ketik <span class="font-bold text-gray-800">{{ deleteTarget?.nik }}</span> untuk konfirmasi
            </label>
            <input
              v-model="deleteConfirmText"
              type="text"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:!border-red-500 block w-full p-2.5"
              :placeholder="deleteTarget?.nik"
              autocomplete="off"
            />
          </div>

          <div class="flex justify-center gap-3">
            <button
              type="button"
              :disabled="isDeleting || (needForce && !isDeleteConfirmed)"
              class="text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="onDeleteClick"
            >
              {{ isDeleting ? 'Menghapus...' : needForce ? 'Ya, Hapus Paksa' : 'Ya, Hapus' }}
            </button>
            <button
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg !border !border-gray-300 text-sm font-medium px-5 py-2.5"
              @click="dialog.delete = false"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

</template>

<style scoped>
/* Plugin form Tailwind (lewat flowbite) sudah menggambar panah select sebagai
   background SVG berukuran 1.5em -- kelewat besar, dan jadi dobel kalau
   ditambah ikon sendiri. Di sini panah bawaannya saja yang dikecilkan. */
.sto-select,
.sto-table :deep(select) {
  background-size: 0.85em 0.85em;
  background-position: right 0.625rem center;
}

/* Vuetify mendaftarkan utility bernama sama dengan Tailwind (`border`,
   `border-b`, ...) memakai !important di dalam layer `vendor`, sehingga garis
   milik TableBasic selalu memakai warna Vuetify yang nyaris tak terlihat.
   Deklarasi !important dari layer yang lebih awal menang atas layer manapun
   setelahnya, jadi override-nya ditaruh di layer yang sama -- di situ
   specificity yang menentukan, dan selektor di bawah ini lebih spesifik. */
@layer vendor {
  .sto-table :deep(thead tr) {
    border-bottom-color: #cbd5e1 !important;
  }

  .sto-table :deep(tbody tr) {
    border-bottom-color: #e5e7eb !important;
  }

  /* garis pemisah di atas pagination */
  .sto-table :deep(.overflow-x-auto + div) {
    border-top-color: #cbd5e1 !important;
  }
}
</style>
