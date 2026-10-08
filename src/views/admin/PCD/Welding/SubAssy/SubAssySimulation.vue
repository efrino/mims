<script setup lang="ts">
import { onMounted, ref, computed, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useGlcSimulationStore } from '@/stores/PCD/Welding/Simulation';
import { useNotificationStore } from '@/stores/notification';
import { useConfigStore } from '@/stores/config';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import Highcharts from 'highcharts';
import { getPatanLines } from '@/services/PCD/Welding/SimulationPatan';
import { getSpecMachine } from '@/services/Welding/Master/SpecMachine';
import { encryptId } from '@/utils/cryptoId';
import GlcConfigDialog from './GlcConfigDialog.vue';

const isConfigModalOpen = ref(false);
const openConfigModal = () => {
  isConfigModalOpen.value = true;
};

const page = ref({ title: 'GLC Simulation - Sub Assy' });
const breadcrumbs = ref([
  { title: 'Welding', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'GLC Simulation', disabled: true, href: '#' }
]);

const store = useGlcSimulationStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute();

const selectedAreaSegment = ref<'WSS ADM' | 'SA ADM'>('SA ADM');

const handleSegmentChange = (val: string) => {
  if (val === 'WSS ADM') {
    router.push('/Transaction/welding/glc-simulation');
  }
};

const { 
  dataTable, loading, isModalDetailOpen, selectedSimulation, detailLoading,
  isModalDataSourceOpen, createLoading, areaOptions
} = storeToRefs(store);

const searchQuery = ref('');

// Live Dashboard State
const isLoading = computed(() => store.liveSummaryLoading);
const summaryData = computed(() => store.liveSummaryData);
const specMachineList = ref<any[]>([]);

// Dropdown filter for Sub Assy vs Robot Barat vs Robot Timur
const liveChartFilter = ref<'ALL' | 'ROBOT BARAT' | 'ROBOT TIMUR'>('ALL');
const chartFilterOptions = [
  { title: 'Semua Robot (SA ADM)', value: 'ALL' },
  { title: 'Robot Barat', value: 'ROBOT BARAT' },
  { title: 'Robot Timur', value: 'ROBOT TIMUR' },
];

const getMachineArea = (machine: string): 'ROBOT BARAT' | 'ROBOT TIMUR' | 'ALL' => {
  const normM = String(machine || '').replace(/[\s-_]/g, '').toUpperCase();
  const spec = specMachineList.value.find((s: any) => 
    String(s.machine || '').replace(/[\s-_]/g, '').toUpperCase() === normM
  );
  const line = String(spec?.line || '').toUpperCase();
  if (line.includes('BARAT')) return 'ROBOT BARAT';
  if (line.includes('TIMUR')) return 'ROBOT TIMUR';
  return 'ALL';
};

const filteredLiveSummaryData = computed(() => {
  if (!summaryData.value || summaryData.value.length === 0) return [];
  if (liveChartFilter.value === 'ALL') {
    return summaryData.value;
  }
  return summaryData.value.filter((d: any) => {
    const line = getMachineArea(d.machine);
    return line === liveChartFilter.value;
  });
});

const wrapperRef = ref<HTMLElement | null>(null);
const highchartContainer = ref<HTMLElement | null>(null);
let hcChart: Highcharts.Chart | null = null;
const tableKey = ref(0);

// Table syncing
const categories = ref<string[]>([]);
const colWidths = ref<number[]>([]);
const leftColW = ref(55);
const rightColW = ref(50);
const chartPixelWidth = ref(0);

const isSmallScreen = ref(false);
const SMALL_BREAKPOINT = 1366;
const MIN_COLUMN_WIDTH = 50;

const checkScreenSize = () => {
  isSmallScreen.value = window.innerWidth < SMALL_BREAKPOINT;
};

const tableContainerStyle = computed(() => {
  if (isSmallScreen.value) {
    const w = leftColW.value + rightColW.value + (categories.value.length * MIN_COLUMN_WIDTH);
    return { minWidth: w + 'px' };
  }
  if (chartPixelWidth.value > 0) {
    return { width: chartPixelWidth.value + 'px' };
  }
  return { width: '100%' };
});

const getColumnStyle = (index: number) => {
  if (isSmallScreen.value) {
    return {
      width: `${MIN_COLUMN_WIDTH}px`,
      flex: `0 0 ${MIN_COLUMN_WIDTH}px`
    };
  }
  return {
    flex: `${colWidths.value[index] || 1} 0 0%`
  };
};

const formatNum = (num: any) => {
  if (!num) return '0';
  return Number(num).toLocaleString('id-ID');
};

const toHours = (val: any) => Number(val || 0);

