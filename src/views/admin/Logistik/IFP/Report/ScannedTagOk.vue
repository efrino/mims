<script setup lang="ts">
import { ref, shallowRef, onMounted, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useTagOkIFPDStore } from '@/stores/Logistik/IFP/Report/ScanTagOk';
import { storeToRefs, } from 'pinia';
import { SyncOutlined, FileExcelOutlined, } from '@ant-design/icons-vue';
import { initFlowbite } from 'flowbite';
import { useNotificationStore } from '@/stores/notification';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';

const page = ref({ title: 'Scanned Tag OK IFPD' });
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'IFP',
    disabled: false,
    href: '#'
  },
  {
    title: 'Report',
    disabled: false,
    href: '#'
  },
  {
    title: 'Scanned Tag OK',
    disabled: true,
    href: '#'
  }
]);

const notificationStore = useNotificationStore();
const scanStore = useTagOkIFPDStore();

let isLoading = ref(true);

const {
  validateDateRange
} = scanStore

const {
  scannedTable,
  params,
  dialog,
} = storeToRefs(scanStore);

const tableKey = ref(0);

const columns: TableColumn[] = [
  { key: "id_tag_ok", label: "ID Tag" },
  { key: "date", label: "Date" },
  { key: "shift", label: "Shift" },
  { key: "line_id", label: "Line" },
  { key: "part_number", label: "Part Number" },
  { key: "job_number", label: "Job Number" },
  { key: "project", label: "Project" },
  { key: "qty", label: "QTY" },
  { key: "scan_in_date", label: "Scanned Date" },
  { key: "scan_in_user", label: "Scanned User" },
];

onMounted(async () => {
  await validateDateRange();
  isLoading.value = false;

  setTimeout(() => {
    initFlowbite();
  }, 100);
});

// Replikasi perilaku lama: begitu start & end tanggal lengkap (dari klik kalender),
// otomatis validasi ulang rentang tanggal tanpa perlu tombol terpisah.
watch(
  () => [params.value.start, params.value.end],
  async ([start, end]) => {
    if (start) {
      await validateDateRange();
      tableKey.value++;
    }
  }
);

const idToDelete = ref<string>("");
const isDeleting = ref(false);

const openDialogDelete = (id: string) => {
  idToDelete.value = id;
  dialog.value.deleteScan = true;
};

const confirmDeleteScan = async () => {
  if (!idToDelete.value) return;

  isDeleting.value = true;
  try {
    await scanStore.unscanTag(idToDelete.value);
    await validateDateRange();

    dialog.value.deleteScan = false;

    (idToDelete.value as any) = null;

    notificationStore.showDialogSuccess('Success',"Data berhasil dihapus!");

  } catch (error) {
    console.error(error);
  } finally {
    isDeleting.value = false;
  }
};

