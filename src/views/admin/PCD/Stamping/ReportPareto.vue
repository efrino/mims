<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import { useUtilityStore } from '@/stores/utility';
import { useReportParetoStamping } from '@/stores/PCD/Stamping/ReportPareto';
import type { AkurasiDetailRow, AkurasiListItem, DateMode, PartListItem, RejectDetailRow, RejectListDetail, RejectListItem, RepairDetailRow } from '@/types/PCD/Stamping/ReportPareto';
import DatePickerButton from '@/components/date/DatePickerButton.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';
import TableExcel from '@/components/table/TableExcel.vue';
import type { TableColumn } from '@/components/table/TableBasic.vue';
import * as XLSX from 'xlsx';

const breadcrumbs = shallowRef([
  { title: 'PCD', disabled: false, href: '#' },
  { title: 'Stamping', disabled: false, href: '#' },
  { title: 'Report Pareto', disabled: true, href: '#' }
]);

const reportParetoStore = useReportParetoStamping();
const { categories, activeCategory, activeCategoryConfig, params, weekRanges, allData, selectedProblem, selectedDefect, selectedPart, rejectDept, rejectChartLimit, repairLayer } = storeToRefs(reportParetoStore);
const utilityStore = useUtilityStore();

const page = computed(() => ({ title: `Report Pareto - ${activeCategoryConfig.value.title}` }));

const modes: { value: DateMode; label: string }[] = [
  { value: 'harian', label: 'Harian' },
  { value: 'mingguan', label: 'Mingguan' },
  { value: 'akumulasi', label: 'Akumulasi' }
];

const deptOptions = [
  { value: 'PRESS', label: 'Press' },
  { value: 'WELDING', label: 'Welding' },
  { value: 'IFP', label: 'IFP' },
  { value: 'IRM', label: 'IRM' },
  { value: 'ALL', label: 'Semua' }
];
const chartLimitOptions: (number | 'all')[] = [5, 10, 20, 50, 'all'];

const lastSyncLabel = computed(() => {
  if (!allData.value.last_sync?.finished_at) return null;
  return utilityStore.formatDate(allData.value.last_sync.finished_at, 'D/M/YYYY HH.mm');
});

// Filter layer Repair Rate cuma STAMPING & WELDING - sama dgn LAYER_OPTIONS di backend.
const layerOptions = [
  { value: '', label: 'Semua' },
  { value: 'STAMPING', label: 'Stamping' },
  { value: 'WELDING', label: 'Welding' }
];

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const yearOptions = computed(() => {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1];
});

onMounted(async () => {
  await reportParetoStore.fetchAllData(true);
});

watch(
  () => params.value.date,
  async () => {
    if (params.value.mode === 'harian') await reportParetoStore.fetchAllData();
  }
);

watch(
  () => [params.value.month, params.value.year, params.value.week],
  async () => {
    if (params.value.mode === 'mingguan') await reportParetoStore.fetchAllData();
  }
);

watch(
  () => [params.value.start, params.value.end],
  async () => {
    if (params.value.mode === 'akumulasi') await reportParetoStore.fetchAllData();
  }
);

const selectWeek = (weekId: string) => {
  params.value.week = Number(weekId);
};

const CHART_W = 640;
const CHART_H = 300;
const PAD = { top: 40, right: 50, bottom: 46, left: 44 };

interface BarGeom {
  category: string;
  categoryLines: string[];
  qty: number;
  cummPct: number;
  x: number;
  width: number;
  barY: number;
  barHeight: number;
  cx: number;
  lineY: number;
  pctBoxY: number;
  valueBoxY: number;
}

interface AxisTick {
  value: number;
  y: number;
}

interface ChartGeom {
  bars: BarGeom[];
  linePoints: string;
  leftTicks: AxisTick[];
  rightTicks: AxisTick[];
}

function niceScale(maxValue: number): { max: number; step: number } {
  if (maxValue <= 0) return { max: 10, step: 2 };
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const max = Math.ceil(maxValue / magnitude) * magnitude;
  return { max, step: magnitude };
}

function splitLabel(label: string): string[] {
  if (label.length <= 10) return [label];
  const idx = label.indexOf('-', 3);
  if (idx > 0 && idx < label.length - 1) {
    return [label.slice(0, idx + 1), label.slice(idx + 1)];
  }
  return [label];
}

const chartData = (key: string) => (allData.value.charts[key] ?? []).filter((d) => d.category !== 'LAINNYA');

const hasCummLine = (key: string) => key !== 'item_akurasi_model_terendah';

const isDrilldownChart = (key: string) =>
  key === 'roc_repair' || key === 'akurasi_model' || key === 'roc_reject' || key === 'item_reject' || key === 'part_reject';

const chartTitle = (chart: { key: string; title: string }) => {
  if (chart.key === 'item_repair' && selectedProblem.value) {
    return `Pareto Item Repair ${selectedProblem.value}`;
  }
  if (chart.key === 'item_akurasi_model_terendah' && selectedProblem.value) {
    return `Item Akurasi Model Terendah ${selectedProblem.value}`;
  }
  if (chart.key === 'item_reject' && selectedProblem.value) {
    return `Pareto Item Reject ${selectedProblem.value}`;
  }
  if (chart.key === 'part_reject' && selectedDefect.value) {
    return `Pareto Part Reject ${selectedDefect.value}`;
  }
  if (chart.key === 'line_reject' && selectedPart.value) {
    return `Pareto Reject Per Line ${selectedPart.value}`;
  }
  return chart.title;
};

