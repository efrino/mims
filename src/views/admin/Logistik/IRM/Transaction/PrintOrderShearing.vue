<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import { usePrintOrderShearingStore } from '@/stores/Logistik/IRM/Transaction/PrintOrderShearing';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';

const page = ref({ title: 'Print Order Shearing' });
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'IRM',
    disabled: false,
    href: '#'
  },
  {
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Order Shearing',
    disabled: false,
    href: '#'
  },
  {
    title: 'Print Preview',
    disabled: false,
    href: '#'
  },
]);

const printOrderShearingStore = usePrintOrderShearingStore();
const { printA4 } = printOrderShearingStore;

const printData = ref({
  tanggal: '',
  shift: '',
  mesin: '',
  operator: '',
  material: {
    job_number: '',
    spec_before: {
      code: '',
      t: '',
      w: '',
      l: '',
    },
    spec_after: {
      code: '',
      t: '',
      w: '',
      l: '',
    },
  },
  sheet: '',
  bq: '',
  totalSheet: '',
  supplier: '',
});

onMounted(() => {
  const saved = localStorage.getItem('printOrderShearing');
  if (saved) {
    printData.value = JSON.parse(saved);
  }

  console.log(printData);
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-wrap justify-center">
    <!-- Paper View -->
    <div 
      class="max-w-7xl text-sm !border !border-black !box-border"
      id="printArea"  
    >
      <div class="w-full m-0 px-2 py-1">
        <div class="print-header flex items-center py-4 px-2 gap-64">
          <div class="logo max-w-3xs">
            <img src="@/assets/images/logo.png" alt="Company Logo" />
          </div>

          <div class="header-info">
            <h1 class="text-4xl font-semibold text-black uppercase">Kartu Hasil Shearing</h1>
          </div>
        </div>

        <div class="info my-2 grid grid-cols-[100px_1fr] gap-y-1">
          <div>Hari, Tanggal</div>
          <div>: {{ printData.tanggal }}</div>

          <div>Shift</div>
          <div>: {{ printData.shift }}</div>

          <div>Mesin</div>
          <div>: {{ printData.mesin }}</div>

          <div>Operator</div>
          <div>: {{ printData.operator }}</div>
        </div>
        <!-- Table -->
        <div class="print-table">
          <table class="!w-full !border !border-gray-900 !border-collapse">
            <colgroup>
              <col style="width: 18%">
              <col style="width: 16%">
              <col style="width: 8%">
              <col style="width: 8%">
              <col style="width: 8%">
              <col style="width: 12%">
              <col style="width: 15%">
              <col style="width: 15%">
            </colgroup>

            <thead>
              <tr class="text-center">
                <th rowspan="2" class="!border !border-gray-900">Job Number</th>
                <th colspan="4" class="!border !border-gray-900 py-1">Material Hasil Sheet</th>
                <th rowspan="2" class="!border !border-gray-900">Total Sheet</th>
                <th rowspan="2" class="!border !border-gray-900">Tag ID</th>
                <th rowspan="2" class="!border !border-gray-900">Supplier</th>
              </tr>
              <tr>
                <th class="!border !border-gray-900 py-1">SPEC</th>
                <th class="!border !border-gray-900">T</th>
                <th class="!border !border-gray-900">W</th>
                <th class="!border !border-gray-900">L</th>
              </tr>
            </thead>
            <tbody>
              <tr class="text-center">
                <td class="!border !border-gray-900 py-1 text-base">{{ printData.material.job_number }}</td>
                <td class="!border !border-gray-900">{{ printData.material.spec_before.code }}</td>
                <td class="!border !border-gray-900">{{ printData.material.spec_before.t }}</td>
                <td class="!border !border-gray-900">{{ printData.material.spec_before.w }}</td>
                <td class="!border !border-gray-900">{{ printData.material.spec_before.l }}</td>
                <td class="!border !border-gray-900">{{ printData.sheet }}</td>
                <td class="!border !border-gray-900"></td>
                <td class="!border !border-gray-900">{{ printData.supplier }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="print-table mt-4">
          <table class="!w-full !border table-fixed">
            <colgroup>
              <col style="width: 18%">
              <col style="width: 16%">
              <col style="width: 8%">
              <col style="width: 8%">
              <col style="width: 8%">
              <col style="width: 12%">
              <col style="width: 10%">
              <col style="width: 10%">
              <col style="width: 10%">
            </colgroup>

            <thead>
              <tr class="text-center">
                <th rowspan="2" class="!border !border-gray-900">Job Number</th>
                <th colspan="4" class="!border !border-gray-900 py-1">Material Hasil Sheet</th>
                <th rowspan="2" class="!border !border-gray-900">Bentuk</th>
                <th colspan="3" class="!border !border-gray-900">Total Sheet</th>
              </tr>
              <tr>
                <th class="!border !border-gray-900 py-1">SPEC</th>
                <th class="!border !border-gray-900">T</th>
                <th class="!border !border-gray-900">W</th>
                <th class="!border !border-gray-900">L</th>
                <th class="!border !border-gray-900">Sheet</th>
                <th class="!border !border-gray-900">B/Q</th>
                <th class="!border !border-gray-900">PCS</th>
              </tr>
            </thead>
            <tbody>
              <tr class="text-center">
                <td class="!border !border-gray-900 py-1">{{ printData.material.job_number }}</td>
                <td class="!border !border-gray-900">{{ printData.material.spec_after.code }}</td>
                <td class="!border !border-gray-900">{{ printData.material.spec_after.t }}</td>
                <td class="!border !border-gray-900">{{ printData.material.spec_after.w }}</td>
                <td class="!border !border-gray-900">{{ printData.material.spec_after.l }}</td>
                <td class="!border !border-gray-900"></td>
                <td class="!border !border-gray-900">{{ printData.sheet }}</td>
                <td class="!border !border-gray-900">{{ printData.bq }}</td>
                <td class="!border !border-gray-900">{{ printData.totalSheet }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end mt-4">
          <table class="!border table-fixed">
            <thead>
              <tr class="text-center">
                <th class="!border !border-gray-900 w-48 py-1">Checked</th>
                <th class="!border !border-gray-900 w-48">Operator</th>
              </tr>
              <tr>
                <th style="height: 68px;" class="!border !border-gray-900"></th>
                <th class="!border !border-gray-900"></th>
              </tr>
            </thead>
            <tbody>
              <tr class="text-center">
                <td class="!border !border-gray-900 py-1"></td>
                <td class="!border !border-gray-900">{{ printData.operator }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="print-button flex justify-center">
    <button
      class="gap-2 inline-flex mt-8 px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-700"
      @click="printA4"
    >
      <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
				<path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M16.444 18H19a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.556M17 11V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v6h10ZM7 15h10v4a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-4Z"/>
			</svg>
      Print
    </button>
  </div>
</template>

<style>
@media print {
  @page {
    size: A4;
    margin: 0mm;
  }

  body * {
    visibility: hidden;
  }

  #printArea,
  #printArea * {
    visibility: visible;
  }
}
</style>
