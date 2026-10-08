<template>
    <div class="patan-view">
        <!-- Background -->
        <div class="bg-effects">
            <div class="grid-overlay"></div>
            <div class="glow-orb"></div>
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
                    <div class="patan-icon">{{ patan }}</div>
                    <div>
                        <h1>Patan {{ patan }}</h1>
                        <span class="subtitle">All Lines in Patan {{ patan }}</span>
                    </div>
                </div>
            </div>

            <div class="header-right">
                <div class="time-info">
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
                <span>Loading data...</span>
            </div>

            <!-- Lines by Category -->
            <div v-else class="lines-container">
                <!-- Summary -->
                <div class="patan-summary">
                    <div class="summary-card">
                        <span class="card-value">{{ filteredLines.length }}</span>
                        <span class="card-label">Total Lines</span>
                    </div>
                    <div class="summary-card">
                        <span class="card-value">{{ totalJobs }}</span>
                        <span class="card-label">Total Jobs</span>
                    </div>
                    <div class="summary-card">
                        <span class="card-value success">{{ completedJobs }}</span>
                        <span class="card-label">Completed</span>
                    </div>
                    <div class="summary-card">
                        <span class="card-value warning">{{ wipJobs }}</span>
                        <span class="card-label">WIP</span>
                    </div>
                </div>

                <!-- Lines grouped by category -->
                <div v-for="(categoryLines, categoryName) in linesByCategory" :key="categoryName"
                    class="category-section">
                    <div class="category-header">
                        <h2>{{ categoryName }}</h2>
                        <span class="line-count">{{ categoryLines.length }} lines</span>
                    </div>

                    <div class="lines-grid">
                        <div v-for="line in categoryLines" :key="line.line_id" class="line-card"
                            @click="openLine(line.line_id)">
                            <div class="line-header">
                                <span class="line-badge">{{ line.patan }}</span>
                                <span class="line-name">{{ formatLineName(line.line_id) }}</span>
                            </div>

                            <div class="line-stats">
                                <div class="stat">
                                    <span class="stat-value">{{ line.detail.length }}</span>
                                    <span class="stat-label">Jobs</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value success">{{ getCompletedCount(line) }}</span>
                                    <span class="stat-label">FP</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value warning">{{ getWipCount(line) }}</span>
                                    <span class="stat-label">WIP</span>
                                </div>
                            </div>

                            <div class="line-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" :style="{ width: getCompletionRate(line) + '%' }"></div>
                                </div>
                                <span class="progress-text">{{ getCompletionRate(line).toFixed(0) }}%</span>
                            </div>

                            <div class="line-action">
                                <span>View Details</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="filteredLines.length === 0" class="empty-state">
                    <div class="empty-icon">📭</div>
                    <h3>No lines found</h3>
                    <p>No production lines found for Patan {{ patan }}</p>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="view-footer">
            <span v-if="lastUpdated">Updated: {{ formatDateTime(lastUpdated) }}</span>
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
import { useRouter } from 'vue-router';
import { useWeldingAchievementStore } from '@/stores/Public/Welding';
import {
    extractCategory,
    isJobCompleted,
    isJobInProgress
} from '@/services/Public/Welding';
import type { WeldingLineData, WeldingCategory } from '@/types/Public/Welding';

const props = defineProps<{
    patan: string;
}>();

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
const filteredLines = computed(() => {
    return store.allLines.filter(line =>
        line.patan.toUpperCase() === props.patan.toUpperCase()
    );
});

const linesByCategory = computed(() => {
    const grouped: Record<WeldingCategory, WeldingLineData[]> = {} as any;

    filteredLines.value.forEach(line => {
        const category = extractCategory(line.line_id);
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(line);
    });

    return grouped;
});

const totalJobs = computed(() => {
    return filteredLines.value.reduce((acc, line) => acc + line.detail.length, 0);
});

// Completed: finish_actual >= lotsize
const completedJobs = computed(() => {
    return filteredLines.value.reduce((acc, line) =>
        acc + line.detail.filter(d => isJobCompleted(d)).length, 0);
});

// WIP: has progress but not complete OR is running
const wipJobs = computed(() => {
    return filteredLines.value.reduce((acc, line) =>
        acc + line.detail.filter(d => isJobInProgress(d) || (d.is_running === '1' && !isJobCompleted(d))).length, 0);
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
    return date.toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
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
    // Use query params for lineId since it may contain special characters
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
.patan-view {
    --bg-dark: #0a0a0f;
    --bg-card: #12121a;
    --text-primary: #ffffff;
    --text-secondary: #94a3b8;
    --border-color: rgba(255, 255, 255, 0.1);
    --accent-primary: #3B82F6;
    --accent-success: #10B981;
    --accent-warning: #F59E0B;

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
    width: 600px;
    height: 600px;
    top: -300px;
    right: -200px;
    background: var(--accent-primary);
    border-radius: 50%;
    filter: blur(150px);
    opacity: 0.15;
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

.patan-icon {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, var(--accent-primary) 0%, #1D4ED8 100%);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 700;
}

.header-title h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
}

.header-title .subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.time-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.time-info .date {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.time-info .time {
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
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Summary */
.patan-summary {
    display: flex;
    justify-content: center;
    gap: 2rem;
    padding: 1.5rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    margin-bottom: 2rem;
}

.summary-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 100px;
}

.summary-card .card-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent-primary);
}

.summary-card .card-value.success {
    color: var(--accent-success);
}

.summary-card .card-value.warning {
    color: var(--accent-warning);
}

.summary-card .card-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Category Section */
.category-section {
    margin-bottom: 2rem;
}

.category-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
}

.category-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
}

.line-count {
    font-size: 0.875rem;
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.05);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
}

/* Lines Grid */
.lines-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
}

.line-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.line-card:hover {
    transform: translateY(-3px);
    border-color: var(--accent-primary);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
}

.line-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.line-badge {
    width: 32px;
    height: 32px;
    background: var(--accent-primary);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
}

.line-name {
    font-weight: 500;
    font-size: 0.9rem;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.line-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
}

.stat-value {
    font-size: 1.25rem;
    font-weight: 600;
}

.stat-value.success {
    color: var(--accent-success);
}

.stat-value.warning {
    color: var(--accent-warning);
}

.stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-transform: uppercase;
}

.line-progress {
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
    background: var(--accent-primary);
    border-radius: 3px;
    transition: width 0.5s ease;
}

.progress-text {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 40px;
    text-align: right;
}

.line-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--accent-primary);
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
}

.line-action svg {
    width: 16px;
    height: 16px;
    transition: transform 0.3s ease;
}

.line-card:hover .line-action svg {
    transform: translateX(5px);
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 4rem 2rem;
}

.empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
}

.empty-state h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
}

.empty-state p {
    color: var(--text-secondary);
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
    border-color: var(--accent-primary);
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

    .patan-summary {
        flex-wrap: wrap;
        gap: 1rem;
    }

    .lines-grid {
        grid-template-columns: 1fr;
    }
}
</style>