function buildChartGeom(key: string): ChartGeom | null {
  const data = chartData(key);
  if (!data.length) return null;

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const barSlot = innerW / data.length;

  const { max: maxQty, step } = niceScale(Math.max(...data.map((d) => d.qty)));

  const leftTicks: AxisTick[] = [];
  for (let v = 0; v <= maxQty; v += step) {
    leftTicks.push({ value: v, y: PAD.top + innerH - (v / maxQty) * innerH });
  }

  const rightTicks: AxisTick[] = [0, 25, 50, 75, 100].map((p) => ({
    value: p,
    y: PAD.top + innerH - (p / 100) * innerH
  }));

  const bars: BarGeom[] = data.map((d, idx) => {
    const x = PAD.left + idx * barSlot;
    const cx = x + barSlot / 2;
    const barHeight = (d.qty / maxQty) * innerH;
    const barY = PAD.top + innerH - barHeight;
    const cummPct = parseFloat(d.cumm_pct);
    const lineY = PAD.top + innerH - (Math.min(cummPct, 100) / 100) * innerH;

    return {
      category: d.category,
      categoryLines: splitLabel(d.category),
      qty: d.qty,
      cummPct,
      x,
      width: barSlot,
      barY,
      barHeight,
      cx,
      lineY,
      pctBoxY: 0,
      valueBoxY: 0
    };
  });

  const lineYAt = (i: number, x: number): number => {
    const b = bars[i];
    if (x < b.cx && i > 0) {
      const p = bars[i - 1];
      return p.lineY + ((x - p.cx) / (b.cx - p.cx)) * (b.lineY - p.lineY);
    }
    if (x > b.cx && i < bars.length - 1) {
      const n = bars[i + 1];
      return b.lineY + ((x - b.cx) / (n.cx - b.cx)) * (n.lineY - b.lineY);
    }
    return b.lineY;
  };

  bars.forEach((b, i) => {
    b.pctBoxY = b.lineY - 18;

    if (!hasCummLine(key)) {
      b.valueBoxY = Math.max(b.barY - 12, PAD.top + 10);
      return;
    }

    const gap = 4;
    const lineLo = Math.min(b.lineY, lineYAt(i, b.cx - 22), lineYAt(i, b.cx + 22));
    const lineHi = Math.max(b.lineY, lineYAt(i, b.cx - 22), lineYAt(i, b.cx + 22));

    const blockedTop = Math.min(b.pctBoxY - 14, lineLo - 5) - gap;
    const blockedBottom = lineHi + 5 + gap;

    const defaultY = Math.max(b.barY - 12, PAD.top + 10);
    const overlaps = defaultY + 3 > blockedTop && defaultY - 15 < blockedBottom;

    b.valueBoxY = overlaps
      ? Math.min(blockedBottom + 15, CHART_H - PAD.bottom - 6)
      : defaultY;
  });

  const linePoints = hasCummLine(key) ? bars.map((b) => `${b.cx},${b.lineY}`).join(' ') : '';

  return { bars, linePoints, leftTicks, rightTicks };
}

const chartGeoms = computed<Record<string, ChartGeom | null>>(() => {
  const result: Record<string, ChartGeom | null> = {};
  for (const cat of categories.value) {
    for (const c of cat.charts) {
      result[c.key] = buildChartGeom(c.key);
    }
  }
  return result;
});

const barFill = (key: string, category: string) => {
  if (key === 'item_reject') return selectedDefect.value === category ? '#9f0512' : '#E30613';
  if (key === 'part_reject') return selectedPart.value === category ? '#9f0512' : '#E30613';
  if (isDrilldownChart(key) && selectedProblem.value === category) return '#9f0512';
  return '#E30613';
};

const onBarClick = (key: string, category: string) => {
  if (key === 'item_reject') {
    reportParetoStore.selectDefect(category);
  } else if (key === 'part_reject') {
    reportParetoStore.selectPart(category);
  } else if (isDrilldownChart(key)) {
    reportParetoStore.selectProblem(category);
  }
};

const hoveredCategory = ref<Record<string, string | null>>({});

const setHover = (key: string, category: string | null) => {
  hoveredCategory.value = { ...hoveredCategory.value, [key]: category };
};

const hoveredBar = (key: string): BarGeom | null => {
  const category = hoveredCategory.value[key];
  if (!category) return null;
  return chartGeoms.value[key]?.bars.find((b) => b.category === category) ?? null;
};

const svgRefs = ref<Record<string, SVGSVGElement | null>>({});
const setSvgRef = (key: string, el: Element | null) => {
  svgRefs.value[key] = (el as SVGSVGElement | null) ?? null;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const serializeSvg = (svgEl: SVGSVGElement) => {
  let source = new XMLSerializer().serializeToString(svgEl);
  if (!source.includes('xmlns=')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/<svg[^>]*\swidth=/.test(source)) {
    source = source.replace('<svg', `<svg width="${CHART_W}" height="${CHART_H}"`);
  }
  return source;
};

const downloadFilename = (title: string, ext: string) => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyymmdd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const hhmmss = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${slugify(title)}_${yyyymmdd}_${hhmmss}.${ext}`;
};

const downloadSvg = (key: string, title: string) => {
  const svgEl = svgRefs.value[key];
  if (!svgEl) return;
  const blob = new Blob([serializeSvg(svgEl)], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, downloadFilename(title, 'svg'));
};

const downloadPng = (key: string, title: string) => {
  const svgEl = svgRefs.value[key];
  if (!svgEl) return;

  const svgBlob = new Blob([serializeSvg(svgEl)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = CHART_W * scale;
    canvas.height = CHART_H * scale;
    const ctx = canvas.getContext('2d');
    URL.revokeObjectURL(url);
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, CHART_W, CHART_H);

    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, downloadFilename(title, 'png'));
    }, 'image/png');
  };

  img.src = url;
};

const downloadCsv = (key: string, title: string) => {
  const rows = chartData(key);
  const header = 'category,Qty,Kumulatif %';
  const body = rows.map((d) => `${d.category},${d.qty},${d.cumm_pct}`).join('\n');
  const blob = new Blob([`﻿${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, downloadFilename(title, 'csv'));
};

interface AggregatedRow {
  part_number: string;
  part_name: string | null;
  job_number: string;
  pcs_qty_repair: number;
  problem_repair: string;
  pcs_qty_reject: number | null;
  problem_reject: string;
  accuracy: number | null;
  reject_details: RejectDetailRow[];
  akurasi_details: AkurasiDetailRow[];
}

const repairList = computed(() => allData.value.list as PartListItem[]);
const akurasiList = computed(() => allData.value.list as AkurasiListItem[]);
const rejectList = computed(() => allData.value.list as RejectListItem[]);

