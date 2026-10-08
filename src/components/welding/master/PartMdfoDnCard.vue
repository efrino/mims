<!-- components/welding/master/PartMdfoDnCard.vue
  MDFO (forecast customer) vs DN (delivery aktual) per Bulan / Minggu / Hari.
  Tujuan: membaca POLA order (rasio DN/MDFO, akurasi, kestabilan) sbg acuan planning
  prediktif. Data & ringkasan dihitung backend (M_part_insight::mdfo_vs_dn).
  Periode yg feed DN-nya belum lengkap (sebelum ±Sep 2026) ditandai & tak dihitung. -->
<template>
  <section class="pip-card md">
    <div class="md-head">
      <h4 class="pip-card-title md-title"><i class="mdi mdi-chart-bell-curve-cumulative"></i> MDFO vs DN</h4>
      <div class="md-seg" role="tablist">
        <button v-for="g in GRAINS" :key="g.key" type="button" :class="{ on: grain === g.key }" @click="grain = g.key">{{ g.label }}</button>
      </div>
    </div>

    <div v-if="loading && !data" class="md-skel"></div>
    <p v-else-if="error" class="pip-empty">{{ error }}</p>
    <template v-else-if="data">
      <p v-if="data.derived_from_fp" class="md-note"><i class="mdi mdi-source-branch"></i> WIP: diturunkan dari FP tujuan × qty per FP.</p>

      <div class="md-stats">
        <div class="md-stat" :class="ratioClass(data.summary.ratio_pct)">
          <span class="md-val">{{ data.summary.ratio_pct == null ? '—' : fmt(data.summary.ratio_pct) + '%' }}</span>
          <span class="md-lbl">DN / MDFO</span>
        </div>
        <div class="md-stat">
          <span class="md-val">{{ data.summary.accuracy_pct == null ? '—' : fmt(data.summary.accuracy_pct) + '%' }}</span>
          <span class="md-lbl">Akurasi forecast</span>
        </div>
        <div class="md-stat" :class="cvClass(data.summary.cv_pct)">
          <span class="md-val">{{ cvLabel(data.summary.cv_pct) }}</span>
          <span class="md-lbl">Pola</span>
        </div>
        <div class="md-stat">
          <span class="md-val">{{ fmt(data.today.dn) }}<small> / {{ fmt(data.today.mdfo) }}</small></span>
          <span class="md-lbl">Hari ini DN / MDFO</span>
        </div>
      </div>

      <apexchart type="line" height="220" :options="chartOptions" :series="chartSeries" />
      <div class="md-legend">
        <span><i class="md-sw md-sw--gray"></i> DN belum lengkap (tak dihitung)</span>
        <span><i class="md-sw md-sw--blue"></i> Periode ke depan (DN terjadwal)</span>
      </div>

      <p v-if="data.summary.hint" class="md-hint"><i class="mdi mdi-lightbulb-on-outline"></i> {{ data.summary.hint }}</p>
      <p class="pip-muted">
        {{ data.summary.buckets }} periode lengkap dihitung<template v-if="data.summary.excluded"> · {{ data.summary.excluded }} periode diarsir abu (feed DN belum lengkap)</template>
        · DN > MDFO {{ data.summary.over }}× · DN &lt; MDFO {{ data.summary.under }}×
      </p>

      <button type="button" class="md-toggle" @click="showTable = !showTable">
        <i class="mdi" :class="showTable ? 'mdi-chevron-up' : 'mdi-table'"></i> {{ showTable ? 'Sembunyikan tabel' : 'Lihat tabel per periode' }}
      </button>
      <MajaTable v-if="showTable" :table="table" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import MajaTable from './MajaTable.vue';
import type { AiTable, PartMdfoDn } from '@/types/Public/Welding/master';

type Grain = 'month' | 'week' | 'day';
const props = defineProps<{ partNumber: string }>();

const GRAINS: { key: Grain; label: string }[] = [
  { key: 'month', label: 'Bulan' }, { key: 'week', label: 'Minggu' }, { key: 'day', label: 'Hari' },
];
const grain = ref<Grain>('month');
const data = ref<PartMdfoDn | null>(null);
const loading = ref(false);
const error = ref('');
const showTable = ref(false);
const cache = new Map<string, PartMdfoDn>();   // per part+grain, supaya saklar instan

