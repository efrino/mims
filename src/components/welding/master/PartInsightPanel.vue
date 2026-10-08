<!-- components/welding/master/PartInsightPanel.vue
  Info Cepat + Tanya AI per part (docs/prd/ai-agent-master-data.md).
  Semua angka dihitung backend (M_part_insight) — AI hanya merangkum.
  Istilah (Aturan #3 CLAUDE.md welding): MDFO = forecast customer, DN = delivery
  aktual; demand harian = max(DN, MDFO) = plan minimal; strength = stok×16/pcs per hari,
  dibandingkan batas safety stock planning_config. -->
<template>
  <Teleport to="body">
    <Transition name="pip-slide">
      <div v-if="open" v-modal-stack="() => emit('close')" class="pip-overlay" @click.self.prevent>
        <aside class="pip-drawer" :class="{ 'pip-drawer--wide': wide }">
          <!-- Header + KPI ringkas -->
          <header class="pip-hero">
            <div class="pip-hero-top">
              <div class="pip-hero-icon"><i class="mdi mdi-lightbulb-on-outline"></i></div>
              <div class="pip-hero-text">
                <p class="pip-hero-label">Info Cepat Part</p>
                <p class="pip-hero-pn font-mono">{{ partNumber }}</p>
                <p v-if="data?.part_name" class="pip-hero-name">{{ data.part_name }}</p>
              </div>
              <button class="pip-icon-btn pip-wide-btn" :title="wide ? 'Mode ringkas' : 'Mode lebar: info & chat berdampingan'" @click="toggleWide"><i class="mdi" :class="wide ? 'mdi-arrow-collapse-horizontal' : 'mdi-arrow-expand-horizontal'"></i></button>
              <button class="pip-icon-btn" title="Muat ulang" :disabled="loading" @click="load"><i class="mdi mdi-refresh" :class="{ 'mdi-spin': loading }"></i></button>
              <button class="pip-icon-btn" title="Tutup" @click="emit('close')"><i class="mdi mdi-close"></i></button>
            </div>
            <div v-if="data" class="pip-kpis">
              <div class="pip-kpi">
                <!-- Part common (WIP yg juga dikirim langsung): kebutuhan = DN langsung + dari FP tujuan. -->
                <span class="pip-kpi-val">{{ fmt((data.wip_demand?.total ?? 0) + data.orders.total) }}</span>
                <span class="pip-kpi-lbl">{{ data.wip_demand ? 'Kebutuhan' : 'DN' }} {{ monthShort }}</span>
              </div>
              <div class="pip-kpi">
                <span class="pip-kpi-val">{{ mainProd?.achievement_pct == null ? '—' : mainProd.achievement_pct + '%' }}</span>
                <span class="pip-kpi-lbl">Achievement</span>
              </div>
              <div class="pip-kpi" :class="mainStock?.status ? `pip-kpi--${mainStock.status}` : ''">
                <span class="pip-kpi-val">{{ mainStock?.strength_h == null ? '—' : mainStock.strength_h + ' j' }}</span>
                <span class="pip-kpi-lbl">Strength</span>
              </div>
            </div>
          </header>

          <div class="pip-main" data-maja-scroll>
            <div class="pip-cards">
              <div v-if="loading && !data" class="pip-skeleton"><span></span><span></span><span></span></div>
              <div v-else-if="error" class="pip-note pip-note--err"><i class="mdi mdi-alert-circle-outline"></i> {{ error }}</div>
              <template v-else-if="data">
                <!-- WIP: kebutuhan = Σ DN FP tujuan × qty per FP (WIP tidak dipesan langsung) -->
                <section v-if="data.wip_demand" class="pip-card">
                  <h4 class="pip-card-title"><i class="mdi mdi-source-branch"></i> Kebutuhan WIP {{ monthLabel }}</h4>
                  <template v-if="data.wip_demand.total">
                    <div class="pip-stack">
                      <span v-for="(l, i) in data.wip_demand.lines.filter(l => l.kebutuhan)" :key="l.fp" :style="{ width: (l.kebutuhan / data.wip_demand.total * 100) + '%', background: PALETTE[i % PALETTE.length] }" :title="`${l.fp}: ${fmt(l.kebutuhan)}`"></span>
                    </div>
                    <ul class="pip-legend">
                      <li v-for="(l, i) in data.wip_demand.lines" :key="l.fp">
                        <i :style="{ background: PALETTE[i % PALETTE.length] }"></i>
                        <span class="pip-legend-main">
                          <span class="font-mono">{{ l.fp }}</span>
                          <small>DN FP {{ fmt(l.dn_fp) }} × {{ fmt(l.qty_per_fp) }} per FP</small>
                        </span>
                        <strong>{{ fmt(l.kebutuhan) }}</strong>
                      </li>
                    </ul>
                  </template>
                  <p v-else class="pip-empty">FP tujuan belum punya DN bulan ini<template v-if="!data.wip_demand.lines.length"> (WIP belum terhubung ke FP)</template>.</p>
                  <p class="pip-muted">WIP tidak dipesan langsung — kebutuhan diturunkan dari DN FP tujuan (termasuk varian TMMIN) × qty per FP.</p>
                </section>

                <!-- FP: DN (delivery aktual) per customer -->
                <section v-else class="pip-card">
                  <h4 class="pip-card-title"><i class="mdi mdi-truck-delivery-outline"></i> DN (delivery) {{ monthLabel }}</h4>
                  <template v-if="data.orders.total">
                    <div class="pip-stack">
                      <span v-for="(l, i) in data.orders.lines.filter(l => l.qty)" :key="l.code" :style="{ width: (l.qty / data.orders.total * 100) + '%', background: PALETTE[i % PALETTE.length] }" :title="`${l.code}: ${fmt(l.qty)}`"></span>
                    </div>
                    <ul class="pip-legend">
                      <li v-for="(l, i) in data.orders.lines" :key="l.code">
                        <i :style="{ background: PALETTE[i % PALETTE.length] }"></i>
                        <span class="pip-legend-main">
                          <span class="font-mono">{{ l.code }}</span>
                          <small>{{ l.customer || '—' }}<template v-if="l.job"> · {{ l.job }}</template> · {{ l.orders }} order</small>
                        </span>
                        <strong>{{ fmt(l.qty) }}</strong>
                      </li>
                    </ul>
                  </template>
                  <p v-else class="pip-empty">Belum ada DN bulan ini.</p>
                </section>
  
                <!-- Pola MDFO (forecast) vs DN (delivery) — Bulan / Minggu / Hari -->
                <PartMdfoDnCard :part-number="data.part_number" />

                <!-- Plan vs actual + plan vs demand -->
                <section class="pip-card">
                  <h4 class="pip-card-title"><i class="mdi mdi-chart-timeline-variant"></i> Plan vs Actual <small>s/d hari ini</small></h4>
                  <p v-if="!data.production.length" class="pip-empty">Belum ada data planning bulan ini untuk part ini.</p>
                  <div v-for="p in data.production" :key="p.area" class="pip-area">
                    <div class="pip-area-head">
                      <span class="pip-area-name">{{ p.area }}</span>
                      <span class="pip-pct" :class="pctClass(p.achievement_pct)">{{ p.achievement_pct == null ? '—' : p.achievement_pct + '%' }}</span>
                    </div>
                    <div class="pip-bar"><span :style="{ width: Math.min(p.achievement_pct ?? 0, 100) + '%' }" :class="pctClass(p.achievement_pct)"></span></div>
                    <div class="pip-grid3">
                      <div><small>Plan</small><strong>{{ fmt(p.plan_to_date) }}</strong></div>
                      <div><small>Actual</small><strong>{{ fmt(p.actual_to_date) }}</strong></div>
                      <div><small>Gap</small><strong :class="p.gap_to_date < 0 ? 'pip-neg' : 'pip-pos'">{{ signed(p.gap_to_date) }}</strong></div>
                    </div>
                    <div class="pip-demand">
                      <span>Plan sebulan <strong>{{ fmt(p.plan_month) }}</strong> vs demand <strong>{{ fmt(p.demand_month) }}</strong></span>
                      <span v-if="p.plan_cover_pct != null" class="pip-badge" :class="p.plan_cover_pct >= 100 ? 'pip-badge--ok' : 'pip-badge--warn'">
                        {{ p.plan_cover_pct >= 100 ? 'Cukup' : 'Kurang' }} · {{ p.plan_cover_pct }}%
                      </span>
                    </div>
                    <p class="pip-muted">MDFO (forecast) {{ fmt(p.mdfo_month) }} · DN (delivery) {{ fmt(p.dn_month) }} · demand = max(DN, MDFO) per hari</p>
                  </div>
                </section>
  
                <!-- Stok vs safety stock (strength) -->
                <section class="pip-card">
                  <h4 class="pip-card-title"><i class="mdi mdi-shield-check-outline"></i> Stok &amp; Safety Stock</h4>
                  <p v-if="!data.stock.length" class="pip-empty">Belum ada data stok bulan ini.</p>
                  <div v-for="s in data.stock" :key="s.area" class="pip-area">
                    <div class="pip-area-head">
                      <span class="pip-area-name">{{ s.area }}</span>
                      <span v-if="s.status" class="pip-badge" :class="`pip-badge--${s.status}`">{{ STOCK_LABEL[s.status] }}</span>
                    </div>
                    <!-- Gauge strength: zona safety (min–max jam) diarsir, penanda = strength saat ini -->
                    <div v-if="s.strength_h != null && s.status !== 'minus'" class="pip-gauge">
                      <span class="pip-gauge-zone" :style="zoneStyle(s)"></span>
                      <span class="pip-gauge-mark" :class="`pip-gauge-mark--${s.status}`" :style="{ left: gaugePos(s, s.strength_h) + '%' }"></span>
                    </div>
                    <div class="pip-grid3">
                      <div><small>Stok</small><strong :class="{ 'pip-neg': (s.stock_today ?? 0) < 0 }">{{ s.stock_today == null ? '—' : fmt(s.stock_today) }}</strong></div>
                      <div><small>Strength</small><strong>{{ s.strength_h == null ? '—' : s.strength_h + ' jam' }}</strong></div>
                      <div><small>Safety stock</small><strong>{{ s.safety_stock == null ? '—' : fmt(s.safety_stock) }}</strong></div>
                    </div>
                    <p class="pip-muted">
                      Safety {{ s.safety_min_h }}–{{ s.safety_max_h }} jam · pcs/hari {{ fmt(s.pcs_per_day) }} · DN/hari {{ fmt(Math.round(s.dn_last7 / 7)) }}<template v-if="s.days_cover != null"> · cukup ±{{ s.days_cover }} hari</template>
                    </p>
                  </div>
                </section>
  
                <!-- BOM -->
                <section class="pip-card">
                  <h4 class="pip-card-title"><i class="mdi mdi-file-tree-outline"></i> BOM</h4>
                  <div class="pip-chips-row">
                    <span v-if="data.bom.verified" class="pip-badge pip-badge--ok" :title="`oleh ${data.bom.verified.by} · ${data.bom.verified.at}`"><i class="mdi mdi-check-decagram"></i> Terverifikasi</span>
                    <span v-else class="pip-badge">Belum diverifikasi</span>
                    <span class="pip-badge">{{ data.bom.components }} komponen</span>
                    <span v-if="data.bom.sap_only" class="pip-badge pip-badge--warn">{{ data.bom.sap_only }} hanya di SAP</span>
                  </div>
                  <ul v-if="data.bom.nut_warnings.length" class="pip-warn">
                    <li v-for="w in data.bom.nut_warnings" :key="w"><i class="mdi mdi-alert"></i> {{ w }}</li>
                  </ul>
                </section>
              </template>
            </div>

            <!-- Tanya MAJA (AI agent read-only) — lihat MajaChat.vue -->
            <MajaChat :part-number="partNumber" :suggestions="SUGGESTIONS" placeholder="Tanya MAJA: prediksi, analisis, DN, stok, julukan / job number…" />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import { vModalStack } from '@/directives/modalStack';
import MajaChat from './MajaChat.vue';
import PartMdfoDnCard from './PartMdfoDnCard.vue';
import type { PartInsight } from '@/types/Public/Welding/master';

type StockRow = PartInsight['stock'][number];

const props = defineProps<{ open: boolean; partNumber: string | null }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const data = ref<PartInsight | null>(null);
const loading = ref(false);
const error = ref('');

// Mode lebar: info & chat berdampingan (2 kolom). Default lebar di layar besar;
// pilihan user diingat per browser (localStorage — boleh gagal, fallback default).
const WIDE_KEY = 'pip-wide';
const readWide = () => { try { const v = localStorage.getItem(WIDE_KEY); if (v !== null) return v === '1'; } catch { /* storage diblok */ } return window.innerWidth >= 1280; };
const wide = ref(readWide());
function toggleWide() {
  wide.value = !wide.value;
  try { localStorage.setItem(WIDE_KEY, wide.value ? '1' : '0'); } catch { /* abaikan */ }
}

const PALETTE = ['#2e5396', '#d7263d', '#f59e0b', '#16a34a', '#7c3aed'];
const STOCK_LABEL: Record<NonNullable<StockRow['status']>, string> = {
  minus: 'Stok minus — cek data', below: 'Di bawah safety', safe: 'Aman', over: 'Berlebih',
};

const nf = new Intl.NumberFormat('id-ID');
const fmt = (n: number) => nf.format(n);
const signed = (n: number) => (n > 0 ? '+' : '') + nf.format(n);
const pctClass = (p: number | null) => (p == null ? '' : p >= 95 ? 'is-ok' : p >= 80 ? 'is-mid' : 'is-low');
const periodDate = computed(() => {
  if (!data.value) return null;
  const [y, m] = data.value.period.split('-').map(Number);
  return new Date(y, m - 1, 1);
});
const monthLabel = computed(() => periodDate.value?.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) ?? '');
const monthShort = computed(() => periodDate.value?.toLocaleDateString('id-ID', { month: 'short' }) ?? '');

