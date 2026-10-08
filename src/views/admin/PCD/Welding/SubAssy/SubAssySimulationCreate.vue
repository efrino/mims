<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import * as XLSX from 'xlsx';
import { useDedicatedMachineStore } from '@/stores/PCD/Master/DedicatedMachine';
import Highcharts from 'highcharts';
import html2canvas from 'html2canvas';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useGlcSimulationStore } from '@/stores/PCD/Welding/Simulation';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { getPcsKanban, getPcsDayDetail, getAvailableParts, expandCandidateParts, getAchievementList, getPartEliminationTrace } from '@/services/PCD/Welding/Simulation';
import PartMovementHistoryModal from '@/components/welding/PartMovementHistoryModal.vue';
import { addMovementLogBatch, generateAutoReason } from '@/utils/partMovementLogger';

const isMovementHistoryOpen = ref(false);
const authStore = useAuthStore();

const page = ref({ title: 'Buat Simulasi Sub Assy Baru' });
const breadcrumbs = ref([
  { title: 'Welding', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'GLC Sub Assy Simulation', disabled: false, href: '/Transaction/welding/subassy-simulation' },
  { title: 'Create', disabled: true, href: '#' }
]);

const store = useGlcSimulationStore();
const dedicatedStore = useDedicatedMachineStore();
const router = useRouter();
const route = useRoute();
const { createData, createForm, activeMachineOptions, createLoading, step, summaryData } = storeToRefs(store);
const notificationStore = useNotificationStore();

const chartContainer = ref(null);

// Move Part Modal State
const isMoveModalOpen = ref(false);
const movePartData = ref<any>(null);
const selectedMoveMachine = ref('');
const moveLoading = ref(false);
const movePartProcesses = ref<any[]>([]);

// Realtime Elimination Traceability Modal State
const isTraceModalOpen = ref(false);
const traceLoading = ref(false);
const traceData = ref<any>(null);
const traceFilterTab = ref('ALL');

const openTraceabilityModal = async (part: any) => {
  const simId = store.currentSimulationId || (store.summaryData && store.summaryData.length > 0 ? store.summaryData[0].id_simulation : null) || (store.createData as any)?.id || 2;
  const pNumber = part.part_number;
  const proc = (part as any).process;
  const mc = part.machine || (part as any).machine_use || selectedViewMachine.value;

  isTraceModalOpen.value = true;
  traceLoading.value = true;
  traceData.value = null;
  traceFilterTab.value = 'ALL';

  try {
    const res: any = await getPartEliminationTrace(simId, pNumber, proc, mc);
    if (res && res.status === 'success') {
      traceData.value = res;
    } else {
      notificationStore.showDialogWarning("Warning", res?.message || "Gagal mengambil data diagnostik mesin.");
    }
  } catch (err) {
    console.error("Error fetching trace diagnostics:", err);
    notificationStore.showDialogError("Error", "Terjadi kesalahan saat memuat data diagnostik.");
  } finally {
    traceLoading.value = false;
  }
};

const filteredTraceDiagnostics = computed(() => {
  if (!traceData.value || !traceData.value.diagnostics) return [];
  const list = traceData.value.diagnostics;
  if (traceFilterTab.value === 'COMPATIBLE') {
    return list.filter((d: any) => d.is_compatible);
  }
  if (traceFilterTab.value === 'INCOMPATIBLE') {
    return list.filter((d: any) => !d.is_compatible);
  }
  return list;
});

const selectedViewMachine = ref('');

const loadMachineParts = async () => {
  if (!selectedViewMachine.value) {
    notificationStore.showDialogWarning("Warning", "Silakan pilih mesin terlebih dahulu");
    return;
  }
  const simId = store.currentSimulationId || (store.summaryData && store.summaryData.length > 0 ? store.summaryData[0].id_simulation : null) || (store.createData as any)?.id;
  if (simId) {
    await store.fetchSimulationLoadByMachine(simId, selectedViewMachine.value);
  } else {
    notificationStore.showDialogWarning("Warning", "Data simulasi belum tersimpan di backend. Silakan simpan simulasi terlebih dahulu.");
  }
};

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(50);
const searchQuery = ref('');

// Dropdown Period States
const selectedYear = ref(new Date().getFullYear().toString());
const selectedMonth = ref(String(new Date().getMonth() + 1).padStart(2, '0'));

const parsePeriode = (val?: string) => {
  if (!val) return { year: '', month: '' };
  const s = String(val).trim();

  const m1 = s.match(/^(\d{4})[-\/\._](\d{1,2})$/);
  if (m1) return { year: m1[1], month: m1[2].padStart(2, '0') };

  const m2 = s.match(/^(\d{1,2})[-\/\._](\d{4})$/);
  if (m2) return { year: m2[2], month: m2[1].padStart(2, '0') };

  const m3 = s.match(/^(\d{4})(\d{2})$/);
  if (m3) {
    const mNum = parseInt(m3[2], 10);
    if (mNum >= 1 && mNum <= 12) return { year: m3[1], month: m3[2] };
  }

  const monthMap: Record<string, string> = {
    jan: '01', januari: '01', january: '01',
    feb: '02', februari: '02', february: '02',
    mar: '03', maret: '03', march: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06', june: '06',
    jul: '07', juli: '07', july: '07',
    agu: '08', agust: '08', agustus: '08', aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    okt: '10', oktober: '10', oct: '10', october: '10',
    nov: '11', november: '11',
    des: '12', desember: '12', dec: '12', december: '12'
  };

  const sLower = s.toLowerCase();
  for (const [name, num] of Object.entries(monthMap)) {
    if (sLower.includes(name)) {
      const ym = s.match(/(\d{4})/);
      if (ym) return { year: ym[1], month: num };
    }
  }

  return { year: '', month: '' };
};

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const yearsSet = new Set<string>();
  for (let y = currentYear - 3; y <= currentYear + 5; y++) {
    yearsSet.add(y.toString());
  }
  if (selectedYear.value && !isNaN(Number(selectedYear.value))) {
    yearsSet.add(selectedYear.value);
  }
  return Array.from(yearsSet).sort((a, b) => Number(a) - Number(b));
});

const monthOptions = [
  { title: 'Januari', value: '01' },
  { title: 'Februari', value: '02' },
  { title: 'Maret', value: '03' },
  { title: 'April', value: '04' },
  { title: 'Mei', value: '05' },
  { title: 'Juni', value: '06' },
  { title: 'Juli', value: '07' },
  { title: 'Agustus', value: '08' },
  { title: 'September', value: '09' },
  { title: 'Oktober', value: '10' },
  { title: 'November', value: '11' },
  { title: 'Desember', value: '12' }
];

let isSyncingFromPeriode = false;

const syncYearMonthFromPeriode = (val?: string) => {
  if (!val) return;
  const { year, month } = parsePeriode(val);
  if (year && month) {
    isSyncingFromPeriode = true;
    selectedYear.value = year;
    selectedMonth.value = month;
    nextTick(() => {
      isSyncingFromPeriode = false;
    });
  }
};

watch(() => createForm.value?.periode, (newVal) => {
  syncYearMonthFromPeriode(newVal);
});

watch([selectedYear, selectedMonth], () => {
  if (!isSyncingFromPeriode && selectedYear.value && selectedMonth.value) {
    createForm.value.periode = `${selectedYear.value}-${selectedMonth.value}`;
  }
}, { immediate: true });

// Dialog Adjust Prod Time
const isAdjustDialogOpen = ref(false);
const adjustMachineData = ref<any>(null);
const adjustValueInput = ref<number | string>(0);
const adjustLoading = ref(false);

// Helper to get effective Weld Time (fallback to prod_time or TPT net if prod_time_final is 0/null)
const getWeldTime = (item: any) => {
  if (!item) return 0;
  const prodFinal = Number(item.prod_time_final);
  const prodTime = Number(item.prod_time);
  const prodAdjust = Number(item.prod_time_adjust || 0);
  
  if (!isNaN(prodFinal) && prodFinal > 0) {
    return Number(prodFinal.toFixed(1));
  }
  
  if (!isNaN(prodTime) && prodTime > 0) {
    const calculated = prodTime + prodAdjust;
    return Number(calculated.toFixed(1));
  }
  
  const tpt = Number(item.tpt || item.tpt_jam || 0);
  const dandori = Number(item.dandori || 0);
  const dt = Number(item.downtime || 0);
  const tc = Number(item.tip_change ?? item.tc ?? 0);
  const teiryo = Number(item.teiryo || 0);
  const wt = tpt - dandori - dt - tc - teiryo;
  return wt > 0 ? Number(wt.toFixed(1)) : 0;
};

const openAdjustDialog = (m: any) => {
  adjustMachineData.value = m;
  adjustValueInput.value = Number(m.prod_time_adjust || 0);
  isAdjustDialogOpen.value = true;
};

const handleSaveAdjustment = async () => {
  if (!adjustMachineData.value) return;
  const adjVal = Number(adjustValueInput.value || 0);
  
  if (store.currentSimulationId) {
    adjustLoading.value = true;
    try {
      const res = await store.adjustProdTime(
        store.currentSimulationId,
        adjustMachineData.value.machine,
        adjVal,
        'jam'
      );
      if (res) {
        isAdjustDialogOpen.value = false;
        await initChart();
      }
    } finally {
      adjustLoading.value = false;
    }
  } else {
    // Local memory update before saving to DB
    const m = store.summaryData.find((item: any) => item.machine === adjustMachineData.value.machine);
    if (m) {
      m.prod_time_adjust = adjVal;
      m.prod_time_final = Number((Number(m.prod_time || 0) + adjVal).toFixed(2));
      m.tpt = Number((m.prod_time_final + Number(m.dandori || 0) + Number(m.downtime || 0) + Number(m.tip_change ?? m.tc ?? 0.1) + Number(m.teiryo || 0)).toFixed(2));
      isAdjustDialogOpen.value = false;
      await initChart();
    }
  }
};

const handleResetAdjustment = async () => {
  adjustValueInput.value = 0;
  await handleSaveAdjustment();
};

// Export PNG / PDF State
const exportLoading = ref(false);
const exportType = ref<'png' | 'pdf' | null>(null);
const summaryExportArea = ref<HTMLElement | null>(null);

const exportSummary = async (type: 'png' | 'pdf') => {
  if (!summaryExportArea.value) return;
  exportLoading.value = true;
  exportType.value = type;

  try {
    const el = summaryExportArea.value;
    const canvas = await html2canvas(el, {
      scale: 2.5,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight
    });

    const simId = store.currentSimulationId || 'baru';
    const area = (createForm.value?.area || 'WSS').replace(/\s+/g, '_');
    const periode = createForm.value?.periode || '';
    const filename = `GLC_Summary_Simulasi_${simId}_${area}_${periode}`;

    if (type === 'png') {
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notificationStore.showDialogSuccess('Berhasil', 'Grafik & Tabel Summary berhasil diexport ke format PNG.');
    } else if (type === 'pdf') {
      const imgData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <style>
                @page {
                  size: A4 landscape;
                  margin: 6mm;
                }
                * {
                  box-sizing: border-box;
                }
                body {
                  margin: 0;
                  padding: 0;
                  font-family: Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  background-color: #ffffff;
                }
                img {
                  width: 100%;
                  max-width: 100%;
                  height: auto;
                  display: block;
                  object-fit: contain;
                }
                @media print {
                  body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
              </style>
            </head>
            <body>
              <img src="${imgData}" />
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 400);
                };
              <\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  } catch (err) {
    console.error('Error exporting summary:', err);
    notificationStore.showDialogError('Error', 'Gagal mengekspor data summary.');
  } finally {
    exportLoading.value = false;
    exportType.value = null;
  }
};

// Duplicate Validation
const checkDuplicate = async (area: string, periode: string, note: string) => {
  await store.fetchSimulationList();
  const simNote = (note || '').trim().toLowerCase();
  
  const duplicate = store.dataTable.find((sim: any) => {
    const dbNote = (sim.note || '').trim().toLowerCase();
    return (
      String(sim.area).trim().toLowerCase() === String(area).trim().toLowerCase() &&
      String(sim.periode).trim().toLowerCase() === String(periode).trim().toLowerCase() &&
      dbNote === simNote
    );
  });
  return !!duplicate;
};

// Formula Info Modal
const isFormulaModalOpen = ref(false);
const formulaInfo = ref({ title: '', formula: '', desc: '' });

const openFormulaInfo = (field: string) => {
  if (field === 'lot_size_shift') {
    formulaInfo.value = {
      title: 'Lot Size Shift',
      formula: 'Pcs/Month * (Lot Cycle / 2)',
      desc: 'Lot cycle menentukan jumlah kenaikan lot. \n1 = naik tiap shift (2x sehari)\n2 = naik tiap 2 shift (1x sehari)\n4 = naik tiap 4 shift (sekali dlm 2 hari)\nMaka jumlah Pcs/Month dibagi sesuai proporsi tersebut untuk Lot Size Shift.'
    };
  } else if (field === 'prod_time') {
    formulaInfo.value = {
      title: 'Prod Time (mnt)',
      formula: '(Cycle Time * Lot Size Shift) / 60',
      desc: 'Waktu produksi kotor yang diperlukan untuk menyelesaikan Lot Size Shift, dikonversi ke satuan menit.'
    };
  } else if (field === 'tpt') {
    formulaInfo.value = {
      title: 'TPT (mnt)',
      formula: 'Dandori + Prod Time + Downtime',
      desc: 'Total Process Time, yaitu total waktu produksi ditambah dengan semua delay (dandori, downtime) dalam satuan menit.'
    };
  } else if (field === 'uph') {
    formulaInfo.value = {
      title: 'UPH (Unit Per Hour)',
      formula: '(Lot Size Shift / Prod Time) * 60',
      desc: 'Menunjukkan seberapa banyak unit yang bisa diproduksi per jam kerja efektif.'
    };
  } else if (field === 'stroke') {
    formulaInfo.value = {
      title: 'Stroke',
      formula: 'Lot Size Shift * Sigma CKD',
      desc: 'Perhitungan total jumlah stroke.'
    };
  }
  isFormulaModalOpen.value = true;
};

const createHeaders = [
  { title: 'Model', key: 'model' },
  { title: 'Part Number', key: 'part_number' },
  { title: 'Job Number', key: 'job_number' },
  { title: 'Total Proses', key: 'total_proses' },
  { title: 'Part Name', key: 'part_name' },
  { title: 'Parent Part', key: 'part_top_parent' },
  { title: 'Proses', key: 'process' },
  { title: 'Qty Kanban', key: 'qty_kanban' },
  { title: 'Pcs/Day', key: 'pcs_day_monthly' },
  { title: 'Prev Pcs/Day', key: 'pcs_day_prev' },
  { title: 'Sigma CKD', key: 'ckd' },
  { title: 'CKD Part', key: 'ckd_part_number' },
  { title: 'Stroke', key: 'stroke' },
  { title: 'Machine Use', key: 'machine_use' },
  { title: 'Machine Prev', key: 'machine_prev' },
  { title: 'Next Process', key: 'next_process' },
  { title: 'Lot Cycle', key: 'lot_cycle' },
  { title: 'Patan', key: 'patan' },
  { title: 'Lot Size Shift', key: 'lot_size_shift' },
  { title: 'Count Pallet', key: 'count_pallet' },
  { title: 'Cycle Time', key: 'cycle_time_sec' },
  { title: 'Jig', key: 'jig' },
  { title: 'Jumlah Spot', key: 'jumlah_spot' },
  { title: 'Freq Dresser', key: 'freq_dresser' },
  { title: 'Freq Tip Change', key: 'freq_tip_change' },
  { title: 'Upper Holder', key: 'upper_holder' },
  { title: 'Lower Holder', key: 'lower_holder' },
  { title: 'KVA', key: 'kva' },
  { title: 'Dandori (mnt)', key: 'dandori' },
  { title: 'Downtime (mnt)', key: 'downtime' },
  { title: 'Prod Time (mnt)', key: 'prod_time' },
  { title: 'TPT (mnt)', key: 'tpt' },
  { title: 'UPH', key: 'uph' }
];

const getFieldRowspan = (data: any[], index: number, field: string, parentField?: string) => {
  if (!data || index < 0 || index >= data.length) return 1;

  const currentVal = String(data[index]?.[field] ?? '');
  const currentParent = parentField ? String(data[index]?.[parentField] ?? '') : null;

  if (index > 0) {
    const prevVal = String(data[index - 1]?.[field] ?? '');
    const prevParent = parentField ? String(data[index - 1]?.[parentField] ?? '') : null;
    if (prevVal === currentVal && (!parentField || prevParent === currentParent)) {
      return 0;
    }
  }

  let count = 1;
  for (let i = index + 1; i < data.length; i++) {
    const nextVal = String(data[i]?.[field] ?? '');
    const nextParent = parentField ? String(data[i]?.[parentField] ?? '') : null;
    if (nextVal === currentVal && (!parentField || nextParent === currentParent)) {
      count++;
    } else {
      break;
    }
  }
  return count;
};

const getGroupNo = (data: any[], index: number) => {
  let count = 0;
  for (let i = 0; i <= index; i++) {
    if (i === 0 || data[i]?.part_number !== data[i - 1]?.part_number) {
      count++;
    }
  }
  return count;
};

const dedicatedHeaders = [
  { title: 'Area', key: 'area' },
  { title: 'Part Number', key: 'part_number' },
  { title: 'Machine', key: 'machine' },
  { title: 'Note', key: 'note' }
];

const dedSortKey = ref<string | null>(null);
const dedSortDir = ref<'asc' | 'desc'>('asc');
const dedExcelSearchQueries = ref<Record<string, string>>({});
const dedExcelCheckedFilters = ref<Record<string, string[]>>({});

dedicatedHeaders.forEach(h => {
  dedExcelSearchQueries.value[h.key] = '';
  dedExcelCheckedFilters.value[h.key] = [];
});

const getDedExcelUniqueItems = (key: string) => {
  if (!dedicatedStore.dataTable) return [];
  const unique = new Set(dedicatedStore.dataTable.map((item: any) => String(item[key] ?? '')));
  return Array.from(unique).sort();
};

const getDedExcelFilteredUniqueItems = (key: string) => {
  const items = getDedExcelUniqueItems(key);
  const query = (dedExcelSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => String(item).toLowerCase().includes(query));
};

