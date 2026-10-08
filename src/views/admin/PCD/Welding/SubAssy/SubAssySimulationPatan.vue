<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPatanLines, getPatanByLine } from '@/services/PCD/Welding/SimulationPatan';
import { getPcsDayDetail } from '@/services/PCD/Welding/Simulation';
import { useNotificationStore } from '@/stores/notification';
import { useGlcSimulationStore } from '@/stores/PCD/Welding/Simulation';
import Highcharts from 'highcharts';

const route = useRoute();
const router = useRouter();
const notificationStore = useNotificationStore();
const store = useGlcSimulationStore();

const loading = ref(false);
const linesLoading = ref(false);
const lineOptions = ref<string[]>([]);
const selectedLine = ref<string>('');
const selectedArea = ref<string>('SA ADM');
const activeTab = ref<'A' | 'B' | 'C' | 'D' | 'ALL'>('A');

const highchartContainer = ref<HTMLElement | null>(null);
let hcChart: Highcharts.Chart | null = null;
const tableKey = ref(0);

// Table alignment & syncing with Highcharts ticks
const colWidths = ref<number[]>([]);
const leftColW = ref(170);
const rightColW = ref(75);
const chartPixelWidth = ref(0);

const isSmallScreen = ref(false);
const SMALL_BREAKPOINT = 1366;
const MIN_COLUMN_WIDTH = 80;

const checkScreenSize = () => {
  isSmallScreen.value = window.innerWidth < SMALL_BREAKPOINT;
};

