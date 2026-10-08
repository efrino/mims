<template>
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <!-- Background Effects -->
        <div class="fixed inset-0 overflow-hidden pointer-events-none">
            <div class="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <div class="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div class="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        <!-- Header -->
        <header class="relative z-10 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-white">Welding Auto Planning</h1>
                            <p class="text-sm text-slate-400">Production Planning System</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-6">
                        <!-- Date Selector -->
                        <div class="flex flex-col">
                            <label class="text-xs text-slate-400 mb-1.5">Production Date</label>
                            <div class="relative">
                                <input type="date" v-model="selectedDate" @change="handleDateChange"
                                    class="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer hover:border-blue-500/30"
                                    :disabled="store.loading" />
                                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>

                        <!-- Quick Date Buttons -->
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs text-slate-400">Quick Select</label>
                            <div class="flex gap-2">
                                <button @click="selectToday" :disabled="store.loading"
                                    class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    :class="isToday ? 'bg-blue-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white border border-slate-700/50'">
                                    Today
                                </button>
                                <button @click="selectTomorrow" :disabled="store.loading"
                                    class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    :class="isTomorrow ? 'bg-blue-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white border border-slate-700/50'">
                                    Tomorrow
                                </button>
                            </div>
                        </div>

                        <div class="h-12 w-px bg-slate-700/50"></div>

                        <div class="text-right">
                            <p class="text-xs text-slate-400">Last Update</p>
                            <p class="text-sm font-semibold text-white">{{ lastUpdateTime }}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-slate-400">Scheduler</p>
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full"
                                    :class="store.schedulerStatus === 'ON' ? 'bg-green-400 animate-pulse' : 'bg-red-400'"></span>
                                <p class="text-sm font-semibold"
                                    :class="store.schedulerStatus === 'ON' ? 'text-green-400' : 'text-red-400'">
                                    {{ store.schedulerStatus }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Loading State -->
            <div v-if="store.loading" class="flex items-center justify-center min-h-[400px]">
                <div class="text-center">
                    <div
                        class="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto">
                    </div>
                    <p class="mt-4 text-slate-400">Loading planning data...</p>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="store.error" class="flex items-center justify-center min-h-[400px]">
                <div class="text-center max-w-md">
                    <div class="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 class="text-xl font-semibold text-white mb-2">Informasi</h2>
                    <p class="text-slate-400 mb-6">{{ store.error }}</p>
                    <button @click="store.refresh()"
                        class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        Refresh Data
                    </button>
                </div>
            </div>

            <!-- Dashboard Content -->
            <div v-else-if="store.hasPlanningData" class="space-y-6">
                <!-- Selected Date Info Banner -->
                <div
                    class="bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-sm font-semibold text-white">Planning for {{
                                    formatDateLong(selectedDate) }}</h3>
                                <p class="text-xs text-slate-400">{{ getDayLabel(selectedDate) }}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-slate-400">Generated</p>
                            <p class="text-sm font-semibold text-white">{{ formatLastGenerated }}</p>
                        </div>
                    </div>
                </div>

                <!-- Statistics Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <!-- Total Parts -->
                    <div
                        class="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/50 transition-colors">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-slate-400 text-sm">Total Parts</span>
                            <div class="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <span class="text-2xl">📦</span>
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-white">{{ store.totalParts }}</p>
                        <p class="text-xs text-slate-500 mt-1">All scheduled parts</p>
                    </div>

                    <!-- FP Parts -->
                    <div
                        class="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 hover:border-green-500/50 transition-colors">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-slate-400 text-sm">FP Parts</span>
                            <div class="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                <span class="text-2xl">✅</span>
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-green-400">{{ store.fpParts }}</p>
                        <p class="text-xs text-slate-500 mt-1">Finished Products</p>
                    </div>

                    <!-- WIP Parts -->
                    <div
                        class="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 hover:border-amber-500/50 transition-colors">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-slate-400 text-sm">WIP Parts</span>
                            <div class="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                <span class="text-2xl">⏳</span>
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-amber-400">{{ store.wipParts }}</p>
                        <p class="text-xs text-slate-500 mt-1">Work In Progress</p>
                    </div>

                    <!-- Total Quantity -->
                    <div
                        class="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 hover:border-purple-500/50 transition-colors">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-slate-400 text-sm">Total Qty</span>
                            <div class="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <span class="text-2xl">📊</span>
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-purple-400">{{ store.totalQty.toLocaleString() }}</p>
                        <p class="text-xs text-slate-500 mt-1">Total quantity</p>
                    </div>

                    <!-- Completion Rate -->
                    <div
                        class="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 hover:border-cyan-500/50 transition-colors">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-slate-400 text-sm">Rate</span>
                            <div class="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                                <span class="text-2xl">📈</span>
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-cyan-400">{{ store.completionRate.toFixed(1) }}%</p>
                        <p class="text-xs text-slate-500 mt-1">FP completion rate</p>
                    </div>
                </div>

                <!-- Area Summary -->
                <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
                    <h2 class="text-xl font-bold text-white mb-4">Planning by Area</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div v-for="area in store.areasSummary" :key="`${area.area_code}-${area.status_plan}`"
                            class="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30 hover:border-blue-500/50 transition-colors">
                            <div class="flex items-start justify-between mb-3">
                                <div class="flex-1">
                                    <h3 class="font-semibold text-white text-sm">{{ area.area_name }}</h3>
                                    <p class="text-xs text-slate-400 mt-1">{{ area.area_code }}</p>
                                </div>
                                <span class="px-2 py-1 text-xs font-semibold rounded"
                                    :class="area.status_plan === 'FP' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'">
                                    {{ area.status_plan }}
                                </span>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p class="text-xs text-slate-400">Parts</p>
                                    <p class="text-lg font-bold text-white">{{ toNumber(area.total_parts) }}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-slate-400">Qty</p>
                                    <p class="text-lg font-bold text-white">{{ toNumber(area.total_qty).toLocaleString()
                                        }}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-slate-400">Kanban</p>
                                    <p class="text-lg font-bold text-white">{{ toNumber(area.total_kanban) }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Shift Summary -->
                <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
                    <h2 class="text-xl font-bold text-white mb-4">Planning by Shift</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div v-for="shift in store.shiftsSummary" :key="shift.shift"
                            class="bg-slate-900/50 rounded-lg p-5 border border-slate-700/30">
                            <h3 class="font-semibold text-white mb-4">{{ shift.shift_name }}</h3>
                            <div class="grid grid-cols-4 gap-3">
                                <div class="text-center">
                                    <p class="text-xs text-slate-400 mb-1">Total</p>
                                    <p class="text-2xl font-bold text-white">{{ toNumber(shift.total_parts) }}</p>
                                </div>
                                <div class="text-center">
                                    <p class="text-xs text-slate-400 mb-1">FP</p>
                                    <p class="text-2xl font-bold text-green-400">{{ toNumber(shift.fp_parts) }}</p>
                                </div>
                                <div class="text-center">
                                    <p class="text-xs text-slate-400 mb-1">WIP</p>
                                    <p class="text-2xl font-bold text-amber-400">{{ toNumber(shift.wip_parts) }}</p>
                                </div>
                                <div class="text-center">
                                    <p class="text-xs text-slate-400 mb-1">Qty</p>
                                    <p class="text-2xl font-bold text-purple-400">{{
                                        toNumber(shift.total_qty).toLocaleString() }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BOM Coverage -->
                <div v-if="store.bomCoverage.length > 0"
                    class="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
                    <h2 class="text-xl font-bold text-white mb-4">BOM Coverage</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div v-for="bom in store.bomCoverage" :key="bom.bom_status"
                            class="bg-slate-900/50 rounded-lg p-5 border border-slate-700/30">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-semibold text-white">{{ bom.bom_status }}</h3>
                                <span class="text-2xl font-bold text-blue-400">{{ toNumber(bom.percentage).toFixed(1)
                                    }}%</span>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <p class="text-xs text-slate-400">Parts</p>
                                    <p class="text-lg font-bold text-white">{{ toNumber(bom.parts) }}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-slate-400">Quantity</p>
                                    <p class="text-lg font-bold text-white">{{ toNumber(bom.qty).toLocaleString() }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Event Scheduler Info -->
                <div v-if="store.nextEventInfo"
                    class="bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-xl border border-blue-500/30 rounded-xl p-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div class="flex-1">
                            <h3 class="font-semibold text-white">Next Scheduled Event</h3>
                            <p class="text-sm text-slate-400">{{ store.nextEventInfo.event_name }} - {{
                                store.nextEventInfo.event_comment }}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-slate-400">Runs at</p>
                            <p class="text-lg font-bold text-blue-400">{{ store.nextEventInfo.next_run_time }}</p>
                            <p class="text-xs text-slate-500">{{ store.nextEventInfo.countdown }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- No Data State -->
            <div v-else class="flex items-center justify-center min-h-[400px]">
                <div class="text-center">
                    <div class="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-4xl">📋</span>
                    </div>
                    <h2 class="text-xl font-semibold text-white mb-2">No Planning Data</h2>
                    <p class="text-slate-400 mb-6">There is no planning data available for {{
                        formatDateLong(selectedDate) }}</p>
                    <button @click="store.fetchSummary(selectedDate)"
                        class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        Load Data
                    </button>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="relative z-10 bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50 mt-12">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <div class="text-sm text-slate-400">
                        Last updated: {{ lastUpdateTime }}
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-sm text-slate-400 flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full"
                                :class="store.autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-slate-600'"></span>
                            Auto Refresh: {{ store.autoRefresh ? 'ON' : 'OFF' }}
                        </span>
                        <button @click="store.refresh()" :disabled="store.loading"
                            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            <svg class="w-4 h-4" :class="{ 'animate-spin': store.loading }" fill="none"
                                stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useWeldingPlanStore } from '@/stores/Public/WeldingPlan';
import { getTomorrowDate } from '@/services/Public/WeldingPlan';

const store = useWeldingPlanStore();

// Reactive state
const currentTime = ref(new Date());
const selectedDate = ref(getTomorrowDate());
let timeInterval: ReturnType<typeof setInterval> | null = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// Computed
const lastUpdateTime = computed(() => {
    if (!store.lastUpdated) return '-';
    return store.lastUpdated.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
});

const formatLastGenerated = computed(() => {
    if (!store.statistics?.last_generated) return '-';
    const date = new Date(store.statistics.last_generated);
    return date.toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short'
    });
});

const isToday = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate.value === today;
});