const isAllDedExcelItemsChecked = (key: string) => {
  const allFilteredItems = getDedExcelFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = dedExcelCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const toggleDedExcelSelectAll = (key: string) => {
  const allFilteredItems = getDedExcelFilteredUniqueItems(key);
  const checked = dedExcelCheckedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    dedExcelCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    dedExcelCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isDedExcelFilterActive = (key: string) => {
  return (dedExcelCheckedFilters.value[key] && dedExcelCheckedFilters.value[key].length > 0) || 
         (dedExcelSearchQueries.value[key] && dedExcelSearchQueries.value[key].length > 0);
};

const setDedExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (dedSortKey.value === key && dedSortDir.value === dir) {
    dedSortKey.value = null;
  } else {
    dedSortKey.value = key;
    dedSortDir.value = dir;
  }
};

const clearSingleDedExcelFilter = (key: string) => {
  dedExcelCheckedFilters.value[key] = [];
  dedExcelSearchQueries.value[key] = '';
  if (dedSortKey.value === key) dedSortKey.value = null;
};

const resetAllDedExcelFilters = () => {
  dedSortKey.value = null;
  dedSortDir.value = 'asc';
  dedicatedHeaders.forEach(h => {
    dedExcelSearchQueries.value[h.key] = '';
    dedExcelCheckedFilters.value[h.key] = [];
  });
};

const isAnyDedExcelFilterActive = computed(() => {
  return dedicatedHeaders.some(h => isDedExcelFilterActive(h.key)) || dedSortKey.value !== null;
});

const filteredDedicatedData = computed(() => {
  let result = [...(dedicatedStore.dataTable || [])];

  dedicatedHeaders.forEach(h => {
    const key = h.key;
    const query = dedExcelSearchQueries.value[key]?.toLowerCase();
    const checked = dedExcelCheckedFilters.value[key];

    if (query) {
      result = result.filter((item: any) => String(item[key] ?? '').toLowerCase().includes(query));
    }
    
    if (checked && checked.length > 0) {
      result = result.filter((item: any) => checked.includes(String(item[key] ?? '')));
    }
  });

  if (dedSortKey.value) {
    result.sort((a: any, b: any) => {
      const valA = String(a[dedSortKey.value!] ?? '').toLowerCase();
      const valB = String(b[dedSortKey.value!] ?? '').toLowerCase();
      if (valA < valB) return dedSortDir.value === 'asc' ? -1 : 1;
      if (valA > valB) return dedSortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return result;
});

const isPrevMachineActive = (item: any) => {
  if (item.is_machine_prev_active !== undefined) {
    return !!item.is_machine_prev_active;
  }
  const prev = item.machine_prev;
  return !!prev && activeMachineOptions.value.some((opt: any) => opt.machine === prev);
};

const toggleUsePrevMachine = (item: any, val: boolean | null) => {
  const isChecked = !!val;
  if (!item.original_machine) {
    item.original_machine = item.machine;
  }
  const prev = item.machine_prev;
  if (isChecked) {
    if (prev && isPrevMachineActive(item)) {
      item.machine_use = prev;
      item.use_prev = true;
    } else {
      item.use_prev = false;
      item.machine_use = item.original_machine;
      notificationStore.showDialogWarning("Tidak Dapat Dipindah", "Machine Prev (Backup) tidak aktif atau tidak ditemukan.");
    }
  } else {
    item.use_prev = false;
    item.machine_use = item.original_machine;
  }
};

const onMachineUseChange = (item: any) => {
  if (item.machine_prev && item.machine_use === item.machine_prev && isPrevMachineActive(item)) {
    item.use_prev = true;
  } else {
    item.use_prev = false;
  }
};

const useAllPrevMachines = ref(false);
const toggleAllPrevMachines = (val: boolean | null) => {
  const isChecked = !!val;
  useAllPrevMachines.value = isChecked;
  if (!store.inactiveMachineInUseData) return;
  if (isChecked) {
    let movedCount = 0;
    store.inactiveMachineInUseData.forEach((item: any) => {
      if (!item.original_machine) {
        item.original_machine = item.machine;
      }
      const prev = item.machine_prev;
      if (prev && isPrevMachineActive(item)) {
        item.machine_use = prev;
        item.use_prev = true;
        movedCount++;
      } else {
        item.use_prev = false;
      }
    });
    if (movedCount > 0) {
      notificationStore.showDialogSuccess("Berhasil", `${movedCount} part berhasil dipindahkan ke Prev Machine yang aktif.`);
    } else {
      notificationStore.showDialogWarning("Info", "Tidak ada Prev Machine yang aktif untuk dipindahkan.");
    }
  } else {
    store.inactiveMachineInUseData.forEach((item: any) => {
      if (!item.original_machine) {
        item.original_machine = item.machine;
      }
      item.machine_use = item.original_machine;
      item.use_prev = false;
    });
    notificationStore.showDialogSuccess("Berhasil", "Semua part telah dikembalikan ke Machine Utama.");
  }
};

watch(() => store.inactiveMachineInUseData, (newData) => {
  if (Array.isArray(newData)) {
    newData.forEach((item: any) => {
      if (!item.original_machine) {
        item.original_machine = item.machine;
      }
      item.use_prev = !!(item.machine_prev && item.machine_use === item.machine_prev && isPrevMachineActive(item));
    });
  }
}, { immediate: true, deep: true });

// Excel-like Filter & Sort State for Create Table
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');
const excelSearchQueries = ref<Record<string, string>>({});
const excelCheckedFilters = ref<Record<string, string[]>>({});

createHeaders.forEach(h => {
  excelSearchQueries.value[h.key] = '';
  excelCheckedFilters.value[h.key] = [];
});

const getItemColValue = (item: any, key: string) => {
  if (!item) return '';
  if (key === 'pcs_day_monthly') {
    return String(item.pcs_day_monthly ?? item.pcs_day ?? '');
  }
  if (key === 'stroke') {
    return String(item.stroke_day ?? item.stroke ?? '');
  }
  return String(item[key] ?? '');
};

const getExcelUniqueItems = (key: string) => {
  if (!createData.value) return [];
  const unique = new Set(createData.value.map((item: any) => getItemColValue(item, key)));
  return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

const formatFilterValue = (key: string, val: any) => {
  return val || '-';
};

const getExcelFilteredUniqueItems = (key: string) => {
  const items = getExcelUniqueItems(key);
  const query = (excelSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => String(item).toLowerCase().includes(query));
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
  currentPage.value = 1;
};

const resetAllExcelFilters = () => {
  sortKey.value = null;
  sortDir.value = 'asc';
  createHeaders.forEach(h => {
    excelSearchQueries.value[h.key] = '';
    excelCheckedFilters.value[h.key] = [];
  });
  searchQuery.value = '';
  currentPage.value = 1;
};

const isAnyExcelFilterActive = computed(() => {
  return createHeaders.some(h => isExcelFilterActive(h.key)) || sortKey.value !== null || (searchQuery.value && searchQuery.value.trim().length > 0);
});

const getHeaderStickyClass = (key: string) => {
  if (key === 'model') return 'sticky-col sticky-col-3';
  if (key === 'part_number') return 'sticky-col sticky-col-4';
  if (key === 'job_number') return 'sticky-col sticky-col-5';
  return '';
};

const getHeaderCustomStyle = (key: string) => {
  if (key === 'part_name') {
    return 'min-width: 280px; width: 280px;';
  }
  if (key === 'part_top_parent') {
    return 'min-width: 180px; width: 180px;';
  }
  return '';
};

const filteredCreateData = computed(() => {
  let result = [...(createData.value || [])];

  if (searchQuery.value) {
    const lowerCaseQuery = searchQuery.value.toLowerCase().trim();
    result = result.filter((item: any) => {
      return (
        (item.part_number && item.part_number.toLowerCase().includes(lowerCaseQuery)) ||
        (item.part_name && item.part_name.toLowerCase().includes(lowerCaseQuery)) ||
        (item.part_top_parent && String(item.part_top_parent).toLowerCase().includes(lowerCaseQuery)) ||
        (item.machine_use && item.machine_use.toLowerCase().includes(lowerCaseQuery)) ||
        (item.machine_prev && item.machine_prev.toLowerCase().includes(lowerCaseQuery)) ||
        (item.model && item.model.toLowerCase().includes(lowerCaseQuery)) ||
        (item.job_number && item.job_number.toLowerCase().includes(lowerCaseQuery)) ||
        (item.process && String(item.process).toLowerCase().includes(lowerCaseQuery))
      );
    });
  }

  createHeaders.forEach(h => {
    const key = h.key;
    const query = (excelSearchQueries.value[key] || '').toLowerCase().trim();
    const checked = excelCheckedFilters.value[key];

    if (query) {
      result = result.filter((item: any) => getItemColValue(item, key).toLowerCase().includes(query));
    }
    
    if (checked && checked.length > 0) {
      result = result.filter((item: any) => checked.includes(getItemColValue(item, key)));
    }
  });

  if (sortKey.value) {
    result.sort((a: any, b: any) => {
      const valA = getItemColValue(a, sortKey.value!).toLowerCase();
      const valB = getItemColValue(b, sortKey.value!).toLowerCase();
      if (valA < valB) return sortDir.value === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    result.sort((a: any, b: any) => {
      const modelA = String(a.model ?? '').toLowerCase();
      const modelB = String(b.model ?? '').toLowerCase();
      if (modelA !== modelB) return modelA.localeCompare(modelB);

      const pnA = String(a.part_number ?? '').toLowerCase();
      const pnB = String(b.part_number ?? '').toLowerCase();
      if (pnA !== pnB) return pnA.localeCompare(pnB);

      const jobA = String(a.job_number ?? '').toLowerCase();
      const jobB = String(b.job_number ?? '').toLowerCase();
      if (jobA !== jobB) return jobA.localeCompare(jobB);

      const procA = String(a.process ?? '');
      const procB = String(b.process ?? '');
      return procA.localeCompare(procB);
    });
  }

  return result;
});

watch([searchQuery, excelCheckedFilters, excelSearchQueries, sortKey], () => {
  currentPage.value = 1;
}, { deep: true });

const totalPages = computed(() => Math.ceil(filteredCreateData.value.length / itemsPerPage.value) || 1);
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredCreateData.value.slice(start, start + itemsPerPage.value);
});

const combinedViewMachineOptions = computed(() => {
  const active = activeMachineOptions.value
    .filter((m: any) => {
      const area = String(m.area || '').toUpperCase();
      const line = String(m.line || '').toUpperCase();
      const name = String(m.machine || '').toUpperCase();
      return area.includes('SA') || area.includes('SUB ASSY') || line.includes('ROBOT') || name.startsWith('RB-') || name.startsWith('RSW');
    })
    .map((m: any) => m.machine);
  const used = summaryData.value
    .map((m: any) => m.machine)
    .filter(Boolean);
  const all = [...new Set([...active, ...used])].filter(Boolean).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );
  return all.map((m: string) => ({ machine: m }));
});

const machinePartHeaders = [
  { title: 'Urutan', key: 'urutan' },
  { title: 'Part Number', key: 'part_number' },
  { title: 'Spec Gun', key: 'spec_gun' },
  { title: 'Job Number', key: 'job_number' },
  { title: 'Proses', key: 'process' },
  { title: 'Jam Start (Shift 1)', key: 'time_proc_start' },
  { title: 'Jam End (Shift 1)', key: 'time_proc_end' },
  { title: 'Jam Start (Shift 2)', key: 'time_proc_start_shift2' },
  { title: 'Jam End (Shift 2)', key: 'time_proc_end_shift2' },
  { title: 'Model', key: 'model' },
  { title: 'Machine Prev', key: 'machine_prev' },
  { title: 'TPT (mnt)', key: 'tpt' },
  { title: 'Qty Kanban', key: 'qty_kanban' },
  { title: 'C/T (s)', key: 'cycle_time_sec' },
  { title: 'Jig', key: 'jig' },
  { title: 'Jumlah Spot', key: 'jumlah_spot' },
  { title: 'Freq Dresser', key: 'freq_dresser' },
  { title: 'Freq Tip Change', key: 'freq_tip_change' },
  { title: 'Pcs/Day', key: 'pcs_day' },
  { title: 'Next Process', key: 'next_process' },
];

const machinePartSortKey = ref<string | null>(null);
const machinePartSortDir = ref<'asc' | 'desc'>('asc');
const machinePartSearchQueries = ref<Record<string, string>>({});
const machinePartCheckedFilters = ref<Record<string, any[]>>({});

const getMachinePartUniqueItems = (key: string) => {
  if (!store.machinePartData) return [];
  const unique = new Set(store.machinePartData.map((item: any) => String(item[key] ?? '')));
  return Array.from(unique).sort();
};

const getMachinePartFilteredUniqueItems = (key: string) => {
  const items = getMachinePartUniqueItems(key);
  const query = (machinePartSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => String(item).toLowerCase().includes(query));
};

const isAllMachinePartExcelItemsChecked = (key: string) => {
  const allFilteredItems = getMachinePartFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = machinePartCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const toggleMachinePartExcelSelectAll = (key: string) => {
  const allFilteredItems = getMachinePartFilteredUniqueItems(key);
  const checked = machinePartCheckedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    machinePartCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    machinePartCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isMachinePartExcelFilterActive = (key: string) => {
  return (machinePartCheckedFilters.value[key] && machinePartCheckedFilters.value[key].length > 0) || 
         (machinePartSearchQueries.value[key] && machinePartSearchQueries.value[key].length > 0);
};

const setMachinePartExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (machinePartSortKey.value === key && machinePartSortDir.value === dir) {
    machinePartSortKey.value = null;
  } else {
    machinePartSortKey.value = key;
    machinePartSortDir.value = dir;
  }
};

const clearSingleMachinePartExcelFilter = (key: string) => {
  machinePartCheckedFilters.value[key] = [];
  machinePartSearchQueries.value[key] = '';
  if (machinePartSortKey.value === key) machinePartSortKey.value = null;
};

const resetAllMachinePartExcelFilters = () => {
  machinePartSortKey.value = null;
  machinePartSortDir.value = 'asc';
  machinePartHeaders.forEach(h => {
    machinePartSearchQueries.value[h.key] = '';
    machinePartCheckedFilters.value[h.key] = [];
  });
};

const isAnyMachinePartExcelFilterActive = computed(() => {
  return machinePartHeaders.some(h => isMachinePartExcelFilterActive(h.key)) || machinePartSortKey.value !== null;
});

const filteredMachinePartData = computed(() => {
  let result = [...store.machinePartData];

  machinePartHeaders.forEach(h => {
    const key = h.key;
    const query = machinePartSearchQueries.value[key]?.toLowerCase();
    const checked = machinePartCheckedFilters.value[key];

    if (query) {
      result = result.filter((item: any) => String(item[key] ?? '').toLowerCase().includes(query));
    }
    
    if (checked && checked.length > 0) {
      result = result.filter((item: any) => checked.includes(String(item[key] ?? '')));
    }
  });

  if (machinePartSortKey.value) {
    result.sort((a: any, b: any) => {
      const valA = String(a[machinePartSortKey.value!] ?? '').toLowerCase();
      const valB = String(b[machinePartSortKey.value!] ?? '').toLowerCase();
      
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return machinePartSortDir.value === 'asc' ? numA - numB : numB - numA;
      }
      
      if (valA < valB) return machinePartSortDir.value === 'asc' ? -1 : 1;
      if (valA > valB) return machinePartSortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return result;
});


const initChart = async () => {
  await nextTick();
  if (!chartContainer.value) return;

  if (!store.summaryData || store.summaryData.length === 0) {
    const simId = store.currentSimulationId;
    if (simId) {
      await store.fetchSummaryData(simId);
    }
  }

  if (!store.summaryData || store.summaryData.length === 0) return;

  const summarySorted = [...store.summaryData].sort((a: any, b: any) =>
    String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
  );
  const categories = summarySorted.map((d: any) => d.machine);
  const dandori = summarySorted.map((d: any) => Number(d.dandori || 0));
  const downtime = summarySorted.map((d: any) => Number(d.downtime || 0));
  const tc = summarySorted.map((d: any) => Number(d.tip_change ?? d.tc ?? 0));
  const teiryo = summarySorted.map((d: any) => Number(d.teiryo || 0));
  const weldTime = summarySorted.map((d: any) => getWeldTime(d));
  const uphData = summarySorted.map((d: any) => Number(d.uph || (d.tpt > 0 && d.pcs_day > 0 ? (d.pcs_day / d.tpt) : 0)).toFixed(1)).map(Number);

  Highcharts.chart(chartContainer.value, {
    chart: { type: 'column', marginRight: 75 },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: {
      categories,
      labels: {
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
        title: { text: 'TPT / DAY (JAM)', style: { fontWeight: 'bold', color: '#000000' } },
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
          formatter: function(this: any) {
            return this.total ? this.total.toFixed(1) : '';
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
    plotOptions: {
      column: {
        stacking: 'normal',
        groupPadding: 0.05,
        pointPadding: 0.02,
        borderWidth: 0
      }
    },
    series: [
      { name: 'DownTime', data: downtime, color: '#d50000', stack: 'tpt', yAxis: 0 },
      { name: 'T/C', data: tc, color: '#fbc02d', stack: 'tpt', yAxis: 0 },
      { name: 'Dandori', data: dandori, color: '#00a2ff', stack: 'tpt', yAxis: 0 },
      { name: 'Weld Time', data: weldTime, color: '#005db9', stack: 'tpt', yAxis: 0 },
      { name: 'Teiryo', data: teiryo, color: '#800080', stack: 'tpt', showInLegend: false, yAxis: 0 },
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
    ]
  } as any);
};

onMounted(async () => {
  store.step = 1;
  const source = (route.query.source as string) || 'master';
  const area = (route.query.area as string) || 'SA ADM';
  const id_simulation = route.query.id_simulation as string;
  
  if (source === 'master' && area) {
    await store.fetchCreateFromMaster(area);
  } else if (source === 'existing' && id_simulation) {
    await store.fetchSimulationFromExisting(id_simulation);
  } else if (source === 'live') {
    await store.fetchSimulationLive(area);
  } else if (createData.value.length === 0 && area) {
    await store.fetchCreateFromMaster(area);
  }

  if (activeMachineOptions.value.length === 0) {
    await store.fetchActiveMachines(area || 'SA ADM');
  }
  store.step = 1;
});

const calculateRow = (item: any, trigger?: string) => {
  const lot_cycle = Number(item.lot_cycle) || 1;
  const cycle_time_sec = Number(item.cycle_time_sec) || 0;
  const dandori = Number(item.dandori) || 0;
  const downtime = Number(item.downtime) || 0;
  const ckd = Number(item.ckd) || 1;
  const pcs_day_monthly = Number(item.pcs_day_monthly) || 0;
  const qty_kanban = Number(item.qty_kanban) || 0;

  if (trigger !== 'lot_size_shift') {
    const base_lotsize = pcs_day_monthly * (lot_cycle / 2);
    if (qty_kanban > 0) {
      item.lot_size_shift = Math.ceil(base_lotsize / qty_kanban) * qty_kanban;
    } else {
      item.lot_size_shift = Math.ceil(base_lotsize);
    }
  }
  
  const lot_size_shift = Number(item.lot_size_shift) || 0;
  item.count_pallet = qty_kanban > 0 ? Number((lot_size_shift / qty_kanban).toFixed(2)) : 0;
  item.patan = lot_cycle <= 1 ? 'A B C D' : 'A C';

  item.prod_time = Number(((cycle_time_sec * lot_size_shift) / 60).toFixed(2));
  item.tpt = Number((dandori + item.prod_time + downtime).toFixed(2));
  item.uph = item.prod_time > 0 ? Number(((lot_size_shift / item.prod_time) * 60).toFixed(2)) : 0;
  item.stroke = Number((lot_size_shift * ckd).toFixed(2));
};

const onMachineChange = (item: any) => {
  if (item._old_machine && item._old_machine !== item.machine_use) {
    item.machine_prev = item._old_machine;
  }
  
  const selectedMachine = activeMachineOptions.value.find((m: any) => m.machine === item.machine_use);
  if (selectedMachine) {
    item.upper_holder = selectedMachine.upper_holder;
    item.lower_holder = selectedMachine.lower_holder;
    item.kva = selectedMachine.kva;
  } else {
    item.upper_holder = null;
    item.lower_holder = null;
    item.kva = null;
  }
};

const isCreateFromMaster = computed(() => {
  return !route.query.source || route.query.source === 'master';
});

const currentMachineSourceMode = ref<'master' | 'sim_load'>('master');

const toggleMachineSourceMode = () => {
  if (currentMachineSourceMode.value === 'master') {
    // Switch to Riwayat Mesin glc_simulation_load
    let changedCount = 0;
    createData.value.forEach((item: any) => {
      const targetMachine = item.machine_sim_load || item.machine_master || item.machine_use;
      if (targetMachine && targetMachine !== item.machine_use) {
        if (!item.machine_prev) {
          item.machine_prev = item.machine_use;
        }
        item.machine_use = targetMachine;

        // Update machine specs
        const selectedMachine = activeMachineOptions.value.find((m: any) => m.machine === targetMachine)
          || store.machineOptions.find((m: any) => m.machine === targetMachine);
        if (selectedMachine) {
          item.upper_holder = selectedMachine.upper_holder;
          item.lower_holder = selectedMachine.lower_holder;
          item.kva = selectedMachine.kva;
        }
        calculateRow(item);
        changedCount++;
      }
    });
    currentMachineSourceMode.value = 'sim_load';
    notificationStore.showAlertSuccess(
      `Mode dialihkan ke: Riwayat Simulasi (${changedCount} part disesuaikan ke mesin riwayat terakhir)`
    );
  } else {
    // Switch back to Mesin Master Data
    let changedCount = 0;
    createData.value.forEach((item: any) => {
      const targetMachine = item.machine_master || item.machine;
      if (targetMachine && targetMachine !== item.machine_use) {
        item.machine_use = targetMachine;
        item.machine_prev = '';

        // Update machine specs
        const selectedMachine = activeMachineOptions.value.find((m: any) => m.machine === targetMachine)
          || store.machineOptions.find((m: any) => m.machine === targetMachine);
        if (selectedMachine) {
          item.upper_holder = selectedMachine.upper_holder;
          item.lower_holder = selectedMachine.lower_holder;
          item.kva = selectedMachine.kva;
        }
        calculateRow(item);
        changedCount++;
      }
    });
    currentMachineSourceMode.value = 'master';
    notificationStore.showAlertSuccess(
      `Mode dialihkan ke: Master Data (${changedCount} part dikembalikan ke mesin master)`
    );
  }
};

const cancel = () => {
  router.push('/Transaction/welding/subassy-simulation');
};

const isSaving = ref(false);

const handleSave = async () => {
  if (isSaving.value) return;

  const area = createForm.value.area;
  const periode = createForm.value.periode;
  const note = createForm.value.note;

  if (!area || !periode) {
    notificationStore.showDialogWarning("Warning", "Area dan Periode wajib diisi.");
    return;
  }

  isSaving.value = true;
  store.createLoading = true;
  // Let the browser paint the loading spinner for the button/page
  await nextTick();
  
  try {
    const isDuplicate = await checkDuplicate(area, periode, note);
    if (isDuplicate) {
      notificationStore.showDialogError(
        "Simulasi Duplikat",
        `Simulasi dengan kombinasi Area: "${area}", Periode: "${periode}", dan Note: "${note || '-'}" sudah ada di database.`
      );
      isSaving.value = false;
      store.createLoading = false;
      return;
    }

        const authStore = useAuthStore();
    const activeUser = (authStore.user as any)?.username || (authStore.user as any)?.fullname || (authStore.user as any)?.first_name || 'SYSTEM';
    const success = await store.saveSimulation(activeUser);
    if (success && store.currentSimulationId) {
      await store.fetchSummaryData(store.currentSimulationId);
      
      // Switch to step 2 after data is ready
      await dedicatedStore.fetchDedicatedMachines(
        undefined, 
        undefined, 
        store.createForm.area,
        store.currentSimulationId // Kirim parameter id_simulation baru ini
      );
      await store.fetchInactiveMachineInUse(store.currentSimulationId);
      
      // We will render chart later when entering step 3
    }
  } finally {
    isSaving.value = false;
    store.createLoading = false;
  }
};

const proceedToStep3 = async () => {
  store.createLoading = true;
  try {
    // Periksa apakah ada machine yang diubah pada Inactive Machine
    if (store.inactiveMachineInUseData && store.inactiveMachineInUseData.length > 0) {
      const batchItems: { id_load: number; new_machine: string }[] = [];
      for (const item of store.inactiveMachineInUseData) {
        if (item.machine_use && item.machine_use !== item.machine) {
          batchItems.push({
            id_load: Number(item.id_load || item.id_gsl || item.id),
            new_machine: item.machine_use
          });
        }
      }
      if (batchItems.length > 0) {
        await store.changeMachineLoadBatch(batchItems);
      }
    }

    // WAJIB fetch summaryData sebelum masuk ke Step 3 agar grafik & tabel terisi
    const simId = store.currentSimulationId || (store.summaryData && store.summaryData.length > 0 ? store.summaryData[0].id_simulation : null) || (store.createData as any)?.id;
    if (simId) {
      await store.fetchSummaryData(simId);
      if (!selectedViewMachine.value && combinedViewMachineOptions.value.length > 0) {
        selectedViewMachine.value = combinedViewMachineOptions.value[0].machine;
      }
      if (selectedViewMachine.value) {
        await loadMachineParts();
      }
    }
  } catch (err) {
    console.error("Error preparing Step 3:", err);
  } finally {
    store.createLoading = false;
    store.step = 3;
    setTimeout(() => {
       initChart();
    }, 250);
  }
};

const cancelProgress = async () => {
  notificationStore.showConfirm(
    "Konfirmasi Batal",
    "Apakah Anda yakin ingin membatalkan dan menghapus data simulasi ini?",
    async () => {
      if (store.currentSimulationId) {
        const success = await store.cancelSimulationProgress(store.currentSimulationId);
        if (success) {
          cancel(); // Return to list or step 1
        }
      }
    }
  );
};

const isAutoBalancing = ref(false);
const isCalculatingTimes = ref(false);

const isBalancingExplanationModalOpen = ref(false);
const hasRunAutoBalance = ref(false);
const diagnosticsFilterStatus = ref('all');
const diagnosticsSearch = ref('');

const openBalancingExplanationModal = async () => {
  const idSim = store.currentSimulationId || (store.summaryData && store.summaryData.length > 0 ? store.summaryData[0].id_simulation : null) || store.liveSummaryData?.[0]?.id_simulation;
  if (idSim) {
    await store.fetchBalancingDiagnostics(idSim);
  }
  diagnosticsSearch.value = '';
  isBalancingExplanationModalOpen.value = true;
};

const filteredDiagnostics = computed(() => {
  let list = store.balancingDiagnostics || [];
  if (diagnosticsSearch.value && diagnosticsSearch.value.trim()) {
    const q = diagnosticsSearch.value.toLowerCase().trim();
    list = list.filter((d: any) =>
      d.machine?.toLowerCase().includes(q) ||
      d.line?.toLowerCase().includes(q) ||
      d.spec?.gun_type?.toLowerCase().includes(q) ||
      d.spec?.tipe_gun?.toLowerCase().includes(q) ||
      d.spec?.nut_desc?.toLowerCase().includes(q) ||
      d.why_not_moved?.toLowerCase().includes(q) ||
      d.why_not_received?.toLowerCase().includes(q) ||
      d.recommendation?.toLowerCase().includes(q)
    );
  }
  return list;
});

const diagnosticsStats = computed(() => {
  const list = store.balancingDiagnostics || [];
  return {
    total: list.length,
    overload: list.filter((d: any) => d.status === 'overload').length,
    underload: list.filter((d: any) => d.status === 'underload').length,
    normal: list.filter((d: any) => d.status === 'normal').length,
  };
});

const handleCalculateProductionTimes = async () => {
  const simId = store.currentSimulationId || (store.summaryData && store.summaryData.length > 0 ? store.summaryData[0].id_simulation : null) || (store.createData as any)?.id || (route.query.id_simulation as string) || (route.params.id as string);
  if (!simId) {
    notificationStore.showDialogError("Error", "ID Simulasi belum tersedia. Pastikan data simulasi sudah disimpan di Segment 1.");
    return;
  }
  isCalculatingTimes.value = true;
  const success = await store.calculateProductionTimes(simId);
  if (success) {
    if (selectedViewMachine.value) {
      await loadMachineParts();
    }
  }
  isCalculatingTimes.value = false;
};
const isAutoBalanceModalOpen = ref(false);
const proposedAutoBalanceMoves = ref<any[]>([]);
const isApplyingAutoBalance = ref(false);
const selectedBalancingMode = ref<'balanced' | 'shift_target'>('balanced');
const isSwitchingBalancingMode = ref(false);

const autoBalanceSearch = ref('');
const autoBalanceFilterMachineUse = ref<string | null>(null);
const autoBalanceFilterMachineTarget = ref<string | null>(null);
const autoBalanceSortKey = ref<string>('part_number');
const autoBalanceSortOrder = ref<'asc' | 'desc'>('asc');

const toggleAutoBalanceSort = (key: string) => {
  if (autoBalanceSortKey.value === key) {
    autoBalanceSortOrder.value = autoBalanceSortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    autoBalanceSortKey.value = key;
    autoBalanceSortOrder.value = 'asc';
  }
};

const autoBalanceMachineUseOptions = computed(() => {
  return Array.from(new Set(proposedAutoBalanceMoves.value.map((m: any) => m.machine_use).filter(Boolean))).sort();
});

const autoBalanceMachineTargetOptions = computed(() => {
  return Array.from(new Set(proposedAutoBalanceMoves.value.map((m: any) => m.selected_target || m.target_machine).filter(Boolean))).sort();
});

const filteredAutoBalanceMoves = computed(() => {
  let list = [...proposedAutoBalanceMoves.value];

  if (autoBalanceSearch.value && autoBalanceSearch.value.trim()) {
    const q = autoBalanceSearch.value.toLowerCase().trim();
    list = list.filter((m: any) => {
      const pn = String(m.part_number || '').toLowerCase();
      const jn = String(m.job_number || '').toLowerCase();
      const pr = String(m.process || '').toLowerCase();
      const mu = String(m.machine_use || '').toLowerCase();
      const mp = String(m.machine_prev || '').toLowerCase();
      const mt = String(m.selected_target || m.target_machine || '').toLowerCase();
      const mr = String(m.machine_use_recommended || '').toLowerCase();
      const re = String(m.reason || '').toLowerCase();
      const ckd = (String(m.ckd_part_number || '') + ' ' + formatCkdAliasLines(m).join(' ')).toLowerCase();
      return pn.includes(q) || jn.includes(q) || pr.includes(q) || mu.includes(q) || mp.includes(q) || mt.includes(q) || mr.includes(q) || re.includes(q) || ckd.includes(q);
    });
  }

  if (autoBalanceFilterMachineUse.value) {
    list = list.filter((m: any) => m.machine_use === autoBalanceFilterMachineUse.value);
  }

  if (autoBalanceFilterMachineTarget.value) {
    list = list.filter((m: any) => (m.selected_target || m.target_machine) === autoBalanceFilterMachineTarget.value);
  }

  if (autoBalanceSortKey.value) {
    const k = autoBalanceSortKey.value;
    const ord = autoBalanceSortOrder.value === 'asc' ? 1 : -1;
    list.sort((a: any, b: any) => {
      let valA = a[k] ?? '';
      let valB = b[k] ?? '';
      if (k === 'selected_target') {
        valA = a.selected_target || a.target_machine || '';
        valB = b.selected_target || b.target_machine || '';
      } else if (k === 'ckd_part_number') {
        valA = formatCkdAliasLines(a).join(', ');
        valB = formatCkdAliasLines(b).join(', ');
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * ord;
      }
      return String(valA).localeCompare(String(valB)) * ord;
    });
  }

  return list;
});

const handleBalancingModeChange = async (mode: 'balanced' | 'shift_target') => {
  selectedBalancingMode.value = mode;
  const idSim = store.currentSimulationId || (store.summaryData && store.summaryData.length > 0 ? store.summaryData[0].id_simulation : null) || store.liveSummaryData?.[0]?.id_simulation;
  if (!idSim) return;
  
  isSwitchingBalancingMode.value = true;
  try {
    const proposed = await store.previewAutoBalanceSimulation(idSim, mode);
    const abRes = store.lastAutoBalanceResult;
    const hasOverload = abRes?.has_overload || false;
    const abMsg = abRes?.message || '';

    if (!proposed || proposed.length === 0) {
      proposedAutoBalanceMoves.value = [];
      if (hasOverload || abMsg.includes('melebihi batas kapasitas') || abMsg.includes('berbeban tinggi')) {
        notificationStore.showAlertWarning(abMsg || "Terdapat mesin yang masih berbeban tinggi (> 16 jam), namun tidak dapat dialihkan otomatis karena keterbatasan spesifikasi mesin pengganti atau kapasitas mesin lainnya sudah penuh.");
      } else {
        notificationStore.showDialogSuccess("Sudah Seimbang", "Beban mesin (TPT) sudah seimbang sesuai dengan standar kerja (<= 16 jam).");
      }
      return;
    }

    proposedAutoBalanceMoves.value = proposed.map((item: any) => {
      const found = createData.value.find((l: any) => l.part_number === item.part_number && String(l.process).split('/')[0] === String(item.process).split('/')[0]);
      const fallbackFound = !found ? createData.value.find((l: any) => l.part_number === item.part_number && l.ckd_part_number) : null;
      return {
        ...item,
        total_proses: item.total_proses || found?.total_proses || fallbackFound?.total_proses || 1,
        ckd_part_number: item.ckd_part_number || found?.ckd_part_number || fallbackFound?.ckd_part_number || '',
        checked: true,
        selected_target: item.target_machine || item.machine_use
      };
    });

    proposedAutoBalanceMoves.value.sort((a: any, b: any) => {
      const pnA = String(a.part_number || '');
      const pnB = String(b.part_number || '');
      const cPn = pnA.localeCompare(pnB);
      if (cPn !== 0) return cPn;
      const prA = Number(String(a.process || '').split('/')[0]) || 0;
      const prB = Number(String(b.process || '').split('/')[0]) || 0;
      return prA - prB;
    });
  } catch (e) {
    console.error("Error changing balancing mode:", e);
  } finally {
    isSwitchingBalancingMode.value = false;
  }
};

const handleAutoBalance = async () => {
  const idSim = store.currentSimulationId || (store.summaryData && store.summaryData.length > 0 ? store.summaryData[0].id_simulation : null) || store.liveSummaryData?.[0]?.id_simulation;
  
  if (!idSim) {
    notificationStore.showAlertWarning("Maaf, ID Simulasi tidak ditemukan. Pastikan data sudah tersimpan.");
    return;
  }
  
  isAutoBalancing.value = true;
  try {
    const proposed = await store.previewAutoBalanceSimulation(idSim, selectedBalancingMode.value);
    const abRes = store.lastAutoBalanceResult;
    const hasOverload = abRes?.has_overload || false;
    const abMsg = abRes?.message || '';

    if (!proposed || proposed.length === 0) {
      notificationStore.showDialogSuccess("Sudah Optimal", "Semua mesin sudah optimal sesuai dengan perhitungan program.");
      return;
    }
    
    proposedAutoBalanceMoves.value = proposed.map((item: any) => {
      const found = createData.value.find((l: any) => l.part_number === item.part_number && String(l.process).split('/')[0] === String(item.process).split('/')[0]);
      const fallbackFound = !found ? createData.value.find((l: any) => l.part_number === item.part_number && l.ckd_part_number) : null;
      return {
        ...item,
        total_proses: item.total_proses || found?.total_proses || fallbackFound?.total_proses || 1,
        ckd_part_number: item.ckd_part_number || found?.ckd_part_number || fallbackFound?.ckd_part_number || '',
        checked: true,
        selected_target: item.target_machine || item.machine_use
      };
    });

    proposedAutoBalanceMoves.value.sort((a: any, b: any) => {
      const pnA = String(a.part_number || '');
      const pnB = String(b.part_number || '');
      const cPn = pnA.localeCompare(pnB);
      if (cPn !== 0) return cPn;
      const prA = Number(String(a.process || '').split('/')[0]) || 0;
      const prB = Number(String(b.process || '').split('/')[0]) || 0;
      return prA - prB;
    });
    
    autoBalanceSearch.value = '';
    autoBalanceFilterMachineUse.value = null;
    autoBalanceFilterMachineTarget.value = null;
    isAutoBalanceModalOpen.value = true;
  } catch (e) {
    console.error("-> Exception saat kalkulasi autoBalance:", e);
  } finally {
    isAutoBalancing.value = false;
    hasRunAutoBalance.value = true;
  }
};

const isAllAutoBalanceSelected = computed({
  get: () => filteredAutoBalanceMoves.value.length > 0 && filteredAutoBalanceMoves.value.every((m: any) => m.checked),
  set: (val: boolean) => {
    filteredAutoBalanceMoves.value.forEach((m: any) => m.checked = val);
  }
});

const exportAutoBalanceToExcel = () => {
  if (proposedAutoBalanceMoves.value.length === 0) {
    notificationStore.showAlertWarning("Tidak ada data usulan untuk diekspor.");
    return;
  }

  const exportData = filteredAutoBalanceMoves.value.map((m: any, idx: number) => {
    const currentM = m.machine_use || '-';
    const targetM = m.selected_target || m.target_machine || '-';
    const currentDetail = getMachineDetails(currentM);
    const targetDetail = getMachineDetails(targetM);
    const currentTpt = summaryData.value.find((s: any) => s.machine === currentM)?.tpt || '-';
    const newTpt = targetM !== '-' ? getTargetSimulatedTpt(m, targetM) : '-';
    const rec = targetM !== '-' ? checkSubAssyRecommendation(m, targetM) : null;

    return {
      'No': idx + 1,
      'Status': m.checked ? 'Dicentang' : 'Dilewati',
      'Part Number': m.part_number,
      'Job Number': m.job_number || '-',
      'Proses': formatProcessDisplay(m),
      'Spec Gun Part': getSourceGunForProc(m),
      'Machine Use': currentM,
      'Robot Saat Ini': currentM,
      'Line Saat Ini': getMachineLine(currentM),
      'Tipe Gun (Saat Ini)': getMachineGunSpec(currentM),
      'Stroke Dress (Saat Ini)': currentDetail?.stroke_dress || 350,
      'Dress / TC (Saat Ini)': currentDetail?.dress_tip_change || 2450,
      'Downtime (Saat Ini)': currentDetail?.downtime_min !== undefined ? currentDetail?.downtime_min : '5.17',
      'TPT (Saat Ini)': currentTpt,
      'Robot Rekomendasi': m.machine_use_recommended || '-',
      'Robot Final (Target)': targetM,
      'Line Target': getMachineLine(targetM),
      'Tipe Gun (Target)': getMachineGunSpec(targetM),
      'Stroke Dress (Target)': targetDetail?.stroke_dress || 350,
      'Dress / TC (Target)': targetDetail?.dress_tip_change || 2450,
      'Downtime (Target)': targetDetail?.downtime_min !== undefined ? targetDetail?.downtime_min : '5.17',
      'TPT Pasca Pindah': newTpt,
      'Status Rekomendasi': rec ? (rec.isRecommended ? 'Direkomendasikan' : (!rec.isGunComp ? 'Gun Tidak Cocok' : 'Kapasitas Overload > 16j')) : '-',
      'Alasan Pemilihan': m.reason || '-'
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Auto Balance Sub Assy");
  XLSX.writeFile(wb, `Preview_Auto_Balance_SubAssy_${new Date().toISOString().slice(0, 10)}.xlsx`);
  notificationStore.showAlertSuccess("Data Preview Auto Balance Sub Assy berhasil diekspor ke Excel.");
};

const getFilteredRecommendedMachines = (recStr: string | null | undefined) => {
  if (!recStr) return [];
  const list = String(recStr).split(' ').filter(Boolean);
  return list.filter((mName: string) => {
    const s = summaryData.value.find((item: any) => item.machine === mName);
    const tptVal = s ? Number(s.tpt || 0) : 0;
    return tptVal <= 21.0;
  });
};

const getAvailableTargetMachineOptions = (procItem: any) => {
  const currentM = procItem.machine_use;
  const targetM = procItem.target_machine;
  const prevM = procItem.machine_prev;
  
  // Cegah pemilihan mesin yang sama untuk proses lain dari part yang sama
  const otherSelectedMachines = proposedAutoBalanceMoves.value
    .filter((m: any) => m.part_number === procItem.part_number && String(m.process) !== String(procItem.process))
    .map((m: any) => m.selected_target)
    .filter(Boolean);

  const recUse = procItem.machine_use_recommended ? String(procItem.machine_use_recommended).split(' ') : [];
  const recPrev = procItem.machine_prev_recommended ? String(procItem.machine_prev_recommended).split(' ') : [];
  
  const allActive = activeMachineOptions.value
    .filter((m: any) => {
      const area = String(m.area || '').toUpperCase();
      const line = String(m.line || '').toUpperCase();
      const name = String(m.machine || '').toUpperCase();
      return area.includes('SA') || area.includes('SUB ASSY') || line.includes('ROBOT') || line.includes('SA') || name.startsWith('RB-') || name.startsWith('RSW');
    })
    .map((m: any) => m.machine);
  
  const combined = Array.from(new Set([targetM, currentM, prevM, ...recUse, ...recPrev, ...allActive])).filter(Boolean);
  
  // Buang mesin yang sudah dipilih proses lain dari part ini, atau yang TPT-nya lebih dari 16 jam (kecuali mesin asalnya sendiri)
  return combined.filter((mName: string) => {
    if (otherSelectedMachines.includes(mName)) return false;
    if (mName === currentM) return true;
    const s = summaryData.value.find((item: any) => item.machine === mName);
    const tptVal = s ? Number(s.tpt || 0) : 0;
    return tptVal <= 16.0;
  }).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
};

const executeApplyAutoBalance = async () => {
  const idSim = store.currentSimulationId || (store.summaryData && store.summaryData.length > 0 ? store.summaryData[0].id_simulation : null);
  if (!idSim) return;
  
  const selectedMoves: any[] = [];
  proposedAutoBalanceMoves.value
    .filter((m: any) => m.checked)
    .forEach((m: any) => {
      const targetM = m.selected_target || m.target_machine;
      if (Array.isArray(m.ids) && m.ids.length > 0) {
        m.ids.forEach((id: number) => {
          selectedMoves.push({
            id_load: id,
            new_machine: targetM
          });
        });
      } else {
        selectedMoves.push({
          id_load: m.id_load,
          new_machine: targetM
        });
      }
    });
    
  if (selectedMoves.length === 0) {
    notificationStore.showAlertWarning("Silakan centang setidaknya 1 part yang ingin dibalancing.");
    return;
  }
  
  isApplyingAutoBalance.value = true;
  try {
    const success = await store.applyAutoBalanceSimulation(idSim, selectedMoves, selectedBalancingMode.value);
    if (success) {
      isAutoBalanceModalOpen.value = false;
      await store.fetchBalancingDiagnostics(idSim);
      if (store.currentSimulationId) {
        await store.fetchSimulationDetail(store.currentSimulationId);
      }
      initChart();
    }
  } catch (e) {
    console.error("Error executing auto balance:", e);
  } finally {
    isApplyingAutoBalance.value = false;
  }
};

const currentMachineName = ref('');

const isAllSelected = computed(() => {
  const activeItems = filteredCreateData.value.filter((item: any) => !item.is_deleted);
  return activeItems.length > 0 && activeItems.every((item: any) => item.selected);
});

const normalizePn = (str: any) => String(str || '').replace(/^P/i, '').replace(/[-\s]/g, '').toUpperCase();

const isPcsDayIncreased = (item: any) => {
  if (item.pcs_day_prev === undefined || item.pcs_day_prev === null || item.pcs_day_prev === '') return false;
  const current = Number(item.pcs_day_monthly ?? item.pcs_day ?? 0);
  const prev = Number(item.pcs_day_prev);
  return current > prev;
};

const isPcsDayDecreased = (item: any) => {
  if (item.pcs_day_prev === undefined || item.pcs_day_prev === null || item.pcs_day_prev === '') return false;
  const current = Number(item.pcs_day_monthly ?? item.pcs_day ?? 0);
  const prev = Number(item.pcs_day_prev);
  return current < prev;
};

const getPcsDayTextStyle = (item: any) => {
  if (isPcsDayIncreased(item)) return 'color: #d32f2f !important; font-weight: bold !important;';
  if (isPcsDayDecreased(item)) return 'color: #2e7d32 !important; font-weight: bold !important;';
  return '';
};

const isPcsDayDetailModalOpen = ref(false);
const pcsDayDetailLoading = ref(false);
const pcsDayDetailData = ref<any>(null);
const currentPcsDaySpmon = ref<string>('');

const formatPcsDayPeriod = (spmon?: string) => {
  if (!spmon) return '-';
  const clean = String(spmon).replace('-', '').trim();
  if (clean.length === 6) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const mObj = monthOptions.find(o => o.value === m);
    const mTitle = mObj ? mObj.title : `Bulan ${m}`;
    return `${mTitle} ${y} (${clean})`;
  }
  return spmon;
};

const openPcsDayDetailModal = async (item: any) => {
  isPcsDayDetailModalOpen.value = true;
  pcsDayDetailLoading.value = true;
  const spmon = item.pcs_day_spmon || currentPcsDaySpmon.value || (
    selectedYear.value && selectedMonth.value
      ? `${selectedYear.value}${String(selectedMonth.value).padStart(2, '0')}`
      : undefined
  );
  pcsDayDetailData.value = {
    part_number: item.part_number,
    part_name: item.part_name || '-',
    model: item.model || '-',
    total_pcs_day: item.pcs_day_monthly || item.pcs_day || 0,
    parents_detail: item.parents_detail || [],
    spmon: spmon
  };

  const cleanRowParent = String(item.part_top_parent || item.parent_part_number || item.top_parent_part_number || item.part_number_delivery || '').trim().replace(/^P/i, '');
  const rowParentP14 = cleanRowParent.length >= 14 ? cleanRowParent.substring(0, 14) : cleanRowParent;

  try {
    const res = await getPcsDayDetail(item.part_number, spmon, cleanRowParent || undefined);
    if (res && ((res.status as any) === 'success' || (res.status as any) === 200) && res.data) {
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
        part_number: res.data.part_number || item.part_number,
        part_name: res.data.part_name || item.part_name || '-',
        model: res.data.model || item.model || '-',
        total_pcs_day: calculatedTotal > 0 ? calculatedTotal : (item.pcs_day_monthly || item.pcs_day || res.data.total_pcs_day || 0),
        parents_detail: filteredParents,
        spmon: spmon,
        parent_filter: cleanRowParent || null
      };
    }
  } catch (err) {
    console.error("Gagal memuat detail Pcs/Day:", err);
  } finally {
    pcsDayDetailLoading.value = false;
  }
};

const formatPartNumber = (partNumber: string | null | undefined) => {
  return partNumber || '-';
};

const formatProcessDisplay = (itemOrProcess: any, total?: any) => {
  if (!itemOrProcess && itemOrProcess !== 0) return '-';

  let proc: any = '';
  let tot: any = '';

  if (typeof itemOrProcess === 'object' && itemOrProcess !== null) {
    proc = itemOrProcess.process ?? itemOrProcess.op_route ?? itemOrProcess.proses_ke ?? '';
    tot = itemOrProcess.total_proses ?? itemOrProcess.total_process ?? total ?? '';
    if (!tot || tot === '-' || tot === '0') {
      const found = createData.value?.find((d: any) => d.part_number === itemOrProcess.part_number);
      if (found?.total_proses) tot = found.total_proses;
    }
  } else {
    proc = itemOrProcess;
    tot = total ?? '';
  }

  proc = String(proc).trim();
  tot = String(tot ?? '').trim();

  if (!proc || proc === '-') return '-';

  if (proc.includes('/')) {
    const parts = proc.split('/').map((s: string) => s.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      return `${parts[0]}/${parts[1]}`;
    }
    if (parts.length === 2 && parts[0] && !parts[1]) {
      const fallbackTot = (tot && tot !== '-' && tot !== '0') ? tot : 1;
      return `${parts[0]}/${fallbackTot}`;
    }
  }

  const finalTot = (tot && tot !== '-' && tot !== '0') ? tot : 1;
  return `${proc}/${finalTot}`;
};

const isTarikPcsDayModalOpen = ref(false);
const chosenTarikSpmon = ref('');

const tarikSpmonOptions = computed(() => {
  const options: Array<{ title: string; value: string; subtitle: string }> = [];
  const addedSpmons = new Set<string>();

  const now = new Date();
  const realY = now.getFullYear();
  const realM = now.getMonth() + 1;
  const realCurrMonthStr = String(realM).padStart(2, '0');
  const realCurrSpmon = `${realY}${realCurrMonthStr}`;
  const realCurrMonthTitle = monthOptions.find(o => o.value === realCurrMonthStr)?.title || `Bulan ${realM}`;

  // 1. Bulan Saat Ini (Kalender Realtime)
  options.push({
    title: `Bulan Saat Ini (${realCurrMonthTitle} ${realY})`,
    value: realCurrSpmon,
    subtitle: `Bulan Kalender Sekarang (${realCurrSpmon})`
  });
  addedSpmons.add(realCurrSpmon);

  // 2. Bulan Sesuai Periode Header (jika ada & tidak sama dengan Bulan Saat Ini)
  if (selectedYear.value && selectedMonth.value) {
    const selY = parseInt(selectedYear.value, 10);
    const selM = parseInt(selectedMonth.value, 10);
    if (!isNaN(selY) && !isNaN(selM)) {
      const selMonthStr = String(selM).padStart(2, '0');
      const selSpmon = `${selY}${selMonthStr}`;
      if (!addedSpmons.has(selSpmon)) {
        const selMonthTitle = monthOptions.find(o => o.value === selMonthStr)?.title || `Bulan ${selM}`;
        options.push({
          title: `Bulan Sesuai Periode (${selMonthTitle} ${selY})`,
          value: selSpmon,
          subtitle: `Periode Header Terpilih (${selSpmon})`
        });
        addedSpmons.add(selSpmon);
      }
    }
  }

  // 3. Bulan Depan (Kalender Realtime)
  const nextM = realM === 12 ? 1 : realM + 1;
  const nextY = realM === 12 ? realY + 1 : realY;
  const nextMonthStr = String(nextM).padStart(2, '0');
  const nextSpmon = `${nextY}${nextMonthStr}`;
  if (!addedSpmons.has(nextSpmon)) {
    const nextMonthTitle = monthOptions.find(o => o.value === nextMonthStr)?.title || `Bulan ${nextM}`;
    options.push({
      title: `Bulan Depan (${nextMonthTitle} ${nextY})`,
      value: nextSpmon,
      subtitle: `Bulan Kalender Depan (${nextSpmon})`
    });
    addedSpmons.add(nextSpmon);
  }

  return options;
});

const openTarikPcsDayModal = () => {
  if (tarikSpmonOptions.value.length > 0) {
    chosenTarikSpmon.value = tarikSpmonOptions.value[0].value;
  }
  isTarikPcsDayModalOpen.value = true;
};

const pcsDayLoading = ref(false);
const executeTarikPcsDay = async () => {
  pcsDayLoading.value = true;
  try {
    const spmon = chosenTarikSpmon.value;
    const area = (createForm.value?.area || 'WSS ADM').trim();
    const res = await getPcsKanban(spmon, area);
    if (res && (res.status as any) === 'success' && Array.isArray(res.data)) {
      currentPcsDaySpmon.value = spmon;
      const kanbanData = res.data;
      let updateCount = 0;
      let diffCount = 0;

      store.createData.forEach((row: any) => {
        const rowPn = String(row.part_number || '').trim();
        const rowNorm = normalizePn(rowPn);
        const allMatches = kanbanData.filter((k: any) => {
          const kPn = String(k.part_number || '').trim();
          return normalizePn(kPn) === rowNorm || kPn === rowPn;
        });

        if (allMatches.length > 0) {
          const combinedSummary: Record<string, number> = {};
          const combinedDetails: any[] = [];
          let totalPcsDayAll = 0;

          allMatches.forEach((match: any) => {
            totalPcsDayAll += Number(match.pcs_day_monthly || 0);
            if (match.parents_summary && typeof match.parents_summary === 'object') {
              Object.entries(match.parents_summary).forEach(([k, v]) => {
                combinedSummary[k] = (combinedSummary[k] || 0) + (Number(v) || 0);
              });
            }
            if (match.parents_detail && Array.isArray(match.parents_detail)) {
              match.parents_detail.forEach((d: any) => {
                const dDeliv = String(d.part_number_delivery || d.matnr || '').trim();
                const dParent = String(d.parent_part_number || '').trim();
                const exists = combinedDetails.some((cd: any) => {
                  const cdDeliv = String(cd.part_number_delivery || cd.matnr || '').trim();
                  const cdParent = String(cd.parent_part_number || '').trim();
                  return cdDeliv === dDeliv && cdParent === dParent;
                });
                if (!exists) {
                  combinedDetails.push(d);
                }
              });
            }
          });

          const rowParent = String(row.part_top_parent || row.top_parent_part_number || row.part_number_delivery || row.part_number || '').trim();
          const cleanRowParent = rowParent.replace(/^P/i, '');
          const rowParentP14 = cleanRowParent.length >= 14 ? cleanRowParent.substring(0, 14) : cleanRowParent;

          let newPcsDay = 0;
          if (Object.keys(combinedSummary).length > 0) {
            if (combinedSummary[rowParent] !== undefined) {
              newPcsDay = Number(combinedSummary[rowParent]) || 0;
            } else if (combinedSummary[cleanRowParent] !== undefined) {
              newPcsDay = Number(combinedSummary[cleanRowParent]) || 0;
            } else if (combinedSummary[rowParentP14] !== undefined) {
              newPcsDay = Number(combinedSummary[rowParentP14]) || 0;
            } else {
              const matchedKey = Object.keys(combinedSummary).find(k => {
                const cleanK = k.replace(/^P/i, '');
                const kP14 = cleanK.length >= 14 ? cleanK.substring(0, 14) : cleanK;
                return cleanK === cleanRowParent || kP14 === rowParentP14;
              });
              if (matchedKey) {
                newPcsDay = Number(combinedSummary[matchedKey]) || 0;
              } else if (normalizePn(rowPn) === normalizePn(rowParent) || !rowParent) {
                newPcsDay = totalPcsDayAll;
              } else if (Object.keys(combinedSummary).length === 1) {
                newPcsDay = Object.values(combinedSummary)[0];
              }
            }
          } else {
            newPcsDay = totalPcsDayAll;
          }

          const currentPcsDay = Number(row.pcs_day_monthly ?? row.pcs_day ?? 0);

          if (row.pcs_day_prev === undefined || row.pcs_day_prev === null || row.pcs_day_prev === '') {
            row.pcs_day_prev = currentPcsDay;
          }

          if (currentPcsDay !== newPcsDay) {
            diffCount++;
          }

          row.pcs_day_monthly = newPcsDay;
          row.pcs_day = newPcsDay;
          row.pcs_day_spmon = spmon;
          if (combinedDetails.length > 0) {
            const filteredParents = combinedDetails.filter((p: any) => {
              const pParent = String(p.parent_part_number || p.part_number_delivery || '').trim().replace(/^P/i, '');
              const pP14 = pParent.length >= 14 ? pParent.substring(0, 14) : pParent;
              return pParent === cleanRowParent || pP14 === rowParentP14;
            });
            row.parents_detail = filteredParents.length > 0 ? filteredParents : combinedDetails;
          }
          calculateRow(row, 'ckd');
          updateCount++;
        }
      });

      const selectedOpt = tarikSpmonOptions.value.find(o => o.value === spmon);
      const periodLabel = selectedOpt ? selectedOpt.title : spmon;

      notificationStore.showDialogSuccess(
        "Berhasil Tarik Pcs/Day",
        `Berhasil memperbarui ${updateCount} part (${diffCount} part memiliki Pcs/Day berbeda dan ditandai warna kuning) menggunakan data ${periodLabel}.`
      );
      isTarikPcsDayModalOpen.value = false;
    } else {
      notificationStore.showDialogWarning("Gagal", "Format data dari server tidak sesuai atau data kosong.");
    }
  } catch (error) {
    console.error("Gagal menarik data Pcs/Day:", error);
    notificationStore.showDialogError("Kesalahan", "Terjadi kesalahan saat memuat data Pcs/Day.");
  } finally {
    pcsDayLoading.value = false;
  }
};

const getRowClass = (item: any) => {
  if (item.is_deleted) {
    return 'row-deleted bg-red-lighten-5 text-red-darken-4';
  }
  if (item.is_new_parent_row) {
    return 'row-new-parent bg-green-lighten-5 text-green-darken-4';
  }
  if (!item.selected) {
    return 'bg-grey-lighten-4 text-grey-darken-1';
  }
  return '';
};

const generateParentLoading = ref(false);

const handleGenerateParent = async () => {
  if (!createData.value || createData.value.length === 0) {
    notificationStore.showDialogWarning("Warning", "Tidak ada item part dalam tabel.");
    return;
  }

  generateParentLoading.value = true;
  try {
    const area = createForm.value.area;
    const periode = createForm.value.periode;
    const spmon = periode ? String(periode).replace(/-/g, '').trim() : '';

    // 1. Fetch data parents & pcs kanban from backend
    const res = await getPcsKanban(spmon, area);
    if (!res || (res.status as any) !== 'success' || !Array.isArray(res.data)) {
      notificationStore.showDialogWarning("Gagal", "Format data parent dari server tidak sesuai atau data kosong.");
      return;
    }

    const kanbanData = res.data;

    // 2. Kelompokkan baris berdasarkan part_number untuk mempertahankan urutan tampilan
    const rawData = [...createData.value];
    const partOrder: string[] = [];
    const partGroups = new Map<string, any[]>();

    rawData.forEach(row => {
      const isDpmOrFp = String(row.status_part || '').toUpperCase() === 'FP' || 
                        String(row.status_part || '').toUpperCase() === 'IFPD' || 
                        String(row.job_number || '').toUpperCase().includes('DPM') || 
                        String(row.part_number || '').endsWith('-03');
      const pNorm = isDpmOrFp 
        ? `${normalizePn(row.part_number)}__${String(row.job_number || '').trim()}__FP`
        : normalizePn(row.part_number);

      if (!partGroups.has(pNorm)) {
        partGroups.set(pNorm, []);
        partOrder.push(pNorm);
      }
      partGroups.get(pNorm)!.push(row);
    });

    let newRowsCount = 0;
    let deletedRowsCount = 0;
    let updatedRowsCount = 0;
    const finalData: any[] = [];

    for (const pNorm of partOrder) {
      const rowsForPart = partGroups.get(pNorm)!;
      if (rowsForPart.length === 0) continue;

      const isDpmOrFp = String(rowsForPart[0].status_part || '').toUpperCase() === 'FP' || 
                        String(rowsForPart[0].status_part || '').toUpperCase() === 'IFPD' || 
                        String(rowsForPart[0].job_number || '').toUpperCase().includes('DPM') || 
                        String(rowsForPart[0].part_number || '').endsWith('-03');

      let targetParents: any[] = [];
      if (isDpmOrFp) {
        // Part DPM / FP / Sparepart: pertahankan parent delivery utuh dari ms_welding
        const masterDeliveryParent = rowsForPart[0].part_top_parent || 
                                     rowsForPart[0].top_parent_part_number || 
                                     rowsForPart[0].part_number_delivery || 
                                     rowsForPart[0].part_number;
        targetParents = [{
          part_number_delivery: masterDeliveryParent,
          pcs_day: Number(rowsForPart[0].pcs_day_monthly ?? rowsForPart[0].pcs_day ?? 0),
          details: rowsForPart[0].parents_detail || []
        }];
      } else {
        // Cari parent dari kanbanData untuk part WIP / sub-assy
        const match = kanbanData.find((k: any) => 
          normalizePn(k.part_number) === pNorm || 
          String(k.part_number || '').trim() === String(rowsForPart[0].part_number || '').trim()
        );

        if (match && Array.isArray(match.parents_detail) && match.parents_detail.length > 0) {
          // Group by unique top parent part number so common parts sharing 14 chars under the same parent are grouped together
          const groupedParents = new Map<string, { part_number_delivery: string, pcs_day: number, details: any[] }>();
          match.parents_detail.forEach((pd: any) => {
            const parentPn = String(pd.parent_part_number || pd.part_number_delivery || '').trim();
            if (!groupedParents.has(parentPn)) {
              groupedParents.set(parentPn, {
                part_number_delivery: parentPn,
                pcs_day: 0,
                details: []
              });
            }
            const grp = groupedParents.get(parentPn)!;
            grp.pcs_day += Number(pd.pcs_day) || 0;
            grp.details.push(pd);
          });
          targetParents = Array.from(groupedParents.values());
        } else {
          const fallbackParent = rowsForPart[0].part_top_parent || 
                                 rowsForPart[0].top_parent_part_number || 
                                 rowsForPart[0].part_number_delivery || 
                                 rowsForPart[0].part_number;
          targetParents = [{
            part_number_delivery: fallbackParent,
            pcs_day: Number(rowsForPart[0].pcs_day_monthly ?? rowsForPart[0].pcs_day ?? 0),
            details: rowsForPart[0].parents_detail || []
          }];
        }
      }

      // Hitung jumlah proses dalam 1 set (full proses)
      const totalProsesFromRow = Number(rowsForPart[0].total_proses) || 0;
      const distinctProcesses = Array.from(new Set(rowsForPart.map((r: any) => r.process)));
      const K = totalProsesFromRow > 0 ? totalProsesFromRow : (distinctProcesses.length > 0 ? distinctProcesses.length : 1);

      const M = targetParents.length; // Jumlah parent aktual

      // Template set diambil dari baris pertama (set ke-0)
      const templateSet = rowsForPart.slice(0, K).map(r => ({ ...r }));

      const currentRowsCount = rowsForPart.length;
      const currentSetsCount = Math.ceil(currentRowsCount / K);
      const totalSetsToProcess = Math.max(currentSetsCount, M);

      const processedPartRows: any[] = [];

      for (let s = 0; s < totalSetsToProcess; s++) {
        if (s < M) {
          // Set ini AKTIF dan diasosiasikan ke parent targetParents[s]
          const parentInfo = targetParents[s];
          const parentPn = parentInfo.part_number_delivery;
          const parentPcsDay = Number(parentInfo.pcs_day) || 0;

          if (s < currentSetsCount) {
            // Gunakan baris yang sudah ada
            const existingSetRows = rowsForPart.slice(s * K, (s + 1) * K);
            existingSetRows.forEach(row => {
              row.is_deleted = false;
              row.selected = true;
              row.part_top_parent = parentPn;
              row.top_parent_part_number = parentPn;
              if (s > 0) {
                row.is_new_parent_row = true;
              }
              if (parentPcsDay > 0) {
                row.pcs_day_monthly = parentPcsDay;
                row.pcs_day = parentPcsDay;
              }
              if (parentInfo.details && parentInfo.details.length > 0) {
                row.parents_detail = parentInfo.details;
              }
              calculateRow(row, 'ckd');
              processedPartRows.push(row);
              updatedRowsCount++;
            });
          } else {
            // Butuh set baru untuk parent berikutnya (clone dari templateSet)
            templateSet.forEach(tmpl => {
              const newRow = { ...tmpl };
              if (newRow.id) delete newRow.id;
              if (newRow.id_load) delete newRow.id_load;
              if (newRow.id_load_main) delete newRow.id_load_main;
              newRow.is_new_parent_row = true;
              newRow.is_deleted = false;
              newRow.selected = true;
              newRow.part_top_parent = parentPn;
              newRow.top_parent_part_number = parentPn;
              if (parentPcsDay > 0) {
                newRow.pcs_day_monthly = parentPcsDay;
                newRow.pcs_day = parentPcsDay;
              }
              if (parentInfo.details && parentInfo.details.length > 0) {
                newRow.parents_detail = parentInfo.details;
              }
              calculateRow(newRow, 'ckd');
              processedPartRows.push(newRow);
              newRowsCount++;
            });
          }
        } else {
          // s >= M: Set ini BERLEBIH! Tandai untuk dihapus (merah & is_deleted = true)
          const excessSetRows = rowsForPart.slice(s * K, (s + 1) * K);
          excessSetRows.forEach(row => {
            row.is_deleted = true;
            row.selected = false;
            processedPartRows.push(row);
            deletedRowsCount++;
          });
        }
      }

      processedPartRows.forEach(r => finalData.push(r));
    }

    store.createData = finalData;

    let summaryMsg = `Generate Parent selesai. `;
    if (newRowsCount > 0) summaryMsg += `${newRowsCount} baris proses baru ditambahkan (warna hijau). `;
    if (deletedRowsCount > 0) summaryMsg += `${deletedRowsCount} baris proses berlebih ditandai hapus (warna merah). `;
    if (newRowsCount === 0 && deletedRowsCount === 0) summaryMsg += `Seluruh baris proses telah sesuai dengan data parent induk.`;

    notificationStore.showDialogSuccess("Berhasil Generate Parent", summaryMsg);

  } catch (err: any) {
    console.error("Error generating parent:", err);
    notificationStore.showDialogError("Error", err?.message || "Terjadi kesalahan saat generate parent.");
  } finally {
    generateParentLoading.value = false;
  }
};

// Modal Tambah Part Number State & Handlers
const isAddPartModalOpen = ref(false);
const addPartLoading = ref(false);
const candidateParts = ref<any[]>([]);
const selectedCandidateParts = ref<any[]>([]);
const searchPartQuery = ref('');

const filteredCandidateParts = computed(() => {
  let list = candidateParts.value;

  if (searchPartQuery.value) {
    const q = searchPartQuery.value.trim().toLowerCase();
    list = list.filter((p: any) =>
      String(p.part_number || '').toLowerCase().includes(q) ||
      String(p.part_name || '').toLowerCase().includes(q) ||
      String(p.model || '').toLowerCase().includes(q) ||
      String(p.job_number || '').toLowerCase().includes(q) ||
      String(p.machine || '').toLowerCase().includes(q) ||
      String(p.area || '').toLowerCase().includes(q) ||
      String(p.status_part || '').toLowerCase().includes(q)
    );
  }

  return list;
});

const isAllCandidateSelected = computed(() => {
  if (filteredCandidateParts.value.length === 0) return false;
  return filteredCandidateParts.value.every((p: any) =>
    selectedCandidateParts.value.includes(p)
  );
});

const toggleSelectAllCandidates = () => {
  if (isAllCandidateSelected.value) {
    selectedCandidateParts.value = [];
  } else {
    selectedCandidateParts.value = [...filteredCandidateParts.value];
  }
};

const openAddPartModal = async () => {
  isAddPartModalOpen.value = true;
  addPartLoading.value = true;
  searchPartQuery.value = '';
  selectedCandidateParts.value = [];
  try {
    const simId = String(store.currentSimulationId || '');
    const y = parseInt(selectedYear.value || new Date().getFullYear().toString(), 10);
    const m = parseInt(selectedMonth.value || (new Date().getMonth() + 1).toString(), 10);
    const spmon = (!isNaN(y) && !isNaN(m)) ? `${y}${String(m).padStart(2, '0')}` : undefined;
    const area = createForm.value?.area || (route.query.area as string) || 'SA ADM';

    const res: any = await getAvailableParts(simId, area, spmon);
    if (res && (res.status === 'success' || res.status === 200) && Array.isArray(res.data)) {
      const existingInTable = new Set(store.createData.map((d: any) => String(d.part_number || '').trim().toLowerCase()));
      candidateParts.value = res.data.filter((item: any) => !existingInTable.has(String(item.part_number || '').trim().toLowerCase()));
    } else {
      candidateParts.value = [];
    }
  } catch (err) {
    console.error("Gagal memuat kandidat part number:", err);
    notificationStore.showDialogError("Error", "Gagal memuat data part dari database master.");
  } finally {
    addPartLoading.value = false;
  }
};

const addSelectedPartsToSimulation = () => {
  if (selectedCandidateParts.value.length === 0) {
    notificationStore.showDialogWarning("Peringatan", "Pilihlah setidaknya 1 part number untuk ditambahkan.");
    return;
  }

  let count = 0;
  selectedCandidateParts.value.forEach((expRow: any) => {
    const machine_use = expRow.machine || '';
    const matchedMachine = store.activeMachineOptions.find((m: any) => m.machine === machine_use);
    const pcsMonthly = Number(expRow.pcs_day_monthly) || 0;
    const pcsDay = Number(expRow.pcs_day) || Math.round(pcsMonthly / 20);

    const newRow: any = {
      id_ms_part: expRow.id || expRow.id_ms_part,
      part_number: expRow.part_number,
      part_name: expRow.part_name || '-',
      model: expRow.model || '-',
      status_part: expRow.status_part || 'WIP',
      area: expRow.area || createForm.value?.area || 'SA ADM',
      machine_use: machine_use,
      machine_prev: machine_use,
      selected: true,
      pcs_day: pcsDay,
      pcs_day_monthly: pcsMonthly,
      cycle_time_sec: Number(expRow.cycle_time_sec) || 0,
      lot_cycle: Number(expRow.lot_cycle) || 1,
      dandori: Number(expRow.dandori) || 0,
      downtime: Number(expRow.downtime) || 0,
      ckd: expRow.ckd_part_number ? 'YES' : 'NO',
      ckd_part_number: expRow.ckd_part_number || '',
      job_number: expRow.job_number || '',
      process: expRow.process || expRow.op_route || '',
      total_proses: expRow.total_proses || 1,
      seq: expRow.seq || 1,
      op_route: expRow.op_route || '',
      upper_holder: matchedMachine ? matchedMachine.upper_holder : (expRow.upper_holder || null),
      lower_holder: matchedMachine ? matchedMachine.lower_holder : (expRow.lower_holder || null),
      kva: matchedMachine ? matchedMachine.kva : (expRow.kva || null),
      jig: expRow.jig ?? null,
      jumlah_spot: expRow.jumlah_spot !== undefined && expRow.jumlah_spot !== null && expRow.jumlah_spot !== '' ? Number(expRow.jumlah_spot) : null,
      freq_dresser: expRow.freq_dresser !== undefined && expRow.freq_dresser !== null && expRow.freq_dresser !== '' ? Number(expRow.freq_dresser) : null,
      freq_tip_change: expRow.freq_tip_change !== undefined && expRow.freq_tip_change !== null && expRow.freq_tip_change !== '' ? Number(expRow.freq_tip_change) : null
    };

    calculateRow(newRow, 'ckd');
    store.createData.push(newRow);
    count++;
  });

  notificationStore.showDialogSuccess("Berhasil", `Berhasil menambahkan ${count} baris proses part number ke dalam simulasi.`);
  isAddPartModalOpen.value = false;
};

// Modal Data Achievement Actual State & Handlers
const isAchievementModalOpen = ref(false);
const achievementLoading = ref(false);
const achievementTab = ref(1);
const matchedAchievementData = ref<any[]>([]);
const unmatchedAchievementData = ref<any[]>([]);
const searchAchievementQuery = ref('');

const filteredMatchedAchievementData = computed(() => {
  if (!searchAchievementQuery.value) return matchedAchievementData.value;
  const q = searchAchievementQuery.value.trim().toLowerCase();
  return matchedAchievementData.value.filter((item: any) =>
    String(item.part_number || '').toLowerCase().includes(q) ||
    String(item.job_number || '').toLowerCase().includes(q) ||
    String(item.model || '').toLowerCase().includes(q) ||
    String(item.line_id || '').toLowerCase().includes(q) ||
    String(item.process ? `op ${item.process}` : '').toLowerCase().includes(q) ||
    String(item.machine_sim || item.machine_use || '').toLowerCase().includes(q) ||
    String(item.machine_actual || '').toLowerCase().includes(q)
  );
});

const filteredUnmatchedAchievementData = computed(() => {
  if (!searchAchievementQuery.value) return unmatchedAchievementData.value;
  const q = searchAchievementQuery.value.trim().toLowerCase();
  return unmatchedAchievementData.value.filter((item: any) =>
    String(item.part_number || '').toLowerCase().includes(q) ||
    String(item.job_number || '').toLowerCase().includes(q) ||
    String(item.model || '').toLowerCase().includes(q) ||
    String(item.line_id || '').toLowerCase().includes(q) ||
    String(item.machine_actual || '').toLowerCase().includes(q)
  );
});

const achievementPeriodDisplay = computed(() => {
  const now = new Date();
  const y = now.getFullYear().toString();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const mOpt = monthOptions.find(o => o.value === m);
  const mTitle = mOpt ? mOpt.title : `Bulan ${m}`;
  return `${mTitle} ${y} (Bulan Saat Ini)`;
});

const openAchievementModal = async () => {
  isAchievementModalOpen.value = true;
  achievementLoading.value = true;
  searchAchievementQuery.value = '';
  achievementTab.value = 1;
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const spmon = `${y}${String(m).padStart(2, '0')}`;
    const simId = String(store.currentSimulationId || '');
    const area = createForm.value?.area || (route.query.area as string) || 'SA ADM';

    const res: any = await getAchievementList(spmon, simId, area);
    if (res && (res.status === 'success' || res.status === 200)) {
      matchedAchievementData.value = res.matched_items || res.data?.matched_items || [];
      unmatchedAchievementData.value = res.unmatched_items || res.data?.unmatched_items || [];
    } else {
      matchedAchievementData.value = [];
      unmatchedAchievementData.value = [];
    }
  } catch (err) {
    console.error("Gagal memuat data achievement:", err);
    notificationStore.showDialogError("Error", "Gagal memuat data achievement aktual.");
  } finally {
    achievementLoading.value = false;
  }
};

const toggleSelectAll = (event: any) => {
  const checked = event.target.checked;
  filteredCreateData.value.forEach((item: any) => {
    if (!item.is_deleted) {
      item.selected = checked;
    }
  });
};

const formatBoolSpec = (val: string | number | null | undefined) => {
  if (val === null || val === undefined || val === '') return '-';
  return String(val) === '1' ? 'Ada' : 'Tidak Ada';
};

const isUpperHolderValid = (targetHolder: string | null | undefined, currentHolder: string | null | undefined) => {
  if (!targetHolder || !currentHolder) return targetHolder === currentHolder;
  const targetLower = targetHolder.toLowerCase();
  const currentLower = currentHolder.toLowerCase();
  if (currentLower.includes('lurus') && targetLower.includes('pelatuk')) {
    return true;
  }
  return targetHolder === currentHolder;
};

const getMachineTpt = (machineName: string) => {
  const summary = summaryData.value.find((m: any) => m.machine === machineName);
  return summary ? Number(summary.tpt).toFixed(2) + ' Jam' : '-';
};

const isSameValue = (rowA: any, rowB: any, field: string) => {
  if (!rowA || !rowB) return false;
  if (field === 'line') {
    return rowA.area === rowB.area && rowA.line === rowB.line;
  }
  if (field === 'machine') {
    return rowA.area === rowB.area && rowA.line === rowB.line && rowA.machine === rowB.machine;
  }
  const machineDependentFields = ['upper_holder', 'lower_holder', 'kva', 'radio_select', 'tpt', 'note'];
  if (machineDependentFields.includes(field)) {
    return rowA.area === rowB.area && rowA.line === rowB.line && rowA.machine === rowB.machine;
  }
  return String(rowA[field] ?? '') === String(rowB[field] ?? '');
};

const getRecRowspan = (item: any, field: string, list: any[]) => {
  if (!list || list.length === 0) return 1;
  const index = list.findIndex(x => x.id === item.id);
  if (index === -1) return 1;
  if (index > 0 && isSameValue(list[index], list[index - 1], field)) {
    return 0;
  }
  let span = 1;
  for (let i = index + 1; i < list.length; i++) {
    if (isSameValue(list[i], list[index], field)) {
      span++;
    } else {
      break;
    }
  }
  return span;
};

const currentMachineDetailsList = computed(() => {
  let rawName = '';
  if (currentMachineName.value) {
    if (typeof currentMachineName.value === 'object' && 'value' in currentMachineName.value) {
      rawName = String((currentMachineName.value as any).value || '');
    } else {
      rawName = String(currentMachineName.value);
    }
  }
  
  rawName = rawName.trim().toUpperCase();
  if (!rawName) return [];

  // 1. Filter matching active machines
  const found = activeMachineOptions.value.filter((m: any) => String(m.machine || '').trim().toUpperCase() === rawName);
  if (found.length > 0) return found;
  
  // 2. Filter matching master machines from store
  if (store.machineOptions && store.machineOptions.length > 0) {
    const foundInMaster = store.machineOptions.filter((m: any) => String(m.machine || '').trim().toUpperCase() === rawName);
    if (foundInMaster.length > 0) return foundInMaster;
  }

  // 3. Filter matching inactive machines currently in use
  if (store.inactiveMachineInUseData && store.inactiveMachineInUseData.length > 0) {
    const foundInInactive = store.inactiveMachineInUseData.filter((m: any) => String(m.machine || '').trim().toUpperCase() === rawName);
    if (foundInInactive.length > 0) return foundInInactive;
  }
  
  // 4. Fallback to specs saved in the part load itself
  if (movePartData.value) {
    return [{
      id: movePartData.value.id || 'fallback-current',
      machine: currentMachineName.value,
      line: movePartData.value.line,
      upper_holder: movePartData.value.upper_holder,
      lower_holder: movePartData.value.lower_holder,
      kva: movePartData.value.kva,
      nut_type: movePartData.value.nut_type,
      nut_feeder: movePartData.value.nut_feeder,
      rotary_holder: movePartData.value.rotary_holder,
      handy_navi: movePartData.value.handy_navi,
      robo_navi: movePartData.value.robo_navi,
      gate_sensor: movePartData.value.gate_sensor,
      nut_feeder_type: movePartData.value.nut_feeder_type,
      note: movePartData.value.note || 'Mesin Inaktif (Membawa Spek Terakhir)'
    }];
  }
  return [];
});

const groupMachinesForCards = (list: any[]) => {
  if (!list || list.length === 0) return [];
  const map = new Map<string, any>();
  list.forEach((m: any) => {
    const key = m.machine;
    if (!map.has(key)) {
      map.set(key, {
        machine: m.machine,
        line: m.line || m.area,
        kva: m.kva,
        upper_holder: m.upper_holder,
        lower_holder: m.lower_holder,
        note: m.note,
        original_rows: []
      });
    }
    map.get(key).original_rows.push(m);
  });
  return Array.from(map.values());
};

const getIntegrationSpans = (rows: any[], typeField: string, idField: string) => {
  const spans: any[] = [];
  let currentId: any = null;
  let startRow = 1;
  let span = 0;
  
  rows.forEach((row, index) => {
    if (row[typeField] === '1' || row[typeField] === 1) {
      const id = row[idField] || row.id;
      if (id === currentId) {
         span++;
      } else {
         if (currentId !== null) spans.push({ id: currentId, startRow, span });
         currentId = id;
         startRow = index + 1;
         span = 1;
      }
    } else {
      if (currentId !== null) {
         spans.push({ id: currentId, startRow, span });
         currentId = null;
      }
    }
  });
  if (currentId !== null) spans.push({ id: currentId, startRow, span });
  return spans;
};

const getBadgeSpanInfo = (rows: any[], index: number, typeField: string, idField: string) => {
  const spans = getIntegrationSpans(rows, typeField, idField);
  const match = spans.find(s => s.startRow - 1 === index);
  return match ? match.span : 0;
};

const getBadgeCellStatus = (rows: any[], index: number, typeField: string, idField: string) => {
  const spans = getIntegrationSpans(rows, typeField, idField);
  const startMatch = spans.find(s => s.startRow - 1 === index);
  if (startMatch) return 'render';
  
  const coveredMatch = spans.some(s => {
    const startIdx = s.startRow - 1;
    const endIdx = startIdx + s.span - 1;
    return index > startIdx && index <= endIdx;
  });
  if (coveredMatch) return 'span-covered';
  
  return 'empty';
};

const lockedSpecs = ref<{type: string, value: string}[]>([]);
const lockedMachine = ref<string | null>(null);

const toggleSpecLock = (machine: string, type: string, value: string | null | undefined) => {
  const val = value || '-';
  const isIntegrationType = ['handy', 'robo', 'gate', 'nut_feeder_badge'].includes(type);
  
  if (!isIntegrationType && lockedMachine.value !== machine) {
    lockedSpecs.value = lockedSpecs.value.filter(s => ['handy', 'robo', 'gate', 'nut_feeder_badge'].includes(s.type));
    lockedMachine.value = machine;
  }
  
  const index = lockedSpecs.value.findIndex(s => s.type === type && String(s.value).trim().toUpperCase() === String(val).trim().toUpperCase());
  if (index >= 0) {
    lockedSpecs.value.splice(index, 1);
    if (!isIntegrationType && !lockedSpecs.value.some(s => !['handy', 'robo', 'gate', 'nut_feeder_badge'].includes(s.type))) {
      lockedMachine.value = null;
    }
  } else {
    lockedSpecs.value.push({ type, value: String(val) });
    if (!isIntegrationType) {
      lockedMachine.value = machine;
    }
  }
};

const isSpecHighlighted = (type: string, value: string | null | undefined) => {
  const val = value || '-';
  if (!lockedSpecs.value || lockedSpecs.value.length === 0) return false;
  
  return lockedSpecs.value.some(s => s.type === type && String(s.value).trim().toUpperCase() === String(val).trim().toUpperCase());
};

const isMachineMatchingLockedSpecs = (machineName: string) => {
  if (!lockedSpecs.value || lockedSpecs.value.length === 0) return false;
  
  const rows = activeMachineOptions.value.filter((r: any) => r.machine === machineName);
  if (rows.length === 0) return false;
  
  const first = rows[0];
  
  return lockedSpecs.value.every(spec => {
    const type = spec.type;
    const val = String(spec.value).trim().toUpperCase();
    
    if (type === 'kva') {
      return String(first.kva).trim().toUpperCase() === val;
    }
    if (type === 'up_holder') {
      return String(first.upper_holder).trim().toUpperCase() === val;
    }
    if (type === 'low_holder') {
      return String(first.lower_holder).trim().toUpperCase() === val;
    }
    if (type === 'rotary') {
      return String(first.rotary_holder).trim().toUpperCase() === val;
    }
    if (type === 'gate') {
      return String(first.gate_sensor).trim().toUpperCase() === val;
    }
    if (type === 'nut_feeder_type') {
      return String(first.nut_feeder_type).trim().toUpperCase() === val;
    }
    
    if (type === 'nut') {
      return rows.some((r: any) => String(r.nut_type).trim().toUpperCase() === val);
    }
    if (type === 'nut_feeder_badge') {
      return rows.some((r: any) => String(r.nut_feeder).trim().toUpperCase() === val);
    }
    if (type === 'handy') {
      return rows.some((r: any) => String(r.handy_navi).trim().toUpperCase() === val);
    }
    if (type === 'robo') {
      return rows.some((r: any) => String(r.robo_navi).trim().toUpperCase() === val);
    }
    
    return false;
  });
};

const highlightAllMachineSpecs = (m: any) => {
  if (!m) return;
  lockedMachine.value = m.machine;
  lockedSpecs.value = [];
  
  const allRows = activeMachineOptions.value.filter((r: any) => r.machine === m.machine);
  const sourceRows = allRows.length > 0 ? allRows : (m.original_rows || [m]);
  
  const first = sourceRows[0];
  if (first.kva) lockedSpecs.value.push({ type: 'kva', value: String(first.kva) });
  if (first.upper_holder) lockedSpecs.value.push({ type: 'up_holder', value: String(first.upper_holder) });
  if (first.lower_holder) lockedSpecs.value.push({ type: 'low_holder', value: String(first.lower_holder) });
  if (String(first.rotary_holder) === '1') lockedSpecs.value.push({ type: 'rotary', value: '1' });
  if (String(first.gate_sensor) === '1') lockedSpecs.value.push({ type: 'gate', value: '1' });
  
  sourceRows.forEach((r: any) => {
    if (r.nut_type) lockedSpecs.value.push({ type: 'nut', value: String(r.nut_type) });
    if (String(r.nut_feeder) === '1') lockedSpecs.value.push({ type: 'nut_feeder_badge', value: '1' });
    if (String(r.handy_navi) === '1') lockedSpecs.value.push({ type: 'handy', value: '1' });
    if (String(r.robo_navi) === '1') lockedSpecs.value.push({ type: 'robo', value: '1' });
  });
};

const currentMachineSpec = computed(() => {
  if (currentMachineDetailsList.value.length === 0) return null;
  const first = currentMachineDetailsList.value[0];
  return {
    kva: first.kva,
    upper_holder: first.upper_holder,
    lower_holder: first.lower_holder,
    rotary_holder: first.rotary_holder,
    robo_navi: first.robo_navi,
    handy_navi: first.handy_navi,
    gate_sensor: first.gate_sensor,
    nut_types: currentMachineDetailsList.value.map((m: any) => String(m.nut_type || '').trim().toUpperCase()),
  };
});

const isKvaMismatched = (m: any) => {
  if (!currentMachineSpec.value || !m.kva) return false;
  return String(m.kva) !== String(currentMachineSpec.value.kva);
};

const isUpHolderMismatched = (m: any) => {
  if (!currentMachineSpec.value || !m.original_rows?.[0]?.upper_holder) return false;
  const targetHolder = currentMachineSpec.value.upper_holder;
  const cardHolder = m.original_rows[0].upper_holder;
  return !isUpperHolderValid(cardHolder, targetHolder);
};

const isLowHolderMismatched = (m: any) => {
  if (!currentMachineSpec.value || !m.original_rows?.[0]?.lower_holder) return false;
  return String(m.original_rows[0].lower_holder) !== String(currentMachineSpec.value.lower_holder);
};

const isRotaryMismatched = (m: any) => {
  if (!currentMachineSpec.value) return false;
  const cardRotary = m.original_rows?.[0]?.rotary_holder || '0';
  return String(cardRotary) !== String(currentMachineSpec.value.rotary_holder || '0');
};

const isGateMismatched = (m: any) => {
  if (!currentMachineSpec.value) return false;
  const cardGate = m.original_rows?.[0]?.gate_sensor || '0';
  return String(cardGate) !== String(currentMachineSpec.value.gate_sensor || '0');
};

const isNutTypeMismatched = (nutType: string) => {
  if (!currentMachineSpec.value || !nutType) return false;
  return !currentMachineSpec.value.nut_types.includes(String(nutType).trim().toUpperCase());
};

const currentMachineDetails = computed(() => {
  return currentMachineDetailsList.value[0] || null;
});

const searchMachineQuery = ref('');

const getDeduplicatedUniqueMachines = (list: any[]) => {
  if (!list || list.length === 0) return [];
  const map = new Map<string, any>();
  list.forEach((m: any) => {
    if (!map.has(m.machine)) {
      map.set(m.machine, m);
    }
  });
  return Array.from(map.values());
};

const hiddenMatrixMachines = ref<string[]>([]);

const getMachineGunSpec = (machName: string) => {
  const m = getMachineDetails(machName);
  return m?.gun_type || m?.tipe_gun || 'GUN X';
};

const getSourceGunForProc = (proc: any) => {
  if (!proc) return 'GUN X';
  return proc.gun_type || proc.tipe_gun || getMachineGunSpec(proc.machine_use || proc.machine) || 'GUN X';
};

const isRobotGunCompatible = (sourceGun: string, targetMachine: string) => {
  const targetGun = getMachineGunSpec(targetMachine);
  if (String(targetGun).toUpperCase() === 'GUN X&C') return true;
  if (String(sourceGun || '').trim().toUpperCase() === String(targetGun || '').trim().toUpperCase()) return true;
  return false;
};

const getProcImpactHours = (proc: any) => {
  if (!proc) return 0;
  const val = parseFloat(proc.tpt || proc.prod_time || '0');
  return val > 24 ? val / 60.0 : val;
};

const getTargetSimulatedTpt = (proc: any, targetMach: string) => {
  const currentSummary = summaryData.value.find((m: any) => m.machine === targetMach);
  const currentTpt = currentSummary ? parseFloat(currentSummary.tpt || '0') : 0;
  const impact = getProcImpactHours(proc);
  return Number((currentTpt + impact).toFixed(2));
};

const checkSubAssyRecommendation = (proc: any, targetMachine: string) => {
  const sourceGun = getSourceGunForProc(proc);
  const isGunComp = isRobotGunCompatible(sourceGun, targetMachine);
  const newTpt = getTargetSimulatedTpt(proc, targetMachine);
  const isCapOk = newTpt <= 16.0;
  
  return {
    isRecommended: isGunComp && isCapOk,
    isGunComp,
    isCapOk,
    sourceGun,
    targetGun: getMachineGunSpec(targetMachine),
    newTpt
  };
};

const checkGunSpecStyle = (proc: any, mach: any) => {
  const isComp = isRobotGunCompatible(getSourceGunForProc(proc), mach.machine);
  return isComp
    ? 'background-color: #d1e7dd !important; color: #0f5132 !important; font-weight: bold; text-align: center;'
    : 'background-color: #f8d7da !important; color: #842029 !important; font-weight: bold; text-align: center;';
};

const checkTptCapacityStyle = (proc: any, mach: any) => {
  const newTpt = getTargetSimulatedTpt(proc, mach.machine);
  return newTpt <= 16.0
    ? 'background-color: #d1e7dd !important; color: #0f5132 !important; font-weight: bold; text-align: center;'
    : 'background-color: #f8d7da !important; color: #842029 !important; font-weight: bold; text-align: center;';
};

const checkOverallStatusStyle = (proc: any, mach: any) => {
  const rec = checkSubAssyRecommendation(proc, mach.machine);
  return rec.isRecommended
    ? 'background-color: #d1e7dd !important; color: #0f5132 !important; font-weight: bold; text-align: center;'
    : 'background-color: #f8d7da !important; color: #842029 !important; font-weight: bold; text-align: center;';
};

const getUseRecommendedMachinesForProc = (proc: any) => {
  if (!proc) return [];
  const currentM = proc.machine_use || proc.machine || '';
  
  let list = activeMachineOptions.value
    .filter((m: any) => {
      const area = String(m.area || '').toUpperCase();
      const line = String(m.line || '').toUpperCase();
      const name = String(m.machine || '').toUpperCase();
      return (area.includes('SA') || area.includes('SUB ASSY') || line.includes('ROBOT') || line.includes('SA') || name.startsWith('RB-') || name.startsWith('RSW')) && m.machine !== currentM;
    })
    .filter((m: any) => checkSubAssyRecommendation(proc, m.machine).isRecommended);
  
  if (searchMachineQuery.value) {
    const q = searchMachineQuery.value.toLowerCase().trim();
    list = list.filter((m: any) => 
      String(m.machine || '').toLowerCase().includes(q) ||
      String(m.line || m.area || '').toLowerCase().includes(q) ||
      String(m.tipe_gun || m.gun_type || '').toLowerCase().includes(q)
    );
  }
  
  return getDeduplicatedUniqueMachines(list)
    .filter((m: any) => !hiddenMatrixMachines.value.includes(m.machine));
};

const getPrevRecommendedMachinesForProc = (proc: any): any[] => {
  return [];
};

const getRecommendedMachinesForProc = (proc: any) => {
  return getUseRecommendedMachinesForProc(proc);
};

const getNonRecommendedMachinesForProc = (proc: any) => {
  if (!proc) return [];
  const currentM = proc.machine_use || proc.machine || '';
  const recList = getRecommendedMachinesForProc(proc).map((m: any) => m.machine);
  
  let list = activeMachineOptions.value
    .filter((m: any) => {
      const area = String(m.area || '').toUpperCase();
      const line = String(m.line || '').toUpperCase();
      const name = String(m.machine || '').toUpperCase();
      return (area.includes('SA') || area.includes('SUB ASSY') || line.includes('ROBOT') || line.includes('SA') || name.startsWith('RB-') || name.startsWith('RSW')) && m.machine !== currentM;
    })
    .filter((m: any) => !recList.includes(m.machine));
  
  if (searchMachineQuery.value) {
    const q = searchMachineQuery.value.toLowerCase().trim();
    list = list.filter((m: any) => 
      String(m.machine || '').toLowerCase().includes(q) ||
      String(m.line || m.area || '').toLowerCase().includes(q) ||
      String(m.tipe_gun || m.gun_type || '').toLowerCase().includes(q)
    );
  }
  
  return getDeduplicatedUniqueMachines(list)
    .filter((m: any) => !hiddenMatrixMachines.value.includes(m.machine));
};

const getMachineDetails = (machName: string) => {
  const rawName = String(machName || '').trim().toUpperCase();
  if (!rawName) return null;
  return activeMachineOptions.value.find((m: any) => String(m.machine || '').trim().toUpperCase() === rawName) || null;
};

const getMachineLine = (machName: string) => {
  const m = getMachineDetails(machName);
  return m?.line || m?.area || '-';
};

const ckdAliasMap: Record<string, string> = {
  '9004A-17210': 'M6-17210',
  '9004A-17205': 'M8-17205',
  '9004A-17232': 'M8-17232',
  '9004A-17204': 'M6-17204',
  '94223-81000': 'M10-81000',
  '90041-74041': 'M8-74041',
  '9004A-17245': 'M6-17245',
  '90041-74076': 'M6-74076',
  '9004A-17261': 'M12-17261',
  '90041-74052': 'M12-74052',
  '9004A-17222': 'M10-17222',
  '9004A-17182': 'M6-17182',
  '9004A-17184': 'M10-17184',
  'M10 17184': 'M10-17184',
  'M1017184': 'M10-17184',
  '9004A-11404': 'BOLT M6-11404',
  '90042-41172': 'PIN-41172',
  '90041-15128': 'SBOLT M8-15128',
  '90115-08052': 'BOLT-08052',
  '9004A-11336': 'M6-11336',
  '90041-74024': 'M12-74024',
  '90041-74047': 'M10-74047',
  '90201-RB0-3000': 'M8-3000',
  '94061-06001': 'M6-06001',
  '94061-08001': 'M8-08001',
  '13905-08000': 'M8-08000',
  '13905-06000': 'M6-06000',
  '12900-06200': 'M6-06200',
  '13931-06060': 'M6-06060',
  '12991-06193': 'M6-06193',
  '13931-08090': 'M8-08090',
  '19348-07130': 'M13-07130'
};

const resolveSingleCkdAlias = (token: string): string => {
  const clean = String(token || '').replace(/[^\x20-\x7E]/g, '-').trim();
  if (!clean || clean === '-') return '';
  if (ckdAliasMap[clean]) return ckdAliasMap[clean];

  const foundMach = activeMachineOptions.value.find((opt: any) => 
    opt.nut_part_number === clean && opt.nut_type_alias
  );
  if (foundMach?.nut_type_alias) return foundMach.nut_type_alias;

  if (/^P\d{5}-/i.test(clean)) return '';

  return clean;
};

const formatCkdAliasLines = (m: any): string[] => {
  let raw = m?.ckd_part_number || '';
  if (!raw) {
    const list = createData?.value || [];
    const found = list.find((l: any) => l.part_number === m.part_number && String(l.process) === String(m.process));
    raw = found?.ckd_part_number || '';
  }
  if (!raw) {
    const list = createData?.value || [];
    const found = list.find((l: any) => l.part_number === m.part_number && l.ckd_part_number);
    raw = found?.ckd_part_number || '';
  }

  if (!raw || raw === '-') return ['-'];

  const tokens = String(raw).split(',').map((s: string) => s.trim()).filter(Boolean);
  const aliases: string[] = [];
  tokens.forEach((t: string) => {
    const resolved = resolveSingleCkdAlias(t);
    if (resolved && resolved !== '-') {
      aliases.push(resolved);
    }
  });

  const unique = Array.from(new Set(aliases));
  return unique.length > 0 ? unique : ['-'];
};

const getMachineSpecInfo = (machName: string) => {
  const rawName = String(machName || '').trim().toUpperCase();
  if (!rawName) return { kva: '-', nut_feeder: '-', upper_rotary: '-', nut_type: '-', upper_holder: '-', lower_holder: '-', rotary_holder: '-', first: null };

  const matches = activeMachineOptions.value.filter(
    (m: any) => String(m.machine || '').trim().toUpperCase() === rawName
  );

  if (matches.length === 0) {
    return { kva: '-', nut_feeder: '-', upper_rotary: '-', nut_type: '-', upper_holder: '-', lower_holder: '-', rotary_holder: '-', first: null };
  }

  const first = matches[0];
  const kva = first.kva ? `${first.kva} kVA` : '-';

  const hasFeeder = matches.some((m: any) => String(m.nut_feeder || '0') === '1');
  const feederTypes = Array.from(
    new Set(
      matches
        .map((m: any) => m.nut_feeder_type)
        .filter(Boolean)
    )
  );
  const nut_feeder = feederTypes.length > 0 ? feederTypes.join(', ') : (hasFeeder ? 'Ada' : 'Tidak Ada');

  const upper_holder = first.upper_holder || '-';
  const lower_holder = first.lower_holder || '-';
  const hasRotary = matches.some((m: any) => String(m.rotary_holder || '0') === '1');
  const rotary_holder = hasRotary ? 'Ada' : 'Tidak Ada';
  const upper_rotary = hasRotary ? `${upper_holder} / Rotary` : upper_holder;

  // Hanya tampilkan kolom alias nut (seperti M6-17210, M8-17205, M10-81000), JANGAN sertakan part number / nama part
  const allNuts = Array.from(
    new Set(
      matches
        .map((m: any) => {
          if (m.nut_type_alias && String(m.nut_type_alias).trim() !== '' && m.nut_type_alias !== '-') {
            return String(m.nut_type_alias).trim();
          }
          const raw = String(m.nut_type || '').replace(/[^\x20-\x7E]/g, '-').trim();
          if (raw && raw !== '-') {
            if (ckdAliasMap[raw]) return ckdAliasMap[raw];
            if (/^(M\d|PIN|BOLT|SBOLT)/i.test(raw)) return raw;
          }
          return '';
        })
        .filter(b => b !== '')
    )
  );
  const nut_type = allNuts.length > 0 ? allNuts.join(', ') : '-';

  return {
    kva,
    nut_feeder,
    upper_rotary,
    nut_type,
    upper_holder,
    lower_holder,
    rotary_holder,
    first
  };
};

const formatNutTypeLines = (nutTypeStr: string) => {
  if (!nutTypeStr || nutTypeStr === '-') return ['-'];
  const items = nutTypeStr.split(',').map((s: string) => s.trim()).filter(Boolean);
  return items.length > 0 ? items : ['-'];
};


const checkKvaSpecForProc = (proc: any, m: any) => {
  const currentDetails = getMachineDetails(proc.machine_use);
  if (!currentDetails?.kva || !m.kva) return true;
  return Number(m.kva) >= Number(currentDetails.kva);
};

const checkNutFeederSpecForProc = (proc: any, m: any) => {
  return String(m.nut_feeder) === '1';
};

const checkNutTypeSpecForProc = (proc: any, m: any) => {
  const currentDetails = getMachineDetails(proc.machine_use);
  const currentNut = currentDetails?.nut_type || proc.nut_type || proc.ckd_part_number || '';
  if (!currentNut || currentNut === '-') return true;

  const currentNuts = currentNut.split(/[\s,]+/).map((s: string) => s.trim().toUpperCase()).filter(Boolean);
  const candNut = m.nut_type || m.nut_type_alias || m.nut_part_number || '';
  if (!candNut || candNut === '-') return false;

  const candNuts = [
    ...(m.nut_type ? String(m.nut_type).split(/[\s,]+/) : []),
    ...(m.nut_type_alias ? String(m.nut_type_alias).split(/[\s,]+/) : []),
    ...(m.nut_part_number ? String(m.nut_part_number).split(/[\s,]+/) : [])
  ].map((s: string) => s.trim().toUpperCase()).filter(Boolean);

  return currentNuts.some((cn: string) => {
    return candNuts.some((cdn: string) => {
      if (cn === cdn) return true;
      const cnSuffix = cn.includes('-') ? cn.split('-').pop() : cn;
      const cdnSuffix = cdn.includes('-') ? cdn.split('-').pop() : cdn;
      return cnSuffix && cdnSuffix && cnSuffix === cdnSuffix;
    });
  });
};

const checkUpperHolderSpecForProc = (proc: any, m: any) => {
  const currentDetails = getMachineDetails(proc.machine_use);
  const currentHolder = currentDetails?.upper_holder;
  return isUpperHolderValid(m.upper_holder, currentHolder);
};

const checkLowerHolderSpecForProc = (proc: any, m: any) => {
  const currentDetails = getMachineDetails(proc.machine_use);
  const currentHolder = String(currentDetails?.lower_holder || proc.lower_holder || '').trim().toUpperCase();
  const candHolder = String(m.lower_holder || '').trim().toUpperCase();
  if (!currentHolder || currentHolder === '-') return true;

  if (currentHolder.includes('PELATUK') || currentHolder.includes('PLT')) {
    return candHolder.includes('PELATUK') || candHolder.includes('PLT');
  }
  if (currentHolder.includes('LURUS') || currentHolder.includes('LRS')) {
    return candHolder.includes('LURUS') || candHolder.includes('LRS') || candHolder.includes('PELATUK') || candHolder.includes('PLT');
  }
  return candHolder === currentHolder;
};

const checkRotarySpecForProc = (proc: any, m: any) => {
  const currentDetails = getMachineDetails(proc.machine_use);
  const currentRotary = String(currentDetails?.rotary_holder || '0') === '1';
  const currentRobo = String(currentDetails?.robo_navi || '0') === '1';
  const candRotary = String(m.rotary_holder || '0') === '1';
  const candRobo = String(m.robo_navi || '0') === '1';

  if (currentRotary && currentRobo) {
    return candRotary && candRobo;
  }
  if (currentRotary) {
    return candRotary || candRobo;
  }
  if (currentRobo) {
    return candRobo;
  }
  return true;
};

const checkRoboSpecForProc = (proc: any, m: any) => {
  const currentDetails = getMachineDetails(proc.machine_use);
  const currentRobo = String(currentDetails?.robo_navi || '0') === '1';
  if (currentRobo) {
    return String(m.robo_navi || '0') === '1';
  }
  return true;
};

const getSpecPills = (machName: string, isTarget: boolean, proc: any = null) => {
  const details = getMachineDetails(machName);
  if (!details) return [];
  
  const pills = [];
  
  // kVA
  const kvaValid = isTarget && proc ? checkKvaSpecForProc(proc, details) : true;
  pills.push({ label: `kVA: ${details.kva || '-'}`, color: isTarget ? (kvaValid ? 'success' : 'error') : 'primary' });
  
  // Nut Type
  const nutF = String(details.nut_feeder || '0') === '1' ? 'Ya' : 'Tdk';
  const nutValid = isTarget && proc ? checkNutTypeSpecForProc(proc, details) : true;
  pills.push({ label: `Nut Feeder: ${nutF}`, color: isTarget ? (nutValid ? 'success' : 'error') : 'primary' });
  
  // Rotary
  const rot = String(details.rotary_holder || '0') === '1' ? 'Ya' : 'Tdk';
  const rotValid = isTarget && proc ? checkRotarySpecForProc(proc, details) : true;
  pills.push({ label: `Rotary: ${rot}`, color: isTarget ? (rotValid ? 'success' : 'error') : 'primary' });
  
  // Upper Holder
  const up = details.upper_holder || '-';
  const upValid = isTarget && proc ? checkUpperHolderSpecForProc(proc, details) : true;
  pills.push({ label: `Upper: ${up}`, color: isTarget ? (upValid ? 'success' : 'error') : 'primary' });

  return pills;
};

const checkHandySpecForProc = (proc: any, m: any) => {
  const currentDetails = getMachineDetails(proc.machine_use);
  const currentHandy = String(currentDetails?.handy_navi || '0') === '1';
  if (currentHandy) {
    return String(m.handy_navi || '0') === '1';
  }
  return true;
};

const confirmSelectNonRecommendedForProc = (proc: any, machName: string) => {
  notificationStore.showConfirm(
    "Konfirmasi Mesin Tidak Rekomendasi",
    `Mesin ${machName} tidak berada dalam daftar spesifikasi rekomendasi. Apakah Anda yakin tetap ingin memilih mesin ini?`,
    () => {
      proc.selectedTargetMachine = machName;
    }
  );
};

const isSubmitMoveDisabled = computed(() => {
  return movePartProcesses.value.length === 0 || movePartProcesses.value.some((p: any) => !p.selectedTargetMachine);
});

const openMoveModal = (part: any, machine_use?: string) => {
  let allP: any[] = [];

  // Ambil semua proses untuk part_number yang sama dari createData / store.createData / machinePartData
  const allSources = [
    ...(createData.value || []),
    ...(store.createData || []),
    ...(store.machinePartData || [])
  ];

  const matches = allSources.filter((p: any) => p && p.part_number === part.part_number);

  if (matches.length > 0) {
    // Pastikan hanya mengambil 1 item per nomor proses (unique by process number)
    const procMap = new Map();
    for (const item of matches) {
      const rawProc = String(item.process || 1).split('/')[0].trim();
      const procNum = Number(rawProc) || 1;
      if (!procMap.has(procNum)) {
        procMap.set(procNum, item);
      }
    }
    allP = Array.from(procMap.values());
  } else if (part) {
    allP = [part];
  }

  allP.sort((a: any, b: any) => {
    const aProc = Number(String(a.process || 0).split('/')[0]) || 0;
    const bProc = Number(String(b.process || 0).split('/')[0]) || 0;
    return aProc - bProc;
  });

  const totalCount = Math.max(
    allP.length,
    Number(part?.total_proses || 0),
    ...allP.map((p: any) => Number(p.total_proses || 0))
  ) || 1;

  movePartProcesses.value = allP.map((p: any, idx: number) => {
    const rawProc = String(p.process || (idx + 1)).split('/')[0].trim();
    const pNum = Number(rawProc) || (idx + 1);
    return {
      ...p,
      id_load: p.id_load || p.id_gsl || p.id,
      machine_use: p.machine_use || machine_use || part?.machine || '',
      process: pNum,
      total_proses: totalCount,
      selectedTargetMachine: '' // Harus dipilih secara eksplisit oleh pengguna
    };
  });

  movePartData.value = {
    ...(allP[0] || part),
    total_proses: totalCount
  };
  const mName = machine_use || part?.machine || part?.machine_use || part?.machine_prev || '';
  currentMachineName.value = mName;
  isMoveModalOpen.value = true;
};

const closeMoveModal = () => {
  isMoveModalOpen.value = false;
  movePartData.value = null;
  movePartProcesses.value = [];
  selectedMoveMachine.value = '';
  currentMachineName.value = '';
  hiddenMatrixMachines.value = [];
};

const submitMovePart = async () => {
  if (moveLoading.value) return;

  const currentMachine = movePartProcesses.value[0]?.machine_use || currentMachineName.value || selectedViewMachine.value;

  const items = movePartProcesses.value.map((p: any) => {
    return {
      id_load: p.id_load || p.id_gsl || p.id,
      new_machine: p.selectedTargetMachine
    };
  });

  if (items.length === 0 || items.some(item => !item.id_load || !item.new_machine)) {
    notificationStore.showDialogWarning("Warning", "Pilih mesin tujuan untuk semua proses terlebih dahulu.");
    return;
  }

  moveLoading.value = true;
  const simId = store.currentSimulationId || (store.summaryData && store.summaryData.length > 0 ? store.summaryData[0].id_simulation : null) || (store.createData as any)?.id;
  const targetRefreshMachine = selectedViewMachine.value || currentMachine;

  const success = await store.changeMachineLoadBatch(items, simId);
  if (success) {
    try {
      const activeUser = (authStore.user as any)?.username || (authStore.user as any)?.fullname || 'User';
      const logEntries = movePartProcesses.value.map((p: any) => ({
        user: activeUser,
        part_number: p.part_number,
        job_number: p.job_number,
        model: p.model,
        process: p.process,
        from_machine: p.machine_use || currentMachine,
        to_machine: p.selectedTargetMachine,
        reason: generateAutoReason(p.machine_use || currentMachine, p.selectedTargetMachine),
        is_auto: false,
        pcs_day: Number(p.pcs_day || 0),
        cycle_time_sec: Number(p.cycle_time_sec || 0)
      }));
      addMovementLogBatch(logEntries, simId);
    } catch (logErr) {
      console.error('Failed to log part movement:', logErr);
    }

    closeMoveModal();
    if (simId) {
      await store.fetchInactiveMachineInUse(simId);
      if (targetRefreshMachine) {
        selectedViewMachine.value = targetRefreshMachine;
        await store.fetchSimulationLoadByMachine(simId, targetRefreshMachine);
      }
    }
    initChart(); // re-init chart after data refreshed
  }
  moveLoading.value = false;
};
</script>

<template>
  <div class="page-wrapper">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

    <v-stepper v-model="step" elevation="0" class="bg-transparent" hide-actions>
      <v-stepper-header class="elevation-1 rounded-lg bg-white mb-6">
        <v-stepper-item title="Formulir & Data Simulasi" :value="1" :complete="step > 1" color="primary"></v-stepper-item>
        <v-divider :color="step >= 2 ? 'primary' : undefined" :thickness="step >= 2 ? 3 : 1" :style="step >= 2 ? 'border-color: #0345a1 !important; opacity: 1 !important;' : ''"></v-divider>
        <v-stepper-item title="Dedicated Machine Data" :value="2" :complete="step > 2" color="primary"></v-stepper-item>
        <v-divider :color="step >= 3 ? 'primary' : undefined" :thickness="step >= 3 ? 3 : 1" :style="step >= 3 ? 'border-color: #0345a1 !important; opacity: 1 !important;' : ''"></v-divider>
        <v-stepper-item title="Live Dashboard Mesin" :value="3" color="primary"></v-stepper-item>
      </v-stepper-header>

      <v-stepper-window class="pa-0 mx-0">
        <!-- STEP 1: FORM CREATE -->
        <v-stepper-window-item :value="1">
          <!-- CARD 1: FORMULIR HEADER SIMULASI -->
          <v-card class="rounded-lg mb-6 elevation-2 border">
            <!-- Blue Header Bar -->
            <div class="py-1.5 px-4 d-flex align-center rounded-t-lg text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 42px;">
              <v-icon class="mr-2" color="white" size="20">mdi-clipboard-text-outline</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Formulir Header Simulasi</span>
            </div>

            <!-- Form Inputs -->
            <v-card-text class="pa-5">
              <v-row density="compact">
                <v-col cols="12" md="6">
                  <v-text-field v-model="createForm.area" label="Area *" variant="outlined" density="compact" bg-color="grey-lighten-4" readonly hide-details="auto" />
                </v-col>
                <v-col cols="12" md="3">
                  <v-select v-model="selectedYear" :items="yearOptions" label="Tahun Periode *" variant="outlined" density="compact" bg-color="white" hide-details="auto" />
                </v-col>
                <v-col cols="12" md="3">
                  <v-select v-model="selectedMonth" :items="monthOptions" item-title="title" item-value="value" label="Bulan Periode *" variant="outlined" density="compact" bg-color="white" hide-details="auto" />
                </v-col>
                <v-col cols="12" class="mt-2">
                  <v-textarea v-model="createForm.note" label="Note" variant="outlined" density="compact" bg-color="white" rows="2" hide-details="auto" />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- CARD 2: LIST ITEM PART SIMULASI -->
          <v-card class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <!-- Minimalist Header with Action Buttons -->
            <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-4">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary" size="24">mdi-table-large</v-icon>
                <div class="text-h5 text-primary font-weight-medium mr-3">List Item Part Simulasi</div>
                <v-chip
                  v-if="isCreateFromMaster"
                  size="small"
                  :color="currentMachineSourceMode === 'sim_load' ? 'purple' : 'indigo'"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  <v-icon start size="14">{{ currentMachineSourceMode === 'sim_load' ? 'mdi-history' : 'mdi-database' }}</v-icon>
                  Source: {{ currentMachineSourceMode === 'sim_load' ? 'Riwayat Simulasi' : 'Master Data' }}
                </v-chip>
              </div>
              <div class="d-flex flex-wrap align-center gap-2">
                <v-btn
                  color="warning"
                  size="small"
                  variant="flat"
                  prepend-icon="mdi-chart-box-outline"
                  class="font-weight-bold"
                  @click="openAchievementModal"
                >
                  Data Achievement Actual
                </v-btn>

                <v-btn
                  color="success"
                  size="small"
                  variant="flat"
                  prepend-icon="mdi-plus"
                  class="font-weight-bold"
                  @click="openAddPartModal"
                >
                  Tarik Part No Baru
                </v-btn>

                <v-btn 
                  color="info" 
                  size="small"
                  variant="flat"
                  prepend-icon="mdi-cloud-download"
                  class="font-weight-bold"
                  @click="openTarikPcsDayModal"
                  :loading="pcsDayLoading"
                >
                  Tarik Pcs/Day
                </v-btn>

                <v-btn 
                  color="teal-darken-1" 
                  size="small"
                  variant="flat"
                  prepend-icon="mdi-sitemap"
                  class="font-weight-bold text-white shadow-sm"
                  @click="handleGenerateParent"
                  :loading="generateParentLoading"
                >
                  Generate Parent
                </v-btn>

                <v-btn
                  v-if="isCreateFromMaster"
                  :color="currentMachineSourceMode === 'sim_load' ? 'purple-darken-2' : 'indigo-darken-2'"
                  size="small"
                  variant="flat"
                  :prepend-icon="currentMachineSourceMode === 'sim_load' ? 'mdi-history' : 'mdi-database-sync'"
                  class="font-weight-bold text-white shadow-sm"
                  @click="toggleMachineSourceMode"
                >
                  <template v-if="currentMachineSourceMode === 'master'">
                    Switch ke Mesin Riwayat Simulasi
                  </template>
                  <template v-else>
                    Switch ke Mesin Master Data
                  </template>
                </v-btn>

                <v-btn
                  v-if="isAnyExcelFilterActive"
                  color="error"
                  size="small"
                  variant="flat"
                  prepend-icon="mdi-filter-off"
                  @click="resetAllExcelFilters"
                >
                  Reset Filter
                </v-btn>

                <v-text-field
                  v-model="searchQuery"
                  prepend-inner-icon="mdi-magnify"
                  placeholder="Cari Part Number / Machine..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  style="width: 300px;"
                  bg-color="white"
                  class="header-search-field"
                ></v-text-field>
              </div>
            </div>

            <!-- Table Container -->
            <v-card-text class="pa-0">
              <div v-if="createLoading" class="d-flex flex-column align-center justify-center py-10">
                <v-progress-circular indeterminate color="primary" size="48" class="mb-4"></v-progress-circular>
                <div class="text-body-1 font-weight-medium text-grey-darken-1">Memuat Data Simulasi... Harap Tunggu</div>
              </div>

              <div v-else class="border rounded-lg overflow-hidden bg-white">
                <v-table density="compact" class="custom-table text-body-2" fixed-header height="750px">
                  <thead>
                    <tr style="background-color: #eef2f7;">
                      <th class="text-center font-weight-bold sticky-col sticky-col-1" style="width: 44px;">
                        <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="mt-1" />
                      </th>
                      <th class="text-center font-weight-bold sticky-col sticky-col-2" style="width: 44px;">No</th>
                      <th
                        v-for="col in createHeaders"
                        :key="col.key"
                        class="text-center text-body-2 font-weight-bold"
                        :class="getHeaderStickyClass(col.key)"
                        :style="getHeaderCustomStyle(col.key)"
                      >
                        <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                          <template v-slot:activator="{ props }">
                            <div v-bind="props" class="header-inner d-flex align-center justify-center cursor-pointer select-none py-1 hover-header">
                              <span :class="{'text-primary font-weight-bold': isExcelFilterActive(col.key)}">
                                {{ col.title }}
                              </span>
                              <v-icon size="14" class="ml-1" :color="isExcelFilterActive(col.key) || sortKey === col.key ? 'primary' : 'grey-lighten-1'">
                                {{ sortKey === col.key ? (sortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                              </v-icon>
                            </div>
                          </template>

                          <v-card width="250" class="pa-2 rounded-lg text-black">
                            <v-list density="compact" class="pa-0">
                              <v-list-item prepend-icon="mdi-sort-ascending" title="Sort A to Z / Ascending" @click="setExcelSort(col.key, 'asc')" />
                              <v-list-item prepend-icon="mdi-sort-descending" title="Sort Z to A / Descending" @click="setExcelSort(col.key, 'desc')" />
                            </v-list>
                            <v-divider class="my-1" />
                            
                            <v-text-field
                              v-model="excelSearchQueries[col.key]"
                              placeholder="Cari nilai..."
                              density="compact"
                              variant="outlined"
                              hide-details
                              prepend-inner-icon="mdi-magnify"
                              clearable
                              class="mb-2"
                            />

                            <div style="max-height: 180px; overflow-y: auto;" class="border rounded pa-1 text-left">
                              <v-checkbox
                                label="(Select All)"
                                density="compact"
                                hide-details
                                :model-value="isAllExcelItemsChecked(col.key)"
                                @click="toggleExcelSelectAll(col.key)"
                                class="ma-0 pa-0"
                              />
                              <v-checkbox
                                v-for="item in getExcelFilteredUniqueItems(col.key)"
                                :key="item"
                                :label="formatFilterValue(col.key, item)"
                                :value="item"
                                v-model="excelCheckedFilters[col.key]"
                                density="compact"
                                hide-details
                                class="ma-0 pa-0"
                              />
                            </div>
                            
                            <v-card-actions class="justify-end pa-0 mt-2">
                              <v-btn size="x-small" variant="text" color="grey" @click="clearSingleExcelFilter(col.key)">Reset</v-btn>
                            </v-card-actions>
                          </v-card>
                        </v-menu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in paginatedData" :key="index" :class="getRowClass(item)">
                      <td class="text-center align-middle sticky-col sticky-col-1">
                        <input type="checkbox" v-model="item.selected" :disabled="item.is_deleted" class="mt-1" />
                      </td>
                      <td class="text-center font-weight-medium align-middle sticky-col sticky-col-2">
                        {{ (currentPage - 1) * itemsPerPage + index + 1 }}
                      </td>
                      <td class="text-center align-middle font-weight-medium sticky-col sticky-col-3">
                        {{ item.model || '-' }}
                      </td>
                      <td class="font-weight-bold align-middle text-primary sticky-col sticky-col-4" style="font-size: 14px; white-space: nowrap;">
                        {{ formatPartNumber(item.part_number) }}
                      </td>
                      <td class="align-middle sticky-col sticky-col-5">
                        {{ item.job_number || '-' }}
                      </td>

                      <td class="text-center align-middle">
                        {{ item.total_proses || '-' }}
                      </td>
                      <td class="align-middle" style="min-width: 280px; width: 280px;">
                        {{ item.part_name || '-' }}
                      </td>
                      <td class="align-middle font-weight-medium" style="min-width: 180px; width: 180px; white-space: normal; line-height: 1.2;">
                        <div class="d-flex align-center flex-wrap gap-1">
                          <span>{{ item.part_top_parent || item.top_parent_part_number || '-' }}</span>
                          <v-chip v-if="item.is_new_parent_row && !item.is_deleted" size="x-small" color="success" variant="flat" class="font-weight-bold ml-1">Parent Tambahan</v-chip>
                          <v-chip v-if="item.is_deleted" size="x-small" color="error" variant="flat" class="font-weight-bold ml-1">Baris Berlebih (Dihapus)</v-chip>
                        </div>
                      </td>
                      <td class="text-center">{{ item.process || '-' }}</td>
                      <td class="text-right">{{ item.qty_kanban || '0' }}</td>
                      <td
                        class="text-right cursor-pointer hover-pcs-day"
                        :style="getPcsDayTextStyle(item)"
                        @click="openPcsDayDetailModal(item)"
                        title="Klik untuk melihat rincian asal-usul Pcs/Day (Part Delivery)"
                      >
                        <span>{{ item.pcs_day_monthly || item.pcs_day || '0' }}</span>
                        <v-icon v-if="isPcsDayIncreased(item)" size="14" color="error" class="ml-1">mdi-arrow-up-bold</v-icon>
                        <v-icon v-if="isPcsDayDecreased(item)" size="14" color="success" class="ml-1">mdi-arrow-down-bold</v-icon>
                        <v-icon size="12" color="primary" class="ml-1 opacity-60">mdi-information-outline</v-icon>
                      </td>
                      <td
                        class="text-right cursor-pointer hover-pcs-day"
                        @click="openPcsDayDetailModal(item)"
                        title="Klik untuk melihat rincian asal-usul Pcs/Day (Part Delivery)"
                      >
                        {{ item.pcs_day_prev !== undefined && item.pcs_day_prev !== null && item.pcs_day_prev !== '' ? item.pcs_day_prev : '-' }}
                      </td>
                      <td class="text-center">
                        <input type="number" v-model="item.ckd" class="native-input bg-grey-lighten-4" readonly style="min-width: 60px;" />
                      </td>
                      <td class="text-left">
                        <input type="text" v-model="item.ckd_part_number" class="native-input bg-grey-lighten-4" readonly style="min-width: 120px;" placeholder="-" />
                      </td>
                      <td class="text-right">{{ item.stroke || '0' }}</td>
                      <td style="min-width: 150px;">
                        <input type="text" :value="item.machine_use" class="native-input bg-grey-lighten-4 text-grey-darken-1" readonly />
                      </td>
                      <td style="min-width: 100px;">
                        <input type="text" :value="item.machine_prev || '-'" class="native-input bg-grey-lighten-4 text-grey-darken-1" readonly />
                      </td>
                      <td style="min-width: 120px;">
                        <input type="text" :value="item.next_process || '-'" class="native-input bg-grey-lighten-4 text-grey-darken-1" readonly />
                      </td>
                      <td style="min-width: 100px;">
                        <input type="number" v-model="item.lot_cycle" class="native-input" @input="calculateRow(item, 'lot_cycle')" />
                      </td>
                      <td class="text-center font-weight-medium" style="min-width: 90px;">
                        {{ item.patan || (Number(item.lot_cycle) <= 1 ? 'A B C D' : 'A C') }}
                      </td>
                      <td style="min-width: 100px;">
                        <input type="number" v-model="item.lot_size_shift" class="native-input" @input="calculateRow(item, 'lot_size_shift')" />
                      </td>
                      <td class="text-right font-weight-medium align-middle" style="min-width: 90px;">
                        {{ item.count_pallet !== undefined && item.count_pallet !== null ? item.count_pallet : (Number(item.qty_kanban) > 0 ? (Number(item.lot_size_shift) / Number(item.qty_kanban)).toFixed(2) : '0') }}
                      </td>
                      <td style="min-width: 100px;">
                        <input type="number" v-model="item.cycle_time_sec" class="native-input" @input="calculateRow(item, 'cycle_time_sec')" />
                      </td>
                      <td style="min-width: 100px;">
                        <input type="text" v-model="item.jig" class="native-input" placeholder="-" />
                      </td>
                      <td style="min-width: 90px;">
                        <input type="number" v-model="item.jumlah_spot" class="native-input" @input="calculateRow(item, 'jumlah_spot')" />
                      </td>
                      <td style="min-width: 100px;">
                        <input type="number" step="any" v-model="item.freq_dresser" class="native-input" @input="calculateRow(item, 'freq_dresser')" />
                      </td>
                      <td style="min-width: 100px;">
                        <input type="number" step="any" v-model="item.freq_tip_change" class="native-input" @input="calculateRow(item, 'freq_tip_change')" />
                      </td>
                      <td>{{ item.upper_holder || '-' }}</td>
                      <td>{{ item.lower_holder || '-' }}</td>
                      <td>{{ item.kva || '-' }}</td>
                      <td style="min-width: 100px;">
                        <input type="number" v-model="item.dandori" class="native-input" @input="calculateRow(item, 'dandori')" />
                      </td>
                      <td style="min-width: 100px;">
                        <input type="number" v-model="item.downtime" class="native-input" @input="calculateRow(item, 'downtime')" />
                      </td>
                      <td class="text-right">{{ item.prod_time || '0' }}</td>
                      <td class="text-right">{{ item.tpt || '0' }}</td>
                      <td class="text-right">{{ item.uph || '0' }}</td>
                    </tr>
                  </tbody>
                </v-table>
                
                <div class="d-flex justify-space-between align-center pa-4 bg-grey-lighten-5 border-t">
                  <div class="text-caption text-grey-darken-1">
                    Menampilkan {{ filteredCreateData.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredCreateData.length) }} dari total {{ filteredCreateData.length }} Part <span v-if="filteredCreateData.length !== createData.length">(Filtered dari {{ createData.length }})</span>
                  </div>
                  <v-pagination v-model="currentPage" :length="totalPages" total-visible="7" density="compact" color="primary"></v-pagination>
                </div>
              </div>
            </v-card-text>

            <!-- Card 2 Footer Action Buttons -->
            <v-card-actions class="pa-4 bg-grey-lighten-5 border-t d-flex justify-end gap-3">
              <v-btn color="grey-darken-1" variant="outlined" size="large" @click="cancel">
                Batal
              </v-btn>
              <v-btn style="background-color: rgb(3, 69, 161) !important; color: white !important;" variant="flat" size="large" prepend-icon="mdi-content-save" :loading="createLoading" @click="handleSave">
                Simpan Simulasi
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-stepper-window-item>

      <!-- STEP 2: DEDICATED MACHINE DATA -->
      <v-stepper-window-item :value="2">
        <v-card class="rounded-lg mb-6 elevation-2 border">
          <div class="py-1 px-4 d-flex justify-space-between align-center rounded-t-lg text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 38px;">
            <div class="d-flex align-center">
              <v-icon class="mr-2" color="white" size="20">mdi-robot-industrial</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Data Master Dedicated Machine</span>
            </div>
            <div v-if="isAnyDedExcelFilterActive">
              <v-btn
                color="error"
                variant="flat"
                density="compact"
                size="small"
                prepend-icon="mdi-filter-off"
                @click="resetAllDedExcelFilters"
              >
                Reset Filter
              </v-btn>
            </div>
          </div>

          <v-card-text class="pa-5">
            <div v-if="dedicatedStore.loading" class="d-flex justify-center align-center py-10">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            </div>

            <v-table v-else density="compact" class="custom-table text-body-2 border" fixed-header height="400px">
              <thead>
                <tr style="background-color: #eef2f7;">
                  <th class="text-center font-weight-bold" style="background: #eef2f7;">No</th>
                  <th
                    v-for="col in dedicatedHeaders"
                    :key="col.key"
                    class="text-center text-body-2 font-weight-bold"
                    style="background: #eef2f7;"
                  >
                    <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                      <template v-slot:activator="{ props }">
                        <div v-bind="props" class="header-inner d-flex align-center justify-center cursor-pointer select-none py-1 hover-header">
                          <span :class="{'text-primary font-weight-bold': isDedExcelFilterActive(col.key)}">
                            {{ col.title }}
                          </span>
                          <v-icon size="14" class="ml-1" :color="isDedExcelFilterActive(col.key) || dedSortKey === col.key ? 'primary' : 'grey-lighten-1'">
                            {{ dedSortKey === col.key ? (dedSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                          </v-icon>
                        </div>
                      </template>

                      <v-card width="250" class="pa-2 rounded-lg text-black">
                        <v-list density="compact" class="pa-0">
                          <v-list-item prepend-icon="mdi-sort-ascending" title="Sort A to Z / Ascending" @click="setDedExcelSort(col.key, 'asc')" />
                          <v-list-item prepend-icon="mdi-sort-descending" title="Sort Z to A / Descending" @click="setDedExcelSort(col.key, 'desc')" />
                        </v-list>
                        <v-divider class="my-1" />
                        
                        <v-text-field
                          v-model="dedExcelSearchQueries[col.key]"
                          placeholder="Cari nilai..."
                          density="compact"
                          variant="outlined"
                          hide-details
                          prepend-inner-icon="mdi-magnify"
                          clearable
                          class="mb-2"
                        />

                        <div style="max-height: 180px; overflow-y: auto;" class="border rounded pa-1 text-left">
                          <v-checkbox
                            label="(Select All)"
                            density="compact"
                            hide-details
                            :model-value="isAllDedExcelItemsChecked(col.key)"
                            @click="toggleDedExcelSelectAll(col.key)"
                            class="ma-0 pa-0"
                          />
                          <v-checkbox
                            v-for="item in getDedExcelFilteredUniqueItems(col.key)"
                            :key="item"
                            :label="item || '-'"
                            :value="item"
                            v-model="dedExcelCheckedFilters[col.key]"
                            density="compact"
                            hide-details
                            class="ma-0 pa-0"
                          />
                        </div>
                        
                        <v-card-actions class="justify-end pa-0 mt-2">
                          <v-btn size="x-small" variant="text" color="grey" @click="clearSingleDedExcelFilter(col.key)">Reset</v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in filteredDedicatedData" :key="item.id || index">
                  <td class="text-center">{{ index + 1 }}</td>
                  <td class="text-left">{{ item.area || '-' }}</td>
                  <td class="text-left font-weight-bold" style="font-size: 14px; white-space: nowrap;">
                    {{ formatPartNumber(item.part_number) }}
                  </td>
                  <td class="text-left font-weight-bold text-primary">{{ item.machine }}</td>
                  <td class="text-left text-grey-darken-1">{{ item.note || '-' }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>

        <!-- Inactive Machine In Use -->
        <v-card class="rounded-lg mb-6 elevation-2 border">
          <div class="py-1 px-4 d-flex align-center justify-space-between rounded-t-lg text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 38px;">
            <div class="d-flex align-center">
              <v-icon class="mr-2" color="white" size="20">mdi-alert-circle-outline</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Daftar Part pada Mesin Tidak Aktif</span>
            </div>
            <div class="d-flex align-center bg-white-transparent px-3 py-1 rounded-pill">
              <span class="text-caption font-weight-bold mr-2 text-white">Gunakan Prev Machine untuk Semua:</span>
              <v-switch
                v-model="useAllPrevMachines"
                @update:model-value="toggleAllPrevMachines"
                color="white"
                density="compact"
                hide-details
                inline
              ></v-switch>
            </div>
          </div>
          
          <v-card-text class="pa-5">
            <v-alert type="warning" variant="tonal" class="mb-4">
              Part di bawah ini saat ini diarahkan ke <strong>Machine Use yang TIDAK AKTIF</strong> (atau belum memiliki Machine Use).
              Anda dapat mengaktifkan opsi <strong>"Gunakan Prev Machine"</strong> untuk mengembalikan alokasi part ke <strong>Machine Prev (Backup Machine)</strong> yang aktif, atau memilih alokasi <strong>Machine Use</strong> baru secara manual.
            </v-alert>

          <div v-if="store.inactiveMachineInUseLoading" class="d-flex justify-center align-center py-5">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
          </div>
          
          <div v-else-if="store.inactiveMachineInUseData.length === 0" class="text-center py-5 text-grey">
            Semua part menggunakan mesin yang aktif.
          </div>

          <v-table v-else density="compact" class="custom-table text-body-2 border" fixed-header height="350px">
            <thead>
              <tr style="background-color: #eef2f7;">
                <th class="text-center font-weight-bold">No</th>
                <th class="text-left font-weight-bold">Part Number</th>
                <th class="text-center font-weight-bold">Mesin Saat Ini (Inaktif)</th>
                <th class="text-center font-weight-bold">Mesin Backup (Prev)</th>
                <th class="text-center font-weight-bold">Gunakan Prev</th>
                <th class="text-left font-weight-bold" style="min-width: 220px;">Pilih Mesin Aktif (Baru)</th>
                <th class="text-left font-weight-bold" style="min-width: 240px;">Keterangan</th>
                <th class="text-center font-weight-bold">TPT (mnt)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in store.inactiveMachineInUseData" :key="item.id">
                <td class="text-center">{{ index + 1 }}</td>
                <td class="font-weight-bold" style="font-size: 14px; white-space: nowrap;">
                  {{ formatPartNumber(item.part_number) }}
                </td>
                <td class="text-center">
                  <v-chip size="x-small" color="error" variant="tonal" class="font-weight-bold">
                    {{ item.machine || '-' }}
                  </v-chip>
                </td>
                <td class="text-center font-weight-medium">
                  <span v-if="item.machine_prev" class="text-slate-800 font-weight-bold">
                    {{ item.machine_prev }}
                  </span>
                  <span v-else class="text-grey">-</span>
                </td>
                <td class="text-center">
                  <v-switch
                    :model-value="!!item.use_prev"
                    @update:model-value="(val) => toggleUsePrevMachine(item, val)"
                    :disabled="!item.machine_prev || !isPrevMachineActive(item)"
                    color="primary"
                    density="compact"
                    hide-details
                    class="d-inline-flex ms-2"
                  ></v-switch>
                </td>
                <td style="min-width: 220px;">
                  <v-autocomplete
                    v-model="item.machine_use"
                    @update:model-value="() => onMachineUseChange(item)"
                    :items="activeMachineOptions"
                    item-title="machine"
                    item-value="machine"
                    placeholder="- Pilih Mesin Aktif -"
                    density="compact"
                    variant="outlined"
                    hide-details
                    bg-color="white"
                  ></v-autocomplete>
                </td>
                <td class="text-left">
                  <span
                    v-if="!item.machine_prev"
                    class="text-error font-weight-medium text-caption"
                  >
                    Tidak memiliki Machine Backup (Prev)
                  </span>
                  <span
                    v-else-if="isPrevMachineActive(item)"
                    class="text-success font-weight-medium text-caption"
                  >
                    Machine Backup ({{ item.machine_prev }}) aktif & dapat digunakan
                  </span>
                  <span
                    v-else
                    class="text-error font-weight-medium text-caption"
                  >
                    Machine Backup ({{ item.machine_prev }}) juga tidak aktif
                  </span>
                </td>
                <td class="text-center">{{ item.tpt }}</td>
              </tr>
            </tbody>
          </v-table>
          </v-card-text>
        </v-card>

        <!-- ACTION BUTTONS BELOW INACTIVE MACHINE CARD -->
        <div class="d-flex justify-end gap-3 pa-4 bg-white border rounded-lg elevation-1 mb-6">
          <v-btn color="grey-darken-1" variant="outlined" size="large" @click="cancelProgress">Batal & Hapus Progress</v-btn>
          <v-btn style="background-color: rgb(3, 69, 161) !important; color: white;" variant="flat" size="large" prepend-icon="mdi-arrow-right" @click="proceedToStep3">Lanjut ke Dashboard</v-btn>
        </div>
      </v-stepper-window-item>

      <!-- STEP 3: DASHBOARD -->
      <v-stepper-window-item :value="3">
        <v-card class="rounded-lg mb-6 elevation-2 border">
          <div class="py-1 px-4 d-flex justify-space-between align-center rounded-t-lg text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 38px;">
            <div class="d-flex align-center">
              <v-icon class="mr-2" color="white" size="20">mdi-chart-box-outline</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Live Dashboard Mesin</span>
            </div>
            <div class="d-flex align-center gap-2 flex-wrap">
              <v-btn style="background-color: #d97706 !important; color: #ffffff !important;" variant="flat" size="small" prepend-icon="mdi-auto-fix" class="font-weight-bold elevation-1" @click="handleAutoBalance" :loading="isAutoBalancing">
                Auto Simulation
              </v-btn>
              <v-btn
                v-if="hasRunAutoBalance"
                style="background-color: #0284c7 !important; color: #ffffff !important;"
                variant="flat"
                size="small"
                prepend-icon="mdi-information-outline"
                class="font-weight-bold elevation-1"
                @click="openBalancingExplanationModal"
              >
                Alasan Balancing Mesin
              </v-btn>
              <v-btn
                style="background-color: #334155 !important; color: #ffffff !important;"
                variant="flat"
                size="small"
                prepend-icon="mdi-history"
                class="font-weight-bold elevation-1"
                @click="isMovementHistoryOpen = true"
              >
                Riwayat Perpindahan
              </v-btn>
              <v-btn style="background-color: #7e22ce !important; color: #ffffff !important;" variant="flat" size="small" prepend-icon="mdi-clock-outline" class="font-weight-bold elevation-1" @click="handleCalculateProductionTimes" :loading="isCalculatingTimes">
                Kalkulasi Jam Produksi
              </v-btn>
              <v-btn style="background-color: #f8fafc !important; color: #1e293b !important;" variant="flat" size="small" @click="cancelProgress" :loading="store.createLoading" class="font-weight-bold elevation-1">Batal & Hapus Progress</v-btn>
              <v-btn style="background-color: #15803d !important; color: #ffffff !important;" variant="flat" size="small" class="font-weight-bold elevation-1" @click="cancel">Selesai (Kembali ke Daftar)</v-btn>
            </div>
          </div>
          
          <v-card-text class="pa-5">
            <div v-if="createLoading" class="d-flex justify-center align-center py-10">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            </div>
          
          <div v-else>
            <!-- EXPORT CONTAINER (Captured for PNG/PDF) -->
            <div ref="summaryExportArea" class="bg-white rounded-xl pa-1">
              <!-- Chart Container -->
              <v-card class="mb-4 elevation-1 pa-3 border">
                 <div ref="chartContainer" style="width: 100%; height: 400px;"></div>
              </v-card>

              <!-- Table Summary -->
              <v-card class="mb-4 elevation-1 border rounded-lg overflow-hidden">
              <div class="py-1.5 px-4 d-flex align-center rounded-t-lg text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 42px;">
                <v-icon class="mr-2" color="white" size="20">mdi-table</v-icon>
                <span class="text-subtitle-1 font-weight-bold">Summary Table</span>
              </div>
              <div class="overflow-x-auto">
                <v-table density="compact" class="custom-table text-body-2" style="white-space: nowrap;">
                <thead>
                  <tr style="background-color: #eef2f7;">
                    <th class="text-left font-weight-bold" style="min-width: 150px; position: sticky; left: 0px; z-index: 6; background-color: #eef2f7 !important; border-right: 2px solid #94a3b8 !important;">Parameter</th>
                    <th v-for="m in summaryData" :key="'head'+m.machine" class="text-center font-weight-bold">{{ m.machine }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #d50000;"></span>
                        <span>Downtime (Jam)</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'downtime'+m.machine" class="text-center">{{ m.downtime }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #fbc02d;"></span>
                        <span>T/C (Jam)</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'tc'+m.machine" class="text-center">{{ Number(m.tip_change ?? m.tc ?? 0).toFixed(2) }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #00a2ff;"></span>
                        <span>Dandori (Jam)</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'dandori'+m.machine" class="text-center">{{ m.dandori }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #800080;"></span>
                        <span>Teiryo (Jam)</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'teiryo'+m.machine" class="text-center">{{ m.teiryo !== undefined ? m.teiryo : '0.00' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center">
                          <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #005db9;"></span>
                          <span>Weld Time (Jam)</span>
                        </div>
                        <v-icon size="14" color="primary" class="ml-1" title="Klik pada nilai mesin untuk adjust">mdi-pencil-outline</v-icon>
                      </div>
                    </td>
                    <td
                      v-for="m in summaryData"
                      :key="'weld'+m.machine"
                      class="text-center cursor-pointer hover-adjust-cell"
                      @click="openAdjustDialog(m)"
                      title="Klik untuk adjust Prod / Weld Time"
                    >
                      <div class="d-flex align-center justify-center">
                        <span class="font-weight-bold" :class="{'text-amber-darken-4': Number(m.prod_time_adjust || 0) !== 0}">
                          {{ getWeldTime(m).toFixed(1) }}
                        </span>
                        <v-chip v-if="Number(m.prod_time_adjust || 0) !== 0" size="x-small" color="warning" density="compact" class="ml-1 px-1 font-weight-bold" style="font-size: 9.5px; height: 18px;">
                          {{ Number(m.prod_time_adjust) > 0 ? '+' : '' }}{{ Number(m.prod_time_adjust).toFixed(1) }}
                        </v-chip>
                        <v-icon size="12" class="ml-1 text-grey edit-icon-hint">mdi-pencil</v-icon>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4 text-primary" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background: linear-gradient(135deg, #005db9, #00a2ff, #d50000);"></span>
                        <span>Hour/Day (TPT)</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'tpt'+m.machine" class="text-center text-primary font-weight-bold">{{ Number(m.tpt || 0).toFixed(1) }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block rounded-circle mr-2 flex-shrink-0" style="width: 7px; height: 7px; background-color: #000000;"></span>
                        <span>UPH</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'uph'+m.machine" class="text-center">{{ m.uph }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #1a237e;"></span>
                        <span>WT 1 SHIFT</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'wt1'+m.machine" class="text-center">{{ m.wt_1_shift || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #f44336;"></span>
                        <span>WT 1 SHIFT + PJK</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'wt1pjk'+m.machine" class="text-center">{{ m.wt_1_shift_pjk || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #1a237e;"></span>
                        <span>WT 2 SHIFT</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'wt2'+m.machine" class="text-center">{{ m.wt_2_shift || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #f44336;"></span>
                        <span>WT 2 SHIFT + PJK 1S</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'wt2pjk1s'+m.machine" class="text-center">{{ m.wt_2_shift_pjk1s !== undefined ? m.wt_2_shift_pjk1s : (m.wt_2_shift_pjk || '-') }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                      <div class="d-flex align-center">
                        <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #f44336;"></span>
                        <span>WT 2 SHIFT + PJK 2S</span>
                      </div>
                    </td>
                    <td v-for="m in summaryData" :key="'wt2pjk2s'+m.machine" class="text-center">{{ m.wt_2_shift_pjk2s !== undefined ? m.wt_2_shift_pjk2s : '-' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">WORKING DAY</td>
                    <td v-for="m in summaryData" :key="'wday'+m.machine" class="text-center">{{ m.working_day !== undefined ? m.working_day : '-' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">MP</td>
                    <td v-for="m in summaryData" :key="'mp'+m.machine" class="text-center">{{ m.mp !== undefined ? m.mp : '-' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">JUMLAH ITEM</td>
                    <td v-for="m in summaryData" :key="'item'+m.machine" class="text-center">{{ m.item !== undefined ? m.item : '-' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card>
          </div>

          <!-- Machine Parts Loader -->
          <v-card class="elevation-1 mt-6 border rounded-lg overflow-hidden">
            <div class="py-1.5 px-4 d-flex align-center rounded-t-lg text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 42px;">
              <v-icon class="mr-2" color="white" size="20">mdi-format-list-checks</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Daftar Part Berdasarkan Mesin</span>
            </div>
            <v-card-text class="pa-4">
              <v-row align="center">
              <v-col cols="12" md="4">
                <v-select
                  v-model="selectedViewMachine"
                  :items="combinedViewMachineOptions"
                  item-title="machine"
                  item-value="machine"
                  label="Pilih Mesin"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @update:model-value="loadMachineParts"
                ></v-select>
              </v-col>
               <v-col cols="12" md="2">
                 <v-btn color="primary" @click="loadMachineParts" :loading="store.machinePartLoading" block prepend-icon="mdi-magnify">
                   Load
                 </v-btn>
               </v-col>
                <v-col cols="12" md="2" v-if="isAnyMachinePartExcelFilterActive">
                  <v-btn color="error" variant="outlined" @click="resetAllMachinePartExcelFilters" block prepend-icon="mdi-filter-off">
                    Reset Filter
                  </v-btn>
                </v-col>
                <v-col cols="12" md="3">
                  <v-btn style="background-color: #334155 !important; color: #ffffff !important;" variant="flat" @click="isMovementHistoryOpen = true" block prepend-icon="mdi-history" class="font-weight-bold">
                    Riwayat Perpindahan
                  </v-btn>
                </v-col>
             </v-row>
 
             <v-divider class="my-4"></v-divider>
             
             <div v-if="store.machinePartLoading" class="text-center py-4">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
             </div>
             <v-table v-else-if="store.machinePartData.length > 0" density="compact" class="custom-table text-body-2 border" fixed-header height="420px">
               <thead>
                 <tr style="background-color: #eef2f7;">
                   <th class="text-center font-weight-bold" style="width: 50px; background: #eef2f7;">No</th>
                   <th
                     v-for="col in machinePartHeaders"
                     :key="col.key"
                     class="text-center text-body-2 font-weight-bold"
                     style="background: #eef2f7;"
                   >
                     <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                       <template v-slot:activator="{ props }">
                         <div v-bind="props" class="header-inner d-flex align-center justify-center cursor-pointer select-none py-1 hover-header">
                           <span :class="{'text-primary font-weight-bold': isMachinePartExcelFilterActive(col.key)}">
                             {{ col.title }}
                           </span>
                           <v-icon size="14" class="ml-1" :color="isMachinePartExcelFilterActive(col.key) || machinePartSortKey === col.key ? 'primary' : 'grey-lighten-1'">
                             {{ machinePartSortKey === col.key ? (machinePartSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                           </v-icon>
                         </div>
                       </template>

                       <v-card width="250" class="pa-2 rounded-lg text-black">
                         <v-list density="compact" class="pa-0">
                           <v-list-item prepend-icon="mdi-sort-ascending" title="Sort A to Z / Ascending" @click="setMachinePartExcelSort(col.key, 'asc')" />
                           <v-list-item prepend-icon="mdi-sort-descending" title="Sort Z to A / Descending" @click="setMachinePartExcelSort(col.key, 'desc')" />
                         </v-list>
                         <v-divider class="my-1" />
                         
                         <v-text-field
                           v-model="machinePartSearchQueries[col.key]"
                           placeholder="Cari nilai..."
                           density="compact"
                           variant="outlined"
                           hide-details
                           prepend-inner-icon="mdi-magnify"
                           clearable
                           class="mb-2"
                         />

                         <div style="max-height: 180px; overflow-y: auto;" class="border rounded pa-1 text-left">
                           <v-checkbox
                             label="(Select All)"
                             density="compact"
                             hide-details
                             :model-value="isAllMachinePartExcelItemsChecked(col.key)"
                             @click="toggleMachinePartExcelSelectAll(col.key)"
                             class="ma-0 pa-0"
                           />
                           <v-checkbox
                             v-for="item in getMachinePartFilteredUniqueItems(col.key)"
                             :key="item"
                             :label="item || '-'"
                             :value="item"
                             v-model="machinePartCheckedFilters[col.key]"
                             density="compact"
                             hide-details
                             class="ma-0 pa-0"
                           />
                         </div>
                         
                         <v-card-actions class="justify-end pa-0 mt-2">
                           <v-btn size="x-small" variant="text" color="grey" @click="clearSingleMachinePartExcelFilter(col.key)">Reset</v-btn>
                         </v-card-actions>
                       </v-card>
                     </v-menu>
                   </th>
                   <th class="text-center font-weight-bold" style="width: 100px; background: #eef2f7;">Aksi</th>
                 </tr>
               </thead>
                               <tbody>
                  <tr v-for="(p, pIdx) in filteredMachinePartData" :key="pIdx">
                    <td class="text-center font-weight-medium">{{ pIdx + 1 }}</td>
                    <td class="text-center">
                      <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
                        {{ p.urutan || (pIdx + 1) }}
                      </v-chip>
                    </td>
                    <td class="font-weight-bold text-primary" style="font-size: 13px;">
                      {{ formatPartNumber(p.part_number) }}
                      <div v-if="(p as any).part_name" class="text-caption text-grey-darken-1 font-weight-regular" style="font-size: 11px;">
                        {{ (p as any).part_name }}
                      </div>
                    </td>
                    <td class="text-center font-weight-bold" style="white-space: nowrap;">
                      <v-chip
                        size="x-small"
                        :color="(p.spec_gun || p.gun_type || getMachineGunSpec(selectedViewMachine)).includes('X&C') ? 'purple-darken-1' : ((p.spec_gun || p.gun_type || getMachineGunSpec(selectedViewMachine)).includes('C') ? 'teal-darken-1' : 'indigo-darken-1')"
                        variant="flat"
                        class="text-white font-weight-bold"
                      >
                        {{ p.spec_gun || p.gun_type || getMachineGunSpec(selectedViewMachine) }}
                      </v-chip>
                    </td>
                    <td class="text-center font-weight-medium">
                      {{ p.job_number || '-' }}
                    </td>
                    <td class="text-center font-weight-bold">
                      {{ formatProcessDisplay(p) }}
                    </td>
                    <td class="text-center">
                      <span v-if="(p as any).time_proc_start" class="font-weight-bold text-blue-grey-darken-3" style="font-size: 12px;">
                        {{ (p as any).time_proc_start }}
                      </span>
                      <span v-else class="text-grey">-</span>
                    </td>
                    <td class="text-center">
                      <span v-if="(p as any).time_proc_end" class="font-weight-bold text-blue-grey-darken-3" style="font-size: 12px;">
                        {{ (p as any).time_proc_end }}
                      </span>
                      <span v-else class="text-grey">-</span>
                    </td>
                    <td class="text-center">
                      <span v-if="(p as any).time_proc_start_shift2" class="font-weight-bold text-indigo-darken-3" style="font-size: 12px;">
                        {{ (p as any).time_proc_start_shift2 }}
                      </span>
                      <span v-else class="text-grey">-</span>
                    </td>
                    <td class="text-center">
                      <span v-if="(p as any).time_proc_end_shift2" class="font-weight-bold text-indigo-darken-3" style="font-size: 12px;">
                        {{ (p as any).time_proc_end_shift2 }}
                      </span>
                      <span v-else class="text-grey">-</span>
                    </td>
                    <td class="text-left font-weight-medium">
                      {{ p.model || 'No Model' }}
                    </td>
                    <td class="text-center">
                      <v-chip v-if="p.machine_prev" size="x-small" variant="flat" color="blue-grey-lighten-4" class="font-weight-bold text-blue-grey-darken-4">
                        {{ p.machine_prev }}
                      </v-chip>
                      <span v-else class="text-grey">-</span>
                    </td>
                    <td class="text-right font-weight-bold text-primary">
                      {{ p.tpt ? Number(p.tpt).toFixed(1) : '0' }}
                    </td>
                    <td class="text-right font-weight-medium">
                      {{ p.qty_kanban || '0' }}
                    </td>
                    <td class="text-right font-weight-medium">
                      {{ p.cycle_time_sec || '0' }}s
                    </td>
                    <td class="text-center font-weight-medium">
                      {{ p.jig || '-' }}
                    </td>
                    <td class="text-right font-weight-medium">
                      {{ p.jumlah_spot ?? '-' }}
                    </td>
                    <td class="text-right font-weight-medium">
                      {{ p.freq_dresser ?? '-' }}
                    </td>
                    <td class="text-right font-weight-medium">
                      {{ p.freq_tip_change ?? '-' }}
                    </td>
                    <td class="text-right font-weight-bold">
                      {{ p.pcs_day ? Number(p.pcs_day).toLocaleString() : '0' }}
                    </td>
                    <td class="text-center font-weight-medium">
                      {{ (p as any).next_process || '-' }}
                    </td>
                    <td class="text-center" style="white-space: nowrap; min-width: 140px;">
                      <v-btn
                        size="small"
                        color="primary"
                        variant="flat"
                        density="compact"
                        class="text-none px-2.5 mr-1.5"
                        @click="openMoveModal(p, p.machine || p.machine_use || selectedViewMachine)"
                      >
                        Pindah
                      </v-btn>
                      <v-btn
                        size="small"
                        color="error"
                        variant="flat"
                        density="compact"
                        class="text-none px-2.5 text-white"
                        @click="openTraceabilityModal(p)"
                        title="Cek alasan teknis penempatan / eliminasi mesin kandidat"
                      >
                        Alasan
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
            </v-table>
            <div v-else class="text-center text-grey py-4">
              Silakan pilih mesin dan klik Adjust untuk melihat part.
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-card-text>
  </v-card>
</v-stepper-window-item>
</v-stepper-window>
</v-stepper>
          

    <!-- Modal Pindah Mesin -->
    <v-dialog v-model="isMoveModalOpen" max-width="1500px" persistent>
      <v-card>
        <v-card-title class="py-1.5 px-4 d-flex justify-space-between align-center text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 42px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="20">mdi-swap-horizontal</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Pindah Mesin (Load Balancing)</span>
          </div>
          <v-btn icon="mdi-close" variant="text" density="compact" color="white" @click="closeMoveModal" :disabled="moveLoading"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-4 pt-2">
          <div v-if="movePartData" class="mb-3 bg-grey-lighten-4 pa-3 rounded border">
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-caption text-grey-darken-1">Part Number / Proses</div>
                <div class="d-flex align-center gap-2">
                  <div class="font-weight-bold text-subtitle-1 text-primary">{{ formatPartNumber(movePartData.part_number) }}</div>
                  <v-chip v-if="(movePartData as any)" color="indigo-darken-1" size="x-small" label class="text-white font-weight-bold">Proses {{ formatProcessDisplay(movePartData) }}</v-chip>
                  <v-chip v-if="movePartData.is_dedicated == 1" color="info" size="x-small" label>Dedicated</v-chip>
                </div>
                <div v-if="movePartData.is_dedicated == 1" class="text-caption text-info mt-1 font-italic">
                  * Part number ini sudah dedicated dengan machine {{ movePartData.dedicated_machine || movePartData.machine_use || 'XX' }} sesuai ketentuan.
                </div>
              </div>
              <div class="text-right">
                <div class="text-caption text-grey-darken-1">Model / Job Number</div>
                <div class="font-weight-medium">{{ movePartData.model || '-' }} / {{ movePartData.job_number || '-' }}</div>
              </div>
            </div>
          </div>

          <!-- Search Input for Machines -->
          <v-text-field
            v-model="searchMachineQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Cari Mesin (Nama, Line, Spesifikasi...)"
            variant="outlined"
            density="compact"
            class="mb-3"
            clearable
            hide-details
            bg-color="white"
          ></v-text-field>

          <!-- Loop per process of the part -->
          <div v-for="(proc, pIdx) in movePartProcesses" :key="'proc-'+pIdx" class="mb-4 border rounded-lg overflow-hidden bg-white elevation-1">
            <div class="py-1.5 px-4 d-flex justify-space-between align-center border-b" style="background-color: #f1f5f9;">
              <span class="font-weight-bold text-subtitle-2 text-slate-800">
                Proses {{ formatProcessDisplay(proc) }} — Mesin Asal: <span class="text-primary font-weight-bold">{{ proc.machine_use }}</span>
              </span>
              <v-chip v-if="proc.selectedTargetMachine" color="success" size="small" variant="flat" class="font-weight-bold text-white">
                Tujuan: {{ proc.selectedTargetMachine }}
              </v-chip>
              <v-chip v-else color="warning" size="small" variant="tonal" class="font-weight-bold">
                Belum Memilih Mesin Tujuan
              </v-chip>
            </div>
            
            <div class="pa-3">
              <v-table density="compact" class="custom-table text-caption matrix-sticky-table" style="white-space: nowrap; border-collapse: separate; border-spacing: 0;" height="650px" fixed-header>
                <thead>
                  <!-- Header Row 1: Machine Groups -->
                  <tr style="text-align: center;">
                    <th class="text-center font-weight-bold text-dark matrix-col-1" style="background-color: #cbd5e1 !important;">Spesifikasi Mesin</th>
                    <th class="text-center font-weight-bold text-dark matrix-col-2" style="background-color: #bbdefb !important;">Mesin Saat Ini</th>
                    <th v-if="getUseRecommendedMachinesForProc(proc).length > 0" :colspan="getUseRecommendedMachinesForProc(proc).length" class="text-center font-weight-bold text-dark" style="background-color: #eef2f7 !important;">Rekomendasi (Mesin Saat Ini)</th>
                    <th v-if="getPrevRecommendedMachinesForProc(proc).length > 0" :colspan="getPrevRecommendedMachinesForProc(proc).length" class="text-center font-weight-bold text-dark" style="background-color: #eef2f7 !important;">Rekomendasi (Mesin Backup)</th>
                    <th v-if="getNonRecommendedMachinesForProc(proc).length > 0" :colspan="getNonRecommendedMachinesForProc(proc).length" class="text-center font-weight-bold text-dark" style="background-color: #eef2f7 !important;">Mesin Lainnya (Spesifikasi Berbeda)</th>
                  </tr>

                  <!-- Header Row 2: Machine Names -->
                  <tr style="text-align: center;">
                    <th class="text-center font-weight-bold text-dark matrix-col-1" style="background-color: #cbd5e1 !important;">Kriteria</th>
                    <!-- Current Machine Column Header -->
                    <th class="text-center font-weight-bold py-2 text-dark matrix-col-2" style="background-color: #bbdefb !important;">
                      <div class="d-flex flex-column align-center justify-center">
                        <span class="text-subtitle-2 font-weight-bold text-primary">{{ proc.machine_use || '-' }}</span>
                        <v-chip size="x-small" color="primary" variant="tonal" density="compact" class="mt-1 font-weight-bold">Mesin Saat Ini</v-chip>
                      </div>
                    </th>
                    <!-- Use Recommended Machines Headers -->
                    <th v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'userec-'+proc.id+'-'+m.machine" class="text-center py-2 text-dark" style="background-color: #eef2f7 !important; min-width: 120px;">
                      <div class="d-flex flex-column align-center justify-center">
                        <span class="text-subtitle-2 font-weight-bold text-info">{{ m.machine }}</span>
                        <v-btn
                          size="x-small"
                          variant="tonal"
                          color="grey-darken-2"
                          density="compact"
                          class="mt-1.5 mb-1.5 text-caption text-none px-2.5"
                          style="height: 22px; font-size: 10.5px;"
                          @click="hiddenMatrixMachines.push(m.machine)"
                          title="Sembunyikan mesin ini"
                        >
                          <v-icon size="12" class="mr-1">mdi-eye-off</v-icon> Sembunyikan
                        </v-btn>
                      </div>
                    </th>
                    <!-- Prev Recommended Machines Headers -->
                    <th v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'prevrec-'+proc.id+'-'+m.machine" class="text-center py-2 text-dark" style="background-color: #eef2f7 !important; min-width: 120px;">
                      <div class="d-flex flex-column align-center justify-center">
                        <span class="text-subtitle-2 font-weight-bold text-success">{{ m.machine }}</span>
                        <v-btn
                          size="x-small"
                          variant="tonal"
                          color="grey-darken-2"
                          density="compact"
                          class="mt-1.5 mb-1.5 text-caption text-none px-2.5"
                          style="height: 22px; font-size: 10.5px;"
                          @click="hiddenMatrixMachines.push(m.machine)"
                          title="Sembunyikan mesin ini"
                        >
                          <v-icon size="12" class="mr-1">mdi-eye-off</v-icon> Sembunyikan
                        </v-btn>
                      </div>
                    </th>
                    <!-- Non-Recommended Machines Headers -->
                    <th v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'nonrec-'+proc.id+'-'+m.machine" class="text-center py-2 text-dark" style="background-color: #eef2f7 !important; min-width: 120px;">
                      <div class="d-flex flex-column align-center justify-center">
                        <span class="text-subtitle-2 font-weight-bold text-grey-darken-2">{{ m.machine }}</span>
                        <v-chip size="x-small" color="grey-darken-1" variant="tonal" density="compact" class="mt-1">Mesin Lainnya</v-chip>
                        <v-btn
                          size="x-small"
                          variant="tonal"
                          color="grey-darken-2"
                          density="compact"
                          class="mt-2.5 mb-1.5 text-caption text-none px-2.5"
                          style="height: 22px; font-size: 10.5px;"
                          @click="hiddenMatrixMachines.push(m.machine)"
                          title="Sembunyikan mesin ini dari matriks perbandingan"
                        >
                          <v-icon size="12" class="mr-1">mdi-eye-off</v-icon> Sembunyikan
                        </v-btn>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <!-- Row: Line -->
                  <tr>
                    <td class="font-weight-bold matrix-col-1" style="background-color: #f1f5f9 !important;">Line</td>
                    <td class="text-center font-weight-bold text-primary matrix-col-2" style="background-color: #e3f2fd !important;">{{ getMachineLine(proc.machine_use) }}</td>
                    <td v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'line-userec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">{{ m.line || m.area || '-' }}</td>
                    <td v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'line-prevrec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">{{ m.line || m.area || '-' }}</td>
                    <td v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'line-nonrec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">{{ m.line || m.area || '-' }}</td>
                  </tr>

                  <!-- Row: Tipe Gun -->
                  <tr>
                    <td class="font-weight-bold matrix-col-1" style="background-color: #f1f5f9 !important;">Tipe Gun</td>
                    <td class="text-center font-weight-bold text-primary matrix-col-2" style="background-color: #e3f2fd !important;">{{ getSourceGunForProc(proc) }}</td>
                    <td v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'gun-userec-'+proc.id+'-'+m.machine" :style="checkGunSpecStyle(proc, m)">
                      {{ m.tipe_gun || m.gun_type || 'GUN X' }}
                    </td>
                    <td v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'gun-prevrec-'+proc.id+'-'+m.machine" :style="checkGunSpecStyle(proc, m)">
                      {{ m.tipe_gun || m.gun_type || 'GUN X' }}
                    </td>
                    <td v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'gun-nonrec-'+proc.id+'-'+m.machine" :style="checkGunSpecStyle(proc, m)">
                      {{ m.tipe_gun || m.gun_type || 'GUN X' }}
                    </td>
                  </tr>

                  <!-- Row: Stroke Dresser -->
                  <tr>
                    <td class="font-weight-bold matrix-col-1" style="background-color: #f1f5f9 !important;">Stroke Dresser</td>
                    <td class="text-center font-weight-bold text-primary matrix-col-2" style="background-color: #e3f2fd !important;">{{ getMachineDetails(proc.machine_use)?.stroke_dress || 350 }} stroke</td>
                    <td v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'sd-userec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">
                      {{ m.stroke_dress || 350 }} stroke
                    </td>
                    <td v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'sd-prevrec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">
                      {{ m.stroke_dress || 350 }} stroke
                    </td>
                    <td v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'sd-nonrec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">
                      {{ m.stroke_dress || 350 }} stroke
                    </td>
                  </tr>

                  <!-- Row: Dress per Tip Change -->
                  <tr>
                    <td class="font-weight-bold matrix-col-1" style="background-color: #f1f5f9 !important;">Dress / Tip Change</td>
                    <td class="text-center font-weight-bold text-primary matrix-col-2" style="background-color: #e3f2fd !important;">{{ getMachineDetails(proc.machine_use)?.dress_tip_change || 2450 }} dress</td>
                    <td v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'dtc-userec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">
                      {{ m.dress_tip_change || 2450 }} dress
                    </td>
                    <td v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'dtc-prevrec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">
                      {{ m.dress_tip_change || 2450 }} dress
                    </td>
                    <td v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'dtc-nonrec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">
                      {{ m.dress_tip_change || 2450 }} dress
                    </td>
                  </tr>

                  <!-- Row: Downtime -->
                  <tr>
                    <td class="font-weight-bold matrix-col-1" style="background-color: #f1f5f9 !important;">Downtime Mesin</td>
                    <td class="text-center font-weight-bold text-primary matrix-col-2" style="background-color: #e3f2fd !important;">{{ (getMachineDetails(proc.machine_use)?.downtime_min !== undefined ? getMachineDetails(proc.machine_use)?.downtime_min : 0.38) }} Jam</td>
                    <td v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'dt-userec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">
                      {{ (m.downtime_min !== undefined ? m.downtime_min : 0.38) }} Jam
                    </td>
                    <td v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'dt-prevrec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">
                      {{ (m.downtime_min !== undefined ? m.downtime_min : 0.38) }} Jam
                    </td>
                    <td v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'dt-nonrec-'+proc.id+'-'+m.machine" class="text-center font-weight-medium" style="background-color: #f8fafc !important;">
                      {{ (m.downtime_min !== undefined ? m.downtime_min : 0.38) }} Jam
                    </td>
                  </tr>

                  <!-- Row: TPT Saat Ini -->
                  <tr>
                    <td class="font-weight-bold matrix-col-1" style="background-color: #f1f5f9 !important;">TPT Saat Ini</td>
                    <td class="text-center font-weight-bold text-primary matrix-col-2" style="background-color: #e3f2fd !important;">
                      {{ getMachineTpt(proc.machine_use) }}
                    </td>
                    <td v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'tpt-userec-'+proc.id+'-'+m.machine" class="text-center font-weight-bold text-info" style="background-color: #f8fafc !important;">
                      {{ getMachineTpt(m.machine) }}
                    </td>
                    <td v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'tpt-prevrec-'+proc.id+'-'+m.machine" class="text-center font-weight-bold text-success" style="background-color: #f8fafc !important;">
                      {{ getMachineTpt(m.machine) }}
                    </td>
                    <td v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'tpt-nonrec-'+proc.id+'-'+m.machine" class="text-center font-weight-bold text-grey-darken-1" style="background-color: #f8fafc !important;">
                      {{ getMachineTpt(m.machine) }}
                    </td>
                  </tr>

                  <!-- Row: Simulasi TPT Pasca Pindah -->
                  <tr>
                    <td class="font-weight-bold matrix-col-1" style="background-color: #f1f5f9 !important;">TPT Pasca Pindah</td>
                    <td class="text-center font-weight-bold text-primary matrix-col-2" style="background-color: #e3f2fd !important;">
                      -
                    </td>
                    <td v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'simtpt-userec-'+proc.id+'-'+m.machine" :style="checkTptCapacityStyle(proc, m)">
                      {{ getTargetSimulatedTpt(proc, m.machine).toFixed(2) }} Jam
                    </td>
                    <td v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'simtpt-prevrec-'+proc.id+'-'+m.machine" :style="checkTptCapacityStyle(proc, m)">
                      {{ getTargetSimulatedTpt(proc, m.machine).toFixed(2) }} Jam
                    </td>
                    <td v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'simtpt-nonrec-'+proc.id+'-'+m.machine" :style="checkTptCapacityStyle(proc, m)">
                      {{ getTargetSimulatedTpt(proc, m.machine).toFixed(2) }} Jam
                    </td>
                  </tr>

                  <!-- Row: Status Rekomendasi -->
                  <tr>
                    <td class="font-weight-bold matrix-col-1" style="background-color: #f1f5f9 !important;">Status Rekomendasi</td>
                    <td class="text-center font-weight-bold text-primary matrix-col-2" style="background-color: #e3f2fd !important;">
                      <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">Mesin Asal</v-chip>
                    </td>
                    <td v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'stat-userec-'+proc.id+'-'+m.machine" :style="checkOverallStatusStyle(proc, m)">
                      <span v-if="checkSubAssyRecommendation(proc, m.machine).isRecommended" class="font-weight-bold">REKOMENDASI</span>
                      <span v-else class="font-weight-bold">TIDAK REKOMENDASI</span>
                    </td>
                    <td v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'stat-prevrec-'+proc.id+'-'+m.machine" :style="checkOverallStatusStyle(proc, m)">
                      <span v-if="checkSubAssyRecommendation(proc, m.machine).isRecommended" class="font-weight-bold">REKOMENDASI</span>
                      <span v-else class="font-weight-bold">TIDAK REKOMENDASI</span>
                    </td>
                    <td v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'stat-nonrec-'+proc.id+'-'+m.machine" :style="checkOverallStatusStyle(proc, m)">
                      <span v-if="checkSubAssyRecommendation(proc, m.machine).isRecommended" class="font-weight-bold">REKOMENDASI</span>
                      <span v-else class="font-weight-bold">TIDAK REKOMENDASI</span>
                    </td>
                  </tr>

                  <!-- Row: Action / Pilih -->
                  <tr style="background-color: #f8fafc;">
                    <td class="font-weight-bold bg-grey-lighten-3 text-center matrix-col-1" style="background-color: #e2e8f0 !important;">Pilih Mesin</td>
                    <!-- Current Machine -->
                    <td class="text-center matrix-col-2" style="background-color: #f8fafc !important;">
                      <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">Mesin Saat Ini</v-chip>
                    </td>
                    <!-- Use Recommended Machines selection -->
                    <td v-for="m in getUseRecommendedMachinesForProc(proc)" :key="'act-userec-'+proc.id+'-'+m.machine" class="text-center">
                      <v-btn
                        size="small"
                        :color="proc.selectedTargetMachine === m.machine ? 'success' : 'primary'"
                        :variant="proc.selectedTargetMachine === m.machine ? 'flat' : 'outlined'"
                        class="px-3"
                        @click="proc.selectedTargetMachine = m.machine"
                      >
                        <v-icon v-if="proc.selectedTargetMachine === m.machine" size="14" class="mr-1">mdi-check</v-icon>
                        {{ proc.selectedTargetMachine === m.machine ? 'Terpilih' : 'Pilih' }}
                      </v-btn>
                    </td>
                    <!-- Prev Recommended Machines selection -->
                    <td v-for="m in getPrevRecommendedMachinesForProc(proc)" :key="'act-prevrec-'+proc.id+'-'+m.machine" class="text-center">
                      <v-btn
                        size="small"
                        :color="proc.selectedTargetMachine === m.machine ? 'success' : 'primary'"
                        :variant="proc.selectedTargetMachine === m.machine ? 'flat' : 'outlined'"
                        class="px-3"
                        @click="proc.selectedTargetMachine = m.machine"
                      >
                        <v-icon v-if="proc.selectedTargetMachine === m.machine" size="14" class="mr-1">mdi-check</v-icon>
                        {{ proc.selectedTargetMachine === m.machine ? 'Terpilih' : 'Pilih' }}
                      </v-btn>
                    </td>
                    <!-- Non-Recommended Machines selection -->
                    <td v-for="m in getNonRecommendedMachinesForProc(proc)" :key="'act-nonrec-'+proc.id+'-'+m.machine" class="text-center">
                      <v-btn
                        size="small"
                        :color="proc.selectedTargetMachine === m.machine ? 'warning' : 'grey-darken-1'"
                        :variant="proc.selectedTargetMachine === m.machine ? 'flat' : 'outlined'"
                        class="px-3"
                        @click="confirmSelectNonRecommendedForProc(proc, m.machine)"
                        title="Mesin ini tidak direkomendasikan secara spesifikasi"
                      >
                        <v-icon v-if="proc.selectedTargetMachine === m.machine" size="14" class="mr-1">mdi-check</v-icon>
                        {{ proc.selectedTargetMachine === m.machine ? 'Terpilih' : 'Pilih' }}
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
        </v-card-text>
        
        <v-card-actions class="pa-4 bg-grey-lighten-4 border-top">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="closeMoveModal" :disabled="moveLoading">Batal</v-btn>
          <v-btn color="primary" variant="flat" @click="submitMovePart" :loading="moveLoading" prepend-icon="mdi-swap-horizontal" :disabled="isSubmitMoveDisabled">Pindahkan Part</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Formula Info Modal -->
    <v-dialog v-model="isFormulaModalOpen" max-width="500">
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white d-flex align-center py-3">
          <v-icon class="mr-2">mdi-calculator</v-icon>
          Rumus: {{ formulaInfo.title }}
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="isFormulaModalOpen = false"></v-btn>
        </v-card-title>
        <v-card-text class="pa-5">
          <div class="mb-4">
            <div class="text-caption text-grey-darken-1 mb-1">Formula</div>
            <div class="bg-grey-lighten-4 pa-3 rounded text-subtitle-1 font-weight-medium text-center border">
              {{ formulaInfo.formula }}
            </div>
          </div>
          <div>
            <div class="text-caption text-grey-darken-1 mb-1">Keterangan</div>
            <div class="text-body-2" style="white-space: pre-line;">
              {{ formulaInfo.desc }}
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 border-top">
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" @click="isFormulaModalOpen = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Detail Asal-Usul Pcs/Day -->
    <v-dialog v-model="isPcsDayDetailModalOpen" max-width="700px">
      <v-card class="rounded-lg overflow-hidden">
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center pa-4">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white">mdi-information-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Detail Asal-Usul Pcs/Day (Breakdown Part Delivery / Parent)</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="isPcsDayDetailModalOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-5">
          <div v-if="pcsDayDetailData" class="mb-4 bg-grey-lighten-4 pa-3 rounded border">
            <v-row density="compact">
              <v-col cols="12" sm="4">
                <div class="text-caption text-grey-darken-1">Part Number</div>
                <div class="font-weight-bold text-subtitle-1 text-primary">{{ formatPartNumber(pcsDayDetailData.part_number) }}</div>
              </v-col>
              <v-col cols="12" sm="4">
                <div class="text-caption text-grey-darken-1">Part Name / Model</div>
                <div class="font-weight-medium">{{ pcsDayDetailData.part_name }} ({{ pcsDayDetailData.model }})</div>
              </v-col>
              <v-col cols="12" sm="4">
                <div class="text-caption text-grey-darken-1">Periode Pcs/Day</div>
                <div class="font-weight-bold text-teal-darken-2">{{ formatPcsDayPeriod(pcsDayDetailData.spmon) }}</div>
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

    <!-- Dialog Preview & Kustomisasi Auto Simulation -->
    <v-dialog v-model="isAutoBalanceModalOpen" max-width="1780px" width="98vw" scrollable persistent>
      <v-card class="rounded-lg">
        <v-card-title class="py-1 px-4 d-flex justify-space-between align-center text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 40px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="18">mdi-swap-horizontal</v-icon>
            <span class="text-subtitle-2 font-weight-bold">Pindah Mesin (Auto Balancing)</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" density="compact" size="small" @click="isAutoBalanceModalOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-2">
          <v-alert type="info" variant="tonal" class="mb-2 py-1 px-2.5" density="compact" style="font-size: 11px; line-height: 1.3;">
            <strong>Sistem telah menghitung rekomendasi penyeimbangan beban (TPT).</strong>
            Pilih strategi balancing yang diinginkan, tinjau usulan pemindahan, sesuaikan centang atau mesin target sebelum menerapkannya.
          </v-alert>

          <!-- CARD PILIHAN FOKUS PROGRAM -->
          <v-card class="mb-2.5 rounded border bg-white elevation-1 pa-2.5" style="border-top: 3px solid rgb(3, 69, 161) !important;">
            <div class="d-flex flex-wrap align-center justify-space-between ga-2">
              <div class="d-flex align-center ga-2 flex-wrap">
                <span class="text-caption font-weight-bold text-slate-800 d-flex align-center">
                  <v-icon size="16" color="primary" class="mr-1">mdi-tune-variant</v-icon>
                  Fokus Program:
                </span>
                <v-btn-toggle
                  v-model="selectedBalancingMode"
                  mandatory
                  density="compact"
                  color="primary"
                  variant="elevated"
                  divided
                  :disabled="isSwitchingBalancingMode"
                  @update:model-value="handleBalancingModeChange"
                >
                  <v-btn value="balanced" size="small" class="text-caption font-weight-bold px-3">
                    <v-icon size="15" class="mr-1" color="indigo">mdi-scale-balance</v-icon>
                    Pilihan 1: Pemerataan Beban (Maks. 16 Jam)
                  </v-btn>
                  <v-btn value="shift_target" size="small" class="text-caption font-weight-bold px-3">
                    <v-icon size="15" class="mr-1" color="teal">mdi-target-variant</v-icon>
                    Pilihan 2: Fokus Standar Shift (8, 11, 16 Jam)
                  </v-btn>
                </v-btn-toggle>
                <v-progress-circular v-if="isSwitchingBalancingMode" indeterminate size="16" width="2" color="primary"></v-progress-circular>
              </div>
              <div class="text-caption text-grey-darken-2" style="font-size: 11px;">
                {{ selectedBalancingMode === 'shift_target' 
                  ? 'Fokus utama mendekatkan seluruh robot ke patokan jam kerja ideal & lembur (8, 11, 16 jam), mereduksi robot beban nanggung (13-14 jam) menuju 11 jam dan mengalihkan kelebihannya ke robot lain (maksimal 16 jam).' 
                  : 'Fokus utama menurunkan beban robot overload dan meratakannya ke robot berkapasitas aman (maksimal 16 jam).' }}
              </div>
            </div>
          </v-card>

          <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-2 bg-grey-lighten-4 pa-2 rounded border">
            <!-- Search & Filters -->
            <div class="d-flex flex-wrap align-center ga-1.5 flex-grow-1">
              <v-text-field
                v-model="autoBalanceSearch"
                density="compact"
                variant="outlined"
                bg-color="white"
                prepend-inner-icon="mdi-magnify"
                placeholder="Cari Part / Job / Robot / Alasan..."
                hide-details
                style="max-width: 260px; min-width: 180px;"
                class="text-caption dense-input"
                clearable
              ></v-text-field>

              <v-select
                v-model="autoBalanceFilterMachineUse"
                :items="autoBalanceMachineUseOptions"
                density="compact"
                variant="outlined"
                bg-color="white"
                placeholder="Semua Robot Saat Ini"
                label="Robot Saat Ini"
                hide-details
                style="max-width: 155px;"
                class="dense-input"
                clearable
              ></v-select>

              <v-select
                v-model="autoBalanceFilterMachineTarget"
                :items="autoBalanceMachineTargetOptions"
                density="compact"
                variant="outlined"
                bg-color="white"
                placeholder="Semua Robot Final"
                label="Robot Final"
                hide-details
                style="max-width: 155px;"
                class="dense-input"
                clearable
              ></v-select>

              <v-btn
                color="success"
                variant="flat"
                density="compact"
                prepend-icon="mdi-file-excel"
                class="font-weight-bold text-caption ml-2"
                @click="exportAutoBalanceToExcel"
              >
                Excel
              </v-btn>
            </div>

            <!-- Stats & Select All -->
            <div class="d-flex align-center ga-1.5">
              <span class="bg-blue-lighten-5 text-primary font-weight-bold px-1.5 py-0.5 rounded border border-blue-lighten-3" style="font-size: 11px;">
                Total: {{ filteredAutoBalanceMoves.length }} / {{ proposedAutoBalanceMoves.length }} Part
              </span>
              <span class="bg-green-lighten-5 text-teal-darken-3 font-weight-bold px-1.5 py-0.5 rounded border border-green-lighten-3" style="font-size: 11px;">
                Dicentang: {{ filteredAutoBalanceMoves.filter((m: any) => m.checked).length }}
              </span>
              <v-checkbox
                v-model="isAllAutoBalanceSelected"
                label="Pilih Semua"
                density="compact"
                hide-details
                color="primary"
                class="font-weight-bold ml-1"
                style="font-size: 11px;"
              ></v-checkbox>
            </div>
          </div>

          <div class="overflow-x-auto">
            <v-table density="compact" class="custom-table auto-balance-table text-caption border rounded elevation-1" style="white-space: nowrap;" height="560px" fixed-header>
              <thead>
                <!-- Header Row 1: Machine Groups -->
                <tr style="text-align: center;">
                  <th colspan="3" class="text-center font-weight-bold text-dark" style="background-color: #cbd5e1 !important; font-size: 10.5px; padding: 2px 2px !important;">Info Part &amp; Proses</th>
                  <th colspan="7" class="text-center font-weight-bold text-dark" style="background-color: #bbdefb !important; font-size: 10.5px; padding: 2px 2px !important;">Robot Saat Ini</th>
                  <th rowspan="2" class="text-center font-weight-bold text-dark" style="background-color: #eef2f7 !important; width: 90px; min-width: 85px; vertical-align: middle; padding: 2px 2px !important;" @click="toggleAutoBalanceSort('machine_use_recommended')">
                    <div class="d-flex align-center justify-center ga-1 cursor-pointer select-none">
                      <span>Rekomendasi</span>
                      <v-icon size="12" :color="autoBalanceSortKey === 'machine_use_recommended' ? 'purple-darken-3' : 'grey'">
                        {{ autoBalanceSortKey === 'machine_use_recommended' ? (autoBalanceSortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-sort' }}
                      </v-icon>
                    </div>
                  </th>
                  <th colspan="8" class="text-center font-weight-bold" style="background-color: #d1e7dd !important; color: #0f5132 !important; font-size: 10.5px; padding: 2px 2px !important;">Robot Final (Target)</th>
                  <th rowspan="2" class="text-left font-weight-bold text-dark" style="background-color: #f1f5f9 !important; width: 140px; min-width: 120px; max-width: 180px; vertical-align: middle; padding: 2px 3px !important;" @click="toggleAutoBalanceSort('reason')">
                    <div class="d-flex align-center justify-space-between cursor-pointer select-none">
                      <span>Alasan Pemilihan &amp; Analisis</span>
                      <v-icon size="12" :color="autoBalanceSortKey === 'reason' ? 'primary' : 'grey'">
                        {{ autoBalanceSortKey === 'reason' ? (autoBalanceSortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-sort' }}
                      </v-icon>
                    </div>
                  </th>
                </tr>

                <!-- Header Row 2: Sub-columns -->
                <tr style="text-align: center; font-size: 10px;">
                  <!-- Info Part & Proses Subheaders -->
                  <th class="text-center font-weight-bold text-dark" style="width: 32px; min-width: 32px; background-color: #cbd5e1 !important; border-bottom: 2px solid #64748b; padding: 1px !important;">
                    Pilih
                  </th>
                  <th class="text-left font-weight-bold text-dark cursor-pointer select-none" style="width: 135px; min-width: 130px; background-color: #cbd5e1 !important; border-bottom: 2px solid #64748b; padding: 2px 3px !important;" @click="toggleAutoBalanceSort('part_number')">
                    <div class="d-flex align-center justify-space-between">
                      <span>Part Number</span>
                      <v-icon size="12" :color="autoBalanceSortKey === 'part_number' ? 'primary' : 'grey'">
                        {{ autoBalanceSortKey === 'part_number' ? (autoBalanceSortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-sort' }}
                      </v-icon>
                    </div>
                  </th>
                  <th class="text-center font-weight-bold text-dark cursor-pointer select-none" style="width: 80px; min-width: 75px; background-color: #cbd5e1 !important; border-bottom: 2px solid #64748b; padding: 2px 3px !important;">
                    <span>Spec Gun</span>
                  </th>

                  <!-- Robot Saat Ini Subheaders -->
                  <th class="text-center font-weight-bold bg-blue-lighten-5 text-indigo-darken-4 cursor-pointer select-none" style="width: 50px; min-width: 48px; border-bottom: 2px solid #64748b; padding: 2px !important;" @click="toggleAutoBalanceSort('machine_use')">
                    <div class="d-flex align-center justify-center ga-1">
                      <span>Robot</span>
                      <v-icon size="12" :color="autoBalanceSortKey === 'machine_use' ? 'primary' : 'grey'">
                        {{ autoBalanceSortKey === 'machine_use' ? (autoBalanceSortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-sort' }}
                      </v-icon>
                    </div>
                  </th>
                  <th class="text-center font-weight-bold bg-blue-lighten-5 text-indigo-darken-3" style="width: 90px; min-width: 85px; border-bottom: 2px solid #64748b; padding: 2px !important;">Line</th>
                  <th class="text-center font-weight-bold bg-blue-lighten-5 text-indigo-darken-3" style="width: 75px; min-width: 70px; border-bottom: 2px solid #64748b; padding: 2px !important;">Tipe Gun</th>
                  <th class="text-center font-weight-bold bg-blue-lighten-5 text-indigo-darken-3" style="width: 65px; min-width: 60px; border-bottom: 2px solid #64748b; padding: 2px !important;">Stroke</th>
                  <th class="text-center font-weight-bold bg-blue-lighten-5 text-indigo-darken-3" style="width: 65px; min-width: 60px; border-bottom: 2px solid #64748b; padding: 2px !important;">Dress/TC</th>
                  <th class="text-center font-weight-bold bg-blue-lighten-5 text-indigo-darken-3" style="width: 65px; min-width: 60px; border-bottom: 2px solid #64748b; padding: 2px !important;">Downtime</th>
                  <th class="text-center font-weight-bold bg-blue-lighten-5 text-indigo-darken-3" style="width: 75px; min-width: 70px; border-bottom: 2px solid #64748b; padding: 2px !important;">TPT</th>

                  <!-- Robot Final (Target) Subheaders -->
                  <th class="text-center font-weight-bold bg-green-lighten-5 text-teal-darken-4 cursor-pointer select-none" style="width: 95px; min-width: 90px; border-bottom: 2px solid #64748b; padding: 2px !important;" @click="toggleAutoBalanceSort('selected_target')">
                    <div class="d-flex align-center justify-center ga-1">
                      <span>Target Robot</span>
                      <v-icon size="12" :color="autoBalanceSortKey === 'selected_target' ? 'teal-darken-4' : 'grey'">
                        {{ autoBalanceSortKey === 'selected_target' ? (autoBalanceSortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-sort' }}
                      </v-icon>
                    </div>
                  </th>
                  <th class="text-center font-weight-bold bg-green-lighten-5 text-teal-darken-4" style="width: 90px; min-width: 85px; border-bottom: 2px solid #64748b; padding: 2px !important;">Line</th>
                  <th class="text-center font-weight-bold bg-green-lighten-5 text-teal-darken-4" style="width: 75px; min-width: 70px; border-bottom: 2px solid #64748b; padding: 2px !important;">Tipe Gun</th>
                  <th class="text-center font-weight-bold bg-green-lighten-5 text-teal-darken-4" style="width: 65px; min-width: 60px; border-bottom: 2px solid #64748b; padding: 2px !important;">Stroke</th>
                  <th class="text-center font-weight-bold bg-green-lighten-5 text-teal-darken-4" style="width: 65px; min-width: 60px; border-bottom: 2px solid #64748b; padding: 2px !important;">Dress/TC</th>
                  <th class="text-center font-weight-bold bg-green-lighten-5 text-teal-darken-4" style="width: 65px; min-width: 60px; border-bottom: 2px solid #64748b; padding: 2px !important;">Downtime</th>
                  <th class="text-center font-weight-bold bg-green-lighten-5 text-teal-darken-4" style="width: 85px; min-width: 80px; border-bottom: 2px solid #64748b; padding: 2px !important;">TPT Baru</th>
                  <th class="text-center font-weight-bold bg-green-lighten-5 text-teal-darken-4" style="width: 110px; min-width: 100px; border-bottom: 2px solid #64748b; padding: 2px !important;">Status Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredAutoBalanceMoves.length === 0">
                  <td colspan="20" class="text-center py-5 text-grey">
                    <v-icon size="28" color="grey-lighten-1" class="mb-1">mdi-filter-off-outline</v-icon>
                    <div>Tidak ada data yang cocok dengan pencarian / filter.</div>
                  </td>
                </tr>
                <tr
                  v-for="(m, idx) in filteredAutoBalanceMoves"
                  :key="idx"
                  :class="m.checked ? '' : 'bg-grey-lighten-4 text-grey'"
                  :style="idx > 0 && m.part_number !== filteredAutoBalanceMoves[idx - 1].part_number ? 'border-top: 2px solid #94a3b8 !important;' : ''"
                >
                  <!-- Checkbox -->
                  <td class="text-center" style="padding: 1px !important; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    <v-checkbox v-model="m.checked" density="compact" hide-details color="primary" class="d-inline-flex"></v-checkbox>
                  </td>

                  <!-- Part Number / Info -->
                  <td class="text-left" style="padding: 2px 4px !important; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    <div class="font-weight-bold text-black" style="font-size: 11px; line-height: 1.15;">{{ formatPartNumber(m.part_number) }}</div>
                    <div class="text-caption text-grey-darken-2 font-weight-medium" style="font-size: 9.5px; line-height: 1.1;">
                      J: {{ m.job_number || '-' }} | P: {{ formatProcessDisplay(m) }}
                    </div>
                  </td>

                  <!-- Spec Gun Part -->
                  <td class="text-center font-weight-medium" style="padding: 2px 3px !important; border-right: 1.5px solid #cbd5e1; border-bottom: 1px solid #e2e8f0;">
                    <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
                      {{ getSourceGunForProc(m) }}
                    </v-chip>
                  </td>

                  <!-- Robot Saat Ini & Specs -->
                  <td class="text-center font-weight-bold text-primary" style="padding: 1px !important; background-color: #e3f2fd !important; border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; font-size: 11.5px;">
                    {{ m.machine_use || '-' }}
                  </td>
                  <td class="text-center font-weight-medium text-slate-700" style="padding: 1px !important; background-color: #e3f2fd !important; border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; font-size: 10px;">
                    {{ getMachineLine(m.machine_use) }}
                  </td>
                  <td class="text-center font-weight-bold" style="padding: 1px !important; background-color: #e3f2fd !important; border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; font-size: 10px;">
                    <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                      {{ getMachineGunSpec(m.machine_use) }}
                    </v-chip>
                  </td>
                  <td class="text-center font-weight-medium" style="padding: 1px !important; background-color: #e3f2fd !important; border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; font-size: 10px;">
                    {{ getMachineDetails(m.machine_use)?.stroke_dress || 350 }}
                  </td>
                  <td class="text-center font-weight-medium" style="padding: 1px !important; background-color: #e3f2fd !important; border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; font-size: 10px;">
                    {{ getMachineDetails(m.machine_use)?.dress_tip_change || 2450 }}
                  </td>
                  <td class="text-center font-weight-medium" style="padding: 1px !important; background-color: #e3f2fd !important; border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; font-size: 10px;">
                    {{ getMachineDetails(m.machine_use)?.downtime_min !== undefined ? getMachineDetails(m.machine_use)?.downtime_min : '5.17' }} m
                  </td>
                  <td class="text-center font-weight-bold text-indigo-darken-4" style="padding: 1px !important; background-color: #e3f2fd !important; border-right: 1.5px solid #cbd5e1; border-bottom: 1px solid #bfdbfe; font-size: 10.5px;">
                    {{ (summaryData.find((s: any) => s.machine === m.machine_use)?.tpt ? Number(summaryData.find((s: any) => s.machine === m.machine_use)?.tpt).toFixed(1) : '-') }} j
                  </td>

                  <!-- Robot Rekomendasi -->
                  <td class="text-center" style="padding: 1px !important; background-color: #f8fafc !important; border-right: 1.5px solid #cbd5e1; border-bottom: 1px solid #e2e8f0;">
                    <div class="d-flex align-center justify-center ga-1 flex-wrap">
                      <span v-if="getRecommendedMachinesForProc(m).length === 0" class="text-grey font-weight-medium" style="font-size: 10.5px;">-</span>
                      <span
                        v-else
                        v-for="recM in getRecommendedMachinesForProc(m)"
                        :key="recM.machine"
                        class="font-weight-bold text-success px-1 py-0.5 rounded bg-green-lighten-4 border border-green-lighten-2"
                        style="font-size: 10.5px;"
                      >
                        {{ recM.machine }}
                      </span>
                    </div>
                  </td>

                  <!-- Robot Final (Target Dropdown) -->
                  <td class="text-center" style="padding: 1px 2px !important; background-color: #f0fdf4 !important; border-right: 1px solid #bbf7d0; border-bottom: 1px solid #bbf7d0;">
                    <v-select
                      v-model="m.selected_target"
                      :items="getAvailableTargetMachineOptions(m)"
                      density="compact"
                      variant="outlined"
                      bg-color="white"
                      hide-details
                      style="max-width: 90px; min-width: 82px; margin: 0 auto; font-size: 10.5px;"
                      class="font-weight-bold dense-select"
                    ></v-select>
                  </td>

                  <!-- Robot Final Specs with dynamic colors -->
                  <td class="text-center font-weight-medium text-slate-700" style="padding: 1px !important; background-color: #f0fdf4 !important; border-right: 1px solid #bbf7d0; border-bottom: 1px solid #bbf7d0; font-size: 10px;">
                    {{ m.selected_target ? getMachineLine(m.selected_target) : '-' }}
                  </td>
                  <td class="font-weight-bold text-center" :style="m.selected_target ? checkGunSpecStyle(m, { machine: m.selected_target }) : 'background-color: #f8fafc; text-align: center; font-size: 10px; padding: 1px !important; border-right: 1px solid #e2e8f0;'">
                    {{ m.selected_target ? getMachineGunSpec(m.selected_target) : '-' }}
                  </td>
                  <td class="text-center font-weight-medium" style="font-size: 10px; padding: 1px !important; background-color: #f0fdf4 !important; border-right: 1px solid #bbf7d0; border-bottom: 1px solid #bbf7d0;">
                    {{ m.selected_target ? (getMachineDetails(m.selected_target)?.stroke_dress || 350) : '-' }}
                  </td>
                  <td class="text-center font-weight-medium" style="font-size: 10px; padding: 1px !important; background-color: #f0fdf4 !important; border-right: 1px solid #bbf7d0; border-bottom: 1px solid #bbf7d0;">
                    {{ m.selected_target ? (getMachineDetails(m.selected_target)?.dress_tip_change || 2450) : '-' }}
                  </td>
                  <td class="text-center font-weight-medium" style="font-size: 10px; padding: 1px !important; background-color: #f0fdf4 !important; border-right: 1px solid #bbf7d0; border-bottom: 1px solid #bbf7d0;">
                    {{ m.selected_target ? (getMachineDetails(m.selected_target)?.downtime_min !== undefined ? getMachineDetails(m.selected_target)?.downtime_min : '5.17') + ' m' : '-' }}
                  </td>
                  <td class="font-weight-bold text-center" :style="m.selected_target ? checkTptCapacityStyle(m, { machine: m.selected_target }) : 'background-color: #f8fafc; text-align: center; font-size: 10px; padding: 1px !important; border-right: 1px solid #e2e8f0;'">
                    {{ m.selected_target ? getTargetSimulatedTpt(m, m.selected_target) + ' j' : '-' }}
                  </td>
                  <td class="text-center font-weight-bold" style="font-size: 9.5px; padding: 1px 3px !important;" :style="m.selected_target ? checkOverallStatusStyle(m, { machine: m.selected_target }) : 'background-color: #f8fafc; border-right: 1px solid #e2e8f0;'">
                    <v-chip
                      v-if="m.selected_target"
                      size="x-small"
                      :color="checkSubAssyRecommendation(m, m.selected_target).isRecommended ? 'success' : 'error'"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      {{ checkSubAssyRecommendation(m, m.selected_target).isRecommended ? 'Direkomendasikan' : (!checkSubAssyRecommendation(m, m.selected_target).isGunComp ? 'Gun Tidak Cocok' : 'Kapasitas Overload > 16j') }}
                    </v-chip>
                    <span v-else>-</span>
                  </td>

                  <!-- Alasan Pemilihan & Analisis -->
                  <td class="text-left text-grey-darken-3" style="width: 140px; min-width: 120px; max-width: 180px; white-space: normal; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; line-height: 1.2; padding: 2px 4px !important; word-break: break-word;">
                    <span>{{ m.reason || 'Optimalisasi beban robot otomatis' }}</span>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card-text>        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-btn variant="tonal" color="grey-darken-1" @click="isAutoBalanceModalOpen = false">Batal</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="success"
            variant="elevated"
            prepend-icon="mdi-check-bold"
            class="font-weight-bold px-4"
            :loading="isApplyingAutoBalance"
            @click="executeApplyAutoBalance"
          >
            Terapkan Auto Balance
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL ALASAN & DIAGNOSTIK BALANCING MESIN -->
    <v-dialog v-model="isBalancingExplanationModalOpen" max-width="1250px" width="95vw" scrollable>
      <v-card class="rounded-xl overflow-hidden elevation-6">
        <!-- Header: Uniform Dark Blue (#0345a1) -->
        <v-card-title class="py-1.5 px-4 d-flex justify-space-between align-center text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 42px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="20">mdi-clipboard-text-search-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Analisis &amp; Alasan Distribusi Beban Mesin</span>
          </div>
          <v-btn icon="mdi-close" variant="text" density="compact" color="white" @click="isBalancingExplanationModalOpen = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-4 bg-grey-lighten-4">
          <!-- STAT SUMMARY CARDS (Clean Sub Assy Style) -->
          <v-row dense class="mb-3">
            <v-col cols="12" sm="4">
              <v-card
                class="pa-3 rounded-lg border bg-white elevation-1"
                style="border-radius: 10px !important; border-top: 4px solid #0345a1 !important;"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-caption text-grey-darken-2 font-weight-bold">Robot Overload (&gt; 16 Jam)</div>
                    <div class="text-h5 font-weight-black text-grey-darken-4 mt-0.5">{{ diagnosticsStats.overload }} Robot</div>
                  </div>
                  <v-icon size="28" color="error">mdi-alert-octagon-outline</v-icon>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="4">
              <v-card
                class="pa-3 rounded-lg border bg-white elevation-1"
                style="border-radius: 10px !important; border-top: 4px solid #0345a1 !important;"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-caption text-grey-darken-2 font-weight-bold">Robot Low-Load (&lt; 8 Jam)</div>
                    <div class="text-h5 font-weight-black text-grey-darken-4 mt-0.5">{{ diagnosticsStats.underload }} Robot</div>
                  </div>
                  <v-icon size="28" color="warning">mdi-clock-fast</v-icon>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="4">
              <v-card
                class="pa-3 rounded-lg border bg-white elevation-1"
                style="border-radius: 10px !important; border-top: 4px solid #0345a1 !important;"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-caption text-grey-darken-2 font-weight-bold">Robot Standar (8 - 16 Jam)</div>
                    <div class="text-h5 font-weight-black text-grey-darken-4 mt-0.5">{{ diagnosticsStats.normal }} Robot</div>
                  </div>
                  <v-icon size="28" color="success">mdi-check-circle-outline</v-icon>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- SEARCH & COUNT -->
          <div class="d-flex justify-space-between align-center mb-2 px-1">
            <span class="text-caption font-weight-bold text-grey-darken-2">
              Daftar Evaluasi Robot ({{ filteredDiagnostics.length }} Robot)
            </span>
            <v-text-field
              v-model="diagnosticsSearch"
              placeholder="Cari robot, line, tipe gun, alasan..."
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              bg-color="white"
              hide-details
              style="max-width: 320px;"
              clearable
            ></v-text-field>
          </div>

          <!-- TABLE DIAGNOSTIK ROBOT -->
          <v-card class="border rounded-lg bg-white elevation-1 overflow-hidden">
            <div v-if="store.diagnosticsLoading" class="d-flex justify-center align-center py-10">
              <v-progress-circular indeterminate color="primary" size="36"></v-progress-circular>
              <span class="ml-3 text-caption font-weight-bold text-grey-darken-1">Memuat data analisis robot...</span>
            </div>
            <div v-else class="overflow-x-auto">
              <v-table density="compact" class="custom-table text-caption" height="460px" fixed-header style="white-space: normal;">
                <thead>
                  <tr style="background-color: #f1f5f9;">
                    <th class="font-weight-bold text-center" style="width: 110px; min-width: 100px;">Robot &amp; Line</th>
                    <th class="font-weight-bold text-center" style="width: 110px; min-width: 100px;">Beban (TPT)</th>
                    <th class="font-weight-bold text-left" style="width: 190px; min-width: 170px;">Spesifikasi Robot</th>
                    <th class="font-weight-bold text-left" style="min-width: 300px;">Alasan Distribusi Beban</th>
                    <th class="font-weight-bold text-left" style="min-width: 250px;">Saran / Solusi Operasional</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredDiagnostics.length === 0">
                    <td colspan="5" class="text-center py-6 text-grey">Tidak ada data robot yang sesuai filter.</td>
                  </tr>
                  <tr v-for="d in filteredDiagnostics" :key="d.machine">
                    <!-- Robot & Line -->
                    <td class="text-center font-weight-bold">
                      <div class="text-subtitle-2 font-weight-black text-grey-darken-4">{{ d.machine }}</div>
                      <v-chip size="x-small" color="grey-darken-2" variant="tonal" class="mt-0.5 font-weight-medium">{{ d.line || 'ROBOT' }}</v-chip>
                    </td>

                    <!-- Beban TPT -->
                    <td class="text-center">
                      <div class="font-weight-black text-grey-darken-4" style="font-size: 13px;">
                        {{ Number(d.tpt).toFixed(1) }} jam
                      </div>
                      <div class="text-caption text-grey-darken-1 mt-0.5" style="font-size: 10px;">{{ d.parts_count }} Part</div>
                    </td>

                    <!-- Spesifikasi Robot -->
                    <td class="text-caption">
                      <div class="d-flex align-center">
                        <strong>Tipe Gun:</strong>
                        <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold ml-1">
                          {{ d.spec?.gun_type || d.spec?.tipe_gun || 'GUN X' }}
                        </v-chip>
                      </div>
                      <div class="mt-1"><strong>Stroke:</strong> {{ d.spec?.stroke_dress || 350 }} | <strong>Dress/TC:</strong> {{ d.spec?.dress_tip_change || 2450 }}</div>
                      <div><strong>Downtime:</strong> {{ d.spec?.downtime_min !== undefined ? d.spec?.downtime_min : '5.17' }} m</div>
                    </td>

                    <!-- Alasan Distribusi Beban -->
                    <td class="text-caption py-2">
                      <div v-if="d.status === 'overload'">
                        <div class="d-flex align-center gap-1 font-weight-bold mb-1">
                          <v-icon size="15" color="error">mdi-lock-outline</v-icon>
                          <span class="text-grey-darken-4">Mengapa Tidak Dipindah:</span>
                        </div>
                        <div class="text-grey-darken-3" style="line-height: 1.4;">
                          {{ d.why_not_moved }}
                        </div>
                      </div>
                      <div v-else-if="d.status === 'underload'">
                        <div class="d-flex align-center gap-1 font-weight-bold mb-1">
                          <v-icon size="15" color="warning">mdi-minus-circle-outline</v-icon>
                          <span class="text-grey-darken-4">Mengapa Tidak Mendapat Part:</span>
                        </div>
                        <div class="text-grey-darken-3" style="line-height: 1.4;">
                          {{ d.why_not_received }}
                        </div>
                      </div>
                      <div v-else>
                        <div v-if="d.is_ideal" class="d-flex align-center gap-1 font-weight-bold mb-1">
                          <v-icon size="15" color="success">mdi-check-decagram</v-icon>
                          <span class="text-grey-darken-4">Kapasitas Ideal (~{{ d.target_threshold || '8' }} Jam)</span>
                        </div>
                        <div v-else class="d-flex align-center gap-1 font-weight-bold mb-1">
                          <v-icon size="15" color="primary">mdi-scale-balance</v-icon>
                          <span class="text-grey-darken-4">Penyesuaian Beban Diperlukan</span>
                        </div>
                        <div class="text-grey-darken-2" style="line-height: 1.4;">
                          {{ d.why_not_moved }} {{ d.why_not_received }}
                        </div>
                      </div>
                    </td>

                    <!-- Saran / Solusi Operasional -->
                    <td class="text-caption py-2">
                      <div class="d-flex align-start gap-1">
                        <v-icon size="15" color="primary" class="mt-0.5">mdi-lightbulb-outline</v-icon>
                        <span class="text-grey-darken-3" style="line-height: 1.4;">{{ d.recommendation }}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card>

          <!-- ACCORDION PANDUAN ATURAN SELEKSI ROBOT SUB ASSY -->
          <v-expansion-panels class="mt-3" variant="accordion">
            <v-expansion-panel class="border rounded-lg elevation-1">
              <v-expansion-panel-title class="py-2 text-caption font-weight-bold text-primary">
                <v-icon size="16" class="mr-2">mdi-book-open-page-variant-outline</v-icon>
                Panduan Aturan Seleksi Robot Sub Assy (Standar Bisnis Welding GLC)
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-caption text-grey-darken-3">
                <p class="mb-2">Sistem Auto Balancing Sub Assy mengecek kelayakan robot penerima dengan aturan berikut:</p>
                <ol class="pl-4 mb-2">
                  <li><strong>1. Gun Type Compatibility:</strong> Robot penerima harus memiliki spesifikasi Gun yang kompatibel dengan part (Robot <code>GUN X&amp;C</code> dapat memproses part <code>GUN X</code> dan <code>GUN C</code>; Robot <code>GUN X</code> hanya untuk part <code>GUN X</code>; Robot <code>GUN C</code> hanya untuk part <code>GUN C</code>).</li>
                  <li><strong>2. Batas Kapasitas Maksimum 16 Jam:</strong> Beban total TPT robot penerima pasca penambahan part tidak boleh melebihi batas kapasitas aman 16.0 jam (2 Shift kerja standar).</li>
                  <li><strong>3. Standar Shift Kerja:</strong> Target alokasi beban robot diarahkan mendekati batas shift standar (1 Shift: ~8 Jam, 1 Shift + Overtime: ~11 Jam, 2 Shift: ~16 Jam).</li>
                  <li><strong>4. Line Coherence &amp; Bundled Process:</strong> Rangkaian proses dari satu part number (OP10 &amp; OP20) dijaga dalam line yang selaras (ROBOT BARAT / ROBOT TIMUR) demi efisiensi operator dan aliran material.</li>
                </ol>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-card-actions class="bg-white pa-3 border-t d-flex justify-end">
          <v-btn color="primary" variant="flat" size="small" @click="isBalancingExplanationModalOpen = false">Tutup Penjelasan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Pilih Periode Tarik Pcs/Day -->
    <v-dialog v-model="isTarikPcsDayModalOpen" max-width="500px">
      <v-card class="rounded-lg overflow-hidden">
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center py-2 px-4" style="min-height: 40px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="18">mdi-calendar-sync</v-icon>
            <span class="text-subtitle-2 font-weight-bold">Tarik Data Pcs / Day</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" density="compact" size="small" @click="isTarikPcsDayModalOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-5">
          <div class="text-body-2 text-grey-darken-2 mb-4">
            Pilih periode bulan data Pcs/Day (MDFO) yang ingin ditarik dari database master:
          </div>

          <v-select
            v-model="chosenTarikSpmon"
            :items="tarikSpmonOptions"
            item-title="title"
            item-value="value"
            label="Pilih Periode Pcs/Day *"
            variant="outlined"
            density="comfortable"
            bg-color="white"
            hide-details="auto"
            class="mb-3"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :subtitle="item.raw.subtitle"></v-list-item>
            </template>
          </v-select>

          <v-alert type="info" variant="tonal" class="mt-3 text-caption">
            <v-icon size="16" class="mr-1">mdi-information</v-icon>
            Nilai Pcs/Day dari periode terpilih akan memperbarui seluruh item part di Segment 1.
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 border-top justify-end">
          <v-btn variant="outlined" color="grey-darken-1" @click="isTarikPcsDayModalOpen = false">Batal</v-btn>
          <v-btn color="primary" variant="flat" :loading="pcsDayLoading" @click="executeTarikPcsDay">
            <v-icon left class="mr-1">mdi-download</v-icon> Tarik Data
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Data Achievement Actual (Tabel welding_achievement) -->
    <v-dialog v-model="isAchievementModalOpen" max-width="1400px" width="95vw" scrollable>
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="bg-warning text-white d-flex justify-space-between align-center py-2 px-4" style="min-height: 40px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="18">mdi-chart-box-outline</v-icon>
            <span class="text-subtitle-2 font-weight-bold">Data Achievement Actual Welding</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" density="compact" size="small" @click="isAchievementModalOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-4">
          <!-- TOP TOOLBAR: SEARCH & PERIODE & TABS -->
          <div class="d-flex flex-column gap-3 mb-4">
            <div class="d-flex align-center justify-space-between gap-4">
              <v-text-field
                v-model="searchAchievementQuery"
                prepend-inner-icon="mdi-magnify"
                label="Cari Part Number / Job Number / Mesin / Line..."
                variant="outlined"
                density="compact"
                hide-details
                clearable
                style="max-width: 450px;"
              />
              <div class="text-caption text-grey-darken-2 font-weight-medium">
                Agregasi Periode: <span class="text-primary font-weight-bold">{{ achievementPeriodDisplay }}</span>
              </div>
            </div>

            <!-- TABS SEGMENT -->
            <v-tabs v-model="achievementTab" color="warning" density="compact" align-tabs="start">
              <v-tab :value="1" class="text-none font-weight-bold">
                <v-icon class="mr-1" size="small">mdi-check-decagram</v-icon>
                Item Simulasi (Matched)
                <v-chip size="x-small" color="success" class="ml-2">{{ matchedAchievementData.length }}</v-chip>
              </v-tab>
              <v-tab :value="2" class="text-none font-weight-bold">
                <v-icon class="mr-1" size="small">mdi-alert-box-outline</v-icon>
                Part Berjalan di Luar Simulasi
                <v-chip size="x-small" color="error" class="ml-2">{{ unmatchedAchievementData.length }}</v-chip>
              </v-tab>
            </v-tabs>
          </div>

          <div v-if="achievementLoading" class="text-center py-8">
            <v-progress-circular indeterminate color="warning" size="40"></v-progress-circular>
            <div class="text-caption text-grey-darken-1 mt-2">Mencocokkan data achievement aktual dari database...</div>
          </div>

          <div v-else>
            <!-- SEGMENT 1: MATCHED ITEMS (ITEM SIMULASI) -->
            <div v-if="achievementTab === 1">
              <div v-if="filteredMatchedAchievementData.length > 0" style="height: 700px; max-height: 700px; overflow-y: auto;">
                <v-table density="compact" class="border rounded custom-table">
                  <thead>
                    <tr style="background-color: #fff7ed;">
                      <th class="text-center font-weight-bold" style="width: 50px;">No</th>
                      <th class="font-weight-bold">Part Number</th>
                      <th class="font-weight-bold">Job Number</th>
                      <th class="text-center font-weight-bold" style="width: 75px;">Proses</th>
                      <th class="text-center font-weight-bold">Model</th>
                      <th class="text-center font-weight-bold">Line ID / Area</th>
                      <th class="text-center font-weight-bold">Mesin Simulasi</th>
                      <th class="text-center font-weight-bold">Mesin Actual</th>
                      <th class="text-right font-weight-bold">UPH Sim</th>
                      <th class="text-right font-weight-bold">UPH Actual</th>
                      <th class="text-right font-weight-bold">TPT Sim</th>
                      <th class="text-right font-weight-bold">TPT Actual (Jam)</th>
                      <th class="text-right font-weight-bold">Dandori (Mnt)</th>
                      <th class="text-right font-weight-bold">Total DT (Mnt)</th>
                      <th class="text-right font-weight-bold">Lotsize Sim</th>
                      <th class="text-right font-weight-bold">Lotsize Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in filteredMatchedAchievementData" :key="idx">
                      <td class="text-center text-grey-darken-1 font-weight-medium">{{ idx + 1 }}</td>
                      <td class="font-weight-bold text-primary">{{ item.part_number }}</td>
                      <td>{{ item.job_number || '-' }}</td>
                      <td class="text-center">
                        <v-chip size="x-small" color="teal" variant="flat" class="font-weight-bold">
                          {{ item.process ? `OP ${item.process}` : (item.op ? `OP ${item.op}` : '-') }}
                        </v-chip>
                      </td>
                      <td class="text-center font-weight-medium">{{ item.model || '-' }}</td>
                      <td class="text-center">
                        <v-chip size="x-small" color="blue-grey" variant="tonal" class="font-weight-bold">{{ item.line_id || '-' }}</v-chip>
                      </td>
                      <td class="text-center font-weight-bold text-indigo">{{ item.machine_sim || '-' }}</td>
                      <td class="text-center font-weight-bold" :class="item.machine_actual && item.machine_actual !== item.machine_sim ? 'text-warning' : 'text-success'">
                        {{ item.machine_actual || '-' }}
                      </td>
                      <td class="text-right">{{ item.uph_sim || '0' }}</td>
                      <td class="text-right font-weight-bold text-success">{{ item.uph_actual || '0' }}</td>
                      <td class="text-right">{{ item.tpt_sim || '0' }}m</td>
                      <td class="text-right font-weight-medium">{{ item.tpt_actual || '0' }}h</td>
                      <td class="text-right">{{ item.dandori || '0' }}m</td>
                      <td class="text-right text-error font-weight-medium">{{ item.dt_total || '0' }}m</td>
                      <td class="text-right">{{ item.lotsize_sim || '0' }}</td>
                      <td class="text-right font-weight-bold">{{ item.total_lotsize || '0' }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
              <div v-else class="text-center py-8 text-grey">
                <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-alert-circle-outline</v-icon>
                <div>Tidak ada data achievement aktual yang cocok dengan item simulasi ini.</div>
              </div>
            </div>

            <!-- SEGMENT 2: UNMATCHED ITEMS (PART BERJALAN DI LUAR SIMULASI) -->
            <div v-if="achievementTab === 2">
              <div v-if="filteredUnmatchedAchievementData.length > 0" style="height: 700px; max-height: 700px; overflow-y: auto;">
                <v-table density="compact" class="border rounded custom-table">
                  <thead>
                    <tr style="background-color: #fef2f2;">
                      <th class="text-center font-weight-bold" style="width: 50px;">No</th>
                      <th class="font-weight-bold">Part Number</th>
                      <th class="font-weight-bold">Job Number</th>
                      <th class="text-center font-weight-bold">Line ID / Area</th>
                      <th class="text-right font-weight-bold">UPH Actual</th>
                      <th class="text-right font-weight-bold">TPT Actual (Jam)</th>
                      <th class="text-right font-weight-bold">Dandori (Mnt)</th>
                      <th class="text-right font-weight-bold">Total Downtime (Mnt)</th>
                      <th class="text-right font-weight-bold">Total Lotsize Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in filteredUnmatchedAchievementData" :key="idx">
                      <td class="text-center text-grey-darken-1 font-weight-medium">{{ idx + 1 }}</td>
                      <td class="font-weight-bold text-error">{{ item.part_number }}</td>
                      <td>{{ item.job_number || '-' }}</td>
                      <td class="text-center">
                        <v-chip size="x-small" color="purple" variant="tonal" class="font-weight-bold">{{ item.line_id || '-' }}</v-chip>
                      </td>
                      <td class="text-right font-weight-bold text-success">{{ item.uph || '0' }}</td>
                      <td class="text-right font-weight-medium">{{ item.tpt || '0' }}h</td>
                      <td class="text-right">{{ item.dandori || '0' }}m</td>
                      <td class="text-right text-error font-weight-medium">{{ item.dt_total || '0' }}m</td>
                      <td class="text-right font-weight-bold">{{ item.total_lotsize || '0' }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
              <div v-else class="text-center py-8 text-grey">
                <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-check-circle-outline</v-icon>
                <div>Semua part yang berjalan di achievement sudah tercakup di dalam simulasi ini.</div>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 border-top justify-end">
          <v-btn color="primary" variant="flat" @click="isAchievementModalOpen = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Tarik Part No Baru (Area) -->
    <v-dialog v-model="isAddPartModalOpen" max-width="1400px" width="95vw" scrollable>
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="bg-success text-white d-flex justify-space-between align-center py-2 px-4" style="min-height: 40px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="18">mdi-plus-circle</v-icon>
            <span class="text-subtitle-2 font-weight-bold">Tarik Part No Baru (Area {{ createForm.area || 'SUB ASSY' }})</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" density="compact" size="small" @click="isAddPartModalOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-4">
          <div class="mb-4">
            <v-text-field
              v-model="searchPartQuery"
              prepend-inner-icon="mdi-magnify"
              label="Cari Part Number / Job Number / Part Name / Model / Machine..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </div>

          <div v-if="addPartLoading" class="text-center py-8">
            <v-progress-circular indeterminate color="success" size="40"></v-progress-circular>
            <div class="text-caption text-grey-darken-1 mt-2">Memuat kandidat part dari master & menghitung beban proses...</div>
          </div>

          <div v-else-if="filteredCandidateParts.length > 0" style="height: 700px; max-height: 700px; overflow-y: auto; overflow-x: auto;">
            <v-table density="compact" class="border rounded custom-table text-body-2" fixed-header height="700px">
              <thead>
                <tr style="background-color: #eef2f7;">
                  <th class="text-center font-weight-bold" style="width: 44px;">
                    <input type="checkbox" :checked="isAllCandidateSelected" @change="toggleSelectAllCandidates" class="mt-1" />
                  </th>
                  <th class="text-center font-weight-bold" style="width: 44px;">No</th>
                  <th class="text-center font-weight-bold">Area</th>
                  <th class="text-center font-weight-bold">Model</th>
                  <th class="text-left font-weight-bold">Part Number</th>
                  <th class="text-center font-weight-bold">Job Number</th>
                  <th class="text-left font-weight-bold">Part Name</th>
                  <th class="text-center font-weight-bold">Status Part</th>
                  <th class="text-right font-weight-bold">Qty Kanban</th>
                  <th class="text-right font-weight-bold">Pcs / Day Monthly</th>
                  <th class="text-right font-weight-bold">Cycle Time (s)</th>
                  <th class="text-right font-weight-bold">TPT</th>
                  <th class="text-center font-weight-bold">Machine</th>
                  <th class="text-center font-weight-bold">Proses</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in filteredCandidateParts" :key="p.part_number + '-' + (p.process || idx)">
                  <td class="text-center">
                    <v-checkbox
                      v-model="selectedCandidateParts"
                      :value="p"
                      density="compact"
                      hide-details
                    ></v-checkbox>
                  </td>
                  <td class="text-center">{{ idx + 1 }}</td>
                  <td class="text-center font-weight-medium">{{ p.area || '-' }}</td>
                  <td class="text-center font-weight-medium">{{ p.model || '-' }}</td>
                  <td class="font-weight-bold text-primary">{{ p.part_number }}</td>
                  <td class="text-center font-weight-medium">{{ p.job_number || '-' }}</td>
                  <td>{{ p.part_name || '-' }}</td>
                  <td class="text-center font-weight-medium">{{ p.status_part || '-' }}</td>
                  <td class="text-right">{{ p.qty_kanban != null ? Number(p.qty_kanban).toLocaleString('id-ID') : '-' }}</td>
                  <td class="text-right font-weight-bold text-success">{{ p.pcs_day_monthly != null ? Number(p.pcs_day_monthly).toLocaleString('id-ID') : '0' }}</td>
                  <td class="text-right">{{ p.cycle_time_sec != null ? Number(p.cycle_time_sec).toLocaleString('id-ID') + 's' : '-' }}</td>
                  <td class="text-right font-weight-bold text-primary">{{ p.tpt != null ? Number(p.tpt).toFixed(2) : '-' }}</td>
                  <td class="text-center font-weight-bold text-indigo">{{ p.machine || '-' }}</td>
                  <td class="text-center font-weight-medium">{{ p.process || p.op_route || '-' }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div v-else class="text-center py-8 text-grey">
            <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-alert-circle-outline</v-icon>
            <div>Tidak ada part number kandidat {{ createForm.area || 'SUB ASSY' }} baru yang belum masuk ke simulasi ini.</div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 border-top justify-space-between">
          <span class="text-caption text-grey-darken-1 font-weight-medium">
            Terpilih: {{ selectedCandidateParts.length }} baris proses part
          </span>
          <div>
            <v-btn variant="outlined" color="grey-darken-1" class="mr-2" @click="isAddPartModalOpen = false">Batal</v-btn>
            <v-btn color="success" variant="flat" :disabled="selectedCandidateParts.length === 0" @click="addSelectedPartsToSimulation">
              <v-icon left class="mr-1">mdi-plus</v-icon> Tambahkan ke Simulasi
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL ADJUST PROD TIME -->
    <v-dialog v-model="isAdjustDialogOpen" max-width="500px" persistent>
      <v-card class="rounded-xl overflow-hidden elevation-10">
        <div class="py-3 px-5 d-flex align-center justify-space-between text-white" style="background-color: rgb(3, 69, 161) !important;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="22">mdi-clock-edit-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Adjust Prod / Weld Time Mesin {{ adjustMachineData?.machine }}</span>
          </div>
          <v-btn icon size="small" variant="text" color="white" @click="isAdjustDialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" class="mb-4 text-caption">
            Penyesuaian (adjust) akan mempengaruhi nilai <strong>Prod Time (Final)</strong> dan <strong>TPT</strong> untuk mesin <strong>{{ adjustMachineData?.machine }}</strong>. Masukkan nominal dalam satuan <strong>Jam</strong> (bisa desimal, misal <code>+0.5</code> atau <code>-0.25</code>).
          </v-alert>

          <v-row dense class="mb-2">
            <v-col cols="6">
              <div class="text-caption text-grey-darken-1">Prod Time Asli:</div>
              <div class="text-body-1 font-weight-bold text-primary">
                {{ Number(adjustMachineData?.prod_time || 0).toFixed(2) }} Jam
                <span class="text-caption text-grey">({{ (Number(adjustMachineData?.prod_time || 0) * 60).toFixed(0) }} mnt)</span>
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-grey-darken-1">Adjust Saat Ini:</div>
              <div class="text-body-1 font-weight-bold" :class="Number(adjustMachineData?.prod_time_adjust || 0) !== 0 ? 'text-amber-darken-3' : 'text-grey'">
                {{ Number(adjustMachineData?.prod_time_adjust) > 0 ? '+' : '' }}{{ Number(adjustMachineData?.prod_time_adjust || 0).toFixed(2) }} Jam
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-3" />

          <div class="font-weight-bold text-body-2 mb-1">Nominal Adjust (Jam):</div>
          <v-text-field
            v-model="adjustValueInput"
            type="number"
            step="0.1"
            density="compact"
            variant="outlined"
            placeholder="0.00"
            suffix="Jam"
            prepend-inner-icon="mdi-pencil-outline"
            hide-details
            class="mb-4"
          />

          <!-- Live Calculation Preview Card -->
          <v-card variant="tonal" color="primary" class="pa-3 rounded-lg">
            <div class="text-caption font-weight-bold text-primary mb-1">Kalkulasi Hasil Penyesuaian:</div>
            <div class="d-flex justify-space-between align-center text-caption mb-1">
              <span>Prod Time Final:</span>
              <strong class="text-body-2">
                {{ Math.max(0, Number(adjustMachineData?.prod_time || 0) + Number(adjustValueInput || 0)).toFixed(2) }} Jam
              </strong>
            </div>
            <div class="d-flex justify-space-between align-center text-caption">
              <span>TPT Baru (Estimasi):</span>
              <strong class="text-body-2 text-success">
                {{ Math.max(0, Number(adjustMachineData?.prod_time || 0) + Number(adjustValueInput || 0) + Number(adjustMachineData?.dandori || 0) + Number(adjustMachineData?.downtime || 0) + Number(adjustMachineData?.tc ?? adjustMachineData?.tip_change ?? 0.1) + Number(adjustMachineData?.teiryo || 0)).toFixed(2) }} Jam
              </strong>
            </div>
          </v-card>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4 d-flex justify-space-between">
          <v-btn
            color="warning"
            variant="outlined"
            density="comfortable"
            prepend-icon="mdi-refresh"
            :loading="adjustLoading"
            @click="handleResetAdjustment"
            :disabled="Number(adjustMachineData?.prod_time_adjust || 0) === 0 && Number(adjustValueInput || 0) === 0"
          >
            Reset (0)
          </v-btn>
          <div class="d-flex gap-2">
            <v-btn
              color="grey"
              variant="text"
              density="comfortable"
              @click="isAdjustDialogOpen = false"
              :disabled="adjustLoading"
            >
              Batal
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              density="comfortable"
              prepend-icon="mdi-check"
              :loading="adjustLoading"
              @click="handleSaveAdjustment"
            >
              Simpan
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Realtime Diagnostik / Alasan Penempatan Part -->
    <v-dialog v-model="isTraceModalOpen" max-width="950px" scrollable>
      <v-card class="rounded-lg">
        <v-card-title class="py-1 px-4 d-flex justify-space-between align-center text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 40px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="18">mdi-chart-timeline-variant-shimmer</v-icon>
            <span class="text-subtitle-2 font-weight-bold">Diagnostik Alasan Penempatan Part &amp; Evaluasi Mesin</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" density="compact" size="small" @click="isTraceModalOpen = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-3 bg-grey-lighten-5">
          <div v-if="traceLoading" class="text-center py-10">
            <v-progress-circular indeterminate color="primary" size="44"></v-progress-circular>
            <div class="mt-3 text-caption text-grey font-weight-medium">Mengevaluasi 7 syarat spesifikasi terhadap seluruh mesin...</div>
          </div>

          <div v-else-if="traceData && traceData.part_info">
            <!-- Part Header Banner -->
            <div class="pa-3 mb-3 rounded border bg-white" style="border-top: 3px solid rgb(3, 69, 161) !important;">
              <div class="d-flex flex-wrap justify-space-between align-center ga-2">
                <div>
                  <div class="text-caption text-grey-darken-1">Part Number / Proses</div>
                  <div class="d-flex align-center ga-2">
                    <span class="font-weight-bold text-subtitle-1 text-primary">{{ formatPartNumber(traceData.part_info.part_number) }}</span>
                    <v-chip color="indigo-darken-1" size="x-small" label class="text-white font-weight-bold">Proses {{ traceData.part_info.process }}</v-chip>
                    <v-chip color="primary" size="x-small" label class="font-weight-bold">Mesin Saat Ini: {{ traceData.part_info.current_machine }}</v-chip>
                  </div>
                  <div class="text-caption text-grey mt-1">
                    {{ traceData.part_info.part_name }} ({{ traceData.part_info.model || '-' }}) | Job: {{ traceData.part_info.job_number || '-' }}
                  </div>
                </div>

                <div class="d-flex ga-3 text-right">
                  <div class="border-l pl-3">
                    <div class="text-caption text-grey">Kebutuhan Nut</div>
                    <div class="font-weight-bold text-slate-800 text-caption">{{ traceData.part_info.needed_nut }}</div>
                  </div>
                  <div class="border-l pl-3">
                    <div class="text-caption text-grey">Min. kVA / Holder</div>
                    <div class="font-weight-bold text-slate-800 text-caption">{{ traceData.part_info.ref_kva }} kVA / {{ traceData.part_info.ref_upper_holder }}</div>
                  </div>
                  <div class="border-l pl-3">
                    <div class="text-caption text-grey">TPT Part</div>
                    <div class="font-weight-bold text-primary text-caption">{{ Number(traceData.part_info.tpt || 0).toFixed(1) }} Jam</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Summary Metrics & Filter Tabs -->
            <div class="d-flex flex-wrap justify-space-between align-center mb-2 ga-2">
              <div class="d-flex align-center ga-1.5">
                <span class="bg-blue-lighten-5 text-primary font-weight-bold px-2 py-0.5 rounded border border-blue-lighten-3 text-caption">
                  Total: {{ traceData.summary.total_machines }} Mesin
                </span>
                <span class="bg-green-lighten-5 text-teal-darken-3 font-weight-bold px-2 py-0.5 rounded border border-green-lighten-3 text-caption">
                  {{ traceData.summary.compatible_count }} Kompatibel
                </span>
                <span class="bg-red-lighten-5 text-red-darken-3 font-weight-bold px-2 py-0.5 rounded border border-red-lighten-3 text-caption">
                  {{ traceData.summary.incompatible_count }} Gugur
                </span>
              </div>

              <v-tabs v-model="traceFilterTab" density="compact" color="primary" class="rounded bg-white border">
                <v-tab value="ALL" class="text-caption font-weight-bold">Semua Mesin</v-tab>
                <v-tab value="COMPATIBLE" class="text-caption font-weight-bold">Kompatibel ({{ traceData.summary.compatible_count }})</v-tab>
                <v-tab value="INCOMPATIBLE" class="text-caption font-weight-bold">Gugur ({{ traceData.summary.incompatible_count }})</v-tab>
              </v-tabs>
            </div>

            <!-- List of Machine Diagnostics -->
            <div class="overflow-y-auto pr-1" style="max-height: 480px;">
              <div v-for="d in filteredTraceDiagnostics" :key="d.machine" class="pa-3.5 rounded border bg-white mb-3" :style="d.is_current ? 'border-left: 5px solid #0345a1 !important;' : (d.is_compatible ? 'border-left: 5px solid #16a34a !important;' : 'border-left: 5px solid #dc2626 !important;')">
                <div class="d-flex justify-space-between align-start">
                  <div>
                    <div class="d-flex align-center ga-2 mb-1.5 flex-wrap">
                      <span class="font-weight-bold text-subtitle-1" :class="{'text-primary': d.is_current, 'text-teal-darken-3': d.is_compatible && !d.is_current, 'text-black': !d.is_compatible}">
                        Mesin {{ d.machine }}
                      </span>
                      <v-chip v-if="d.is_current" size="x-small" color="primary" variant="flat" class="font-weight-bold">Mesin Saat Ini</v-chip>
                      <v-chip v-if="d.is_backup" size="x-small" color="indigo" variant="tonal" class="font-weight-bold">Mesin Backup</v-chip>
                      <v-chip v-if="d.is_compatible && !d.is_current" size="x-small" color="success" variant="flat" class="font-weight-bold">Kompatibel</v-chip>
                      <v-chip v-if="!d.is_compatible" size="x-small" color="error" variant="tonal" class="font-weight-bold">Gugur: Syarat {{ d.failed_step }}</v-chip>
                    </div>

                    <!-- Alasan Eliminasi / Status -->
                    <div class="d-flex align-center text-body-2 mt-1.5" :class="d.is_compatible ? 'text-teal-darken-3' : 'text-grey-darken-3'" style="line-height: 1.4;">
                      <v-icon size="16" class="mr-1.5" :color="d.is_compatible ? 'teal' : 'grey-darken-2'">
                        {{ d.is_compatible ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}
                      </v-icon>
                      <span class="font-weight-medium">{{ d.elimination_reason }}</span>
                    </div>
                  </div>

                  <!-- TPT Mesin Tersebut -->
                  <div class="text-right pl-3">
                    <div class="text-caption text-grey" style="font-size: 11px;">Beban Mesin</div>
                    <div class="font-weight-bold text-subtitle-2 text-black">
                      {{ Number(d.tpt_hours || 0).toFixed(1) }} Jam
                    </div>
                  </div>
                </div>

                <!-- Detail 6 Kriteria Checklist -->
                <v-divider class="my-2.5" />
                <div class="d-flex flex-wrap ga-2 text-caption">
                  <!-- Nut Type -->
                  <v-chip size="x-small" :color="d.checks.nut_type.pass ? 'success' : 'error'" variant="tonal" class="px-2 font-weight-medium">
                    <v-icon size="12" class="mr-1">{{ d.checks.nut_type.pass ? 'mdi-check' : 'mdi-close' }}</v-icon>
                    Nut: {{ d.checks.nut_type.cand }}
                  </v-chip>
                  <!-- kVA -->
                  <v-chip size="x-small" :color="d.checks.kva.pass ? 'success' : 'error'" variant="tonal" class="px-2 font-weight-medium">
                    <v-icon size="12" class="mr-1">{{ d.checks.kva.pass ? 'mdi-check' : 'mdi-close' }}</v-icon>
                    Daya: {{ d.checks.kva.cand }}
                  </v-chip>
                  <!-- Upper Holder -->
                  <v-chip size="x-small" :color="d.checks.upper_holder.pass ? 'success' : 'error'" variant="tonal" class="px-2 font-weight-medium">
                    <v-icon size="12" class="mr-1">{{ d.checks.upper_holder.pass ? 'mdi-check' : 'mdi-close' }}</v-icon>
                    Holder: {{ d.checks.upper_holder.cand }}
                  </v-chip>
                  <!-- Nut Feeder -->
                  <v-chip size="x-small" :color="d.checks.nut_feeder.pass ? 'success' : 'error'" variant="tonal" class="px-2 font-weight-medium">
                    <v-icon size="12" class="mr-1">{{ d.checks.nut_feeder.pass ? 'mdi-check' : 'mdi-close' }}</v-icon>
                    Feeder: {{ d.checks.nut_feeder.cand }}
                  </v-chip>
                  <!-- Rotary & Robo -->
                  <v-chip size="x-small" :color="d.checks.rotary_robo.pass ? 'success' : 'error'" variant="tonal" class="px-2 font-weight-medium">
                    <v-icon size="12" class="mr-1">{{ d.checks.rotary_robo.pass ? 'mdi-check' : 'mdi-close' }}</v-icon>
                    Rotary/Robo: {{ d.checks.rotary_robo.cand }}
                  </v-chip>
                  <!-- Handy Navi -->
                  <v-chip size="x-small" :color="d.checks.handy_navi.pass ? 'success' : 'error'" variant="tonal" class="px-2 font-weight-medium">
                    <v-icon size="12" class="mr-1">{{ d.checks.handy_navi.pass ? 'mdi-check' : 'mdi-close' }}</v-icon>
                    Handy: {{ d.checks.handy_navi.cand }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-6 text-grey text-caption">
            Tidak ada data diagnostik yang tersedia.
          </div>
        </v-card-text>

        <v-card-actions class="py-1 px-3 bg-grey-lighten-4 d-flex justify-end border-t">
          <v-btn color="primary" variant="flat" density="compact" class="font-weight-bold text-caption px-4" @click="isTraceModalOpen = false">
            Tutup
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Part Movement History Modal -->
    <PartMovementHistoryModal
      v-model="isMovementHistoryOpen"
      :simulation-id="store.currentSimulationId || (store.createData as any)?.id"
      :loads-data="store.createData"
    />
  </div>
</template>

<style scoped>
.hover-adjust-cell {
  transition: all 0.2s ease;
}

.hover-adjust-cell:hover {
  background-color: #e0f2fe !important;
  color: #0369a1 !important;
}

.hover-adjust-cell .edit-icon-hint {
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.hover-adjust-cell:hover .edit-icon-hint {
  opacity: 1;
  color: #0284c7 !important;
}

.hover-pcs-day {
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.hover-pcs-day:hover {
  background-color: rgba(3, 69, 161, 0.08) !important;
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
  position: sticky !important;
  top: 0 !important;
  z-index: 10 !important;
  box-sizing: border-box !important;
}

.custom-table :deep(td) {
  padding: 4px 6px !important;
  font-size: 11px !important;
  border-bottom: 1.5px solid #cbd5e1 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  vertical-align: middle !important;
  color: #000000 !important;
  box-sizing: border-box !important;
}

.custom-table :deep(tr:hover:not(.v-data-table__empty-wrapper)) {
  background-color: rgba(33, 150, 243, 0.08) !important;
}

/* Sticky Freezing for Header (X & Y) and Body (X only) */
.custom-table :deep(.v-table__wrapper) {
  overflow-y: auto !important;
  overflow-x: auto !important;
  max-height: 750px !important;
  position: relative !important;
}

.custom-table :deep(thead),
.custom-table :deep(thead tr) {
  position: sticky !important;
  top: 0 !important;
  z-index: 30 !important;
}

.custom-table :deep(thead th) {
  position: sticky !important;
  top: 0 !important;
  z-index: 30 !important;
  background-color: #eef2f7 !important;
}

.custom-table :deep(thead th.sticky-col-1) {
  position: sticky !important;
  top: 0 !important;
  left: 0px !important;
  width: 44px !important;
  min-width: 44px !important;
  max-width: 44px !important;
  z-index: 50 !important;
  background-color: #eef2f7 !important;
}

.custom-table :deep(thead th.sticky-col-2) {
  position: sticky !important;
  top: 0 !important;
  left: 44px !important;
  width: 44px !important;
  min-width: 44px !important;
  max-width: 44px !important;
  z-index: 50 !important;
  background-color: #eef2f7 !important;
}

.custom-table :deep(thead th.sticky-col-3) {
  position: sticky !important;
  top: 0 !important;
  left: 88px !important;
  width: 75px !important;
  min-width: 75px !important;
  max-width: 75px !important;
  z-index: 50 !important;
  background-color: #eef2f7 !important;
}

.custom-table :deep(thead th.sticky-col-4) {
  position: sticky !important;
  top: 0 !important;
  left: 163px !important;
  width: 160px !important;
  min-width: 160px !important;
  max-width: 160px !important;
  z-index: 50 !important;
  background-color: #eef2f7 !important;
}

.custom-table :deep(thead th.sticky-col-5) {
  position: sticky !important;
  top: 0 !important;
  left: 323px !important;
  width: 95px !important;
  min-width: 95px !important;
  max-width: 95px !important;
  z-index: 50 !important;
  background-color: #eef2f7 !important;
  border-right: 2px solid #94a3b8 !important;
  box-shadow: 3px 0 6px -2px rgba(0, 0, 0, 0.15) !important;
}

.custom-table :deep(tbody td.sticky-col-1) {
  position: sticky !important;
  left: 0px !important;
  width: 44px !important;
  min-width: 44px !important;
  max-width: 44px !important;
  z-index: 15 !important;
  background-color: #ffffff !important;
}

.custom-table :deep(tbody td.sticky-col-2) {
  position: sticky !important;
  left: 44px !important;
  width: 44px !important;
  min-width: 44px !important;
  max-width: 44px !important;
  z-index: 15 !important;
  background-color: #ffffff !important;
}

.custom-table :deep(tbody td.sticky-col-3) {
  position: sticky !important;
  left: 88px !important;
  width: 75px !important;
  min-width: 75px !important;
  max-width: 75px !important;
  z-index: 15 !important;
  background-color: #ffffff !important;
}

.custom-table :deep(tbody td.sticky-col-4) {
  position: sticky !important;
  left: 163px !important;
  width: 160px !important;
  min-width: 160px !important;
  max-width: 160px !important;
  z-index: 15 !important;
  background-color: #ffffff !important;
}

.custom-table :deep(tbody td.sticky-col-5) {
  position: sticky !important;
  left: 323px !important;
  width: 95px !important;
  min-width: 95px !important;
  max-width: 95px !important;
  z-index: 15 !important;
  background-color: #ffffff !important;
  border-right: 2px solid #94a3b8 !important;
  box-shadow: 3px 0 6px -2px rgba(0, 0, 0, 0.15) !important;
}

.custom-table :deep(tr:hover td.sticky-col) {
  background-color: #f0f7ff !important;
}

.custom-table :deep(tr.bg-grey-lighten-4 td.sticky-col) {
  background-color: #f5f5f5 !important;
}

.custom-table :deep(tr.row-deleted td) {
  background-color: #ffebee !important;
  color: #b71c1c !important;
}
.custom-table :deep(tr.row-deleted:hover td) {
  background-color: #ffcdd2 !important;
}
.custom-table :deep(tr.row-deleted td.sticky-col) {
  background-color: #ffebee !important;
}
.custom-table :deep(tr.row-deleted:hover td.sticky-col) {
  background-color: #ffcdd2 !important;
}

.custom-table :deep(tr.row-new-parent td) {
  background-color: #e8f5e9 !important;
  color: #1b5e20 !important;
}
.custom-table :deep(tr.row-new-parent:hover td) {
  background-color: #c8e6c9 !important;
}
.custom-table :deep(tr.row-new-parent td.sticky-col) {
  background-color: #e8f5e9 !important;
}
.custom-table :deep(tr.row-new-parent:hover td.sticky-col) {
  background-color: #c8e6c9 !important;
}

.native-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background-color: white;
  transition: border-color 0.2s;
}
.native-input:focus {
  border-color: #1976d2;
}
.spec-table :deep(td) {
  padding: 4px 12px !important;
  border-bottom: 1px solid #f0f0f0;
}

.machine-card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
}

.machine-card {
  width: 182px;
  background-color: #ffffff;
  border: 2px solid #1565c0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: all 0.2s ease;
}

.machine-card:hover {
  box-shadow: 0 4px 12px rgba(21, 101, 192, 0.25);
}

.machine-card.selected-card {
  border-color: #1565c0 !important;
  box-shadow: 0 0 0 3px #1565c0 !important;
  background-color: #e3f2fd !important;
}

.machine-header {
  background-color: #1565c0;
  color: white;
  font-weight: bold;
  padding: 4px 8px;
  font-size: 12px;
  text-align: center;
}

.machine-specs {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 6px;
  overflow-y: auto;
  gap: 0px;
}

.spec-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.spec-row:hover {
  background-color: #f5f5f5;
}

.spec-label {
  font-size: 10px;
  color: #000;
  font-weight: 600;
}

.spec-value {
  font-size: 11px;
  color: #000;
  font-weight: bold;
}

.nut-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nut-chip {
  background-color: #ffffff;
  color: #1976d2;
  border: 1px solid #90caf9;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  height: 100%;
  min-height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.integ-badge {
  font-size: 10px !important;
  font-weight: bold;
  padding: 0;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: default;
  text-align: center;
  vertical-align: middle;
  width: 24px;
  min-width: 24px;
  max-width: 24px;
  box-sizing: border-box;
}

.rn, .hn, .gs, .nf {
  color: #1976d2;
  background-color: #ffffff;
  border: 1px solid #90caf9;
}

/* Yellow Highlight for Matched Specs */
.highlighted-row {
  background-color: #fff59d !important;
  box-shadow: inset 2px 0 0 #fbc02d;
}
.highlighted-row .spec-label, .highlighted-row .spec-value {
  color: #212121 !important;
  font-weight: bold;
}
.highlighted-chip {
  background-color: #fbc02d !important;
  color: #212121 !important;
  border-color: #f57f17 !important;
}
.highlighted-badge {
  background-color: #fbc02d !important;
  color: #212121 !important;
  border-color: #f57f17 !important;
}

/* Red Highlight for Mismatched Specs in Other Machines */
.mismatched-row {
  background-color: #ffebee !important;
  box-shadow: inset 2px 0 0 #ef5350;
}
.mismatched-row .spec-label, .mismatched-row .spec-value {
  color: #c62828 !important;
  font-weight: bold;
}
.mismatched-chip {
  background-color: #ffebee !important;
  color: #c62828 !important;
  border-color: #ef5350 !important;
  font-weight: bold;
}
.mismatched-badge {
  background-color: #ffebee !important;
  color: #c62828 !important;
  border-color: #ef5350 !important;
  font-weight: bold;
}

.spec-table {
  border-collapse: collapse !important;
  border: 1.5px solid #94a3b8 !important;
  width: 100%;
}

.spec-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #000000 !important;
  font-weight: bold !important;
  text-transform: uppercase;
  font-size: 11px !important;
  padding: 4px 6px !important;
  border-bottom: 2px solid #94a3b8 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  text-align: center !important;
}

.spec-table :deep(td) {
  padding: 4px 6px !important;
  font-size: 11px !important;
  border-bottom: 1.5px solid #cbd5e1 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  vertical-align: middle !important;
  color: #000000 !important;
  text-align: center !important;
}

.spec-table td.clickable-cell {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.spec-table td.clickable-cell:hover {
  background-color: #eceff1 !important;
}

.highlighted-spec {
  background-color: #fff59d !important;
  color: #000000 !important;
  font-weight: bold !important;
}

.align-middle {
  vertical-align: middle !important;
}

.header-search-field :deep(.v-field) {
  height: 34px !important;
  min-height: 34px !important;
  border-radius: 6px !important;
  font-size: 13px !important;
}

.header-search-field :deep(.v-field__input) {
  color: #1e293b !important;
  min-height: 34px !important;
  padding-top: 5px !important;
  padding-bottom: 5px !important;
  font-size: 13px !important;
}

.header-search-field :deep(input) {
  color: #1e293b !important;
}

.header-search-field :deep(.v-field__prepend-inner) {
  color: #64748b !important;
  padding-top: 5px !important;
}
</style>

<style scoped>
.matrix-sticky-table {
  border-collapse: separate !important;
  border-spacing: 0 !important;
}

.matrix-sticky-table th,
.matrix-sticky-table td {
  border: 1px solid #cbd5e1 !important;
}

/* Header Row 1 sticky top */
.matrix-sticky-table thead tr:first-child th {
  position: sticky !important;
  top: 0px !important;
  z-index: 15 !important;
}

/* Header Row 2 sticky top */
.matrix-sticky-table thead tr:nth-child(2) th {
  position: sticky !important;
  top: 38px !important;
  z-index: 15 !important;
}

/* Column 1 sticky left (both thead and tbody) */
.matrix-sticky-table th.matrix-col-1,
.matrix-sticky-table td.matrix-col-1 {
  position: sticky !important;
  left: 0px !important;
  min-width: 160px !important;
  width: 160px !important;
  max-width: 160px !important;
  border-right: 2px solid #94a3b8 !important;
}

/* Column 2 sticky left (both thead and tbody) */
.matrix-sticky-table th.matrix-col-2,
.matrix-sticky-table td.matrix-col-2 {
  position: sticky !important;
  left: 160px !important;
  min-width: 150px !important;
  width: 150px !important;
  max-width: 150px !important;
  border-right: 2px solid #94a3b8 !important;
}

/* Intersecting Corner Headers (Thead Row 1 & Row 2 for Col 1 & Col 2) get highest z-index */
.matrix-sticky-table thead tr:first-child th.matrix-col-1,
.matrix-sticky-table thead tr:first-child th.matrix-col-2,
.matrix-sticky-table thead tr:nth-child(2) th.matrix-col-1,
.matrix-sticky-table thead tr:nth-child(2) th.matrix-col-2 {
  z-index: 40 !important;
}

/* Tbody sticky columns get z-index 20 so they stay above scrolling cells */
.matrix-sticky-table tbody td.matrix-col-1,
.matrix-sticky-table tbody td.matrix-col-2 {
  z-index: 20 !important;
}

/* Auto Balance Compact Modal Table */
.auto-balance-table :deep(th) {
  padding: 2px 2px !important;
  font-size: 10px !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.auto-balance-table :deep(td) {
  padding: 2px 2px !important;
  font-size: 10.5px !important;
  line-height: 1.2 !important;
}

.dense-select :deep(.v-field__input) {
  padding: 1px 3px !important;
  min-height: 24px !important;
  font-size: 10.5px !important;
}

.dense-select :deep(.v-field__append-inner) {
  padding-top: 1px !important;
  padding-bottom: 1px !important;
}

.dense-select :deep(.v-field) {
  border-radius: 4px !important;
}

.dense-input :deep(.v-field__input) {
  padding: 2px 6px !important;
  min-height: 28px !important;
  font-size: 11px !important;
}
</style>