const renderChart = () => {
  if (!highchartContainer.value || !filteredLiveSummaryData.value || filteredLiveSummaryData.value.length === 0) return;

  const data = [...filteredLiveSummaryData.value].sort((a: any, b: any) =>
    String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
  );
  categories.value = data.map(d => d.machine);

  // Series
  const downtimeData = data.map(d => toHours(d.downtime));
  const dandoriData = data.map(d => toHours(d.dandori));
  const tcData = data.map(d => toHours(d.tip_change ?? d.tc));
  const teiryoData = data.map(d => toHours(d.teiryo));
  const teikiData = data.map(d => Number(d.prod_time_final > 0 ? d.prod_time_final : (d.prod_time || 0)));
  const uphData = data.map(d => Number(d.uph || (d.tpt > 0 && d.pcs_day > 0 ? (d.pcs_day / d.tpt) : 0)).toFixed(1)).map(Number);

  const series = [
    {
      name: 'DownTime',
      data: downtimeData,
      color: '#d50000',
      stack: 'tpt',
      yAxis: 0
    },
    {
      name: 'T/C',
      data: tcData,
      color: '#fbc02d',
      stack: 'tpt',
      yAxis: 0
    },
    {
      name: 'Dandori',
      data: dandoriData,
      color: '#00a2ff',
      stack: 'tpt',
      yAxis: 0
    },
    {
      name: 'Weld Time',
      data: teikiData,
      color: '#005db9',
      stack: 'tpt',
      yAxis: 0
    },
    {
      name: 'Teiryo',
      data: teiryoData,
      color: '#800080',
      stack: 'tpt',
      showInLegend: false,
      yAxis: 0
    },
    {
      name: 'UPH',
      type: 'spline',
      yAxis: 1,
      data: uphData,
      lineWidth: 0,
      marker: { enabled: false },
      showInLegend: false,
      enableMouseTracking: false
    }
  ];

  if (hcChart) {
    hcChart.destroy();
  }

  hcChart = Highcharts.chart(highchartContainer.value, {
    chart: {
      type: 'column',
      marginTop: 40,
      marginBottom: 30,
      marginLeft: leftColW.value,
      marginRight: rightColW.value,
    },
    title: { text: '' },
    xAxis: {
      categories: categories.value,
      labels: {
        enabled: true,
        style: { fontSize: '11px', fontWeight: 'bold' }
      },
      tickWidth: 1,
      tickmarkPlacement: 'on'
    },
    yAxis: [
      {
        min: 0,
        max: 24,
        tickInterval: 2,
        endOnTick: true,
        maxPadding: 0,
        title: {
          text: 'TPT / DAY (JAM)',
          style: { fontWeight: 'bold', color: '#000000' }
        },
        lineWidth: 1.5,
        lineColor: '#000000',
        tickWidth: 1,
        tickColor: '#000000',
        plotLines: [
          { value: 8, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '8', style: { color: '#1a237e', fontWeight: 'bold' } } },
          { value: 11, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '11', style: { color: '#f44336', fontWeight: 'bold' } } },
          { value: 16, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '16', style: { color: '#1a237e', fontWeight: 'bold' } } },
          { value: 19, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '19', style: { color: '#f44336', fontWeight: 'bold' } } },
          { value: 21, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '21', style: { color: '#f44336', fontWeight: 'bold' } } }
        ],
        stackLabels: {
          enabled: true,
          style: {
            fontWeight: 'bold',
            color: '#333333'
          },
          formatter: function() {
            return this.total ? this.total.toFixed(2) : '';
          }
        }
      },
      {
        title: { text: 'UPH (Pcs / Jam)', style: { fontWeight: 'bold', color: '#000000' } },
        labels: { format: '{value}', style: { color: '#000000', fontWeight: 'bold' } },
        opposite: true,
        showEmpty: true,
        lineWidth: 1.5,
        lineColor: '#000000',
        tickWidth: 1,
        tickColor: '#000000',
        gridLineWidth: 0
      }
    ],
    legend: { enabled: false },
    plotOptions: {
      column: {
        stacking: 'normal',
        pointPadding: 0.05,
        groupPadding: 0.08,
        maxPointWidth: 55,
      }
    },
    series: series as any,
    credits: { enabled: false }
  });
};

import { getSimulationList } from '@/services/PCD/Welding/Simulation';

// Form Source state
const sourceChoice = ref<'master' | 'existing' | null>(null);
const selectedArea = ref<string | null>('SA ADM');
const selectedExistingSimId = ref<number | string | null>(null);
const existingSimOptions = ref<any[]>([]);
const loadingExistingSim = ref(false);

const openDataSourceModal = () => {
  sourceChoice.value = null;
  selectedArea.value = 'SA ADM';
  selectedExistingSimId.value = null;
  existingSimOptions.value = [];
  isModalDataSourceOpen.value = true;
};

const monthNamesIndo = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatPeriodeBulanTahun = (periode: any): string => {
  if (!periode) return '-';
  const str = String(periode).trim();

  if (/^\d{6}$/.test(str)) {
    const year = str.substring(0, 4);
    const monthIdx = parseInt(str.substring(4, 6), 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNamesIndo[monthIdx]} ${year}`;
    }
  }

  const parts = str.split(/[-/]/);
  if (parts.length === 2) {
    const [part1, part2] = parts;
    if (part1.length === 4 && part2.length === 2) {
      const monthIdx = parseInt(part2, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${monthNamesIndo[monthIdx]} ${part1}`;
      }
    }
  }

  return str;
};

const fetchExistingSimulations = async () => {
  if (!selectedArea.value) {
    existingSimOptions.value = [];
    selectedExistingSimId.value = null;
    return;
  }
  loadingExistingSim.value = true;
  selectedExistingSimId.value = null;
  try {
    const res = await getSimulationList(selectedArea.value);
    if (res.data.status === 'success' && res.data.data) {
      const liveList = (res.data.data || []).filter((sim: any) => {
        const s = String(sim.status || '').toUpperCase().trim();
        return s === 'LIVE' || s === 'EX-LIVE' || s === 'EXLIVE' || s === 'PLAN-LIVE' || s === 'PLANLIVE' || s.includes('LIVE');
      });
      existingSimOptions.value = liveList.map((sim: any) => ({
        title: `${formatPeriodeBulanTahun(sim.periode)} - ${sim.note || 'Tanpa Note'} - ${sim.status || '-'}`,
        value: sim.id
      }));
    } else {
      existingSimOptions.value = [];
    }
  } catch (err) {
    console.error("Error fetching existing simulations:", err);
    existingSimOptions.value = [];
  } finally {
    loadingExistingSim.value = false;
  }
};

