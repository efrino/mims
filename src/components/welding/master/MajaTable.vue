<!-- components/welding/master/MajaTable.vue
  Tabel jawaban MAJA (daftar lintas part: DN per hari, stok di bawah safety, dll).
  Data & kolom dari backend (M_part_agent::_table_spec) — angka persis dari DB.
  Fitur: ringkasan angka, urutkan per kolom, saring cepat, salin ke Excel, unduh CSV,
  klik nomor part → buka Info Cepat part (event open-part). -->
<template>
  <div class="mt">
    <div class="mt-head">
      <p class="mt-title">{{ table.title }}</p>
      <div class="mt-actions">
        <button type="button" class="mt-btn" :title="copied ? 'Tersalin' : 'Salin tabel (tempel ke Excel)'" @click="copy">
          <i class="mdi" :class="copied ? 'mdi-check' : 'mdi-content-copy'"></i>
        </button>
        <button type="button" class="mt-btn" title="Unduh CSV" @click="downloadCsv"><i class="mdi mdi-file-delimited-outline"></i></button>
      </div>
    </div>

    <div v-if="table.stats?.length" class="mt-stats">
      <div v-for="st in table.stats" :key="st.label" class="mt-stat">
        <span class="mt-stat-val">{{ fmtNum(st.value) }}<small v-if="st.unit"> {{ st.unit }}</small></span>
        <span class="mt-stat-lbl">{{ st.label }}</span>
      </div>
    </div>

    <input v-if="table.rows.length > 8" v-model="filter" class="mt-filter" placeholder="Saring: part, nama, area…" />

    <div class="mt-scroll">
      <table>
        <thead>
          <tr>
            <th class="mt-no">#</th>
            <th v-for="c in table.columns" :key="c.key" :class="{ 'mt-num': isNum(c) }" :title="'Urutkan ' + c.label" @click="sortBy(c.key)">
              {{ c.label }}<small v-if="c.unit"> ({{ c.unit }})</small>
              <i class="mdi mt-sort" :class="sortKey === c.key ? (sortDir === 1 ? 'mdi-arrow-up' : 'mdi-arrow-down') : 'mdi-swap-vertical'"></i>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in view" :key="String(r.part_number) + i">
            <td class="mt-no">{{ i + 1 }}</td>
            <td v-for="c in table.columns" :key="c.key" :class="{ 'mt-num': isNum(c) }">
              <template v-if="r[c.key] == null || r[c.key] === ''"><span class="mt-dim">—</span></template>
              <button v-else-if="c.type === 'part' && partLink" type="button" class="mt-part" title="Buka Info Cepat part" @click="emit('open-part', String(r[c.key]))">{{ r[c.key] }}</button>
              <span v-else-if="c.type === 'part'" class="mt-part mt-part--plain">{{ r[c.key] }}</span>
              <span v-else-if="c.type === 'percent'" class="mt-pct">
                <span class="mt-bar"><span :class="pctClass(Number(r[c.key]))" :style="{ width: Math.min(Number(r[c.key]), 100) + '%' }"></span></span>
                <strong :class="pctClass(Number(r[c.key]))">{{ fmtNum(Number(r[c.key])) }}%</strong>
              </span>
              <span v-else-if="c.type === 'hours'" class="mt-badge" :class="hoursClass(Number(r[c.key]))">{{ fmtNum(Number(r[c.key])) }} jam</span>
              <span v-else-if="c.type === 'number'" :class="{ 'mt-neg': Number(r[c.key]) < 0, 'mt-strong': c.key === 'dn' }">{{ fmtNum(Number(r[c.key])) }}</span>
              <span v-else class="mt-text" :title="String(r[c.key])">{{ r[c.key] }}</span>
            </td>
          </tr>
          <tr v-if="!view.length"><td :colspan="table.columns.length + 1" class="mt-empty">Tidak ada baris yang cocok.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AiTable, AiTableColumn } from '@/types/Public/Welding/master';

const props = withDefaults(defineProps<{ table: AiTable; partLink?: boolean }>(), { partLink: false });
const emit = defineEmits<{ (e: 'open-part', partNumber: string): void }>();

const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const fmtNum = (v: number) => (Number.isFinite(v) ? nf.format(v) : '—');
const isNum = (c: AiTableColumn) => ['number', 'percent', 'hours'].includes(c.type);
const pctClass = (v: number) => (v >= props.table.thresholds.percent_ok ? 'is-ok' : v >= props.table.thresholds.percent_warn ? 'is-mid' : 'is-low');
const hoursClass = (h: number) => {
  const min = props.table.thresholds.hours_min;
  if (h < 0 || (min != null && h < min / 2)) return 'is-low';
  return min != null && h < min ? 'is-mid' : 'is-ok';
};

const filter = ref('');
const sortKey = ref<string | null>(null);
const sortDir = ref<1 | -1>(-1);
function sortBy(k: string) {
  if (sortKey.value === k) sortDir.value = sortDir.value === 1 ? -1 : 1;
  else { sortKey.value = k; sortDir.value = -1; }
}
const view = computed(() => {
  const f = filter.value.trim().toLowerCase();
  let rows = f ? props.table.rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(f))) : [...props.table.rows];
  if (sortKey.value) {
    const k = sortKey.value, d = sortDir.value;
    rows = rows.sort((a, b) => {
      const x = a[k], y = b[k];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * d;
      return String(x ?? '').localeCompare(String(y ?? ''), 'id') * d;
    });
  }
  return rows;
});

