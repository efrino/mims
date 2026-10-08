<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Highcharts from 'highcharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useNotificationStore } from '@/stores/notification';
import { 
  getSimulationList, 
  getSimulationGraphicSummary, 
  getSimulationPartById, 
  getAreaList 
} from '@/services/PCD/Welding/Simulation';
import { decryptId } from '@/utils/cryptoId';
import PartMovementHistoryModal from '@/components/welding/PartMovementHistoryModal.vue';

const isMovementHistoryOpen = ref(false);

const route = useRoute();
const router = useRouter();
const notificationStore = useNotificationStore();

const isSubAssy = computed(() => route.path.includes('subassy'));

// Selection state
const selectedArea = ref<string>(route.path.includes('subassy') ? 'SA ADM' : (route.query.area ? String(route.query.area) : 'WSS ADM'));
const areaOptions = ref<string[]>(route.path.includes('subassy') ? ['SA ADM'] : ['WSS ADM', 'WSS ASSY']);
const simulationList = ref<any[]>([]);
const listLoading = ref(false);

const selectedIdA = ref<number | string | null>(null);
const selectedIdB = ref<number | string | null>(null);
const dataLoading = ref(false);

// Scenarios Data
const simHeaderA = ref<any>(null);
const simHeaderB = ref<any>(null);
const summaryA = ref<any[]>([]);
const summaryB = ref<any[]>([]);
const partsA = ref<any[]>([]);
const partsB = ref<any[]>([]);

// Chart ref
const chartContainer = ref<HTMLElement | null>(null);
let comparisonChart: Highcharts.Chart | null = null;

// Filter state for Machine Delta Table
const machineFilterTab = ref<'all' | 'changed' | 'overloadA' | 'overloadB'>('all');
const machineSearch = ref('');
const machineViewMode = ref<'summary' | 'breakdown'>('summary');
const expandedMachines = ref<string[]>([]);

const toggleRowExpand = (machine: string) => {
  const idx = expandedMachines.value.indexOf(machine);
  if (idx > -1) {
    expandedMachines.value.splice(idx, 1);
  } else {
    expandedMachines.value.push(machine);
  }
};

const toggleExpandAll = () => {
  if (expandedMachines.value.length === filteredMachineRows.value.length) {
    expandedMachines.value = [];
  } else {
    expandedMachines.value = filteredMachineRows.value.map(m => m.machine);
  }
};

// Filter state for Part Relocation Table
const partSearch = ref('');

// Helpers
const monthNamesIndo = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatPeriodeIndo = (periode: any): string => {
  if (!periode) return '-';
  const str = String(periode).trim();
  if (/^d{6}$/.test(str)) {
    const year = str.substring(0, 4);
    const monthIdx = parseInt(str.substring(4, 6), 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) return `${monthNamesIndo[monthIdx]} ${year}`;
  }
  const parts = str.split(/[-/]/);
  if (parts.length === 2) {
    const [p1, p2] = parts;
    if (p1.length === 4) {
      const mIdx = parseInt(p2, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) return `${monthNamesIndo[mIdx]} ${p1}`;
    }
  }
  return str;
};

const formatNumber = (num: any, decimals = 1): string => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0';
  return Number(num).toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatHours = (hours: any): string => {
  if (hours === null || hours === undefined || isNaN(Number(hours))) return '0.0 Jam';
  return `${Number(hours).toFixed(1)} Jam`;
};

// Simulation options for Vuetify v-select
const simulationOptions = computed(() => {
  return simulationList.value.map((s: any) => ({
    id: s.id,
    title: `${formatPeriodeIndo(s.periode)} - ${s.note || 'Tanpa Catatan'} [${s.status || 'DRAFT'}]`
  }));
});

// Fetch simulation list based on area
const loadSimulationList = async () => {
  listLoading.value = true;
  try {
    const res = await getSimulationList(selectedArea.value);
    const list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
    simulationList.value = list;

    // Check query params if any
    const queryA = route.query.id_a ? decryptId(String(route.query.id_a)) || route.query.id_a : null;
    const queryB = route.query.id_b ? decryptId(String(route.query.id_b)) || route.query.id_b : null;

    if (queryA && list.some((s: any) => String(s.id) === String(queryA))) {
      selectedIdA.value = Number(queryA);
    } else if (list.length > 0) {
      selectedIdA.value = list[0].id;
    }

    if (queryB && list.some((s: any) => String(s.id) === String(queryB))) {
      selectedIdB.value = Number(queryB);
    } else if (list.length > 1) {
      selectedIdB.value = list[1].id;
    } else if (list.length === 1) {
      selectedIdB.value = list[0].id;
    }

    if (selectedIdA.value && selectedIdB.value) {
      await fetchScenarioData();
    }
  } catch (err) {
    console.error('Error loading simulation list:', err);
    notificationStore.showDialogError('Error', 'Gagal memuat daftar simulasi.');
  } finally {
    listLoading.value = false;
  }
};

// Fetch data for Scenario A and Scenario B
const fetchScenarioData = async () => {
  if (!selectedIdA.value || !selectedIdB.value) return;
  dataLoading.value = true;

  try {
    // Find headers from list
    simHeaderA.value = simulationList.value.find((s: any) => String(s.id) === String(selectedIdA.value)) || null;
    simHeaderB.value = simulationList.value.find((s: any) => String(s.id) === String(selectedIdB.value)) || null;

    const [resSumA, resSumB, resPartsA, resPartsB] = await Promise.all([
      getSimulationGraphicSummary(selectedIdA.value),
      getSimulationGraphicSummary(selectedIdB.value),
      getSimulationPartById(selectedIdA.value, 'ALL'),
      getSimulationPartById(selectedIdB.value, 'ALL')
    ]);

    summaryA.value = Array.isArray(resSumA?.data?.summary)
      ? resSumA.data.summary
      : (Array.isArray(resSumA?.data?.data) ? resSumA.data.data : (Array.isArray(resSumA?.data) ? resSumA.data : []));
    summaryB.value = Array.isArray(resSumB?.data?.summary)
      ? resSumB.data.summary
      : (Array.isArray(resSumB?.data?.data) ? resSumB.data.data : (Array.isArray(resSumB?.data) ? resSumB.data : []));

    partsA.value = Array.isArray(resPartsA?.data?.loads)
      ? resPartsA.data.loads
      : (Array.isArray(resPartsA?.data?.data) ? resPartsA.data.data : (Array.isArray(resPartsA?.data) ? resPartsA.data : []));
    partsB.value = Array.isArray(resPartsB?.data?.loads)
      ? resPartsB.data.loads
      : (Array.isArray(resPartsB?.data?.data) ? resPartsB.data.data : (Array.isArray(resPartsB?.data) ? resPartsB.data : []));

    if (!simHeaderA.value && resPartsA?.data?.header) {
      simHeaderA.value = resPartsA.data.header;
    }
    if (!simHeaderB.value && resPartsB?.data?.header) {
      simHeaderB.value = resPartsB.data.header;
    }
  } catch (err: any) {
    console.error('Error fetching comparison scenario data:', err);
    notificationStore.showDialogError('Error', 'Gagal memuat data komparasi skenario.');
  } finally {
    dataLoading.value = false;
    await nextTick();
    renderComparisonChart();
  }
};

// Swap Skenario A and Skenario B
const swapScenarios = () => {
  const temp = selectedIdA.value;
  selectedIdA.value = selectedIdB.value;
  selectedIdB.value = temp;
};

