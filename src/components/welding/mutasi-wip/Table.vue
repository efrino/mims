<template>
  <!-- WipMutasiTable.vue: Tabel rekap bulanan WIP per part -->
  <div class="wip-mutasi-table-wrapper">

    <!-- Tabel dengan scroll horizontal -->
    <div class="overflow-x-auto">
      <table class="wip-table text-caption">
        <thead>
          <!-- Row 1: Info part + tanggal header -->
          <tr class="header-row-1">
            <th rowspan="2" class="sticky-col col-no">#</th>
            <th rowspan="2" class="sticky-col col-part">Part WIP</th>
            <th rowspan="2" class="sticky-col col-parent">FP Parent</th>
            <th rowspan="2" class="sticky-col col-bq">BQ</th>
            <th
              v-for="tgl in days"
              :key="tgl"
              colspan="2"
              class="col-date"
              :class="{ 'today-col': tgl === todayDate }"
            >
              {{ tgl }}
            </th>
            <th colspan="2" class="col-total bg-total">Total</th>
          </tr>
          <!-- Row 2: Day / Night per tanggal -->
          <tr class="header-row-2">
            <template v-for="tgl in days" :key="tgl">
              <th class="col-shift" :class="{ 'today-col': tgl === todayDate }">D</th>
              <th class="col-shift" :class="{ 'today-col': tgl === todayDate }">N</th>
            </template>
            <th class="col-shift bg-total">Plan</th>
            <th class="col-shift bg-total">Act</th>
          </tr>
        </thead>

        <tbody>
          <template v-for="(row, idx) in rows" :key="row.part_number + row.area">
            <!-- PLAN row -->
            <tr
              class="data-row plan-row"
              :class="{ 'shortage-row': row.has_shortage, 'over-row': row.has_over }"
            >
              <td rowspan="4" class="sticky-col col-no text-center text-medium-emphasis">
                {{ idx + 1 }}
              </td>
              <td rowspan="4" class="sticky-col col-part">
                <div class="font-weight-bold">{{ row.part_number }}</div>
                <div class="text-medium-emphasis">{{ row.part_name }}</div>
                <v-chip
                  v-if="row.has_shortage"
                  size="x-small"
                  color="error"
                  label
                  class="mt-1"
                >
                  Shortage
                </v-chip>
                <v-chip
                  v-if="row.has_over"
                  size="x-small"
                  color="info"
                  label
                  class="mt-1"
                >
                  Over
                </v-chip>
              </td>
              <td rowspan="4" class="sticky-col col-parent text-medium-emphasis">
                {{ row.parent_part }}
              </td>
              <td rowspan="4" class="sticky-col col-bq text-center">
                {{ row.bq }}
              </td>

              <!-- PLAN cells per tanggal -->
              <template v-for="tgl in days" :key="tgl">
                <td class="data-cell plan-cell" :class="{ 'today-col': tgl === todayDate }">
                  {{ row.days[tgl]?.plan_day ?? 0 }}
                </td>
                <td class="data-cell plan-cell" :class="{ 'today-col': tgl === todayDate }">
                  {{ row.days[tgl]?.plan_night ?? 0 }}
                </td>
              </template>
              <td class="data-cell plan-cell bg-total font-weight-bold">{{ row.total_plan }}</td>
              <td class="data-cell plan-cell bg-total">—</td>
            </tr>

            <!-- ACTUAL row -->
            <tr class="data-row actual-row">
              <template v-for="tgl in days" :key="tgl">
                <td class="data-cell actual-cell" :class="{ 'today-col': tgl === todayDate }">
                  {{ row.days[tgl]?.actual_day ?? 0 }}
                </td>
                <td class="data-cell actual-cell" :class="{ 'today-col': tgl === todayDate }">
                  {{ row.days[tgl]?.actual_night ?? 0 }}
                </td>
              </template>
              <td class="data-cell actual-cell bg-total">—</td>
              <td class="data-cell actual-cell bg-total font-weight-bold">{{ row.total_actual }}</td>
            </tr>

            <!-- STOCK row: closing_stock per hari -->
            <tr class="data-row stock-row">
              <template v-for="tgl in days" :key="tgl">
                <td
                  colspan="2"
                  class="data-cell stock-cell"
                  :class="{
                    'today-col': tgl === todayDate,
                    'shortage-cell': row.days[tgl]?.is_shortage,
                    'over-cell':     row.days[tgl]?.is_over_stock,
                  }"
                >
                  {{ row.days[tgl]?.closing_stock ?? '—' }}
                </td>
              </template>
              <td colspan="2" class="data-cell stock-cell bg-total">—</td>
            </tr>

            <!-- BALANCE row -->
            <tr class="data-row balance-row">
              <template v-for="tgl in days" :key="tgl">
                <td
                  colspan="2"
                  class="data-cell balance-cell"
                  :class="{
                    'today-col':      tgl === todayDate,
                    'positive-cell':  (row.days[tgl]?.balance ?? 0) >= 0,
                    'negative-cell':  (row.days[tgl]?.balance ?? 0) <  0,
                  }"
                >
                  <template v-if="row.days[tgl]?.balance !== undefined">
                    <span>{{ row.days[tgl].balance >= 0 ? '+' : '' }}{{ row.days[tgl].balance }}</span>
                  </template>
                  <template v-else>—</template>
                </td>
              </template>
              <td colspan="2" class="data-cell balance-cell bg-total font-weight-bold"
                :class="{
                  'positive-cell': (row.total_actual - row.total_plan) >= 0,
                  'negative-cell': (row.total_actual - row.total_plan) <  0,
                }"
              >
                {{ (row.total_actual - row.total_plan) >= 0 ? '+' : '' }}
                {{ row.total_actual - row.total_plan }}
              </td>
            </tr>
          </template>

          <!-- Empty state -->
          <tr v-if="!rows.length">
            <td :colspan="4 + days.length * 2 + 2" class="text-center py-6 text-medium-emphasis">
              <v-icon size="32" class="mb-2 d-block mx-auto">mdi-table-off</v-icon>
              Tidak ada data mutasi WIP
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div class="d-flex flex-wrap gap-3 pa-3 text-caption">
      <div class="d-flex align-center gap-1">
        <div class="legend-box plan-cell" />
        <span>Plan</span>
      </div>
      <div class="d-flex align-center gap-1">
        <div class="legend-box actual-cell" />
        <span>Aktual</span>
      </div>
      <div class="d-flex align-center gap-1">
        <div class="legend-box stock-cell" />
        <span>Closing Stock</span>
      </div>
      <div class="d-flex align-center gap-1">
        <div class="legend-box balance-cell" />
        <span>Balance</span>
      </div>
      <div class="d-flex align-center gap-1">
        <div class="legend-box shortage-cell" />
        <span>Shortage</span>
      </div>
      <div class="d-flex align-center gap-1">
        <div class="legend-box over-cell" />
        <span>Over Stock</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WipMutasiRow } from '@/types/Public/Welding/mutasi-wip'

