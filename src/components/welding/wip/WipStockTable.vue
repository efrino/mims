<template>
  <div class="panel">
    <!-- Filters -->
    <div class="filter-row">
      <input
        class="inp inp--sm"
        placeholder="Part number..."
        v-model="localFilter.part_number"
        @input="$emit('filter-change', localFilter)"
      />
      <input
        class="inp inp--sm"
        placeholder="Job number..."
        v-model="localFilter.job_number"
        @input="$emit('filter-change', localFilter)"
      />
      <select class="inp inp--sm" v-model="localFilter.source" @change="$emit('filter-change', localFilter)">
        <option value="">Semua Source</option>
        <option>IFPP</option>
        <option>OUTHOUSE</option>
        <option>CKD</option>
        <option>VENDOR</option>
        <option>WIP</option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Area</th>
            <th>Part Number</th>
            <th>Job Number</th>
            <th class="tc">OP</th>
            <th class="tc">Source</th>
            <th class="tr">Qty</th>
            <th class="tc">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="tc muted">Memuat...</td>
          </tr>
          <tr v-else-if="stockList.length === 0">
            <td colspan="7" class="tc muted">Tidak ada data</td>
          </tr>
          <tr v-for="row in stockList" :key="row.id">
            <td>
              <AreaBadge :area="row.area_code" />
            </td>
            <td class="mono">{{ row.part_number }}</td>
            <td>{{ row.job_number ?? '-' }}</td>
            <td class="tc mono">{{ row.op > 0 ? 'OP' + row.op : '-' }}</td>
            <td class="tc">
              <span class="badge-source" :class="'badge-source--' + row.source">{{ row.source }}</span>
            </td>
            <td class="tr mono bold">{{ fmtNum(row.qty) }}</td>
            <td class="tc muted small">{{ fmtDate(row.last_updated) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import type { WipStockItem, StockFilter } from '@/types/Public/Welding/Wip';
import AreaBadge from './AreaBadge.vue';

defineProps<{
  stockList: WipStockItem[];
  loading: boolean;
}>();

defineEmits<{ (e: 'filter-change', f: StockFilter): void }>();

const localFilter = reactive<StockFilter>({ part_number: '', job_number: '', source: '' });

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '-';
  return Number(v).toLocaleString('id-ID');
}
function fmtDate(v: string | null | undefined): string {
  if (!v) return '-';
  return new Date(v).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<style scoped>
.panel {
  background: var(--wip-bg2);
  border-radius: var(--wip-radius);
  border: 1px solid var(--wip-border);
  box-shadow: var(--wip-shadow);
  overflow: hidden;
}
.filter-row {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  background: var(--wip-bg3);
  border-bottom: 1px solid var(--wip-border);
  flex-wrap: wrap;
}
.table-wrap {
  overflow-x: auto;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tbl thead tr {
  background: var(--wip-bg3);
}
.tbl th {
  padding: 10px 14px;
  text-align: left;
  color: var(--wip-muted);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  white-space: nowrap;
  border-bottom: 1px solid var(--wip-border);
}
.tbl td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--wip-border);
  white-space: nowrap;
  color: var(--wip-text);
}
.tbl tbody tr:hover {
  background: #f0f7ff;
}
.tbl tbody tr:last-child td {
  border-bottom: none;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.mono {
  font-family: 'Fira Code', 'Consolas', monospace;
}
.bold {
  font-weight: 700;
}
.muted {
  color: var(--wip-muted);
}
.small {
  font-size: 12px;
}

/* Source badges — light-mode readable */
.badge-source {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
}
.badge-source--IFPP {
  background: #dcfce7;
  color: #15803d;
}
.badge-source--OUTHOUSE {
  background: #ede9fe;
  color: #6d28d9;
}
.badge-source--CKD {
  background: #fef9c3;
  color: #a16207;
}
.badge-source--VENDOR {
  background: #fee2e2;
  color: #dc2626;
}
.badge-source--WIP {
  background: #dbeafe;
  color: #1d4ed8;
}

/* Inputs */
.inp {
  background: #fff;
  border: 1px solid var(--wip-border);
  color: var(--wip-text);
  border-radius: 7px;
  padding: 7px 11px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  min-width: 140px;
}
.inp:focus {
  border-color: var(--wip-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.inp--sm {
  padding: 6px 10px;
  font-size: 12.5px;
}
</style>
