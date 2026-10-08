<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from 'apexcharts';
import { storeToRefs } from 'pinia';
import { useUtilityStore } from '@/stores/utility';
import { useLogsPalletStore } from '@/stores/Logistik/Pallet/LogsPallet';
import { useCombineStore } from '@/stores/Logistik/MasterData/CombinePallet';
import type { LogDateParams } from '@/types/Logistik/Pallet/logsPallet';
import type { PalletItem } from '@/types/Logistik/MasterData/CombinePallet';
import 'flowbite';
import { initFlowbite } from 'flowbite';
import { useNotificationStore } from "@/stores/notification";
import * as XLSX from 'xlsx';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';


const page        = ref({ title: 'Resume Pallet' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'Report',   disabled: false, href: '#' },
  { title: 'RFID Pallet', disabled: true, href: '#' },
]);

const notificationStore = useNotificationStore();
const utilityStore    = useUtilityStore();
const logsPalletStore = useLogsPalletStore();
const combineStore = useCombineStore();
const { logs } = storeToRefs(logsPalletStore);
const { dataTable, combineDriverData } = storeToRefs(combineStore);

const today = new Date();
const formatDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
const sevenDaysAgo = new Date(today);
sevenDaysAgo.setDate(today.getDate() - 6);

const params = ref<LogDateParams & { customer: string }>({
  start_date : formatDate(sevenDaysAgo),
  end_date   : formatDate(today),
  customer   : 'all',
});

const rangeDate = computed<string[]>(() => {
  const dates: string[] = [];
  const start = new Date(params.value.start_date);
  const end   = new Date(params.value.end_date);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(new Date(d)));
  }
  return dates;
});

const validateDateRange = (): boolean => {
  const start = new Date(params.value.start_date);
  const end = new Date(params.value.end_date);

  if (end < start) {
  notificationStore.showAlertError("Pilih rentang tanggal yang sesuai!");
    return false;
  }

  return true;
};

interface DaySummary { date: string; in: number; out: number; accumIn: number; accumOut:number; pctAccum: number;}

const summary = computed<DaySummary[]>(() => {
  let accumIn  = 0;
  let accumOut = 0;

  return rangeDate.value.map((date) => {
    const dayLogs = logs.value.filter((l) => {
      const matchCustomer = params.value.customer === 'all' || resolveLabel(l.id_label) === params.value.customer;
      return l.created_at.startsWith(date) && matchCustomer;
    });
    const inCount  = dayLogs.filter((l) => l.status === 'IN').length;
    const outCount = dayLogs.filter((l) => l.status === 'OUT').length;
    accumIn += inCount;
    accumOut += outCount;
    const total = accumIn + accumOut;
    const pctAccum   = total > 0 ? Math.round((accumIn / total) * 100) : 0;
    return { date, in: inCount, out: outCount, accumIn, accumOut, pctAccum};
  });
});

const chartSeries = computed(() => [
  {
    name: 'IN',
    type: 'bar',
    data: summary.value.map((s) => s.in),
  },
  {
    name: 'OUT',
    type: 'bar',
    data: summary.value.map((s) => s.out),
  },
  // {
  //   name: 'Akum Total IN',
  //   type: 'line',
  //   data: summary.value.map((s) => s.accumIn),
  // },
  // {
  //   name: 'Akum Total OUT',
  //   type: 'line',
  //   data: summary.value.map((s) => s.accumOut),
  // },
]);

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type    : 'line',
    height  : 400,
    toolbar : { show: true },
    zoom    : { enabled: false },
  },
  stroke: {
    // width : [0, 0, 3, 3],
    width: [0, 0],
    curve : 'smooth',
  },
  plotOptions: {
    bar: { columnWidth: '50%', borderRadius: 4, dataLabels: {position: 'top',} },
  },
  colors: ['#03A86E', '#D60000', '#03A86E', '#D60000'],
  fill: {
    // opacity: [1, 1, 0.8, 0.8],
    opacity: [1, 1],
  },
  markers: {
    // size: [0, 0, 4, 4],
    size: [0, 0],
  },
  dataLabels: {
    enabled: true,  
    offsetY: -5,    
    style: {
      fontSize: '11px',
      fontWeight: 'bold',
      colors: ['#03A86E', '#D60000'] 
    },
    formatter: function(val: number) {
      return val > 0 ? val : ''; 
    }
  },
  xaxis: {
    categories : rangeDate.value.map((d) => utilityStore.dateMonth(d)),
    labels     : { style: { fontSize: '12px' } },
  },
  yaxis: [
    {
      seriesName    : 'IN',
      title         : { text: 'Jumlah Pallet' },
      min           : 0,
      forceNiceScale: true,
      labels        : { formatter: (v: number) => Math.round(v).toString() },
    },
    {
      seriesName : 'IN',
      show       : false,
    },
  ],
  legend: {
    position       : 'top',
    horizontalAlign: 'left',
  },
  tooltip: {
    shared     : true,
    intersect  : false,
    y: [
      { formatter: (v: number) => `${v} pallet` },
      { formatter: (v: number) => `${v} pallet` },
    ],
  },
  title: {
    text  : computed(() =>
      `Resume Pallet — ${params.value.customer === 'all' ? 'Semua Customer' : params.value.customer}`
    ).value,
    align : 'left',
    style : { fontSize: '14px', fontWeight: '600', color: '#374151' },
  },
}));

