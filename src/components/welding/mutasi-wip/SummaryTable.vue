<template>
  <!--
    WipSummaryTable.vue
    Tabel rekap bulanan WIP per part (dari v_mutasi_wip_summary).
    Klik baris → drill-down ke detail harian (WipMutasiTable).
  -->
  <div>

    <!-- ── Drill-down panel ──────────────────────────────── -->
    <template v-if="store.mutasiViewMode === 'detail' && store.drillDownPart">
      <div class="d-flex align-center gap-2 mb-3">
        <v-btn
          variant="text"
          prepend-icon="mdi-arrow-left"
          size="small"
          @click="store.closeDrillDown()"
        >
          Kembali ke Summary
        </v-btn>
        <v-divider vertical class="mx-1" />
        <v-chip size="small" color="primary" label>
          {{ store.drillDownPart.part_number }}
        </v-chip>
        <span class="text-caption text-medium-emphasis">— detail harian</span>
        <v-chip size="small" variant="tonal">{{ store.drillDownPart.area }}</v-chip>
      </div>

      <v-progress-linear v-if="store.loadingDrillDown" indeterminate color="primary" class="mb-2" />

      <!-- Detail harian: gunakan WipMutasiTable tapi dengan 1 part -->
      <WipMutasiTable
        :rows="drillDownAsTableRows"
        :year="store.filter.year"
        :month="store.filter.month"
      />
    </template>

    <!-- ── Summary table ─────────────────────────────────── -->
    <template v-else>
      <v-progress-linear v-if="store.loadingSummary" indeterminate color="primary" class="mb-2" />

      <v-alert
        v-if="store.errorSummary"
        type="error"
        :text="store.errorSummary"
        variant="tonal"
        class="mb-3"
      />

      <v-data-table
        :headers="headers"
        :items="store.filteredSummaryRows"
        density="compact"
        :items-per-page="50"
        class="wip-summary-table text-caption"
        hover
        @click:row="onRowClick"
      >
        <!-- Part WIP -->
        <template #item.part_number="{ item }">
          <div>
            <span class="font-weight-bold">{{ item.part_number }}</span>
            <div class="text-medium-emphasis text-truncate" style="max-width: 180px;">
              {{ item.part_name }}
            </div>
          </div>
        </template>

        <!-- FP Parent -->
        <template #item.parent_part="{ item }">
          <div class="text-truncate" style="max-width: 140px;">{{ item.parent_part }}</div>
          <div class="text-caption text-medium-emphasis">BQ: {{ item.bq }}</div>
        </template>

        <!-- Plan vs Actual dengan achievement rate -->
        <template #item.plan_total_month="{ item }">
          <div class="font-weight-bold">{{ item.plan_total_month.toLocaleString('id') }}</div>
          <div class="text-caption text-medium-emphasis">
            D{{ item.plan_day_month }} / N{{ item.plan_night_month }}
          </div>
        </template>

        <template #item.actual_total_month="{ item }">
          <div class="font-weight-bold">{{ item.actual_total_month.toLocaleString('id') }}</div>
          <div class="text-caption" :class="achievementColor(item.achievement_rate)">
            {{ item.achievement_rate != null ? item.achievement_rate + '%' : '—' }}
          </div>
        </template>

        <!-- Balance -->
        <template #item.balance_month="{ item }">
          <span
            class="font-weight-bold"
            :class="item.balance_month >= 0 ? 'text-success' : 'text-error'"
          >
            {{ item.balance_month >= 0 ? '+' : '' }}{{ item.balance_month }}
          </span>
        </template>

        <!-- Closing stock vs safety stock -->
        <template #item.closing_stock_last="{ item }">
          <div>
            <span :class="stockClass(item)">
              {{ item.closing_stock_last ?? '—' }}
            </span>
            <span class="text-caption text-medium-emphasis">
              / {{ item.safety_min ?? 0 }}
            </span>
          </div>
          <v-progress-linear
            v-if="item.safety_min"
            :model-value="stockPct(item)"
            :color="stockColorLinear(item)"
            height="3"
            rounded
            bg-color="surface-variant"
            class="mt-1"
            style="max-width: 80px;"
          />
        </template>

        <!-- Shortage info -->
        <template #item.shortage_days="{ item }">
          <template v-if="item.shortage_days > 0">
            <v-chip size="x-small" color="error" label class="mr-1">
              {{ item.shortage_days }}h
            </v-chip>
            <div class="text-caption text-error">
              -{{ item.shortage_qty_total }}
            </div>
          </template>
          <span v-else class="text-success">—</span>
        </template>

        <!-- Status chips -->
        <template #item.status="{ item }">
          <div class="d-flex flex-wrap gap-1">
            <v-chip v-if="item.has_shortage" size="x-small" color="error"   label>Shortage</v-chip>
            <v-chip v-if="item.has_over"     size="x-small" color="info"    label>Over</v-chip>
            <v-chip
              v-if="!item.has_shortage && !item.has_over"
              size="x-small"
              color="success"
              label
            >
              OK
            </v-chip>
          </div>
        </template>

        <!-- Drill-down button -->
        <template #item.actions="{ item }">
          <v-btn
            size="x-small"
            variant="tonal"
            color="primary"
            icon="mdi-table-search"
            @click.stop="store.openDrillDown(item.part_number, item.area)"
          />
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="text-center py-6 text-medium-emphasis">
            <v-icon size="32" class="mb-2 d-block mx-auto">mdi-table-off</v-icon>
            Tidak ada data summary WIP
          </div>
        </template>
      </v-data-table>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWipMutasiStore } from '@/stores/Public/Welding/mutasiWipStore'