// Combined Machine Delta Rows
const machineDeltaRows = computed(() => {
  const machinesSet = new Set<string>();
  if (Array.isArray(summaryA.value)) {
    summaryA.value.forEach(m => m.machine && machinesSet.add(m.machine));
  }
  if (Array.isArray(summaryB.value)) {
    summaryB.value.forEach(m => m.machine && machinesSet.add(m.machine));
  }

  const sortedMachines = Array.from(machinesSet).sort((a, b) => 
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const mapA = new Map<string, any>();
  if (Array.isArray(summaryA.value)) {
    summaryA.value.forEach(m => mapA.set(m.machine, m));
  }

  const mapB = new Map<string, any>();
  if (Array.isArray(summaryB.value)) {
    summaryB.value.forEach(m => mapB.set(m.machine, m));
  }

  return sortedMachines.map(machine => {
    const itemA = mapA.get(machine) || {};
    const itemB = mapB.get(machine) || {};

    const tptA = Number(itemA.tpt || 0); // Hours
    const tptB = Number(itemB.tpt || 0); // Hours
    const deltaTpt = tptB - tptA; // Delta = B - A in hours

    // Breakdown components (in Hours)
    const teikiA = Number(itemA.prod_time_final > 0 ? itemA.prod_time_final : (itemA.prod_time || 0));
    const teikiB = Number(itemB.prod_time_final > 0 ? itemB.prod_time_final : (itemB.prod_time || 0));
    const deltaTeiki = teikiB - teikiA;

    const dandoriA = Number(itemA.dandori || 0);
    const dandoriB = Number(itemB.dandori || 0);
    const deltaDandori = dandoriB - dandoriA;

    const downtimeA = Number(itemA.downtime || 0);
    const downtimeB = Number(itemB.downtime || 0);
    const deltaDowntime = downtimeB - downtimeA;

    const tcA = Number(itemA.tip_change ?? itemA.tc ?? 0);
    const tcB = Number(itemB.tip_change ?? itemB.tc ?? 0);
    const deltaTc = tcB - tcA;

    const teiryoA = Number(itemA.teiryo || 0);
    const teiryoB = Number(itemB.teiryo || 0);
    const deltaTeiryo = teiryoB - teiryoA;

    const itemCountA = Number(itemA.item || 0);
    const itemCountB = Number(itemB.item || 0);
    const deltaItem = itemCountB - itemCountA;

    const pcsDayA = Number(itemA.pcs_day || 0);
    const pcsDayB = Number(itemB.pcs_day || 0);
    const deltaPcsDay = pcsDayB - pcsDayA;

    const uphA = Number(itemA.uph || 0);
    const uphB = Number(itemB.uph || 0);

    // Shift capacity in hours
    const capA = Number(itemA.wt_2_shift || itemA.wt_1_shift || 16);
    const capB = Number(itemB.wt_2_shift || itemB.wt_1_shift || 16);

    const pctA = capA > 0 ? (tptA / capA) * 100 : 0;
    const pctB = capB > 0 ? (tptB / capB) * 100 : 0;
    const deltaPct = pctB - pctA;

    const isOverloadA = pctA > 100;
    const isOverloadB = pctB > 100;

    let statusText = 'Tetap';
    let statusChipColor = 'default';

    if (Math.abs(deltaTpt) < 0.05) {
      statusText = 'Beban Sama';
      statusChipColor = 'grey-lighten-2';
    } else if (deltaTpt < 0) {
      statusText = `Turun ${Math.abs(deltaTpt).toFixed(1)} Jam`;
      statusChipColor = 'success';
    } else {
      statusText = `Naik ${deltaTpt.toFixed(1)} Jam`;
      statusChipColor = 'warning';
    }

    return {
      machine,
      capA,
      capB,
      tptA,
      tptB,
      deltaTpt,
      pctA,
      pctB,
      deltaPct,
      isOverloadA,
      isOverloadB,
      statusText,
      statusChipColor,
      teikiA,
      teikiB,
      deltaTeiki,
      dandoriA,
      dandoriB,
      deltaDandori,
      downtimeA,
      downtimeB,
      deltaDowntime,
      tcA,
      tcB,
      deltaTc,
      teiryoA,
      teiryoB,
      deltaTeiryo,
      itemCountA,
      itemCountB,
      deltaItem,
      pcsDayA,
      pcsDayB,
      deltaPcsDay,
      uphA,
      uphB
    };
  });
});

// ==========================================
// Machine Table Excel-like Filter & Sort State
// ==========================================
const machineSortKey = ref<string | null>(null);
const machineSortDir = ref<'asc' | 'desc'>('asc');
const machineExcelSearchQueries = ref<Record<string, string>>({});
const machineExcelCheckedFilters = ref<Record<string, string[]>>({});

// Format display values for filter dropdown & comparison
const getMachineFilterItemValue = (item: any, key: string): string => {
  if (!item) return '-';
  if (key === 'statusText') return String(item.statusText || '-');
  if (key === 'capA') return `${item.capA} Jam`;
  if (key === 'tptA') return `${Number(item.tptA || 0).toFixed(1)} Jam`;
  if (key === 'tptB') return `${Number(item.tptB || 0).toFixed(1)} Jam`;
  if (key === 'deltaTpt') return `${item.deltaTpt > 0 ? '+' : ''}${Number(item.deltaTpt || 0).toFixed(1)} Jam`;
  if (key === 'teikiB') return `${Number(item.teikiB || 0).toFixed(1)} Jam`;
  if (key === 'dandoriB') return `${Number(item.dandoriB || 0).toFixed(1)} Jam`;
  if (key === 'downtimeB') return `${Number(item.downtimeB || 0).toFixed(1)} Jam`;
  if (key === 'tcB') return `${Number(item.tcB || 0).toFixed(1)} Jam`;
  if (key === 'teiryoB') return `${Number(item.teiryoB || 0).toFixed(1)} Jam`;
  return String(item[key] ?? '-');
};

const getMachineExcelUniqueItems = (key: string) => {
  if (!machineDeltaRows.value || machineDeltaRows.value.length === 0) return [];
  const unique = new Set(machineDeltaRows.value.map(item => getMachineFilterItemValue(item, key)));
  return Array.from(unique).sort();
};

const getMachineExcelFilteredUniqueItems = (key: string) => {
  const items = getMachineExcelUniqueItems(key);
  const query = (machineExcelSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => item.toLowerCase().includes(query));
};

const isAllMachineExcelItemsChecked = (key: string) => {
  const allFilteredItems = getMachineExcelFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = machineExcelCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const toggleMachineExcelSelectAll = (key: string) => {
  const allFilteredItems = getMachineExcelFilteredUniqueItems(key);
  const checked = machineExcelCheckedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    machineExcelCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    machineExcelCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isMachineExcelFilterActive = (key: string) => {
  return (machineExcelCheckedFilters.value[key] && machineExcelCheckedFilters.value[key].length > 0) || 
         (machineExcelSearchQueries.value[key] && machineExcelSearchQueries.value[key].length > 0);
};

const setMachineExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (machineSortKey.value === key && machineSortDir.value === dir) {
    machineSortKey.value = null;
  } else {
    machineSortKey.value = key;
    machineSortDir.value = dir;
  }
};

const clearSingleMachineExcelFilter = (key: string) => {
  machineExcelCheckedFilters.value[key] = [];
  machineExcelSearchQueries.value[key] = '';
  if (machineSortKey.value === key) machineSortKey.value = null;
};

const resetAllMachineExcelFilters = () => {
  machineSortKey.value = null;
  machineSortDir.value = 'asc';
  machineExcelSearchQueries.value = {};
  machineExcelCheckedFilters.value = {};
};

const isAnyMachineExcelFilterActive = computed(() => {
  return Object.keys(machineExcelCheckedFilters.value).some(k => isMachineExcelFilterActive(k)) || 
         Object.keys(machineExcelSearchQueries.value).some(k => isMachineExcelFilterActive(k)) || 
         machineSortKey.value !== null;
});

// Filtered Machine Delta Rows with Tab + Search + Excel Column Filter & Sort
const filteredMachineRows = computed(() => {
  let list = [...machineDeltaRows.value];

  // Tab filter
  if (machineFilterTab.value === 'changed') {
    list = list.filter(m => Math.abs(m.deltaTpt) >= 0.05);
  } else if (machineFilterTab.value === 'overloadA') {
    list = list.filter(m => m.isOverloadA);
  } else if (machineFilterTab.value === 'overloadB') {
    list = list.filter(m => m.isOverloadB);
  }

  // Global search input
  if (machineSearch.value.trim()) {
    const q = machineSearch.value.trim().toLowerCase();
    list = list.filter(m => 
      m.machine.toLowerCase().includes(q) ||
      m.statusText.toLowerCase().includes(q)
    );
  }

  // Excel Column Filtering
  const activeKeys = [
    ...Object.keys(machineExcelCheckedFilters.value).filter(k => machineExcelCheckedFilters.value[k]?.length > 0),
    ...Object.keys(machineExcelSearchQueries.value).filter(k => machineExcelSearchQueries.value[k]?.trim().length > 0)
  ];
  const uniqueActiveKeys = [...new Set(activeKeys)];

  if (uniqueActiveKeys.length > 0) {
    list = list.filter(item => {
      return uniqueActiveKeys.every(k => {
        const val = getMachineFilterItemValue(item, k);
        const query = (machineExcelSearchQueries.value[k] || '').trim().toLowerCase();
        if (query && !val.toLowerCase().includes(query)) {
          return false;
        }
        const checked = machineExcelCheckedFilters.value[k];
        if (checked && checked.length > 0 && !checked.includes(val)) {
          return false;
        }
        return true;
      });
    });
  }

  // Excel Sorting
  if (machineSortKey.value) {
    const k = machineSortKey.value;
    const dir = machineSortDir.value === 'asc' ? 1 : -1;
    const numericKeys = [
      'capA', 'capB', 'tptA', 'tptB', 'deltaTpt', 'pctA', 'pctB', 'deltaPct',
      'teikiA', 'teikiB', 'deltaTeiki', 'dandoriA', 'dandoriB', 'deltaDandori',
      'downtimeA', 'downtimeB', 'deltaDowntime', 'tcA', 'tcB', 'deltaTc',
      'teiryoA', 'teiryoB', 'deltaTeiryo'
    ];

    list.sort((a, b) => {
      if (numericKeys.includes(k)) {
        const numA = Number((a as any)[k] ?? 0);
        const numB = Number((b as any)[k] ?? 0);
        return (numA - numB) * dir;
      }
      const strA = String((a as any)[k] ?? '').toLowerCase();
      const strB = String((b as any)[k] ?? '').toLowerCase();
      return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }

  return list;
});

// Macro KPI Summary
const macroKPI = computed(() => {
  const rows = machineDeltaRows.value;

  const totalTptA = rows.reduce((acc, r) => acc + r.tptA, 0);
  const totalTptB = rows.reduce((acc, r) => acc + r.tptB, 0);
  const deltaTotalTpt = totalTptB - totalTptA;

  const overloadCountA = rows.filter(r => r.isOverloadA).length;
  const overloadCountB = rows.filter(r => r.isOverloadB).length;
  const deltaOverload = overloadCountB - overloadCountA;

  const totalDandoriA = rows.reduce((acc, r) => acc + r.dandoriA, 0);
  const totalDandoriB = rows.reduce((acc, r) => acc + r.dandoriB, 0);
  const deltaDandori = totalDandoriB - totalDandoriA;

  const totalTeikiA = rows.reduce((acc, r) => acc + r.teikiA, 0);
  const totalTeikiB = rows.reduce((acc, r) => acc + r.teikiB, 0);
  const deltaTeiki = totalTeikiB - totalTeikiA;

  const totalDowntimeA = rows.reduce((acc, r) => acc + r.downtimeA, 0);
  const totalDowntimeB = rows.reduce((acc, r) => acc + r.downtimeB, 0);
  const deltaDowntime = totalDowntimeB - totalDowntimeA;

  const totalTcA = rows.reduce((acc, r) => acc + r.tcA, 0);
  const totalTcB = rows.reduce((acc, r) => acc + r.tcB, 0);
  const deltaTc = totalTcB - totalTcA;

  const totalTeiryoA = rows.reduce((acc, r) => acc + r.teiryoA, 0);
  const totalTeiryoB = rows.reduce((acc, r) => acc + r.teiryoB, 0);
  const deltaTeiryo = totalTeiryoB - totalTeiryoA;

  return {
    totalTptA,
    totalTptB,
    deltaTotalTpt,
    overloadCountA,
    overloadCountB,
    deltaOverload,
    totalDandoriA,
    totalDandoriB,
    deltaDandori,
    totalTeikiA,
    totalTeikiB,
    deltaTeiki,
    totalDowntimeA,
    totalDowntimeB,
    deltaDowntime,
    totalTcA,
    totalTcB,
    deltaTc,
    totalTeiryoA,
    totalTeiryoB,
    deltaTeiryo
  };
});

// Part Relocation Table (Parts whose machine differs)
const partRelocations = computed(() => {
  const getPartKey = (p: any) => {
    if (p.id_ms_part) return `id_${p.id_ms_part}`;
    return `${p.part_number}_${p.job_number || ''}_${p.process || 1}`;
  };

  const mapA = new Map<string, any>();
  partsA.value.forEach(p => {
    mapA.set(getPartKey(p), p);
  });

  const mapB = new Map<string, any>();
  partsB.value.forEach(p => {
    mapB.set(getPartKey(p), p);
  });

  const allKeys = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const changes: any[] = [];

  allKeys.forEach(key => {
    const itemA = mapA.get(key);
    const itemB = mapB.get(key);

    const mcA = (itemA?.machine_use || itemA?.machine || '-').trim();
    const mcB = (itemB?.machine_use || itemB?.machine || '-').trim();

    if (!itemA && itemB) {
      changes.push({
        part_number: itemB.part_number,
        process: itemB.process || 1,
        job_number: itemB.job_number || '-',
        part_name: itemB.part_name || '-',
        model: itemB.model || '-',
        machineA: '-',
        machineB: mcB,
        cycle_time: Number(itemB.cycle_time_sec || 0),
        pcs_day: Number(itemB.pcs_day || 0),
        tptB: Number(itemB.tpt || 0),
        statusType: 'added',
        statusLabel: 'Baru di Skenario B',
        chipColor: 'info'
      });
    } else if (itemA && !itemB) {
      changes.push({
        part_number: itemA.part_number,
        process: itemA.process || 1,
        job_number: itemA.job_number || '-',
        part_name: itemA.part_name || '-',
        model: itemA.model || '-',
        machineA: mcA,
        machineB: '-',
        cycle_time: Number(itemA.cycle_time_sec || 0),
        pcs_day: Number(itemA.pcs_day || 0),
        tptB: 0,
        statusType: 'deleted',
        statusLabel: 'Dihapus di Skenario B',
        chipColor: 'error'
      });
    } else if (mcA !== mcB) {
      changes.push({
        part_number: itemA.part_number,
        process: itemA.process || 1,
        job_number: itemA.job_number || itemB.job_number || '-',
        part_name: itemA.part_name || itemB.part_name || '-',
        model: itemA.model || itemB.model || '-',
        machineA: mcA,
        machineB: mcB,
        cycle_time: Number(itemB.cycle_time_sec || itemA.cycle_time_sec || 0),
        pcs_day: Number(itemB.pcs_day || itemA.pcs_day || 0),
        tptB: Number(itemB.tpt || 0),
        statusType: 'moved',
        statusLabel: `Pindah Mesin (${mcA} → ${mcB})`,
        chipColor: 'success'
      });
    }
  });

  return changes.sort((a, b) => a.part_number.localeCompare(b.part_number));
});

// ==========================================
// Part Table Excel-like Filter & Sort State
// ==========================================
const partSortKey = ref<string | null>(null);
const partSortDir = ref<'asc' | 'desc'>('asc');
const partExcelSearchQueries = ref<Record<string, string>>({});
const partExcelCheckedFilters = ref<Record<string, string[]>>({});

const getPartFilterItemValue = (item: any, key: string): string => {
  if (!item) return '-';
  if (key === 'cycle_time') return `${item.cycle_time}s`;
  if (key === 'pcs_day') return `${item.pcs_day}`;
  if (key === 'statusLabel') return String(item.statusLabel || '-');
  return String(item[key] ?? '-');
};

const getPartExcelUniqueItems = (key: string) => {
  if (!partRelocations.value || partRelocations.value.length === 0) return [];
  const unique = new Set(partRelocations.value.map(item => getPartFilterItemValue(item, key)));
  return Array.from(unique).sort();
};

const getPartExcelFilteredUniqueItems = (key: string) => {
  const items = getPartExcelUniqueItems(key);
  const query = (partExcelSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => item.toLowerCase().includes(query));
};

const isAllPartExcelItemsChecked = (key: string) => {
  const allFilteredItems = getPartExcelFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = partExcelCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const togglePartExcelSelectAll = (key: string) => {
  const allFilteredItems = getPartExcelFilteredUniqueItems(key);
  const checked = partExcelCheckedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    partExcelCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    partExcelCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isPartExcelFilterActive = (key: string) => {
  return (partExcelCheckedFilters.value[key] && partExcelCheckedFilters.value[key].length > 0) || 
         (partExcelSearchQueries.value[key] && partExcelSearchQueries.value[key].length > 0);
};

const setPartExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (partSortKey.value === key && partSortDir.value === dir) {
    partSortKey.value = null;
  } else {
    partSortKey.value = key;
    partSortDir.value = dir;
  }
};

const clearSinglePartExcelFilter = (key: string) => {
  partExcelCheckedFilters.value[key] = [];
  partExcelSearchQueries.value[key] = '';
  if (partSortKey.value === key) partSortKey.value = null;
};

const resetAllPartExcelFilters = () => {
  partSortKey.value = null;
  partSortDir.value = 'asc';
  partExcelSearchQueries.value = {};
  partExcelCheckedFilters.value = {};
};

const isAnyPartExcelFilterActive = computed(() => {
  return Object.keys(partExcelCheckedFilters.value).some(k => isPartExcelFilterActive(k)) || 
         Object.keys(partExcelSearchQueries.value).some(k => isPartExcelFilterActive(k)) || 
         partSortKey.value !== null;
});

// Filtered Part Relocations with Search + Excel Column Filter & Sort
const filteredPartRelocations = computed(() => {
  let list = [...partRelocations.value];

  // Global search input
  if (partSearch.value.trim()) {
    const q = partSearch.value.trim().toLowerCase();
    list = list.filter(p => 
      p.part_number.toLowerCase().includes(q) ||
      p.job_number.toLowerCase().includes(q) ||
      p.part_name.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q) ||
      p.machineA.toLowerCase().includes(q) ||
      p.machineB.toLowerCase().includes(q) ||
      p.statusLabel.toLowerCase().includes(q)
    );
  }

  // Excel Column Filtering
  const activeKeys = [
    ...Object.keys(partExcelCheckedFilters.value).filter(k => partExcelCheckedFilters.value[k]?.length > 0),
    ...Object.keys(partExcelSearchQueries.value).filter(k => partExcelSearchQueries.value[k]?.trim().length > 0)
  ];
  const uniqueActiveKeys = [...new Set(activeKeys)];

  if (uniqueActiveKeys.length > 0) {
    list = list.filter(item => {
      return uniqueActiveKeys.every(k => {
        const val = getPartFilterItemValue(item, k);
        const query = (partExcelSearchQueries.value[k] || '').trim().toLowerCase();
        if (query && !val.toLowerCase().includes(query)) {
          return false;
        }
        const checked = partExcelCheckedFilters.value[k];
        if (checked && checked.length > 0 && !checked.includes(val)) {
          return false;
        }
        return true;
      });
    });
  }

  // Excel Sorting
  if (partSortKey.value) {
    const k = partSortKey.value;
    const dir = partSortDir.value === 'asc' ? 1 : -1;
    const numericKeys = ['cycle_time', 'pcs_day', 'tptB'];

    list.sort((a, b) => {
      if (numericKeys.includes(k)) {
        const numA = Number((a as any)[k] ?? 0);
        const numB = Number((b as any)[k] ?? 0);
        return (numA - numB) * dir;
      }
      const strA = String((a as any)[k] ?? '').toLowerCase();
      const strB = String((b as any)[k] ?? '').toLowerCase();
      return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }

  return list;
});

// Highcharts Rendering: Stacked Components matching Simulation.vue
const renderComparisonChart = () => {
  if (!chartContainer.value) return;

  const rows = machineDeltaRows.value;
  if (!rows || rows.length === 0) return;

  const categories = rows.map(r => r.machine);

  // Scenario notes
  const noteA = simHeaderA.value 
    ? `${formatPeriodeIndo(simHeaderA.value.periode)}${simHeaderA.value.note ? ' - ' + simHeaderA.value.note : ''}` 
    : 'Skenario A';
  const noteB = simHeaderB.value 
    ? `${formatPeriodeIndo(simHeaderB.value.periode)}${simHeaderB.value.note ? ' - ' + simHeaderB.value.note : ''}` 
    : 'Skenario B';

  // Data series for Skenario A (Stack 'A')
  const downtimeA = rows.map(r => Number(r.downtimeA.toFixed(2)));
  const tcA = rows.map(r => Number(r.tcA.toFixed(2)));
  const dandoriA = rows.map(r => Number(r.dandoriA.toFixed(2)));
  const teikiA = rows.map(r => Number(r.teikiA.toFixed(2)));
  const teiryoA = rows.map(r => Number(r.teiryoA.toFixed(2)));

  // Data series for Skenario B (Stack 'B')
  const downtimeB = rows.map(r => Number(r.downtimeB.toFixed(2)));
  const tcB = rows.map(r => Number(r.tcB.toFixed(2)));
  const dandoriB = rows.map(r => Number(r.dandoriB.toFixed(2)));
  const teikiB = rows.map(r => Number(r.teikiB.toFixed(2)));
  const teiryoB = rows.map(r => Number(r.teiryoB.toFixed(2)));

  const series = [
    // Skenario A (Stack A - Kolom Kiri)
    {
      name: 'DownTime',
      data: downtimeA,
      color: '#d50000',
      stack: 'A'
    },
    {
      name: 'T/C',
      data: tcA,
      color: '#fbc02d',
      stack: 'A'
    },
    {
      name: 'Dandori',
      data: dandoriA,
      color: '#00a2ff',
      stack: 'A'
    },
    {
      name: 'Weld Time',
      data: teikiA,
      color: '#005db9',
      stack: 'A'
    },
    {
      name: 'Teiryo',
      data: teiryoA,
      color: '#800080',
      stack: 'A'
    },

    // Skenario B (Stack B - Kolom Kanan)
    {
      name: 'DownTime (B)',
      data: downtimeB,
      color: '#d50000',
      stack: 'B',
      showInLegend: false
    },
    {
      name: 'T/C (B)',
      data: tcB,
      color: '#fbc02d',
      stack: 'B',
      showInLegend: false
    },
    {
      name: 'Dandori (B)',
      data: dandoriB,
      color: '#00a2ff',
      stack: 'B',
      showInLegend: false
    },
    {
      name: 'Weld Time (B)',
      data: teikiB,
      color: '#005db9',
      stack: 'B',
      showInLegend: false
    },
    {
      name: 'Teiryo (B)',
      data: teiryoB,
      color: '#800080',
      stack: 'B',
      showInLegend: false
    }
  ];

  if (comparisonChart) {
    comparisonChart.destroy();
  }

  comparisonChart = Highcharts.chart(chartContainer.value, {
    chart: {
      type: 'column',
      backgroundColor: '#ffffff',
      height: 450,
      marginTop: 45,
      marginBottom: 75,
      spacing: [15, 10, 20, 10]
    },
    title: {
      text: 'Komparasi Beban Mesin & Breakdown Komponen (Skenario A vs Skenario B)',
      align: 'left',
      style: {
        fontFamily: 'Bahnschrift, Segoe UI, sans-serif',
        fontWeight: 'bold',
        fontSize: '15px',
        color: '#0f172a'
      }
    },
    subtitle: {
      text: `Skenario A (Kiri): ${noteA} | Skenario B (Kanan): ${noteB} — Garis Putus-Putus: Batas Jam Kerja Shift (8h, 11h, 16h, 19h, 21h)`,
      align: 'left',
      style: {
        fontSize: '11px',
        color: '#64748b'
      }
    },
    xAxis: {
      categories,
      crosshair: true,
      labels: {
        style: {
          fontWeight: 'bold',
          fontSize: '11px',
          color: '#334155'
        }
      },
      tickWidth: 1,
      tickmarkPlacement: 'on'
    },
    yAxis: {
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
        { value: 8, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '8h', style: { color: '#1a237e', fontWeight: 'bold', fontSize: '10px' } } },
        { value: 11, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '11h', style: { color: '#f44336', fontWeight: 'bold', fontSize: '10px' } } },
        { value: 16, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '16h', style: { color: '#1a237e', fontWeight: 'bold', fontSize: '10px' } } },
        { value: 19, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '19h', style: { color: '#f44336', fontWeight: 'bold', fontSize: '10px' } } },
        { value: 21, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '21h', style: { color: '#f44336', fontWeight: 'bold', fontSize: '10px' } } }
      ],
      stackLabels: {
        enabled: true,
        style: {
          fontWeight: 'bold',
          color: '#333333',
          fontSize: '10px'
        },
        formatter: function (this: any) {
          return this.total ? this.total.toFixed(1) : '';
        }
      }
    },
    tooltip: {
      shared: true,
      useHTML: true,
      formatter: function (this: any) {
        const machineCode = this.x;
        const row = rows.find(r => r.machine === machineCode);
        if (!row) return `<b>${machineCode}</b>`;

        return `
          <div style="font-size:12px;font-weight:bold;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
            Mesin: ${machineCode}
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-weight:bold;color:#0345a1;">● Skenario A: ${noteA} — Total: ${row.tptA.toFixed(1)} Jam</div>
            <div style="font-size:10.5px;color:#334155;margin-left:8px;line-height:1.4;">
              Weld Time: <b>${row.teikiA.toFixed(1)}h</b> | Dandori: <b>${row.dandoriA.toFixed(1)}h</b><br/>
              Downtime: <b>${row.downtimeA.toFixed(1)}h</b> | T/C: <b>${row.tcA.toFixed(1)}h</b> | Teiryo: <b>${row.teiryoA.toFixed(1)}h</b>
            </div>
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-weight:bold;color:#7c3aed;">● Skenario B: ${noteB} — Total: ${row.tptB.toFixed(1)} Jam</div>
            <div style="font-size:10.5px;color:#334155;margin-left:8px;line-height:1.4;">
              Weld Time: <b>${row.teikiB.toFixed(1)}h</b> | Dandori: <b>${row.dandoriB.toFixed(1)}h</b><br/>
              Downtime: <b>${row.downtimeB.toFixed(1)}h</b> | T/C: <b>${row.tcB.toFixed(1)}h</b> | Teiryo: <b>${row.teiryoB.toFixed(1)}h</b>
            </div>
          </div>
          <div style="font-size:11px;font-weight:bold;border-top:1px solid #e2e8f0;padding-top:4px;color:${row.deltaTpt <= 0 ? '#059669' : '#d97706'};">
            Selisih TPT: ${row.deltaTpt > 0 ? '+' : ''}${row.deltaTpt.toFixed(1)} Jam (${row.statusText})
          </div>
        `;
      }
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        pointPadding: 0.05,
        groupPadding: 0.08,
        borderWidth: 0,
        borderRadius: 2
      }
    },
    legend: {
      enabled: true,
      align: 'center',
      verticalAlign: 'bottom',
      layout: 'horizontal',
      margin: 25,
      y: 8,
      itemStyle: {
        fontWeight: 'bold',
        fontSize: '11px',
        color: '#334155'
      }
    },
    series: series as any,
    credits: { enabled: false }
  });
};

