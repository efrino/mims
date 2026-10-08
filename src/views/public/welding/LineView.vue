<template>
    <div class="line-view" :class="{ fullscreen: isFullscreen }">
        <!-- Background -->
        <div class="bg-effects">
            <div class="scan-line"></div>
            <div class="grid-overlay"></div>
        </div>

        <!-- Header -->
        <header class="line-header">
            <div class="header-left">
                <button v-if="!isFullscreen" @click="goBack" class="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <div class="line-info">
                    <div class="patan-badge">{{ lineData?.patan }}</div>
                    <div class="line-text">
                        <h1>{{ formatLineName(lineId) }}</h1>
                        <span class="shift-info">Shift {{ currentShift }} | {{ currentDate }}</span>
                    </div>
                </div>
            </div>

            <div class="header-center">
                <div class="status-indicators">
                    <div class="indicator" :class="{ active: runningCount > 0 }">
                        <span class="dot running"></span>
                        <span>Running: {{ runningCount }}</span>
                    </div>
                    <div class="indicator">
                        <span class="dot completed"></span>
                        <span>Completed: {{ completedCount }}</span>
                    </div>
                    <div class="indicator">
                        <span class="dot wip"></span>
                        <span>Progress: {{ wipCount }}</span>
                    </div>
                </div>
            </div>

            <div class="header-right">
                <div class="live-clock">
                    <span class="clock-time">{{ currentTime }}</span>
                    <span class="live-badge">
                        <span class="pulse"></span>
                        LIVE
                    </span>
                </div>
                <button @click="toggleFullscreen" class="fullscreen-btn">
                    <svg v-if="!isFullscreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                            d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                            d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                    </svg>
                </button>
            </div>
        </header>

        <!-- Main Content -->
        <main class="line-main">
            <!-- Loading -->
            <div v-if="loading" class="loading-overlay">
                <div class="loader-container">
                    <div class="loader-ring"></div>
                    <span>Loading production data...</span>
                </div>
            </div>

            <!-- Error/Info -->
            <div v-else-if="error" class="error-state">
                <div class="error-icon">📋</div>
                <h2>Informasi</h2>
                <p class="error-message">{{ error }}</p>
                <button @click="refresh" class="retry-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                            d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    Refresh
                </button>
            </div>

            <!-- Data Table -->
            <div v-else class="table-container" ref="tableContainer">
                <table class="production-table">
                    <thead>
                        <tr>
                            <th class="col-no">No</th>
                            <th class="col-part">Part</th>
                            <th class="col-job">Job</th>
                            <th class="col-status">Status</th>
                            <th class="col-process">Jml Proses</th>
                            <th class="col-plan">Plan</th>
                            <th class="col-ket-plan">Ket. Plan</th>
                            <th class="col-actual">Aktual</th>
                            <th class="col-progress">Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item) in details" :key="item.id" :class="getRowClass(item)">
                            <td class="col-no">{{ item.urut }}</td>
                            <td class="col-part">
                                <span class="part-number">{{ item.part_number }}</span>
                            </td>
                            <td class="col-job">
                                <span class="job-number">{{ item.job_number }}</span>
                            </td>
                            <td class="col-status">
                                <span class="status-badge" :class="item.status_plan?.toLowerCase()">
                                    {{ item.status_plan }}
                                </span>
                            </td>
                            <td class="col-process">{{ item.total_process || '-' }}</td>
                            <td class="col-plan">{{ formatNumber(item.lotsize) }}</td>
                            <td class="col-ket-plan">
                                <span class="ket-text" :title="item.keterangan_plan || '-'">
                                    {{ truncateText(item.keterangan_plan, 25) }}
                                </span>
                            </td>
                            <td class="col-actual">
                                <span class="actual-value" :class="{ 'complete': isJobCompleted(item) }">
                                    {{ formatNumber(item.finish_actual || '0') }}
                                </span>
                            </td>
                            <td class="col-progress">
                                <div class="progress-cell">
                                    <div class="mini-progress">
                                        <div class="mini-progress-fill" :class="getProgressClass(item)"
                                            :style="{ width: getProgressWidth(item) + '%' }"></div>
                                    </div>
                                    <span class="progress-text">{{ getProgressWidth(item).toFixed(0) }}%</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Summary Bar -->
            <div class="summary-bar">
                <div class="summary-stat">
                    <span class="stat-label">Total Jobs</span>
                    <span class="stat-value">{{ details.length }}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Completed</span>
                    <span class="stat-value completed">{{ completedCount }}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Progress</span>
                    <span class="stat-value wip">{{ wipCount }}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Total Plan</span>
                    <span class="stat-value">{{ formatNumber(totalPlan.toString()) }}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Total Aktual</span>
                    <span class="stat-value" :class="{ 'achieved': achievementRate >= 100 }">{{
                        formatNumber(totalActual.toString()) }}</span>
                </div>
                <div class="summary-stat achievement">
                    <span class="stat-label">Achievement</span>
                    <span class="stat-value" :class="getAchievementClass(achievementRate)">{{ achievementRate.toFixed(1)
                        }}%</span>
                </div>
                <div class="progress-overview">
                    <div class="progress-bar-large">
                        <div class="progress-fill-large" :class="getAchievementClass(achievementRate)"
                            :style="{ width: Math.min(achievementRate, 100) + '%' }"></div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="line-footer">
            <div class="footer-left">
                <span class="update-time" v-if="lastUpdated">
                    Last update: {{ formatDateTime(lastUpdated) }}
                </span>
            </div>
            <div class="footer-center">
                <span class="auto-refresh-status" :class="{ active: autoRefresh }">
                    <span class="refresh-dot"></span>
                    Auto Refresh: {{ autoRefresh ? 'ON' : 'OFF' }} ({{ refreshInterval / 1000 }}s)
                </span>
            </div>
            <div class="footer-right">
                <button @click="refresh" class="refresh-btn" :disabled="loading">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                            d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                </button>
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    weldingAchievementService,
    buildParams,
    getCurrentShiftData,
    isJobCompleted,
    isJobInProgress,
    getJobProgress
} from '@/services/Public/Welding';
import type { WeldingLineData, WeldingDetail } from '@/types/Public/Welding';

