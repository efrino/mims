<template>
    <div class="display-view" :class="{ fullscreen: isFullscreen }">
        <!-- Background Effects -->
        <div class="bg-effects">
            <div class="scan-line"></div>
            <div class="grid-overlay"></div>
            <div class="glow-orb orb-1"></div>
            <div class="glow-orb orb-2"></div>
        </div>

        <!-- Header -->
        <header class="display-header">
            <div class="header-left">
                <button v-if="!isFullscreen" @click="goBack" class="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <div class="category-badge" :style="{ background: categoryInfo?.bgGradient }">
                    <span class="category-icon">{{ categoryInfo?.icon }}</span>
                    <span class="category-name">{{ categoryInfo?.name }}</span>
                </div>
            </div>

            <div class="header-center">
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-value">{{ categorySummary.totalLines }}</span>
                        <span class="stat-label">Lines</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">{{ categorySummary.totalJobs }}</span>
                        <span class="stat-label">Jobs</span>
                    </div>
                    <div class="stat-item completed">
                        <span class="stat-value">{{ categorySummary.completedJobs }}</span>
                        <span class="stat-label">FP</span>
                    </div>
                    <div class="stat-item wip">
                        <span class="stat-value">{{ categorySummary.wipJobs }}</span>
                        <span class="stat-label">WIP</span>
                    </div>
                    <div class="stat-item rate">
                        <span class="stat-value">{{ categorySummary.completionRate.toFixed(1) }}%</span>
                        <span class="stat-label">Rate</span>
                    </div>
                </div>
            </div>

            <div class="header-right">
                <div class="shift-info">
                    <span class="shift-label">Shift</span>
                    <span class="shift-value">{{ currentShift }}</span>
                </div>
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
        <main class="display-main">
            <!-- Loading -->
            <div v-if="loading" class="loading-overlay">
                <div class="loader-container">
                    <div class="loader-ring"></div>
                    <div class="loader-ring"></div>
                    <div class="loader-ring"></div>
                    <span>Loading data...</span>
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

            <!-- Lines Grid -->
            <div v-else class="lines-container" ref="linesContainer">
                <div class="lines-grid">
                    <div v-for="line in categoryLines" :key="line.line_id" class="line-card"
                        :class="{ 'has-running': getRunningCount(line) > 0 }" @click="openLine(line.line_id)">
                        <!-- Card Header -->
                        <div class="card-header">
                            <div class="patan-badge">{{ line.patan }}</div>
                            <div class="line-name">{{ formatLineName(line.line_id) }}</div>
                            <div class="running-indicator" v-if="getRunningCount(line) > 0">
                                <span class="pulse-dot"></span>
                                <span>Running</span>
                            </div>
                        </div>

                        <!-- Stats Row -->
                        <div class="card-stats">
                            <div class="stat">
                                <span class="stat-num">{{ line.detail.length }}</span>
                                <span class="stat-text">Jobs</span>
                            </div>
                            <div class="stat completed">
                                <span class="stat-num">{{ getCompletedCount(line) }}</span>
                                <span class="stat-text">FP</span>
                            </div>
                            <div class="stat wip">
                                <span class="stat-num">{{ getWipCount(line) }}</span>
                                <span class="stat-text">WIP</span>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="card-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" :style="{ width: getCompletionRate(line) + '%' }"></div>
                            </div>
                            <span class="progress-text">{{ getCompletionRate(line).toFixed(1) }}%</span>
                        </div>

                        <!-- Current Job Preview -->
                        <div class="current-job" v-if="getCurrentJob(line)">
                            <div class="job-label">Current:</div>
                            <div class="job-info">
                                <span class="part-number">{{ getCurrentJob(line)?.part_number }}</span>
                                <span class="job-number">{{ getCurrentJob(line)?.job_number }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="display-footer">
            <div class="footer-left">
                <span class="date-info">{{ currentDate }}</span>
            </div>
            <div class="footer-center">
                <div class="auto-refresh-indicator">
                    <span class="refresh-icon" :class="{ spinning: isRefreshing }">🔄</span>
                    <span>Auto-refresh: {{ autoRefreshSeconds }}s</span>
                </div>
            </div>
            <div class="footer-right">
                <span class="update-time">Last update: {{ lastUpdateTime }}</span>
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWeldingAchievementStore } from '@/stores/Public/Welding';
import {
    WELDING_CATEGORIES,
    getCurrentShiftData,
    isJobCompleted,
    isJobInProgress
} from '@/services/Public/Welding';
import type { WeldingLineData, WeldingDetail, WeldingCategory } from '@/types/Public/Welding';

const route = useRoute();
const router = useRouter();
const store = useWeldingAchievementStore();

// Refs
const linesContainer = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);
const isRefreshing = ref(false);
const autoRefreshSeconds = ref(30);

// Time refs
const currentTime = ref('');
const currentDate = ref('');
const currentShift = ref(1);
const lastUpdateTime = ref('');

// Intervals
let clockInterval: ReturnType<typeof setInterval> | null = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let autoScrollInterval: ReturnType<typeof setInterval> | null = null;

