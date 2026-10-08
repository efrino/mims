<script setup lang="ts">
import { onMounted, nextTick, watch, ref } from "vue";
import { initFlowbite } from "flowbite";
import { DataTable } from "simple-datatables";

interface Column {
  key: string;
  label: string;
  filterable?: boolean;
}

const props = defineProps<{
  columns: Column[];
  rows: Record<string, any>[];
  tableId?: string;
}>();

let dataTableInstance: any = null;

const initializeDataTable = () => {
  if (dataTableInstance) {
    dataTableInstance.destroy();
    dataTableInstance = null;
  }

  const table = document.querySelector("#filter-table") as HTMLTableElement | null;

  if (table && DataTable) {
    dataTableInstance = new DataTable(table, {
      tableRender: (_data, table, type) => {
        if (type === "print") return table;

        const tHead = table?.childNodes![0];

        const filterHeaders = {
          nodeName: "TR",
          attributes: {
            class: "search-filtering-row"
          },
          childNodes: props.columns.map((col, index) => ({
            nodeName: "TH",
            childNodes:
              col.filterable === false
                ? []
                : [
                {
                  nodeName: "INPUT",
                  attributes: {
                    class: "datatable-input",
                    type: "search",
                    "data-columns": "[" + index + "]"
                  }
                }
              ]
          }))
        };

        tHead.childNodes?.push(filterHeaders);
        return table;
      }
    });

    // Pindahkan dropdown dari .datatable-top ke .datatable-bottom
    // setelah DataTable selesai dirender
    setTimeout(() => {
      const wrapper = table.closest(".datatable-wrapper");
      if (!wrapper) return;

      const dropdown = wrapper.querySelector(".datatable-top .datatable-dropdown");
      const bottom   = wrapper.querySelector(".datatable-bottom");

      if (dropdown && bottom) {
        bottom.appendChild(dropdown);
      }
    }, 0);
  }
};

onMounted(async () => {
  await nextTick();
  initFlowbite();
  initializeDataTable();
});

watch(() => props.rows, async () => {
  await nextTick();
  initializeDataTable();
}, { deep: true });
</script>

<template>

<div class="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
  <table id="filter-table" class="text-[12px] text-gray-500 text-center whitespace-nowrap min-w-[1200px]">
    <thead class="text-gray-700 uppercase bg-gray-50">
      <tr>
        <th
          v-for="col in props.columns"
          :key="col.key"
          scope="col"
          class="px-4 py-2 border-b border-r border-gray-200 last:border-r-0"
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
        class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b border-gray-200 hover:bg-gray-100 dark:border-gray-700"
      >
        <td
          v-for="col in props.columns"
          :key="col.key"
          class="px-4 py-2 text-center border-r border-gray-200 last:border-r-0"
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

  .datatable-wrapper thead th .datatable-input {
    color: var(--color-gray-900);
    background-color: #fff;
    width: 80px !important;
    min-width: 80px !important;
    max-width: 100px !important;
    height: 22px !important;
    margin: 3px auto;
    display: block;
    font-weight: 400;
    text-align: center;
    border: 1px solid var(--color-gray-300);
    border-radius: .5rem;
    font-size: 11px;
  }

  .datatable-wrapper .datatable-table thead {
    color: var(--color-gray-500);
    background-color: var(--color-gray-50);
    font-size: .85rem;
  }

  .datatable-wrapper .datatable-bottom {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: .75rem;
    margin-top: .5rem;
    padding: .5rem 1rem;
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
    font-size: .8rem;
    padding: 2px 6px;
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
    height: 1.75rem;
    padding-left: .6rem;
    padding-right: .6rem;
    font-size: .8rem;
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