const route = useRoute();
const router = useRouter();

// State
const lineData = ref<WeldingLineData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const lastUpdated = ref<Date | null>(null);
const autoRefresh = ref(true);
const refreshInterval = ref(30000); // 30 seconds for TV display
const isFullscreen = ref(false);

const currentTime = ref('');
const currentDate = ref('');
const currentShift = ref(1);

// Refs
const tableContainer = ref<HTMLElement | null>(null);

// Timers
let timeInterval: ReturnType<typeof setInterval> | null = null;
let dataRefreshInterval: ReturnType<typeof setInterval> | null = null;
let autoScrollInterval: ReturnType<typeof setInterval> | null = null;

// Computed - get lineId from query params
const lineId = computed(() => route.query.id as string || '');

const details = computed(() => lineData.value?.detail || []);

// Count based on status_plan from API
const completedCount = computed(() =>
    details.value.filter(d => d.status_plan === 'FP').length
);

const wipCount = computed(() =>
    details.value.filter(d => d.status_plan === 'WIP').length
);

const runningCount = computed(() =>
    details.value.filter(d => d.is_running === '1').length
);

// Total plan and actual for achievement calculation
const totalPlan = computed(() =>
    details.value.reduce((sum, d) => sum + (parseInt(d.lotsize) || 0), 0)
);

const totalActual = computed(() =>
    details.value.reduce((sum, d) => sum + (parseInt(d.finish_actual || '0') || 0), 0)
);

// Achievement rate based on actual production (finish_actual vs lotsize)
const achievementRate = computed(() => {
    return totalPlan.value > 0 ? (totalActual.value / totalPlan.value) * 100 : 0;
});

// Legacy: completion rate by job count (for progress bar)
const completionRate = computed(() => {
    const total = details.value.length;
    return total > 0 ? (completedCount.value / total) * 100 : 0;
});

const wipRate = computed(() => {
    const total = details.value.length;
    return total > 0 ? (wipCount.value / total) * 100 : 0;
});

// Get achievement class based on percentage
const getAchievementClass = (rate: number) => {
    if (rate >= 100) return 'excellent';
    if (rate >= 80) return 'good';
    if (rate >= 60) return 'warning';
    return 'danger';
};

