<script setup lang="ts">
import { ref, shallowRef, reactive, computed, onMounted, watch } from 'vue';
import { useConfigStore } from '@/stores/config';
import { MdfoService } from '@/services/Logistik/IFP/Report/MdfoService';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import {
  SyncOutlined,
  FileExcelOutlined,
  SearchOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons-vue';

// Page info
const page = ref({ title: 'History Mutasi IFPD' });
const breadcrumbs = ref([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'IFP', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'History Mutasi IFPD', disabled: true, href: '#' }
]);

// Stores
const configStore = useConfigStore();

// Filters & State
const selectedPeriod = ref('2026-08');
const searchPartNumber = ref('');
const searchModel = ref('');
const loading = ref(false);
const showAlert = ref(false);
const alertMessage = ref('');

// Selected year/month (0-indexed month)
const selectedYear = computed(() => parseInt(selectedPeriod.value.split('-')[0]) || new Date().getFullYear());
const selectedMonth = computed(() => (parseInt(selectedPeriod.value.split('-')[1]) - 1));

// Period string YYYYMM for MDFO API (e.g. "202608")
const spmon = computed(() => {
  const y = selectedYear.value;
  const m = String(selectedMonth.value + 1).padStart(2, '0');
  return `${y}${m}`;
});

// Days in selected month
const daysInMonth = computed(() => new Date(selectedYear.value, selectedMonth.value + 1, 0).getDate());

// Pre-compute today/weekend flags as arrays for O(1) lookup in template
const todayFlags = computed<boolean[]>(() => {
  const today = new Date();
  const isThisMonth = today.getFullYear() === selectedYear.value && today.getMonth() === selectedMonth.value;
  const arr = new Array(daysInMonth.value + 1).fill(false);
  if (isThisMonth) arr[today.getDate()] = true;
  return arr;
});
const weekendFlags = computed<boolean[]>(() => {
  const arr = new Array(daysInMonth.value + 1).fill(false);
  for (let d = 1; d <= daysInMonth.value; d++) {
    const dow = new Date(selectedYear.value, selectedMonth.value, d).getDay();
    arr[d] = dow === 0 || dow === 6;
  }
  return arr;
});

// API date range from selected period
const startDate = computed(() => {
  const m = String(selectedMonth.value + 1).padStart(2, '0');
  return `${selectedYear.value}-${m}-01`;
});
const endDate = computed(() => {
  const m = selectedMonth.value + 1;
  const lastDay = new Date(selectedYear.value, m, 0).getDate();
  return `${selectedYear.value}-${String(m).padStart(2, '0')}-${lastDay}`;
});

// ── Pre-computed flat display structure ───────────────────────────
interface CellVal { v: string; cls: string }
interface PartDisplay {
  no: number;
  customer: string; model: string; part_number: string; job_number: string; zrouting: string;
  mdfoRow: CellVal[];   // 1 per day (daysInMonth), merged colspan=2
  mdfoTotal: CellVal;
  soRow: CellVal[];     // 1 per day (daysInMonth), merged colspan=2 (SALES ORDER)
  soTotal: CellVal;
  rows: CellVal[][];    // 6 sub-rows x (days * 2) for D/N
  totals: CellVal[];    // 6 sub-row totals
}

const displayParts = shallowRef<PartDisplay[]>([]);
const selectedRouting = ref('ALL');
let filterTimer: ReturnType<typeof setTimeout> | null = null;
let fetchController: AbortController | null = null;

// Unique routings list extracted from partMetas
const routingOptions = computed(() => {
  const routings = partMetas
    .map(p => p.zrouting)
    .filter((zr): zr is string => !!zr && zr.trim() !== '');
  const unique = [...new Set(routings)].sort();
  return ['ALL', ...unique];
});

// Raw non-reactive maps
type RawRec = {
  pcs: number;
  stok: number;
  qty_in: number;
  qty_out: number;
  qty_final: number;
  strength: number | null;
  min_str: number | null;
  max_str: number | null;
};
type MdfoRec = Record<string, string | number>; // t1..t31, tot

let rawMap: Record<string, Record<string, RawRec>> = {};
let mdfoMap: Record<string, MdfoRec> = {};
let soMap: Record<string, MdfoRec> = {};

interface PartMeta { customer: string; model: string; part_number: string; job_number: string; zrouting: string; order: number }
let partMetas: PartMeta[] = [];
let currentDays = 31;

const SUB_ROW_LABELS  = ['PCS / DAY', 'STOK AWAL', 'QTY IN', 'QTY OUT', 'ACTUAL STOCK', 'STRENGTH (JAM)'];
const SUB_ROW_DESC_CLS = ['desc-pcs-per-day', 'desc-stok-awal', 'desc-qty-in', 'desc-qty-out', 'desc-stock', 'desc-strength'];
const SUB_ROW_DATA_CLS = ['row-pcs-per-day', 'row-stok-awal', 'row-qty-in', 'row-qty-out', 'row-stock', 'row-strength'];
const SUB_ROW_META = SUB_ROW_LABELS.map((label, i) => ({ label, descCls: SUB_ROW_DESC_CLS[i], rowCls: SUB_ROW_DATA_CLS[i] }));

function strengthCls(v: number | null, minStr: number | null = null, maxStr: number | null = null) {
  if (v === null || v === undefined || v <= 0) return '';
  const min = minStr !== null ? minStr : 12;
  const max = maxStr !== null ? maxStr : 20;

  if (v < min) return 'strength-danger'; // merah
  if (v > max) return 'strength-warn';   // kuning
  return 'strength-safe';                // hijau
}