const aggregatedList = computed<AggregatedRow[]>(() => {
  const byPartProblem = new Map<
    string,
    {
      part_number: string;
      part_name: string | null;
      job_number: string;
      problems: Set<string>;
      accuracy: number | null;
      reject_details: RejectDetailRow[];
      akurasi_details: AkurasiDetailRow[];
      achievements: Map<number, { qty_ok: number; qty_ng: number }>;
      rejectByDate: Map<string, { reject: number; problem_reject: string | null }>;
    }
  >();

  const rows = selectedProblem.value
    ? repairList.value.filter((row) => row.problem === selectedProblem.value)
    : repairList.value;

  for (const row of rows) {
    const key = row.part_number;
    if (!byPartProblem.has(key)) {
      byPartProblem.set(key, {
        part_number: row.part_number,
        part_name: row.part_name,
        job_number: row.job_number,
        problems: new Set(),
        accuracy: null,
        reject_details: row.reject_details ?? [],
        akurasi_details: row.akurasi_details ?? [],
        achievements: new Map(),
        rejectByDate: new Map()
      });
    }
    const bucket = byPartProblem.get(key)!;
    bucket.problems.add(row.problem);

    if (!bucket.achievements.has(row.achievement_id)) {
      bucket.achievements.set(row.achievement_id, { qty_ok: row.qty_ok ?? 0, qty_ng: row.qty_ng ?? 0 });
    }

    if (row.reject !== null && !bucket.rejectByDate.has(row.date)) {
      bucket.rejectByDate.set(row.date, { reject: row.reject, problem_reject: row.problem_reject });
    }

    if (bucket.accuracy === null && row.accuracy !== null) {
      bucket.accuracy = row.accuracy;
    }
  }

  const result: AggregatedRow[] = [];
  byPartProblem.forEach((bucket) => {
    const pcs_qty_repair = Array.from(bucket.achievements.values()).reduce((sum, a) => sum + a.qty_ok + a.qty_ng, 0);
    const rejectEntries = Array.from(bucket.rejectByDate.values());
    const pcs_qty_reject = rejectEntries.length ? rejectEntries.reduce((sum, r) => sum + r.reject, 0) : null;
    const problemRejectSet = new Set(rejectEntries.map((r) => r.problem_reject).filter((v): v is string => !!v));

    result.push({
      part_number: bucket.part_number,
      part_name: bucket.part_name,
      job_number: bucket.job_number,
      problem_repair: Array.from(bucket.problems).sort().join(', '),
      pcs_qty_repair,
      pcs_qty_reject,
      problem_reject: problemRejectSet.size ? Array.from(problemRejectSet).sort().join(', ') : '-',
      accuracy: bucket.accuracy,
      reject_details: bucket.reject_details,
      akurasi_details: bucket.akurasi_details
    });
  });

  return result.sort((a, b) => b.pcs_qty_repair - a.pcs_qty_repair);
});

const firstProblem = (value: string | null | undefined): string => {
  if (!value) return '-';
  const first = value.split(',')[0]?.trim();
  return first || '-';
};

const aggregatedAkurasiList = computed(() => {
  const byPart = new Map<string, AkurasiListItem>();

  const rows = selectedProblem.value
    ? akurasiList.value.filter((row) => row.type === selectedProblem.value)
    : akurasiList.value;

  for (const row of rows) {
    const existing = byPart.get(row.part_no);
    if (!existing || row.date > existing.date) {
      byPart.set(row.part_no, row);
    }
  }

  return Array.from(byPart.values()).sort((a, b) => (a.accuracy_pct ?? 0) - (b.accuracy_pct ?? 0));
});

const listColumns = computed<TableColumn[]>(() => {
  if (activeCategory.value === 'tpm-akurasi') {
    return [
      { key: 'part_no', label: 'Part Number' },
      { key: 'job_number', label: 'Job Number' },
      { key: 'part_name', label: 'Part Name' },
      { key: 'accuracy_pct', label: 'Akurasi', align: 'right' },
      { key: 'pcs_qty_repair', label: 'Pcs Qty Repair', align: 'right' },
      { key: 'problem_repair', label: 'Problem Repair', align: 'center' },
      { key: 'pcs_qty_reject', label: 'Pcs Qty Reject', align: 'right' },
      { key: 'problem_reject', label: 'Problem Reject', align: 'center' }
    ];
  }

  if (activeCategory.value === 'reject-rate') {
    return [
      { key: 'part_number', label: 'Part Number' },
      { key: 'job_number', label: 'Job Number' },
      { key: 'part_name', label: 'Part Name' },
      { key: 'pcs_qty_reject', label: 'Pcs Qty Reject', align: 'right' },
      { key: 'problem_reject', label: 'Problem Reject', align: 'center' },
      { key: 'pcs_qty_repair', label: 'Pcs Qty Repair', align: 'right' },
      { key: 'problem_repair', label: 'Problem Repair', align: 'center' },
      { key: 'accuracy', label: 'Akurasi', align: 'right' }
    ];
  }

  return [
    { key: 'part_number', label: 'Part Number' },
    { key: 'job_number', label: 'Job Number' },
    { key: 'part_name', label: 'Part Name' },
    { key: 'pcs_qty_repair', label: 'Pcs Qty Repair', align: 'right' },
    { key: 'problem_repair', label: 'Problem Repair', align: 'center' },
    { key: 'pcs_qty_reject', label: 'Pcs Qty Reject', align: 'right' },
    { key: 'problem_reject', label: 'Problem Reject', align: 'center' },
    { key: 'accuracy', label: 'Akurasi', align: 'right' }
  ];
});

const listData = computed(() => {
  if (activeCategory.value === 'tpm-akurasi') {
    return aggregatedAkurasiList.value.map((row) => ({
      part_no: row.part_no,
      type: row.type,
      part_no_raw: row.part_no,
      job_number: row.job_number || '-',
      part_name: row.part_name || '-',
      accuracy_pct: row.accuracy_pct !== null ? `${row.accuracy_pct}%` : '-',
      pcs_qty_repair: row.pcs_qty_repair !== null ? utilityStore.formatNumber(row.pcs_qty_repair) : '-',
      problem_repair: firstProblem(row.problem_repair),
      pcs_qty_reject: row.pcs_qty_reject !== null ? utilityStore.formatNumber(row.pcs_qty_reject) : '-',
      problem_reject: firstProblem(row.problem_reject),
      repair_details: row.repair_details,
      reject_details: row.reject_details
    }));
  }

  if (activeCategory.value === 'reject-rate') {
    return rejectList.value.map((row) => ({
      part_number: row.part_number_sap || row.part_number,
      part_number_raw: row.part_number,
      job_number: row.job_number || '-',
      part_name: row.part_name || '-',
      pcs_qty_reject: utilityStore.formatNumber(row.qty),
      problem_reject: row.defects?.[0] || '-',
      pcs_qty_repair: row.pcs_qty_repair !== null ? utilityStore.formatNumber(row.pcs_qty_repair) : '-',
      problem_repair: firstProblem(row.problem_repair),
      accuracy: row.accuracy !== null ? `${row.accuracy}%` : '-',
      repair_details: row.repair_details,
      akurasi_details: row.akurasi_details
    }));
  }

  return aggregatedList.value.map((row) => ({
    part_number: row.part_number,
    part_number_raw: row.part_number,
    job_number: row.job_number || '-',
    part_name: row.part_name || '-',
    pcs_qty_repair: utilityStore.formatNumber(row.pcs_qty_repair),
    problem_repair: row.problem_repair,
    reject_details: row.reject_details,
    akurasi_details: row.akurasi_details,
    pcs_qty_reject: row.pcs_qty_reject !== null ? utilityStore.formatNumber(row.pcs_qty_reject) : '-',
    problem_reject: firstProblem(row.problem_reject),
    accuracy: row.accuracy !== null ? `${row.accuracy}%` : '-'
  }));
});