const tableContainerStyle = computed(() => {
  if (isSmallScreen.value) {
    const w = leftColW.value + rightColW.value + (4 * MIN_COLUMN_WIDTH);
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

const patanData = ref<{
  line: string;
  area: string;
  id_simulation?: number;
  summary: {
    total_parts: number;
    patan_a_count: number;
    patan_b_count: number;
    patan_c_count: number;
    patan_d_count: number;
  };
  summary_patan?: Record<string, any>;
  groups: {
    A: any[];
    B: any[];
    C: any[];
    D: any[];
  };
  all_parts: any[];
}>({
  line: '',
  area: 'SA ADM',
  summary: {
    total_parts: 0,
    patan_a_count: 0,
    patan_b_count: 0,
    patan_c_count: 0,
    patan_d_count: 0
  },
  groups: {
    A: [],
    B: [],
    C: [],
    D: []
  },
  all_parts: []
});

const searchQuery = ref('');

const isStatusPatanDetailModalOpen = ref(false);
const statusPatanDetailItem = ref<any>(null);
const statusPatanDetailList = ref<any[]>([]);

const statusPatanDetailLoading = ref(false);

const openStatusPatanDetailModal = async (item: any) => {
  if (!item || !item.part_number) return;
  const idSim = selectedSimulationId.value || (route.query.id_simulation as string) || (patanData.value.all_parts && patanData.value.all_parts.length > 0 ? patanData.value.all_parts[0].id_simulation : null);
  if (!idSim) return;

  statusPatanDetailItem.value = item;
  statusPatanDetailList.value = [];
  isStatusPatanDetailModalOpen.value = true;
  statusPatanDetailLoading.value = true;

  try {
    const res = await store.getStatusPatanDetail(idSim, item.part_number, item.process);
    if (res && Array.isArray(res)) {
      statusPatanDetailList.value = res;
    }
  } catch (err) {
    console.error("Error fetching status patan detail:", err);
  } finally {
    statusPatanDetailLoading.value = false;
  }
};

const isPcsDayDetailModalOpen = ref(false);
const pcsDayDetailLoading = ref(false);
const pcsDayDetailData = ref<any>(null);

const formatPartNumber = (pn: string) => {
  if (!pn) return '-';
  const clean = pn.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length === 10) {
    return `${clean.substring(0, 5)}-${clean.substring(5, 10)}`;
  } else if (clean.length === 12) {
    return `${clean.substring(0, 5)}-${clean.substring(5, 10)}-${clean.substring(10, 12)}`;
  }
  return pn;
};

const openPcsDayDetailModal = async (item: any) => {
  if (!item || !item.part_number) return;
  pcsDayDetailLoading.value = true;
  pcsDayDetailData.value = {
    part_number: item.part_number,
    part_name: item.part_name || '-',
    model: item.model || '-',
    total_pcs_day: 0,
    parents_detail: []
  };
  isPcsDayDetailModalOpen.value = true;
  const cleanRowParent = String(item.part_top_parent || item.parent_part_number || item.top_parent_part_number || item.part_number_delivery || '').trim().replace(/^P/i, '');
  const rowParentP14 = cleanRowParent.length >= 14 ? cleanRowParent.substring(0, 14) : cleanRowParent;

  try {
    const res: any = await getPcsDayDetail(item.part_number, undefined, cleanRowParent || undefined);
    if (res && res.status === 'success' && res.data) {
      const rawParents = res.data.parents_detail || [];
      let filteredParents = rawParents;

      if (cleanRowParent && rawParents.length > 0) {
        const matched = rawParents.filter((p: any) => {
          const pParent = String(p.parent_part_number || p.part_number_delivery || '').trim().replace(/^P/i, '');
          const pP14 = pParent.length >= 14 ? pParent.substring(0, 14) : pParent;
          return pParent === cleanRowParent || pP14 === rowParentP14;
        });
        if (matched.length > 0) {
          filteredParents = matched;
        }
      }

      const calculatedTotal = filteredParents.reduce((sum: number, p: any) => sum + (Number(p.pcs_day) || 0), 0);

      pcsDayDetailData.value = {
        ...res.data,
        total_pcs_day: calculatedTotal > 0 ? calculatedTotal : (item.pcs_day || item.pcs_day_monthly || res.data.total_pcs_day || 0),
        parents_detail: filteredParents,
        parent_filter: cleanRowParent || null
      };
    }
  } catch (err) {
    console.error('Error fetching Pcs/Day detail:', err);
  } finally {
    pcsDayDetailLoading.value = false;
  }
};

const getPatanHeadersForTab = (tab: 'A' | 'B' | 'C' | 'D' | 'ALL') => {
  const baseHeaders = [
    { title: 'Urutan', key: 'urutan', align: 'center' as const },
    { title: 'Part Number', key: 'part_number', align: 'start' as const },
    { title: 'Job Number', key: 'job_number', align: 'start' as const },
    { title: 'Part Name', key: 'part_name', align: 'start' as const },
    { title: 'Model', key: 'model', align: 'center' as const },
    { title: 'Mesin', key: 'machine', align: 'center' as const },
    { title: 'Proses', key: 'process', align: 'center' as const },
  ];

  const shift1Headers = [
    { title: 'Jam Start (Shift 1)', key: 'time_proc_start', align: 'center' as const },
    { title: 'Jam End (Shift 1)', key: 'time_proc_end', align: 'center' as const },
  ];

  const shift2Headers = [
    { title: 'Jam Start (Shift 2)', key: 'time_proc_start_shift2', align: 'center' as const },
    { title: 'Jam End (Shift 2)', key: 'time_proc_end_shift2', align: 'center' as const },
  ];

  const tailHeaders = [
    { title: 'Lot Cycle', key: 'lot_cycle', align: 'center' as const },
    { title: 'Patan', key: 'patan', align: 'center' as const },
    { title: 'Qty Kanban', key: 'qty_kanban', align: 'end' as const },
    { title: 'Qty Pallet', key: 'qty_pallet', align: 'end' as const },
    { title: 'Count Pallet', key: 'count_pallet', align: 'end' as const },
    { title: 'Pcs/Day', key: 'pcs_day', align: 'end' as const },
    { title: 'Lot Size Shift', key: 'lot_size_shift', align: 'end' as const },
    { title: 'C/T (sec)', key: 'cycle_time_sec', align: 'center' as const },
    { title: 'TPT (mnt)', key: 'tpt', align: 'end' as const },
    { title: 'Aksi / Detail', key: 'action', align: 'center' as const }
  ];

  let timeHeaders: any[] = [];
  if (tab === 'A' || tab === 'C') {
    timeHeaders = shift1Headers;
  } else if (tab === 'B' || tab === 'D') {
    timeHeaders = shift2Headers;
  } else {
    timeHeaders = [...shift1Headers, ...shift2Headers];
  }

  return [...baseHeaders, ...timeHeaders, ...tailHeaders];
};

const headers = [
  { title: 'Urutan', key: 'urutan', align: 'center' as const },
  { title: 'Part Number', key: 'part_number', align: 'start' as const },
  { title: 'Job Number', key: 'job_number', align: 'start' as const },
  { title: 'Part Name', key: 'part_name', align: 'start' as const },
  { title: 'Model', key: 'model', align: 'center' as const },
  { title: 'Mesin', key: 'machine', align: 'center' as const },
  { title: 'Proses', key: 'process', align: 'center' as const },
  { title: 'Jam Start (Shift 1)', key: 'time_proc_start', align: 'center' as const },
  { title: 'Jam End (Shift 1)', key: 'time_proc_end', align: 'center' as const },
  { title: 'Jam Start (Shift 2)', key: 'time_proc_start_shift2', align: 'center' as const },
  { title: 'Jam End (Shift 2)', key: 'time_proc_end_shift2', align: 'center' as const },
  { title: 'Lot Cycle', key: 'lot_cycle', align: 'center' as const },
  { title: 'Patan', key: 'patan', align: 'center' as const },
  { title: 'Qty Kanban', key: 'qty_kanban', align: 'end' as const },
  { title: 'Qty Pallet', key: 'qty_pallet', align: 'end' as const },
  { title: 'Count Pallet', key: 'count_pallet', align: 'end' as const },
  { title: 'Pcs/Day', key: 'pcs_day', align: 'end' as const },
  { title: 'Lot Size Shift', key: 'lot_size_shift', align: 'end' as const },
  { title: 'C/T (sec)', key: 'cycle_time_sec', align: 'center' as const },
  { title: 'TPT (mnt)', key: 'tpt', align: 'end' as const },
  { title: 'Aksi / Detail', key: 'action', align: 'center' as const }
];

const currentHeaders = computed(() => {
  return getPatanHeadersForTab(activeTab.value);
});

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
  let rawList: any[] = [];
  if (!patanData.value) return [];
  if (activeTab.value === 'ALL') {
    rawList = patanData.value.all_parts || [];
  } else {
    rawList = patanData.value.groups?.[activeTab.value] || [];
  }
  const unique = new Set(rawList.map(item => String(item[key] ?? '-')));
  return Array.from(unique).sort();
};

const isAllExcelItemsChecked = (key: string) => {
  const allItems = getExcelUniqueItems(key);
  const checked = excelCheckedFilters.value[key] || [];
  return allItems.length > 0 && checked.length === allItems.length;
};

const toggleExcelSelectAll = (key: string) => {
  const allItems = getExcelUniqueItems(key);
  if (isAllExcelItemsChecked(key)) {
    excelCheckedFilters.value[key] = [];
  } else {
    excelCheckedFilters.value[key] = [...allItems];
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

const currentList = computed(() => {
  let list: any[] = [];
  if (!patanData.value) return [];
  if (activeTab.value === 'ALL') {
    list = [...(patanData.value.all_parts || [])];
  } else {
    list = [...(patanData.value.groups?.[activeTab.value] || [])];
  }

  // 1. Global search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter((item: any) => 
      Object.values(item).some(val => 
        String(val || '').toLowerCase().includes(q)
      )
    );
  }

  // 2. Column checkbox filters & column search filters
  headers.forEach(h => {
    const key = h.key;
    const checked = excelCheckedFilters.value[key] || [];
    const search = (excelSearchQueries.value[key] || '').toLowerCase().trim();

    if (checked.length > 0) {
      list = list.filter(item => checked.includes(String(item[key] ?? '-')));
    }

    if (search) {
      list = list.filter(item => String(item[key] ?? '').toLowerCase().includes(search));
    }
  });

  // 3. Column sorting
  if (sortKey.value) {
    const key = sortKey.value;
    list.sort((a, b) => {
      let valA = a[key] ?? '';
      let valB = b[key] ?? '';

      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        valA = numA;
        valB = numB;
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortDir.value === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    list.sort((a: any, b: any) => {
      const mcA = String(a.machine || a.machine_use || '').toLowerCase();
      const mcB = String(b.machine || b.machine_use || '').toLowerCase();
      if (mcA !== mcB) return mcA < mcB ? -1 : 1;
      const uA = Number(a.urutan || 9999);
      const uB = Number(b.urutan || 9999);
      if (uA !== uB) return uA - uB;
      return String(a.part_number || '').localeCompare(String(b.part_number || ''));
    });
  }

  return list;
});

// Summary Aggregation for the 4 Patan Columns (A, B, C, D) for the entire Line
const patanSummaryData = computed(() => {
  const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  if (patanData.value && patanData.value.summary_patan) {
    const sp = patanData.value.summary_patan;
    return keys.map((key) => {
      const item = sp[key] || {};
      return {
        code: key,
        label: item.label || `PATAN ${key}`,
        sublabel: item.sublabel || (key === 'A' ? 'Shift 1 H1' : key === 'B' ? 'Shift 2 H1' : key === 'C' ? 'Shift 1 H2' : 'Shift 2 H2'),
        downtime: Number(item.downtime || 0),
        tc: Number(item.tc || 0),
        dandori: Number(item.dandori || 0),
        teiryo: Number(item.teiryo || 0),
        teiki: Number(item.teiki || item.prod_time || 0),
        tpt_jam: Number(item.tpt || 0),
        uph: Number(item.uph || 0),
        item: Number(item.count || 0)
      };
    });
  }

  const groups = patanData.value?.groups || { A: [], B: [], C: [], D: [] };

  return keys.map((key) => {
    const list = groups[key] || [];
    let dandori_jam = 0;
    let downtime_jam = 0;
    let tc_jam = 0;
    let tpt_jam = 0;
    let prod_time_jam = 0;
    let total_uph = 0;

    list.forEach((p: any) => {
      dandori_jam += Number(p.dandori || 0) > 24 ? Number(p.dandori || 0) / 60 : Number(p.dandori || 0);
      downtime_jam += Number(p.downtime || 0) > 24 ? Number(p.downtime || 0) / 60 : Number(p.downtime || 0);
      tc_jam += Number(p.tip_change || p.tc || 0) > 24 ? Number(p.tip_change || p.tc || 0) / 60 : Number(p.tip_change || p.tc || 0);
      tpt_jam += Number(p.tpt || 0) > 24 ? Number(p.tpt || 0) / 60 : Number(p.tpt || 0);
      prod_time_jam += Number(p.prod_time || 0) > 24 ? Number(p.prod_time || 0) / 60 : Number(p.prod_time || 0);
      total_uph += Number(p.uph || 0);
    });

    const teiki_jam = prod_time_jam > 0 ? prod_time_jam : Math.max(0, tpt_jam - downtime_jam - dandori_jam - tc_jam);

    return {
      code: key,
      label: `PATAN ${key}`,
      sublabel: key === 'A' ? 'Shift 1 H1' : key === 'B' ? 'Shift 2 H1' : key === 'C' ? 'Shift 1 H2' : 'Shift 2 H2',
      downtime: downtime_jam,
      tc: tc_jam,
      dandori: dandori_jam,
      teiryo: 0,
      teiki: teiki_jam,
      tpt_jam: tpt_jam,
      uph: total_uph,
      item: list.length
    };
  });
});

const renderPatanChart = () => {
  if (!highchartContainer.value || !patanSummaryData.value) return;

  const data = patanSummaryData.value;
  const categories = data.map(d => d.label || `PATAN ${d.code}`);

  const downtimeData = data.map(d => Number(d.downtime.toFixed(2)));
  const tcData = data.map(d => Number(d.tc.toFixed(2)));
  const dandoriData = data.map(d => Number(d.dandori.toFixed(2)));
  const teiryoData = data.map(d => Number(d.teiryo.toFixed(2)));
  const teikiData = data.map(d => Number(d.teiki.toFixed(2)));
  const uphData = data.map(d => Number((d.uph || 0).toFixed(1)));

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

  hcChart = (Highcharts as any).chart(highchartContainer.value, {
    chart: {
      type: 'column',
      height: 380,
      marginTop: 40,
      marginBottom: 30,
      marginLeft: leftColW.value,
      marginRight: rightColW.value,
      events: {
        render: function () {
          const chart = this as any;
          chartPixelWidth.value = chart.chartWidth;
          const xAxis = chart.xAxis[0];
          const newWidths: number[] = [];
          const ticks = xAxis.ticks;
          const tickPositions = xAxis.tickPositions || [];

          if (tickPositions.length > 0) {
            for (let i = 0; i < tickPositions.length - 1; i++) {
              const currentTick = ticks[tickPositions[i]];
              const nextTick = ticks[tickPositions[i + 1]];
              if (currentTick && nextTick && currentTick.mark && nextTick.mark) {
                const currentMark = currentTick.mark.element as any;
                const nextMark = nextTick.mark.element as any;
                if (currentMark && nextMark && typeof currentMark.x === 'number' && typeof nextMark.x === 'number') {
                  const w = nextMark.x - currentMark.x;
                  newWidths.push(Math.abs(w));
                }
              }
            }
            if (newWidths.length > 0) {
              const lastWidth = newWidths[newWidths.length - 1];
              newWidths.push(lastWidth);
            }
          }
          if (newWidths.length > 0 && JSON.stringify(colWidths.value) !== JSON.stringify(newWidths)) {
            colWidths.value = newWidths;
            tableKey.value += 1;
          }
        }
      }
    },
    title: {
      text: `LIVE Summary Beban TPT Per Patan - Line ${selectedLine.value}`,
      style: { fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }
    },
    subtitle: {
      text: 'Total Beban TPT (Jam) Per Kelompok Shift Patan (A, B, C, D)',
      style: { fontSize: '12px', color: '#64748b' }
    },
    xAxis: {
      categories: categories,
      labels: {
        style: { fontSize: '12px', fontWeight: 'bold', color: '#333' }
      },
      tickWidth: 1,
      tickmarkPlacement: 'on'
    },
    yAxis: [
      {
        min: 0,
        title: {
          text: 'TPT / SHIFT (JAM)',
          style: { fontWeight: 'bold', color: '#000000' }
        },
        lineWidth: 1.5,
        lineColor: '#000000',
        tickWidth: 1,
        tickColor: '#000000',
        plotLines: [
          { value: 8, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '8h', style: { color: '#1a237e', fontWeight: 'bold' } } },
          { value: 11, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '11h', style: { color: '#f44336', fontWeight: 'bold' } } },
          { value: 16, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '16h', style: { color: '#1a237e', fontWeight: 'bold' } } },
          { value: 21, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '21h', style: { color: '#f44336', fontWeight: 'bold' } } }
        ],
        stackLabels: {
          enabled: true,
          style: {
            fontWeight: 'bold',
            color: '#333333'
          },
          formatter: function(this: any): string {
            return this.total ? this.total.toFixed(2) + 'h' : '';
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
        borderRadius: 4
      }
    },
    series: series as any,
    credits: { enabled: false }
  });
};

const selectedSimulationId = ref<number | string | null>(null);

const fetchLines = async () => {
  try {
    linesLoading.value = true;
    const res = await getPatanLines(selectedArea.value, selectedSimulationId.value || undefined);
    if (res.data && res.data.status === 'success') {
      lineOptions.value = res.data.data || [];
      if (!selectedLine.value && lineOptions.value.length > 0) {
        const routeLine = (route.query.line as string) || (route.params.line as string);
        if (routeLine && lineOptions.value.includes(routeLine)) {
          selectedLine.value = routeLine;
        } else {
          selectedLine.value = lineOptions.value[0];
        }
      }
    }
  } catch (err: any) {
    console.error('Error fetching patan lines:', err);
  } finally {
    linesLoading.value = false;
  }
};

const fetchPatanData = async () => {
  if (!selectedLine.value) return;
  try {
    loading.value = true;
    resetAllExcelFilters();
    const res = await getPatanByLine(selectedLine.value, selectedArea.value, selectedSimulationId.value || undefined);
    if (res && res.data && res.data.status === 'success' && res.data.data) {
      patanData.value = res.data.data;
      setTimeout(() => {
        renderPatanChart();
      }, 100);
    } else if (res && res.data && (res.data.groups || res.data.all_parts)) {
      patanData.value = res.data;
      setTimeout(() => {
        renderPatanChart();
      }, 100);
    } else {
      notificationStore.showDialogWarning('Warning', res?.data?.message || 'Gagal memuat data Patan Line');
    }
  } catch (err: any) {
    console.error('Error fetching patan by line:', err);
    notificationStore.showDialogError('Error', err.response?.data?.message || err.message || 'Terjadi kesalahan sistem');
  } finally {
    loading.value = false;
  }
};

watch(selectedLine, (newLine) => {
  if (newLine) {
    router.replace({ query: { ...route.query, line: newLine } });
    fetchPatanData();
  }
});

watch(activeTab, () => {
  resetAllExcelFilters();
});

onMounted(async () => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);

  const routeArea = route.query.area as string;
  if (routeArea) selectedArea.value = routeArea;
  const routeLine = (route.query.line as string) || (route.params.line as string);
  if (routeLine) selectedLine.value = routeLine;
  const routeSimId = (route.query.id_simulation as string) || (route.query.id as string) || (route.params.id as string) || (route.params.id_simulation as string);
  if (routeSimId) selectedSimulationId.value = routeSimId;

  await fetchLines();
  if (selectedLine.value) {
    await fetchPatanData();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
  if (hcChart) {
    hcChart.destroy();
  }
});
</script>

