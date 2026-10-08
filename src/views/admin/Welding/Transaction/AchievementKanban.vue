<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import VueApexCharts from 'vue3-apexcharts';
import { CalendarOutlined, EyeOutlined } from '@ant-design/icons-vue';
import { useWeldingAchKanbanProdStore } from '@/stores/Welding/Transaction/AchievementKanban';
import { storeToRefs } from 'pinia';
import { useUtilityStore } from '@/stores/utility';
// @ts-ignore
import Datepicker from 'flowbite-datepicker/Datepicker';

const page = ref({ title: '' });
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
    title: 'Achievement Kanban',
    disabled: true,
    href: '#'
  }
]);

const achievementStore = useWeldingAchKanbanProdStore();
const { achKanbanData, isModalOpen, filterDate } = storeToRefs(achievementStore);
const utilityStore = useUtilityStore();

onMounted(() => {
  filterDate.value = utilityStore.getCurrentShift();
  filterDate.value.month = '';
  filterDate.value.year = '';
  achievementStore.fetchDataAchKanban();
  page.value.title = `Production Achievement Kanban Welding (${utilityStore.dateIndonesian(filterDate.value.date)})`;

  const el = document.getElementById('datepicker-inline');

  if (el) {
    const datepicker = new Datepicker(el, {
      autohide: false,
      format: 'yyyy-mm-dd'
    });

    if (filterDate.value.date) {
      datepicker.setDate(filterDate.value.date);
    }

    // filter by date
    el.addEventListener('changeDate', (e: any) => {
      const d = e.detail.date;

      const localDate = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

      filterDate.value.date = localDate;
      achievementStore.fetchDataAchKanban();
      page.value.title = `Production Achievement Kanban Welding (${utilityStore.dateIndonesian(localDate)})`;
    });
  }
});

const handleCloseModal = () => {
  isModalOpen.value = false;
};