const handleRefresh = async () => {
  await validateDateRange();
  tableKey.value++;
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <div class="flex flex-col gap-5">

    <!-- Button -->
    <div class="flex gap-6 flex-wrap">
      <!-- Date Range -->
      <div class="flex">
        <DateRangePickerSplitButton
          v-model:start="params.start"
          v-model:end="params.end"
        />
      </div>

      <!-- Excel Button -->
      <a type="button" :href="`http://192.168.10.67/majsf_rest_api/api/scan_barcode/export_scan_in_ifpd?start=${params?.start}&end=${params?.end ? params?.end : params?.start
        }`" target="_blank"
        class="flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-500 font-medium rounded-full text-sm px-5 py-2.5 text-center">
        <FileExcelOutlined class=" text-lg" />
        Download Excel
      </a>

      <!-- Refresh Button -->
      <button @click="handleRefresh()"
        class="text-white whitespace-nowrap bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 font-medium rounded-full text-sm px-5 py-2.5 item-center"
        type="button">
        <SyncOutlined class=" text-lg" />
        Refresh Data
      </button>
    </div>

    <!-- Table -->
    <div class="w-full max-w-10xl mx-auto">
      <TableExcel :key="tableKey" :columns="columns" :data="(scannedTable as unknown as Record<string, unknown>[])" :loading="isLoading">
        <template #actions="{ row }">
          <button type="button"
            class="btn-delete inline-flex items-center justify-center w-8 h-8 text-white bg-red-600 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
            @click="openDialogDelete(row.id_tag_ok as string)" title="Delete Data">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2-3h6a1 1 0 011 1v1H8V5a1 1 0 011-1z" />
            </svg>
          </button>
        </template>
      </TableExcel>
    </div>
  </div>

  <!-- Dialog Confirm Delete -->
  <Teleport to="body">
    <div v-if="dialog.deleteScan"
      class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 transition-opacity">

      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all scale-100">

        <button @click="dialog.deleteScan = false" type="button"
          class="absolute top-3 right-3 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center">
          <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
          <span class="sr-only">Close modal</span>
        </button>

        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z">
              </path>
            </svg>
          </div>

          <h3 class="mb-2 text-xl font-bold text-gray-800">Delete Confirmation</h3>

          <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
            Apakah Anda yakin ingin menghapus ID Tag<br>
            <span class="font-bold text-gray-800">{{
              idToDelete }}</span> ini?
          </h3>

          <p class="mb-6 text-sm text-gray-500">
            Tindakan ini tidak dapat dibatalkan.
          </p>

          <div class="flex justify-center gap-3">

            <button @click="confirmDeleteScan()" :disabled="isDeleting" type="button"
              class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2">
              <svg v-if="isDeleting" aria-hidden="true" role="status"
                class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="#E5E7EB" />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentColor" />
              </svg>
              {{ isDeleting ? 'Deleting...' : 'Yes, Delete' }}
            </button>

            <button @click="dialog.deleteScan = false" type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border-button border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">
              No, cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.border-button {
  border: 1px solid #e5e7eb !important;
}

.border:deep(table) {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

:deep(th),
:deep(td) {
  white-space: normal !important;
  word-wrap: break-word;
  font-size: 15px !important;
  font-weight: 500 !important;
  padding: 10px 20px !important;
  vertical-align: top;
}

:deep(th:nth-child(1)),
:deep(td:nth-child(1)) {
  width: 70px;
}

:deep(th > div) {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 4px;
}

:deep(thead input) {
  width: 100% !important;
  box-sizing: border-box;
  min-width: 0px !important;
  font-size: 15px !important;
  padding: 10px 20px !important;
  height: 30px !important;
  line-height: 1 !important;
  margin: 0 !important;
  border-radius: 4px;
  display: block;
}

:deep(th span) {
  text-align: left;
}
</style>

<style>
.border-custom {
  border: 1px solid #e5e7eb !important;
}

.border-table {
  border: 1px solid #e5e7eb !important;
}

/* Flowbite Datepicker Custom Styles */
.datepicker-cell.selected,
.datepicker-cell.selected:hover {
  background-color: #3b82f6 !important;
  color: white !important;
  font-weight: 600;
}

.datepicker-cell.today {
  background-color: #dbeafe;
  font-weight: 600;
}

.datepicker-cell.today.selected {
  background-color: #3b82f6 !important;
  color: white !important;
}

.datepicker-cell:hover {
  background-color: #f3f4f6;
}

.datepicker-cell.focused:not(.selected) {
  background-color: #e5e7eb;
}

.datepicker-cell {
  border-radius: 0.375rem;
  margin: .5px;
}

.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}

/* Modal Transition */
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

/* Data table style */
.datatable-wrapper {
  width: 100%;
  margin-top: 1rem;
}

.datatable-wrapper .datatable-top {
  display: none;
}

.datatable-wrapper .datatable-search .datatable-input {
  color: var(--color-gray-900);
  border: 1px solid var(--color-gray-300);
  background-color: var(--color-gray-50);
  border-radius: .5rem;
  min-width: 16rem;
  font-size: .875rem;
  display: none;
}

.datatable-wrapper .datatable-table thead {
  color: var(--color-gray-500);
  background-color: var(--color-gray-50);
  font-size: .90rem;
}

.datatable-wrapper thead th .datatable-input {
  color: var(--color-gray-900);
  background-color: #fff;
  width: 100px !important;
  min-width: 100px !important;
  max-width: 100px !important;
  height: 25px !important;
  margin: 5px 5px;
  font-weight: 400;
  border: 1px solid var(--color-gray-300);
  border-radius: .5rem;
}

.datatable-wrapper .datatable-bottom {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
  margin-top: 1rem;
  padding: 1rem 1.5rem;
  flex-wrap: wrap;
}

.datatable-wrapper .datatable-bottom .datatable-info {
  font-size: .8rem;
  color: var(--color-gray-500);
  order: 1;
}

.datatable-wrapper .datatable-bottom .datatable-dropdown {
  display: flex;
  align-items: center;
  gap: .25rem;
  order: 1;
  font-size: .8rem;
  color: var(--color-gray-500);
}

.datatable-wrapper .datatable-bottom .datatable-dropdown .datatable-selector {
  background-color: var(--color-gray-50);
  color: var(--color-gray-900);
  border: 1px solid var(--color-gray-300);
  border-radius: .5rem;
  min-width: 4rem;
  font-size: .875rem;
}

.datatable-wrapper .datatable-bottom .datatable-pagination {
  order: 2;
  margin-left: auto;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item-link {
  color: var(--color-gray-500);
  border-top: 1px solid var(--color-gray-300);
  border-bottom: 1px solid var(--color-gray-300);
  border-right: 1px solid var(--color-gray-300);
  align-items: center;
  height: 2rem;
  padding-left: .75rem;
  padding-right: .75rem;
  font-size: .875rem;
  font-weight: 500;
  display: flex;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item-link:hover {
  background-color: var(--color-gray-50);
  color: var(--color-gray-700);
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type,
.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type {
  position: relative;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link,
.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link,
.dark .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link,
.dark .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link {
  color: #0000;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m14 8-4 4 4 4'/%3e %3c/svg%3e");
  width: 1.3rem;
  height: 1.3rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link:hover:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%23111827' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m14 8-4 4 4 4'/%3e %3c/svg%3e");
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m10 16 4-4-4-4'/%3e %3c/svg%3e");
  width: 1.3rem;
  height: 1.3rem;
  position: absolute;
  top: 50%;
  right: 50%;
  transform: translate(50%, -50%);
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link:hover:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%23111827' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m10 16 4-4-4-4'/%3e %3c/svg%3e");
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link {
  border-left: 1px solid var(--color-gray-300);
  border-top-left-radius: .5rem;
  border-bottom-left-radius: .5rem;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link {
  border-left: 0;
  border-top-right-radius: .5rem;
  border-bottom-right-radius: .5rem;
}
</style>