// Computed
const decodedCategory = computed(() => {
    return decodeURIComponent(route.params.category as string) as WeldingCategory;
});

const categoryInfo = computed(() => {
    return WELDING_CATEGORIES.find(c => c.name === decodedCategory.value);
});

const categoryLines = computed(() => {
    return store.getLinesByCategory(decodedCategory.value).value;
});

const categorySummary = computed(() => {
    return store.getSummaryByCategory(decodedCategory.value).value;
});

const loading = computed(() => store.loading);
const error = computed(() => store.error);

// Methods
const formatLineName = (lineId: string): string => {
    // Remove category prefix for cleaner display
    const parts = lineId.split(' - ');
    return parts.length > 1 ? parts.slice(1).join(' - ') : lineId;
};

// Completed: finish_actual >= lotsize
const getCompletedCount = (line: WeldingLineData): number => {
    return line.detail.filter(d => isJobCompleted(d)).length;
};

// WIP: has progress but not complete OR is running
const getWipCount = (line: WeldingLineData): number => {
    return line.detail.filter(d => isJobInProgress(d) || (d.is_running === '1' && !isJobCompleted(d))).length;
};

const getRunningCount = (line: WeldingLineData): number => {
    return line.detail.filter(d => d.is_running === '1').length;
};

const getCompletionRate = (line: WeldingLineData): number => {
    if (line.detail.length === 0) return 0;
    const completed = getCompletedCount(line);
    return (completed / line.detail.length) * 100;
};

const getCurrentJob = (line: WeldingLineData): WeldingDetail | undefined => {
    return line.detail.find(d => d.is_running === '1') ||
        line.detail.find(d => d.is_next === '1');
};

const updateClock = () => {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    currentDate.value = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const shiftData = getCurrentShiftData();
    currentShift.value = shiftData.shift;
};

const refresh = async () => {
    isRefreshing.value = true;
    await store.refresh();
    lastUpdateTime.value = new Date().toLocaleTimeString('id-ID');
    isRefreshing.value = false;
};

const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        isFullscreen.value = true;
    } else {
        await document.exitFullscreen();
        isFullscreen.value = false;
    }
};

const goBack = () => {
    router.back();
};

const openLine = (lineId: string) => {
    // Use query params for lineId since it may contain special characters
    const routeData = router.resolve({
        name: 'PublicWeldingLine',
        query: { id: lineId }
    });
    window.open(routeData.href, '_blank');
};

// Auto-scroll for TV display
const setupAutoScroll = () => {
    if (!linesContainer.value) return;

    const container = linesContainer.value;
    let scrollDirection = 1;
    const scrollSpeed = 1;

    autoScrollInterval = setInterval(() => {
        if (!container) return;

        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll <= 0) return;

        container.scrollTop += scrollDirection * scrollSpeed;

        if (container.scrollTop >= maxScroll) {
            scrollDirection = -1;
        } else if (container.scrollTop <= 0) {
            scrollDirection = 1;
        }
    }, 50);
};

// Lifecycle
onMounted(async () => {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);

    await store.fetchData();
    lastUpdateTime.value = new Date().toLocaleTimeString('id-ID');

    refreshInterval = setInterval(refresh, autoRefreshSeconds.value * 1000);

    // Setup auto-scroll after data loads
    setTimeout(setupAutoScroll, 1000);

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
        isFullscreen.value = !!document.fullscreenElement;
    });
});

onUnmounted(() => {
    if (clockInterval) clearInterval(clockInterval);
    if (refreshInterval) clearInterval(refreshInterval);
    if (autoScrollInterval) clearInterval(autoScrollInterval);
});
</script>

<style scoped>
/* ============================================
   Display View - TV Fullscreen Category Display
   ============================================ */

@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

.display-view {
    min-height: 100vh;
    background: #0a0a0f;
    color: #ffffff;
    font-family: 'Inter', sans-serif;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.display-view.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
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
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.3), transparent);
    animation: scanLine 4s linear infinite;
}

@keyframes scanLine {
    0% {
        top: 0;
        opacity: 0;
    }

    10% {
        opacity: 1;
    }

    90% {
        opacity: 1;
    }

    100% {
        top: 100%;
        opacity: 0;
    }
}

.grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 50px 50px;
}

.glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.3;
}

.orb-1 {
    width: 400px;
    height: 400px;
    background: #3b82f6;
    top: -100px;
    right: -100px;
    animation: float 15s ease-in-out infinite;
}

.orb-2 {
    width: 300px;
    height: 300px;
    background: #10b981;
    bottom: -100px;
    left: -100px;
    animation: float 20s ease-in-out infinite reverse;
}

@keyframes float {

    0%,
    100% {
        transform: translate(0, 0);
    }

    50% {
        transform: translate(30px, -30px);
    }
}

/* Header */
.display-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    background: rgba(18, 18, 26, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 10;
    flex-shrink: 0;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.back-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.back-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateX(-2px);
}

