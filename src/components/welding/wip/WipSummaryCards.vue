<template>
  <!-- STOCK SUMMARY -->
  <div v-if="activeTab === 'stock'" class="summary-section">
    <div class="summary-section__label">
      <i class="mdi mdi-package-variant"></i> Stok WIP per Area
      <span class="summary-total">{{ totalStockQty.toLocaleString('id-ID') }} pcs total</span>
    </div>
    <div class="summary-row">
      <div
        v-for="s in summary"
        :key="s.area_code"
        class="summary-card"
        :class="{ 'summary-card--active': activeArea === s.area_code }"
        :style="cardStyle(s.area_code)"
        @click="$emit('toggle-area', s.area_code)"
      >
        <div class="summary-card__header">
          <span class="summary-card__dot"></span>
          <span class="summary-card__area">{{ s.area_code }}</span>
        </div>
        <div class="summary-card__num">{{ fmtNum(s.total_qty) }}</div>
        <div class="summary-card__row">
          <span class="summary-card__label">{{ s.total_part }} part</span>
          <span class="summary-card__pct">{{ pct(s.total_qty, totalStockQty) }}%</span>
        </div>
        <!-- Mini bar -->
        <div class="summary-card__bar">
          <div class="summary-card__bar-fill" :style="{ width: pct(s.total_qty, totalStockQty) + '%' }"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- TRX SUMMARY -->
  <div v-else class="summary-section">
    <div class="summary-section__label">
      <i class="mdi mdi-swap-horizontal"></i> Ringkasan Transaksi Hari Ini
      <span class="summary-total">{{ trxStats.total }} transaksi</span>
    </div>
    <!-- Stat boxes -->
    <div class="trx-stats-row">
      <div class="trx-stat trx-stat--total">
        <span class="trx-stat__num">{{ trxStats.total }}</span>
        <span class="trx-stat__lbl">Total</span>
      </div>
      <div class="trx-stat trx-stat--plan">
        <span class="trx-stat__num">{{ trxStats.plan }}</span>
        <span class="trx-stat__lbl">Plan</span>
      </div>
      <div class="trx-stat trx-stat--actual">
        <span class="trx-stat__num">{{ trxStats.actual }}</span>
        <span class="trx-stat__lbl">Actual</span>
      </div>
      <div class="trx-stat trx-stat--draft">
        <span class="trx-stat__num">{{ trxStats.draft }}</span>
        <span class="trx-stat__lbl">Draft</span>
      </div>
      <div class="trx-stat trx-stat--confirmed">
        <span class="trx-stat__num">{{ trxStats.confirmed }}</span>
        <span class="trx-stat__lbl">Confirmed</span>
      </div>
      <div class="trx-stat trx-stat--kurang">
        <span class="trx-stat__num">{{ trxStats.hasKurang }}</span>
        <span class="trx-stat__lbl">Ada Kurang</span>
      </div>
    </div>
    <!-- Per-area breakdown -->
    <div class="summary-row" v-if="trxByArea.length">
      <div
        v-for="s in trxByArea"
        :key="s.area_code"
        class="summary-card summary-card--trx"
        :class="{ 'summary-card--active': activeArea === s.area_code }"
        :style="cardStyle(s.area_code)"
        @click="$emit('toggle-area', s.area_code)"
      >
        <div class="summary-card__header">
          <span class="summary-card__dot"></span>
          <span class="summary-card__area">{{ s.area_code }}</span>
        </div>
        <div class="summary-card__num">{{ s.total }}</div>
        <div class="summary-card__row">
          <span class="summary-card__badge-mini badge-plan">{{ s.plan }} plan</span>
          <span class="summary-card__badge-mini badge-actual">{{ s.actual }} aktual</span>
        </div>
        <div class="summary-card__row" style="margin-top: 4px">
          <span v-if="s.kurang > 0" class="summary-card__badge-mini badge-kurang">{{ s.kurang }} kurang</span>
          <span v-else class="summary-card__badge-mini badge-ok">✓ cukup</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAreaColor } from '@/composables/useAreaColor';
import type { WipStockSummary, WipTrxRow } from '@/types/Public/Welding/Wip';

const props = defineProps<{
  summary: WipStockSummary[];
  trxList: WipTrxRow[];
  activeArea: string;
  activeTab: 'stock' | 'trx';
}>();

defineEmits<{ (e: 'toggle-area', area: string): void }>();

const { getColor } = useAreaColor();

// ── Stock computed ──────────────────────────────────────
const totalStockQty = computed(() => props.summary.reduce((s, r) => s + (Number(r.total_qty) || 0), 0));

function pct(val: number, total: number): string {
  if (!total) return '0';
  return Math.round((val / total) * 100).toString();
}