function buildPartDisplay(
  meta: PartMeta,
  recs: Record<string, RawRec>,
  mdfoRec: MdfoRec | undefined,
  soRec: MdfoRec | undefined,
  days: number
): PartDisplay {
  // 1. Build MDFO row (merged 1 per day)
  const mdfoRow: CellVal[] = [];
  let mdfoSum = 0;
  for (let d = 1; d <= days; d++) {
    const rawVal = mdfoRec ? (mdfoRec[`t${d}`] ?? '0') : '0';
    const numVal = parseFloat(String(rawVal)) || 0;
    mdfoSum += numVal;
    mdfoRow.push({
      v: numVal > 0 ? numVal.toLocaleString('id') : '0',
      cls: numVal > 0 ? 'font-semibold text-slate-800' : 'text-slate-400'
    });
  }
  const totalMdfoNum = mdfoRec && mdfoRec.tot !== undefined ? (parseFloat(String(mdfoRec.tot)) || mdfoSum) : mdfoSum;
  const mdfoTotal: CellVal = {
    v: totalMdfoNum > 0 ? totalMdfoNum.toLocaleString('id') : '0',
    cls: 'font-bold'
  };

  // 2. Build SALES ORDER row (merged 1 per day)
  const soRow: CellVal[] = [];
  let soSum = 0;
  for (let d = 1; d <= days; d++) {
    const rawVal = soRec ? (soRec[`t${d}`] ?? '0') : '0';
    const numVal = parseFloat(String(rawVal)) || 0;
    soSum += numVal;
    soRow.push({
      v: numVal > 0 ? numVal.toLocaleString('id') : '0',
      cls: numVal > 0 ? 'font-semibold text-emerald-800' : 'text-slate-400'
    });
  }
  const totalSoNum = soRec && soRec.tot !== undefined ? (parseFloat(String(soRec.tot)) || soSum) : soSum;
  const soTotal: CellVal = {
    v: totalSoNum > 0 ? totalSoNum.toLocaleString('id') : '0',
    cls: 'font-bold'
  };

  // 3. Build 6 sub-rows (D/N split)
  const empty: CellVal = { v: '', cls: '' };
  const rows: CellVal[][] = Array.from({ length: 6 }, () => new Array(days * 2).fill(empty));

  let totalPcs = 0, pcsCnt = 0, firstStok = 0, firstStokFound = false;
  let totalIn = 0, totalOut = 0, lastStock = 0, lastStrength = 0;
  let lastMinStr: number | null = null, lastMaxStr: number | null = null;

  for (let d = 1; d <= days; d++) {
    for (let s = 0; s < 2; s++) {
      const rec = recs[`${d}_${s === 0 ? 'D' : 'N'}`];
      if (!rec) continue;
      const col = (d - 1) * 2 + s;
      const str = rec.strength ?? (rec.pcs > 0 ? rec.qty_final / (rec.pcs / 16) : 0);
      totalPcs += rec.pcs; pcsCnt++;
      if (!firstStokFound) { firstStok = rec.stok; firstStokFound = true; }
      totalIn  += rec.qty_in;
      totalOut += rec.qty_out;
      lastStock = rec.qty_final;
      lastStrength = str;
      lastMinStr = rec.min_str;
      lastMaxStr = rec.max_str;
      const strFixed = parseFloat(str.toFixed(2));
      rows[0][col] = { v: rec.pcs  > 0 ? String(rec.pcs)  : '', cls: '' };
      rows[1][col] = { v: rec.stok > 0 ? rec.stok.toLocaleString('id') : '', cls: '' };
      rows[2][col] = { v: rec.qty_in  > 0 ? String(rec.qty_in)  : '', cls: '' };
      rows[3][col] = { v: rec.qty_out > 0 ? String(rec.qty_out) : '', cls: '' };
      rows[4][col] = { v: rec.qty_final > 0 ? String(rec.qty_final) : '', cls: '' };
      rows[5][col] = { v: strFixed > 0 ? strFixed.toFixed(2) : '', cls: strengthCls(strFixed, rec.min_str, rec.max_str) };
    }
  }
  const avgPcs = pcsCnt > 0 ? parseFloat((totalPcs / pcsCnt).toFixed(2)) : 0;
  const totals: CellVal[] = [
    { v: String(avgPcs || 0), cls: '' },
    { v: firstStok > 0 ? firstStok.toLocaleString('id') : '0', cls: '' },
    { v: String(totalIn),  cls: '' },
    { v: String(totalOut), cls: '' },
    { v: lastStock > 0 ? lastStock.toLocaleString('id') : '0', cls: '' },
    { v: lastStrength > 0 ? lastStrength.toFixed(2) : '0', cls: strengthCls(lastStrength, lastMinStr, lastMaxStr) },
  ];

  return {
    no: meta.order,
    customer: meta.customer,
    model: meta.model,
    part_number: meta.part_number,
    job_number: meta.job_number,
    zrouting: meta.zrouting,
    mdfoRow,
    mdfoTotal,
    soRow,
    soTotal,
    rows,
    totals
  };
}

// ── Excel Column Filters Engine ──────────────────────────────────
const HEADER_COLS = [
  { key: 'customer',    label: 'CUSTOMER', cls: 'col-cust' },
  { key: 'model',       label: 'MODEL',    cls: 'col-model' },
  { key: 'part_number', label: 'PART NO.', cls: 'col-part' },
  { key: 'job_number',  label: 'JOB NO.',  cls: 'col-job' },
  { key: 'zrouting',    label: 'ROUTING',  cls: 'col-route' },
  { key: 'desc',        label: 'DESC',     cls: 'col-desc' },
];

interface ExcelColFilter {
  search: string;
  selected: Set<string>;
  sort: 'ASC' | 'DESC' | null;
}

const excelFilters = reactive<Record<string, ExcelColFilter>>({
  customer:    { search: '', selected: new Set(), sort: null },
  model:       { search: '', selected: new Set(), sort: null },
  part_number: { search: '', selected: new Set(), sort: null },
  job_number:  { search: '', selected: new Set(), sort: null },
  zrouting:    { search: '', selected: new Set(), sort: null },
  desc:        { search: '', selected: new Set(), sort: null },
});