const props = defineProps<{
  rows:  WipMutasiRow[]
  year:  number
  month: number
}>()

/** Hari dalam bulan -->  1..31 sesuai bulan */
const days = computed(() => {
  const daysInMonth = new Date(props.year, props.month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
})

/** Tanggal hari ini untuk highlight kolom */
const todayDate = computed(() => {
  const d = new Date()
  if (d.getFullYear() === props.year && d.getMonth() + 1 === props.month) {
    return d.getDate()
  }
  return -1
})
</script>

<style scoped>
.wip-mutasi-table-wrapper {
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
}

.overflow-x-auto {
  overflow-x: auto;
}

.wip-table {
  border-collapse: collapse;
  white-space: nowrap;
  width: max-content;
  min-width: 100%;
  font-size: 11px;
}

/* Sticky columns */
.sticky-col {
  position: sticky;
  background: rgb(var(--v-theme-surface));
  z-index: 2;
}
.col-no     { left: 0;    min-width: 32px;  width: 32px; }
.col-part   { left: 32px; min-width: 160px; width: 160px; }
.col-parent { left: 192px; min-width: 120px; width: 120px; }
.col-bq     { left: 312px; min-width: 40px;  width: 40px; text-align: center; }

/* Header */
.header-row-1 th,
.header-row-2 th {
  background: rgba(var(--v-theme-surface-variant), 0.6);
  padding: 4px 6px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  text-align: center;
  font-weight: 600;
  font-size: 10px;
  position: sticky;
  top: 0;
  z-index: 3;
}
.header-row-1 .sticky-col,
.header-row-2 .sticky-col {
  z-index: 4;
}

.col-date  { min-width: 48px; }
.col-shift { min-width: 24px; }

/* Data cells */
.data-cell {
  padding: 3px 5px;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: right;
  min-width: 24px;
}

/* Row types */
.plan-row   .plan-cell   { background: rgba(var(--v-theme-primary), 0.05); }
.actual-row .actual-cell { background: rgba(var(--v-theme-success), 0.05); }
.stock-row  .stock-cell  { background: rgba(var(--v-theme-info),    0.05); text-align: center; }
.balance-row .balance-cell { text-align: center; }

/* Balance colors */
.positive-cell { color: rgb(var(--v-theme-success)); font-weight: 500; }
.negative-cell { color: rgb(var(--v-theme-error));   font-weight: 500; }

/* Status cells */
.shortage-cell { background: rgba(var(--v-theme-error),   0.12) !important; }
.over-cell     { background: rgba(var(--v-theme-info),    0.12) !important; }

/* Today column highlight */
.today-col { background: rgba(var(--v-theme-warning), 0.08) !important; }

/* Row-level flags */
.shortage-row .col-part { border-left: 3px solid rgb(var(--v-theme-error)); }
.over-row     .col-part { border-left: 3px solid rgb(var(--v-theme-info));  }

/* Total column */
.bg-total {
  background: rgba(var(--v-theme-surface-variant), 0.4) !important;
  font-weight: 600;
}

/* Row separator */
.balance-row {
  border-bottom: 2px solid rgba(var(--v-border-color), 0.3);
}

/* Legend */
.legend-box {
  width: 16px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
}
.legend-box.plan-cell     { background: rgba(var(--v-theme-primary), 0.12); }
.legend-box.actual-cell   { background: rgba(var(--v-theme-success), 0.12); }
.legend-box.stock-cell    { background: rgba(var(--v-theme-info),    0.12); }
.legend-box.balance-cell  { background: rgba(var(--v-border-color),  0.1);  }
.legend-box.shortage-cell { background: rgba(var(--v-theme-error),   0.18); }
.legend-box.over-cell     { background: rgba(var(--v-theme-info),    0.18); }
</style>