// KPI header: area produksi utama = area yg benar-benar berproduksi (actual terbesar),
// baru plan terbesar — baris FP OUTHOUSE sering py plan besar tapi actual 0.
const mainProd = computed(() => [...(data.value?.production ?? [])]
  .sort((a, b) => (b.actual_to_date - a.actual_to_date) || (b.plan_to_date - a.plan_to_date))[0]);
const mainStock = computed(() => data.value?.stock.find(s => s.area === mainProd.value?.area) ?? data.value?.stock[0]);

// Gauge strength: skala 0..(max safety × 1.4), zona hijau = rentang safety.
const gaugeMax = (s: StockRow) => Math.max(s.safety_max_h * 1.4, (s.strength_h ?? 0) * 1.1, 1);
const gaugePos = (s: StockRow, h: number) => Math.min(100, Math.max(0, h / gaugeMax(s) * 100));
const zoneStyle = (s: StockRow) => ({ left: gaugePos(s, s.safety_min_h) + '%', width: (gaugePos(s, s.safety_max_h) - gaugePos(s, s.safety_min_h)) + '%' });

// ── Tanya MAJA ──
const SUGGESTIONS = [
  { q: 'Prediksi DN bulan depan?', icon: 'mdi-chart-line' },
  { q: 'Analisis part ini', icon: 'mdi-clipboard-pulse-outline' },
  { q: 'DN / kebutuhan bulan ini berapa?', icon: 'mdi-truck-delivery-outline' },
  { q: 'Komponen part ini apa saja?', icon: 'mdi-file-tree-outline' },
];
async function load() {
  if (!props.partNumber) return;
  loading.value = true;
  error.value = '';
  try {
    data.value = await masterService.getPartInsight(props.partNumber);
    if (!data.value) error.value = 'Part tidak ditemukan.';
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal memuat info part.';
  } finally {
    loading.value = false;
  }
}