function getUniqueValues(colKey: string): string[] {
  if (colKey === 'desc') {
    return ['MDFO', 'SALES ORDER', 'PCS / DAY', 'STOK AWAL', 'QTY IN', 'QTY OUT', 'ACTUAL STOCK', 'STRENGTH (JAM)'];
  }
  const vals = new Set<string>();
  partMetas.forEach(meta => {
    const v = String((meta as any)[colKey] || '').trim();
    vals.add(v || '(Blanks)');
  });
  return [...vals].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
}

function getFilteredUniqueValues(colKey: string): string[] {
  const all = getUniqueValues(colKey);
  const q = (excelFilters[colKey]?.search || '').toLowerCase().trim();
  if (!q) return all;
  return all.filter(v => v.toLowerCase().includes(q));
}

function initExcelFilters() {
  HEADER_COLS.forEach(col => {
    const allVals = getUniqueValues(col.key);
    excelFilters[col.key] = {
      search: '',
      selected: new Set(allVals),
      sort: null
    };
  });
}

function isColFiltered(colKey: string): boolean {
  const f = excelFilters[colKey];
  if (!f) return false;
  if (f.sort !== null) return true;
  const allVals = getUniqueValues(colKey);
  return f.selected.size < allVals.length;
}

function toggleExcelItem(colKey: string, val: string) {
  const sel = excelFilters[colKey].selected;
  if (sel.has(val)) sel.delete(val);
  else sel.add(val);
  rebuildDisplay();
}

function selectAllExcel(colKey: string) {
  const all = getUniqueValues(colKey);
  excelFilters[colKey].selected = new Set(all);
  rebuildDisplay();
}

function clearAllExcel(colKey: string) {
  excelFilters[colKey].selected.clear();
  rebuildDisplay();
}

function invertExcel(colKey: string) {
  const all = getUniqueValues(colKey);
  const current = excelFilters[colKey].selected;
  const next = new Set<string>();
  all.forEach(v => {
    if (!current.has(v)) next.add(v);
  });
  excelFilters[colKey].selected = next;
  rebuildDisplay();
}

function selectOnlyExcel(colKey: string, val: string) {
  excelFilters[colKey].selected = new Set([val]);
  rebuildDisplay();
}

function applySortExcel(colKey: string, sortDir: 'ASC' | 'DESC') {
  HEADER_COLS.forEach(c => {
    if (c.key !== colKey && excelFilters[c.key]) {
      excelFilters[c.key].sort = null;
    }
  });
  if (excelFilters[colKey].sort === sortDir) {
    excelFilters[colKey].sort = null;
  } else {
    excelFilters[colKey].sort = sortDir;
  }
  rebuildDisplay();
}

// Helper functions for dynamic row visibility in template (DESC checklist)
const ALL_ROW_LABELS = ['MDFO', 'SALES ORDER', 'PCS / DAY', 'STOK AWAL', 'QTY IN', 'QTY OUT', 'ACTUAL STOCK', 'STRENGTH (JAM)'];

function isRowVisible(label: string): boolean {
  const filter = excelFilters.desc;
  if (!filter) return true;
  return filter.selected.has(label);
}

function getFirstVisibleRow(): string | null {
  for (const label of ALL_ROW_LABELS) {
    if (isRowVisible(label)) return label;
  }
  return null;
}

function getVisibleRowsCount(): number {
  let count = 0;
  for (const label of ALL_ROW_LABELS) {
    if (isRowVisible(label)) count++;
  }
  return count;
}

function rebuildDisplay() {
  const pnLow = searchPartNumber.value.toLowerCase().trim();
  const mdLow = searchModel.value.toLowerCase().trim();
  const routingFilter = selectedRouting.value;

  let filteredMetas = [...partMetas];

  // 1. Top card filters
  if (routingFilter !== 'ALL') {
    filteredMetas = filteredMetas.filter(m => m.zrouting === routingFilter);
  }
  if (pnLow) {
    filteredMetas = filteredMetas.filter(m => m.part_number.toLowerCase().includes(pnLow));
  }
  if (mdLow) {
    filteredMetas = filteredMetas.filter(m => m.model.toLowerCase().includes(mdLow) || m.zrouting.toLowerCase().includes(mdLow));
  }

  // 2. Excel column checklist filters
  ['customer', 'model', 'part_number', 'job_number', 'zrouting'].forEach(colKey => {
    const filterState = excelFilters[colKey];
    if (filterState) {
      const allVals = getUniqueValues(colKey);
      if (filterState.selected.size < allVals.length) {
        filteredMetas = filteredMetas.filter(m => {
          const v = String((m as any)[colKey] || '').trim() || '(Blanks)';
          return filterState.selected.has(v);
        });
      }
    }
  });

  // 3. Excel column sorting
  let activeSortCol: string | null = null;
  let activeSortDir: 'ASC' | 'DESC' | null = null;
  for (const col of HEADER_COLS) {
    if (excelFilters[col.key]?.sort) {
      activeSortCol = col.key;
      activeSortDir = excelFilters[col.key].sort;
      break;
    }
  }

  if (activeSortCol && activeSortDir) {
    const dir = activeSortDir === 'ASC' ? 1 : -1;
    filteredMetas.sort((a, b) => {
      const va = String((a as any)[activeSortCol!] || '').toLowerCase();
      const vb = String((b as any)[activeSortCol!] || '').toLowerCase();
      return va.localeCompare(vb, 'id', { numeric: true }) * dir;
    });
  }

  // 4. Build display parts
  const result: PartDisplay[] = [];
  for (const meta of filteredMetas) {
    const recs = rawMap[`${meta.part_number}_${meta.job_number}_${meta.zrouting}_${meta.customer}`] || {};
    const mdfoRec = mdfoMap[meta.part_number];
    const soRec = soMap[meta.part_number];
    result.push(buildPartDisplay(meta, recs, mdfoRec, soRec, currentDays));
  }

  displayParts.value = result;
}

