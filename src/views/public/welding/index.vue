<template>
    <div class="welding-dashboard">
        <!-- Background Effects -->
        <div class="bg-effects">
            <div class="grid-overlay"></div>
            <div class="glow-orb orb-1"></div>
            <div class="glow-orb orb-2"></div>
            <div class="glow-orb orb-3"></div>
        </div>

        <!-- Header -->
        <header class="dashboard-header">
            <div class="header-content">
                <div class="logo-section">
                    <div class="logo-icon">
                        <svg viewBox="0 0 40 40" fill="none">
                            <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="2" />
                            <path d="M12 20L18 26L28 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                                stroke-linejoin="round" />
                        </svg>
                    </div>
                    <div class="logo-text">
                        <h1>Welding Achievement</h1>
                        <span class="subtitle">Production Monitoring System</span>
                    </div>
                </div>

                <div class="header-info">
                    <div class="info-item">
                        <span class="label">Date</span>
                        <span class="value">{{ currentDate }}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Shift</span>
                        <span class="value">{{ currentShift }}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Time</span>
                        <span class="value time-pulse">{{ currentTime }}</span>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="dashboard-main">
            <!-- Loading State -->
            <div v-if="store.loading" class="loading-state">
                <div class="spinner"></div>
                <span>Loading data...</span>
            </div>

            <!-- Error/Info State -->
            <div v-else-if="store.error" class="error-state">
                <div class="error-icon">📋</div>
                <h2>Informasi</h2>
                <p class="error-message">{{ store.error }}</p>
                <button @click="store.refresh()" class="retry-btn">
                    <span>Refresh</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                            d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                </button>
            </div>

            <!-- Categories Grid -->
            <div v-else class="categories-container">
                <!-- Summary Cards -->
                <div class="summary-section">
                    <div class="summary-card total">
                        <div class="card-icon">📊</div>
                        <div class="card-content">
                            <span class="card-value">{{ store.overallSummary.totalLines }}</span>
                            <span class="card-label">Total Lines</span>
                        </div>
                    </div>
                    <div class="summary-card jobs">
                        <div class="card-icon">🔧</div>
                        <div class="card-content">
                            <span class="card-value">{{ store.overallSummary.totalJobs }}</span>
                            <span class="card-label">Total Jobs</span>
                        </div>
                    </div>
                    <div class="summary-card completed">
                        <div class="card-icon">✅</div>
                        <div class="card-content">
                            <span class="card-value">{{ store.overallSummary.completedJobs }}</span>
                            <span class="card-label">Completed</span>
                        </div>
                    </div>
                    <div class="summary-card wip">
                        <div class="card-icon">⏳</div>
                        <div class="card-content">
                            <span class="card-value">{{ store.overallSummary.wipJobs }}</span>
                            <span class="card-label">In Progress</span>
                        </div>
                    </div>
                    <div class="summary-card rate">
                        <div class="card-icon">📈</div>
                        <div class="card-content">
                            <span class="card-value">{{ store.overallSummary.completionRate.toFixed(1) }}%</span>
                            <span class="card-label">Completion Rate</span>
                        </div>
                    </div>
                </div>

                <!-- Category Cards -->
                <div class="categories-grid">
                    <div v-for="category in store.categoriesWithData" :key="category.id" class="category-card"
                        :style="{ '--card-color': category.color }" @click="openCategory(category.id)">
                        <div class="card-gradient" :style="{ background: category.bgGradient }"></div>

                        <div class="card-header">
                            <span class="card-emoji">{{ category.icon }}</span>
                            <h3>{{ category.name }}</h3>
                        </div>

                        <div class="card-description">
                            {{ category.description }}
                        </div>

                        <div class="card-stats">
                            <div class="stat">
                                <span class="stat-value">{{ category.lines.length }}</span>
                                <span class="stat-label">Lines</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">{{ category.summary.totalJobs }}</span>
                                <span class="stat-label">Jobs</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">{{ category.summary.completionRate.toFixed(0) }}%</span>
                                <span class="stat-label">Complete</span>
                            </div>
                        </div>

                        <div class="card-progress">
                            <div class="progress-bar" :style="{ width: category.summary.completionRate + '%' }"></div>
                        </div>

                        <div class="card-arrow">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="dashboard-footer">
            <div class="footer-content">
                <div class="footer-left">
                    <span v-if="store.lastUpdated">
                        Last updated: {{ formatTime(store.lastUpdated) }}
                    </span>
                </div>
                <div class="footer-center">
                    <span class="auto-refresh" :class="{ active: store.autoRefresh }">
                        <span class="refresh-dot"></span>
                        Auto Refresh: {{ store.autoRefresh ? 'ON' : 'OFF' }}
                    </span>
                </div>
                <div class="footer-right">
                    <button @click="store.refresh()" class="refresh-btn" :disabled="store.loading">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path
                                d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWeldingAchievementStore } from '@/stores/Public/Welding';