// Export to Excel (ExcelJS)
const exportComparisonExcel = async () => {
  if (!simHeaderA.value || !simHeaderB.value) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MAJ-IT GLC Simulation System';
  workbook.created = new Date();

  // Sheet 1: Komparasi Beban Mesin & Breakdown
  const wsMachines = workbook.addWorksheet('Komparasi Beban & Breakdown');
  wsMachines.views = [{ showGridLines: true }];

  wsMachines.mergeCells('A1:R1');
  wsMachines.getCell('A1').value = 'LAPORAN KOMPARASI SKENARIO BEBAN MESIN & RINCIAN KOMPONEN';
  wsMachines.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0345A1' } };

  wsMachines.mergeCells('A2:R2');
  wsMachines.getCell('A2').value = `Area: ${selectedArea.value} | Skenario A: ${formatPeriodeIndo(simHeaderA.value.periode)} (${simHeaderA.value.note || 'Tanpa Catatan'}) vs Skenario B: ${formatPeriodeIndo(simHeaderB.value.periode)} (${simHeaderB.value.note || 'Tanpa Catatan'})`;
  wsMachines.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

  // Machine table headers
  const machHeaders = [
    'Mesin',
    'Kapasitas Shift (Jam)',
    'Teiki A (Jam)',
    'Teiki B (Jam)',
    'Selisih Teiki',
    'Dandori A (Jam)',
    'Dandori B (Jam)',
    'Selisih Dandori',
    'Downtime A (Jam)',
    'Downtime B (Jam)',
    'Tip Change A (Jam)',
    'Tip Change B (Jam)',
    'Teiryo A (Jam)',
    'Teiryo B (Jam)',
    'TPT A (Jam)',
    'TPT B (Jam)',
    'Selisih TPT (Jam)',
    'Status Perubahan'
  ];

  const rowHeader = wsMachines.addRow(machHeaders);
  rowHeader.height = 25;
  rowHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0345A1' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  machineDeltaRows.value.forEach(m => {
    const row = wsMachines.addRow([
      m.machine,
      m.capA,
      m.teikiA.toFixed(2),
      m.teikiB.toFixed(2),
      m.deltaTeiki.toFixed(2),
      m.dandoriA.toFixed(2),
      m.dandoriB.toFixed(2),
      m.deltaDandori.toFixed(2),
      m.downtimeA.toFixed(2),
      m.downtimeB.toFixed(2),
      m.tcA.toFixed(2),
      m.tcB.toFixed(2),
      m.teiryoA.toFixed(2),
      m.teiryoB.toFixed(2),
      m.tptA.toFixed(2),
      m.tptB.toFixed(2),
      m.deltaTpt.toFixed(2),
      m.statusText
    ]);

    row.alignment = { vertical: 'middle' };
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
  });

  // Sheet 2: Pelacak Part Relokasi
  const wsParts = workbook.addWorksheet('Relokasi Part Number');
  wsParts.views = [{ showGridLines: true }];

  wsParts.mergeCells('A1:J1');
  wsParts.getCell('A1').value = 'DAFTAR PART YANG BERPENGARUH / BERPINDAH MESIN';
  wsParts.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF7C3AED' } };

  const partHeaders = [
    'No',
    'Part Number',
    'Job Number',
    'Part Name',
    'Model',
    'Machine Use (Skenario A)',
    'Machine Use (Skenario B)',
    'Status Perpindahan',
    'Cycle Time (s)',
    'Pcs / Hari'
  ];

  const pRowHeader = wsParts.addRow(partHeaders);
  pRowHeader.height = 25;
  pRowHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  partRelocations.value.forEach((p, idx) => {
    const row = wsParts.addRow([
      idx + 1,
      p.part_number,
      p.job_number,
      p.part_name,
      p.model,
      p.machineA,
      p.machineB,
      p.statusLabel,
      p.cycle_time,
      p.pcs_day
    ]);
    row.alignment = { vertical: 'middle' };
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).alignment = { horizontal: 'center' };
    row.getCell(9).alignment = { horizontal: 'right' };
    row.getCell(10).alignment = { horizontal: 'right' };
  });

  // Trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `GLC_Compare_${simHeaderA.value?.periode || 'A'}_vs_${simHeaderB.value?.periode || 'B'}_${selectedArea.value}.xlsx`);
  notificationStore.showDialogSuccess('Download Selesai', 'Laporan komparasi berhasil diekspor.');
};

