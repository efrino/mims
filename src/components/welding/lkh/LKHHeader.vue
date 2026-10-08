<!-- components/welding/lkh/LKHHeader.vue -->
<template>
    <div class="bg-white rounded-lg shadow-md p-4 mb-3">

        <!-- Title + Controls -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
                <h1 class="text-xl font-bold text-gray-800">
                    LAPORAN KERJA HARIAN (LKH)
                    <span class="text-blue-600 ml-1">— {{ areaName }}</span>
                </h1>
                <p class="text-xs text-gray-500 mt-1">{{ formattedDate }} | {{ shiftLabel }}</p>
            </div>

            <div class="flex gap-2 items-center flex-wrap">

                <!-- Area Selector -->
                <div class="relative" ref="areaDropdownRef">
                    <button
                        @click="showAreaDropdown = !showAreaDropdown"
                        class="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 px-3 py-1.5 rounded text-sm font-semibold transition-colors"
                    >
                        <i class="mdi mdi-map-marker-outline text-base"></i>
                        <span>{{ areaName }}</span>
                        <i class="mdi mdi-chevron-down text-base transition-transform"
                            :class="{ 'rotate-180': showAreaDropdown }"></i>
                    </button>

                    <div v-if="showAreaDropdown"
                        class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px] overflow-hidden">
                        <div class="px-3 py-2 bg-gray-50 border-b border-gray-100">
                            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pilih Area</p>
                        </div>
                        <div class="max-h-64 overflow-y-auto py-1">
                            <button
                                v-for="area in AREA_LIST"
                                :key="area.code"
                                @click="selectArea(area)"
                                class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors"
                                :class="{
                                    'bg-blue-50 text-blue-700 font-semibold': isCurrentArea(area.code),
                                    'text-gray-700': !isCurrentArea(area.code),
                                }"
                            >
                                <i class="mdi mdi-check text-blue-600 text-sm"
                                    :class="isCurrentArea(area.code) ? 'opacity-100' : 'opacity-0'"></i>
                                <div>
                                    <p class="text-sm font-medium">{{ area.label }}</p>
                                    <p class="text-xs text-gray-400">{{ area.code }}</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Date & Shift Picker -->
                <div class="flex gap-2 items-center bg-gray-50 border border-gray-200 px-3 py-2 rounded">
                    <label class="text-xs font-semibold text-gray-600">Tanggal:</label>
                    <input
                        type="date"
                        v-model="selectedDate"
                        @change="onDateChange"
                        class="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <label class="text-xs font-semibold text-gray-600 ml-2">Shift:</label>
                    <select
                        v-model="selectedShift"
                        @change="onShiftChange"
                        class="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option :value="1">Shift 1 (07:15–19:59)</option>
                        <option :value="2">Shift 2 (20:00–07:14)</option>
                    </select>
                </div>

                <!-- Muat Ulang -->
                <button
                    @click="handleRefresh"
                    :disabled="isRefreshing"
                    :class="[
                        'px-4 py-1.5 rounded text-sm transition-colors flex items-center gap-1',
                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        'bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-1 ring-blue-400',
                    ]"
                >
                    <i class="mdi" :class="isRefreshing ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i>
                    <span>{{ isRefreshing ? 'Memuat...' : 'Muat Ulang' }}</span>
                </button>

                <!-- Export -->
                <button
                    @click="handleExport"
                    :disabled="!hasData"
                    class="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-sm flex items-center gap-1"
                >
                    <i class="mdi mdi-file-excel"></i>
                    <span>Export</span>
                </button>

                <slot name="actions" />
            </div>
        </div>

        <!-- Last Updated / Error -->
        <div v-if="lastUpdatedLabel || error" class="flex items-center gap-2 mt-2 text-xs">
            <span v-if="lastUpdatedLabel" class="text-gray-400">
                <i class="mdi mdi-clock-outline mr-1"></i>
                Terakhir dimuat: <strong>{{ lastUpdatedLabel }}</strong>
            </span>
            <span v-if="error" class="text-red-500 ml-2">
                <i class="mdi mdi-alert-circle-outline mr-1"></i>{{ error }}
            </span>
        </div>

        <!-- Stats Bar — 6 cards informatif -->
        <div class="grid grid-cols-6 gap-2 mt-3 pt-3 border-t border-gray-100">

            <!-- Total Part -->
            <div class="stat-card bg-blue-50">
                <p class="stat-label text-blue-600">Total Part</p>
                <p class="stat-val text-blue-800">{{ stats.totalJobs }}</p>
            </div>

            <!-- Fix (DN tersedia) -->
            <div class="stat-card bg-emerald-50">
                <p class="stat-label text-emerald-600 flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    Fix (DN)
                </p>
                <p class="stat-val text-emerald-800">{{ stats.totalFP }}</p>
            </div>

            <!-- Preview (belum DN) -->
            <div class="stat-card bg-amber-50">
                <p class="stat-label text-amber-600 flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block"></span>
                    Preview
                </p>
                <p class="stat-val text-amber-700">{{ stats.totalPreview }}</p>
            </div>

            <!-- Total Plan -->
            <div class="stat-card bg-indigo-50">
                <p class="stat-label text-indigo-600">Total Plan</p>
                <p class="stat-val text-indigo-800">{{ fmtNum(stats.totalPlan) }}</p>
            </div>

            <!-- Total DN -->
            <div class="stat-card bg-sky-50">
                <p class="stat-label text-sky-600">Total DN</p>
                <p class="stat-val text-sky-800">{{ fmtNum(stats.totalDN) }}</p>
            </div>

            <!-- Total Actual -->
            <div class="stat-card bg-purple-50">
                <p class="stat-label text-purple-600">Total Actual</p>
                <p class="stat-val text-purple-800">{{ fmtNum(stats.totalActual) }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Area { code: string; label: string }

// Area codes sesuai mutasi_weld.area_code (= master Area & Mesin, ms_welding_area)
const AREA_LIST: Area[] = [
    { code: 'WSS ADM',  label: 'WSS ADM' },
    { code: 'WSS MMKI', label: 'WSS MMKI' },
    { code: 'WSS HMMI', label: 'WSS HMMI' },
    { code: 'CO ADM',   label: 'CO2 Robot ADM' },
    { code: 'CO MMKI',  label: 'CO2 Robot MMKI' },
    { code: 'SA ADM',   label: 'Sub Assy ADM' },
    { code: 'SA HMMI',  label: 'Sub Assy HMMI' },
]

interface Stats {
    totalJobs:      number;
    totalFP:        number;
    totalPreview:   number;
    totalCarryover: number;
    totalPlan:      number;
    totalDN:        number;
    totalActual:    number;
}

interface Props {
    areaName:          string;
    areaCode?:         string;
    stats:             Stats;
    hasData?:          boolean;
    isRefreshing?:     boolean;
    lastUpdatedLabel?: string | null;
    error?:            string | null;
}

const props = withDefaults(defineProps<Props>(), {
    areaCode:         '',
    hasData:          false,
    isRefreshing:     false,
    lastUpdatedLabel: null,
    error:            null,
})

const emit = defineEmits<{
    refresh:    [data: { date: string; shift: 1 | 2 }]
    export:     [data: { date: string; shift: number }]
    dateChange: [date: string]
    shiftChange:[shift: 1 | 2]
    areaChange: [area: Area]
}>()

// ── Area dropdown ─────────────────────────────────────────────
const showAreaDropdown = ref(false)
const areaDropdownRef  = ref<HTMLElement | null>(null)

function isCurrentArea(code: string): boolean {
    return props.areaCode
        ? props.areaCode.toUpperCase() === code.toUpperCase()
        : props.areaName.toUpperCase() === code.toUpperCase()
}
function selectArea(area: Area) {
    showAreaDropdown.value = false
    emit('areaChange', area)
}
function onClickOutside(e: MouseEvent) {
    if (areaDropdownRef.value && !areaDropdownRef.value.contains(e.target as Node)) {
        showAreaDropdown.value = false
    }
}

// ── Date & Shift ──────────────────────────────────────────────
const selectedDate  = ref('')
const selectedShift = ref<1 | 2>(1)

const detectShift = (): 1 | 2 => {
    const t = new Date().getHours() * 60 + new Date().getMinutes()
    return (t >= 435 && t <= 1199) ? 1 : 2
}

const formattedDate = computed(() => {
    if (!selectedDate.value) return '-'
    const [y, m, d] = selectedDate.value.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
})
const shiftLabel = computed(() =>
    selectedShift.value === 1 ? 'Shift 1 (07:15–19:59)' : 'Shift 2 (20:00–07:14)'
)

const onDateChange  = () => emit('dateChange', selectedDate.value)
const onShiftChange = () => emit('shiftChange', selectedShift.value)

const handleRefresh = () => {
    if (props.isRefreshing) return
    emit('refresh', { date: selectedDate.value, shift: selectedShift.value })
}
const handleExport  = () => emit('export', { date: selectedDate.value, shift: selectedShift.value as number })

// ── Formatter ─────────────────────────────────────────────────
const fmtNum = (v: number) => v > 0 ? Math.round(v).toLocaleString() : '0'

onMounted(() => {
    selectedDate.value  = new Date().toISOString().split('T')[0]
    selectedShift.value = detectShift()
    document.addEventListener('click', onClickOutside)
})
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.stat-card  {
    border-radius: 6px;
    padding: 8px 10px;
}
.stat-label {
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 2px;
}
.stat-val   {
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
}
select, input, button { transition: all .2s ease-in-out; }
select:focus, input:focus { box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
.rotate-180 { transform: rotate(180deg); }
</style>
