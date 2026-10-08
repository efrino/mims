<script setup lang="ts">
import { onMounted, nextTick, watch, ref } from "vue";
import { initFlowbite } from "flowbite";
import { DataTable } from "simple-datatables";

interface Column {
  key: string;      // property name di rows
  label: string;    // label header
  filterable?: boolean;
}

const props = defineProps<{
  columns: Column[];
  rows: Record<string, any>[];
  tableId?: string;
}>();

let dataTableInstance: any = null;

const initializeDataTable = () => {
  // Destroy existing instance jika ada
  if (dataTableInstance) {
    dataTableInstance.destroy();
    dataTableInstance = null;
  }

  const table = document.querySelector("#search-table") as HTMLTableElement | null;

  if (table && DataTable) {
    dataTableInstance = new DataTable(table, {
      searchable: true,
      sortable: true
    });
  }
};

onMounted(async () => {
  await nextTick();
  initFlowbite();
  initializeDataTable();
});

// Watch untuk perubahan data
watch(() => props.rows, async () => {
  await nextTick();
  initializeDataTable();
}, { deep: true });
</script>

<template>

<div class="relative overflow-x-auto sm:rounded-lg m-2">
  <table id="search-table" class="w-full text-sm text-left rtl:text-right text-gray-500">
    <thead class="text-gray-700 uppercase bg-gray-50">
      <tr>
        <th
          v-for="col in props.columns"
          :key="col.key"
          scope="col"
          class="px-6 py-3"
        >
          <span class="flex items-center">
            {{ col.label }}
            <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 15 4 4 4-4m0-6-4-4-4 4"/>
            </svg>
          </span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(row, index) in props.rows"
        :key="index"
        class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b hover:bg-gray-50 dark:border-gray-700 border-gray-200"
      >
        <td
          v-for="col in props.columns"
          :key="col.key"
          class="px-6 py-4"
        >
          {{ row[col.key] }}
        </td>
      </tr>
    </tbody>
  </table>
</div>

</template>

<style>
  .datatable-wrapper {
    width: 100%;
    margin-top: 1rem;
  }

  @media (width>=640px) {
    .datatable-wrapper .datatable-top {
      flex-direction: row-reverse;
      align-items: center;
      padding: 0rem 1.5rem;
      margin-bottom: 1rem;
    }
  }

  .datatable-wrapper .datatable-search .datatable-input {
    color: var(--color-gray-900);
    border: 1px solid var(--color-gray-300);
    background-color: var(--color-gray-50);
    border-radius: .5rem;
    min-width: 16rem;
    font-size: .875rem;
  }

  .datatable-wrapper .datatable-top .datatable-dropdown .datatable-selector {
    background-color: var(--color-gray-50);
    color: var(--color-gray-900);
    border: 1px solid var(--color-gray-300);
    border-radius: .5rem;
    min-width: 4rem;
    margin-right: .25rem;
    font-size: .875rem;
  }

  .datatable-wrapper .datatable-table thead {
    color: var(--color-gray-500);
    background-color: var(--color-gray-50);
    font-size: .90rem;
  }

  .datatable-wrapper thead th .datatable-input {
    color: var(--color-gray-900);
    background-color: #fff;
    min-width: 0;
    margin: 16px 24px;
    font-weight: 400;
    border: 1px solid var(--color-gray-300);
    border-radius: .5rem;
  }

  @media (width>=640px) {
    .datatable-wrapper .datatable-bottom {
      flex-direction: row;
      align-items: center;
    }
  }

  .datatable-wrapper .datatable-bottom {
    flex-direction: column;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
    margin-top: 1rem;
    display: flex;
    padding: 1rem 1.5rem;
  }

  @media (width>=640px) {
    .datatable-wrapper .datatable-bottom {
      flex-direction: row;
      align-items: center
    }
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
    display: flex
  }

  .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item-link:hover {
    background-color: var(--color-gray-50);
    color: var(--color-gray-700)
  }

  .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type,.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type {
    position: relative
  }

  .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link,.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link,.dark .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link,.dark .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link {
    color: #0000
  }

  .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link:after {
    content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m14 8-4 4 4 4'/%3e %3c/svg%3e");
    width: 1.3rem;
    height: 1.3rem;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%)
  }

  .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link:hover:after {
    content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%23111827' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m14 8-4 4 4 4'/%3e %3c/svg%3e")
  }

  .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link:after {
    content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m10 16 4-4-4-4'/%3e %3c/svg%3e");
    width: 1.3rem;
    height: 1.3rem;
    position: absolute;
    top: 50%;
    right: 50%;
    transform: translate(50%,-50%)
  }

  .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link:hover:after {
    content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%23111827' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m10 16 4-4-4-4'/%3e %3c/svg%3e")
  }

  .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link {
    border-left: 1px solid var(--color-gray-300);
    border-top-left-radius: .5rem;
    border-bottom-left-radius: .5rem
  }

  .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link {
    border-left: 0;
    border-top-right-radius: .5rem;
    border-bottom-right-radius: .5rem
  }
</style>