const isWarning = (updatedAt: string): boolean => {
  if (!updatedAt) return false;
  const diffMs = Math.abs(new Date().getTime() - new Date(updatedAt).getTime());
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) > 2;
};

const warningPallets = computed(() => {
  return combineDriverData.value.filter((p) => {
    const matchCustomer = params.value.customer === 'all' || resolveLabel(p.id_label) === params.value.customer;
    return matchCustomer && isWarning(p.log_updated_at);
  });
});

const totalWarning = computed(() => warningPallets.value.length);

// Destination di-resolve di sini supaya bisa ikut difilter/sort di TableExcel
const warningRows = computed(() =>
  warningPallets.value.map((p) => ({ ...p, destination: resolveLabel(p.id_label) }))
);

const warningColumns: TableColumn[] = [
  { key: 'no_rfid', label: 'ID RFID' },
  { key: 'no_pallet', label: 'No Pallet' },
  { key: 'type', label: 'Type' },
  { key: 'destination', label: 'Destination', align: 'center' },
  { key: 'nik', label: 'NIK' },
  { key: 'nama_driver', label: 'Nama Driver' },
  { key: 'nama_lp', label: 'Nama LP' },
  { key: 'no_polisi', label: 'No Polisi' },
  { key: 'log_updated_at', label: 'Tgl OUT', align: 'center' }
];

const warningTableRef = ref<{ filteredData: Record<string, unknown>[] } | null>(null);

const ncPallets = computed(() => {
  return dataTable.value.filter((p) => {
    const matchCustomer =
      params.value.customer === 'all' || p.customer === params.value.customer;

    return p.is_active === '2' && matchCustomer;
  });
});

const totalNC = computed(() => ncPallets.value.length);

const ngPallets = computed(() => {
  return dataTable.value.filter((p) => {
    const matchCustomer =
      params.value.customer === 'all' || p.customer === params.value.customer;

    return p.is_active === '0' && matchCustomer;
  });
});

const totalNG = computed(() => ngPallets.value.length);

const inPallets = computed(() =>
  logs.value.filter((l) => {
    const matchCustomer = params.value.customer === 'all' || resolveLabel(l.id_label) === params.value.customer;
    return l.status === 'IN' && matchCustomer;
  })
);

const outPallets = computed(() =>
  logs.value.filter((l) => {
    const matchCustomer = params.value.customer === 'all' || resolveLabel(l.id_label) === params.value.customer;
    return l.status === 'OUT' && matchCustomer;
  })
);

// Modal
const showINModal = ref(false);
const showOUTModal = ref(false);
const showWarningModal = ref(false);
const showNCModal = ref(false);
const showNGModal = ref(false);
const fetchData = async () => {
  if (!validateDateRange()) return;
  const payload: LogDateParams = {
    start_date : params.value.start_date,
    end_date   : params.value.end_date,
  };
  await Promise.all([
    logsPalletStore.getLogsByDate(payload),
    combineStore.fetchMasterPallet(),
    combineStore.fetchCombineDriver(),
  ]);
};

