<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useMasterKategoriStore } from '@/stores/Admin/MasterKategori';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

const page = ref({ title: 'Master Kategori Barang' });
const breadcrumbs = shallowRef([
  { title: 'IT', disabled: false, href: '#' },
  { title: 'Master Kategori Barang', disabled: true, href: '#' }
]);

const kategoriStore = useMasterKategoriStore();
const { loadFormKategori, onSaveKategori, deleteKategori, confirmDelete, updateFormData } = kategoriStore;
const { dataTable, formData, formError, action, dialog, deleteData, isDeleting } = storeToRefs(kategoriStore);

const isLoading = ref(true);
const tableKey = ref(0);
const statusOptions = ['AKTIF', 'NONAKTIF'];

const columns: TableColumn[] = [
  { key: 'kode_kategori', label: 'Kode Kategori' },
  { key: 'nama_kategori', label: 'Nama Kategori' },
  { key: 'jumlah_barang', label: 'Jumlah Unit', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' }
];

// Jumlah unit kategori yang sedang diedit, untuk peringatan saat kode diganti
const jumlahUnitEdit = computed(() => {
  const item = dataTable.value.find((row) => row.kode_kategori === formData.value.kode_lama);
  return Number(item?.jumlah_barang || 0);
});

const kodeBerubah = computed(() => action.value === 'Edit' && formData.value.kode_kategori !== formData.value.kode_lama);

const editRow = (row: Record<string, unknown>) => {
  loadFormKategori('Edit', row);
};

const deleteRow = (row: Record<string, unknown>) => {
  confirmDelete(row.kode_kategori as string, row.nama_kategori as string);
};

// Kode kategori dipakai di tengah kode barang (mis. 001-PC-TBN), jadi wajib huruf/angka saja
const onKodeInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  updateFormData('kode_kategori', value);
};

const inputClass =
  'block w-full rounded-[12px] border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-gray-700 dark:text-white';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

onMounted(async () => {
  isLoading.value = true;
  await kategoriStore.fetchKategori();
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
            @click="loadFormKategori('Create')"
            class="mx-2 flex items-center gap-2 text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14" />
            </svg>
            Tambah Kategori
          </button>
        </div>
      </div>
    </div>

    <TableExcel :key="tableKey" :columns="columns" :data="dataTable as unknown as Record<string, unknown>[]" :loading="isLoading">
      <template #cell-kode_kategori="{ row }">
        <span class="font-mono font-semibold">{{ (row as any).kode_kategori || '-' }}</span>
      </template>
      <template #cell-nama_kategori="{ row }">{{ (row as any).nama_kategori || '-' }}</template>
      <template #cell-jumlah_barang="{ row }">
        <span class="block text-center font-semibold">{{ (row as any).jumlah_barang ?? 0 }}</span>
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
          <p class="text-sm">Belum ada data kategori.</p>
        </div>
      </template>
    </TableExcel>
  </div>

  <!-- ==================== Modal Form Kategori ==================== -->
  <Transition name="modal">
    <div
      v-if="dialog.form"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      @click.self="dialog.form = false"
    >
      <div class="form-modern relative w-full max-w-lg max-h-full">
        <div class="relative overflow-hidden rounded-[18px] bg-white shadow-2xl dark:bg-gray-800">
          <div class="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 px-6 py-5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white/15 ring-1 ring-white/30">
                  <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 class="text-xl font-bold text-white">{{ action === 'Edit' ? 'Edit Kategori' : 'Tambah Kategori' }}</h1>
                  <p class="mt-0.5 text-sm text-indigo-100">Kode dipakai di tengah kode barang, mis. 001-PC-TBN</p>
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

          <div class="space-y-4 px-6 py-6">
            <div
              v-if="formError"
              class="flex items-start gap-3 rounded-[12px] border bd-red-soft bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-900 dark:text-red-400"
              role="alert"
            >
              <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="font-semibold">Data gagal disimpan</p>
                <p class="mt-0.5">{{ formError }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label for="kode_kategori" :class="labelClass">Kode <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  id="kode_kategori"
                  :value="formData.kode_kategori"
                  @input="onKodeInput"
                  maxlength="10"
                  :class="[inputClass, 'font-mono font-semibold uppercase']"
                  placeholder="PC"
                />
              </div>
              <div class="sm:col-span-2">
                <label for="nama_kategori" :class="labelClass">Nama Kategori <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  id="nama_kategori"
                  :value="formData.nama_kategori"
                  @input="updateFormData('nama_kategori', ($event.target as HTMLInputElement).value)"
                  :class="inputClass"
                  placeholder="Contoh: Komputer"
                />
              </div>
            </div>

            <!-- Dampak ganti kode kategori -->
            <div
              v-if="kodeBerubah"
              class="flex items-start gap-3 rounded-[12px] bg-amber-50 p-3.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-gray-900 dark:text-amber-300"
            >
              <svg class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                Kode <span class="font-mono font-bold">{{ formData.kode_lama }}</span> akan diganti menjadi
                <span class="font-mono font-bold">{{ formData.kode_kategori || '…' }}</span>. {{ jumlahUnitEdit }} unit ikut pindah ke kode baru.
                Kode barang yang sudah tertempel (mis. 001-{{ formData.kode_lama }}-TBN) <b>tidak berubah</b>; unit baru memakai kode
                …-{{ formData.kode_kategori || '…' }}-TBN dengan nomor urut sendiri (mulai 001 jika belum ada).
              </p>
            </div>

            <div v-if="action === 'Edit'">
              <span :class="labelClass">Status</span>
              <div class="inline-flex rounded-[12px] border bg-white p-1 dark:bg-gray-700">
                <button
                  v-for="item in statusOptions"
                  :key="item"
                  type="button"
                  @click="updateFormData('status', item)"
                  class="rounded-[8px] px-4 py-1.5 text-sm font-semibold transition-all"
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
          </div>

          <div class="flex items-center justify-end gap-2 border-t bg-gray-50 px-6 py-4 dark:bg-gray-900/40">
            <button
              @click="dialog.form = false"
              type="button"
              class="rounded-[12px] px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              @click="onSaveKategori"
              type="button"
              class="flex items-center gap-2 rounded-[12px] bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-blue-600 focus:outline-none"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {{ action === 'Edit' ? 'Simpan Perubahan' : 'Simpan Kategori' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

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
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
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
            Apakah Anda yakin ingin menghapus kategori<br />
            <span class="font-bold text-gray-800">{{ deleteData?.nama_kategori }}</span>
          </p>
          <p class="mb-6 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
          <div class="flex justify-center gap-3">
            <button
              @click="deleteKategori"
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
/* Utilitas .border Vuetify ada di @layer vendor dengan !important, jadi warna border form diatur di layer yang sama */
@layer vendor {
  .form-modern .border {
    border-color: #e2e8f0 !important;
  }
  .form-modern .border:focus {
    border-color: #6366f1 !important;
  }
  .form-modern .bd-red-soft {
    border-color: #fecaca !important;
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