const detailModalPart = ref<string | null>(null);
const detailModalProblem = ref<string | null>(null);

const detailModalRows = computed<PartListItem[]>(() => {
  if (!detailModalPart.value || activeCategory.value === 'tpm-akurasi') return [];

  const partRows = repairList.value.filter((row) => row.part_number === detailModalPart.value);
  const ids = new Set(
    partRows.filter((row) => !selectedProblem.value || row.problem === selectedProblem.value).map((row) => row.achievement_id)
  );

  const byAchv = new Map<number, PartListItem & { problemSet: Set<string> }>();
  for (const row of partRows) {
    if (!ids.has(row.achievement_id)) continue;
    const existing = byAchv.get(row.achievement_id);
    if (existing) {
      existing.problemSet.add(row.problem);
    } else {
      byAchv.set(row.achievement_id, { ...row, problemSet: new Set([row.problem]) });
    }
  }

  return Array.from(byAchv.values())
    .map(({ problemSet, ...row }) => ({ ...row, problem: Array.from(problemSet).sort().join(', ') }))
    .sort((a, b) => (a.date === b.date ? a.shift - b.shift : b.date.localeCompare(a.date)));
});

const detailModalRowsAkurasi = computed<AkurasiListItem[]>(() => {
  if (!detailModalPart.value || activeCategory.value !== 'tpm-akurasi') return [];
  return akurasiList.value
    .filter((row) => row.part_no === detailModalPart.value)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
});

const detailModalRowsReject = computed<RejectListDetail[]>(() => {
  if (!detailModalPart.value || activeCategory.value !== 'reject-rate') return [];
  const row = rejectList.value.find((r) => r.part_number === detailModalPart.value);
  return row
    ? [...row.details].sort((a, b) => b.reject_date.localeCompare(a.reject_date))
    : [];
});

const detailColumns = computed<TableColumn[]>(() => {
  if (activeCategory.value === 'tpm-akurasi') {
    return [
      { key: 'date', label: 'Tanggal', align: 'center' },
      { key: 'type', label: 'Type', align: 'center' },
      { key: 'accuracy_pct', label: 'Akurasi', align: 'right' },
      { key: 'pcs_qty_repair', label: 'Pcs Qty Repair', align: 'right' },
      { key: 'problem_repair', label: 'Problem Repair', align: 'center' },
      { key: 'pcs_qty_reject', label: 'Pcs Qty Reject', align: 'right' },
      { key: 'problem_reject', label: 'Problem Reject', align: 'center' }
    ];
  }

  if (activeCategory.value === 'reject-rate') {
    return [
      { key: 'doc_number', label: 'No. Dokumen' },
      { key: 'reject_date', label: 'Tgl Reject', align: 'center' },
      { key: 'posting_date', label: 'Tgl Posting', align: 'center' },
      { key: 'roc', label: 'ROC', align: 'center' },
      { key: 'category', label: 'Defect', align: 'center' },
      { key: 'line', label: 'Line', align: 'center' },
      { key: 'shift', label: 'Shift', align: 'center' },
      { key: 'qty', label: 'Qty', align: 'right' }
    ];
  }

  return [
    { key: 'job_number', label: 'Job Number' },
    { key: 'date', label: 'Tanggal', align: 'center' },
    { key: 'shift', label: 'Shift', align: 'center' },
    { key: 'qty_ok', label: 'Qty OK', align: 'right' },
    { key: 'qty_ng', label: 'Qty NG', align: 'right' },
    { key: 'problem', label: 'Problem Repair', align: 'center' },
    { key: 'reject', label: 'Reject', align: 'right' },
    { key: 'problem_reject', label: 'Problem Reject', align: 'center' }
  ];
});

const detailModalData = computed(() => {
  if (activeCategory.value === 'tpm-akurasi') {
    return detailModalRowsAkurasi.value.map((row) => ({
      date: row.date,
      type: row.type || '-',
      accuracy_pct: row.accuracy_pct !== null ? `${row.accuracy_pct}%` : '-',
      pcs_qty_repair: row.pcs_qty_repair !== null ? utilityStore.formatNumber(row.pcs_qty_repair) : '-',
      problem_repair: row.problem_repair || '-',
      pcs_qty_reject: row.pcs_qty_reject !== null ? utilityStore.formatNumber(row.pcs_qty_reject) : '-',
      problem_reject: firstProblem(row.problem_reject)
    }));
  }

  if (activeCategory.value === 'reject-rate') {
    return detailModalRowsReject.value.map((row) => ({
      doc_number: `${row.doc_number}-${row.doc_item}`,
      reject_date: row.reject_date,
      posting_date: row.posting_date,
      roc: row.roc,
      category: row.category,
      line: row.line,
      shift: row.shift,
      qty: utilityStore.formatNumber(row.qty)
    }));
  }

  return detailModalRows.value.map((row) => ({
    job_number: row.job_number,
    date: row.date,
    shift: row.shift,
    qty_ok: row.qty_ok !== null ? utilityStore.formatNumber(row.qty_ok) : '-',
    qty_ng: row.qty_ng !== null ? utilityStore.formatNumber(row.qty_ng) : '-',
    problem: row.problem,
    reject: row.reject !== null ? utilityStore.formatNumber(row.reject) : '-',
    problem_reject: row.problem_reject || '-'
  }));
});

const detailModalTitle = computed(() => {
  if (activeCategory.value === 'tpm-akurasi') return 'Detail Akurasi';
  if (activeCategory.value === 'reject-rate') return 'Detail Reject';
  return 'Detail Repair';
});

const openDetailModal = (row: Record<string, unknown>) => {
  if (activeCategory.value === 'tpm-akurasi') {
    detailModalPart.value = (row.part_no_raw ?? row.part_no) as string;
    detailModalProblem.value = (row.type as string) || null;
    return;
  }
  if (activeCategory.value === 'reject-rate') {
    detailModalPart.value = (row.part_number_raw ?? row.part_number) as string;
    detailModalProblem.value = (row.problem_reject as string) || null;
    return;
  }
  detailModalPart.value = (row.part_number_raw ?? row.part_number) as string;
  detailModalProblem.value = row.problem_repair as string;
};