// Machine Table Headers based on View Mode
const machineTableHeaders = computed(() => {
  if (machineViewMode.value === 'breakdown') {
    return [
      { title: '', key: 'expand', align: 'center' as const, sortable: false, width: '40px' },
      { title: 'Mesin', key: 'machine', align: 'start' as const, sortable: false },
      { title: 'Teiki / Weld Time (A | B | Δ)', key: 'teikiB', align: 'center' as const, sortable: false },
      { title: 'Dandori (A | B | Δ)', key: 'dandoriB', align: 'center' as const, sortable: false },
      { title: 'Downtime (A | B | Δ)', key: 'downtimeB', align: 'center' as const, sortable: false },
      { title: 'Tip Change (A | B | Δ)', key: 'tcB', align: 'center' as const, sortable: false },
      { title: 'Teiryo (A | B | Δ)', key: 'teiryoB', align: 'center' as const, sortable: false },
      { title: 'Total TPT (A | B | Δ)', key: 'tptB', align: 'center' as const, sortable: false },
      { title: 'Status', key: 'statusText', align: 'center' as const, sortable: false },
    ];
  }

  return [
    { title: '', key: 'expand', align: 'center' as const, sortable: false, width: '40px' },
    { title: 'Mesin', key: 'machine', align: 'start' as const, sortable: false },
    { title: 'Shift Cap', key: 'capA', align: 'center' as const, sortable: false },
    { title: 'TPT Skenario A', key: 'tptA', align: 'end' as const, sortable: false },
    { title: 'TPT Skenario B', key: 'tptB', align: 'end' as const, sortable: false },
    { title: 'Selisih TPT (Δ)', key: 'deltaTpt', align: 'center' as const, sortable: false },
    { title: 'Status Perubahan', key: 'statusText', align: 'center' as const, sortable: false },
  ];
});