const onSourceChoiceChange = () => {
  selectedExistingSimId.value = null;
  if (sourceChoice.value === 'existing') {
    fetchExistingSimulations();
  }
};

const onAreaChange = () => {
  if (sourceChoice.value === 'existing') {
    fetchExistingSimulations();
  }
};

const handleDataSourceSubmit = () => {
  isModalDataSourceOpen.value = false;
  if (sourceChoice.value === 'master' && selectedArea.value) {
    router.push({ path: '/Transaction/welding/subassy-simulation/create', query: { source: 'master', area: selectedArea.value } });
  } else if (sourceChoice.value === 'existing' && selectedArea.value && selectedExistingSimId.value) {
    router.push({
      path: '/Transaction/welding/subassy-simulation/create',
      query: { source: 'existing', area: selectedArea.value, id_simulation: String(selectedExistingSimId.value) }
    });
  }
};

// Patan Line Selector Modal
const isPatanLineModalOpen = ref(false);
const patanModalLoading = ref(false);
const patanLineLoading = ref(false);

const simulationOptions = ref<Array<{ title: string; value: number; area: string }>>([]);
const selectedSimulationId = ref<number | null>(null);

const patanLineOptions = ref<string[]>([]);
const selectedPatanLine = ref<string>('');

const openPatanLineModal = async () => {
  isPatanLineModalOpen.value = true;
  patanModalLoading.value = true;
  try {
    const simRes = await getSimulationList(selectedArea.value || 'SA ADM');
    if (simRes.data && simRes.data.status === 'success') {
      const list = simRes.data.data || [];
      simulationOptions.value = list.map((s: any) => ({
        title: `${formatPeriodeBulanTahun(s.periode)} - ${s.note || 'Tanpa Note'} - ${s.status || 'DRAFT'}`,
        value: s.id,
        area: s.area || selectedArea.value
      }));

      if (simulationOptions.value.length > 0) {
        const liveSim = list.find((s: any) => String(s.status).toUpperCase() === 'LIVE');
        selectedSimulationId.value = liveSim ? liveSim.id : list[0].id;
      }
    }
    if (selectedSimulationId.value) {
      await fetchPatanLinesForModal();
    }
  } catch (err) {
    console.error('Error loading simulation list for patan modal:', err);
  } finally {
    patanModalLoading.value = false;
  }
};

const fetchPatanLinesForModal = async () => {
  if (!selectedSimulationId.value) return;
  patanLineLoading.value = true;
  try {
    const res = await getPatanLines(selectedArea.value || 'SA ADM', selectedSimulationId.value);
    if (res.data && res.data.status === 'success') {
      patanLineOptions.value = res.data.data || [];
      if (patanLineOptions.value.length > 0) {
        selectedPatanLine.value = patanLineOptions.value[0];
      } else {
        selectedPatanLine.value = '';
      }
    }
  } catch (err) {
    console.error('Error loading patan lines:', err);
  } finally {
    patanLineLoading.value = false;
  }
};

watch(selectedSimulationId, () => {
  if (isPatanLineModalOpen.value && selectedSimulationId.value) {
    fetchPatanLinesForModal();
  }
});

const goToPatanPage = () => {
  if (!selectedSimulationId.value || !selectedPatanLine.value) return;
  isPatanLineModalOpen.value = false;
  const currentSim = simulationOptions.value.find(s => s.value === selectedSimulationId.value);
  router.push({
    path: '/Transaction/welding/subassy-simulation/patan',
    query: {
      id_simulation: selectedSimulationId.value,
      line: selectedPatanLine.value,
      area: currentSim?.area || selectedArea.value || 'SA ADM'
    }
  });
};

const headers = [
  { title: 'No', key: 'no', align: 'center' as const, sortable: false },
  { title: 'Notes', key: 'note', align: 'start' as const },
  { title: 'Area', key: 'area', align: 'center' as const },
  { title: 'Periode', key: 'periode', align: 'center' as const },
  { title: 'Status', key: 'status', align: 'center' as const },
  { title: 'Created At', key: 'created_at', align: 'center' as const },
  { title: 'Created By', key: 'created_by', align: 'center' as const },
  { title: 'Action', key: 'actions', align: 'center' as const, sortable: false }
];

// Excel-like Filter & Sort State
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');
const excelSearchQueries = ref<Record<string, string>>({});
const excelCheckedFilters = ref<Record<string, string[]>>({});

headers.forEach(h => {
  excelSearchQueries.value[h.key] = '';
  excelCheckedFilters.value[h.key] = [];
});

const getExcelUniqueItems = (key: string) => {
  if (!dataTable.value) return [];
  const unique = new Set(dataTable.value.map(item => String((item as any)[key] ?? '')));
  return Array.from(unique).sort();
};

const formatFilterValue = (key: string, val: any) => {
  if (key === 'status') {
    return getStatusText(val);
  }
  return val || '-';
};

const getExcelFilteredUniqueItems = (key: string) => {
  const items = getExcelUniqueItems(key);
  const query = (excelSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => {
    const displayVal = String(formatFilterValue(key, item)).toLowerCase();
    return displayVal.includes(query);
  });
};

