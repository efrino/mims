// ============================================
// Welding Achievement Store (Main Store)
// ============================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
    WeldingAchievementResponse,
    WeldingAchievementParams,
    WeldingLineData,
    WeldingCategory,
    WeldingSummary,
    WeldingCategoryInfo
} from '@/types/Public/Welding';
import {
    weldingAchievementService,
    buildParams,
    extractCategory,
    calculateSummary,
    WELDING_CATEGORIES
} from '@/services/Public/Welding';

export const useWeldingAchievementStore = defineStore('weldingAchievement', () => {
    // ============================================
    // State
    // ============================================
    const allLines = ref<WeldingLineData[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastUpdated = ref<Date | null>(null);
    const autoRefresh = ref(true);
    const refreshInterval = ref(60000); // 1 minute default
    const currentParams = ref<WeldingAchievementParams | null>(null);

    // ============================================
    // Getters
    // ============================================

    // Get all categories info
    const categories = computed(() => WELDING_CATEGORIES);

    // Group lines by category
    const linesByCategory = computed(() => {
        const grouped = new Map<WeldingCategory, WeldingLineData[]>();

        allLines.value.forEach(line => {
            const category = extractCategory(line.line_id);
            const existing = grouped.get(category) || [];
            existing.push(line);
            grouped.set(category, existing);
        });

        return grouped;
    });

    // Get lines for specific category
    const getLinesByCategory = (category: WeldingCategory) => {
        return computed(() => linesByCategory.value.get(category) || []);
    };

    // Get summary for specific category
    const getSummaryByCategory = (category: WeldingCategory) => {
        return computed(() => {
            const lines = linesByCategory.value.get(category) || [];
            let totalJobs = 0;
            let completedJobs = 0;
            let wipJobs = 0;

            lines.forEach(line => {
                const summary = calculateSummary(line.detail);
                totalJobs += summary.totalJobs;
                completedJobs += summary.completedJobs;
                wipJobs += summary.wipJobs;
            });

            return {
                totalLines: lines.length,
                totalJobs,
                completedJobs,
                wipJobs,
                completionRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
            } as WeldingSummary;
        });
    };

    // Overall summary
    const overallSummary = computed(() => {
        let totalJobs = 0;
        let completedJobs = 0;
        let wipJobs = 0;

        allLines.value.forEach(line => {
            const summary = calculateSummary(line.detail);
            totalJobs += summary.totalJobs;
            completedJobs += summary.completedJobs;
            wipJobs += summary.wipJobs;
        });

        return {
            totalLines: allLines.value.length,
            totalJobs,
            completedJobs,
            wipJobs,
            completionRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
        } as WeldingSummary;
    });

    // Get categories with data
    const categoriesWithData = computed(() => {
        return WELDING_CATEGORIES.map(cat => ({
            ...cat,
            lines: linesByCategory.value.get(cat.name) || [],
            summary: getSummaryByCategory(cat.name).value
        }));
    });

    // ============================================
    // Actions
    // ============================================

    // Fetch all data
    async function fetchData(params?: WeldingAchievementParams) {
        loading.value = true;
        error.value = null;

        try {
            const queryParams = params || buildParams();
            currentParams.value = queryParams;

            const response = await weldingAchievementService.fetchAchievement(queryParams);

            if (response.status && response.data) {
                allLines.value = response.data;
                lastUpdated.value = new Date();
                error.value = null;
            } else {
                // Capture API message for user display
                error.value = response.messages || 'Data tidak tersedia';
                allLines.value = [];
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Terjadi kesalahan saat mengambil data';
            allLines.value = [];
            console.error('Error fetching welding achievement:', e);
        } finally {
            loading.value = false;
        }
    }

    // Refresh data
    async function refresh() {
        await fetchData(currentParams.value || undefined);
    }

    // Set auto refresh
    function setAutoRefresh(enabled: boolean, interval?: number) {
        autoRefresh.value = enabled;
        if (interval) {
            refreshInterval.value = interval;
        }
    }

    // Get line by ID
    function getLineById(lineId: string): WeldingLineData | undefined {
        return allLines.value.find(line => line.line_id === lineId);
    }

    // Clear data
    function clearData() {
        allLines.value = [];
        error.value = null;
        lastUpdated.value = null;
    }

    return {
        // State
        allLines,
        loading,
        error,
        lastUpdated,
        autoRefresh,
        refreshInterval,
        currentParams,

        // Getters
        categories,
        linesByCategory,
        overallSummary,
        categoriesWithData,
        getLinesByCategory,
        getSummaryByCategory,

        // Actions
        fetchData,
        refresh,
        setAutoRefresh,
        getLineById,
        clearData
    };
});