import { getCurrentShiftData } from '@/services/Public/Welding';

const router = useRouter();
const store = useWeldingAchievementStore();

// Reactive state
const currentTime = ref('');
const currentDate = ref('');
const currentShift = ref(1);

// Timer ref
let timeInterval: ReturnType<typeof setInterval> | null = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// Methods
const updateTime = () => {
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

    // Use getCurrentShiftData for accurate shift calculation
    const shiftData = getCurrentShiftData();
    currentShift.value = shiftData.shift;
};

const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

const openCategory = (categoryId: string) => {
    const category = store.categoriesWithData.find(c => c.id === categoryId);
    if (category) {
        // Navigate to category page in same tab
        router.push({
            name: 'PublicWeldingCategory',
            params: { category: categoryId }
        });
    }
};

// Lifecycle
onMounted(async () => {
    updateTime();
    timeInterval = setInterval(updateTime, 1000);

    await store.fetchData();

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

<style scoped>
/* ============================================
   CSS Variables & Base Styles
   ============================================ */
.welding-dashboard {
    --primary: #3B82F6;
    --primary-dark: #1D4ED8;
    --success: #10B981;
    --warning: #F59E0B;
    --danger: #EF4444;
    --bg-dark: #0a0a0f;
    --bg-card: #12121a;
    --bg-card-hover: #1a1a25;
    --text-primary: #ffffff;
    --text-secondary: #94a3b8;
    --border-color: rgba(255, 255, 255, 0.1);

    min-height: 100vh;
    background: var(--bg-dark);
    color: var(--text-primary);
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    position: relative;
    overflow-x: hidden;
}

/* ============================================
   Background Effects
   ============================================ */
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
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.3;
    animation: float 20s ease-in-out infinite;
}

.orb-1 {
    width: 600px;
    height: 600px;
    background: var(--primary);
    top: -200px;
    right: -200px;
}

.orb-2 {
    width: 400px;
    height: 400px;
    background: var(--success);
    bottom: -100px;
    left: -100px;
    animation-delay: -7s;
}

.orb-3 {
    width: 300px;
    height: 300px;
    background: var(--warning);
    top: 50%;
    left: 50%;
    animation-delay: -14s;
}

@keyframes float {

    0%,
    100% {
        transform: translate(0, 0) scale(1);
    }

    33% {
        transform: translate(30px, -30px) scale(1.1);
    }

    66% {
        transform: translate(-20px, 20px) scale(0.9);
    }
}

/* ============================================
   Header
   ============================================ */
.dashboard-header {
    position: relative;
    z-index: 10;
    padding: 1.5rem 2rem;
    background: rgba(18, 18, 26, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
}

.header-content {
    max-width: 1800px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo-section {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.logo-icon {
    width: 50px;
    height: 50px;
    color: var(--primary);
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.7;
    }
}

.logo-text h1 {
    font-size: 1.75rem;
    font-weight: 700;
    background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
}

.logo-text .subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.header-info {
    display: flex;
    gap: 2rem;
}

.info-item {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.info-item .label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.info-item .value {
    font-size: 1.25rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.time-pulse {
    animation: timePulse 1s ease-in-out infinite;
}

@keyframes timePulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.8;
    }
}

/* ============================================
   Main Content
   ============================================ */
.dashboard-main {
    position: relative;
    z-index: 10;
    padding: 2rem;
    min-height: calc(100vh - 180px);
}

.categories-container {
    max-width: 1800px;
    margin: 0 auto;
}

/* ============================================
   Summary Section
   ============================================ */
.summary-section {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
}

.summary-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.3s ease;
}

.summary-card:hover {
    transform: translateY(-2px);
    border-color: var(--primary);
    box-shadow: 0 10px 40px rgba(59, 130, 246, 0.1);
}

.summary-card .card-icon {
    font-size: 2rem;
}

.summary-card .card-content {
    display: flex;
    flex-direction: column;
}

.summary-card .card-value {
    font-size: 1.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.summary-card .card-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.summary-card.total .card-value {
    color: var(--primary);
}

.summary-card.jobs .card-value {
    color: var(--text-primary);
}

.summary-card.completed .card-value {
    color: var(--success);
}

.summary-card.wip .card-value {
    color: var(--warning);
}

.summary-card.rate .card-value {
    color: #8B5CF6;
}

/* ============================================
   Categories Grid
   ============================================ */
.categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
}

.category-card {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 1.5rem;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-card:hover {
    transform: translateY(-5px);
    border-color: var(--card-color, var(--primary));
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.category-card .card-gradient {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    opacity: 0.8;
}

.category-card:hover .card-gradient {
    height: 6px;
    opacity: 1;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.card-emoji {
    font-size: 2rem;
}

.card-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
}

.card-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 1.25rem;
}

.card-stats {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1rem;
}

.stat {
    display: flex;
    flex-direction: column;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--card-color, var(--primary));
}

.stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.card-progress {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 1rem;
}

.progress-bar {
    height: 100%;
    background: var(--card-color, var(--primary));
    border-radius: 2px;
    transition: width 0.5s ease;
}

.card-arrow {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.card-arrow svg {
    width: 18px;
    height: 18px;
    stroke: var(--text-secondary);
    transition: all 0.3s ease;
}

.category-card:hover .card-arrow {
    background: var(--card-color, var(--primary));
}

.category-card:hover .card-arrow svg {
    stroke: #fff;
    transform: translateX(3px);
}

/* ============================================
   Loading State
   ============================================ */
/* .loading-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
} */
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


@keyframes l7-2 {

    0%,
    70% {
        transform: translate(0)
    }

    100% {
        transform: translate(200%)
    }
}


/* ============================================
   Error State
   ============================================ */
.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
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
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
}

.error-message {
    max-width: 500px;
    padding: 1rem 1.5rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    color: var(--text-primary);
    font-size: 1rem;
    line-height: 1.5;
}

.retry-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--primary);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.retry-btn:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
}