// Methods
const updateTime = () => {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    currentDate.value = now.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    // Use getCurrentShiftData for accurate shift calculation
    const shiftData = getCurrentShiftData();
    currentShift.value = shiftData.shift;
};

const formatLineName = (lineId: string) => {
    return lineId.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
};

const formatDateTime = (date: Date) => {
    return date.toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

const formatNumber = (value: string | null | undefined) => {
    if (!value) return '0';
    const num = parseInt(value);
    return isNaN(num) ? '0' : num.toLocaleString();
};

const formatDecimal = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
};

const getRowClass = (item: WeldingDetail) => {
    const classes: string[] = [];
    if (item.is_running === '1') classes.push('running');
    // Use status_plan from API for row styling
    if (item.status_plan === 'FP') classes.push('completed');
    else if (item.status_plan === 'WIP') classes.push('wip');
    return classes.join(' ');
};

// Progress class based on actual achievement (finish_actual vs lotsize)
const getProgressClass = (item: WeldingDetail) => {
    if (isJobCompleted(item)) return 'completed';
    if (isJobInProgress(item) || item.is_running === '1') return 'in-progress';
    return 'pending';
};

const truncateText = (text: string | null | undefined, maxLength: number) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

const getProgressWidth = (item: WeldingDetail) => {
    // Calculate actual progress: finish_actual / lotsize * 100
    return getJobProgress(item);
};

const fetchData = async () => {
    loading.value = true;
    error.value = null;

    try {
        const params = buildParams();
        const data = await weldingAchievementService.getLineById(lineId.value, params);

        if (data) {
            lineData.value = data;
            lastUpdated.value = new Date();
        } else {
            error.value = 'Line not found';
        }
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to fetch data';
        console.error('Error fetching line data:', e);
    } finally {
        loading.value = false;
    }
};

const refresh = () => {
    fetchData();
};

const goBack = () => {
    router.push({ name: 'PublicWeldingIndex' });
};

const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        isFullscreen.value = true;
    } else {
        document.exitFullscreen();
        isFullscreen.value = false;
    }
};

const setupAutoScroll = () => {
    if (!tableContainer.value) return;

    let scrollDirection = 1;
    const scrollSpeed = 1;

    autoScrollInterval = setInterval(() => {
        if (!tableContainer.value) return;

        const { scrollTop, scrollHeight, clientHeight } = tableContainer.value;
        const maxScroll = scrollHeight - clientHeight;

        if (scrollTop >= maxScroll) {
            scrollDirection = -1;
        } else if (scrollTop <= 0) {
            scrollDirection = 1;
        }

        tableContainer.value.scrollTop += scrollSpeed * scrollDirection;
    }, 50);
};

// Lifecycle
onMounted(async () => {
    updateTime();
    timeInterval = setInterval(updateTime, 1000);

    await fetchData();

    // Auto refresh for TV display
    if (autoRefresh.value) {
        dataRefreshInterval = setInterval(fetchData, refreshInterval.value);
    }

    // Setup auto scroll for long tables
    setTimeout(setupAutoScroll, 2000);

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
        isFullscreen.value = !!document.fullscreenElement;
    });
});

onUnmounted(() => {
    if (timeInterval) clearInterval(timeInterval);
    if (dataRefreshInterval) clearInterval(dataRefreshInterval);
    if (autoScrollInterval) clearInterval(autoScrollInterval);
});
</script>

<style scoped>
.line-view {
    --bg-dark: #0a0a0f;
    --bg-card: #12121a;
    --bg-row: #0f0f16;
    --bg-row-alt: #141420;
    --text-primary: #ffffff;
    --text-secondary: #94a3b8;
    --border-color: rgba(255, 255, 255, 0.08);
    --accent-blue: #3B82F6;
    --accent-green: #10B981;
    --accent-yellow: #F59E0B;
    --accent-red: #EF4444;

    min-height: 100vh;
    background: var(--bg-dark);
    color: var(--text-primary);
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    display: flex;
    flex-direction: column;
    position: relative;
}

/* Background Effects */
.bg-effects {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
}

