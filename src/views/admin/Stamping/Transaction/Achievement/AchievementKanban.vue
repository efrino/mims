<script setup lang="ts">
import { useUtilityStore } from "@/stores/utility";
import { useStampingAchievementProdStore } from "@/stores/Stamping/Transaction/Achievement";
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import VueApexCharts from "vue3-apexcharts";
import { onMounted, ref, shallowRef, computed } from 'vue';
import { storeToRefs } from "pinia";
// @ts-ignore
import Datepicker from "flowbite-datepicker/Datepicker";

const page = ref({ title: '' });
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
    title: 'Achievement Kanban',
    disabled: true,
    href: '#'
  }
]);

const utilityStore = useUtilityStore();
const achievementStore = useStampingAchievementProdStore();

const {
  formatPercentOneZero,
} = utilityStore

const {
  loadDataEditSAP,
  fetchDataSAPKBN,
} = achievementStore

const {
  lines,
  dialogKBN,
  line_id,
  formDetail,
  filterDate,
} = storeToRefs(achievementStore);

const view = ref(false);
const onView = (line: any) => {
  loadDataEditSAP(line);
  dialogKBN.value.detail = true;
};


const getProgressValue = (line: any): number => {
  if (!line.total_lkh || Number(line.total_lkh) === 0) return 0;

  const sap = Number(line.total_sap ?? 0);
  const lkh = Number(line.total_lkh ?? 0);

  const result = (sap / lkh) * 100;

  return Number(result.toFixed(1));
};

const getProgressBgColor = (value: number): string => {
  if (value == 100) return "#43A047";
  if (value > 100) return "#1E88E5";
  if (value >= 70) return "#E53935";
  return "#E53935";
};

const setComparisonColor = (value1: number, value2: number): string => {
  if (Number(value1) == Number(value2))
    return "text-green-300 font-semibold";
  if (Number(value1) > Number(value2))
    return "text-red-300 font-semibold";
  if (Number(value1) >= Number(value2))
    return "text-yellow-100 font-semibold";
  return "text-red-300 font-semibold";
};

const setComparisonGapColor = (value: number): string => {
  if (Number(value) == 0) return "text-green-300 font-semibold";
  if (Number(value) > 0) return "text-red-300 font-semibold";
  return "text-red-300  font-semibold";
};

onMounted(() => {
  fetchDataSAPKBN('LKH-STP');
  filterDate.value = utilityStore.getCurrentShift();
  filterDate.value.month = "";
  filterDate.value.year = "";
  page.value.title = `Achievement Kanban Stamping (${utilityStore.dateIndonesian(filterDate.value.date)})`;

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
      achievementStore.fetchDataSAPKBN('LKH-STP');;
      page.value.title = `Achievement Kanban Stamping (${utilityStore.dateIndonesian(localDate)})`;
    });
  }
})

const getChartOptions = (line: any) => {
  const value = getProgressValue(line);

  return {
    chart: {
      type: "radialBar",
      sparkline: { enabled: true },
    },
    stroke: {
      lineCap: "round",
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: "50%",
        },
        track: {
          background: "#e5e7eb",
        },
        dataLabels: {
          name: { show: false },
          value: {
            show: true,
            fontSize: "16px",
            fontWeight: 600,
            offsetY: 6,
            formatter: (val: number) => `${val}%`,
          },
        },
      },
    },
    colors: [getProgressBgColor(value)],
  };
};

const sumArray = (arr: any[]) => {
  if (!arr || !Array.isArray(arr)) return 0;
  return arr.reduce((acc, curr) => acc + Number(curr || 0), 0);
};

const grandTotalLKH = computed(() => {
  const f = formDetail.value;
  if (!f) return 0;

  const shift1 = sumArray(f.total_prod_rh_shift1) + sumArray(f.total_prod_lh_shift1);
  const shift2 = sumArray(f.total_prod_rh_shift2) + sumArray(f.total_prod_lh_shift2);

  return shift1 + shift2;
});

const grandTotalSAP = computed(() => {
  const f = formDetail.value;
  if (!f) return 0;

  const shift1 = sumArray(f.SAP_RH_SHIFT1) + sumArray(f.SAP_LH_SHIFT1);
  const shift2 = sumArray(f.SAP_RH_SHIFT2) + sumArray(f.SAP_LH_SHIFT2);

  return shift1 + shift2;
});

const achievementPercentage = computed(() => {
  const lkh = grandTotalLKH.value;
  const sap = grandTotalSAP.value;

  if (lkh === 0) return 0;

  return ((sap / lkh) * 100).toFixed(1);
});

