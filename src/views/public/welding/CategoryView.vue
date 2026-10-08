<template>
    <div class="category-view">
        <!-- Background -->
        <div class="bg-effects">
            <div class="grid-overlay"></div>
            <div class="glow-orb" :style="{ background: categoryInfo?.color }"></div>
        </div>

        <!-- Header -->
        <header class="view-header">
            <div class="header-left">
                <button @click="goBack" class="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <div class="header-title">
                    <span class="category-icon">{{ categoryInfo?.icon }}</span>
                    <div>
                        <h1>{{ categoryInfo?.name }}</h1>
                        <span class="description">{{ categoryInfo?.description }}</span>
                    </div>
                </div>
            </div>

            <div class="header-right">
                <div class="time-display">
                    <span class="date">{{ currentDate }}</span>
                    <span class="time">{{ currentTime }}</span>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="view-main">
            <!-- Loading -->
            <div v-if="loading" class="loading-state">
                <div class="spinner"></div>
                <span>Loading lines...</span>
            </div>

            <!-- Lines Grid -->
            <div v-else class="lines-container">
                <!-- Summary -->
                <div class="category-summary" :style="{ '--accent-color': categoryInfo?.color }">
                    <div class="summary-item">
                        <span class="value">{{ lines.length }}</span>
                        <span class="label">Total Lines</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">{{ totalJobs }}</span>
                        <span class="label">Total Jobs</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">{{ completedJobs }}</span>
                        <span class="label">Completed</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">{{ wipJobs }}</span>
                        <span class="label">Progress</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">{{ completionRate.toFixed(1) }}%</span>
                        <span class="label">Rate</span>
                    </div>
                </div>

                <!-- Lines -->
                <div class="lines-grid">
                    <div v-for="line in lines" :key="line.line_id" class="line-card"
                        :style="{ '--line-color': categoryInfo?.color }" @click="openLine(line.line_id)">
                        <div class="line-accent"></div>

                        <div class="line-header">
                            <div class="patan-badge">{{ line.patan }}</div>
                            <h3>{{ formatLineName(line.line_id) }}</h3>
                        </div>

                        <div class="line-metrics">
                            <div class="metric">
                                <span class="metric-value">{{ line.detail.length }}</span>
                                <span class="metric-label">Jobs</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">{{ getCompletedCount(line) }}</span>
                                <span class="metric-label">Completed</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">{{ getWipCount(line) }}</span>
                                <span class="metric-label">Progress</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">{{ getCompletionRate(line).toFixed(0) }}%</span>
                                <span class="metric-label">Done</span>
                            </div>
                        </div>

                        <div class="line-progress">
                            <div class="progress-track">
                                <div class="progress-fill" :style="{ width: getCompletionRate(line) + '%' }"></div>
                            </div>
                        </div>

                        <div class="line-footer">
                            <span class="view-text">View Details</span>
                            <span class="arrow-icon">→</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="view-footer">
            <span v-if="lastUpdated">Last updated: {{ formatDateTime(lastUpdated) }}</span>
            <button @click="refresh" class="refresh-btn" :disabled="loading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Refresh
            </button>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWeldingAchievementStore } from '@/stores/Public/Welding';
import {
    WELDING_CATEGORIES,
    isJobCompleted,
    isJobInProgress
} from '@/services/Public/Welding';
import type { WeldingLineData, WeldingCategory } from '@/types/Public/Welding';

const props = defineProps<{
    category: string;
}>();

const route = useRoute();
const router = useRouter();
const store = useWeldingAchievementStore();

// State
const currentTime = ref('');
const currentDate = ref('');
const loading = ref(false);
const lastUpdated = ref<Date | null>(null);

// Timer
let timeInterval: ReturnType<typeof setInterval> | null = null;

// Computed
const categoryInfo = computed(() => {
    return WELDING_CATEGORIES.find(c => c.id === props.category);
});

const categoryName = computed(() => {
    return categoryInfo.value?.name as WeldingCategory | undefined;
});

const lines = computed(() => {
    if (!categoryName.value) return [];
    return store.linesByCategory.get(categoryName.value) || [];
});

const totalJobs = computed(() => {
    return lines.value.reduce((acc, line) => acc + line.detail.length, 0);
});

// Completed: finish_actual >= lotsize
const completedJobs = computed(() => {
    return lines.value.reduce((acc, line) =>
        acc + line.detail.filter(d => isJobCompleted(d)).length, 0);
});

// WIP: has progress but not complete OR is running
const wipJobs = computed(() => {
    return lines.value.reduce((acc, line) =>
        acc + line.detail.filter(d => isJobInProgress(d) || (d.is_running === '1' && !isJobCompleted(d))).length, 0);
});

const completionRate = computed(() => {
    return totalJobs.value > 0 ? (completedJobs.value / totalJobs.value) * 100 : 0;
});

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
};