.retry-btn svg {
    width: 18px;
    height: 18px;
}

/* ============================================
   Footer
   ============================================ */
.dashboard-footer {
    position: relative;
    z-index: 10;
    padding: 1rem 2rem;
    background: rgba(18, 18, 26, 0.8);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--border-color);
}

.footer-content {
    max-width: 1800px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.footer-left,
.footer-center,
.footer-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.footer-left span,
.footer-center span {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.auto-refresh {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.refresh-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
}

.auto-refresh.active .refresh-dot {
    background: var(--success);
    animation: dotPulse 1.5s ease-in-out infinite;
}

@keyframes dotPulse {

    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.3);
        opacity: 0.7;
    }
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
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
    color: var(--text-primary);
    border-color: var(--primary);
    background: rgba(59, 130, 246, 0.1);
}

.refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.refresh-btn svg {
    width: 16px;
    height: 16px;
}

/* ============================================
   Modal
   ============================================ */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
}

.modal-content {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    width: 100%;
    max-width: 900px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
}

.modal-close {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.modal-close:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: var(--danger);
}

.modal-close svg {
    width: 20px;
    height: 20px;
    stroke: var(--text-secondary);
}

.modal-close:hover svg {
    stroke: var(--danger);
}

.modal-body {
    padding: 2rem;
    overflow-y: auto;
}

.line-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
}

.line-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.line-card:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: var(--primary);
    transform: translateX(5px);
}

.line-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.line-patan {
    width: 32px;
    height: 32px;
    background: var(--primary);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
}

.line-id {
    font-weight: 500;
    flex: 1;
}

.line-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.line-arrow {
    color: var(--primary);
    font-size: 1.25rem;
    transition: transform 0.3s ease;
}

.line-card:hover .line-arrow {
    transform: translateX(5px);
}

/* ============================================
   Modal Transitions
   ============================================ */
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.95) translateY(20px);
}

/* ============================================
   Responsive
   ============================================ */
@media (max-width: 1200px) {
    .summary-section {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 768px) {
    .dashboard-header {
        padding: 1rem;
    }

    .header-content {
        flex-direction: column;
        gap: 1rem;
    }

    .header-info {
        gap: 1rem;
    }

    .summary-section {
        grid-template-columns: repeat(2, 1fr);
    }

    .categories-grid {
        grid-template-columns: 1fr;
    }

    .dashboard-main {
        padding: 1rem;
    }

    .footer-content {
        flex-direction: column;
        gap: 1rem;
    }
}
</style>