const isTomorrow = computed(() => {
    const tomorrow = getTomorrowDate();
    return selectedDate.value === tomorrow;
});

// Helper to convert string to number
const toNumber = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

// Methods
const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const getDayLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = getTomorrowDate();

    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    return '';
};

const handleDateChange = async () => {
    console.log('Date changed to:', selectedDate.value);
    await store.fetchSummary(selectedDate.value);
};

const selectToday = () => {
    selectedDate.value = new Date().toISOString().split('T')[0];
    handleDateChange();
};

const selectTomorrow = () => {
    selectedDate.value = getTomorrowDate();
    handleDateChange();
};

const updateTime = () => {
    currentTime.value = new Date();
};

// Lifecycle
onMounted(async () => {
    // Update time every second
    updateTime();
    timeInterval = setInterval(updateTime, 1000);

    // Set selected date to store's current date
    selectedDate.value = store.currentDate;

    // Fetch initial data
    await store.fetchSummary(selectedDate.value);
    await store.fetchEventStatus();

    // Setup auto refresh
    if (store.autoRefresh) {
        refreshInterval = setInterval(() => {
            store.refresh();
        }, store.refreshInterval);
    }
});

onUnmounted(() => {
    if (timeInterval) clearInterval(timeInterval);
    if (refreshInterval) clearInterval(refreshInterval);
});
</script>