// Fetch data from live API
const fetchData = async () => {
  // Cancel any ongoing request first
  if (fetchController) {
    fetchController.abort();
  }
  fetchController = new AbortController();
  const signal = fetchController.signal;

  loading.value = true;
  showAlert.value = false;
  rawMap = {}; mdfoMap = {}; soMap = {}; partMetas = []; displayParts.value = [];
  try {
    const partNoFilter = searchPartNumber.value.trim() || undefined;
    const TIMEOUT_MS = 60_000; // 60 detik timeout

    // Call history_dn, mdfo, and sales_order in parallel
    const [resHistory, resMdfo, resSo] = await Promise.allSettled([
      MdfoService.fetchHistoryDN(configStore.apiUrl, startDate.value, endDate.value, partNoFilter, signal, TIMEOUT_MS),
      MdfoService.fetchMdfoData(configStore.apiUrl, spmon.value, partNoFilter, signal, TIMEOUT_MS),
      MdfoService.fetchSalesOrderData(configStore.apiUrl, spmon.value, partNoFilter, signal, TIMEOUT_MS)
    ]);

    // Jika di-abort, berhenti di sini
    if (signal.aborted) return;

    // 1. Process MDFO Map
    if (resMdfo.status === 'fulfilled' && resMdfo.value?.data?.status && Array.isArray(resMdfo.value.data.data)) {
      for (const item of resMdfo.value.data.data) {
        if (item.part_number) {
          mdfoMap[item.part_number] = item;
        }
      }
    }

    // 2. Process Sales Order Map
    if (resSo.status === 'fulfilled' && resSo.value?.data?.status && Array.isArray(resSo.value.data.data)) {
      for (const item of resSo.value.data.data) {
        if (item.part_number) {
          soMap[item.part_number] = item;
        }
      }
    }

    // 3. Process History DN
    let historyCount = 0;
    if (resHistory.status === 'fulfilled' && resHistory.value?.data?.status && Array.isArray(resHistory.value.data.data) && resHistory.value.data.data.length > 0) {
      currentDays = daysInMonth.value;
      const orderMap: Record<string, number> = {};
      let idx = 0;
      historyCount = resHistory.value.data.data.length;

      for (const item of resHistory.value.data.data as any[]) {
        const pn = item.part_number || '', jn = item.job_number || '', zr = item.zrouting || '', cust = item.DEST1 || '', model = item.model || '';
        const mk = `${pn}_${jn}_${zr}_${cust}`;
        if (!(mk in orderMap)) {
          orderMap[mk] = ++idx;
          partMetas.push({ customer: cust, model, part_number: pn, job_number: jn, zrouting: zr, order: idx });
          rawMap[mk] = {};
        }
        const day = parseInt(String(item.tanggal || '').split('-')[2]) || 0;
        const shift = item.shift_code === 'N' ? 'N' : 'D';
        if (day < 1 || day > 31) continue;
        rawMap[mk][`${day}_${shift}`] = {
          pcs:       parseFloat(item.pcs_day ?? item.pcs_day_final) || 0,
          stok:      parseFloat(item.stok_awal)     || 0,
          qty_in:    parseFloat(item.qty_in)         || 0,
          qty_out:   parseFloat(item.qty_out)        || 0,
          qty_final: parseFloat(item.qty_final)      || 0,
          strength:  item.strength != null ? parseFloat(item.strength) : null,
          min_str:   item.min_str != null ? parseFloat(item.min_str) : null,
          max_str:   item.max_str != null ? parseFloat(item.max_str) : null,
        };
      }
    } else {
      // If history is empty, populate partMetas from MDFO / Sales Order if available
      currentDays = daysInMonth.value;
      let idx = 0;
      const combinedPns = new Set([...Object.keys(mdfoMap), ...Object.keys(soMap)]);
      for (const pn of combinedPns) {
        const mItem = mdfoMap[pn] || soMap[pn] || {};
        const cust = String(mItem.customer || '');
        const model = String(mItem.model || mItem.zmodel || '');
        partMetas.push({ customer: cust, model, part_number: pn, job_number: String(mItem.job_number || ''), zrouting: '', order: ++idx });
        rawMap[`${pn}___${cust}`] = {};
      }
    }

    initExcelFilters();
    rebuildDisplay();
    const mdfoCount = Object.keys(mdfoMap).length;
    const soCount = Object.keys(soMap).length;
    alertMessage.value = `${historyCount} record mutasi, ${mdfoCount} MDFO & ${soCount} Sales Order ditarik — ${partMetas.length} part number.`;
    showAlert.value = true;
  } catch (err: any) {
    if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError') {
      // Request dibatalkan karena ada fetch baru — tidak perlu tampilkan error
      return;
    }
    console.error(err);
    const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
    alertMessage.value = isTimeout
      ? 'Request timeout (60 detik). Query terlalu berat, coba filter part number terlebih dahulu.'
      : 'Koneksi gagal. Pastikan server API aktif dan coba lagi.';
    showAlert.value = true;
  } finally {
    if (!signal.aborted) {
      loading.value = false;
    }
  }
};

// Debounced client-side filter (no re-fetch)
const applySearch = () => {
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(() => rebuildDisplay(), 300);
};

const clearFilters = () => {
  searchPartNumber.value = '';
  searchModel.value = '';
  selectedRouting.value = 'ALL';
  initExcelFilters();
  rebuildDisplay();
};

// Group displayParts by zrouting
interface RoutingGroup {
  name: string;
  parts: PartDisplay[];
}

const groupedByRouting = computed<RoutingGroup[]>(() => {
  const map: Record<string, PartDisplay[]> = {};
  displayParts.value.forEach(part => {
    const key = part.zrouting || 'TANPA ROUTING';
    if (!map[key]) map[key] = [];
    map[key].push(part);
  });

  return Object.keys(map).sort().map(name => ({
    name,
    parts: map[name]
  }));
});

