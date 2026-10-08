<!-- components/welding/master/PartSpecOrderTab.vue
  Tab "Order & Produksi" di modal detail part (master-data.vue).
  Ringkasan bulan berjalan dari part_insight: DN per kode customer, kebutuhan WIP,
  plan vs actual per area, stok & strength, plus pola MDFO vs DN. Read-only. -->
<template>
  <div class="so">
    <div v-if="loading" class="so-state"><i class="mdi mdi-loading mdi-spin"></i> Memuat ringkasan order…</div>
    <div v-else-if="error" class="so-state so-state--err"><i class="mdi mdi-alert-circle-outline"></i> {{ error }}</div>
    <template v-else-if="data">
      <!-- KPI bulan berjalan -->
      <div class="so-kpis">
        <div class="so-kpi so-kpi--blue">
          <span class="so-kpi-val">{{ fmt(demandTotal) }}</span>
          <span class="so-kpi-lbl">{{ data.wip_demand ? 'Kebutuhan WIP' : 'DN' }} {{ monthLabel }}</span>
        </div>
        <div class="so-kpi">
          <span class="so-kpi-val">{{ fmt(sum('plan_month')) }}</span>
          <span class="so-kpi-lbl">Plan sebulan</span>
        </div>
        <div class="so-kpi">
          <span class="so-kpi-val">{{ fmt(sum('actual_to_date')) }}</span>
          <span class="so-kpi-lbl">Actual s/d {{ data.as_of.slice(8) }}</span>
        </div>
        <div class="so-kpi" :class="achClass">
          <span class="so-kpi-val">{{ achievement == null ? '—' : achievement + '%' }}</span>
          <span class="so-kpi-lbl">Achievement</span>
        </div>
      </div>

      <!-- Order per kode customer -->
      <section class="so-card">
        <p class="so-title"><i class="mdi mdi-truck-delivery-outline"></i> Order (DN) per kode · {{ monthLabel }}</p>
        <table v-if="data.orders.lines.some(l => l.qty)" class="so-table">
          <thead><tr><th>Kode</th><th>Customer</th><th>Job</th><th class="num">Baris DN</th><th class="num">Qty</th><th class="so-bar-col"></th></tr></thead>
          <tbody>
            <tr v-for="l in sortedLines" :key="l.code">
              <td class="font-mono">{{ l.code }}</td>
              <td>{{ l.customer || '—' }}</td>
              <td>{{ l.job || '—' }}</td>
              <td class="num">{{ fmt(l.orders) }}</td>
              <td class="num strong">{{ fmt(l.qty) }}</td>
              <td class="so-bar-col"><span class="so-bar"><i :style="{ width: pct(l.qty, data.orders.total) + '%' }"></i></span></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="so-empty">Belum ada DN bulan ini untuk kode part ini.</p>

        <template v-if="data.wip_demand?.lines.length">
          <p class="so-sub"><i class="mdi mdi-source-branch"></i> Part WIP — kebutuhan dari FP tujuan (DN FP × qty per FP)</p>
          <table class="so-table">
            <thead><tr><th>FP tujuan</th><th class="num">DN FP</th><th class="num">Qty/FP</th><th class="num">Kebutuhan</th></tr></thead>
            <tbody>
              <tr v-for="w in data.wip_demand.lines" :key="w.fp">
                <td><span class="font-mono">{{ w.fp }}</span><small v-if="w.fp_name"> · {{ w.fp_name }}</small></td>
                <td class="num">{{ fmt(w.dn_fp) }}</td>
                <td class="num">{{ w.qty_per_fp }}</td>
                <td class="num strong">{{ fmt(w.kebutuhan) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </section>

      <!-- Plan vs actual per area -->
      <section v-if="data.production.length" class="so-card">
        <p class="so-title"><i class="mdi mdi-factory"></i> Plan vs Actual per area</p>
        <table class="so-table">
          <thead><tr><th>Area</th><th class="num">Demand</th><th class="num">Plan</th><th class="num">Cover</th><th class="num">Plan s/d</th><th class="num">Actual</th><th class="num">Ach.</th></tr></thead>
          <tbody>
            <tr v-for="p in data.production" :key="p.area">
              <td>{{ p.area }}</td>
              <td class="num">{{ fmt(p.demand_month) }}</td>
              <td class="num">{{ fmt(p.plan_month) }}</td>
              <td class="num" :class="tone(p.plan_cover_pct, 100, 90)">{{ p.plan_cover_pct == null ? '—' : p.plan_cover_pct + '%' }}</td>
              <td class="num">{{ fmt(p.plan_to_date) }}</td>
              <td class="num strong">{{ fmt(p.actual_to_date) }}</td>
              <td class="num" :class="tone(p.achievement_pct, 95, 80)">{{ p.achievement_pct == null ? '—' : p.achievement_pct + '%' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Stok & strength -->
      <section v-if="data.stock.length" class="so-card">
        <p class="so-title"><i class="mdi mdi-warehouse"></i> Stok & strength hari ini</p>
        <div class="so-stock">
          <div v-for="s in data.stock" :key="s.area" class="so-stock-item" :class="`so-stock--${s.status ?? 'none'}`">
            <span class="so-stock-area">{{ s.area }}</span>
            <span class="so-stock-val">{{ s.stock_today == null ? '—' : fmt(s.stock_today) }} <small>pcs</small></span>
            <span class="so-stock-meta">
              {{ s.strength_h == null ? 'strength —' : `${s.strength_h} jam` }} · safety {{ s.safety_min_h }}–{{ s.safety_max_h }} jam
            </span>
          </div>
        </div>
      </section>

      <!-- Pola MDFO vs DN (bulan/minggu/hari) -->
      <section class="so-card">
        <PartMdfoDnCard :part-number="partNumber" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import PartMdfoDnCard from './PartMdfoDnCard.vue';
import type { PartInsight } from '@/types/Public/Welding/master';

const props = defineProps<{ partNumber: string }>();

const data = ref<PartInsight | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
// Cache per part selama halaman hidup: pindah tab bolak-balik tak memuat ulang.
const cache = new Map<string, PartInsight>();

async function load(pn: string) {
  if (cache.has(pn)) { data.value = cache.get(pn)!; return; }
  loading.value = true; error.value = null; data.value = null;
  try {
    const res = await masterService.getPartInsight(pn);
    if (pn !== props.partNumber) return;
    if (res) cache.set(pn, res);
    data.value = res;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal memuat ringkasan order.';
  } finally {
    loading.value = false;
  }
}
watch(() => props.partNumber, pn => { if (pn) load(pn); }, { immediate: true });

const fmt = (v: number | null | undefined) => (v == null ? '—' : Math.round(v).toLocaleString('id-ID'));
const pct = (v: number, t: number) => (t ? Math.max(2, (v / t) * 100) : 0);
const tone = (v: number | null, ok: number, warn: number) => (v == null ? '' : v >= ok ? 'ok' : v >= warn ? 'warn' : 'bad');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const monthLabel = computed(() => {
  const p = data.value?.period ?? '';
  return p ? `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}` : '';
});
const sortedLines = computed(() => [...(data.value?.orders.lines ?? [])].sort((a, b) => b.qty - a.qty));
// Part common (WIP yg juga dikirim langsung): DN langsung + kebutuhan dari FP tujuan.
const demandTotal = computed(() => (data.value?.wip_demand?.total ?? 0) + (data.value?.orders.total ?? 0));
const sum = (k: 'plan_month' | 'actual_to_date' | 'plan_to_date') => (data.value?.production ?? []).reduce((a, p) => a + (p[k] || 0), 0);
const achievement = computed(() => {
  const plan = sum('plan_to_date');
  return plan ? Math.round((sum('actual_to_date') / plan) * 1000) / 10 : null;
});
const achClass = computed(() => {
  const v = achievement.value;
  return v == null ? '' : v >= 95 ? 'so-kpi--ok' : v >= 80 ? 'so-kpi--warn' : 'so-kpi--bad';
});
</script>

<style scoped>
.so { display: flex; flex-direction: column; gap: 12px; padding: 16px 20px; }
.so-state { padding: 40px 0; text-align: center; color: var(--dm-muted, #64748b); font-size: 13px; }
.so-state--err { color: var(--dm-on-red, #b91c1c); }
.so-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
.so-kpi { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 10px; background: var(--dm-surface2, #f8fafc); border: 1px solid var(--dm-border, #e2e8f0); }
.so-kpi-val { font-size: 18px; font-weight: 700; color: var(--dm-text, #0f172a); font-variant-numeric: tabular-nums; }
.so-kpi-lbl { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; color: var(--dm-muted, #64748b); }
.so-kpi--blue { background: var(--dm-tint-blue, #eff6ff); border-color: var(--dm-bd-blue, #bfdbfe); }
.so-kpi--blue .so-kpi-val { color: var(--dm-accent, #1d4ed8); }
.so-kpi--ok .so-kpi-val { color: var(--dm-on-green, #15803d); }
.so-kpi--warn .so-kpi-val { color: var(--dm-on-amber, #b45309); }
.so-kpi--bad .so-kpi-val { color: var(--dm-on-red, #b91c1c); }
.so-card { border: 1px solid var(--dm-border, #e3e8f2); border-radius: 12px; padding: 12px 14px; background: var(--dm-surface, #fff); }
.so-title { margin: 0 0 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--dm-accent, #1e40af); display: flex; align-items: center; gap: 5px; }
.so-sub { margin: 12px 0 6px; font-size: 11.5px; font-weight: 600; color: #7c3aed; display: flex; gap: 4px; align-items: center; }
.so-empty { margin: 0; font-size: 12.5px; color: var(--dm-faint, #94a3b8); }
.so-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.so-table th { text-align: left; font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--dm-muted, #64748b); padding: 6px 8px; border-bottom: 1px solid var(--dm-border, #e2e8f0); background: var(--dm-surface2, #f8fafc); }
.so-table td { padding: 6px 8px; border-bottom: 1px solid var(--dm-border, #f1f5f9); color: var(--dm-text, #1e293b); }
.so-table tr:last-child td { border-bottom: none; }
.so-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.so-table .strong { font-weight: 700; }
.so-table small { color: var(--dm-faint, #94a3b8); }
.so-table .ok { color: var(--dm-on-green, #15803d); font-weight: 600; }
.so-table .warn { color: var(--dm-on-amber, #b45309); font-weight: 600; }
.so-table .bad { color: var(--dm-on-red, #b91c1c); font-weight: 600; }
.so-bar-col { width: 22%; }
.so-bar { display: block; height: 6px; border-radius: 3px; background: var(--dm-bg, #eef2f7); overflow: hidden; }
.so-bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #3b82f6, #1d4ed8); transition: width .4s ease; }
.so-stock { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
.so-stock-item { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--dm-border, #e2e8f0); border-left-width: 4px; }
.so-stock-area { font-size: 11px; font-weight: 700; color: var(--dm-text-2, #475569); }
.so-stock-val { font-size: 16px; font-weight: 700; color: var(--dm-text, #0f172a); }
.so-stock-val small { font-size: 11px; font-weight: 500; color: var(--dm-faint, #94a3b8); }
.so-stock-meta { font-size: 11px; color: var(--dm-muted, #64748b); }
.so-stock--safe { border-left-color: #22c55e; }
.so-stock--over { border-left-color: #3b82f6; }
.so-stock--below { border-left-color: #f59e0b; }
.so-stock--minus { border-left-color: #ef4444; }
.so-stock--none { border-left-color: var(--dm-border-strong, #cbd5e1); }
/* Kartu MDFO vs DN memakai kelas judul panel Info Cepat — samakan gayanya di sini. */
.so-card :deep(.pip-card-title) { margin: 0 0 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--dm-accent, #1e40af); display: flex; align-items: center; gap: 5px; }
.so-card :deep(.pip-empty), .so-card :deep(.pip-muted) { font-size: 12px; color: var(--dm-faint, #94a3b8); }
</style>