.scan-line {
    position: absolute;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
    animation: scanLine 4s linear infinite;
}

@keyframes scanLine {
    0% {
        top: 0;
    }

    100% {
        top: 100%;
    }
}

.grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px);
    background-size: 30px 30px;
}

/* Header */
.line-header {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: rgba(18, 18, 26, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.back-btn {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.back-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

.back-btn svg {
    width: 18px;
    height: 18px;
    stroke: var(--text-secondary);
}

.line-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.patan-badge {
    width: 44px;
    height: 44px;
    background: var(--accent-blue);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.25rem;
}

.line-text h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    font-family: 'SF Pro Display', sans-serif;
}

.shift-info {
    font-size: 0.75rem;
    color: var(--text-secondary);
}

.header-center {
    display: flex;
    gap: 2rem;
}

.status-indicators {
    display: flex;
    gap: 1.5rem;
}

.indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.indicator.active {
    color: var(--text-primary);
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.dot.running {
    background: var(--accent-blue);
    animation: pulse 1.5s ease-in-out infinite;
}

.dot.completed {
    background: var(--accent-green);
}

.dot.wip {
    background: var(--accent-yellow);
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.5;
        transform: scale(1.2);
    }
}

.header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.live-clock {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.clock-time {
    font-size: 1.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--accent-blue);
}

.live-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid var(--accent-red);
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent-red);
}

.live-badge .pulse {
    width: 6px;
    height: 6px;
    background: var(--accent-red);
    border-radius: 50%;
    animation: livePulse 1s ease-in-out infinite;
}

@keyframes livePulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.3;
    }
}

.fullscreen-btn {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.fullscreen-btn:hover {
    background: var(--accent-blue);
    border-color: var(--accent-blue);
}

.fullscreen-btn svg {
    width: 18px;
    height: 18px;
    stroke: var(--text-primary);
}

/* Main */
.line-main {
    flex: 1;
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* Loading */
.loading-overlay {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.loader-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.loader-ring {
    width: 50px;
    height: 50px;
    border: 3px solid var(--border-color);
    border-top-color: var(--accent-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Error */
.error-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
}

.error-icon {
    font-size: 3rem;
}

.error-state h2 {
    font-size: 1.5rem;
    margin: 0;
}

.error-message {
    max-width: 500px;
    padding: 1rem 1.5rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    color: #fff;
    font-size: 1rem;
    line-height: 1.5;
}

.retry-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--accent-blue);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(59, 130, 246, 0.3);
}

.retry-btn svg {
    width: 18px;
    height: 18px;
}

/* Table Container */
.table-container {
    flex: 1;
    overflow-y: auto;
    padding: 0 1rem;
}

.production-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

.production-table thead {
    position: sticky;
    top: 0;
    z-index: 5;
}

.production-table th {
    padding: 1rem 0.75rem;
    background: var(--bg-card);
    text-align: left;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    border-bottom: 2px solid var(--accent-blue);
}

.production-table td {
    padding: 0.875rem 0.75rem;
    border-bottom: 1px solid var(--border-color);
}

.production-table tbody tr {
    background: var(--bg-row);
    transition: all 0.2s ease;
}

.production-table tbody tr:nth-child(even) {
    background: var(--bg-row-alt);
}

.production-table tbody tr:hover {
    background: rgba(59, 130, 246, 0.1);
}

.production-table tbody tr.running {
    background: rgba(59, 130, 246, 0.15);
    animation: rowPulse 2s ease-in-out infinite;
}

@keyframes rowPulse {

    0%,
    100% {
        background: rgba(59, 130, 246, 0.15);
    }

    50% {
        background: rgba(59, 130, 246, 0.25);
    }
}

.production-table tbody tr.completed {
    border-left: 3px solid var(--accent-green);
}

.production-table tbody tr.wip {
    border-left: 3px solid var(--accent-yellow);
}

/* Column styles */
.col-no {
    width: 50px;
    text-align: center;
    font-weight: 600;
    color: var(--text-secondary);
}

.col-part {
    min-width: 130px;
}

.part-number {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    font-size: 0.85rem;
}

.col-job {
    min-width: 100px;
}

.job-number {
    font-weight: 700;
    color: var(--accent-blue);
}

.col-status {
    width: 70px;
    text-align: center;
}

.status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 700;
}

.status-badge.fp {
    background: rgba(16, 185, 129, 0.2);
    color: var(--accent-green);
    border: 1px solid var(--accent-green);
}

.status-badge.wip {
    background: rgba(245, 158, 11, 0.2);
    color: var(--accent-yellow);
    border: 1px solid var(--accent-yellow);
}

.col-process {
    width: 80px;
    text-align: center;
}

.col-plan,
.col-actual {
    text-align: right;
    font-variant-numeric: tabular-nums;
    width: 90px;
}

.col-ket-plan {
    min-width: 120px;
    max-width: 200px;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.col-progress {
    width: 150px;
}

.progress-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.mini-progress {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
}

.mini-progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;
}

.mini-progress-fill.completed {
    background: var(--accent-green);
}

.mini-progress-fill.in-progress,
.mini-progress-fill.wip {
    background: var(--accent-yellow);
}

.mini-progress-fill.pending {
    background: var(--text-secondary);
}

.progress-text {
    font-size: 0.75rem;
    color: var(--text-secondary);
    width: 40px;
    text-align: right;
}

/* Actual value styling */
.actual-value {
    font-variant-numeric: tabular-nums;
}

.actual-value.complete {
    color: var(--accent-green);
    font-weight: 600;
}

/* Keterangan text */
.ket-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Summary Bar */
.summary-bar {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding: 1rem 1.5rem;
    background: var(--bg-card);
    border-top: 1px solid var(--border-color);
}

.summary-stat {
    display: flex;
    flex-direction: column;
}

.summary-stat .stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.summary-stat .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
}