const chartOptions = computed(() => ({
  chart: {
    type: 'radialBar'
  },
  stroke: {
    lineCap: 'round'
  },
  plotOptions: {
    radialBar: {
      hollow: {
        size: '50%'
      },
      track: {
        background: '#e5e7eb' // abu-abu
      },
      dataLabels: {
        name: {
          show: false
        },
        value: {
          show: true,
          fontSize: '18px',
          offsetY: 8,
          formatter: (val: number) => `${val}%`
        }
      }
    }
  },
  labels: [''],
  colors: ['#A855F7'] // purple-500
}));
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <!-- button -->
  <div class="flex flex-wrap items-center gap-3 mb-5">
    <button
      type="button"
      data-dropdown-toggle="datepickerDropdown"
      class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 font-medium rounded-full text-sm px-5 py-2.5 text-center"
    >
      <CalendarOutlined />
      Filter By Date
      <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4" />
      </svg>
    </button>
    <div id="datepickerDropdown" class="hidden z-50 mt-2 w-72 bg-white rounded-lg shadow">
      <div id="datepicker-inline"></div>
    </div>
    <form class="flex w-1/4">
      <select
        v-model="filterDate.month"
        id="month"
        class="bg-gray-50 min-w-[130px] border border-new text-gray-900 text-sm rounded-s-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        required
      >
        <option value="" disabled>Pilih Bulan</option>
        <option value="01">Januari</option>
        <option value="02">Februari</option>
        <option value="03">Maret</option>
        <option value="04">April</option>
        <option value="05">Mei</option>
        <option value="06">Juni</option>
        <option value="07">Juli</option>
        <option value="08">Agustus</option>
        <option value="09">September</option>
        <option value="10">Oktober</option>
        <option value="11">November</option>
        <option value="12">Desember</option>
      </select>
      <select
        v-model="filterDate.year"
        id="year"
        class="bg-gray-50 min-w-[130px] border border-new text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        required
      >
        <option value="" disabled>Pilih Tahun</option>
        <option v-for="i in 5" :key="i" :value="new Date().getFullYear() - (i - 1)">
          {{ new Date().getFullYear() - (i - 1) }}
        </option>
      </select>
      <button
        type="button"
        @click="achievementStore.syncSAP()"
        class="flex w-full items-center gap-2 whitespace-nowrap text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-e-full text-sm px-3 py-2.5 text-center"
      >
        <svg
          class="w-5 h-5 text-white"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"
          />
        </svg>
        Sync SAP
      </button>
    </form>
  </div>

  <!-- Card -->
  <div class="flex flex-wrap w-full gap-5">
    <div
      v-if="achKanbanData.lines && achKanbanData.lines.length > 0"
      v-for="(value, index) in achKanbanData.lines"
      :key="index"
      class="flex justify-staart items-center w-md bg-white rounded-xl p-3 shadow"
    >
      <div class="w-fit">
        <VueApexCharts
          type="radialBar"
          height="120"
          width="120"
          :series="[value.total_lkh ? utilityStore.formatPercentOneZero((value.total_sap! / value.total_lkh) * 100) : 0]"
          :options="chartOptions"
        />
      </div>
      <div class="flex flex-col w-full pe-6">
        <h1 class="text-xl font-semibold text-gray-700">LINE {{ value.line_id }}</h1>
        <button
          @click="achievementStore.detailAchKanban(value.line_id!)"
          class="w-full self-end btn-view inline-flex justify-center items-center gap-1 mt-4 py-1 text-sm text-blue-600 outline-1 outline-offset-1 outline-solid rounded-md"
        >
          <EyeOutlined />
          View
        </button>
      </div>
    </div>
    <div v-else class="flex justify-center w-full">
      <h1 class="text-gray-400 font-semibold mt-10">{{ achKanbanData.errorMessage }}</h1>
    </div>
  </div>

  <!-- Modal -->
  <Transition name="modal">
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="handleCloseModal"
    >
      <div class="relative p-4 max-h-full">
        <!-- Modal content -->
        <div class="relative bg-[#fafafb] rounded-lg shadow-lg p-5">
          <!-- Modal header -->
          <div class="flex items-start justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <div class="flex gap-5 w-full justify-center">
              <div class="bg-white min-w-1/6 shadow rounded-lg p-5">
                <div class="flex gap-2 items-center text-gray-500 font-semibold text-xl mb-2">
                  <span class="rounded-full bg-blue-100 p-2">
                    <svg
                      class="w-5 h-5 text-blue-400"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 14v7M5 4.971v9.541c5.6-5.538 8.4 2.64 14-.086v-9.54C13.4 7.61 10.6-.568 5 4.97Z"
                      />
                    </svg>
                  </span>
                  LINE
                </div>
                <h1 class="text-blue-400 font-semibold text-2xl text-center">{{ achKanbanData.detail[0].line ?? '-' }}</h1>
              </div>
              <div class="bg-white min-w-1/6 shadow rounded-lg p-5">
                <div class="flex gap-2 items-center text-gray-500 font-semibold text-xl mb-2">
                  <span class="rounded-full bg-blue-100 p-2">
                    <svg
                      class="w-5 h-5 text-blue-400"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667"
                      />
                    </svg>
                  </span>
                  Total LKH
                </div>
                <h1 class="text-blue-400 font-semibold text-2xl text-center">{{ achKanbanData.detail[0].total_lkh ?? 0 }}</h1>
              </div>
              <div class="bg-white min-w-1/6 shadow rounded-lg p-5">
                <div class="flex gap-2 items-center text-gray-500 font-semibold text-xl mb-2">
                  <span class="rounded-full bg-blue-100 p-2">
                    <svg
                      class="w-5 h-5 text-blue-400"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667"
                      />
                    </svg>
                  </span>
                  Total SAP
                </div>
                <h1 class="text-blue-400 font-semibold text-2xl text-center">{{ achKanbanData.detail[0].total_sap ?? 0 }}</h1>
              </div>
              <div class="bg-white min-w-1/6 shadow rounded-lg p-5">
                <div class="flex gap-2 items-center text-gray-500 font-semibold text-xl mb-2">
                  <span class="rounded-full bg-blue-100 p-2">
                    <svg
                      class="w-5 h-5 text-blue-400"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667"
                      />
                    </svg>
                  </span>
                  Achievement
                </div>
                <h1 class="text-blue-400 font-semibold text-2xl text-center">
                  {{
                    achKanbanData.detail[0].total_lkh != 0 && achKanbanData.detail[0].total_sap != 0
                      ? utilityStore.formatPercentOneZero((achKanbanData.detail[0].total_sap! / achKanbanData.detail[0].total_lkh!) * 100)
                      : '0%'
                  }}
                </h1>
              </div>
            </div>
            <button
              type="button"
              @click="handleCloseModal"
              class="end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span class="sr-only">Close modal</span>
            </button>
          </div>
          <!-- Modal body -->
          <div class="p-4 md:p-5">
            <div class="relative overflow-auto lg:max-w-[1100px] 2xl:max-w-[1730px] lg:max-h-[450px] 2xl:max-h-[650px] sm:rounded-lg">
              <table class="w-full text-sm text-center text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" rowspan="3" class="px-6 py-3 border-new">No</th>
                    <th scope="col" colspan="2" rowspan="2" class="px-6 py-3 border-new bg-cyan-50">Patan</th>
                    <th scope="col" rowspan="3" class="px-6 py-3 border-new">Part Number</th>
                    <th scope="col" rowspan="3" class="px-6 py-3 border-new">Job Number</th>
                    <th scope="col" colspan="2" class="px-6 py-3 border-new bg-red-50">Lot Size</th>
                    <th scope="col" colspan="3" class="px-6 py-3 border-new bg-blue-50">LKH</th>
                    <th scope="col" colspan="3" class="px-6 py-3 border-new bg-yellow-50">SAP</th>
                    <th scope="col" colspan="2" class="px-6 py-3 border-new bg-green-50">GAP LKH vs SCAN</th>
                    <th scope="col" colspan="2" class="px-6 py-3 border-new bg-purple-50">Reject</th>
                  </tr>
                  <tr>
                    <th scope="col" class="px-6 py-3 border-new bg-red-50">Shift 1</th>
                    <th scope="col" class="px-6 py-3 border-new bg-red-50">Shift 2</th>
                    <th scope="col" class="px-6 py-3 border-new bg-blue-50">Shift 1</th>
                    <th scope="col" class="px-6 py-3 border-new bg-blue-50">Shift 2</th>
                    <th scope="col" class="px-6 py-3 border-new bg-blue-50">Total</th>
                    <th scope="col" class="px-6 py-3 border-new bg-yellow-50">Shift 1</th>
                    <th scope="col" class="px-6 py-3 border-new bg-yellow-50">Shift 2</th>
                    <th scope="col" class="px-6 py-3 border-new bg-yellow-50">Total</th>
                    <th scope="col" class="px-6 py-3 border-new bg-green-50">Shift 1</th>
                    <th scope="col" class="px-6 py-3 border-new bg-green-50">Shift 2</th>
                    <th scope="col" class="px-6 py-3 border-new bg-purple-50">Shift 1</th>
                    <th scope="col" class="px-6 py-3 border-new bg-purple-50">Shift 2</th>
                  </tr>
                  <tr>
                    <th scope="col" class="px-6 py-3 border-new bg-cyan-50">Shift 1</th>
                    <th scope="col" class="px-6 py-3 border-new bg-cyan-50">Shift 2</th>
                    <th scope="col" class="px-6 py-3 border-new bg-red-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-red-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-blue-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-blue-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-blue-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-yellow-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-yellow-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-yellow-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-green-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-green-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-purple-50">(PCS)</th>
                    <th scope="col" class="px-6 py-3 border-new bg-purple-50">(PCS)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-if="achKanbanData.detail && achKanbanData.detail.length > 0"
                    v-for="(value, index) in achKanbanData.detail"
                    class="bg-white border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td class="px-6 py-4 border-new">
                      {{ index + 1 }}
                    </td>
                    <td class="px-6 py-4 border-new bg-cyan-50">
                      {{ value.PATAN_SHIFT1 ?? '-' }}
                    </td>
                    <td class="px-6 py-4 border-new bg-cyan-50">
                      {{ value.PATAN_SHIFT2 ?? '-' }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{ value.MATNR ?? '-' }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{ value.job_number ?? '-' }}
                    </td>
                    <td class="px-6 py-4 border-new bg-red-50">
                      {{ value.PLAN_SHIFT1 ?? 0 }}
                    </td>
                    <td class="px-6 py-4 border-new bg-red-50">
                      {{ value.PLAN_SHIFT2 ?? 0 }}
                    </td>
                    <td class="px-6 py-4 border-new bg-blue-50">
                      {{ value.ACT_SHIFT1 ?? 0 }}
                    </td>
                    <td class="px-6 py-4 border-new bg-blue-50">
                      {{ value.ACT_SHIFT2 ?? 0 }}
                    </td>
                    <td class="px-6 py-4 border-new bg-blue-50">
                      {{ Number(value.ACT_SHIFT1 || 0) + Number(value.ACT_SHIFT2 || 0) }}
                    </td>
                    <td class="px-6 py-4 border-new bg-yellow-50">
                      {{ value.ZQTY_SAP_ZSHIFT1 ?? 0 }}
                    </td>
                    <td class="px-6 py-4 border-new bg-yellow-50">
                      {{ value.ZQTY_SAP_ZSHIFT2 ?? 0 }}
                    </td>
                    <td class="px-6 py-4 border-new bg-yellow-50">
                      {{ Number(value.ZQTY_SAP_ZSHIFT1 || 0) + Number(value.ZQTY_SAP_ZSHIFT2 || 0) }}
                    </td>
                    <td class="px-6 py-4 border-new bg-green-50">
                      {{ Number(value.ZQTY_SAP_ZSHIFT1 || 0) - Number(value.ACT_SHIFT1 || 0) }}
                    </td>
                    <td class="px-6 py-4 border-new bg-green-50">
                      {{ Number(value.ZQTY_SAP_ZSHIFT2 || 0) - Number(value.ACT_SHIFT2 || 0) }}
                    </td>
                    <td class="px-6 py-4 border-new bg-purple-50">
                      {{ value.NG_SHIFT1 ?? 0 }}
                    </td>
                    <td class="px-6 py-4 border-new bg-purple-50">
                      {{ value.NG_SHIFT2 ?? 0 }}
                    </td>
                  </tr>
                  <tr v-else>
                    <td colspan="17" class="text-gray-400 py-4 text-center border-new">No Data Available</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.border-new {
  border: 1px solid #e5e7eb !important;
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
  margin: 0.5px;
}
</style>