// Salin/unduh: header + baris yang sedang tampil (ikut saringan & urutan).
const cell = (v: unknown) => (v == null ? '' : String(v));
function toDelimited(sep: string) {
  const esc = (v: string) => (sep === ',' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = props.table.columns.map(c => esc(c.label + (c.unit ? ` (${c.unit})` : ''))).join(sep);
  return [head, ...view.value.map(r => props.table.columns.map(c => esc(cell(r[c.key]))).join(sep))].join('\n');
}
const copied = ref(false);
async function copy() {
  try { await navigator.clipboard.writeText(toDelimited('\t')); copied.value = true; setTimeout(() => (copied.value = false), 1500); }
  catch { /* clipboard diblok browser — abaikan */ }
}
function downloadCsv() {
  const blob = new Blob(['﻿' + toDelimited(',')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = props.table.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 80) + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<style scoped>
.mt { margin-top: 8px; border: 1px solid var(--dm-border, #e3e9f3); border-radius: 12px; background: var(--dm-surface, #fff); overflow: hidden; }
.mt-head { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px 6px; }
.mt-title { flex: 1; margin: 0; font-size: 12px; font-weight: 800; color: var(--dm-text, #1e3a70); line-height: 1.4; }
.mt-actions { display: flex; gap: 4px; }
.mt-btn { width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--dm-border, #dbe4f3); background: var(--dm-surface, #fff); color: var(--dm-accent, #2e5396); cursor: pointer; }
.mt-btn:hover { background: var(--dm-tint-blue, #eef3fb); }

.mt-stats { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 8px; }
.mt-stat { display: flex; flex-direction: column; padding: 5px 10px; border-radius: 8px; background: linear-gradient(135deg, var(--dm-tint-blue, #eef3fb), var(--dm-surface2, #f8fafc)); border: 1px solid var(--dm-border, #e3e9f3); min-width: 72px; }
.mt-stat-val { font-size: 15px; font-weight: 800; color: var(--dm-text, #0f172a); }
.mt-stat-val small { font-size: 10.5px; font-weight: 600; color: var(--dm-muted, #64748b); }
.mt-stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--dm-muted, #64748b); }

.mt-filter { margin: 0 12px 8px; width: calc(100% - 24px); border: 1px solid var(--dm-border, #dbe4f3); border-radius: 8px; padding: 6px 10px; font-size: 12px; }
.mt-filter:focus { outline: none; border-color: #2e5396; box-shadow: 0 0 0 3px rgba(46, 83, 150, 0.1); }

.mt-scroll { max-height: 380px; overflow: auto; border-top: 1px solid var(--dm-border, #eef2f7); }
table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; }
thead th { position: sticky; top: 0; z-index: 1; background: #2e5396; color: #fff; text-align: left; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; padding: 7px 8px; white-space: nowrap; cursor: pointer; user-select: none; }
thead th small { font-weight: 500; text-transform: none; opacity: 0.8; }
.mt-sort { font-size: 12px; opacity: 0.6; margin-left: 2px; }
tbody td { padding: 6px 8px; border-bottom: 1px solid var(--dm-border, #f1f5f9); vertical-align: middle; color: var(--dm-text, #1e293b); }
tbody tr:nth-child(even) td { background: var(--dm-surface2, #fafbfd); }
tbody tr:hover td { background: var(--dm-tint-blue, #eef3fb); }
.mt-no { width: 28px; text-align: right; color: var(--dm-faint, #94a3b8); font-size: 10.5px; }
.mt-num { text-align: right; white-space: nowrap; }
.mt-text { display: inline-block; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
.mt-dim { color: #cbd5e1; }
.mt-strong { font-weight: 800; color: var(--dm-text, #0f172a); }
.mt-neg { color: #d7263d; font-weight: 700; }
.mt-part { border: none; background: none; padding: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; font-weight: 700; color: var(--dm-accent, #2e5396); cursor: pointer; white-space: nowrap; }
.mt-part:hover { text-decoration: underline; color: #d7263d; }
.mt-part--plain { cursor: default; }
.mt-part--plain:hover { text-decoration: none; color: var(--dm-accent, #2e5396); }
.mt-pct { display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end; }
.mt-bar { width: 52px; height: 6px; border-radius: 999px; background: var(--dm-bg, #e2e8f0); overflow: hidden; }
.mt-bar span { display: block; height: 100%; border-radius: 999px; }
.mt-badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.is-ok { color: var(--dm-on-green, #15803d); } .mt-bar .is-ok { background: #16a34a; } .mt-badge.is-ok { background: var(--dm-tint-green, #dcfce7); }
.is-mid { color: var(--dm-on-amber, #b45309); } .mt-bar .is-mid { background: #f59e0b; } .mt-badge.is-mid { background: var(--dm-tint-amber, #fef3c7); }
.is-low { color: #d7263d; } .mt-bar .is-low { background: #d7263d; } .mt-badge.is-low { background: var(--dm-tint-red, #fee2e2); }
.mt-empty { text-align: center; color: var(--dm-faint, #94a3b8); padding: 14px; }
</style>