const isAllExcelItemsChecked = (key: string) => {
  const allFilteredItems = getExcelFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = excelCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const toggleExcelSelectAll = (key: string) => {
  const allFilteredItems = getExcelFilteredUniqueItems(key);
  const checked = excelCheckedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    excelCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    excelCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isExcelFilterActive = (key: string) => {
  return (excelCheckedFilters.value[key] && excelCheckedFilters.value[key].length > 0) || 
         (excelSearchQueries.value[key] && excelSearchQueries.value[key].length > 0);
};

const setExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (sortKey.value === key && sortDir.value === dir) {
    sortKey.value = null;
  } else {
    sortKey.value = key;
    sortDir.value = dir;
  }
};

const clearSingleExcelFilter = (key: string) => {
  excelCheckedFilters.value[key] = [];
  excelSearchQueries.value[key] = '';
  if (sortKey.value === key) sortKey.value = null;
};

const resetAllExcelFilters = () => {
  sortKey.value = null;
  sortDir.value = 'asc';
  headers.forEach(h => {
    excelSearchQueries.value[h.key] = '';
    excelCheckedFilters.value[h.key] = [];
  });
};

const isAnyExcelFilterActive = computed(() => {
  return headers.some(h => isExcelFilterActive(h.key)) || sortKey.value !== null;
});

const filteredData = computed(() => {
  let result = [...(dataTable.value || [])];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(item =>
      Object.values(item).some(val =>
        String(val || '').toLowerCase().includes(q)
      )
    );
  }

  headers.forEach(h => {
    const key = h.key;
    const query = excelSearchQueries.value[key]?.toLowerCase();
    const checked = excelCheckedFilters.value[key];

    if (query) {
      result = result.filter(item => String((item as any)[key] ?? '').toLowerCase().includes(query));
    }
    
    if (checked && checked.length > 0) {
      result = result.filter(item => checked.includes(String((item as any)[key] ?? '')));
    }
  });

  if (sortKey.value) {
    result.sort((a, b) => {
      const valA = String((a as any)[sortKey.value!] ?? '').toLowerCase();
      const valB = String((b as any)[sortKey.value!] ?? '').toLowerCase();
      if (valA < valB) return sortDir.value === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return result;
});

const loadHeaders = [
  { title: 'Part Number', key: 'part_number', align: 'start' as const },
  { title: 'Model', key: 'model', align: 'center' as const },
  { title: 'Machine Use', key: 'machine_use', align: 'center' as const },
  { title: 'Machine Prev', key: 'machine_prev', align: 'center' as const },
  { title: 'Total Proses', key: 'total_proses', align: 'center' as const },
  { title: 'Qty Kanban', key: 'qty_kanban', align: 'end' as const },
  { title: 'Pcs/Day', key: 'pcs_day', align: 'end' as const },
  { title: 'Lot Cycle', key: 'lot_cycle', align: 'end' as const },
  { title: 'Cycle Time (s)', key: 'cycle_time_sec', align: 'end' as const },
  { title: 'Prod Time (mnt)', key: 'prod_time', align: 'end' as const },
  { title: 'TPT (mnt)', key: 'tpt', align: 'end' as const },
  { title: 'Beban (%)', key: 'beban_persen', align: 'end' as const },
  { title: 'Overload', key: 'is_overload', align: 'center' as const },
];

const handleDetail = (id: number) => {
  router.push(`/Transaction/welding/subassy-simulation/detail/${encryptId(id)}`);
};

const isEditModeDialogOpen = ref(false);
const selectedEditId = ref<number | null>(null);

const handleEdit = (id: number) => {
  selectedEditId.value = id;
  isEditModeDialogOpen.value = true;
};

const proceedEdit = (step: number) => {
  if (!selectedEditId.value) return;
  const id = selectedEditId.value;
  isEditModeDialogOpen.value = false;
  router.push({
    path: `/Transaction/welding/subassy-simulation/edit/${encryptId(id)}`,
    query: { step: String(step) }
  });
};



const handleStatusChange = async (id: number, status: string) => {
  let msg = "Apakah Anda yakin ingin submit simulasi ini untuk approval?";
  if (status === 'LIVE') msg = "Apakah Anda yakin ingin mengaktifkan (LIVE) simulasi ini?";
  else if (status === 'APPROVE') msg = "Apakah Anda yakin ingin menyetujui simulasi ini?";
  else if (status === 'REJECT') msg = "Apakah Anda yakin ingin menolak simulasi ini?";
  else if (status === 'DRAFT') msg = "Apakah Anda yakin ingin mengubah simulasi ini menjadi draft?";
  
  notificationStore.showConfirm(
    "Konfirmasi Status",
    msg,
    async () => {
      const success = await store.changeSimulationStatus(id, status);
      if (success) {
        store.fetchSimulationList({ area: 'SA ADM' });
      }
    }
  );
};

const handleExportExcel = (id: number) => {
  const url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/ExportExcel?id_simulation=${encryptId(id)}`;
  window.open(url, '_blank');
};

const handleDelete = async (id: number) => {
  notificationStore.showConfirm(
    "Konfirmasi Hapus",
    "Apakah Anda yakin ingin menghapus data simulasi ini? Data yang terhapus tidak dapat dikembalikan.",
    async () => {
      const success = await store.removeSimulation(id);
      if (success) {
        store.fetchSimulationList({ area: 'SA ADM' });
      }
    }
  );
};

const getStatusColor = (status: any) => {
  const s = String(status).toUpperCase();
  if (s === 'DRAFT') return 'default';
  if (s === 'SUBMIT') return 'info';
  if (s === 'APPROVE') return 'success';
  if (s === 'REJECT') return 'error';
  if (s === 'LIVE') return 'deep-purple';
  return 'default';
};

const getStatusText = (status: any) => {
  const s = String(status).toUpperCase();
  if (s === 'DRAFT') return 'Draft';
  if (s === 'SUBMIT') return 'Submitted';
  if (s === 'APPROVE') return 'Approved';
  if (s === 'REJECT') return 'Rejected';
  if (s === 'LIVE') return 'Live';
  return status || 'Draft';
};

watch([liveChartFilter, summaryData], () => {
  setTimeout(() => {
    renderChart();
  }, 100);
});

onMounted(async () => {
  if (String(route.query.area || '').toUpperCase() === 'WSS ADM') {
    router.replace('/Transaction/welding/glc-simulation');
    return;
  }
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);

  try {
    const specRes = await getSpecMachine();
    if (specRes?.data?.data && Array.isArray(specRes.data.data)) {
      specMachineList.value = specRes.data.data;
    }
  } catch (err) {
    console.warn("Error fetching spec machine:", err);
  }
  
  store.fetchSimulationList({ area: 'SA ADM' });
  
  await store.fetchLiveSummary('SA ADM');
  setTimeout(() => {
    renderChart();
  }, 100);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
  if (hcChart) {
    hcChart.destroy();
  }
});
</script>

<template>
  <div class="page-wrapper">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-4"></BaseBreadcrumb>

    <!-- AREA SEGMENT SELECTOR -->
    <v-card class="elevation-1 rounded-xl px-4 py-3 mb-5 border bg-white d-flex align-center justify-space-between flex-wrap gap-3" style="border-radius: 14px !important;">
      <div class="d-flex align-center gap-3">
        <span class="text-subtitle-2 font-weight-bold text-grey-darken-2">Area Segment:</span>
        <v-btn-toggle
          v-model="selectedAreaSegment"
          mandatory
          color="primary"
          variant="flat"
          density="comfortable"
          rounded="lg"
          class="border"
          @update:model-value="handleSegmentChange"
        >
          <v-btn
            value="WSS ADM"
            class="px-5 font-weight-bold"
            prepend-icon="mdi-factory"
          >
            WSS ADM
          </v-btn>
          <v-btn
            value="SA ADM"
            class="px-5 font-weight-bold"
            prepend-icon="mdi-robot-industrial"
          >
            SA ADM
          </v-btn>
        </v-btn-toggle>
      </div>

      <div class="text-caption text-grey-darken-1 d-flex align-center">
        <v-icon size="16" class="mr-1" color="primary">mdi-information-outline</v-icon>
        <span>Area aktif: <strong class="text-primary">SA ADM (Sub-Assy Robot Spot)</strong></span>
      </div>
    </v-card>

    <!-- LIVE DASHBOARD SECTION -->
    <v-card class="elevation-2 rounded-xl pa-5 mb-6 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;" ref="wrapperRef">
      <div v-if="isLoading" class="d-flex justify-center align-center py-10" style="min-height: 200px;">
        <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      </div>
      
      <div v-else-if="!summaryData || summaryData.length === 0" class="d-flex justify-center py-10">
        <v-alert type="warning" variant="tonal" max-width="500" class="w-100">
          Tidak ada data simulasi LIVE pada bulan ini.
        </v-alert>
      </div>

      <div v-else>
        <div class="d-flex justify-space-between align-center mb-4 flex-wrap gap-3">
          <div>
            <div class="text-h5 text-primary font-weight-bold">
              LIVE Dashboard TPT Mesin - Sub Assy
            </div>
            <div class="text-caption text-grey-darken-1">
              Beban utilisasi dan jam kerja mesin dari simulasi aktif (LIVE).
            </div>
          </div>

          <div class="d-flex align-center gap-3">
            <div style="min-width: 260px;">
              <v-select
                v-model="liveChartFilter"
                :items="chartFilterOptions"
                item-title="title"
                item-value="value"
                label="Filter Tampilan Area"
                variant="outlined"
                density="compact"
                hide-details
                prepend-inner-icon="mdi-filter-variant"
                class="bg-white rounded"
              />
            </div>
          </div>
        </div>
        
        <!-- Legend -->
        <div class="d-flex justify-center gap-6 mb-2">
          <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #d50000"></div> <span class="text-caption font-weight-medium">DOWNTIME</span></div>
          <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #fbc02d"></div> <span class="text-caption font-weight-medium">T/C</span></div>
          <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #00a2ff"></div> <span class="text-caption font-weight-medium">DANDORI</span></div>
          <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #800080"></div> <span class="text-caption font-weight-medium">TEIRYO</span></div>
          <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #005db9"></div> <span class="text-caption font-weight-medium">WELD TIME</span></div>
        </div>

        <!-- Chart Container -->
        <div ref="highchartContainer" style="height: 400px; width: 100%;"></div>
      </div>
    </v-card>

    <v-card class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-h4 text-primary font-weight-medium">
          GLC Simulation - Sub Assy
        </div>
        <div class="d-flex gap-3">
          <v-btn
            color="deep-purple-darken-1"
            variant="tonal"
            prepend-icon="mdi-scale-balance"
            @click="router.push('/Transaction/welding/subassy-simulation/compare')"
          >
            Bandingkan Skenario
          </v-btn>
          <v-btn
            color="indigo"
            variant="tonal"
            prepend-icon="mdi-calendar-sync-outline"
            @click="openPatanLineModal"
          >
            Lihat Patan Line
          </v-btn>
          <v-btn
            color="teal-darken-1"
            variant="tonal"
            prepend-icon="mdi-cog-outline"
            @click="openConfigModal"
          >
            Konfigurasi
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="openDataSourceModal"
          >
            Add Simulation
          </v-btn>
        </div>
      </div>

      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-caption text-grey d-flex align-center">
          <v-icon size="16" class="mr-1">mdi-information</v-icon>
          <span>Daftar data simulasi GLC.</span>
        </div>
        <div class="d-flex align-center gap-3" style="max-width: 600px; width: 100%; justify-content: flex-end;">
          <v-btn
            v-if="isAnyExcelFilterActive"
            color="error"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-filter-off"
            @click="resetAllExcelFilters"
            class="text-caption"
            style="height: 40px;"
          >
            Reset Filter
          </v-btn>
          <div style="width: 250px;">
            <v-text-field
              v-model="searchQuery"
              placeholder="Cari data..."
              density="compact"
              variant="outlined"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </div>
        </div>
      </div>

      <v-data-table
        :headers="headers"
        :items="filteredData"
        :loading="loading"
        density="compact"
        class="elevation-1 rounded-lg custom-table text-body-2"
        hover
      >
        <template #headers="{ columns }">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key || ''"
              class="text-center text-body-2 font-weight-bold"
              style="background: #eef2f7;"
            >
              <v-menu v-if="col.key !== 'actions' && col.key !== 'no'" :close-on-content-click="false" location="bottom start" transition="scale-transition">
                <template v-slot:activator="{ props }">
                  <div v-bind="props" class="header-inner d-flex align-center justify-center cursor-pointer select-none py-1 hover-header">
                    <span :class="{'text-primary font-weight-bold': isExcelFilterActive(col.key || '')}">
                      {{ col.title }}
                    </span>
                    <v-icon size="14" class="ml-1" :color="isExcelFilterActive(col.key || '') || sortKey === col.key ? 'primary' : 'grey-lighten-1'">
                      {{ sortKey === col.key ? (sortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                    </v-icon>
                  </div>
                </template>

                <v-card width="250" class="pa-2 rounded-lg">
                  <v-list density="compact" class="pa-0">
                    <v-list-item prepend-icon="mdi-sort-ascending" title="Sort A to Z / Ascending" @click="setExcelSort(col.key || '', 'asc')" />
                    <v-list-item prepend-icon="mdi-sort-descending" title="Sort Z to A / Descending" @click="setExcelSort(col.key || '', 'desc')" />
                  </v-list>
                  <v-divider class="my-1" />
                  
                  <v-text-field
                    v-model="excelSearchQueries[col.key || '']"
                    placeholder="Cari nilai..."
                    density="compact"
                    variant="outlined"
                    hide-details
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    class="mb-2"
                  />

                  <div style="max-height: 180px; overflow-y: auto;" class="border rounded pa-1">
                    <v-checkbox
                      label="(Select All)"
                      density="compact"
                      hide-details
                      :model-value="isAllExcelItemsChecked(col.key || '')"
                      @click="toggleExcelSelectAll(col.key || '')"
                      class="ma-0 pa-0"
                    />
                    <v-checkbox
                      v-for="item in getExcelFilteredUniqueItems(col.key || '')"
                      :key="item"
                      :label="formatFilterValue(col.key || '', item)"
                      :value="item"
                      v-model="excelCheckedFilters[col.key || '']"
                      density="compact"
                      hide-details
                      class="ma-0 pa-0"
                    />
                  </div>
                  
                  <v-card-actions class="justify-end pa-0 mt-2">
                    <v-btn size="x-small" variant="text" color="grey" @click="clearSingleExcelFilter(col.key || '')">Reset</v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>
              <div v-else class="header-inner d-flex align-center justify-center py-1 font-weight-bold">
                {{ col.title }}
              </div>
            </th>
          </tr>
        </template>

        <template #item.no="{ item }">
          <span class="font-weight-medium text-center d-block">{{ filteredData.indexOf(item) + 1 }}</span>
        </template>

        <template #item.periode="{ item }">
          <span>{{ formatPeriodeBulanTahun(item.periode) }}</span>
        </template>

        <template #item.status="{ item }">
          <span class="font-weight-medium" :class="{'text-success': item.status === 'RUNNING', 'text-warning': item.status === 'DRAFT'}">
            {{ getStatusText(item.status) }}
          </span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-center align-center">
            <v-tooltip text="Lihat Detail">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-eye"
                  size="x-small"
                  color="info"
                  variant="text"
                  @click="handleDetail(item.id)"
                ></v-btn>
              </template>
            </v-tooltip>
            
            <v-tooltip text="Export Excel">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="x-small"
                  variant="text"
                  @click="handleExportExcel(item.id)"
                >
                  <v-icon color="#16a34a" size="20">mdi-microsoft-excel</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            
            <v-tooltip text="Edit Data">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-pencil"
                  size="x-small"
                  color="warning"
                  variant="text"
                  @click="handleEdit(item.id)"
                  :disabled="String(item.status).toUpperCase() === 'SUBMIT' || String(item.status).toUpperCase() === 'LIVE'"
                ></v-btn>
              </template>
            </v-tooltip>

            <v-tooltip text="Submit for Approval" v-if="String(item.status).toUpperCase() === 'DRAFT' || String(item.status).toUpperCase() === 'REJECT'">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-send-check"
                  size="x-small"
                  color="primary"
                  variant="text"
                  @click="handleStatusChange(item.id, 'SUBMIT')"
                ></v-btn>
              </template>
            </v-tooltip>

            <v-tooltip text="Set to LIVE" v-if="String(item.status).toUpperCase() === 'APPROVE'">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-rocket-launch"
                  size="x-small"
                  color="deep-purple"
                  variant="text"
                  @click="handleStatusChange(item.id, 'LIVE')"
                ></v-btn>
              </template>
            </v-tooltip>

            <v-tooltip text="Turunkan ke DRAFT" v-if="String(item.status).toUpperCase() === 'LIVE'">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-file-undo"
                  size="x-small"
                  color="grey-darken-2"
                  variant="text"
                  @click="handleStatusChange(item.id, 'DRAFT')"
                ></v-btn>
              </template>
            </v-tooltip>

            <v-tooltip text="Hapus Data" v-if="String(item.status).toUpperCase() === 'DRAFT'">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-delete"
                  size="x-small"
                  color="error"
                  variant="text"
                  @click="handleDelete(item.id)"
                ></v-btn>
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Modal Choose Data Source -->
    <v-dialog v-model="isModalDataSourceOpen" max-width="440px" persistent>
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center pa-3 px-4">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="20">mdi-database-plus-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Pilih Sumber Data</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" color="white" @click="isModalDataSourceOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-4 pt-5">
          <v-row dense>
            <v-col cols="12">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">1. Sumber Data</label>
              <v-select
                v-model="sourceChoice"
                :items="[
                  { title: 'Data Master Data', value: 'master' },
                  { title: 'Data yang sudah ada', value: 'existing' }
                ]"
                placeholder="Pilih Sumber Data"
                item-title="title"
                item-value="value"
                variant="outlined"
                density="compact"
                single-line
                hide-details="auto"
                class="mb-3 font-weight-bold modal-source-select"
                @update:model-value="onSourceChoiceChange"
              ></v-select>
            </v-col>
            <v-col cols="12" v-if="sourceChoice">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">2. Area</label>
              <v-text-field
                model-value="SA ADM"
                variant="outlined"
                density="compact"
                readonly
                disabled
                bg-color="grey-lighten-4"
                hide-details="auto"
                class="mb-3 font-weight-bold modal-source-select"
              ></v-text-field>
            </v-col>
            <v-col cols="12" v-if="sourceChoice === 'existing' && selectedArea">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">3. Pilih Simulasi Existing</label>
              <v-select
                v-model="selectedExistingSimId"
                :items="existingSimOptions"
                placeholder="Pilih Simulasi Existing (Periode - Notes - Status)"
                item-title="title"
                item-value="value"
                variant="outlined"
                density="compact"
                single-line
                hide-details="auto"
                :loading="loadingExistingSim"
                class="font-weight-bold modal-source-select"
                no-data-text="Tidak ada data simulasi berstatus Live / Ex-Live untuk area ini"
              ></v-select>
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions class="pa-3 px-4 bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" class="font-weight-bold text-none" @click="isModalDataSourceOpen = false">Batal</v-btn>
          <v-btn 
            color="primary" 
            variant="flat" 
            class="font-weight-bold text-none px-4"
            @click="handleDataSourceSubmit"
            :disabled="!sourceChoice || !selectedArea || (sourceChoice === 'existing' && !selectedExistingSimId)"
            :loading="createLoading"
          >
            Lanjutkan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Pilih Line Patan -->
    <v-dialog v-model="isPatanLineModalOpen" max-width="500px">
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="text-white d-flex justify-space-between align-center pa-4" style="background-color: rgb(3, 69, 161) !important; min-height: 48px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white">mdi-calendar-sync-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Pilih Simulasi & Line Patan</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="isPatanLineModalOpen = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-5">
          <div class="mb-4 bg-grey-lighten-4 pa-3 rounded border text-body-2 text-grey-darken-2">
            Pilih data simulasi dan line mesin yang ingin ditampilkan daftar jadwal pembagian Patan (A, B, C, D).
          </div>

          <!-- Select 1: Simulasi -->
          <v-select
            v-model="selectedSimulationId"
            :items="simulationOptions"
            item-title="title"
            item-value="value"
            label="1. Pilih Data Simulasi *"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-chart-timeline-variant"
            :loading="patanModalLoading"
            placeholder="Pilih simulasi..."
            hide-details="auto"
            class="mb-4"
          ></v-select>

          <!-- Select 2: Line Mesin -->
          <v-select
            v-model="selectedPatanLine"
            :items="patanLineOptions"
            label="2. Pilih Line Mesin *"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-factory"
            :loading="patanLineLoading"
            :disabled="!selectedSimulationId || patanLineLoading"
            placeholder="Pilih line..."
            hide-details="auto"
          ></v-select>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 border-t d-flex justify-end gap-2">
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            size="large"
            @click="isPatanLineModalOpen = false"
          >
            Batal
          </v-btn>
          <v-btn
            style="background-color: rgb(3, 69, 161) !important; color: white !important;"
            variant="flat"
            size="large"
            prepend-icon="mdi-check-circle-outline"
            :disabled="!selectedSimulationId || !selectedPatanLine"
            @click="goToPatanPage"
          >
            Buka Halaman Patan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Pilih Mode Edit Simulasi -->
    <v-dialog v-model="isEditModeDialogOpen" max-width="520px">
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="text-white d-flex justify-space-between align-center pa-4" style="background-color: rgb(3, 69, 161) !important;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white">mdi-square-edit-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Pilih Mode Edit Simulasi Sub Assy</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" color="white" @click="isEditModeDialogOpen = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-5">
          <p class="text-body-2 text-grey-darken-2 mb-4">
            Bagaimana Anda ingin mengedit data simulasi ini?
          </p>

          <v-row dense>
            <!-- Option 1: Adjust Simulation (Step 3) -->
            <v-col cols="12">
              <v-hover v-slot="{ isHovering, props }">
                <v-card
                  v-bind="props"
                  variant="outlined"
                  class="pa-4 rounded-lg cursor-pointer transition-swing mb-3"
                  :style="{
                    borderColor: isHovering ? '#0345a1' : '#cbd5e1',
                    backgroundColor: isHovering ? '#f0f7ff' : '#ffffff',
                    borderWidth: '2px'
                  }"
                  @click="proceedEdit(3)"
                >
                  <div class="d-flex align-start gap-3">
                    <v-avatar color="primary" variant="tonal" size="42" class="mr-3 mt-1">
                      <v-icon color="primary" size="24">mdi-scale-balance</v-icon>
                    </v-avatar>
                    <div>
                      <div class="d-flex align-center gap-2">
                        <span class="font-weight-bold text-subtitle-2 text-primary">Penyesuaian Simulasi (Segment 3)</span>
                        <v-chip size="x-small" color="success" class="font-weight-bold" label>Rekomendasi</v-chip>
                      </div>
                      <p class="text-caption text-grey-darken-1 mt-1 mb-0">
                        Langsung menuju tahap <strong>Balancing Mesin</strong>. Mempertahankan seluruh alokasi mesin dan data part yang sudah disimulasikan sebelumnya tanpa me-reset grafik.
                      </p>
                    </div>
                  </div>
                </v-card>
              </v-hover>
            </v-col>

            <!-- Option 2: Full Reset (Step 1) -->
            <v-col cols="12">
              <v-hover v-slot="{ isHovering, props }">
                <v-card
                  v-bind="props"
                  variant="outlined"
                  class="pa-4 rounded-lg cursor-pointer transition-swing"
                  :style="{
                    borderColor: isHovering ? '#e65100' : '#cbd5e1',
                    backgroundColor: isHovering ? '#fff8e1' : '#ffffff',
                    borderWidth: '1.5px'
                  }"
                  @click="proceedEdit(1)"
                >
                  <div class="d-flex align-start gap-3">
                    <v-avatar color="warning" variant="tonal" size="42" class="mr-3 mt-1">
                      <v-icon color="warning" size="24">mdi-refresh</v-icon>
                    </v-avatar>
                    <div>
                      <div class="font-weight-bold text-subtitle-2 text-grey-darken-3">Ulangi dari Awal (Segment 1)</div>
                      <p class="text-caption text-grey-darken-1 mt-1 mb-0">
                        Mulai dari <strong>Segment 1 (Setup Parameter & Data Master)</strong>. Gunakan jika ingin sinkronisasi ulang data master atau merombak parameter dari awal.
                      </p>
                    </div>
                  </div>
                </v-card>
              </v-hover>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="pa-3 px-4 bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" class="text-none font-weight-bold" @click="isEditModeDialogOpen = false">
            Batal
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Konfigurasi Parameter CT -->
    <GlcConfigDialog
      v-model="isConfigModalOpen"
      area="SA ADM"
    />
  </div>
</template>

<style scoped>
:deep(.v-card),
.v-card {
  border-radius: 14px !important;
}

.custom-table :deep(table) {
  border-collapse: separate !important;
  border-spacing: 0 !important;
  border: 1.5px solid #94a3b8 !important;
}

.custom-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #000000 !important;
  font-weight: bold !important;
  text-transform: uppercase;
  font-size: 11px !important;
  padding: 4px 6px !important;
  border-top: 1.5px solid #94a3b8 !important;
  border-bottom: 2px solid #94a3b8 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  white-space: nowrap;
}

.custom-table :deep(td) {
  padding: 4px 6px !important;
  font-size: 11px !important;
  border-bottom: 1.5px solid #cbd5e1 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  vertical-align: middle !important;
  color: #000000 !important;
}

.custom-table :deep(tr:hover:not(.v-data-table__empty-wrapper)) {
  background-color: rgba(33, 150, 243, 0.08) !important;
}

.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
.hover-bg-grey:hover {
  background-color: #f5f5f5;
}

/* Modal Pilih Sumber Data dropdown vertical centering */
:deep(.modal-source-select .v-field) {
  min-height: 40px !important;
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
}

:deep(.modal-source-select .v-field__field) {
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
}

:deep(.modal-source-select .v-field__input) {
  min-height: 40px !important;
  height: 40px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  display: flex !important;
  align-items: center !important;
}

:deep(.modal-source-select .v-field__placeholder) {
  top: 0 !important;
  bottom: 0 !important;
  display: flex !important;
  align-items: center !important;
  height: 100% !important;
  font-size: 0.875rem !important;
}

:deep(.modal-source-select .v-select__selection) {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  display: flex !important;
  align-items: center !important;
  line-height: normal !important;
}

:deep(.modal-source-select .v-field__append-inner) {
  align-items: center !important;
  padding-top: 0 !important;
  height: 100% !important;
}
</style>
