<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useScanKanbanOUTStore } from '@/stores/PCD/Kanban/ScanKanbanOUT';
import { storeToRefs } from 'pinia';

const page = ref({ title: 'Scan Kanban (OUT)' });
const breadcrumbs = shallowRef([
  {
    title: 'PCD',
    disabled: false,
    href: '#'
  },
  {
    title: 'Kanban',
    disabled: false,
    href: '#'
  },
  {
    title: 'Scan Kanban (OUT)',
    disabled: true,
    href: '#'
  }
]);

const kanbanStore = useScanKanbanOUTStore();
const scanKanban = ref<HTMLInputElement | null>(null);
const { id_kanban, listKanbanOUT } = storeToRefs(kanbanStore);

onMounted(() => {
  scanKanban.value?.focus();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="w-full flex flex-col justify-center items-center gap-10">
    <div class="w-2xl p-6 text-center bg-white border border-gray-200 rounded-xl shadow">
      <div class="text-start">
        <label for="id_kanban" class="block mb-2 text-md font-medium text-gray-900">ID Kanban</label>
        <input ref="scanKanban" v-model="id_kanban" @keyup.enter="kanbanStore.getKanbanOUT()" type="text" id="id_kanban" class="bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Input ID Kanban" required />
      </div>
    </div>

    <!-- Table -->
    <div class="relative overflow-x-auto shadow-md sm:rounded-xl w-full bg-white p-6">
      <div class="mb-4 mx-1 flex justify-between items-center">
        <h1 class="font-semibold text-2xl text-gray-600">List Kanban (Scan OUT)</h1>
        <button 
            :disabled="listKanbanOUT.length > 0 ? false : true"
            type="button"
            @click="kanbanStore.saveAllData()"
            class="flex items-center gap-2 text-white font-medium rounded-full text-sm px-4 py-2 text-center"
            :class="listKanbanOUT.length > 0 ? 'bg-blue-600 hover:bg-blue-800' : 'bg-gray-400 cursor-not-allowed'"
          >
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M11 16h2m6.707-9.293-2.414-2.414A1 1 0 0 0 16.586 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7.414a1 1 0 0 0-.293-.707ZM16 20v-6a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v6h8ZM9 4h6v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4Z"/>
          </svg>
            Save All
          </button>
      </div>
      <table class="w-full text-sm text-left rtl:text-right text-gray-500 rounded">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3">
              Part Number
            </th>
            <th scope="col" class="px-6 py-3">
              Kanban ID
            </th>
            <th scope="col" class="px-6 py-3">
              QTY
            </th>
            <th scope="col" class="px-6 py-3">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-if="listKanbanOUT.length > 0"
            v-for="(value, index) in listKanbanOUT"
            :key="index"
            class="bg-white border-b border-gray-200 hover:bg-gray-50"
          >
            <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
              {{ value.MATNR }}
            </th>
            <td class="px-6 py-4">
              {{ value.id_kanban }}
            </td>
            <td class="px-6 py-4">
              {{ value.BEHMG }}
            </td>
            <td class="px-6 py-4">
              <button
                type="button"
                @click="kanbanStore.deleteKanbanOUT(index)"
                class="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 outline-1 outline-offset-1 outline-solid rounded-md"
              >
              <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
              </svg>
                Hapus
              </button>
            </td>
          </tr>
          <tr v-else>
            <td colspan="4" class="px-6 py-8 text-center text-gray-500">
              Scan kanban atau masukan id kanban terlebih dulu.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