.back-btn svg {
    width: 20px;
    height: 20px;
}

.category-badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.category-icon {
    font-size: 1.5rem;
}

.category-name {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.header-center {
    flex: 1;
    display: flex;
    justify-content: center;
}

.summary-stats {
    display: flex;
    gap: 2rem;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    min-width: 80px;
}

.stat-item.completed .stat-value {
    color: #10b981;
}

.stat-item.wip .stat-value {
    color: #f59e0b;
}

.stat-item.rate .stat-value {
    color: #3b82f6;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
}

.stat-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.shift-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem 1rem;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 10px;
}

.shift-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
}

.shift-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #a78bfa;
    font-family: 'JetBrains Mono', monospace;
}

.live-clock {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.clock-time {
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: #fff;
}

.live-badge {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.65rem;
    font-weight: 600;
    color: #10b981;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.live-badge .pulse {
    width: 6px;
    height: 6px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
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

.fullscreen-btn {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.fullscreen-btn:hover {
    background: rgba(255, 255, 255, 0.15);
}

.fullscreen-btn svg {
    width: 22px;
    height: 22px;
}

/* Main Content */
.display-main {
    flex: 1;
    position: relative;
    z-index: 5;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

/* Loading & Error */
.loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 10, 15, 0.9);
    z-index: 100;
}

.loader-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

.loader-ring {
    width: 60px;
    height: 60px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.loader-ring:nth-child(2) {
    width: 48px;
    height: 48px;
    position: absolute;
    border-top-color: #10b981;
    animation-direction: reverse;
    animation-duration: 0.8s;
}

.loader-ring:nth-child(3) {
    width: 36px;
    height: 36px;
    position: absolute;
    border-top-color: #f59e0b;
    animation-duration: 0.6s;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loader-container span {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
}

.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    text-align: center;
    height: 100%;
}

.error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
}

.error-state h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
}

.error-state p {
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 1.5rem;
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
    padding: 0.75rem 2rem;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.retry-btn svg {
    width: 18px;
    height: 18px;
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
}

/* Lines Container */
.lines-container {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 2rem;
    scroll-behavior: smooth;
}

.lines-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.25rem;
}

/* Line Card */
.line-card {
    background: rgba(18, 18, 26, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.line-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #10b981);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.line-card:hover {
    transform: translateY(-4px);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.line-card:hover::before {
    opacity: 1;
}

.line-card.has-running {
    border-color: rgba(16, 185, 129, 0.3);
    animation: runningPulse 2s ease-in-out infinite;
}

@keyframes runningPulse {

    0%,
    100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }

    50% {
        box-shadow: 0 0 20px 0 rgba(16, 185, 129, 0.2);
    }
}

/* Card Header */
.card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.patan-badge {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
    font-family: 'JetBrains Mono', monospace;
    flex-shrink: 0;
}

.line-name {
    flex: 1;
    font-weight: 600;
    font-size: 0.95rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.running-indicator {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.75rem;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
    color: #10b981;
    text-transform: uppercase;
}

.pulse-dot {
    width: 6px;
    height: 6px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 1s ease-in-out infinite;
}

/* Card Stats */
.card-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.card-stats .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
}

.card-stats .stat-num {
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
}

.card-stats .stat.completed .stat-num {
    color: #10b981;
}

.card-stats .stat.wip .stat-num {
    color: #f59e0b;
}

.card-stats .stat-text {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Card Progress */
.card-progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.progress-bar {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #34d399);
    border-radius: 3px;
    transition: width 0.5s ease;
}

.progress-text {
    font-size: 0.85rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: #10b981;
    min-width: 50px;
    text-align: right;
}

/* Current Job */
.current-job {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 8px;
}

.job-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
}

.job-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.part-number {
    font-size: 0.8rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: #fff;
}

.job-number {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    font-family: 'JetBrains Mono', monospace;
}

/* Footer */
.display-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 2rem;
    background: rgba(18, 18, 26, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 10;
    flex-shrink: 0;
}

.footer-left,
.footer-center,
.footer-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.date-info {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
}

.auto-refresh-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 20px;
    font-size: 0.75rem;
    color: #10b981;
}

.refresh-icon {
    display: inline-block;
    transition: transform 0.3s ease;
}

.refresh-icon.spinning {
    animation: spin 1s linear infinite;
}

.update-time {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    font-family: 'JetBrains Mono', monospace;
}

/* Responsive */
@media (max-width: 1200px) {
    .lines-grid {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
}

@media (max-width: 768px) {
    .display-header {
        flex-wrap: wrap;
        gap: 1rem;
        padding: 1rem;
    }

    .header-center {
        order: 3;
        width: 100%;
    }

    .summary-stats {
        width: 100%;
        justify-content: space-between;
    }

    .lines-container {
        padding: 1rem;
    }

    .lines-grid {
        grid-template-columns: 1fr;
    }
}

/* Scrollbar */
.lines-container::-webkit-scrollbar {
    width: 6px;
}

.lines-container::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
}

.lines-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
}

.lines-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}
</style>