const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const fmt = (n: number) => nf.format(n);
const ratioClass = (r: number | null) => (r == null ? '' : r > 110 ? 'md-warn' : r < 90 ? 'md-warn' : 'md-ok');
const cvClass = (cv: number | null) => (cv == null ? '' : cv <= 20 ? 'md-ok' : cv <= 40 ? 'md-warn' : 'md-bad');
const cvLabel = (cv: number | null) => (cv == null ? '—' : cv <= 20 ? 'Stabil' : cv <= 40 ? 'Bervariasi' : 'Tidak stabil');

async function load() {
  const k = props.partNumber + '|' + grain.value;
  if (cache.has(k)) { data.value = cache.get(k)!; return; }
  loading.value = true; error.value = '';
  try {
    const d = await masterService.getPartMdfoDn(props.partNumber, grain.value);
    if (d) { cache.set(k, d); data.value = d; } else error.value = 'Data tidak ditemukan.';
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal memuat MDFO vs DN.';
  } finally {
    loading.value = false;
  }
}
watch(() => [props.partNumber, grain.value], load, { immediate: true });

// Grafik: MDFO & DN kolom berdampingan, rasio DN/MDFO garis (sumbu kanan).
// Periode tanpa feed DN lengkap diarsir abu, periode depan diarsir biru muda.
const chartSeries = computed(() => {
  const s = data.value?.series ?? [];
  return [
    { name: 'MDFO (forecast)', type: 'column', data: s.map(b => Math.round(b.mdfo)) },
    { name: 'DN (delivery)', type: 'column', data: s.map(b => Math.round(b.dn)) },
    { name: 'DN / MDFO %', type: 'line', data: s.map(b => (b.dn_complete && !b.future ? b.ratio_pct : null)) },
  ];
});
// Jarak label sumbu-X: harian tiap 7 hari, mingguan tiap 2 minggu, bulanan semua.
const step = computed(() => (grain.value === 'day' ? 7 : grain.value === 'week' ? 2 : 1));
const chartOptions = computed(() => {
  const s = data.value?.series ?? [];
  const cats = s.map(b => b.label);
  const shade = (pred: (i: number) => boolean, color: string) => {
    const out: any[] = [];
    let start: number | null = null;
    s.forEach((_, i) => {
      if (pred(i) && start === null) start = i;
      if ((!pred(i) || i === s.length - 1) && start !== null) {
        const end = pred(i) ? i : i - 1;
        out.push({ x: cats[start], x2: cats[end], fillColor: color, opacity: 0.35 });
        start = null;
      }
    });
    return out;
  };
  return {
    chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit', animations: { speed: 300 }, parentHeightOffset: 0 },
    colors: ['#2e5396', '#d7263d', '#f59e0b'],
    plotOptions: { bar: { columnWidth: grain.value === 'day' ? '75%' : '55%', borderRadius: 2 } },
    stroke: { width: [0, 0, 2.5], curve: 'smooth' },
    markers: { size: [0, 0, 3] },
    dataLabels: { enabled: false },
    grid: { borderColor: '#eef2f7', strokeDashArray: 4, padding: { left: 4, right: 4 } },
    xaxis: {
      categories: cats,
      labels: {
        rotate: 0, hideOverlappingLabels: true, style: { fontSize: '9.5px', colors: '#64748b' },
        formatter: (v: string) => { const i = cats.indexOf(v); return i % step.value === 0 || i === cats.length - 1 ? v : ''; },
      },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: [
      { seriesName: 'MDFO (forecast)', min: 0, forceNiceScale: true, tickAmount: 4, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, formatter: (v: number) => (v >= 1000 ? (v / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'rb' : String(Math.round(v ?? 0))) } },
      { seriesName: 'MDFO (forecast)', show: false },
      { seriesName: 'DN / MDFO %', opposite: true, min: 0, max: (m: number) => Math.max(150, Math.ceil((m ?? 0) / 50) * 50), tickAmount: 3, labels: { style: { fontSize: '10px', colors: '#f59e0b' }, formatter: (v: number) => (v == null ? '' : Math.round(v) + '%') } },
    ],
    annotations: {
      xaxis: [
        ...shade(i => !s[i].dn_complete && !s[i].future, '#cbd5e1'),
        ...shade(i => s[i].future, '#dbeafe'),
      ],
    },
    legend: { fontSize: '10.5px', position: 'top', horizontalAlign: 'left', markers: { size: 5 }, itemMargin: { horizontal: 6, vertical: 0 } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number, o: any) => (v == null ? '—' : o?.seriesIndex === 2 ? v + '%' : nf.format(v) + ' pcs') } },
  };
});

