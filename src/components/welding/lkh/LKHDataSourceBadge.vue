<!-- components/welding/lkh/LKHDataSourceBadge.vue -->
<template>
    <div class="ds-wrapper">

        <!-- MDFO: sebagian/semua dari forecast, tanpa peringatan -->
        <span v-if="source === 'MDFO'" class="pill pill--mdfo" :title="tooltipMDFO">
            <i class="ti ti-chart-dots-2 pill-icon-ti"></i>
            Mix (MDFO)
        </span>

        <!-- DN: semua sudah Fix -->
        <span v-else-if="source === 'DN'" class="pill pill--fix" :title="tooltipDN">
            <svg viewBox="0 0 20 20" fill="currentColor" class="pill-icon">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0
                    00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0
                    00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54
                    1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37
                    2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0
                    00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1
                    1 0 00.95-.69L9.049 2.927z" />
            </svg>
            FIX (DN)
        </span>

    </div>
</template>

<script setup lang="ts">
defineProps<{ source: 'DN' | 'MDFO' }>()

const tooltipMDFO = 'Sebagian atau semua part menggunakan MDFO (Forecast). Part tanpa DN tetap ditampilkan selama ada nilai Plan atau Actual.'
const tooltipDN   = 'Semua part sudah dikonfirmasi dari DN (Delivery Note).'
</script>

<style scoped>
.ds-wrapper {
    display: inline-flex;
    align-items: center;
}

.pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: default;
    user-select: none;
    transition: opacity .2s;
}
.pill:hover { opacity: .85; }

/* MDFO — netral, biru abu-abu */
.pill--mdfo {
    background: #EFF6FF;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
}
.pill-icon-ti {
    font-size: 11px;
    color: #3B82F6;
}

/* Fix — hijau */
.pill--fix {
    background: #D1FAE5;
    color: #065F46;
    border: 1px solid #10B981;
}
.pill-icon {
    width: 11px;
    height: 11px;
    color: #10B981;
}
</style>
