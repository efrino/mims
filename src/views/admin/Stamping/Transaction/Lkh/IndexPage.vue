<script setup lang="ts">
  import { onMounted, ref, shallowRef, watch } from 'vue';
  import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
  import { useLkhStore } from '@/stores/Stamping/Transaction/LKH';
  import { storeToRefs } from "pinia";
  import {
    CalendarOutlined,
  } from '@ant-design/icons-vue';
  import { useConfigStore } from '@/stores/config';
  import { initFlowbite } from "flowbite";
  import DataTable from '@/components/table/DataTableFilter.vue';

  // @ts-ignore
  import Datepicker from "flowbite-datepicker/Datepicker";

  const page = ref({ title: 'Production Lembar Kerja Harian (LKH) Stamping' });
  const breadcrumbs = shallowRef([
    {
      title: 'Stamping',
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

  const lkhStore = useLkhStore();
  // const {
  //   onVoid,
  //   fetchData,
  // } = lkhStore;
  const { 
    tableRows,
    filterDate,
    form,
    // partItems
   } = storeToRefs(lkhStore);
  
   const configStore = useConfigStore();
   
  onMounted(() => {
    console.log("FETCH DIPANGGIL");
    lkhStore.fetchData();
    initFlowbite();

    const el = document.getElementById("datepicker-inline");

    if (el) {

      const datepicker = new Datepicker(el, {
        autohide: false,
        format: "yyyy-mm-dd"
      });

      if (filterDate.value.date) {
        datepicker.setDate(filterDate.value.date);
      }

      // filter by date
      el.addEventListener("changeDate", (e: any) => {
        const d = e.detail.date;

        const localDate = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, "0"),
          String(d.getDate()).padStart(2, "0"),
        ].join("-")

        filterDate.value.date = localDate;
        lkhStore.fetchData();
      });
    }
  });

  const columns = [
  { key: "ZDATE", label: "Date" },
  { key: "ZSHIFT", label: "Shift" },
  { key: "ZPROJECT", label: "Model" },
  { key: "BISMT", label: "Job Number" },
  { key: "part_number", label: "Part Number" },
  { key: "MATNR", label: "Job Number" },
  { key: "MAKTX", label: "Description" },
  { key: "ZDATE_CREATE", label: "Created At" },
  { key: "ZQTY", label: "Qty" },
  { key: "ZKET", label: "Keterangan" },
];
watch(tableRows, (val) => {
  console.log("ROWS:", val);
});

</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-wrap">
    <div class="w-full">
      <div class="flex items-center justify-between my-3 px-3">
        <div class="flex items-center gap-3">
          <!-- tambah permission -->
          <button 
            type="button" 
            data-dropdown-toggle="datepickerDropdown"
            v-if="lkhStore.permissions.download"
            class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <CalendarOutlined />
            Filter By Date
            <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
            </svg>
          </button>
          <div
            id="datepickerDropdown"
            class="hidden z-50 mt-2 w-72 bg-white border rounded-lg shadow"
          >
            <div id="datepicker-inline"></div>
          </div>
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