// Lazy-load SheetJS only on export click
const exportToExcel = async () => {
  if (!displayParts.value.length) return;
  const XLSX = await import('xlsx');
  const days = daysInMonth.value;
  const monthName = new Date(selectedYear.value, selectedMonth.value).toLocaleString('id', { month: 'long' });
  const sheetTitle = `Mutasi_IFPD_${monthName}_${selectedYear.value}`;
  const h1 = ['NO','CUSTOMER','MODEL','PART NO.','JOB NO.','ROUTING','DESC'];
  const h2 = ['','','','','','',''];
  for (let d = 1; d <= days; d++) { h1.push(String(d), ''); h2.push('D','N'); }
  h1.push('TOTAL'); h2.push('');
  const rows: any[] = [h1, h2];

  displayParts.value.forEach((part, pi) => {
    // 1. MDFO Row
    const mdfoExcelRow: any[] = [pi + 1, part.customer, part.model, part.part_number, part.job_number, part.zrouting, 'MDFO'];
    for (let d = 0; d < days; d++) {
      mdfoExcelRow.push(part.mdfoRow[d]?.v ?? '0', ''); // merged colspan 2 in display, empty N in excel
    }
    mdfoExcelRow.push(part.mdfoTotal?.v ?? '0');
    rows.push(mdfoExcelRow);

    // 2. 6 Sub-rows
    SUB_ROW_LABELS.forEach((label, ri) => {
      const row: any[] = ['', '', '', '', '', '', label];
      for (let d = 0; d < days; d++) {
        row.push(part.rows[ri][d * 2]?.v ?? '', part.rows[ri][d * 2 + 1]?.v ?? '');
      }
      row.push(part.totals[ri]?.v ?? '');
      rows.push(row);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch:6 },{ wch:15 },{ wch:12 },{ wch:18 },{ wch:12 },{ wch:15 },{ wch:22 }, ...Array(days*2).fill({ wch:5 }), { wch:12 }];
  const merges: any[] = [];
  displayParts.value.forEach((_, i) => {
    const sr = 2 + i * 7;
    for (let c = 0; c < 6; c++) merges.push({ s: { r: sr, c }, e: { r: sr + 6, c } });
  });
  ws['!merges'] = merges;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'History Mutasi');
  XLSX.writeFile(wb, `${sheetTitle}.xlsx`);
};

onMounted(() => { fetchData(); });
watch(selectedPeriod, fetchData);
watch([searchPartNumber, searchModel, selectedRouting], applySearch);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <div class="flex flex-col gap-4">
    <!-- Alert Banner -->
    <v-alert
      v-if="showAlert"
      type="success"
      variant="tonal"
      closable
      class="mb-2 !bg-emerald-50 !text-emerald-900 border border-emerald-200 rounded-xl"
      @click:close="showAlert = false"
    >
      <span class="text-sm font-semibold">{{ alertMessage }}</span>
    </v-alert>

    <!-- Filter Card -->
    <v-card class="elevation-1 rounded-xl border border-slate-100 !bg-white">
      <v-card-text class="pa-4">
        <div class="flex flex-wrap gap-4 items-center justify-between">
          <div class="flex flex-wrap gap-4 items-center grow">
            <!-- Month picker -->
            <div class="w-48">
              <v-text-field
                v-model="selectedPeriod"
                type="month"
                label="Periode"
                variant="outlined"
                density="compact"
                hide-details
                rounded="lg"
                class="premium-input"
              ></v-text-field>
            </div>

            <!-- Search Part Number -->
            <div class="w-56">
              <v-text-field
                v-model="searchPartNumber"
                label="Cari Part Number"
                variant="outlined"
                density="compact"
                hide-details
                rounded="lg"
                clearable
                :prepend-inner-icon="SearchOutlined"
                class="premium-input"
              ></v-text-field>
            </div>

            <!-- Search Model / Route -->
            <div class="w-48">
              <v-text-field
                v-model="searchModel"
                label="Cari Model / Route"
                variant="outlined"
                density="compact"
                hide-details
                rounded="lg"
                clearable
                :prepend-inner-icon="SearchOutlined"
                class="premium-input"
              ></v-text-field>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shadow-sm"
              @click="clearFilters"
            >
              Clear
            </button>

            <button
              type="button"
              class="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
              :disabled="loading"
              @click="fetchData"
            >
              <SyncOutlined :spin="loading" />
              <span>Reload</span>
            </button>

            <button
              type="button"
              class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!displayParts.length"
              @click="exportToExcel"
            >
              <FileExcelOutlined />
              <span>Export</span>
            </button>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Routing Tabs -->
    <v-card v-if="routingOptions.length > 1" class="elevation-1 rounded-xl border border-slate-100 !bg-white px-2 py-1">
      <v-tabs
        v-model="selectedRouting"
        color="indigo"
        density="compact"
        show-arrows
        class="routing-tabs"
      >
        <v-tab
          v-for="r in routingOptions"
          :key="r"
          :value="r"
          class="font-weight-bold text-xs"
        >
          <span v-if="r === 'ALL'">SEMUA ROUTING ({{ partMetas.length }})</span>
          <span v-else>{{ r }} ({{ partMetas.filter(p => p.zrouting === r).length }})</span>
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Mutasi Grid Table Card -->
    <v-card class="elevation-1 rounded-xl border border-slate-100 overflow-hidden">
      <div v-if="loading" class="flex flex-col items-center justify-center py-16 gap-3">
        <v-progress-circular indeterminate color="indigo" size="48"></v-progress-circular>
        <span class="text-sm font-semibold text-slate-500">Memuat data history mutasi...</span>
      </div>

      <div v-else-if="!displayParts.length" class="flex flex-col items-center justify-center py-16 gap-3 bg-white">
        <CloseCircleOutlined class="text-slate-300 text-5xl" />
        <span class="text-sm font-semibold text-slate-500">Tidak ada data history mutasi untuk filter ini.</span>
      </div>

      <div v-else class="w-full overflow-x-auto scrollbar-premium bg-white">
        <table class="planning-table">
          <thead>
            <!-- Row 1: Dates & Excel Filter Headers -->
            <tr>
              <th rowspan="2" class="header-cell sticky-col col-no">NO</th>

              <th
                v-for="col in HEADER_COLS"
                :key="col.key"
                rowspan="2"
                class="header-cell sticky-col"
                :class="col.cls"
              >
                <v-menu :close-on-content-click="false" location="bottom start">
                  <template #activator="{ props: menuProps }">
                    <div
                      class="flex items-center justify-between w-full h-full px-1 cursor-pointer select-none gap-1 group"
                      v-bind="menuProps"
                    >
                      <span class="truncate">{{ col.label }}</span>
                      <FilterOutlined
                        :class="isColFiltered(col.key) ? '!text-amber-300 font-extrabold text-xs' : 'text-slate-300 opacity-60 group-hover:opacity-100'"
                      />
                    </div>
                  </template>

                  <!-- Excel Filter Card Menu -->
                  <v-card class="excel-filter-card rounded-xl border border-slate-200 shadow-2xl bg-white text-slate-800" width="260">
                    <div class="pa-3 flex flex-col gap-2.5">
                      <!-- Header title -->
                      <div class="flex items-center justify-between font-bold text-xs border-b border-slate-100 pb-2 text-slate-700">
                        <span>Filter: {{ col.label }}</span>
                        <v-chip size="x-small" color="indigo" variant="tonal" class="font-bold">Excel Style</v-chip>
                      </div>

                      <!-- Sort Actions -->
                      <div class="flex flex-col gap-1 pb-2 border-b border-slate-100">
                        <button
                          type="button"
                          class="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 rounded-lg transition-colors text-left"
                          :class="{ 'bg-indigo-50 font-bold !text-indigo-700': excelFilters[col.key]?.sort === 'ASC' }"
                          @click="applySortExcel(col.key, 'ASC')"
                        >
                          <SortAscendingOutlined />
                          <span>Sort A → Z (Ascending)</span>
                        </button>
                        <button
                          type="button"
                          class="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 rounded-lg transition-colors text-left"
                          :class="{ 'bg-indigo-50 font-bold !text-indigo-700': excelFilters[col.key]?.sort === 'DESC' }"
                          @click="applySortExcel(col.key, 'DESC')"
                        >
                          <SortDescendingOutlined />
                          <span>Sort Z → A (Descending)</span>
                        </button>
                      </div>

                      <!-- Search Input -->
                      <div class="relative">
                        <input
                          v-model="excelFilters[col.key].search"
                          type="text"
                          placeholder="Cari nilai..."
                          class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
                        />
                      </div>

                      <!-- Selection Controls: Select All | Clear All | Invert -->
                      <div class="flex items-center justify-between text-[11px] font-semibold px-1 text-slate-500">
                        <button type="button" class="hover:text-indigo-600 hover:underline" @click="selectAllExcel(col.key)">Select All</button>
                        <button type="button" class="hover:text-slate-700 hover:underline" @click="clearAllExcel(col.key)">Clear All</button>
                        <button type="button" class="hover:text-indigo-600 hover:underline" @click="invertExcel(col.key)">Invert</button>
                      </div>

                      <!-- Checklist Items Container -->
                      <div class="max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-1.5 flex flex-col gap-0.5 bg-slate-50/50 scrollbar-thin">
                        <div
                          v-for="val in getFilteredUniqueValues(col.key)"
                          :key="val"
                          class="flex items-center justify-between text-xs px-2 py-1 hover:bg-white rounded-md transition-colors group/item"
                        >
                          <label class="flex items-center gap-2 cursor-pointer grow truncate pr-1">
                            <input
                              type="checkbox"
                              :checked="excelFilters[col.key]?.selected.has(val)"
                              class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              @change="toggleExcelItem(col.key, val)"
                            />
                            <span class="truncate text-slate-700 font-medium">{{ val }}</span>
                          </label>
                          <button
                            type="button"
                            class="text-[10px] text-indigo-600 font-bold opacity-0 group-hover/item:opacity-100 hover:underline px-1 py-0.5 rounded hover:bg-indigo-50"
                            @click="selectOnlyExcel(col.key, val)"
                          >
                            Only
                          </button>
                        </div>
                      </div>
                    </div>
                  </v-card>
                </v-menu>
              </th>

              <th
                v-for="d in daysInMonth" :key="d"
                colspan="2"
                class="header-cell date-header"
                :class="[todayFlags[d] ? 'today-header' : '', weekendFlags[d] ? 'day-weekend' : '']"
              >
                <div v-if="todayFlags[d]" class="absolute top-0 right-0 left-0 bg-yellow-400 h-0.5"></div>
                <span class="day-num" :class="{ '!text-yellow-300 font-extrabold text-sm scale-110': todayFlags[d] }">{{ d }}</span>
              </th>

              <th rowspan="2" class="header-cell sticky-right total-header">TOTAL</th>
            </tr>
            <!-- Row 2: Shifts -->
            <tr>
              <template v-for="d in daysInMonth" :key="`s-${d}`">
                <th class="header-cell shift-header day-shift" :class="{ 'day-today-shift': todayFlags[d] }">D</th>
                <th class="header-cell shift-header night-shift" :class="{ 'day-today-shift': todayFlags[d] }">N</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <!-- Each part: 1 MDFO row + 1 SALES ORDER row + 6 sub-rows (8 rows total) -->
            <template v-for="(part, pi) in displayParts" :key="part.part_number + pi">
              <!-- ROW 1: MDFO (merged across D/N for each day) -->
              <tr class="row-mdfo" v-if="isRowVisible('MDFO')">
                <!-- Merged metadata (dynamic rowspan based on visible rows count) -->
                <template v-if="getFirstVisibleRow() === 'MDFO'">
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-no merged-cell">{{ part.no }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-cust merged-cell">{{ part.customer }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-model merged-cell">{{ part.model }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-part merged-cell">{{ part.part_number }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-job merged-cell">{{ part.job_number }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-route merged-cell">{{ part.zrouting }}</td>
                </template>

                <!-- DESC label for MDFO -->
                <td class="body-cell sticky-col col-desc desc-mdfo">MDFO</td>

                <!-- Merged daily cells (colspan=2 per day) -->
                <template v-for="d in daysInMonth" :key="`mdfo-${d}`">
                  <td
                    colspan="2"
                    class="data-cell day-cell text-center merged-day-cell desc-mdfo"
                    :class="part.mdfoRow[d - 1]?.cls"
                  >
                    {{ part.mdfoRow[d - 1]?.v }}
                  </td>
                </template>

                <!-- Total MDFO -->
                <td class="body-cell sticky-right total-cell desc-mdfo text-right" :class="part.mdfoTotal?.cls">
                  {{ part.mdfoTotal?.v }}
                </td>
              </tr>

              <!-- ROW 2: SALES ORDER (merged across D/N for each day) -->
              <tr class="row-so" v-if="isRowVisible('SALES ORDER')">
                <!-- Merged metadata (if SO is the first visible row) -->
                <template v-if="getFirstVisibleRow() === 'SALES ORDER'">
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-no merged-cell">{{ part.no }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-cust merged-cell">{{ part.customer }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-model merged-cell">{{ part.model }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-part merged-cell">{{ part.part_number }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-job merged-cell">{{ part.job_number }}</td>
                  <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-route merged-cell">{{ part.zrouting }}</td>
                </template>

                <!-- DESC label for SALES ORDER -->
                <td class="body-cell sticky-col col-desc desc-so">SALES ORDER</td>

                <!-- Merged daily cells (colspan=2 per day) -->
                <template v-for="d in daysInMonth" :key="`so-${d}`">
                  <td
                    colspan="2"
                    class="data-cell day-cell text-center merged-day-cell desc-so"
                    :class="part.soRow[d - 1]?.cls"
                  >
                    {{ part.soRow[d - 1]?.v }}
                  </td>
                </template>

                <!-- Total SALES ORDER -->
                <td class="body-cell sticky-right total-cell desc-so text-right" :class="part.soTotal?.cls">
                  {{ part.soTotal?.v }}
                </td>
              </tr>

              <!-- ROWS 3 to 8: 6 D/N Sub-rows (PCS/DAY, STOK AWAL, QTY IN, QTY OUT, ACTUAL STOCK, STRENGTH) -->
              <template v-for="(rowMeta, ri) in SUB_ROW_META" :key="`${pi}-${ri}`">
                <tr
                  v-if="isRowVisible(rowMeta.label)"
                  :class="[rowMeta.rowCls, ri === 5 ? 'row-group-end' : '']"
                >
                  <!-- Merged metadata (if this sub-row is the first visible row) -->
                  <template v-if="getFirstVisibleRow() === rowMeta.label">
                    <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-no merged-cell">{{ part.no }}</td>
                    <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-cust merged-cell">{{ part.customer }}</td>
                    <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-model merged-cell">{{ part.model }}</td>
                    <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-part merged-cell">{{ part.part_number }}</td>
                    <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-job merged-cell">{{ part.job_number }}</td>
                    <td :rowspan="getVisibleRowsCount()" class="body-cell sticky-col col-route merged-cell">{{ part.zrouting }}</td>
                  </template>

                  <!-- DESC label -->
                  <td class="body-cell sticky-col col-desc" :class="rowMeta.descCls">{{ rowMeta.label }}</td>

                  <!-- Data cells (D / N split) -->
                  <template v-for="d in daysInMonth" :key="d">
                    <td class="data-cell day-cell" :class="part.rows[ri][(d-1)*2]?.cls">{{ part.rows[ri][(d-1)*2]?.v }}</td>
                    <td class="data-cell night-cell" :class="part.rows[ri][(d-1)*2+1]?.cls">{{ part.rows[ri][(d-1)*2+1]?.v }}</td>
                  </template>

                  <!-- Total -->
                  <td class="body-cell sticky-right total-cell" :class="[rowMeta.descCls, part.totals[ri]?.cls]">{{ part.totals[ri]?.v }}</td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.premium-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.15;
  border-radius: 8px;
}
.premium-input :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 1;
  color: rgb(79, 70, 229);
}

/* â”€â”€ Base planning-table from welding mutation â”€â”€ */
.planning-table {
  table-layout: fixed;
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  contain: layout style;
}

/* â”€â”€ Header cells from TableHeader.vue â”€â”€ */
.header-cell {
  background: linear-gradient(180deg, #3b5998 0%, #2d4373 100%);
  color: #fff;
  font-weight: 600;
  font-size: 11px;
  padding: 6px 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
  box-sizing: border-box;
}



.day-num {
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.3px;
}

.day-weekend {
  background: linear-gradient(180deg, #c0392b 0%, #96281b 100%) !important;
  color: white !important;
}

.shift-header {
  font-size: 10px;
  padding: 3px 0;
  width: 38px !important;
  min-width: 38px !important;
  max-width: 38px !important;
  box-sizing: border-box;
}

.date-header {
  width: 76px !important;
  min-width: 76px !important;
  max-width: 76px !important;
  box-sizing: border-box;
}

/* ── Sticky left metadata columns ── */
.sticky-col {
  position: sticky !important;
  z-index: 100 !important;
}

thead th.sticky-col {
  background: linear-gradient(180deg, #3b5998 0%, #2d4373 100%) !important;
}

tbody td.sticky-col {
  background: white;
  z-index: 90 !important;
}

.col-no { width: 42px; min-width: 42px; left: 0px; }
.col-cust { width: 100px; min-width: 100px; left: 42px; }
.col-model { width: 80px; min-width: 80px; left: 142px; }
.col-part { width: 140px; min-width: 140px; left: 222px; }
.col-job { width: 90px; min-width: 90px; left: 362px; }
.col-route { width: 110px; min-width: 110px; left: 452px; }
.col-desc {
  width: 130px;
  min-width: 130px;
  left: 562px;
  border-right: 2px solid #2e5396 !important;
  box-shadow: 3px 0 6px rgba(0,0,0,0.12);
}

/* â”€â”€ Sticky right TOTAL column â”€â”€ */
.sticky-right {
  position: sticky;
  right: 0;
  border-left: 2px solid #2e5396 !important;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
  z-index: 100 !important;
  background: #f2f2f2;
  font-weight: bold;
  text-align: right;
  padding-right: 8px;
  width: 95px;
  min-width: 95px;
}

thead th.sticky-right {
  background: linear-gradient(180deg, #3b5998 0%, #2d4373 100%) !important;
  color: white;
}

tbody td.sticky-right {
  background: #f2f2f2 !important;
  z-index: 90 !important;
}

/* â”€â”€ Body cells â”€â”€ */
.body-cell {
  padding: 3px 4px;
  height: 24px;
  max-height: 24px;
  border-top: 1px solid #c8c8c8;
  border-bottom: 1px solid #c8c8c8;
  border-left: 1px solid #c8c8c8;
  border-right: 1px solid #c8c8c8;
  background: white;
  font-size: 10px;
  white-space: nowrap;
  vertical-align: middle;
  box-sizing: border-box;
}

.merged-cell {
  font-weight: 600;
  text-align: center;
  vertical-align: middle;
}

/* ── Description label colors ── */
.desc-mdfo {
  background: #e3f2fd !important;
  color: #0d47a1 !important;
  font-weight: 600;
  font-size: 10px;
}
.row-mdfo .merged-day-cell {
  background: #f0f7ff !important;
  text-align: center !important;
  vertical-align: middle;
}
.desc-so {
  background: #e8f5e9 !important;
  color: #1b5e20 !important;
  font-weight: 600;
  font-size: 10px;
}
.row-so .merged-day-cell {
  background: #f1f8e9 !important;
  text-align: center !important;
  vertical-align: middle;
}
.desc-pcs-per-day {
  background: #f3f9e8 !important;
  color: #558b2f !important;
  font-weight: 600;
  font-size: 10px;
}
.desc-stok-awal {
  background: #e0f2fe !important;
  color: #0369a1 !important;
  font-weight: 600;
  font-size: 10px;
}
.desc-qty-in {
  background: #f3e5f5 !important;
  color: #7b1fa2 !important;
  font-weight: 600;
  font-size: 10px;
}
.desc-qty-out {
  background: #e7f3ff !important;
  color: #0066cc !important;
  font-weight: 600;
  font-size: 10px;
}
.desc-stock {
  background: #e8eaf6 !important;
  color: #283593 !important;
  font-weight: 600;
  font-size: 10px;
}
.desc-strength {
  background: #fce4ec !important;
  color: #880e4f !important;
  font-weight: 600;
  font-size: 10px;
}

/* â”€â”€ Row backgrounds â”€â”€ */
.row-pcs-per-day .day-cell,
.row-pcs-per-day .night-cell {
  background: #f7fcf0 !important;
}
.row-stok-awal .day-cell,
.row-stok-awal .night-cell {
  background: #f0f9ff !important;
}
.row-qty-in .day-cell,
.row-qty-in .night-cell {
  background: #faf0fe !important;
}
.row-qty-out .day-cell,
.row-qty-out .night-cell {
  background: #ebf4ff !important;
}
.row-stock .day-cell,
.row-stock .night-cell {
  background: #f0f1fb !important;
}
.row-strength .day-cell,
.row-strength .night-cell {
  background: #fef5f8 !important;
}

/* â”€â”€ Data cells & shift border styling â”€â”€ */
.data-cell {
  text-align: right;
  padding: 2px 4px;
  height: 24px;
  max-height: 24px;
  font-size: 10px;
  white-space: nowrap;
  vertical-align: middle;
  border-top: 1px solid #c8c8c8;
  border-bottom: 1px solid #c8c8c8;
  border-left: 1px solid #d8d8d8;
  box-sizing: border-box;
}
/* D cell: dashed right = soft separator inside a day pair */
.day-cell {
  border-right: 1px dashed #bbb !important;
  width: 38px !important;
  min-width: 38px !important;
  max-width: 38px !important;
  box-sizing: border-box;
  background: #fefce8 !important; /* soft yellow background */
}
/* N cell: solid right = hard separator between day pairs */
.night-cell {
  border-right: 2px solid #aaa !important;
  width: 38px !important;
  min-width: 38px !important;
  max-width: 38px !important;
  box-sizing: border-box;
  background: #faf5ff !important; /* soft purple background */
}
/* Shift Headers (D & N) */
.day-shift {
  background: #fef08a !important; /* solid light yellow */
  color: #854d0e !important;       /* dark yellow text */
}
.night-shift {
  background: #e9d5ff !important; /* solid light purple */
  color: #581c87 !important;       /* dark purple text */
}
/* Merged day cell for MDFO (colspan=2) */
.merged-day-cell {
  width: 76px !important;
  min-width: 76px !important;
  max-width: 76px !important;
  box-sizing: border-box;
}
/* Last row of each part group â€“ strong bottom border */
.row-group-end td {
  border-bottom: 2px solid #2e5396 !important;
}
/* Row hover highlight */
tr:not(:has(td[rowspan])):hover .data-cell,
tr:hover .data-cell {
  filter: brightness(0.96);
}

/* â”€â”€ Values status styling â”€â”€ */
.cell-negative {
  background: #ffd7d7 !important;
  color: #c00000 !important;
  font-weight: bold;
}
.strength-safe {
  color: #16a34a !important;   /* green */
  font-weight: 700;
}
.strength-warn {
  color: #ca8a04 !important;   /* yellow/gold */
  font-weight: 700;
}
.strength-danger {
  color: #dc2626 !important;   /* red */
  font-weight: 700;
}

/* â”€â”€ Scrollbars â”€â”€ */
.scrollbar-premium::-webkit-scrollbar {
  height: 12px;
  width: 12px;
}
.scrollbar-premium::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}
.scrollbar-premium::-webkit-scrollbar-thumb {
  background: #4472c4;
  border-radius: 6px;
}
.scrollbar-premium::-webkit-scrollbar-thumb:hover {
  background: #2e5396;
}

.desc-row:hover td:not([rowspan]) {
  filter: brightness(0.97);
}
</style>