// Tabel per periode (salin/CSV lewat MajaTable)
const table = computed<AiTable>(() => ({
  title: `MDFO vs DN per ${GRAINS.find(g => g.key === grain.value)!.label.toLowerCase()} — ${data.value?.part_number ?? ''}`,
  columns: [
    { key: 'label', label: 'Periode', type: 'text' },
    { key: 'mdfo', label: 'MDFO', type: 'number', unit: 'pcs' },
    { key: 'dn', label: 'DN', type: 'number', unit: 'pcs' },
    { key: 'ratio', label: 'DN / MDFO', type: 'percent' },
    { key: 'status', label: 'Status', type: 'text' },
  ],
  rows: (data.value?.series ?? []).map(b => ({
    label: b.label, mdfo: Math.round(b.mdfo), dn: Math.round(b.dn), ratio: b.ratio_pct,
    status: b.future ? 'ke depan' : b.current ? 'berjalan' : b.dn_complete ? 'lengkap' : 'DN belum lengkap',
  })),
  stats: [],
  thresholds: { hours_min: null, percent_ok: 90, percent_warn: 70 },
}));
</script>

<style scoped>
.md-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.md-title { margin: 0 !important; }
.md-seg { display: inline-flex; padding: 2px; border-radius: 999px; background: var(--dm-bg, #eef2f7); }
.md-seg button { border: none; background: none; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; color: var(--dm-muted, #64748b); cursor: pointer; }
.md-seg button.on { background: #2e5396; color: #fff; box-shadow: 0 1px 3px rgba(46, 83, 150, 0.35); }
.md-skel { height: 220px; border-radius: 10px; background: linear-gradient(90deg, var(--dm-bg, #e2e8f0) 25%, var(--dm-bg, #f1f5f9) 50%, var(--dm-bg, #e2e8f0) 75%); background-size: 200% 100%; animation: md-sh 1.2s infinite; }
@keyframes md-sh { to { background-position: -200% 0; } }
.md-note { margin: 0 0 8px; font-size: 11px; color: var(--dm-accent, #2e5396); }
/* 4 kolom bila lega, otomatis 2×2 di kolom sempit (mode lebar Info Cepat). */
.md-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(92px, 1fr)); gap: 6px; margin-bottom: 6px; }
.md-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: -4px; font-size: 10px; color: var(--dm-muted, #64748b); }
.md-sw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: -1px; margin-right: 3px; }
.md-sw--gray { background: var(--dm-border-strong, #cbd5e1); }
.md-sw--blue { background: var(--dm-tint-blue, #dbeafe); border: 1px solid var(--dm-bd-blue, #bfdbfe); }
.md-stat { display: flex; flex-direction: column; padding: 6px 8px; border-radius: 8px; background: var(--dm-surface2, #f8fafc); border: 1px solid var(--dm-border, #eef2f7); }
.md-val { font-size: 14px; font-weight: 800; color: var(--dm-text, #0f172a); }
.md-val small { font-size: 10.5px; font-weight: 600; color: var(--dm-muted, #64748b); }
.md-lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--dm-faint, #94a3b8); }
.md-ok { background: var(--dm-tint-green, #f0fdf4); border-color: var(--dm-bd-green, #bbf7d0); } .md-ok .md-val { color: var(--dm-on-green, #15803d); }
.md-warn { background: var(--dm-tint-amber, #fffbeb); border-color: var(--dm-bd-amber, #fde68a); } .md-warn .md-val { color: var(--dm-on-amber, #b45309); }
.md-bad { background: var(--dm-tint-red, #fef2f2); border-color: var(--dm-bd-red, #fecaca); } .md-bad .md-val { color: #d7263d; }
.md-hint { margin: 6px 0 0; padding: 8px 10px; border-radius: 8px; background: linear-gradient(135deg, var(--dm-tint-blue, #eef3fb), var(--dm-tint-red, #fdf2f4)); color: var(--dm-text, #1e3a70); font-size: 11.5px; line-height: 1.5; }
.md-toggle { margin-top: 8px; border: 1px dashed var(--dm-border, #c7d4ee); background: none; border-radius: 8px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; color: var(--dm-accent, #2e5396); cursor: pointer; }
.md-toggle:hover { background: var(--dm-tint-blue, #eef3fb); }
</style>