onMounted(async () => {
  initFlowbite();
  await fetchData();
});

// Replikasi perilaku lama: begitu start & end tanggal lengkap (dari klik kalender),
// otomatis fetch ulang data tanpa perlu tombol terpisah.
watch(
  () => [params.value.start_date, params.value.end_date],
  ([start, end]) => {
    if (start && end) {
      fetchData();
    }
  }
);

const downloadWarningExcel = () => {
  import('xlsx').then((XLSX) => {
    // Ikuti filter/sort kolom yang sedang aktif di tabel
    const source = (warningTableRef.value?.filteredData ?? warningRows.value) as typeof warningRows.value;
    const rows = source.map((p, i) => ({
      'No'          : i + 1,
      'ID RFID'     : p.no_rfid,
      'No Pallet'   : p.no_pallet,
      'Type'        : p.type,
      'Customer'    : p.customer,
      'Category'    : p.category || '-',
      'NIK'         : p.nik || '-',
      'Nama Driver' : p.nama_driver || '-',
      'Nama LP'     : p.nama_lp || '-',
      'No Polisi'   : p.no_polisi || '-',
      'Tgl OUT'     : p.log_updated_at || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto column width
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r]).length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pallet Tidak Kembali');

    const filename = `Pallet_Belum_Kembali_Dari_Customer_${formatDate(new Date())}.xlsx`;

    XLSX.writeFile(wb, filename);
  });
};

const palletLookup = computed(() => {
  const map = new Map<string, { no_pallet: string; type: string }>();
  combineDriverData.value.forEach(p => {
    if (p.no_rfid) map.set(p.no_rfid, { no_pallet: p.no_pallet, type: p.type });
  });
  return map;
});

const changeCustomer = () => fetchData();
const CUSTOMER_OPTIONS = ['ADM KAP', 'ADM SAP', 'MMKI', 'MKM', 'TMMIN', 'HMMI'] as const;

const resolveLabel = (id_label: string | null | undefined): string => {
  if (!id_label) return '-';
  const val = id_label.trim();
  if (!val) return '-';
  if (val.includes('MAJMKM')) return 'MKM';
  if (val.includes('HAXQ'))   return 'HMMI';
  if (val.includes('KBN'))    return 'TMMIN';
  if (val.includes('DN5'))    return 'ADM KAP';
  if (val.includes('DN4'))    return 'ADM SAP';
  if (/^\d+$/.test(val))      return 'MMKI';
  return val;
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex flex-col gap-5">

    <div class="flex gap-6 flex-wrap items-center">

      <!-- Date Range -->
      <div class="flex">
        <DateRangePickerSplitButton
          v-model:start="params.start_date"
          v-model:end="params.end_date"
        />
      </div>

      <!-- Customer select -->
      <select
        v-model="params.customer"
        @change="changeCustomer"
        class="w-3xs bg-gray-50 border-custom border-gray-300 text-black-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block px-5 py-2.5"
      >
        <option value="all">Semua Customer</option>
        <option v-for="c in CUSTOMER_OPTIONS" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <!-- Cards -->
    <div class="flex flex-col lg:flex-row gap-4">

      <!-- Total IN -->
      <div class="w-full lg:w-1/5">
        <div
          class="bg-white rounded-2xl shadow p-5 w-full flex items-center gap-4 border-l-4 border-[#03A86E] cursor-pointer hover:shadow-md transition-shadow"
          @click="showINModal = true"
        >
          <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-[#E1F5EE] flex items-center justify-center">
            <svg class="w-5 h-5 text-[#0F6E56]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11.613a2 2 0 0 0 1.346-.52l4.4-4a2 2 0 0 0 0-2.96l-4.4-4A2 2 0 0 0 15.613 6H4Z"/>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-black-800 uppercase tracking-wide mb-0.5">Total Pallet IN</p>
            <div class="flex items-end justify-between">
              <p class="text-2xl font-semibold text-[#0F6E56] leading-none">
                {{ summary[summary.length - 1]?.accumIn ?? 0 }}
              </p>
              <span class="text-xs text-[#0F6E56] font-medium bg-[#E1F5EE] px-2 py-0.5 rounded-full border border-[#03A86E]/30"> Detail → </span>
            </div>
            <p class="text-xs text-black-800 mt-1">pallet masuk MAJ</p>
          </div>
        </div>
      </div>

      <!-- Total OUT -->
      <div class="w-full lg:w-1/5">
        <div
          class="bg-white rounded-2xl shadow p-5 w-full flex items-center gap-4 border-l-4 border-[#D60000] cursor-pointer hover:shadow-md transition-shadow"
          @click="showOUTModal = true"
        >
          <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-[#FCEBEB] flex items-center justify-center">
            <svg class="w-5 h-5 text-[#A32D2D]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11.613a2 2 0 0 0 1.346-.52l4.4-4a2 2 0 0 0 0-2.96l-4.4-4A2 2 0 0 0 15.613 6H4Z"/>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-black-800 uppercase tracking-wide mb-0.5">Total Pallet OUT</p>
            <div class="flex items-end justify-between">
              <p class="text-2xl font-semibold text-[#A32D2D] leading-none">
                {{ summary[summary.length - 1]?.accumOut ?? 0 }}
              </p>
              <span class="text-xs text-[#A32D2D] font-medium bg-[#FCEBEB] px-2 py-0.5 rounded-full border border-[#D60000]/30"> Detail → </span>
            </div>
            <p class="text-xs text-black-800 mt-1">pallet keluar MAJ</p>
          </div>
        </div>
      </div>

    <div class="w-full lg:w-1/5">
      <div
        class="bg-white rounded-2xl shadow p-5 w-full flex items-center gap-4 border-l-4 border-amber-500 cursor-pointer hover:shadow-md transition-shadow"
        @click="showNCModal = true"
      >
        <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-yellow-50 flex items-center justify-center">
          <span class="font-bold text-yellow-600">NC</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-black-400 uppercase tracking-wide mb-0.5">Pallet NC</p>
          <div class="flex items-end justify-between">
            <p class="text-2xl font-semibold text-amber-600 leading-none">{{ totalNC }}</p>
            <span class="text-xs text-amber-500 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"> Detail → </span>
          </div>
          <p class="text-xs text-black-400 mt-1">pallet NC</p>
        </div>
      </div>
    </div>

    <!-- Pallet NG -->
    <div class="w-full lg:w-1/5">
      <div
        class="bg-white rounded-2xl shadow p-5 w-full flex items-center gap-4 border-l-4 border-red-500 cursor-pointer hover:shadow-md transition-shadow"
        @click="showNGModal = true"
      >
        <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
          <span class="font-bold text-red-600">NG</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-black-400 uppercase tracking-wide mb-0.5">Pallet NG</p>
          <div class="flex items-end justify-between">
            <p class="text-2xl font-semibold text-red-600 leading-none">{{ totalNG }}</p>
            <span class="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full border border-red-200"> Detail → </span>
          </div>
          <p class="text-xs text-black-400 mt-1">pallet NG</p>
        </div>
      </div>
    </div>    

    <!-- Pallet tidak kembali -->
    <div class="w-full lg:w-1/5">
      <div
        class="bg-white rounded-2xl shadow p-5 w-full flex items-center gap-4 border-l-4 border-amber-500 cursor-pointer hover:shadow-md transition-shadow"
        @click="showWarningModal = true"
      >
        <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
          <svg class="w-5 h-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-black-400 uppercase tracking-wide mb-0.5">Pallet di Customer</p>
          <div class="flex items-end justify-between">
            <p class="text-2xl font-semibold text-amber-600 leading-none">{{ totalWarning }}</p>
            <span class="text-xs text-amber-500 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"> Detail → </span>
          </div>
          <p class="text-xs text-black-400 mt-1">pallet &gt; 2 hari di customer</p>
        </div>
      </div>
    </div>
    
    </div>  
    <!-- ── Chart + Table ──────────────────────────────────────── -->
    <div class="flex flex-col xl:flex-row gap-6">
      <!-- Chart -->
      <div class="flex-1 bg-white rounded-2xl shadow p-5">
        <VueApexCharts
          type="line"
          height="420"
          :options="chartOptions"
          :series="chartSeries"
        />
      </div>

      <!-- Summary table -->
      <div class="bg-white rounded-2xl shadow p-5 overflow-x-auto">
        <h2 class="text-sm font-semibold text-black-600 mb-4">Data Pallet Per Tanggal</h2>
        <table class="w-full text-sm text-center text-black-500 border-collapse">
          <thead class="text-xs text-black-700 uppercase bg-gray-50">
            <tr>
              <th class="px-3 py-3 text-left">Status</th>
              <th
                v-for="date in rangeDate"
                :key="date"
                class="px-4 py-3 whitespace-nowrap"
              >
                {{ utilityStore.dateMonth(date) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- IN -->
            <tr class="border-b border-gray-100 odd:bg-white even:bg-gray-50">
              <th class="flex items-center gap-2 px-3 py-3 font-medium text-black-900 whitespace-nowrap text-xs">
                <svg class="w-4 h-4 text-[#03A86E]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11.613a2 2 0 0 0 1.346-.52l4.4-4a2 2 0 0 0 0-2.96l-4.4-4A2 2 0 0 0 15.613 6H4Z"/>
                </svg>
                IN
              </th>
              <td v-for="s in summary" :key="s.date + '-in'" class="px-4 py-3 font-medium text-[#03A86E]">
                {{ s.in }}
              </td>
            </tr>
            <!-- OUT -->
            <tr class="border-b border-gray-100 odd:bg-white even:bg-gray-50">
              <th class="flex items-center gap-2 px-3 py-3 font-medium text-black-900 whitespace-nowrap text-xs">
                <svg class="w-4 h-4 text-[#D60000]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11.613a2 2 0 0 0 1.346-.52l4.4-4a2 2 0 0 0 0-2.96l-4.4-4A2 2 0 0 0 15.613 6H4Z"/>
                </svg>
                OUT
              </th>
              <td v-for="s in summary" :key="s.date + '-out'" class="px-4 py-3 font-medium text-[#D60000]">
                {{ s.out }}
              </td>
            </tr>
                <!-- Akumulasi IN -->
            <tr class="border-b border-gray-100 odd:bg-white even:bg-gray-50">
              <th class="flex items-center gap-2 px-3 py-3 font-medium text-black-900 whitespace-nowrap text-xs">
                <svg class="w-4 h-4 text-[#03A86E]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11.613a2 2 0 0 0 1.346-.52l4.4-4a2 2 0 0 0 0-2.96l-4.4-4A2 2 0 0 0 15.613 6H4Z"/>
                </svg>
                Akum IN
              </th>
              <td v-for="s in summary" :key="s.date + '-accumIn'" class="px-4 py-3 font-semibold text-[#03A86E]">
                {{ s.accumIn }}
              </td>
            </tr>
            <!-- Akumulasi OUT -->
            <tr class="border-b border-gray-100 odd:bg-white even:bg-gray-50">
              <th class="flex items-center gap-2 px-3 py-3 font-medium text-black-900 whitespace-nowrap text-xs">
                <svg class="w-4 h-4 text-[#D60000]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11.613a2 2 0 0 0 1.346-.52l4.4-4a2 2 0 0 0 0-2.96l-4.4-4A2 2 0 0 0 15.613 6H4Z"/>
                </svg>
                Akum OUT
              </th>
              <td v-for="s in summary" :key="s.date + '-accumOut'" class="px-4 py-3 font-semibold text-[#D60000]">
                {{ s.accumOut }}
              </td>
            </tr>
            <!-- Rasio -->
            <tr class="odd:bg-white even:bg-gray-50">
              <th class="flex items-center gap-2 px-3 py-3 font-medium text-black-900 whitespace-nowrap text-xs">
                <svg class="w-4 h-4 text-[#1E88E5]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm10-8a8 8 0 1 0 0 16A8 8 0 0 0 12 4Z" clip-rule="evenodd"/>
                </svg>
                Persentase
              </th>
              <td v-for="s in summary" :key="s.date + '-ratio'" class="px-4 py-3 font-semibold text-[#1E88E5]">
                {{ s.pctAccum }}%
              </td>
            </tr>  
          </tbody>
        </table>
      </div>
    </div>
    <!-- Modal IN -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showINModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background: rgba(0,0,0,0.45);"
          @click.self="showINModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-[#E1F5EE] flex items-center justify-center">
                  <svg class="w-5 h-5 text-[#0F6E56]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11.613a2 2 0 0 0 1.346-.52l4.4-4a2 2 0 0 0 0-2.96l-4.4-4A2 2 0 0 0 15.613 6H4Z"/>
                  </svg>
                </div>
                <h3 class="text-sm font-semibold text-black-800">Detail Pallet IN</h3>
                <span class="px-3 py-1 text-xs font-semibold bg-[#E1F5EE] text-[#0F6E56] rounded-full border border-[#03A86E]/30">
                  {{ inPallets.length }} pallet
                </span>
              </div>
              <button
                @click="showINModal = false"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-black-400 hover:text-black-600 hover:bg-gray-100 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-black-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>
              </svg>
              <span class="text-xs text-black-500">
                Customer: <span class="font-semibold text-black-700">{{ params.customer === 'all' ? 'Semua Customer' : params.customer }}</span>
              </span>
            </div>
            <div class="overflow-y-auto max-h-[440px]">
              <table class="w-full text-sm text-left text-black-600">
                <thead class="text-xs text-black-500 uppercase bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                  <tr>
                    <th class="px-4 py-3 w-10">No</th>
                    <th class="px-4 py-3">ID RFID</th>
                    <th class="px-4 py-3">No Pallet</th>
                    <th class="px-4 py-3">Type</th>
                    <th class="px-4 py-3 text-center">Last Destination</th>
                    <th class="px-4 py-3 text-center">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(log, index) in inPallets"
                    :key="log.id"
                    class="border-b border-gray-50 odd:bg-white even:bg-gray-50 hover:bg-[#E1F5EE]/50 transition-colors"
                  >
                    <td class="px-4 py-3 text-black-400 text-xs">{{ index + 1 }}</td>
                    <td class="px-4 py-3 font-medium text-black-800 text-xs break-all">{{ log.no_rfid }}</td>
                    <td class="px-4 py-3 font-medium text-black-800 text-xs break-all">{{ log.no_pallet }}</td>
                    <td class="px-4 py-3 text-xs text-black-600">{{ log.type }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {{ resolveLabel(log.id_label) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="text-xs font-medium text-[#0F6E56] bg-[#E1F5EE] px-2.5 py-1 rounded-full border border-[#03A86E]/30">
                        {{ log.created_at }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="inPallets.length === 0">
                    <td colspan="6" class="px-4 py-10 text-center text-black-400 text-sm">Tidak ada data pallet IN</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                @click="showINModal = false"
                class="px-4 py-2 text-sm font-medium text-black-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal OUT -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showOUTModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background: rgba(0,0,0,0.45);"
          @click.self="showOUTModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-[#FCEBEB] flex items-center justify-center">
                  <svg class="w-5 h-5 text-[#A32D2D]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11.613a2 2 0 0 0 1.346-.52l4.4-4a2 2 0 0 0 0-2.96l-4.4-4A2 2 0 0 0 15.613 6H4Z"/>
                  </svg>
                </div>
                <h3 class="text-sm font-semibold text-black-800">Detail Pallet OUT</h3>
                <span class="px-3 py-1 text-xs font-semibold bg-[#FCEBEB] text-[#A32D2D] rounded-full border border-[#D60000]/30">
                  {{ outPallets.length }} pallet
                </span>
              </div>
              <button
                @click="showOUTModal = false"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-black-400 hover:text-black-600 hover:bg-gray-100 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-black-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>
              </svg>
              <span class="text-xs text-black-500">
                Customer: <span class="font-semibold text-black-700">{{ params.customer === 'all' ? 'Semua Customer' : params.customer }}</span>
              </span>
            </div>
            <div class="overflow-y-auto max-h-[440px]">
              <table class="w-full text-sm text-left text-black-600">
                <thead class="text-xs text-black-500 uppercase bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                  <tr>
                    <th class="px-4 py-3 w-10">No</th>
                    <th class="px-4 py-3">ID RFID</th>
                    <th class="px-4 py-3">No Pallet</th>
                    <th class="px-4 py-3">Type</th>
                    <th class="px-4 py-3 text-center">Destination</th>
                    <th class="px-4 py-3 text-center">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(log, index) in outPallets"
                    :key="log.id"
                    class="border-b border-gray-50 odd:bg-white even:bg-gray-50 hover:bg-[#FCEBEB]/50 transition-colors"
                  >
                    <td class="px-4 py-3 text-black-400 text-xs">{{ index + 1 }}</td>
                    <td class="px-4 py-3 font-medium text-black-800 text-xs break-all">{{ log.no_rfid }}</td>
                    <td class="px-4 py-3 font-medium text-black-800 text-xs break-all">{{ log.no_pallet }}</td>
                    <td class="px-4 py-3 text-xs text-black-600">{{ log.type }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {{ resolveLabel(log.id_label) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="text-xs font-medium text-[#A32D2D] bg-[#FCEBEB] px-2.5 py-1 rounded-full border border-[#D60000]/30">
                        {{ log.created_at }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="outPallets.length === 0">
                    <td colspan="6" class="px-4 py-10 text-center text-black-400 text-sm">Tidak ada data pallet OUT</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                @click="showOUTModal = false"
                class="px-4 py-2 text-sm font-medium text-black-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal Warning -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showWarningModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background: rgba(0,0,0,0.45);"
          @click.self="showWarningModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">

            <!-- Modal Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <svg class="w-5 h-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-black-800">Pallet di Customer</h3>
                  <p class="text-xs text-black-400">Tidak ada pallet belum kembali lebih dari 2 hari</p>
                </div>
                <span class="ml-2 px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                  {{ totalWarning }} pallet
                </span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Tombol Download Excel -->
                <button
                  @click="downloadWarningExcel"
                  :disabled="warningPallets.length === 0"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Download Excel"
                >
                  <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M12 2a1 1 0 0 1 1 1v9.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L11 12.586V3a1 1 0 0 1 1-1ZM4 17a1 1 0 0 1 1 1v1h14v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1Z" clip-rule="evenodd"/>
                  </svg>
                  Download Excel
                </button>

                <!-- Tombol Close -->
                <button
                  @click="showWarningModal = false"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-black-400 hover:text-black-600 hover:bg-gray-100 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Modal Filter Info -->
            <div class="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-black-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>
              </svg>
              <span class="text-xs text-black-500">
                Customer: <span class="font-semibold text-black-700">{{ params.customer === 'all' ? 'Semua Customer' : params.customer }}</span>
              </span>
            </div>

            <!-- Modal Table -->
            <div class="overflow-y-auto flex-1 p-4">
              <TableExcel ref="warningTableRef" :columns="warningColumns" :data="(warningRows as unknown as Record<string, unknown>[])">
                <template #cell-no_rfid="{ value }">
                  <span class="font-medium text-black-800 break-all">{{ value }}</span>
                </template>

                <template #cell-no_pallet="{ value }">
                  <span class="font-medium text-black-800">{{ value }}</span>
                </template>

                <template #cell-destination="{ value }">
                  <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {{ value }}
                  </span>
                </template>

                <template #cell-nik="{ value }">
                  {{ value || '-' }}
                </template>

                <template #cell-nama_driver="{ value }">
                  {{ value || '-' }}
                </template>

                <template #cell-nama_lp="{ value }">
                  {{ value || '-' }}
                </template>

                <template #cell-no_polisi="{ value }">
                  {{ value || '-' }}
                </template>

                <template #cell-log_updated_at="{ value }">
                  <span class="text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                    {{ value || '-' }}
                  </span>
                </template>

                <template #empty>
                  <span class="text-sm text-black-400">Tidak ada pallet belum kembali</span>
                </template>
              </TableExcel>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                @click="showWarningModal = false"
                class="px-4 py-2 text-sm font-medium text-black-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showNCModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background: rgba(0,0,0,0.45);"
          @click.self="showNCModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">

            <!-- Modal Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                 <span class="font-bold text-yellow-600">NC</span>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-black-800">Pallet NC</h3>
                </div>
                <span class="ml-2 px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                  {{ totalNC }} pallet
                </span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Tombol Close -->
                <button
                  @click="showNCModal = false"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-black-400 hover:text-black-600 hover:bg-gray-100 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Modal Filter Info -->
            <div class="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-black-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>
              </svg>
              <span class="text-xs text-black-500">
                Customer: <span class="font-semibold text-black-700">{{ params.customer === 'all' ? 'Semua Customer' : params.customer }}</span>
              </span>
            </div>

            <!-- Modal Table -->
            <div class="overflow-y-auto max-h-[440px]">
              <table class="w-full text-sm text-left text-black-600">
                <thead class="text-xs text-black-500 uppercase bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                  <tr>
                    <th class="px-4 py-3 w-10">No</th>
                    <th class="px-4 py-3">ID RFID</th>
                    <th class="px-4 py-3">No Pallet</th>
                    <th class="px-4 py-3">Type</th>
                    <th class="px-4 py-3 text-center">Category</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(pallet, index) in ncPallets"
                    :key="pallet.id"
                    class="border-b border-gray-50 bg-amber-50 hover:bg-amber-100 transition-colors"
                  >
                    <td class="px-4 py-3 text-black-400 text-xs">{{ index + 1 }}</td>
                    <td class="px-4 py-3 font-medium text-black-800 text-xs break-all">{{ pallet.no_rfid }}</td>
                    <td class="px-4 py-3 font-medium text-black-800">{{ pallet.no_pallet }}</td>
                    <td class="px-4 py-3 text-black-600">{{ pallet.type }}</td>
                    <td class="px-4 py-3 text-center text-xs text-black-500">{{ pallet.category || '-' }}</td>
                  </tr>
                  <tr v-if="ncPallets.length === 0">
                    <td colspan="8" class="px-4 py-10 text-center text-black-400 text-sm">
                      Tidak ada pallet {{ params.customer }} NC
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                @click="showNCModal = false"
                class="px-4 py-2 text-sm font-medium text-black-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showNGModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background: rgba(0,0,0,0.45);"
          @click.self="showNGModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">

            <!-- Modal Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-[#FCEBEB] flex items-center justify-center">
                 <span class="font-bold text-red-600">NG</span>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-black-800">Pallet NG</h3>
                </div>
                <span class="ml-2 px-3 py-1 text-xs font-semibold bg-[#FCEBEB] text-red-700 rounded-full border border-red-200">
                  {{ totalNG }} pallet
                </span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Tombol Close -->
                <button
                  @click="showNGModal = false"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-black-400 hover:text-black-600 hover:bg-gray-100 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Modal Filter Info -->
            <div class="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-black-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>
              </svg>
              <span class="text-xs text-black-500">
                Customer: <span class="font-semibold text-black-700">{{ params.customer === 'all' ? 'Semua Customer' : params.customer }}</span>
              </span>
            </div>

            <!-- Modal Table -->
            <div class="overflow-y-auto max-h-[440px]">
              <table class="w-full text-sm text-left text-black-600">
                <thead class="text-xs text-black-500 uppercase bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                  <tr>
                    <th class="px-4 py-3 w-10">No</th>
                    <th class="px-4 py-3">ID RFID</th>
                    <th class="px-4 py-3">No Pallet</th>
                    <th class="px-4 py-3">Type</th>
                    <th class="px-4 py-3 text-center">Category</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(pallet, index) in ngPallets"
                    :key="pallet.id"
                    class="border-b border-gray-50 bg-amber-50 hover:bg-amber-100 transition-colors"
                  >
                    <td class="px-4 py-3 text-black-400 text-xs">{{ index + 1 }}</td>
                    <td class="px-4 py-3 font-medium text-black-800 text-xs break-all">{{ pallet.no_rfid }}</td>
                    <td class="px-4 py-3 font-medium text-black-800">{{ pallet.no_pallet }}</td>
                    <td class="px-4 py-3 text-black-600">{{ pallet.type }}</td>
                    <td class="px-4 py-3 text-center text-xs text-black-500">{{ pallet.category || '-' }}</td>
                  </tr>
                  <tr v-if="ngPallets.length === 0">
                    <td colspan="8" class="px-4 py-10 text-center text-black-400 text-sm">
                      Tidak ada pallet {{ params.customer }} NG
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                @click="showNGModal = false"
                class="px-4 py-2 text-sm font-medium text-black-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style>
  .border-custom {
    border: 1px solid #e5e7eb !important;
  }
  .border-table {
    border: 1px solid #e5e7eb !important;
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

  .modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
  .modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>