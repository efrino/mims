<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useScanEKanbanStore } from '@/stores/PCD/Kanban/ScanEKanban';
import { storeToRefs } from 'pinia';

const page = ref({ title: 'Scan E-Kanban' });
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
    title: 'Scan E-Kanban',
    disabled: true,
    href: '#'
  }
]);

const scanKanban = ref<HTMLInputElement | null>(null);
const store = useScanEKanbanStore();
const { barcodeId } = storeToRefs(store);

onMounted(() => {
  scanKanban.value?.focus();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex justify-center">
    <div class="w-2xl p-6 text-center bg-white rounded-xl shadow">
      <div class="text-start">
        <label for="id_kanban" class="block mb-2 text-md font-medium text-gray-900">Scan Barcode Kanban</label>
        <input ref="scanKanban" v-model="barcodeId" @keyup.enter="store.onScan()" type="text" id="id_kanban" class="bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="ID Kanban" required />
      </div>
    </div>
  </div>
</template>

<style>
  .border {
    border: 1px solid #e5e7eb !important;
  }
</style>