watch(() => [props.open, props.partNumber], () => {
  if (props.open) {
    load();
  } else {
    data.value = null;
  }
}, { immediate: true });
</script>

<style scoped>
.pip-overlay { position: fixed; inset: 0; z-index: 99990; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); display: flex; justify-content: flex-end; }
.pip-drawer { width: min(520px, 100%); height: 100%; background: var(--dm-bg, #f1f5f9); display: flex; flex-direction: column; box-shadow: -16px 0 48px rgba(15, 23, 42, 0.25); transition: width 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); }
.pip-drawer--wide { width: min(1080px, 96vw); }

/* ── Header ── */
.pip-hero { flex-shrink: 0; padding: 14px 16px 12px; color: #fff; background: radial-gradient(120% 140% at 100% 0%, #4472c4 0%, #2e5396 55%, #1e3a70 100%); position: relative; overflow: hidden; }
.pip-hero::after { content: ''; position: absolute; right: -40px; top: -40px; width: 140px; height: 140px; border-radius: 50%; background: rgba(215, 38, 61, 0.18); }
.pip-hero-top { display: flex; align-items: flex-start; gap: 10px; position: relative; z-index: 1; }
.pip-hero-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(255, 255, 255, 0.16); display: grid; place-items: center; font-size: 20px; flex-shrink: 0; }
.pip-hero-text { flex: 1; min-width: 0; }
.pip-hero-label { margin: 0; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.8; }
.pip-hero-pn { margin: 1px 0 0; font-size: 15px; font-weight: 800; }
.pip-hero-name { margin: 2px 0 0; font-size: 11.5px; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pip-icon-btn { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(255, 255, 255, 0.12); color: #fff; cursor: pointer; flex-shrink: 0; }
.pip-icon-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.26); }
.pip-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; position: relative; z-index: 1; }
.pip-kpi { background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 10px; padding: 7px 9px; display: flex; flex-direction: column; }
.pip-kpi-val { font-size: 17px; font-weight: 800; line-height: 1.2; }
.pip-kpi-lbl { font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.05em; }
.pip-kpi--below, .pip-kpi--minus { background: rgba(215, 38, 61, 0.35); border-color: rgba(255, 255, 255, 0.35); }
.pip-kpi--safe { background: rgba(22, 163, 74, 0.3); }

/* ── Layout ──
   Ringkas : satu kolom, kartu + chat ikut satu scroll, input menempel di bawah (sticky).
   Lebar   : 2 kolom — kartu info kiri (scroll sendiri), chat kanan (scroll sendiri) + input. */
.pip-main { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 12px 12px 0; }
.pip-cards { display: flex; flex-direction: column; gap: 10px; }
.pip-cards:last-child { padding-bottom: 12px; }   /* tanpa chat (AI tak diizinkan) */
.pip-drawer--wide .pip-main { display: grid; grid-template-columns: 460px 1fr; grid-template-rows: 1fr auto; gap: 0; padding: 0; overflow: hidden; }
.pip-drawer--wide .pip-cards { grid-column: 1; grid-row: 1 / span 2; overflow-y: auto; padding: 12px; border-right: 1px solid var(--dm-border, #e2e8f0); }
.pip-drawer--wide :deep(.ec-chat) { grid-column: 2; grid-row: 1; overflow-y: auto; padding: 14px 18px; background: var(--dm-surface2, #f8fafc); }
.pip-drawer--wide .pip-main :deep(.ec-footer) { grid-column: 2; grid-row: 2; position: static; margin: 0; }
.pip-drawer--wide :deep(.ec-chat .ec-chips) { max-width: 560px; }
.pip-drawer--wide :deep(.ec-chat .ec-msg:not(.ec-msg--chart)) { max-width: 82%; }
@media (max-width: 900px) { .pip-wide-btn { display: none; } }
.pip-note { font-size: 12px; color: var(--dm-text-2, #475569); display: flex; gap: 6px; align-items: center; }
.pip-note--err { color: var(--dm-on-red, #b91c1c); }
.pip-skeleton { display: flex; flex-direction: column; gap: 10px; }
.pip-skeleton span { height: 92px; border-radius: 12px; background: linear-gradient(90deg, var(--dm-bg, #e2e8f0) 25%, var(--dm-bg, #f1f5f9) 50%, var(--dm-bg, #e2e8f0) 75%); background-size: 200% 100%; animation: pip-shimmer 1.2s infinite; }
@keyframes pip-shimmer { to { background-position: -200% 0; } }

.pip-card { background: var(--dm-surface, #fff); border-radius: 12px; padding: 12px 13px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.04); }
.pip-card-title, .pip-card :deep(.pip-card-title) { margin: 0 0 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--dm-accent, #2e5396); display: flex; align-items: center; gap: 6px; }
.pip-card-title .mdi, .pip-card :deep(.pip-card-title .mdi) { font-size: 15px; }
.pip-card-title small { font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--dm-faint, #94a3b8); }
.pip-empty, .pip-card :deep(.pip-empty) { margin: 0; font-size: 12px; color: var(--dm-faint, #94a3b8); }
.pip-muted, .pip-card :deep(.pip-muted) { margin: 6px 0 0; font-size: 10.5px; color: var(--dm-faint, #94a3b8); }

.pip-stack { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--dm-bg, #e2e8f0); margin-bottom: 8px; }
.pip-stack span { height: 100%; }
.pip-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.pip-legend li { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.pip-legend i { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.pip-legend-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pip-legend-main small { color: var(--dm-faint, #94a3b8); font-size: 10.5px; }
.pip-legend strong { color: var(--dm-text, #0f172a); }

.pip-area + .pip-area { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--dm-border, #e2e8f0); }
.pip-area-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.pip-area-name { font-size: 11px; font-weight: 800; color: var(--dm-cell, #334155); letter-spacing: 0.03em; }
.pip-pct { font-size: 14px; font-weight: 800; }
.pip-bar { height: 7px; border-radius: 999px; background: var(--dm-bg, #e2e8f0); overflow: hidden; margin-bottom: 8px; }
.pip-bar span { display: block; height: 100%; border-radius: 999px; background: #94a3b8; transition: width 0.5s ease; }
.is-ok { color: var(--dm-on-green, #15803d); } .pip-bar .is-ok { background: linear-gradient(90deg, #22c55e, #15803d); }
.is-mid { color: var(--dm-on-amber, #b45309); } .pip-bar .is-mid { background: linear-gradient(90deg, #fbbf24, #d97706); }
.is-low { color: #d7263d; } .pip-bar .is-low { background: linear-gradient(90deg, #f87171, #d7263d); }
.pip-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pip-grid3 > div { background: var(--dm-surface2, #f8fafc); border-radius: 8px; padding: 6px 8px; display: flex; flex-direction: column; }
.pip-grid3 small { font-size: 10px; color: var(--dm-faint, #94a3b8); text-transform: uppercase; letter-spacing: 0.04em; }
.pip-grid3 strong { font-size: 13.5px; color: var(--dm-text, #0f172a); }
.pip-demand { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px; font-size: 11.5px; color: var(--dm-text-2, #475569); flex-wrap: wrap; }
.pip-neg { color: #d7263d !important; }
.pip-pos { color: var(--dm-on-green, #15803d) !important; }

.pip-gauge { position: relative; height: 10px; border-radius: 999px; background: linear-gradient(90deg, var(--dm-tint-red, #fee2e2), var(--dm-tint-amber, #fef3c7) 30%, var(--dm-bg, #f1f5f9)); margin: 4px 0 10px; }
.pip-gauge-zone { position: absolute; top: 0; bottom: 0; background: rgba(34, 197, 94, 0.35); border-left: 2px solid #16a34a; border-right: 2px solid #16a34a; }
.pip-gauge-mark { position: absolute; top: -4px; width: 4px; height: 18px; border-radius: 2px; background: #2e5396; transform: translateX(-50%); box-shadow: 0 0 0 2px #fff; }
.pip-gauge-mark--below { background: #d7263d; }
.pip-gauge-mark--over { background: #f59e0b; }

.pip-chips-row { display: flex; flex-wrap: wrap; gap: 6px; }
.pip-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; background: var(--dm-bg, #f1f5f9); color: var(--dm-text-2, #475569); white-space: nowrap; }
.pip-badge--ok, .pip-badge--safe { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #15803d); }
.pip-badge--warn, .pip-badge--over { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #b45309); }
.pip-badge--below, .pip-badge--minus { background: var(--dm-tint-red, #fee2e2); color: #d7263d; }
.pip-warn { list-style: none; margin: 8px 0 0; padding: 8px 10px; border-radius: 8px; background: var(--dm-tint-amber, #fffbeb); border: 1px solid var(--dm-bd-amber, #fcd34d); color: var(--dm-on-amber, #92400e); font-size: 11.5px; }


/* Input chat menempel di bawah panel (mode ringkas). */
.pip-main :deep(.ec-footer) { position: sticky; bottom: 0; margin: 0 -12px; z-index: 2; }

.pip-slide-enter-active, .pip-slide-leave-active { transition: opacity 0.22s; }
.pip-slide-enter-active .pip-drawer, .pip-slide-leave-active .pip-drawer { transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1); }
.pip-slide-enter-from, .pip-slide-leave-to { opacity: 0; }
.pip-slide-enter-from .pip-drawer, .pip-slide-leave-to .pip-drawer { transform: translateX(60px); }
@media (prefers-reduced-motion: reduce) {
  .pip-skeleton span { animation: none; }
}
</style>
