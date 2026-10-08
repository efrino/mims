<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import DataTable from '@/components/table/DataTableFilter.vue';
import { onMounted, nextTick, watch } from "vue";
import { initFlowbite } from "flowbite";
import { useLKHStore } from '@/stores/Welding/Transaction/LKH';
import { storeToRefs } from "pinia";
import { useConfigStore } from '@/stores/config';
import DatePickerButton from '@/components/date/DatePickerButton.vue';

const page = ref({ title: 'Lembar Kerja Harian (LKH) Welding' });
const breadcrumbs = shallowRef([
  {
    title: 'Welding',
    disabled: false,
    href: '#'
  },
  {
    title: 'Production',
    disabled: false,
    href: '#'
  },
  {
    title: 'LKH',
    disabled: true,
    href: '#'
  }
]);
const lkhStore = useLKHStore();
const { form, tableRows, filterDate } = storeToRefs(lkhStore);
const configStore = useConfigStore();

onMounted(async () => {
  await nextTick();
  initFlowbite();
  lkhStore.fetchTableData();
  lkhStore.getPartItem();
});

watch(() => filterDate.value.date, () => {
  lkhStore.fetchTableData();
});

const columns = [
  { key: "id", label: "ID" },
  { key: "date", label: "Date" },
  { key: "shift", label: "Shift" },
  { key: "model", label: "Model" },
  { key: "jobNumber", label: "Job Number" },
  { key: "partNumber", label: "Part Number" },
  { key: "qty", label: "Qty" },
  { key: "createdAt", label: "Created At" },
  { key: "action", label: "Action" },
];

</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-wrap">
    <div class="w-full">
      <div class="flex items-center justify-between my-3 px-3">
        <div class="flex items-center gap-3">
          <DatePickerButton v-if="lkhStore.permissions.download" v-model="filterDate.date" label="Tanggal" />
          <a
            type="button"
            v-if="lkhStore.permissions.download"
            target="_blank"
            :href="`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh-export?tag=LKH-WLD&period=${form.date}`"
            class="flex items-center gap-2 text-white bg-green-500 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"/>
            </svg>
            Excel
          </a>
        </div>
      </div>
      <DataTable :columns="columns" :rows="tableRows" />
    </div>
  </div>
</template>

<style>
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
</style>