<template>
  <div class="page-wrapper pa-6">
    <!-- Top Header Filter Card (MDFO Style) -->
    <v-card class="pa-6 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="d-flex align-center">
          <v-btn
            icon="mdi-arrow-left"
            variant="text"
            color="primary"
            class="mr-2"
            @click="router.back()"
          ></v-btn>
          <div>
            <div class="text-h5 font-weight-medium mb-1">
              Patan Produksi Per Line Monitoring
            </div>
            <div class="text-body-2 text-grey-darken-1">
              Visualisasi jadwal produksi part, summary beban jam kerja per Patan (A, B, C, D), dan filter detail.
            </div>
          </div>
        </div>

        <div style="min-width: 250px;">
          <v-select
            v-model="selectedLine"
            :items="lineOptions"
            label="Pilih Line Mesin"
            variant="outlined"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-factory"
            :loading="linesLoading"
          >
            <template #no-data>
              <div class="pa-2 text-caption text-grey">Tidak ada line ditemukan</div>
            </template>
          </v-select>
        </div>
      </div>
    </v-card>

    <!-- KPI Summary Cards -->
    <v-row dense class="mb-6">
      <v-col cols="6" sm="3" md="3">
        <v-card class="pa-4 rounded-xl elevation-2 text-center bg-white cursor-pointer border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;" :class="{ 'border-indigo border-md bg-indigo-lighten-5': activeTab === 'A' }" @click="activeTab = 'A'">
          <div class="text-caption text-indigo-darken-3 font-weight-bold">PATAN A</div>
          <div class="text-h4 font-weight-bold text-indigo my-1">{{ patanData.summary.patan_a_count }}</div>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3" md="3">
        <v-card class="pa-4 rounded-xl elevation-2 text-center bg-white cursor-pointer border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;" :class="{ 'border-teal border-md bg-teal-lighten-5': activeTab === 'B' }" @click="activeTab = 'B'">
          <div class="text-caption text-teal-darken-3 font-weight-bold">PATAN B</div>
          <div class="text-h4 font-weight-bold text-teal my-1">{{ patanData.summary.patan_b_count }}</div>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3" md="3">
        <v-card class="pa-4 rounded-xl elevation-2 text-center bg-white cursor-pointer border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;" :class="{ 'border-amber-darken-3 border-md bg-amber-lighten-5': activeTab === 'C' }" @click="activeTab = 'C'">
          <div class="text-caption text-amber-darken-4 font-weight-bold">PATAN C</div>
          <div class="text-h4 font-weight-bold text-amber-darken-3 my-1">{{ patanData.summary.patan_c_count }}</div>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3" md="3">
        <v-card class="pa-4 rounded-xl elevation-2 text-center bg-white cursor-pointer border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;" :class="{ 'border-deep-orange border-md bg-deep-orange-lighten-5': activeTab === 'D' }" @click="activeTab = 'D'">
          <div class="text-caption text-deep-orange-darken-3 font-weight-bold">PATAN D</div>
          <div class="text-h4 font-weight-bold text-deep-orange my-1">{{ patanData.summary.patan_d_count }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- LIVE Dashboard & Summary Table Section (MDFO Style Card) -->
    <v-card class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;" ref="wrapperRef">
      <div class="d-flex justify-space-between align-center mb-3">
        <div class="text-h5 text-primary font-weight-medium">
          Grafik & Summary Ringkas Beban Patan Line {{ selectedLine }}
        </div>
      </div>

      <!-- Legend (Matched with Live Simulation colors) -->
      <div class="d-flex flex-wrap justify-center gap-6 mb-3">
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #d50000; border-radius: 2px;"></div> <span class="text-caption font-weight-bold">DOWNTIME</span></div>
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #fbc02d; border-radius: 2px;"></div> <span class="text-caption font-weight-bold">T/C</span></div>
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #00a2ff; border-radius: 2px;"></div> <span class="text-caption font-weight-bold">DANDORI</span></div>
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #800080; border-radius: 2px;"></div> <span class="text-caption font-weight-bold">TEIRYO</span></div>
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #005db9; border-radius: 2px;"></div> <span class="text-caption font-weight-bold">WELD TIME</span></div>
      </div>

      <!-- Highcharts Container -->
      <div v-if="loading" class="d-flex justify-center align-center py-10" style="min-height: 300px;">
        <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
        <span class="ml-3 text-body-2 text-grey-darken-1">Menyiapkan Grafik Summary Patan...</span>
      </div>
      <div v-else ref="highchartContainer" style="height: 380px; width: 100%;"></div>

      <!-- Summary Table Aligned with Chart Columns -->
      <div
        v-if="colWidths.length > 0 && !loading"
        class="mt-2 w-100 overflow-x-auto custom-scrollbar pb-2"
      >
        <div :style="tableContainerStyle" class="overflow-hidden border rounded border-grey-lighten-2 text-caption">
          
          <template v-for="(rowConfig, rIdx) in [
            { label: 'DOWNTIME (Jam)', key: 'downtime' },
            { label: 'T/C (Jam)', key: 'tc' },
            { label: 'DANDORI (Jam)', key: 'dandori' },
            { label: 'TEIRYO (Jam)', key: 'teiryo' },
            { label: 'WELD TIME (Jam)', key: 'teiki' },
            { label: 'Hour/Day (TPT Jam)', key: 'tpt_jam' },
            { label: 'WT 1 SHIFT', key: 'wt_1_shift' },
            { label: 'WT 1 SHIFT + PJK', key: 'wt_1_shift_pjk' },
            { label: 'WT 2 SHIFT', key: 'wt_2_shift' },
            { label: 'WT 2 SHIFT + PJK', key: 'wt_2_shift_pjk' },
            { label: 'JUMLAH ITEM (PART)', key: 'item' }
          ]" :key="rIdx">
            <div class="d-flex border-b border-grey-lighten-2 hover-bg-grey">
              <!-- Label Column -->
              <div 
                class="flex-shrink-0 d-flex align-center px-2 border-r border-grey-lighten-2 font-weight-bold"
                :style="{ width: leftColW + 'px', minHeight: '26px' }"
              >
                <div v-if="rowConfig.key === 'downtime'" style="width: 8px; height: 8px; background: #d50000; margin-right: 4px;"></div>
                <div v-else-if="rowConfig.key === 'tc'" style="width: 8px; height: 8px; background: #fbc02d; margin-right: 4px;"></div>
                <div v-else-if="rowConfig.key === 'dandori'" style="width: 8px; height: 8px; background: #00a2ff; margin-right: 4px;"></div>
                <div v-else-if="rowConfig.key === 'teiki'" style="width: 8px; height: 8px; background: #005db9; margin-right: 4px;"></div>
                <div v-else-if="rowConfig.key === 'teiryo'" style="width: 8px; height: 8px; background: #800080; margin-right: 4px;"></div>
                <div v-else-if="['wt_1_shift', 'wt_2_shift'].includes(rowConfig.key)" style="width: 14px; height: 3px; background: #1a237e; margin-right: 6px; border-radius: 1px; flex-shrink: 0;"></div>
                <div v-else-if="['wt_1_shift_pjk', 'wt_2_shift_pjk'].includes(rowConfig.key)" style="width: 14px; height: 3px; background: #f44336; margin-right: 6px; border-radius: 1px; flex-shrink: 0;"></div>
                {{ rowConfig.label }}
              </div>
              
              <!-- Data Columns (4 Patans) -->
              <div class="d-flex flex-1-1 min-w-0">
                <div
                  v-for="(item, i) in patanSummaryData"
                  :key="i"
                  class="d-flex align-center justify-center border-r border-grey-lighten-2 overflow-hidden text-center"
                  :style="getColumnStyle(i)"
                  :class="{'font-weight-bold text-primary': rowConfig.key === 'tpt_jam'}"
                >
                  <template v-if="rowConfig.key === 'teiki'">
                    {{ item.teiki.toFixed(1) }}
                  </template>
                  <template v-else-if="['downtime', 'dandori', 'tc', 'teiryo', 'tpt_jam'].includes(rowConfig.key)">
                    {{ Number(item[rowConfig.key as keyof typeof item] || 0).toFixed(1) }}
                  </template>
                  <template v-else-if="rowConfig.key === 'wt_1_shift'">
                    8
                  </template>
                  <template v-else-if="rowConfig.key === 'wt_1_shift_pjk'">
                    11
                  </template>
                  <template v-else-if="rowConfig.key === 'wt_2_shift'">
                    16
                  </template>
                  <template v-else-if="rowConfig.key === 'wt_2_shift_pjk'">
                    21
                  </template>
                  <template v-else-if="rowConfig.key === 'item'">
                    {{ item.item }}
                  </template>
                </div>
              </div>

              <!-- Right Spacer -->
              <div class="flex-shrink-0" :style="{ width: rightColW + 'px' }"></div>
            </div>
          </template>

        </div>
      </div>
    </v-card>

    <!-- Main Content Table Card (MDFO Style Card) -->
    <v-card class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
      <div class="text-h5 text-primary font-weight-medium mb-4">
        Detail Schedule Part Per Patan Line {{ selectedLine }}
      </div>

      <!-- Tabs Bar -->
      <div class="d-flex flex-wrap align-center justify-space-between mb-3 border-b bg-grey-lighten-5 pa-2 rounded-xl gap-2">
        <v-tabs v-model="activeTab" density="compact" color="primary">
          <v-tab value="A">PATAN A ({{ patanData.summary.patan_a_count || 0 }})</v-tab>
          <v-tab value="B">PATAN B ({{ patanData.summary.patan_b_count || 0 }})</v-tab>
          <v-tab value="C">PATAN C ({{ patanData.summary.patan_c_count || 0 }})</v-tab>
          <v-tab value="D">PATAN D ({{ patanData.summary.patan_d_count || 0 }})</v-tab>
          <v-tab value="ALL">Semua Part ({{ patanData.summary.total_parts || 0 }})</v-tab>
        </v-tabs>
      </div>

      <!-- Filter Guidance & Global Search Bar -->
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-caption text-grey d-flex align-center">
          <v-icon size="16" class="mr-1">mdi-filter-cog</v-icon>
          <span>Klik judul kolom pada tabel untuk memfilter / mengurutkan data.</span>
          <v-btn v-if="isAnyExcelFilterActive" size="x-small" color="red" variant="text" class="ml-2 text-none" @click="resetAllExcelFilters">
            Reset Semua Filter Kolom
          </v-btn>
        </div>
        <div style="width: 300px;">
          <v-text-field
            v-model="searchQuery"
            placeholder="Cari data global..."
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
          />
        </div>
      </div>

      <!-- Data Table with Header Sorting & Menu Filtering -->
      <v-data-table
        :headers="currentHeaders"
        :items="currentList"
        :loading="loading"
        density="compact"
        class="elevation-1 rounded-xl patan-table text-body-2"
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
              <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
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
                      v-for="item in getExcelUniqueItems(col.key || '')"
                      :key="item"
                      :label="item || '-'"
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
            </th>
          </tr>
        </template>

        <template #item="{ item }">
          <tr class="hover-row text-body-2 text-black" style="color: #000000 !important;">
            <td class="text-center font-weight-bold">{{ (item.raw || item).urutan || (item.raw || item).urutan_simulasi || (item.raw || item).urutan_priority || '-' }}</td>
            <td class="text-start font-weight-bold">{{ (item.raw || item).part_number }}</td>
            <td class="text-start">{{ (item.raw || item).job_number || '-' }}</td>
            <td class="text-start">{{ (item.raw || item).part_name || '-' }}</td>
            <td class="text-center">
              <span>{{ (item.raw || item).model || '-' }}</span>
            </td>
            <td class="text-center font-weight-medium">
              <span>{{ (item.raw || item).machine || '-' }}</span>
            </td>
            <td class="text-center">{{ (item.raw || item).process || (item.raw || item).op || '-' }}</td>
            <td v-if="activeTab === 'A' || activeTab === 'C' || activeTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ (item.raw || item).time_proc_start || '-' }}</td>
            <td v-if="activeTab === 'A' || activeTab === 'C' || activeTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ (item.raw || item).time_proc_end || '-' }}</td>
            <td v-if="activeTab === 'B' || activeTab === 'D' || activeTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ (item.raw || item).time_proc_start_shift2 || '-' }}</td>
            <td v-if="activeTab === 'B' || activeTab === 'D' || activeTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ (item.raw || item).time_proc_end_shift2 || '-' }}</td>
            <td class="text-center font-weight-medium">{{ (item.raw || item).lot_cycle || '1' }}</td>
            <td class="text-center font-weight-medium">
              <span>{{ (item.raw || item).patan || (Number((item.raw || item).lot_cycle) <= 1 ? 'A B C D' : 'A C') }}</span>
            </td>
            <td class="text-end">{{ (item.raw || item).qty_kanban || '0' }}</td>
            <td class="text-end">{{ (item.raw || item).qty_pallet || '-' }}</td>
            <td class="text-end font-weight-medium">{{ (item.raw || item).count_pallet !== undefined && (item.raw || item).count_pallet !== null && (item.raw || item).count_pallet !== '' && (item.raw || item).count_pallet !== '0.00' ? Number((item.raw || item).count_pallet).toFixed(1) : (Number((item.raw || item).qty_kanban) > 0 && Number((item.raw || item).lot_size_shift) > 0 ? (Number((item.raw || item).lot_size_shift) / Number((item.raw || item).qty_kanban)).toFixed(1) : '0') }}</td>
            <td class="text-end font-weight-bold cursor-pointer" @click="openPcsDayDetailModal(item.raw || item)" title="Klik untuk melihat rincian Pcs/Day (Part Delivery)"><span>{{ (item.raw || item).pcs_day || '0' }}</span><v-icon size="12" class="ml-1 opacity-60">mdi-information-outline</v-icon></td>
            <td class="text-end font-weight-medium">{{ (item.raw || item).lot_size_shift || '0' }}</td>
            <td class="text-center">{{ (item.raw || item).cycle_time_sec || '0' }}</td>
            <td class="text-end font-weight-bold">{{ (item.raw || item).tpt_menit !== undefined ? Number((item.raw || item).tpt_menit).toFixed(1) : ((item.raw || item).tpt ? Number((item.raw || item).tpt).toFixed(1) : '0') }}</td>
            <td class="text-center">
              <v-btn size="x-small" color="primary" variant="flat" prepend-icon="mdi-information-outline" class="font-weight-bold" @click="openStatusPatanDetailModal(item.raw || item)">Detail</v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>
    <!-- Dialog Rincian Sub-Part (Status Patan DETAIL) -->
    <v-dialog v-model="isStatusPatanDetailModalOpen" max-width="1100px" scrollable>
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center py-2 px-4" style="background-color: rgb(3, 69, 161) !important; min-height: 42px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="20">mdi-layers-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Rincian Sub-Part Input (Status Patan: DETAIL)</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" density="compact" size="small" @click="isStatusPatanDetailModalOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-4" style="max-height: 75vh;">
          <div v-if="statusPatanDetailItem" class="mb-4 bg-grey-lighten-4 pa-3 rounded border">
            <v-row density="compact">
              <v-col cols="12" sm="4">
                <div class="text-caption text-grey-darken-1 font-weight-bold">Part Number (MAIN)</div>
                <div class="font-weight-bold text-subtitle-2 text-black" style="color: #000000 !important;">{{ formatPartNumber(statusPatanDetailItem.part_number) }}</div>
              </v-col>
              <v-col cols="12" sm="3">
                <div class="text-caption text-grey-darken-1 font-weight-bold">Proses & Mesin</div>
                <div class="font-weight-medium text-body-2">
                  Proses {{ statusPatanDetailItem.process || '-' }} | <span class="font-weight-bold text-primary">{{ statusPatanDetailItem.machine_use || statusPatanDetailItem.machine || '-' }}</span>
                </div>
              </v-col>
              <v-col cols="12" sm="3">
                <div class="text-caption text-grey-darken-1 font-weight-bold">Part Name</div>
                <div class="font-weight-medium text-body-2 text-truncate">{{ statusPatanDetailItem.part_name || '-' }}</div>
              </v-col>
              <v-col cols="12" sm="2" class="text-sm-right d-flex align-center justify-sm-end">
                <v-chip color="info" size="small" variant="flat" class="font-weight-bold">
                  {{ statusPatanDetailList.length }} Sub-Part
                </v-chip>
              </v-col>
            </v-row>
          </div>

          <div v-if="statusPatanDetailLoading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
            <div class="text-caption text-grey-darken-1 mt-2">Memuat rincian sub-part status DETAIL...</div>
          </div>

          <div v-else-if="statusPatanDetailList && statusPatanDetailList.length > 0">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 font-weight-bold text-grey-darken-3">
                Daftar Sub-Part Input (DETAIL):
              </div>
              <div class="text-caption text-grey-darken-1">
                *Baris-baris ini merupakan input aktual per item yang kemudian diagregasi menjadi 1 baris MAIN.
              </div>
            </div>
            
            <div style="overflow-x: auto;">
              <v-table density="compact" class="border rounded custom-table">
                <thead>
                  <tr style="background-color: #eef2f7;">
                    <th class="text-center font-weight-bold" style="width: 40px;">No</th>
                    <th class="text-left font-weight-bold">Part Number</th>
                    <th class="text-center font-weight-bold">Proses</th>
                    <th class="text-right font-weight-bold">Pcs / Day</th>
                    <th class="text-right font-weight-bold">Qty Kanban</th>
                    <th class="text-right font-weight-bold">Qty Pallet</th>
                    <th class="text-center font-weight-bold">Lot Cycle</th>
                    <th class="text-right font-weight-bold">Lotsize/Shift</th>
                    <th class="text-right font-weight-bold">Count Pallet</th>
                    <th class="text-right font-weight-bold">CT (s)</th>
                    <th class="text-right font-weight-bold">Prod Time (m)</th>
                    <th class="text-right font-weight-bold">Dandori (m)</th>
                    <th class="text-right font-weight-bold">Downtime (m)</th>
                    <th class="text-right font-weight-bold">TPT (m)</th>
                    <th class="text-right font-weight-bold">Stroke/Day</th>
                    <th class="text-center font-weight-bold">Patan</th>
                    <th class="text-center font-weight-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(sub, sIdx) in statusPatanDetailList" :key="sIdx">
                    <td class="text-center">{{ sIdx + 1 }}</td>
                    <td class="text-left font-weight-bold text-black" style="white-space: nowrap; color: #000000 !important;">
                      {{ formatPartNumber(sub.part_number) }}
                    </td>
                    <td class="text-center">{{ sub.process || '-' }}</td>
                    <td class="text-right font-weight-medium">{{ Number(sub.pcs_day || 0).toLocaleString() }}</td>
                    <td class="text-right">{{ sub.qty_kanban || sub.qty_kbn || '-' }}</td>
                    <td class="text-right">{{ sub.qty_pallet || '-' }}</td>
                    <td class="text-center">{{ sub.lot_cycle || '1' }}</td>
                    <td class="text-right font-weight-medium">{{ Number(sub.lot_size_shift || 0).toLocaleString() }}</td>
                    <td class="text-right font-weight-medium">{{ sub.count_pallet !== undefined && sub.count_pallet !== null && sub.count_pallet !== '' && sub.count_pallet !== '0.00' ? Number(sub.count_pallet).toFixed(1) : (Number(sub.qty_kanban || sub.qty_kbn) > 0 && Number(sub.lot_size_shift) > 0 ? (Number(sub.lot_size_shift) / Number(sub.qty_kanban || sub.qty_kbn)).toFixed(1) : '0') }}</td>
                    <td class="text-right">{{ sub.cycle_time_sec || '0' }}</td>
                    <td class="text-right font-weight-medium">{{ Number(sub.prod_time || 0).toFixed(2) }}</td>
                    <td class="text-right text-grey-darken-1">{{ Number(sub.dandori || 0).toFixed(2) }}</td>
                    <td class="text-right text-grey-darken-1">{{ Number(sub.downtime || 0).toFixed(2) }}</td>
                    <td class="text-right font-weight-bold">{{ Number(sub.tpt || sub.prod_time || 0).toFixed(2) }}</td>
                    <td class="text-right">{{ Number(sub.stroke_day || 0).toLocaleString() }}</td>
                    <td class="text-center">{{ sub.patan || '-' }}</td>
                    <td class="text-center">
                      <v-chip size="x-small" color="teal" variant="flat" class="font-weight-bold">
                        {{ sub.status_patan || 'DETAIL' }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background-color: #f1f5f9;" class="font-weight-bold">
                    <td colspan="3" class="text-right">Total Sub-Part:</td>
                    <td class="text-right font-weight-bold">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.pcs_day) || 0), 0).toLocaleString() }}</td>
                    <td colspan="2"></td>
                    <td class="text-right font-weight-bold">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.lot_size_shift) || 0), 0).toLocaleString() }}</td>
                    <td></td>
                    <td></td>
                    <td class="text-right font-weight-bold">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.prod_time) || 0), 0).toFixed(2) }}</td>
                    <td colspan="2"></td>
                    <td class="text-right font-weight-bold">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.tpt || c.prod_time) || 0), 0).toFixed(2) }}</td>
                    <td class="text-right">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.stroke_day) || 0), 0).toLocaleString() }}</td>
                    <td colspan="2"></td>
                  </tr>
                </tfoot>
              </v-table>
            </div>
          </div>

          <div v-else class="text-center py-8 text-grey">
            <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-layers-off</v-icon>
            <div class="text-subtitle-2 font-weight-medium">Tidak ada rincian sub-part DETAIL terpisah untuk item ini.</div>
            <div class="text-caption text-grey-darken-1 mt-1">Item ini merupakan part tunggal yang langsung diproses di mesin.</div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-3 bg-grey-lighten-4 border-top justify-end">
          <v-btn color="primary" variant="flat" @click="isStatusPatanDetailModalOpen = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

    <!-- Dialog Detail Asal-Usul Pcs/Day (Breakdown Part Delivery) -->
    <v-dialog v-model="isPcsDayDetailModalOpen" max-width="700px">
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center py-1.5 px-4" style="background-color: rgb(3, 69, 161) !important; min-height: 36px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white">mdi-information-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Detail Asal-Usul Pcs/Day (Breakdown Part Delivery / Parent)</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="isPcsDayDetailModalOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-5">
          <div v-if="pcsDayDetailData" class="mb-4 bg-grey-lighten-4 pa-3 rounded border">
            <v-row density="compact">
              <v-col cols="12" sm="6">
                <div class="text-caption text-grey-darken-1">Part Number</div>
                <div class="font-weight-bold text-subtitle-1 text-primary">{{ formatPartNumber(pcsDayDetailData.part_number) }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-grey-darken-1">Part Name / Model</div>
                <div class="font-weight-medium">{{ pcsDayDetailData.part_name }} ({{ pcsDayDetailData.model }})</div>
              </v-col>
            </v-row>
          </div>

          <div v-if="pcsDayDetailLoading" class="text-center py-6">
            <v-progress-circular indeterminate color="primary" size="36"></v-progress-circular>
            <div class="text-caption text-grey-darken-1 mt-2">Memuat rincian part delivery...</div>
          </div>

          <div v-else-if="pcsDayDetailData && pcsDayDetailData.parents_detail && pcsDayDetailData.parents_detail.length > 0">
            <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-darken-3">
              Daftar Part Number Delivery (Parent Part):
            </div>
            <v-table density="compact" class="border rounded custom-table">
              <thead>
                <tr style="background-color: #eef2f7;">
                  <th class="text-center font-weight-bold" style="width: 50px;">No</th>
                  <th class="text-left font-weight-bold">Part Number Delivery / Parent</th>
                  <th class="text-left font-weight-bold">Model (ZMODEL)</th>
                  <th class="text-left font-weight-bold">Customer</th>
                  <th class="text-right font-weight-bold">Pcs / Day</th>
                  <th class="text-right font-weight-bold">Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, pIdx) in pcsDayDetailData.parents_detail" :key="pIdx">
                  <td class="text-center">{{ pIdx + 1 }}</td>
                  <td class="font-weight-bold text-primary">{{ p.part_number_delivery }}</td>
                  <td class="text-left font-weight-medium text-grey-darken-3">{{ p.zmodel || '-' }}</td>
                  <td class="text-left font-weight-medium text-grey-darken-3">{{ p.zcust || '-' }}</td>
                  <td class="text-right font-weight-bold">{{ Number(p.pcs_day).toLocaleString() }}</td>
                  <td class="text-right text-grey-darken-1">
                    {{ pcsDayDetailData.total_pcs_day > 0 ? ((Number(p.pcs_day) / pcsDayDetailData.total_pcs_day) * 100).toFixed(1) + '%' : '0%' }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="background-color: #f1f5f9;" class="font-weight-bold">
                  <td colspan="2" class="text-right">Total Pcs / Day:</td>
                  <td class="text-right text-primary" style="font-size: 13px;">{{ Number(pcsDayDetailData.total_pcs_day).toLocaleString() }}</td>
                  <td class="text-right text-primary">100%</td>
                </tr>
              </tfoot>
            </v-table>
          </div>

          <div v-else class="text-center py-6 text-grey">
            <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-alert-circle-outline</v-icon>
            <div>Tidak ada rincian Part Delivery yang terikat untuk part number ini.</div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 border-top justify-end">
          <v-btn color="primary" variant="flat" @click="isPcsDayDetailModalOpen = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<style scoped>
:deep(.v-card),
.v-card {
  border-radius: 14px !important;
}

.custom-table :deep(table) {
  border-collapse: collapse !important;
  border: 1.5px solid #94a3b8 !important;
  width: 100%;
}

.custom-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #000000 !important;
  font-weight: bold !important;
  text-transform: uppercase;
  font-size: 11px !important;
  padding: 5px 8px !important;
  border-bottom: 2px solid #94a3b8 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  white-space: nowrap;
}

.custom-table :deep(td) {
  padding: 5px 8px !important;
  font-size: 11.5px !important;
  border-bottom: 1px solid #cbd5e1 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  vertical-align: middle !important;
  color: #000000 !important;
}

.custom-table :deep(tfoot td) {
  background-color: #f1f5f9 !important;
  font-weight: bold !important;
  border-top: 2px solid #94a3b8 !important;
  border-bottom: 1.5px solid #94a3b8 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  padding: 5px 8px !important;
}

.custom-table :deep(tr:hover:not(.v-data-table__empty-wrapper)) {
  background-color: rgba(33, 150, 243, 0.06) !important;
}
.page-wrapper {
  min-height: 100vh;
}
.patan-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #333 !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  font-size: 11px !important;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.hover-row:hover {
  background-color: #f5f9ff !important;
}
.hover-header:hover {
  background-color: #e2e8f0;
  border-radius: 4px;
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
</style>
