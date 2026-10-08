<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { useMachinePressStore } from '@/stores/PCD/Master/MachinePress';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import type { MachinePress, ApiResponse } from '@/types/PCD/Master/MachinePress';

const store = useMachinePressStore();
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

// Backend tidak konsisten: sukses pakai { status, message }, gagal pakai { success:false, messages }
function isApiSuccess(res: ApiResponse | null): boolean {
  return !!res && (res.status === true || res.success === true);
}
function apiMessage(res: ApiResponse | null): string {
  return res?.message ?? res?.messages ?? 'Terjadi kesalahan';
}

const page = ref({ title: 'Master Mesin Press' });
const breadcrumbs = ref([
  { title: 'PCD', disabled: false, href: '#' },
  { title: 'Master', disabled: false, href: '#' },
  { title: 'Mesin Press', disabled: true, href: '#' }
]);

const columns: TableColumn[] = [
  { key: 'line_id', label: 'Line ID', align: 'center' },
  { key: 'jumlah_mesin', label: 'Jumlah Mesin', align: 'center' },
  { key: 'user_updated', label: 'User Update', align: 'center' }
];

const showModal = ref(false);
const isEdit = ref(false);
const showDeleteModal = ref(false);
const deleteTarget = ref<{ line_id: string }>({ line_id: '' });

const form = ref<{ line_id: string; jumlah_mesin: number | null }>({
  line_id: '',
  jumlah_mesin: null
});

onMounted(async () => {
  await store.fetchMachinePress();
});

function openCreate(): void {
  isEdit.value = false;
  form.value = { line_id: '', jumlah_mesin: null };
  showModal.value = true;
}

function openEdit(row: MachinePress): void {
  isEdit.value = true;
  form.value = { line_id: row.line_id, jumlah_mesin: row.jumlah_mesin };
  showModal.value = true;
}

function closeModal(): void {
  if (store.saving) return;
  showModal.value = false;
}

function openDelete(row: MachinePress): void {
  deleteTarget.value = { line_id: row.line_id };
  showDeleteModal.value = true;
}

function closeDeleteModal(): void {
  if (store.saving) return;
  showDeleteModal.value = false;
}

async function submitForm(): Promise<void> {
  const lineId = form.value.line_id.trim().toUpperCase();

  if (!lineId || form.value.jumlah_mesin === null) {
    notificationStore.showDialogError('Validasi', 'Line ID dan Jumlah Mesin wajib diisi.');
    return;
  }

  const isDup = store.data.some((x) => !isEdit.value && x.line_id.toUpperCase() === lineId);
  if (isDup) {
    notificationStore.showDialogError('Validasi', 'Line ID sudah terdaftar.');
    return;
  }

  const username = authStore.user?.username ?? '';

  const res = isEdit.value
    ? await store.updateMachinePress({ line_id: lineId, jumlah_mesin: form.value.jumlah_mesin, user_updated: username })
    : await store.createMachinePress({ line_id: lineId, jumlah_mesin: form.value.jumlah_mesin, user_created: username });

  if (isApiSuccess(res)) {
    notificationStore.showDialogSuccess('Success', isEdit.value ? 'Data berhasil diupdate.' : 'Data berhasil ditambah.');
    showModal.value = false;
    await store.fetchMachinePress();
  } else {
    notificationStore.showDialogError('Error', apiMessage(res));
  }
}