const activeFilters = computed(() => {
  const out: { label: string; value: string; clear: () => void }[] = [];

  if (selectedProblem.value) {
    out.push({
      label: activeCategory.value === 'tpm-akurasi' ? 'Type' : 'ROC',
      value: selectedProblem.value,
      clear: () => reportParetoStore.selectProblem(selectedProblem.value as string)
    });
  }
  if (selectedDefect.value) {
    out.push({
      label: 'Defect',
      value: selectedDefect.value,
      clear: () => reportParetoStore.selectDefect(selectedDefect.value as string)
    });
  }
  if (selectedPart.value) {
    out.push({
      label: 'Part',
      value: selectedPart.value,
      clear: () => reportParetoStore.selectPart(selectedPart.value as string)
    });
  }

  return out;
});

// ── Export Excel ────────────────────────────────────────────────────
// Isi file = baris yg sedang tampil di tabel (sesudah filter kolom & sort TableExcel, sebelum
// paginasi) dgn kolom sesuai tabel yg aktif - filter layer & drill-down chart ikut karena
// datanya sudah tersaring dari backend.
type ExportableTable = { getVisibleRows: () => Record<string, unknown>[]; isAnyFilterActive?: boolean } | null;

const mainTableRef = ref<ExportableTable>(null);
const detailTableRef = ref<ExportableTable>(null);
const crossTableRef = ref<ExportableTable>(null);

// Tabel menampilkan angka yg sudah diformat (formatNumber: titik ribuan, akurasi: "92.31%").
// Di Excel dikembalikan jadi angka asli supaya bisa dijumlah/difilter, dgn format sel masing2.
const QTY_KEYS = new Set(['pcs_qty_repair', 'pcs_qty_reject', 'qty', 'qty_ok', 'qty_ng', 'reject', 'shift']);
const PCT_KEYS = new Set(['accuracy', 'accuracy_pct']);
const DATE_KEYS = new Set(['date', 'reject_date', 'posting_date']);

const toExcelCell = (key: string, value: unknown): XLSX.CellObject | null => {
  if (value === null || value === undefined || value === '' || value === '-') return null;

  if (QTY_KEYS.has(key)) {
    const n = typeof value === 'number' ? value : Number(String(value).replace(/\./g, ''));
    if (!isNaN(n)) return { t: 'n', v: n, z: key === 'shift' ? '0' : '#,##0' };
  }

  if (PCT_KEYS.has(key)) {
    const n = parseFloat(String(value).replace('%', ''));
    if (!isNaN(n)) return { t: 'n', v: n / 100, z: '0.00%' };
  }

  if (DATE_KEYS.has(key)) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (m) return { t: 'd', v: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), z: 'yyyy-mm-dd' };
  }

  return { t: 's', v: String(value) };
};