const partTableHeaders = [
  { title: 'No', key: 'index', align: 'center' as const, sortable: false, width: '50px' },
  { title: 'Part Number', key: 'part_number', align: 'start' as const, sortable: false },
  { title: 'Job No', key: 'job_number', align: 'start' as const, sortable: false },
  { title: 'Part Name', key: 'part_name', align: 'start' as const, sortable: false },
  { title: 'Model', key: 'model', align: 'center' as const, sortable: false },
  { title: 'Mesin A', key: 'machineA', align: 'center' as const, sortable: false },
  { title: 'Mesin B', key: 'machineB', align: 'center' as const, sortable: false },
  { title: 'Status Perpindahan', key: 'statusLabel', align: 'center' as const, sortable: false },
  { title: 'CT (dtk)', key: 'cycle_time', align: 'end' as const, sortable: false },
  { title: 'Pcs / Day', key: 'pcs_day', align: 'end' as const, sortable: false }
];

// Navigation helper
const handleBack = () => {
  if (isSubAssy.value) {
    router.push('/Transaction/welding/subassy-simulation');
  } else {
    router.push('/Transaction/welding/glc-simulation');
  }
};

// Lifecycle & watchers
onMounted(async () => {
  if (isSubAssy.value) {
    selectedArea.value = 'SA ADM';
  } else if (route.query.area) {
    selectedArea.value = String(route.query.area);
  }

  try {
    const areaRes = await getAreaList();
    if (areaRes?.data?.data) {
      const fetchedAreas = areaRes.data.data.map((a: any) => a.area || a);
      if (isSubAssy.value) {
        const subAssyAreas = fetchedAreas.filter((a: string) => String(a).toUpperCase().includes('SA') || String(a).toUpperCase().includes('SUB ASSY'));
        areaOptions.value = subAssyAreas.length > 0 ? subAssyAreas : ['SA ADM'];
      } else {
        const wssAreas = fetchedAreas.filter((a: string) => !String(a).toUpperCase().includes('SA') && !String(a).toUpperCase().includes('SUB ASSY'));
        areaOptions.value = wssAreas.length > 0 ? wssAreas : ['WSS ADM', 'WSS ASSY'];
      }
    }
  } catch {
    areaOptions.value = isSubAssy.value ? ['SA ADM'] : ['WSS ADM', 'WSS ASSY'];
  }
  await loadSimulationList();
});

onUnmounted(() => {
  if (comparisonChart) {
    comparisonChart.destroy();
  }
});

watch(selectedArea, () => {
  selectedIdA.value = null;
  selectedIdB.value = null;
  loadSimulationList();
});

watch([selectedIdA, selectedIdB], () => {
  if (selectedIdA.value && selectedIdB.value) {
    fetchScenarioData();
  }
});
</script>