import type { WipMutasiSummaryRow, WipMutasiRow } from '@/types/Public/Welding/mutasi-wip'
import WipMutasiTable from '@/components/welding/mutasi-wip/Table.vue'

const store = useWipMutasiStore()

// ── Table headers ─────────────────────────────────────────────

const headers = [
  { title: 'Part WIP',      key: 'part_number',      width: 200 },
  { title: 'Area',          key: 'area',              width: 120 },
  { title: 'FP Parent',     key: 'parent_part',       width: 160 },
  { title: 'Plan Bulan',    key: 'plan_total_month',  width: 110, align: 'end' as const },
  { title: 'Aktual Bulan',  key: 'actual_total_month', width: 110, align: 'end' as const },
  { title: 'Balance',       key: 'balance_month',     width: 80,  align: 'end' as const },
  { title: 'Stok / SS',     key: 'closing_stock_last', width: 120 },
  { title: 'TP Masuk',      key: 'stock_in_month',    width: 80,  align: 'end' as const },
  { title: 'Shortage',      key: 'shortage_days',     width: 100, align: 'center' as const },
  { title: 'Status',        key: 'status',            width: 100 },
  { title: '',              key: 'actions',           width: 48,  sortable: false },
]

// ── Row click → drill-down ────────────────────────────────────

function onRowClick(_event: Event, { item }: { item: WipMutasiSummaryRow }) {
  store.openDrillDown(item.part_number, item.area)
}

// ── Drill-down: convert daily rows ke format WipMutasiRow ────
// agar bisa dipakai langsung di WipMutasiTable

const drillDownAsTableRows = computed<WipMutasiRow[]>(() => {
  if (!store.drillDownPart || !store.drillDownDays.length) return []

  const part       = store.drillDownPart
  const summaryRow = store.summaryRows.find(
    r => r.part_number === part.part_number && r.area === part.area
  )

  // Build days map { tanggal: WipMutasiDay }
  const daysMap: WipMutasiRow['days'] = {}
  for (const d of store.drillDownDays) {
    if (d.tanggal != null) {
      daysMap[d.tanggal] = d
    }
  }

  return [{
    part_number:    part.part_number,
    part_name:      summaryRow?.part_name ?? null,
    job_number:     summaryRow?.job_number ?? null,
    op:             summaryRow?.op ?? null,
    parent_part:    summaryRow?.parent_part ?? '',
    bq:             summaryRow?.bq ?? 1,
    area:           part.area,
    days:           daysMap,
    total_plan:     summaryRow?.plan_total_month ?? 0,
    total_actual:   summaryRow?.actual_total_month ?? 0,
    total_shortage: summaryRow?.shortage_qty_total ?? 0,
    has_shortage:   !!(summaryRow?.has_shortage),
    has_over:       !!(summaryRow?.has_over),
  }]
})

// ── Cell helpers ──────────────────────────────────────────────

function achievementColor(rate: number | null): string {
  if (rate == null) return 'text-medium-emphasis'
  if (rate >= 100) return 'text-success'
  if (rate >= 80)  return 'text-warning'
  return 'text-error'
}

function stockPct(item: WipMutasiSummaryRow): number {
  if (!item.safety_min || item.closing_stock_last == null) return 0
  const ss_max = item.safety_max || (item.safety_min * 2)
  return Math.min(Math.round((item.closing_stock_last / ss_max) * 100), 100)
}

function stockColorLinear(item: WipMutasiSummaryRow): string {
  if (!item.safety_min || item.closing_stock_last == null) return 'grey'
  const pct = (item.closing_stock_last / item.safety_min) * 100
  if (pct <= 0)   return 'error'
  if (pct < 100)  return 'warning'
  if (pct > 200)  return 'info'
  return 'success'
}

function stockClass(item: WipMutasiSummaryRow): string {
  if (item.closing_stock_last == null) return 'text-medium-emphasis'
  if (!item.safety_min) return 'font-weight-bold'
  if (item.closing_stock_last <= 0)             return 'text-error font-weight-bold'
  if (item.closing_stock_last < item.safety_min) return 'text-warning font-weight-bold'
  return 'text-success font-weight-bold'
}
</script>

<style scoped>
.wip-summary-table :deep(tbody tr) {
  cursor: pointer;
}
.wip-summary-table :deep(tbody tr:hover td) {
  background: rgba(var(--v-theme-primary), 0.04);
}
</style>