const exportTable = (table: ExportableTable, columns: TableColumn[], title: string) => {
  const rows = table?.getVisibleRows() ?? [];

  // Baris pertama langsung header kolom, tanpa baris judul/periode/filter.
  const HEADER_ROW = 0;
  const ws = XLSX.utils.aoa_to_sheet([['No', ...columns.map((c) => c.label)]]);

  rows.forEach((row, i) => {
    const r = HEADER_ROW + 1 + i;
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 'n', v: i + 1 };
    columns.forEach((col, ci) => {
      const cell = toExcelCell(col.key, row[col.key]);
      if (cell) ws[XLSX.utils.encode_cell({ r, c: ci + 1 })] = cell;
    });
  });

  const lastRow = HEADER_ROW + rows.length;
  const lastCol = columns.length;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: Math.max(lastCol, 1) } });
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: HEADER_ROW, c: 0 }, e: { r: lastRow, c: lastCol } }) };
  ws['!cols'] = [{ wch: 5 }, ...columns.map((c) => ({ wch: Math.max(12, c.label.length + 2) }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, downloadFilename(title, 'xlsx'), { cellDates: true });
};

const exportMainTable = () => exportTable(mainTableRef.value, listColumns.value, page.value.title);

const exportDetailTable = () =>
  exportTable(
    detailTableRef.value,
    detailColumns.value,
    `${detailModalTitle.value} ${detailModalPart.value ?? ''}`
  );

const exportCrossTable = () =>
  exportTable(crossTableRef.value, crossModalColumns.value, `${crossModalTitle.value} ${crossModalPart.value ?? ''}`);

const onRowClick = (row: Record<string, unknown>) => {
  if (activeCategory.value === 'reject-rate') {
    const part = (row.part_number_raw ?? row.part_number) as string;
    if (part) reportParetoStore.selectPart(part);
    return;
  }

  if (activeCategory.value === 'tpm-akurasi') {
    const type = row.type as string;
    if (type && type !== '-') reportParetoStore.selectProblem(type);
    return;
  }

  const problem = firstProblem(row.problem_repair as string);
  if (problem && problem !== '-') reportParetoStore.selectProblem(problem);
};

const closeDetailModal = () => {
  detailModalPart.value = null;
  detailModalProblem.value = null;
};

type CrossKind = 'repair' | 'reject' | 'akurasi';

const crossModalKind = ref<CrossKind | null>(null);
const crossModalPart = ref<string | null>(null);
const crossModalRepairRows = ref<RepairDetailRow[]>([]);
const crossModalRejectRows = ref<RejectDetailRow[]>([]);
const crossModalAkurasiRows = ref<AkurasiDetailRow[]>([]);

const crossModalTitle = computed(() => {
  if (crossModalKind.value === 'repair') return 'Detail Repair';
  if (crossModalKind.value === 'reject') return 'Detail Reject';
  if (crossModalKind.value === 'akurasi') return 'Detail Akurasi';
  return '';
});

const crossModalColumns = computed<TableColumn[]>(() => {
  if (crossModalKind.value === 'reject') {
    return [
      { key: 'doc_number', label: 'No. Dokumen' },
      { key: 'reject_date', label: 'Tgl Reject', align: 'center' },
      { key: 'posting_date', label: 'Tgl Posting', align: 'center' },
      { key: 'roc', label: 'ROC', align: 'center' },
      { key: 'category', label: 'Defect', align: 'center' },
      { key: 'line', label: 'Line', align: 'center' },
      { key: 'shift', label: 'Shift', align: 'center' },
      { key: 'qty', label: 'Qty', align: 'right' }
    ];
  }

  if (crossModalKind.value === 'akurasi') {
    return [
      { key: 'part_no', label: 'Part Number' },
      { key: 'date', label: 'Tanggal', align: 'center' },
      { key: 'type', label: 'Type', align: 'center' },
      { key: 'accuracy_pct', label: 'Akurasi', align: 'right' }
    ];
  }

  return [
    { key: 'job_number', label: 'Job Number' },
    { key: 'date', label: 'Tanggal', align: 'center' },
    { key: 'shift', label: 'Shift', align: 'center' },
    { key: 'qty_ok', label: 'Qty OK', align: 'right' },
    { key: 'qty_ng', label: 'Qty NG', align: 'right' },
    { key: 'problem', label: 'Problem Repair', align: 'center' }
  ];
});

const crossModalData = computed(() => {
  if (crossModalKind.value === 'reject') {
    return crossModalRejectRows.value.map((row) => ({
      doc_number: `${row.doc_number}-${row.doc_item}`,
      reject_date: row.reject_date,
      posting_date: row.posting_date,
      roc: row.roc,
      category: row.category,
      line: row.line,
      shift: row.shift,
      qty: utilityStore.formatNumber(row.qty)
    }));
  }

  if (crossModalKind.value === 'akurasi') {
    return crossModalAkurasiRows.value.map((row) => ({
      part_no: row.part_no,
      date: row.date,
      type: row.type || '-',
      accuracy_pct: row.accuracy_pct !== null ? `${row.accuracy_pct}%` : '-'
    }));
  }

  return crossModalRepairRows.value.map((row) => ({
    job_number: row.job_number || '-',
    date: row.date,
    shift: row.shift,
    qty_ok: row.qty_ok !== null ? utilityStore.formatNumber(row.qty_ok) : '-',
    qty_ng: row.qty_ng !== null ? utilityStore.formatNumber(row.qty_ng) : '-',
    problem: row.problem || '-'
  }));
});

const onRepairCellClick = (row: Record<string, unknown>) => {
  if (activeCategory.value === 'repair-rate') {
    openDetailModal(row);
  } else {
    openCrossModal(row, 'repair');
  }
};

const onRejectCellClick = (row: Record<string, unknown>) => {
  if (activeCategory.value === 'reject-rate') {
    openDetailModal(row);
  } else {
    openCrossModal(row, 'reject');
  }
};

const onAkurasiCellClick = (row: Record<string, unknown>) => {
  if (activeCategory.value === 'tpm-akurasi') {
    openDetailModal(row);
  } else {
    openCrossModal(row, 'akurasi');
  }
};

const openCrossModal = (row: Record<string, unknown>, kind: CrossKind) => {
  const part = (row.part_number_raw ?? row.part_no_raw ?? row.part_number ?? row.part_no) as string;

  crossModalKind.value = kind;
  crossModalPart.value = part;

  if (kind === 'repair') {
    crossModalRepairRows.value = ((row.repair_details as RepairDetailRow[]) ?? [])
      .slice()
      .sort((a, b) => (a.date === b.date ? a.shift - b.shift : b.date.localeCompare(a.date)));
  } else if (kind === 'reject') {
    crossModalRejectRows.value = ((row.reject_details as RejectDetailRow[]) ?? [])
      .slice()
      .sort((a, b) => b.reject_date.localeCompare(a.reject_date));
  } else {
    crossModalAkurasiRows.value = ((row.akurasi_details as AkurasiDetailRow[]) ?? [])
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }
};

const closeCrossModal = () => {
  crossModalKind.value = null;
  crossModalPart.value = null;
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <!-- Sub Menu: Kategori Report -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="cat in categories"
          :key="cat.key"
          type="button"
          @click="reportParetoStore.setCategory(cat.key)"
          :class="[
            'px-5 py-2.5 rounded-full text-sm font-medium transition-colors',
            activeCategory === cat.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          ]"
        >
          {{ cat.title }}
        </button>
      </div>

      <!-- Departemen & Tampilkan Pareto (chart_limit) - DIKOMENTARI SEMENTARA atas permintaan
           user, cuma dipakai Reject Rate. Style pill-group sama persis dgn toggle mode
           Harian/Mingguan/Akumulasi di bawah, supaya konsisten & rapi kalau diaktifkan lagi.
      <div v-if="activeCategory === 'reject-rate'" class="inline-flex rounded-full border border-gray-300 overflow-hidden">
        <button
          v-for="d in deptOptions"
          :key="d.value"
          type="button"
          @click="reportParetoStore.setDept(d.value)"
          :class="[
            'px-4 py-2 text-sm font-medium',
            rejectDept === d.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          ]"
        >
          {{ d.label }}
        </button>
      </div>

      <div v-if="activeCategory === 'reject-rate'" class="inline-flex rounded-full border border-gray-300 overflow-hidden">
        <button
          v-for="l in chartLimitOptions"
          :key="l"
          type="button"
          @click="reportParetoStore.setChartLimit(l)"
          :class="[
            'px-4 py-2 text-sm font-medium',
            rejectChartLimit === l ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          ]"
        >
          {{ l === 'all' ? 'Semua' : l }}
        </button>
      </div>
      -->

      <!-- Mode Tanggal + Date Picker -->
      <div class="flex items-center gap-3 flex-wrap">
        <div class="inline-flex rounded-full border border-gray-300 overflow-hidden">
          <button
            v-for="m in modes"
            :key="m.value"
            type="button"
            @click="reportParetoStore.setMode(m.value)"
            :class="[
              'px-4 py-2 text-sm font-medium',
              params.mode === m.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ m.label }}
          </button>
        </div>

        <!-- Harian -->
        <DatePickerButton v-if="params.mode === 'harian'" v-model="params.date" label="Tanggal" />

        <!-- Mingguan -->
        <template v-if="params.mode === 'mingguan'">
          <select
            v-model.number="params.month"
            class="bg-gray-50 border-custom border-gray-300 text-gray-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block px-5 py-2.5 pr-9"
          >
            <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">{{ m }}</option>
          </select>
          <select
            v-model.number="params.year"
            class="bg-gray-50 border-custom border-gray-300 text-gray-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block px-5 py-2.5 pr-9"
          >
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
          <div class="inline-flex gap-1.5 flex-wrap">
            <button
              v-for="w in weekRanges"
              :key="w.id"
              type="button"
              @click="selectWeek(w.id)"
              :class="[
                'px-3 py-2 rounded-full text-xs font-medium border',
                params.week === Number(w.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              ]"
            >
              {{ w.label }} <span class="opacity-70">({{ w.start }}-{{ w.end }})</span>
            </button>
          </div>
        </template>

        <!-- Akumulasi -->
        <DateRangePickerSplitButton v-if="params.mode === 'akumulasi'" v-model:start="params.start" v-model:end="params.end" />

        <!-- Filter layer (Repair Rate saja): layer diturunkan dari master part, sama dgn status di form Metal Finish -->
        <div v-if="activeCategory === 'repair-rate'" class="inline-flex rounded-full border border-gray-300 overflow-hidden">
          <button
            v-for="l in layerOptions"
            :key="l.value"
            type="button"
            @click="reportParetoStore.setLayer(l.value)"
            :class="[
              'px-4 py-2 text-sm font-medium',
              repairLayer === l.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ l.label }}
          </button>
        </div>
      </div>

      <div v-if="activeCategory === 'reject-rate'" class="ml-auto flex items-center gap-3">
        <span v-if="lastSyncLabel" class="text-xs text-gray-500 whitespace-nowrap">Sinkron SAP terakhir: {{ lastSyncLabel }}</span>
        <button
          type="button"
          @click="reportParetoStore.syncSap()"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors whitespace-nowrap"
        >
          <v-icon size="16">mdi-sync</v-icon>
          Sync SAP
        </button>
      </div>
    </div>

    <!-- Filter drill-down yang sedang aktif -->
    <div
      v-if="activeFilters.length"
      class="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5"
    >
      <span class="text-xs font-semibold uppercase tracking-wide text-indigo-800">Difilter</span>
      <button
        v-for="f in activeFilters"
        :key="f.label"
        type="button"
        :title="`Lepas filter ${f.label}`"
        class="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
        @click="f.clear()"
      >
        <span class="opacity-70">{{ f.label }}:</span> {{ f.value }}
        <v-icon size="14">mdi-close-circle</v-icon>
      </button>
      <button
        type="button"
        class="ml-auto text-xs font-medium text-indigo-700 underline hover:text-indigo-900"
        @click="reportParetoStore.clearSelection()"
      >
        Tampilkan semua
      </button>
    </div>

    <!-- Pareto Charts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div v-for="chart in activeCategoryConfig.charts" :key="chart.key" class="bg-white rounded-2xl shadow-lg overflow-hidden relative">
        <div class="bg-[#0b2559] text-white text-center font-bold text-sm py-3 uppercase tracking-wide">
          {{ chartTitle(chart) }}
        </div>
        <span class="absolute right-4 top-12">
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-icon v-bind="menuProps" size="18" class="text-gray-500 cursor-pointer">mdi-menu</v-icon>
            </template>
            <v-list density="compact" class="text-sm">
              <v-list-item @click="downloadSvg(chart.key, chartTitle(chart))">Download SVG</v-list-item>
              <v-list-item @click="downloadPng(chart.key, chartTitle(chart))">Download PNG</v-list-item>
              <v-list-item @click="downloadCsv(chart.key, chartTitle(chart))">Download CSV</v-list-item>
            </v-list>
          </v-menu>
        </span>
        <div class="p-4">
          <svg
            v-if="chartGeoms[chart.key]"
            :ref="(el) => setSvgRef(chart.key, el as Element | null)"
            :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
            class="w-full h-auto select-none"
            preserveAspectRatio="xMidYMid meet"
            font-family="Poppins, sans-serif"
          >
            <!-- gridline & label sumbu kiri -->
            <g v-for="t in chartGeoms[chart.key]!.leftTicks" :key="`lt-${t.value}`">
              <line :x1="PAD.left" :x2="CHART_W - PAD.right" :y1="t.y" :y2="t.y" stroke="#eef1f6" stroke-width="1" />
              <text :x="PAD.left - 8" :y="t.y + 4" text-anchor="end" font-size="11" fill="#334155">{{ t.value }}</text>
            </g>

            <!-- label sumbu kanan (%) -->
            <text
              v-for="t in chartGeoms[chart.key]!.rightTicks"
              :key="`rt-${t.value}`"
              :x="CHART_W - PAD.right + 10"
              :y="t.y + 4"
              text-anchor="start"
              font-size="11"
              fill="#334155"
            >
              {{ t.value }}%
            </text>

            <!-- garis sumbu -->
            <line :x1="PAD.left" :x2="PAD.left" :y1="PAD.top" :y2="CHART_H - PAD.bottom" stroke="#334155" stroke-width="1" />
            <line
              :x1="CHART_W - PAD.right"
              :x2="CHART_W - PAD.right"
              :y1="PAD.top"
              :y2="CHART_H - PAD.bottom"
              stroke="#334155"
              stroke-width="1"
            />
            <line
              :x1="PAD.left"
              :x2="CHART_W - PAD.right"
              :y1="CHART_H - PAD.bottom"
              :y2="CHART_H - PAD.bottom"
              stroke="#334155"
              stroke-width="1"
            />

            <g v-for="b in chartGeoms[chart.key]!.bars" :key="`bar-${b.category}`">
              <rect
                :x="b.x"
                :y="b.barY"
                :width="b.width"
                :height="b.barHeight"
                :fill="barFill(chart.key, b.category)"
                stroke="#1a1a1a"
                stroke-width="1"
                :class="isDrilldownChart(chart.key) ? 'cursor-pointer' : ''"
                @click="onBarClick(chart.key, b.category)"
                @mouseenter="setHover(chart.key, b.category)"
                @mouseleave="setHover(chart.key, null)"
              />

              <g :transform="`translate(${b.cx}, ${b.valueBoxY})`">
                <rect x="-22" y="-15" width="44" height="18" rx="2" fill="#fff" stroke="#334155" stroke-width="1" />
                <text text-anchor="middle" y="-2" font-size="11" font-weight="700" fill="#1e293b">
                  {{ chart.key === 'item_akurasi_model_terendah' ? `${Math.round(b.qty)}%` : utilityStore.formatNumber(b.qty) }}
                </text>
              </g>

              <text :x="b.cx" :y="CHART_H - PAD.bottom + 16" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">
                <tspan v-for="(line, li) in b.categoryLines" :key="li" :x="b.cx" :dy="li === 0 ? 0 : 13">{{ line }}</tspan>
              </text>

              <polygon
                v-if="hoveredCategory[chart.key] === b.category"
                :points="`${b.cx - 5},${CHART_H - PAD.bottom + 3} ${b.cx + 5},${CHART_H - PAD.bottom + 3} ${b.cx},${CHART_H - PAD.bottom + 9}`"
                fill="#1e293b"
              />
            </g>

            <template v-if="hasCummLine(chart.key)">
              <polyline :points="chartGeoms[chart.key]!.linePoints" fill="none" stroke="#F7941D" stroke-width="3" stroke-linejoin="round" />
              <g v-for="b in chartGeoms[chart.key]!.bars" :key="`pt-${b.category}`">
                <circle
                  :cx="b.cx"
                  :cy="b.lineY"
                  r="6"
                  fill="#F7941D"
                  fill-opacity="0"
                  @mouseenter="setHover(chart.key, b.category)"
                  @mouseleave="setHover(chart.key, null)"
                />
                <circle :cx="b.cx" :cy="b.lineY" r="5" fill="#fff" stroke="#F7941D" stroke-width="2" class="pointer-events-none" />
                <g :transform="`translate(${b.cx}, ${b.pctBoxY})`" class="pointer-events-none">
                  <rect x="-20" y="-14" width="40" height="18" rx="9" fill="#fff" stroke="#F7941D" stroke-width="2" />
                  <text text-anchor="middle" y="-1" font-size="10" font-weight="700" fill="#E07C00">{{ Math.round(b.cummPct) }}%</text>
                </g>
              </g>
            </template>

            <g v-if="hoveredBar(chart.key)" :transform="`translate(${CHART_W - PAD.right - 148}, ${PAD.top + 2})`" class="pointer-events-none">
              <rect width="148" height="66" rx="6" fill="#fff" stroke="#334155" stroke-width="1" />
              <text x="10" y="19" font-size="12" font-weight="700" fill="#1e293b">{{ hoveredBar(chart.key)!.category }}</text>
              <line x1="0" y1="27" x2="148" y2="27" stroke="#eef1f6" stroke-width="1" />
              <template v-if="chart.key === 'item_akurasi_model_terendah'">
                <circle cx="12" cy="40" r="4" fill="#E30613" />
                <text x="22" y="44" font-size="11" fill="#334155">
                  Akurasi: <tspan font-weight="700">{{ hoveredBar(chart.key)!.qty.toFixed(1) }}%</tspan>
                </text>
              </template>
              <template v-else>
                <circle cx="12" cy="40" r="4" fill="#E30613" />
                <text x="22" y="44" font-size="11" fill="#334155">
                  Qty: <tspan font-weight="700">{{ utilityStore.formatNumber(hoveredBar(chart.key)!.qty) }}</tspan>
                </text>
                <circle cx="12" cy="56" r="4" fill="#F7941D" />
                <text x="22" y="60" font-size="11" fill="#334155">
                  Kumulatif %: <tspan font-weight="700">{{ hoveredBar(chart.key)!.cummPct.toFixed(1) }}%</tspan>
                </text>
              </template>
            </g>
          </svg>
          <div v-else class="h-[300px] flex flex-col items-center justify-center text-gray-400 gap-2 px-6 text-center">
            <v-icon size="40">mdi-chart-bar</v-icon>
            <span class="text-sm">{{ allData.note || 'Tidak ada data pada periode yang dipilih' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="shadow-md sm:rounded-2xl bg-white p-5">
      <TableExcel ref="mainTableRef" :columns="listColumns" :data="listData" :initial-items-per-page="10" @row-click="onRowClick">
        <template #header-actions>
          <button
            type="button"
            @click="exportMainTable"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
          >
            <i class="mdi mdi-file-excel-outline" />
            Export Excel
          </button>
        </template>

        <template #cell-pcs_qty_repair="{ row, value }">
          <span class="cursor-pointer text-blue-600 hover:underline" @click.stop="onRepairCellClick(row)">{{ value ?? '-' }}</span>
        </template>
        <template #cell-problem_repair="{ row, value }">
          <span class="cursor-pointer text-blue-600 hover:underline" @click.stop="onRepairCellClick(row)">{{ value ?? '-' }}</span>
        </template>

        <template #cell-pcs_qty_reject="{ row, value }">
          <span class="cursor-pointer text-blue-600 hover:underline" @click.stop="onRejectCellClick(row)">{{ value ?? '-' }}</span>
        </template>
        <template #cell-problem_reject="{ row, value }">
          <span class="cursor-pointer text-blue-600 hover:underline" @click.stop="onRejectCellClick(row)">{{ value ?? '-' }}</span>
        </template>

        <template #cell-accuracy="{ row, value }">
          <span class="cursor-pointer text-blue-600 hover:underline" @click.stop="onAkurasiCellClick(row)">{{ value ?? '-' }}</span>
        </template>
        <template #cell-accuracy_pct="{ row, value }">
          <span class="cursor-pointer text-blue-600 hover:underline" @click.stop="onAkurasiCellClick(row)">{{ value ?? '-' }}</span>
        </template>

        <template #actions="{ row }">
          <button
            type="button"
            title="Lihat rincian"
            class="text-gray-400 hover:text-blue-600"
            @click.stop="openDetailModal(row)"
          >
            <v-icon size="18">mdi-format-list-bulleted</v-icon>
          </button>
        </template>
      </TableExcel>
    </div>
  </div>

  <!-- Modal Detail Part -->
  <div v-if="detailModalPart" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4" @click.self="closeDetailModal">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <div class="text-lg font-semibold text-gray-800 uppercase tracking-wide">
            {{ detailModalTitle }} - {{ detailModalPart }} <span class="text-red-600">· {{ detailModalProblem }}</span>
          </div>
        </div>
        <button type="button" class="text-gray-400 hover:text-gray-700" @click="closeDetailModal">
          <v-icon size="22">mdi-close</v-icon>
        </button>
      </div>
      <div class="p-5 overflow-auto">
        <TableExcel ref="detailTableRef" :columns="detailColumns" :data="detailModalData" :initial-items-per-page="10">
          <template #header-actions>
            <button
              type="button"
              @click="exportDetailTable"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <i class="mdi mdi-file-excel-outline" />
              Export Excel
            </button>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>

  <!-- Modal lintas-domain: kolom Repair/Reject/Akurasi milik domain LAIN dari tab yg aktif -->
  <div v-if="crossModalKind" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4" @click.self="closeCrossModal">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <div class="text-lg font-semibold text-gray-800 uppercase tracking-wide">{{ crossModalTitle }} - {{ crossModalPart }}</div>
        </div>
        <button type="button" class="text-gray-400 hover:text-gray-700" @click="closeCrossModal">
          <v-icon size="22">mdi-close</v-icon>
        </button>
      </div>
      <div class="p-5 overflow-auto">
        <TableExcel ref="crossTableRef" :columns="crossModalColumns" :data="crossModalData" :initial-items-per-page="10">
          <template #header-actions>
            <button
              type="button"
              @click="exportCrossTable"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <i class="mdi mdi-file-excel-outline" />
              Export Excel
            </button>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>
</template>

<style>
.border-custom {
  border: 1px solid #e5e7eb !important;
}
</style>
