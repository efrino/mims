<script setup lang="ts">
import { onMounted, computed, shallowRef, ref } from "vue";
import { storeToRefs } from "pinia";
import { useCompareMasterStore } from "@/stores/Stamping/Report/CompareMaster";
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

import { SearchOutlined, SyncOutlined, CheckOutlined, WarningOutlined } from '@ant-design/icons-vue';

const store = useCompareMasterStore();
const { range, filters, items } = storeToRefs(store);
const { fetchCompare, filteredItems } = store;

const page = ref({ title: 'Compare Achievement vs Master' });
const breadcrumbs = shallowRef([
  { title: "Report", disabled: false, href: "#" },
  { title: "Stamping", disabled: false, href: "#" },
  { title: "Compare Achievement vs Master", disabled: true, href: "#" },
]);

const headerTable: TableColumn[] = [
  { key: 'status', label: 'Status' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'total_qty', label: 'Total Qty (Achievement)', align: 'center' },
  { key: 'last_date', label: 'Last Date' },
  { key: 'ms_category', label: 'Category (ms_welding)' },
  { key: 'ms_area', label: 'Area (ms_welding)' },
];

const totalCount = computed(() => items.value.length);
const matchedCount = computed(() => items.value.filter((i) => i.status === 'matched').length);
const missingCount = computed(() => items.value.filter((i) => i.status === 'missing').length);

onMounted(() => {
  fetchCompare();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <div class="px-3">
    <!-- Filter tanggal + sync -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600">Dari</label>
        <input type="date" v-model="range.start" class="border rounded p-2 text-sm bg-gray-50" />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600">Sampai</label>
        <input type="date" v-model="range.end" class="border rounded p-2 text-sm bg-gray-50" />
      </div>
      <button
        type="button"
        @click="fetchCompare()"
        class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-xl text-sm px-4 py-2.5"
      >
        <SyncOutlined /> Compare
      </button>
    </div>

    <!-- Summary bar -->
    <div class="flex border rounded-xl overflow-hidden mb-4 bg-white">
      <div class="flex-1 px-5 py-3 border-r">
        <div class="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Total Part Achievement</div>
        <div class="text-2xl font-bold text-gray-800">{{ totalCount }}</div>
      </div>
      <div class="flex-1 px-5 py-3 border-r">
        <div class="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Matched (ada di ms_welding)</div>
        <div class="text-2xl font-bold text-green-600">{{ matchedCount }}</div>
      </div>
      <div class="flex-1 px-5 py-3">
        <div class="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Missing (belum ada di master)</div>
        <div class="text-2xl font-bold" :class="missingCount ? 'text-red-600' : 'text-green-600'">{{ missingCount }}</div>
      </div>
    </div>

    <!-- Filter row -->
    <div class="flex flex-wrap items-center gap-3 mb-3">
      <div class="relative w-72">
        <SearchOutlined class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          v-model="filters.part_number"
          type="text"
          placeholder="Search Part Number..."
          class="w-full bg-gray-50 pl-8 p-2 border rounded focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="filters.status = ''"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border"
          :class="!filters.status ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'"
        >
          Semua
        </button>
        <button
          type="button"
          @click="filters.status = 'missing'"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border"
          :class="filters.status === 'missing' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600'"
        >
          Missing
        </button>
        <button
          type="button"
          @click="filters.status = 'matched'"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border"
          :class="filters.status === 'matched' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600'"
        >
          Matched
        </button>
      </div>
    </div>

    <!-- Table -->
    <TableExcel :columns="headerTable" :data="filteredItems()">
      <template #cell-status="{ row }">
        <span
          v-if="row.status === 'missing'"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded"
        >
          <WarningOutlined /> Missing
        </span>
        <span v-else class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded">
          <CheckOutlined /> Matched
        </span>
      </template>
      <template #cell-part_number="{ value }">
        <span class="font-mono font-medium">{{ value }}</span>
      </template>
      <template #cell-ms_category="{ value }">
        {{ value || '—' }}
      </template>
      <template #cell-ms_area="{ value }">
        {{ value || '—' }}
      </template>
      <template #empty>
        <div class="w-full">
          <span class="px-5 py-8 text-center text-gray-500 text-sm">Tidak ada data.</span>
        </div>
      </template>
    </TableExcel>
  </div>
</template>