<template>
  <div class="page-wrapper pa-6">
    <!-- Top Header Filter Card (MDFO Style Card like SimulationPatan.vue) -->
    <v-card class="pa-6 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
      <div class="d-flex flex-wrap justify-space-between align-center gap-4">
        <div class="d-flex align-center">
          <v-btn
            icon="mdi-arrow-left"
            variant="text"
            color="primary"
            class="mr-2"
            @click="handleBack"
          />
          <div>
            <div class="text-h5 font-weight-medium mb-1">
              Komparasi Skenario Simulasi {{ isSubAssy ? '- Sub Assy' : '' }}
            </div>
            <div class="text-body-2 text-grey-darken-1">
              Bandingkan dampak utilisasi beban, selisih jam kerja, dan perpindahan part antar 2 skenario simulasi secara berdampingan.
            </div>
          </div>
        </div>

        <div class="d-flex flex-wrap align-center gap-3">
          <!-- Area Selector -->
          <div style="min-width: 160px;">
            <v-select
              v-model="selectedArea"
              :items="areaOptions"
              label="Pilih Area"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-map-marker"
              class="bg-white rounded"
            />
          </div>

          <!-- Movement History Button -->
          <v-btn
            color="indigo-darken-1"
            variant="tonal"
            prepend-icon="mdi-history"
            class="text-none font-weight-bold"
            @click="isMovementHistoryOpen = true"
            :disabled="!selectedIdB && !selectedIdA"
          >
            Histori Pemindahan Part
          </v-btn>

          <!-- Export Excel Button -->
          <v-btn
            color="success"
            prepend-icon="mdi-file-excel"
            class="text-none font-weight-bold"
            @click="exportComparisonExcel"
            :disabled="!simHeaderA || !simHeaderB"
          >
            Export Excel
          </v-btn>
        </div>
      </div>

      <!-- Scenario Selectors (Side-by-side) -->
      <v-row dense class="mt-4 align-center">
        <!-- Scenario A (Baseline) -->
        <v-col cols="12" md="5">
          <v-card variant="outlined" class="pa-4 rounded-xl card-scenario-a">
            <div class="d-flex justify-space-between align-center mb-2">
              <v-chip size="small" variant="flat" class="chip-scenario-a">
                SKENARIO A (BASELINE)
              </v-chip>
              <v-chip v-if="simHeaderA" size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                STATUS: {{ simHeaderA.status || 'DRAFT' }}
              </v-chip>
            </div>

            <v-select
              v-model="selectedIdA"
              :items="simulationOptions"
              item-title="title"
              item-value="id"
              label="Pilih Simulasi Acuan (A)"
              variant="outlined"
              density="compact"
              hide-details
              class="bg-white rounded mb-2"
            />

            <div v-if="simHeaderA" class="pt-2 border-t text-caption text-grey-darken-2">
              <div class="d-flex justify-space-between mb-1">
                <span><b>Periode:</b> {{ formatPeriodeIndo(simHeaderA.periode) }}</span>
                <span><b>Hari Kerja:</b> {{ simHeaderA.working_day || '-' }} Hari</span>
              </div>
              <div><b>Catatan:</b> {{ simHeaderA.note || '-' }}</div>
            </div>
          </v-card>
        </v-col>

        <!-- Swap Button -->
        <v-col cols="12" md="2" class="text-center my-2 my-md-0">
          <v-btn
            icon="mdi-swap-horizontal"
            variant="elevated"
            color="primary"
            size="large"
            title="Tukar Posisi Skenario A & B"
            @click="swapScenarios"
            :disabled="!selectedIdA || !selectedIdB"
          />
          <div class="text-caption text-grey-darken-1 mt-1">Tukar Posisi</div>
        </v-col>

        <!-- Scenario B (Data Compare) -->
        <v-col cols="12" md="5">
          <v-card variant="outlined" class="pa-4 rounded-xl card-scenario-b">
            <div class="d-flex justify-space-between align-center mb-2">
              <v-chip size="small" variant="flat" class="chip-scenario-b">
                SKENARIO B (DATA COMPARE)
              </v-chip>
              <v-chip v-if="simHeaderB" size="x-small" color="deep-purple-darken-1" variant="tonal" class="font-weight-bold">
                STATUS: {{ simHeaderB.status || 'DRAFT' }}
              </v-chip>
            </div>

            <v-select
              v-model="selectedIdB"
              :items="simulationOptions"
              item-title="title"
              item-value="id"
              label="Pilih Simulasi Pembanding (B)"
              variant="outlined"
              density="compact"
              hide-details
              class="bg-white rounded mb-2"
            />

            <div v-if="simHeaderB" class="pt-2 border-t text-caption text-grey-darken-2">
              <div class="d-flex justify-space-between mb-1">
                <span><b>Periode:</b> {{ formatPeriodeIndo(simHeaderB.periode) }}</span>
                <span><b>Hari Kerja:</b> {{ simHeaderB.working_day || '-' }} Hari</span>
              </div>
              <div><b>Catatan:</b> {{ simHeaderB.note || '-' }}</div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-card>

    <!-- Loading State -->
    <v-card v-if="dataLoading" class="pa-10 rounded-xl mb-6 elevation-2 text-center border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
      <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
      <div class="text-body-1 font-weight-medium text-grey-darken-2">
        Mengkalkulasi komparasi kedua skenario secara realtime...
      </div>
    </v-card>

    <!-- Main Comparison Section (Rendered when both simulations are selected) -->
    <template v-else-if="simHeaderA && simHeaderB">
      <!-- 4 KPI Summary Cards (Red Outline Borders) -->
      <v-row dense class="mb-6">
        <!-- KPI 1: Total TPT Beban -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 rounded-xl elevation-2 text-center bg-white border" style="border-radius: 14px !important; border-top: 4px solid #d50000 !important;">
            <div class="text-caption text-grey-darken-4 font-weight-bold">TOTAL TPT BEBAN</div>
            <div class="text-h5 font-weight-bold text-grey-darken-4 my-1">{{ formatHours(macroKPI.totalTptB) }}</div>
            <div class="text-caption text-grey">Base: {{ formatHours(macroKPI.totalTptA) }}</div>
            <v-chip size="x-small" :color="macroKPI.deltaTotalTpt <= 0 ? 'success' : 'warning'" class="mt-1 font-weight-bold">
              {{ macroKPI.deltaTotalTpt > 0 ? '+' : '' }}{{ macroKPI.deltaTotalTpt.toFixed(1) }} Jam
            </v-chip>
          </v-card>
        </v-col>

        <!-- KPI 2: Mesin Overload -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 rounded-xl elevation-2 text-center bg-white border" style="border-radius: 14px !important; border-top: 4px solid #d50000 !important;">
            <div class="text-caption text-red font-weight-bold">MESIN OVERLOAD (>16h)</div>
            <div class="text-h5 font-weight-bold my-1" :class="macroKPI.overloadCountB > 0 ? 'text-red' : 'text-success'">
              {{ macroKPI.overloadCountB }} Mesin
            </div>
            <div class="text-caption text-grey">Base: {{ macroKPI.overloadCountA }} Mesin</div>
            <v-chip size="x-small" :color="macroKPI.deltaOverload <= 0 ? 'success' : 'error'" class="mt-1 font-weight-bold">
              {{ macroKPI.deltaOverload > 0 ? '+' : '' }}{{ macroKPI.deltaOverload }} Mesin
            </v-chip>
          </v-card>
        </v-col>

        <!-- KPI 3: Total Dandori -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 rounded-xl elevation-2 text-center bg-white border" style="border-radius: 14px !important; border-top: 4px solid #d50000 !important;">
            <div class="text-caption text-amber-darken-3 font-weight-bold">TOTAL DANDORI</div>
            <div class="text-h5 font-weight-bold text-amber-darken-3 my-1">{{ formatHours(macroKPI.totalDandoriB) }}</div>
            <div class="text-caption text-grey">Base: {{ formatHours(macroKPI.totalDandoriA) }}</div>
            <v-chip size="x-small" :color="macroKPI.deltaDandori <= 0 ? 'success' : 'warning'" class="mt-1 font-weight-bold">
              {{ macroKPI.deltaDandori > 0 ? '+' : '' }}{{ macroKPI.deltaDandori.toFixed(1) }} Jam
            </v-chip>
          </v-card>
        </v-col>

        <!-- KPI 4: Part Berpindah Mesin -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 rounded-xl elevation-2 text-center bg-white border" style="border-radius: 14px !important; border-top: 4px solid #d50000 !important;">
            <div class="text-caption text-teal font-weight-bold">PART BERUBAH / PINDAH</div>
            <div class="text-h5 font-weight-bold text-teal my-1">{{ partRelocations.length }} Part</div>
            <div class="text-caption text-grey">Alokasi dies mesin berbeda</div>
            <v-chip size="x-small" color="teal" variant="tonal" class="mt-1 font-weight-bold">
              {{ partRelocations.filter(p => p.statusType === 'moved').length }} Relokasi
            </v-chip>
          </v-card>
        </v-col>
      </v-row>

      <!-- Comparative Highcharts Bar Chart Card (MDFO Style) -->
      <v-card class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
        <div class="d-flex flex-wrap justify-space-between align-center mb-3 gap-2">
          <div class="text-h5 text-primary font-weight-medium">
            Grafik Komparasi Beban Mesin: Skenario A vs Skenario B
          </div>
          <!-- Legend Chips & Component Indicators -->
          <div class="d-flex flex-wrap align-center gap-2">
            <v-chip size="small" variant="flat" class="chip-scenario-a">
              Skenario A (Kiri): {{ simHeaderA ? (formatPeriodeIndo(simHeaderA.periode) + (simHeaderA.note ? ' - ' + simHeaderA.note : '')) : 'Skenario A' }}
            </v-chip>
            <v-chip size="small" variant="flat" class="chip-scenario-b">
              Skenario B (Kanan): {{ simHeaderB ? (formatPeriodeIndo(simHeaderB.periode) + (simHeaderB.note ? ' - ' + simHeaderB.note : '')) : 'Skenario B' }}
            </v-chip>
          </div>
        </div>

        <div ref="chartContainer" style="height: 450px; width: 100%;"></div>
      </v-card>

      <!-- Machine Delta Matrix Table Card (MDFO Style with Breakdown Toggle & Excel Filter) -->
      <v-card class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
        <div class="d-flex flex-wrap justify-space-between align-center mb-4 gap-3">
          <div>
            <div class="text-h5 text-primary font-weight-medium">
              Matriks Selisih Beban Mesin (Machine Delta Matrix)
            </div>
            <div class="text-body-2 text-grey-darken-1">
              Perbandingan detail beban kerja dan komponen jam kerja (Teiki, Dandori, Downtime, Tip Change, Teiryo)
            </div>
          </div>

          <!-- View Mode & Action Controls -->
          <div class="d-flex flex-wrap align-center gap-2">
            <!-- Toggle Mode: Ringkasan vs Breakdown -->
            <v-btn-toggle v-model="machineViewMode" mandatory density="compact" color="primary" class="rounded-lg border">
              <v-btn value="summary" size="small" class="text-none font-weight-bold">
                <v-icon size="16" class="mr-1">mdi-table</v-icon>
                Ringkasan TPT
              </v-btn>
              <v-btn value="breakdown" size="small" class="text-none font-weight-bold">
                <v-icon size="16" class="mr-1">mdi-view-column-outline</v-icon>
                Breakdown Jam Kerja
              </v-btn>
            </v-btn-toggle>

            <!-- Toggle Expand All -->
            <v-btn
              size="small"
              variant="outlined"
              color="primary"
              class="text-none"
              @click="toggleExpandAll"
            >
              <v-icon size="16" class="mr-1">{{ expandedMachines.length === filteredMachineRows.length ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              {{ expandedMachines.length === filteredMachineRows.length ? 'Tutup Semua Rincian' : 'Buka Semua Rincian' }}
            </v-btn>
          </div>
        </div>

        <!-- Filter Tabs & Excel Reset & Search Bar -->
        <div class="d-flex flex-wrap justify-space-between align-center mb-4 gap-3">
          <v-tabs v-model="machineFilterTab" density="compact" color="primary" class="rounded-lg bg-grey-lighten-4">
            <v-tab value="all">Semua ({{ machineDeltaRows.length }})</v-tab>
            <v-tab value="changed">Berubah ({{ machineDeltaRows.filter(m => Math.abs(m.deltaTpt) >= 0.05).length }})</v-tab>
            <v-tab value="overloadA" color="error">Overload A ({{ machineDeltaRows.filter(m => m.isOverloadA).length }})</v-tab>
            <v-tab value="overloadB" color="error">Overload B ({{ machineDeltaRows.filter(m => m.isOverloadB).length }})</v-tab>
          </v-tabs>

          <div class="d-flex align-center gap-2">
            <!-- Reset Excel Filters Button -->
            <v-btn
              v-if="isAnyMachineExcelFilterActive"
              color="error"
              variant="outlined"
              density="compact"
              prepend-icon="mdi-filter-off"
              @click="resetAllMachineExcelFilters"
              class="text-caption font-weight-bold"
              style="height: 38px;"
            >
              Reset Filter
            </v-btn>

            <div style="width: 220px;">
              <v-text-field
                v-model="machineSearch"
                placeholder="Cari mesin..."
                density="compact"
                variant="outlined"
                hide-details
                prepend-inner-icon="mdi-magnify"
                clearable
              />
            </div>
          </div>
        </div>

        <!-- Vuetify Data Table with Excel-like Header Filters -->
        <v-data-table
          :headers="machineTableHeaders"
          :items="filteredMachineRows"
          density="compact"
          class="elevation-1 rounded-xl patan-table text-body-2"
          hover
        >
          <!-- Custom Header Slot with Excel Filters & Sorting -->
          <template #headers="{ columns }">
            <tr>
              <th
                v-for="col in columns"
                :key="col.key || ''"
                :class="['text-' + (col.align || 'center'), 'font-weight-bold']"
                style="background: #eef2f7;"
              >
                <!-- Expand Column (No filter) -->
                <div v-if="col.key === 'expand'" class="header-inner d-flex align-center justify-center py-1">
                  {{ col.title }}
                </div>

                <!-- Column with Excel Menu -->
                <v-menu v-else :close-on-content-click="false" location="bottom start" transition="scale-transition">
                  <template v-slot:activator="{ props }">
                    <div
                      v-bind="props"
                      class="header-inner d-flex align-center cursor-pointer select-none py-1 hover-header"
                      :class="col.align === 'end' ? 'justify-end' : (col.align === 'start' ? 'justify-start' : 'justify-center')"
                    >
                      <span :class="{'text-primary font-weight-bold': isMachineExcelFilterActive(col.key || '')}">
                        {{ col.title }}
                      </span>
                      <v-icon
                        size="14"
                        class="ml-1"
                        :color="isMachineExcelFilterActive(col.key || '') || machineSortKey === col.key ? 'primary' : 'grey-lighten-1'"
                      >
                        {{ machineSortKey === col.key ? (machineSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                      </v-icon>
                    </div>
                  </template>

                  <v-card width="260" class="pa-2 rounded-lg elevation-4">
                    <v-list density="compact" class="pa-0">
                      <v-list-item
                        prepend-icon="mdi-sort-ascending"
                        title="Urutkan A ke Z / Terkecil"
                        @click="setMachineExcelSort(col.key || '', 'asc')"
                      />
                      <v-list-item
                        prepend-icon="mdi-sort-descending"
                        title="Urutkan Z ke A / Terbesar"
                        @click="setMachineExcelSort(col.key || '', 'desc')"
                      />
                    </v-list>
                    <v-divider class="my-1" />

                    <v-text-field
                      v-model="machineExcelSearchQueries[col.key || '']"
                      placeholder="Cari nilai..."
                      density="compact"
                      variant="outlined"
                      hide-details
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      class="mb-2"
                    />

                    <div style="max-height: 180px; overflow-y: auto;" class="border rounded pa-1 custom-scrollbar">
                      <v-checkbox
                        label="(Pilih Semua)"
                        density="compact"
                        hide-details
                        :model-value="isAllMachineExcelItemsChecked(col.key || '')"
                        @click="toggleMachineExcelSelectAll(col.key || '')"
                        class="ma-0 pa-0"
                      />
                      <v-checkbox
                        v-for="item in getMachineExcelFilteredUniqueItems(col.key || '')"
                        :key="item"
                        :label="item"
                        :value="item"
                        v-model="machineExcelCheckedFilters[col.key || '']"
                        density="compact"
                        hide-details
                        class="ma-0 pa-0"
                      />
                    </div>

                    <v-card-actions class="justify-end pa-0 mt-2">
                      <v-btn size="x-small" variant="text" color="grey" @click="clearSingleMachineExcelFilter(col.key || '')">
                        Reset Kolom
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-menu>
              </th>
            </tr>
          </template>

          <template #item="{ item }">
            <tr :class="{'bg-red-lighten-5': item.isOverloadB}" class="hover-row">
              <!-- Expand Chevron -->
              <td class="text-center pa-0" style="width: 35px;">
                <v-btn
                  :icon="expandedMachines.includes(item.machine) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  variant="text"
                  size="x-small"
                  density="compact"
                  color="grey-darken-1"
                  @click="toggleRowExpand(item.machine)"
                  :title="expandedMachines.includes(item.machine) ? 'Tutup Rincian' : 'Buka Rincian Komponen Lengkap'"
                />
              </td>

              <!-- Machine Code -->
              <td class="font-weight-bold text-grey-darken-4 cursor-pointer" @click="toggleRowExpand(item.machine)">
                <div class="d-flex align-center gap-1">
                  <span>{{ item.machine }}</span>
                  <v-icon size="14" color="primary" class="opacity-60">mdi-information-outline</v-icon>
                </div>
              </td>

              <!-- SUMMARY VIEW COLUMNS -->
              <template v-if="machineViewMode === 'summary'">
                <td class="text-center text-grey-darken-1">{{ item.capA }} Jam</td>
                <td class="text-end font-weight-bold text-scenario-a">{{ item.tptA.toFixed(1) }} Jam</td>
                <td class="text-end font-weight-bold text-scenario-b">{{ item.tptB.toFixed(1) }} Jam</td>
                <td class="text-center">
                  <v-chip
                    size="x-small"
                    :color="item.deltaTpt < -0.1 ? 'success' : (item.deltaTpt > 0.1 ? 'warning' : 'default')"
                    class="font-weight-bold"
                  >
                    {{ item.deltaTpt > 0 ? '+' : '' }}{{ item.deltaTpt.toFixed(1) }} Jam
                  </v-chip>
                </td>
                <td class="text-center">
                  <v-chip size="x-small" :color="item.statusChipColor" class="font-weight-bold">
                    {{ item.statusText }}
                  </v-chip>
                </td>
              </template>

              <!-- BREAKDOWN VIEW COLUMNS -->
              <template v-else>
                <!-- Teiki / Weld Time -->
                <td class="text-center text-caption font-weight-medium">
                  <span class="text-scenario-a">{{ item.teikiA.toFixed(1) }}</span> <span class="text-grey mx-1">/</span> <span class="text-scenario-b">{{ item.teikiB.toFixed(1) }}</span>
                  <span class="ml-1 text-[10px]" :class="item.deltaTeiki <= 0 ? 'text-success font-weight-bold' : 'text-amber-darken-3 font-weight-bold'">
                    ({{ item.deltaTeiki > 0 ? '+' : '' }}{{ item.deltaTeiki.toFixed(1) }})
                  </span>
                </td>
                <!-- Dandori -->
                <td class="text-center text-caption font-weight-medium">
                  <span class="text-scenario-a">{{ item.dandoriA.toFixed(1) }}</span> <span class="text-grey mx-1">/</span> <span class="text-scenario-b">{{ item.dandoriB.toFixed(1) }}</span>
                  <span class="ml-1 text-[10px]" :class="item.deltaDandori <= 0 ? 'text-success font-weight-bold' : 'text-amber-darken-3 font-weight-bold'">
                    ({{ item.deltaDandori > 0 ? '+' : '' }}{{ item.deltaDandori.toFixed(1) }})
                  </span>
                </td>
                <!-- Downtime -->
                <td class="text-center text-caption font-weight-medium">
                  <span class="text-scenario-a">{{ item.downtimeA.toFixed(1) }}</span> <span class="text-grey mx-1">/</span> <span class="text-scenario-b">{{ item.downtimeB.toFixed(1) }}</span>
                  <span class="ml-1 text-[10px]" :class="item.deltaDowntime <= 0 ? 'text-success font-weight-bold' : 'text-amber-darken-3 font-weight-bold'">
                    ({{ item.deltaDowntime > 0 ? '+' : '' }}{{ item.deltaDowntime.toFixed(1) }})
                  </span>
                </td>
                <!-- Tip Change -->
                <td class="text-center text-caption font-weight-medium">
                  <span class="text-scenario-a">{{ item.tcA.toFixed(1) }}</span> <span class="text-grey mx-1">/</span> <span class="text-scenario-b">{{ item.tcB.toFixed(1) }}</span>
                  <span class="ml-1 text-[10px]" :class="item.deltaTc <= 0 ? 'text-success font-weight-bold' : 'text-amber-darken-3 font-weight-bold'">
                    ({{ item.deltaTc > 0 ? '+' : '' }}{{ item.deltaTc.toFixed(1) }})
                  </span>
                </td>
                <!-- Teiryo -->
                <td class="text-center text-caption font-weight-medium">
                  <span class="text-scenario-a">{{ item.teiryoA.toFixed(1) }}</span> <span class="text-grey mx-1">/</span> <span class="text-scenario-b">{{ item.teiryoB.toFixed(1) }}</span>
                  <span class="ml-1 text-[10px]" :class="item.deltaTeiryo <= 0 ? 'text-success font-weight-bold' : 'text-amber-darken-3 font-weight-bold'">
                    ({{ item.deltaTeiryo > 0 ? '+' : '' }}{{ item.deltaTeiryo.toFixed(1) }})
                  </span>
                </td>
                <!-- Total TPT -->
                <td class="text-center text-caption font-weight-bold">
                  <span class="text-scenario-a">{{ item.tptA.toFixed(1) }}h</span> <span class="text-grey mx-1">/</span> <span class="text-scenario-b">{{ item.tptB.toFixed(1) }}h</span>
                  <v-chip
                    size="x-small"
                    :color="item.deltaTpt < -0.1 ? 'success' : (item.deltaTpt > 0.1 ? 'warning' : 'default')"
                    class="ml-1 font-weight-bold"
                  >
                    {{ item.deltaTpt > 0 ? '+' : '' }}{{ item.deltaTpt.toFixed(1) }}h
                  </v-chip>
                </td>
                <!-- Status -->
                <td class="text-center">
                  <v-chip size="x-small" :color="item.statusChipColor" class="font-weight-bold">
                    {{ item.statusText }}
                  </v-chip>
                </td>
              </template>
            </tr>

            <!-- EXPANDED DETAIL SUB-ROW -->
            <tr v-if="expandedMachines.includes(item.machine)" class="bg-grey-lighten-5">
              <td colspan="10" class="pa-4">
                <div class="pa-4 bg-white rounded-xl border elevation-1">
                  <div class="d-flex justify-space-between align-center mb-3">
                    <div class="text-subtitle-2 font-weight-bold text-primary d-flex align-center">
                      <v-icon size="18" color="primary" class="mr-1.5">mdi-chart-timeline-variant</v-icon>
                      Rincian Komponen Lengkap Mesin {{ item.machine }} (Skenario A vs Skenario B)
                    </div>
                    <div class="text-caption text-grey-darken-1">
                      Kapasitas Shift: <b>{{ item.capA }} Jam</b> | Total Part: <b class="text-scenario-a">A: {{ item.itemCountA }} Item</b> vs <b class="text-scenario-b">B: {{ item.itemCountB }} Item</b>
                    </div>
                  </div>

                  <v-table density="compact" class="border rounded-lg text-caption">
                    <thead class="bg-grey-lighten-4">
                      <tr>
                        <th class="font-weight-bold text-start">Komponen Beban</th>
                        <th class="text-center font-weight-bold text-scenario-a">Skenario A (Baseline)</th>
                        <th class="text-center font-weight-bold text-scenario-b">Skenario B (Data Compare)</th>
                        <th class="text-center font-weight-bold">Selisih (B - A)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- 1. Teiki (Weld Time) -->
                      <tr>
                        <td class="font-weight-bold d-flex align-center">
                          <div style="width:10px;height:10px;background:#005db9;border-radius:2px;margin-right:6px;"></div>
                          Teiki / Weld Time (Waktu Bersih)
                        </td>
                        <td class="text-center font-weight-bold text-scenario-a">{{ item.teikiA.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold text-scenario-b">{{ item.teikiB.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold" :class="item.deltaTeiki <= 0 ? 'text-success' : 'text-amber-darken-3'">
                          {{ item.deltaTeiki > 0 ? '+' : '' }}{{ item.deltaTeiki.toFixed(2) }} Jam
                        </td>
                      </tr>

                      <!-- 2. Dandori -->
                      <tr>
                        <td class="font-weight-bold d-flex align-center">
                          <div style="width:10px;height:10px;background:#00a2ff;border-radius:2px;margin-right:6px;"></div>
                          Dandori (Setup Dies & Tooling)
                        </td>
                        <td class="text-center font-weight-bold text-scenario-a">{{ item.dandoriA.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold text-scenario-b">{{ item.dandoriB.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold" :class="item.deltaDandori <= 0 ? 'text-success' : 'text-amber-darken-3'">
                          {{ item.deltaDandori > 0 ? '+' : '' }}{{ item.deltaDandori.toFixed(2) }} Jam
                        </td>
                      </tr>

                      <!-- 3. Downtime -->
                      <tr>
                        <td class="font-weight-bold d-flex align-center">
                          <div style="width:10px;height:10px;background:#d50000;border-radius:2px;margin-right:6px;"></div>
                          Downtime
                        </td>
                        <td class="text-center font-weight-bold text-scenario-a">{{ item.downtimeA.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold text-scenario-b">{{ item.downtimeB.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold" :class="item.deltaDowntime <= 0 ? 'text-success' : 'text-amber-darken-3'">
                          {{ item.deltaDowntime > 0 ? '+' : '' }}{{ item.deltaDowntime.toFixed(2) }} Jam
                        </td>
                      </tr>

                      <!-- 4. Tip Change -->
                      <tr>
                        <td class="font-weight-bold d-flex align-center">
                          <div style="width:10px;height:10px;background:#fbc02d;border-radius:2px;margin-right:6px;"></div>
                          Tip Change (T/C)
                        </td>
                        <td class="text-center font-weight-bold text-scenario-a">{{ item.tcA.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold text-scenario-b">{{ item.tcB.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold" :class="item.deltaTc <= 0 ? 'text-success' : 'text-amber-darken-3'">
                          {{ item.deltaTc > 0 ? '+' : '' }}{{ item.deltaTc.toFixed(2) }} Jam
                        </td>
                      </tr>

                      <!-- 5. Teiryo -->
                      <tr>
                        <td class="font-weight-bold d-flex align-center">
                          <div style="width:10px;height:10px;background:#800080;border-radius:2px;margin-right:6px;"></div>
                          Teiryo
                        </td>
                        <td class="text-center font-weight-bold text-scenario-a">{{ item.teiryoA.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold text-scenario-b">{{ item.teiryoB.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold" :class="item.deltaTeiryo <= 0 ? 'text-success' : 'text-amber-darken-3'">
                          {{ item.deltaTeiryo > 0 ? '+' : '' }}{{ item.deltaTeiryo.toFixed(2) }} Jam
                        </td>
                      </tr>

                      <!-- 6. Total Process Time (TPT) -->
                      <tr class="bg-grey-lighten-4 font-weight-bold">
                        <td class="text-primary font-weight-bold">
                          Total Process Time (TPT)
                        </td>
                        <td class="text-center font-weight-bold text-scenario-a">{{ item.tptA.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold text-scenario-b">{{ item.tptB.toFixed(2) }} Jam</td>
                        <td class="text-center font-weight-bold" :class="item.deltaTpt <= 0 ? 'text-success' : 'text-amber-darken-3'">
                          {{ item.deltaTpt > 0 ? '+' : '' }}{{ item.deltaTpt.toFixed(2) }} Jam
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card>

      <!-- Part Movement Tracer Table Card (MDFO Style with Excel Filter & Sort) -->
      <v-card class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
        <div class="d-flex flex-wrap justify-space-between align-center mb-4 gap-3">
          <div>
            <div class="text-h5 text-primary font-weight-medium">
              Pelacak Relokasi Part Number (Part Movement Tracer)
            </div>
            <div class="text-body-2 text-grey-darken-1">
              Daftar part number yang berpindah mesin atau mengalami penyesuaian alokasi antar skenario
            </div>
          </div>

          <div class="d-flex align-center gap-3">
            <!-- Reset Part Filter Button -->
            <v-btn
              v-if="isAnyPartExcelFilterActive"
              color="error"
              variant="outlined"
              density="compact"
              prepend-icon="mdi-filter-off"
              @click="resetAllPartExcelFilters"
              class="text-caption font-weight-bold"
              style="height: 38px;"
            >
              Reset Filter
            </v-btn>

            <div style="width: 260px;">
              <v-text-field
                v-model="partSearch"
                placeholder="Cari part / model / mesin..."
                density="compact"
                variant="outlined"
                hide-details
                prepend-inner-icon="mdi-magnify"
                clearable
              />
            </div>
          </div>
        </div>

        <div v-if="filteredPartRelocations.length === 0" class="pa-8 text-center text-body-2 text-grey">
          <v-icon size="36" color="success" class="mb-2">mdi-check-circle-outline</v-icon>
          <div>Tidak ada part yang berpindah mesin pada kriteria filter ini.</div>
        </div>

        <v-data-table
          v-else
          :headers="partTableHeaders"
          :items="filteredPartRelocations"
          density="compact"
          class="elevation-1 rounded-xl patan-table text-body-2"
          hover
        >
          <!-- Custom Header Slot with Excel Filters & Sorting for Part Table -->
          <template #headers="{ columns }">
            <tr>
              <th
                v-for="col in columns"
                :key="col.key || ''"
                :class="['text-' + (col.align || 'center'), 'font-weight-bold']"
                style="background: #eef2f7;"
              >
                <!-- Index column without filter -->
                <div v-if="col.key === 'index'" class="header-inner d-flex align-center justify-center py-1">
                  {{ col.title }}
                </div>

                <!-- Filterable and sortable header -->
                <v-menu v-else :close-on-content-click="false" location="bottom start" transition="scale-transition">
                  <template v-slot:activator="{ props }">
                    <div
                      v-bind="props"
                      class="header-inner d-flex align-center cursor-pointer select-none py-1 hover-header"
                      :class="col.align === 'end' ? 'justify-end' : (col.align === 'start' ? 'justify-start' : 'justify-center')"
                    >
                      <span :class="{'text-primary font-weight-bold': isPartExcelFilterActive(col.key || '')}">
                        {{ col.title }}
                      </span>
                      <v-icon
                        size="14"
                        class="ml-1"
                        :color="isPartExcelFilterActive(col.key || '') || partSortKey === col.key ? 'primary' : 'grey-lighten-1'"
                      >
                        {{ partSortKey === col.key ? (partSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                      </v-icon>
                    </div>
                  </template>

                  <v-card width="260" class="pa-2 rounded-lg elevation-4">
                    <v-list density="compact" class="pa-0">
                      <v-list-item
                        prepend-icon="mdi-sort-ascending"
                        title="Urutkan A ke Z / Terkecil"
                        @click="setPartExcelSort(col.key || '', 'asc')"
                      />
                      <v-list-item
                        prepend-icon="mdi-sort-descending"
                        title="Urutkan Z ke A / Terbesar"
                        @click="setPartExcelSort(col.key || '', 'desc')"
                      />
                    </v-list>
                    <v-divider class="my-1" />

                    <v-text-field
                      v-model="partExcelSearchQueries[col.key || '']"
                      placeholder="Cari nilai..."
                      density="compact"
                      variant="outlined"
                      hide-details
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      class="mb-2"
                    />

                    <div style="max-height: 180px; overflow-y: auto;" class="border rounded pa-1 custom-scrollbar">
                      <v-checkbox
                        label="(Pilih Semua)"
                        density="compact"
                        hide-details
                        :model-value="isAllPartExcelItemsChecked(col.key || '')"
                        @click="togglePartExcelSelectAll(col.key || '')"
                        class="ma-0 pa-0"
                      />
                      <v-checkbox
                        v-for="item in getPartExcelFilteredUniqueItems(col.key || '')"
                        :key="item"
                        :label="item"
                        :value="item"
                        v-model="partExcelCheckedFilters[col.key || '']"
                        density="compact"
                        hide-details
                        class="ma-0 pa-0"
                      />
                    </div>

                    <v-card-actions class="justify-end pa-0 mt-2">
                      <v-btn size="x-small" variant="text" color="grey" @click="clearSinglePartExcelFilter(col.key || '')">
                        Reset Kolom
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-menu>
              </th>
            </tr>
          </template>

          <template #item="{ item, index }">
            <tr>
              <td class="text-center text-grey">{{ index + 1 }}</td>
              <td class="font-weight-bold text-grey-darken-4">{{ item.part_number }}</td>
              <td class="font-mono text-grey-darken-2">{{ item.job_number }}</td>
              <td>{{ item.part_name || '-' }}</td>
              <td class="text-center">{{ item.model || '-' }}</td>
              <td class="text-center font-weight-bold text-scenario-a">{{ item.machineA }}</td>
              <td class="text-center font-weight-bold text-scenario-b">{{ item.machineB }}</td>
              <td class="text-center">
                <v-chip size="x-small" :color="item.chipColor" class="font-weight-bold">
                  {{ item.statusLabel }}
                </v-chip>
              </td>
              <td class="text-end">{{ item.cycle_time }}s</td>
              <td class="text-end font-weight-bold">{{ item.pcs_day }}</td>
            </tr>
          </template>
        </v-data-table>
      </v-card>
    </template>

    <!-- Empty/Prompt State Card -->
    <v-card v-else class="pa-12 rounded-xl mb-6 elevation-2 text-center border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
      <v-icon size="64" color="primary" class="mb-3">mdi-scale-balance</v-icon>
      <div class="text-h6 font-weight-bold text-grey-darken-3 mb-1">
        Silakan Pilih Dua Skenario Simulasi
      </div>
      <div class="text-body-2 text-grey max-w-md mx-auto">
        Pilih Skenario A dan Skenario B pada menu di atas untuk melihat perbandingan grafik beban mesin, selisih jam kerja, dan daftar part yang dipindahkan.
      </div>
    </v-card>

    <!-- Part Movement History Modal -->
    <PartMovementHistoryModal
      v-model="isMovementHistoryOpen"
      :simulation-id="selectedIdB || selectedIdA || undefined"
      :loads-data="partsB"
    />
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  background-color: #f8fafc;
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
.hover-header {
  border-radius: 6px;
  padding: 2px 4px;
  transition: background-color 0.15s ease;
}
.hover-header:hover {
  background-color: rgba(3, 69, 161, 0.08);
}
.hover-row:hover {
  background-color: #f1f5f9 !important;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.text-scenario-a {
  color: #0345a1 !important;
  font-weight: 700 !important;
}
.text-scenario-b {
  color: #7c3aed !important;
  font-weight: 700 !important;
}
.chip-scenario-a {
  background-color: #0345a1 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
}
.chip-scenario-b {
  background-color: #7c3aed !important;
  color: #ffffff !important;
  font-weight: 700 !important;
}
.card-scenario-a {
  background-color: #f0f7ff !important;
  border: 2px solid #0345a1 !important;
}
.card-scenario-b {
  background-color: #faf5ff !important;
  border: 2px solid #7c3aed !important;
}

</style>