async function confirmDelete(): Promise<void> {
  const res = await store.deleteMachinePress({ line_id: deleteTarget.value.line_id });
  if (isApiSuccess(res)) {
    notificationStore.showDialogSuccess('Success', 'Data berhasil dihapus.');
    showDeleteModal.value = false;
    await store.fetchMachinePress();
  } else {
    notificationStore.showDialogError('Error', apiMessage(res));
  }
}
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex justify-between items-center mb-3">
    <h2 class="text-xl font-semibold text-gray-800">Master Data Mesin Press</h2>
    <button
      v-if="store.permissions.create"
      type="button"
      @click="openCreate"
      class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
    >
      Tambah Data
    </button>
  </div>

  <!-- Table -->
  <TableExcel :columns="columns" :data="store.data" :loading="store.loading">
    <template #cell-jumlah_mesin="{ value }">
      {{ value ?? '-' }}
    </template>

    <template #cell-user_updated="{ row }">
      <span v-if="row.user_updated">{{ row.user_updated }}</span>
      <span v-else-if="row.user_created" class="text-gray-400 italic">{{ row.user_created }} (dibuat)</span>
      <span v-else class="text-gray-400 italic">-</span>
    </template>

    <template #empty>
      <i class="mdi mdi-table-off text-3xl block mb-2 text-gray-300" />
      <span class="text-sm text-gray-400">Belum ada data mesin press.</span>
    </template>

    <template #actions="{ row }">
      <div class="flex items-center justify-center gap-2">
        <button
          v-if="store.permissions.update"
          type="button"
          class="text-xs px-3 py-1 rounded-full font-medium text-blue-700 bg-blue-100 hover:bg-blue-200"
          @click="openEdit(row as unknown as MachinePress)"
        >
          Edit
        </button>
        <button
          v-if="store.permissions.delete"
          type="button"
          class="text-xs px-3 py-1 rounded-full font-medium text-red-700 bg-red-100 hover:bg-red-200"
          @click="openDelete(row as unknown as MachinePress)"
        >
          Hapus
        </button>
      </div>
    </template>
  </TableExcel>

  <!-- Modal Add/Edit -->
  <Transition name="modal">
    <div
      v-if="showModal"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closeModal"
    >
      <div class="relative w-full max-w-md">
        <div class="relative bg-white rounded-xl shadow-sm">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div class="flex items-center gap-3">
              <h3 class="text-[15px] font-semibold text-gray-900">{{ isEdit ? 'Edit Mesin Press' : 'Tambah Mesin Press' }}</h3>
            </div>
            <button type="button" @click="closeModal" class="text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg w-8 h-8 inline-flex justify-center items-center">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="submitForm">
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-semibold mb-1.5">
                  Line ID <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.trim="form.line_id"
                  type="text"
                  :disabled="isEdit"
                  placeholder="Contoh: L01"
                  @input="form.line_id = form.line_id.toUpperCase()"
                  class="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:border-blue-500 focus:bg-white outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-semibold mb-1.5">
                  Jumlah Mesin <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="form.jumlah_mesin"
                  type="number"
                  min="0"
                  placeholder="Contoh: 4"
                  class="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:border-blue-500 focus:bg-white outline-none"
                  required
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 px-6 pb-6">
              <button
                type="button"
                @click="closeModal"
                class="font-medium rounded-full text-sm px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="store.saving"
                class="flex items-center gap-2 font-medium rounded-full text-sm px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg v-if="store.saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Dialog Confirm Delete -->
  <div v-if="showDeleteModal" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 transition-opacity">
    <div class="relative w-full max-w-md">
      <div class="relative bg-white rounded-xl shadow-sm">
        <button @click="closeDeleteModal" type="button" class="absolute top-3 right-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg w-8 h-8 inline-flex justify-center items-center">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
        </button>

        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 class="mb-5 text-sm font-medium text-gray-600">
            Apakah Anda yakin ingin menghapus mesin press line <br />
            <span class="font-semibold text-gray-900">{{ deleteTarget.line_id }}?</span>
          </h3>

          <div class="flex justify-center gap-2">
            <button
              @click="confirmDelete"
              type="button"
              :disabled="store.saving"
              class="font-medium rounded-full text-sm px-4 py-2 text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Ya, Hapus
            </button>
            <button
              @click="closeDeleteModal"
              type="button"
              class="font-medium rounded-full text-sm px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