const footerTotals = computed(() => {
  const f = formDetail.value;
  if (!f) return {};

  const sum = (arr: any[]) => {
    if (!arr || !Array.isArray(arr)) return 0;
    return arr.reduce((acc, curr) => acc + Number(curr || 0), 0);
  };

  return {
    // 1. LOTSIZE
    lotsize_rh_1: sum(f.lotsize_rh_shift1),
    lotsize_lh_1: sum(f.lotsize_lh_shift1),
    lotsize_rh_2: sum(f.lotsize_rh_shift2),
    lotsize_lh_2: sum(f.lotsize_lh_shift2),

    // 2. PRODUCTION
    prod_rh_1: sum(f.total_prod_rh_shift1),
    prod_lh_1: sum(f.total_prod_lh_shift1),
    prod_rh_2: sum(f.total_prod_rh_shift2),
    prod_lh_2: sum(f.total_prod_lh_shift2),

    // 3. SAP
    sap_rh_1: sum(f.SAP_RH_SHIFT1),
    sap_lh_1: sum(f.SAP_LH_SHIFT1),
    sap_rh_2: sum(f.SAP_RH_SHIFT2),
    sap_lh_2: sum(f.SAP_LH_SHIFT2),

    // 4. GAP
    gap_rh: sum(f.gap_rh),
    gap_lh: sum(f.gap_lh),

    // 5. REJECT
    reject_rh_1: sum(f.total_reject_rh_shift1),
    reject_lh_1: sum(f.total_reject_lh_shift1),
    reject_rh_2: sum(f.total_reject_rh_shift2),
    reject_lh_2: sum(f.total_reject_lh_shift2),
  };
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <!-- button -->
  <div class="flex flex-wrap items-center gap-3 mb-5">
    <button type="button" data-dropdown-toggle="datepickerDropdown"
      class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 font-medium rounded-full text-sm px-5 py-2.5 text-center">
      <CalendarOutlined />
      Filter By Date
      <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
        viewBox="0 0 10 6">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4" />
      </svg>
    </button>
    <div id="datepickerDropdown" class="hidden z-50 mt-2 w-72 bg-white rounded-lg shadow">
      <div id="datepicker-inline"></div>
    </div>
    <form class="flex w-1/4">
      <select v-model="filterDate.month" id="month"
        class="bg-gray-50 min-w-[130px] border border-new text-gray-900 text-sm rounded-s-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        required>
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
      <select v-model="filterDate.year" id="year"
        class="bg-gray-50 min-w-[130px] border border-new text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        required>
        <option value="" disabled>Pilih Tahun</option>
        <option v-for="i in 5" :key="i" :value="new Date().getFullYear() - (i - 1)">
          {{ new Date().getFullYear() - (i - 1) }}
        </option>
      </select>
      <button type="button" @click="achievementStore.fetchDataSAPKBN('LKH-STP')"
        class="flex w-full items-center gap-2 whitespace-nowrap text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-e-full text-sm px-3 py-2.5 text-center">
        <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4" />
        </svg>
        Sync SAP
      </button>
    </form>
  </div>

  <!-- Menu -->
  <div class="mb-15 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    <div v-for="(line, i) in lines" :key="i" class="flex items-center gap-4
            bg-white rounded-xl p-4
            border border-gray-200 shadow-sm
            hover:shadow-md transition">
      <!-- Radial Chart -->
      <VueApexCharts type="radialBar" height="110" width="110" :series="[getProgressValue(line)]"
        :options="getChartOptions(line)" />

      <!-- Content -->
      <div class="flex flex-col justify-between flex-1">
        <h2 class="text-lg font-semibold text-gray-800">
          LINE {{ line.line_id }}
        </h2>

        <button @click="onView(line)" class="inline-flex items-center justify-center gap-1 mt-3
                py-1.5 text-sm font-medium
                text-blue-600 border border-blue-600 rounded-md
                hover:bg-blue-600 hover:text-blue-800 transition outline">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5
                c4.478 0 8.268 2.943 9.542 7
                -1.274 4.057-5.064 7-9.542 7
                -4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!lines || lines.length === 0" class="flex justify-center w-full">
      <h1 class="text-gray-400 font-semibold mt-10 text-center">
        Data tidak tersedia
      </h1>
    </div>
  </div>

  <!-- Dialog Table -->
  <div v-if="dialogKBN.detail" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/60">
    <div class="relative w-[95vw] max-w-[98vw] max-h-[95vh]
            bg-[#fafafb] rounded-2xl shadow-xl
            flex flex-col">
      <div class="flex-1 p-4 space-y-6 items-center justify-center">
        <div class="px-6 py-4 border-gray-700 flex items-center justify-end">
          <button @click="[(dialogKBN.detail = false), (view = false)]"
            class="text-gray-400 hover:text-red-400 transition">
            ✕
          </button>
        </div>

        <div class="flex gap-5 w-full justify-center mt-2">
          <div class="bg-white min-w-1/6 shadow rounded-lg p-5">
            <div class="flex gap-2 items-center text-gray-500 font-semibold text-xl mb-2">
              <span class="rounded-full bg-blue-100 p-2">
                <svg class="w-5 h-5 text-blue-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                  height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 14v7M5 4.971v9.541c5.6-5.538 8.4 2.64 14-.086v-9.54C13.4 7.61 10.6-.568 5 4.97Z" />
                </svg>
              </span>
              LINE
            </div>
            <h1 class="text-blue-400 font-semibold text-2xl text-center">{{ line_id }}</h1>
          </div>

          <div class="bg-white min-w-1/6 shadow rounded-lg p-5">
            <div class="flex gap-2 items-center text-gray-500 font-semibold text-xl mb-2">
              <span class="rounded-full bg-blue-100 p-2">
                <svg class="w-5 h-5 text-blue-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                  height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667" />
                </svg>

              </span>
              Total LKH
            </div>
            <h1 class="text-blue-400 font-semibold text-2xl text-center">
              {{ grandTotalLKH }}
            </h1>
          </div>

          <div class="bg-white min-w-1/6 shadow rounded-lg p-5">
            <div class="flex gap-2 items-center text-gray-500 font-semibold text-xl mb-2">
              <span class="rounded-full bg-blue-100 p-2">
                <svg class="w-5 h-5 text-blue-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                  height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667" />
                </svg>
              </span>
              Total SAP
            </div>
            <h1 class="text-blue-400 font-semibold text-2xl text-center">
              {{ grandTotalSAP }}
            </h1>
          </div>

          <div class="bg-white min-w-1/6 shadow rounded-lg p-5">
            <div class="flex gap-2 items-center text-gray-500 font-semibold text-xl mb-2">
              <span class="rounded-full bg-blue-100 p-2">
                <svg class="w-5 h-5 text-blue-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                  height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667" />
                </svg>
              </span>
              Achievement
            </div>
            <h1 class="text-blue-400 font-semibold text-2xl text-center">
              {{ formatPercentOneZero(achievementPercentage) }} %
            </h1>
          </div>
        </div>

        <div class="p-4 md:p-5">
          <div
            class="relative overflow-auto lg:max-w-[1100px] 2xl:max-w-[1730px] lg:max-h-[450px] 2xl:max-h-[650px] sm:rounded-lg">
            <table class="min-w-max text-sm text-center text-gray-200 border-collapse">
              <thead class="sticky top-0 z-20 bg-gray-50 text-gray-700 text-xs uppercase">
                <tr>
                  <th scope="col" rowspan="4" class="px-6 py-3 border-new">
                    No
                  </th>
                  <th scope="col" colspan="2" rowspan="3" class="px-6 py-3 border-new text-gray-700">
                    Patan
                  </th>
                  <th scope="col" colspan="2" rowspan="3" class="px-6 py-3 bg-cyan-50 border-new text-gray-600">
                    Part Number
                  </th>
                  <th scope="col" colspan="4" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    Lot Size
                  </th>
                  <th scope="col" colspan="6" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    LKH
                  </th>
                  <th scope="col" colspan="6" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    SAP
                  </th>
                  <th scope="col" colspan="2" rowspan="2" class="px-6 py-3 border-new bg-green-50 text-gray-600">
                    GAP LKH vs SCAN
                  </th>
                  <th scope="col" colspan="4" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    Reject
                  </th>
                  <th scope="col" colspan="2" rowspan="3" class="px-6 py-3 border-new">
                    Problem Scan
                  </th>
                </tr>
                <tr>
                  <th scope="col" colspan="2" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    Shift 1
                  </th>
                  <th scope="col" colspan="2" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    Shift 2
                  </th>
                  <th scope="col" colspan="3" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    Shift 1
                  </th>
                  <th scope="col" colspan="3" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    Shift 2
                  </th>
                  <th scope="col" colspan="3" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    Shift 1
                  </th>
                  <th scope="col" colspan="3" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    Shift 2
                  </th>
                  <th scope="col" colspan="2" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    Shift 1
                  </th>
                  <th scope="col" colspan="2" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    Shift 2
                  </th>
                </tr>
                <tr>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    Total
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    Total
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    Total
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    Total
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50 text-gray-600">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    LH
                  </th>
                </tr>
                <tr>
                  <th scope="col" class="px-6 py-3 border-new">
                    Shift 1
                  </th>
                  <th scope="col" class="px-6 py-3 border-new">
                    Shift 2
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-cyan-50 text-gray-600">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-cyan-50 text-gray-600">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-blue-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50 text-gray-600">
                    (PCS)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new">
                    Shift 1
                  </th>
                  <th scope="col" class="px-6 py-3 border-new">
                    Shift 2
                  </th>
                </tr>
              </thead>

              <tbody class="text-gray-700 text-xs uppercase font-medium">
                <template v-for="dIndex in formDetail.part_rh.length" :key="`data-process-${dIndex}`">
                  <tr v-if="formDetail.part_rh[dIndex - 1] || formDetail.part_lh[dIndex - 1]">
                    <td class="px-6 py-4 border-new">
                      {{ dIndex }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{
                        formDetail.additional_shift1?.[dIndex - 1] == 1
                          ? "Add"
                          : formDetail.additional_shift1?.[dIndex - 1] == 2
                            ? "LJ"
                            : formDetail.additional_shift1?.[dIndex - 1] == 3
                              ? "TP"
                              : formDetail.patan_shift1?.[dIndex - 1]
                      }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{
                        formDetail.additional_shift2?.[dIndex - 1] == 1
                          ? "Add"
                          : formDetail.additional_shift2?.[dIndex - 1] == 2
                            ? "LJ"
                            : formDetail.additional_shift2?.[dIndex - 1] == 3
                              ? "TP"
                              : formDetail.patan_shift2?.[dIndex - 1]
                      }}
                    </td>
                    <td class="px-6 py-4 border-new bg-cyan-50 text-gray-700">
                      {{ formDetail.part_rh[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-cyan-50 text-gray-700">
                      {{ formDetail.part_lh[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-red-50 text-gray-700">
                      {{ formDetail.lotsize_rh_shift1[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-red-50 text-gray-700">
                      {{ formDetail.lotsize_lh_shift1[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-red-50 text-gray-700">
                      {{ formDetail.lotsize_rh_shift2[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-red-50 text-gray-700">
                      {{ formDetail.lotsize_lh_shift2[dIndex - 1] }}
                    </td>

                    <td class="px-6 py-4 border-new bg-blue-50 text-gray-700">
                      {{ formDetail.total_prod_rh_shift1[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-blue-50 text-gray-700">
                      {{ formDetail.total_prod_lh_shift1[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-blue-50 text-gray-700">
                      {{
                        parseInt(String(formDetail.total_prod_rh_shift1[dIndex - 1] || 0)) +
                          parseInt(String(formDetail.total_prod_lh_shift1[dIndex - 1] || 0)) !== 0
                          ? parseInt(String(formDetail.total_prod_rh_shift1[dIndex - 1] || 0)) +
                          parseInt(String(formDetail.total_prod_lh_shift1[dIndex - 1] || 0))
                          : ""
                      }}
                    </td>

                    <td class="px-6 py-4 border-new bg-blue-50 text-gray-700">
                      {{ formDetail.total_prod_rh_shift2[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-blue-50 text-gray-700">
                      {{
                        formDetail.total_prod_lh_shift2[dIndex - 1] == 0
                          ? ""
                          : formDetail.total_prod_lh_shift2[dIndex - 1]
                      }}
                    </td>
                    <td class="px-6 py-4 border-new bg-blue-50 text-gray-700">
                      {{
                        parseInt(String(formDetail.total_prod_rh_shift2[dIndex - 1] || 0)) +
                          parseInt(String(formDetail.total_prod_lh_shift2[dIndex - 1] || 0)) !== 0
                          ? parseInt(String(formDetail.total_prod_rh_shift2[dIndex - 1] || 0)) +
                          parseInt(String(formDetail.total_prod_lh_shift2[dIndex - 1] || 0))
                          : ""
                      }}
                    </td>

                    <td class="px-6 py-4 border-new bg-yellow-50 text-gray-700" :class="setComparisonColor(
                      formDetail.SAP_RH_SHIFT1[dIndex - 1],
                      formDetail.total_prod_rh_shift1[dIndex - 1]
                    )">
                      {{ formDetail.SAP_RH_SHIFT1[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-yellow-50 text-gray-700" :class="setComparisonColor(
                      formDetail.SAP_LH_SHIFT1[dIndex - 1],
                      formDetail.total_prod_lh_shift1[dIndex - 1]
                    )">
                      {{ formDetail.SAP_LH_SHIFT1[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-yellow-50 text-gray-700">
                      {{
                        parseInt(String(formDetail.SAP_RH_SHIFT1[dIndex - 1] || 0)) +
                          parseInt(String(formDetail.SAP_LH_SHIFT1[dIndex - 1] || 0)) !== 0
                          ? parseInt(String(formDetail.SAP_RH_SHIFT1[dIndex - 1] || 0)) +
                          parseInt(String(formDetail.SAP_LH_SHIFT1[dIndex - 1] || 0))
                          : ""
                      }}
                    </td>

                    <td class="px-6 py-4 border-new bg-yellow-50 text-gray-700" :class="setComparisonColor(
                      formDetail.SAP_RH_SHIFT2[dIndex - 1],
                      formDetail.total_prod_rh_shift2[dIndex - 1]
                    )">
                      {{ formDetail.SAP_RH_SHIFT2[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-yellow-50 text-gray-700" :class="setComparisonColor(
                      formDetail.SAP_LH_SHIFT2[dIndex - 1],
                      formDetail.total_prod_lh_shift2[dIndex - 1]
                    )">
                      {{ formDetail.SAP_LH_SHIFT2[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-yellow-50 text-gray-700">
                      {{
                        parseInt(String(formDetail.SAP_RH_SHIFT2[dIndex - 1] || 0)) +
                          parseInt(String(formDetail.SAP_LH_SHIFT2[dIndex - 1] || 0)) !== 0
                          ? parseInt(String(formDetail.SAP_RH_SHIFT2[dIndex - 1] || 0)) +
                          parseInt(String(formDetail.SAP_LH_SHIFT2[dIndex - 1] || 0))
                          : ""
                      }}
                    </td>

                    <td class="px-6 py-4 border-new bg-green-50 text-gray-700"
                      :class="setComparisonGapColor(formDetail.gap_rh[dIndex - 1])">
                      {{ formDetail.gap_rh[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-green-50 text-gray-700"
                      :class="setComparisonGapColor(formDetail.gap_lh[dIndex - 1])">
                      {{ formDetail.gap_lh[dIndex - 1] }}
                    </td>

                    <td class="px-6 py-4 border-new bg-purple-50 text-gray-700">
                      {{ formDetail.total_reject_rh_shift1[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-purple-50 text-gray-700">
                      {{ formDetail.total_reject_lh_shift1[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-purple-50 text-gray-700">
                      {{ formDetail.total_reject_rh_shift2[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new bg-purple-50 text-gray-700">
                      {{ formDetail.total_reject_lh_shift2[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{ formDetail.keterangan_sap_shift1[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{ formDetail.keterangan_sap_shift2[dIndex - 1] }}
                    </td>
                  </tr>
                </template>
              </tbody>

              <tfoot>
                <tr>
                  <th class="px-6 py-4 border-new text-gray-700" :colspan="5">TOTAL</th>

                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.lotsize_rh_1 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.lotsize_lh_1 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.lotsize_rh_2 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.lotsize_lh_2 || 0 }}
                  </th>

                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.prod_rh_1 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.prod_lh_1 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ (footerTotals.prod_rh_1 || 0) + (footerTotals.prod_lh_1 || 0) }}
                  </th>

                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.prod_rh_2 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.prod_lh_2 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ (footerTotals.prod_rh_2 || 0) + (footerTotals.prod_lh_2 || 0) }}
                  </th>

                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.sap_rh_1 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.sap_lh_1 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ (footerTotals.sap_rh_1 || 0) + (footerTotals.sap_lh_1 || 0) }}
                  </th>

                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.sap_rh_2 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.sap_lh_2 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ (footerTotals.sap_rh_2 || 0) + (footerTotals.sap_lh_2 || 0) }}
                  </th>

                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.gap_rh || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.gap_lh || 0 }}
                  </th>

                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.reject_rh_1 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.reject_lh_1 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.reject_rh_2 || 0 }}
                  </th>
                  <th class="px-6 py-4 border-new text-gray-700">
                    {{ footerTotals.reject_lh_2 || 0 }}
                  </th>

                  <th class="px-6 py-4 border-new"></th>
                  <th class="px-6 py-4 border-new"></th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>

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
  margin: .5px;
}

.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}
</style>