.summary-stat .stat-value.completed {
    color: var(--accent-green);
}

.summary-stat .stat-value.wip {
    color: var(--accent-yellow);
}

.summary-stat .stat-value.achieved {
    color: var(--accent-green);
}

/* Achievement colors */
.summary-stat .stat-value.excellent,
.progress-fill-large.excellent {
    color: var(--accent-green);
    background: var(--accent-green);
}

.summary-stat .stat-value.good,
.progress-fill-large.good {
    color: #22C55E;
    background: #22C55E;
}

.summary-stat .stat-value.warning,
.progress-fill-large.warning {
    color: var(--accent-yellow);
    background: var(--accent-yellow);
}

.summary-stat .stat-value.danger,
.progress-fill-large.danger {
    color: var(--accent-red);
    background: var(--accent-red);
}

.summary-stat.achievement .stat-value {
    font-size: 1.75rem;
}

.progress-overview {
    flex: 1;
    padding-left: 2rem;
}

.progress-bar-large {
    position: relative;
    height: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    overflow: hidden;
}

.progress-fill-large {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transition: width 0.5s ease;
    border-radius: 6px;
}

/* Footer */
.line-footer {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background: rgba(18, 18, 26, 0.95);
    border-top: 1px solid var(--border-color);
    font-size: 0.8rem;
}

.update-time {
    color: var(--text-secondary);
}

.auto-refresh-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
}

.refresh-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
}

.auto-refresh-status.active .refresh-dot {
    background: var(--accent-green);
    animation: pulse 1.5s ease-in-out infinite;
}

.refresh-btn {
    width: 36px;
    height: 36px;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
    background: var(--accent-blue);
    border-color: var(--accent-blue);
}

.refresh-btn:disabled {
    opacity: 0.5;
}

.refresh-btn svg {
    width: 16px;
    height: 16px;
    stroke: var(--text-primary);
}

/* Fullscreen adjustments */
.line-view.fullscreen {
    font-size: 1.1rem;
}

.line-view.fullscreen .production-table {
    font-size: 1rem;
}

.line-view.fullscreen .clock-time {
    font-size: 2rem;
}

/* Responsive */
@media (max-width: 1200px) {
    .header-center {
        display: none;
    }
}

@media (max-width: 768px) {
    .line-header {
        flex-wrap: wrap;
        gap: 1rem;
    }

    .summary-bar {
        flex-wrap: wrap;
        gap: 1rem;
    }

    .progress-overview {
        width: 100%;
        padding-left: 0;
    }
}
</style>