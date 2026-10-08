<!-- components/welding/lkh/LKHTable.vue -->
<script setup lang="ts">
import LKHTableHeader     from './LKHTableHeader.vue'
import LKHTableBody       from './LKHTableBody.vue'
import LKHDataSourceBadge from './LKHDataSourceBadge.vue'
import type { LKHData } from '@/types/Public/Welding/lkh'

interface Props {
    data:        LKHData[];
    dataSource?: 'DN' | 'MDFO';
}

const props = withDefaults(defineProps<Props>(), {
    dataSource: 'MDFO',
})

defineEmits<{
    keteranganEdit: [payload: { id: number; keterangan: string }]
    actualEdit:     [payload: {
        id:              number
        actual_lot_size: string | null
        actual_pjk:      string | null
        actual_tpt:      string | null
    }]
}>()
</script>

<template>
    <div class="table-root">

        <!-- Status bar -->
        <div class="table-status-bar">
            <span class="status-label">Sumber Data</span>
            <LKHDataSourceBadge :source="dataSource" />
        </div>

        <div class="table-wrapper">
            <table class="lkh-table">
                <LKHTableHeader />
                <LKHTableBody
                    :data="data"
                    @keteranganEdit="$emit('keteranganEdit', $event)"
                    @actualEdit="$emit('actualEdit', $event)"
                />
            </table>
        </div>
    </div>
</template>

<style scoped>
/* ── Root ───────────────────────────────────────────── */
.table-root { display: flex; flex-direction: column; height: 100%; }

/* ── Status bar ─────────────────────────────────────── */
.table-status-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 12px;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    font-size: 11px;
}
.status-label { color: #64748B; font-weight: 600; }

/* ── Table wrapper ──────────────────────────────────── */
.table-wrapper {
    max-height: calc(100vh - 280px);
    overflow: auto;
    position: relative;
}
.lkh-table {
    width: max-content;
    min-width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* ── Scrollbar ──────────────────────────────────────── */
.table-wrapper::-webkit-scrollbar        { height: 10px; width: 10px; }
.table-wrapper::-webkit-scrollbar-track  { background: #F1F1F1; border-radius: 6px; }
.table-wrapper::-webkit-scrollbar-thumb  { background: #4472C4; border-radius: 6px; }
.table-wrapper::-webkit-scrollbar-thumb:hover { background: #2E5396; }

@media print {
    .table-status-bar { display: none; }
    .table-wrapper    { max-height: none; overflow: visible; }
    .lkh-table { page-break-inside: auto; }
    .lkh-table tr     { page-break-inside: avoid; page-break-after: auto; }
    .lkh-table thead  { display: table-header-group; }
}
</style>