// ── Trx computed ────────────────────────────────────────
const trxStats = computed(() => {
  const list = props.trxList;
  return {
    total: list.length,
    plan: list.filter((r) => r.type === 'plan').length,
    actual: list.filter((r) => r.type === 'actual').length,
    draft: list.filter((r) => r.status === 'draft').length,
    confirmed: list.filter((r) => r.status === 'confirmed').length,
    hasKurang: list.filter((r) => r.lines_kurang > 0).length
  };
});

const trxByArea = computed(() => {
  const map = new Map<string, { area_code: string; total: number; plan: number; actual: number; kurang: number }>();
  for (const r of props.trxList) {
    if (!map.has(r.area_code)) {
      map.set(r.area_code, { area_code: r.area_code, total: 0, plan: 0, actual: 0, kurang: 0 });
    }
    const entry = map.get(r.area_code)!;
    entry.total++;
    if (r.type === 'plan') entry.plan++;
    if (r.type === 'actual') entry.actual++;
    if (r.lines_kurang > 0) entry.kurang++;
  }
  return Array.from(map.values()).sort((a, b) => a.area_code.localeCompare(b.area_code));
});

// ── Style helpers ───────────────────────────────────────
function cardStyle(area: string) {
  const c = getColor(area);
  return {
    '--c-bg': c.bg,
    '--c-border': c.border,
    '--c-text': c.text,
    '--c-pill': c.pill,
    '--c-ptxt': c.pillText
  };
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '-';
  return Number(v).toLocaleString('id-ID');
}
</script>

<style scoped>
/* ── Section wrapper ── */
.summary-section {
  margin-bottom: 20px;
}
.summary-section__label {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.summary-total {
  font-weight: 600;
  color: #2e5396;
  background: #eff6ff;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  letter-spacing: 0;
  text-transform: none;
}

/* ── Cards row ── */
.summary-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Card ── */
.summary-card {
  background: var(--c-bg, #f8fafc);
  border: 1.5px solid var(--c-border, #e2e8f0);
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
  min-width: 148px;
  max-width: 200px;
  flex: 1;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border-left: 4px solid var(--c-border, #e2e8f0);
}
.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
}
.summary-card--active {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
  transform: translateY(-2px);
}

.summary-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.summary-card__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-border, #64748b);
  flex-shrink: 0;
}
.summary-card__area {
  font-size: 10px;
  font-weight: 700;
  color: var(--c-text, #475569);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  line-height: 1.2;
}
.summary-card__num {
  font-size: 24px;
  font-weight: 800;
  color: var(--c-text, #1e293b);
  line-height: 1;
  margin-bottom: 5px;
  font-variant-numeric: tabular-nums;
}
.summary-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.summary-card__label {
  font-size: 10.5px;
  color: #6b7280;
}
.summary-card__pct {
  font-size: 10px;
  font-weight: 700;
  color: var(--c-text, #475569);
  background: var(--c-pill, #f1f5f9);
  padding: 1px 6px;
  border-radius: 8px;
}

/* ── Mini bar ── */
.summary-card__bar {
  height: 3px;
  background: var(--c-pill, #f1f5f9);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}
.summary-card__bar-fill {
  height: 100%;
  background: var(--c-border, #64748b);
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* ── Mini badges inside trx card ── */
.summary-card__badge-mini {
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 8px;
}
.badge-plan {
  background: #dbeafe;
  color: #1d4ed8;
}
.badge-actual {
  background: #dcfce7;
  color: #15803d;
}
.badge-kurang {
  background: #fee2e2;
  color: #dc2626;
}
.badge-ok {
  background: #dcfce7;
  color: #15803d;
}

/* ── Trx stat boxes ── */
.trx-stats-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.trx-stat {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 80px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border-top: 3px solid #e2e8f0;
}
.trx-stat__num {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.trx-stat__lbl {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #6b7280;
}
.trx-stat--total {
  border-top-color: #2e5396;
}
.trx-stat--total .trx-stat__num {
  color: #2e5396;
}
.trx-stat--plan {
  border-top-color: #1d4ed8;
}
.trx-stat--plan .trx-stat__num {
  color: #1d4ed8;
}
.trx-stat--actual {
  border-top-color: #16a34a;
}
.trx-stat--actual .trx-stat__num {
  color: #16a34a;
}
.trx-stat--draft {
  border-top-color: #d97706;
}
.trx-stat--draft .trx-stat__num {
  color: #d97706;
}
.trx-stat--confirmed {
  border-top-color: #059669;
}
.trx-stat--confirmed .trx-stat__num {
  color: #059669;
}
.trx-stat--kurang {
  border-top-color: #dc2626;
}
.trx-stat--kurang .trx-stat__num {
  color: #dc2626;
}
</style>