const formatLineName = (lineId: string) => {
    return lineId.replace(/-/g, ' ').trim();
};

const formatDateTime = (date: Date) => {
    return date.toLocaleString('id-ID');
};

const getCompletedCount = (line: WeldingLineData) => {
    return line.detail.filter(d => isJobCompleted(d)).length;
};

const getWipCount = (line: WeldingLineData) => {
    return line.detail.filter(d => isJobInProgress(d) || (d.is_running === '1' && !isJobCompleted(d))).length;
};

const getCompletionRate = (line: WeldingLineData) => {
    const total = line.detail.length;
    const completed = getCompletedCount(line);
    return total > 0 ? (completed / total) * 100 : 0;
};

const goBack = () => {
    router.push({ name: 'PublicWeldingIndex' });
};

const openLine = (lineId: string) => {
    // Use query params for lineId since it may contain special characters like '/'
    const routeData = router.resolve({
        name: 'PublicWeldingLine',
        query: { id: lineId }
    });
    window.open(routeData.href, '_blank');
};

const refresh = async () => {
    loading.value = true;
    await store.fetchData();
    lastUpdated.value = new Date();
    loading.value = false;
};

// Lifecycle
onMounted(async () => {
    updateTime();
    timeInterval = setInterval(updateTime, 1000);

    if (store.allLines.length === 0) {
        loading.value = true;
        await store.fetchData();
        loading.value = false;
    }
    lastUpdated.value = store.lastUpdated;
});

onUnmounted(() => {
    if (timeInterval) clearInterval(timeInterval);
});
</script>

<style scoped>
.category-view {
    --bg-dark: #0a0a0f;
    --bg-card: #12121a;
    --text-primary: #ffffff;
    --text-secondary: #94a3b8;
    --border-color: rgba(255, 255, 255, 0.1);

    min-height: 100vh;
    background: var(--bg-dark);
    color: var(--text-primary);
    font-family: 'SF Pro Display', -apple-system, sans-serif;
    position: relative;
}

/* Background */
.bg-effects {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
}

.grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
}

.glow-orb {
    position: absolute;
    width: 500px;
    height: 500px;
    top: -200px;
    right: -100px;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.2;
}

/* Header */
.view-header {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: rgba(18, 18, 26, 0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.back-btn {
    width: 44px;
    height: 44px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.back-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--text-secondary);
}

.back-btn svg {
    width: 20px;
    height: 20px;
    stroke: var(--text-secondary);
}

.header-title {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.category-icon {
    font-size: 2.5rem;
}

.header-title h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
}

.header-title .description {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.time-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.time-display .date {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.time-display .time {
    font-size: 1.25rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

/* Main */
.view-main {
    position: relative;
    z-index: 10;
    padding: 2rem;
    min-height: calc(100vh - 160px);
}

/* Loading */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 3px solid var(--border-color);
    border-top-color: var(--accent-color, #3B82F6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Summary */
.category-summary {
    display: flex;
    justify-content: center;
    gap: 3rem;
    padding: 1.5rem 2rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    margin-bottom: 2rem;
}

.summary-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.summary-item .value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent-color, #3B82F6);
}

.summary-item .label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Lines Grid */
.lines-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
}

.line-card {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s ease;
}

.line-card:hover {
    transform: translateY(-5px);
    border-color: var(--line-color, #3B82F6);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.line-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--line-color, #3B82F6);
}

.line-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.patan-badge {
    width: 36px;
    height: 36px;
    background: var(--line-color, #3B82F6);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
}

.line-header h3 {
    font-size: 1rem;
    font-weight: 500;
    margin: 0;
    flex: 1;
}

.line-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
}

.metric-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--line-color, #3B82F6);
}

.metric-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-transform: uppercase;
}

.line-progress {
    margin-bottom: 1rem;
}

.progress-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--line-color, #3B82F6);
    border-radius: 2px;
    transition: width 0.5s ease;
}

.line-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.arrow-icon {
    color: var(--line-color, #3B82F6);
    transition: transform 0.3s ease;
}

.line-card:hover .arrow-icon {
    transform: translateX(5px);
}

/* Footer */
.view-footer {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(18, 18, 26, 0.9);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--border-color);
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
    border-color: var(--accent-color, #3B82F6);
    color: var(--text-primary);
}

.refresh-btn:disabled {
    opacity: 0.5;
}

.refresh-btn svg {
    width: 16px;
    height: 16px;
}

/* Responsive */
@media (max-width: 768px) {
    .view-header {
        flex-direction: column;
        gap: 1rem;
    }

    .category-summary {
        flex-wrap: wrap;
        gap: 1.5rem;
    }

    .lines-grid {
        grid-template-columns: 1fr;
    }
}
</style>