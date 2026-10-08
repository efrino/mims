// ============================================
// WSS ADM Store
// ============================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
    WeldingAchievementParams,
    WeldingLineData,
    WeldingSummary,
    WeldingDetail
} from '@/types/Public/Welding';
import type {
    WssAdmLineData,
    WssAdmFilterOptions,
    WssAdmDisplayConfig
} from '@/types/Public/Welding/wss-adm';
import {
    weldingAchievementService,
    buildParams,
    calculateSummary
} from '@/services/Public/Welding';

export const useWssAdmStore = defineStore('wssAdm', () => {
    // ============================================
    // State
    // ============================================
    const lines = ref<WeldingLineData[]>([]);
    const selectedLine = ref<WeldingLineData | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastUpdated = ref<Date | null>(null);
    const autoRefresh = ref(true);
    const refreshInterval = ref(60000);
    const currentParams = ref<WeldingAchievementParams | null>(null);

    // Filter state
    const filter = ref<WssAdmFilterOptions>({
        statusPlan: ['ALL'],
        searchQuery: '',
        sortBy: 'urut',
        sortOrder: 'asc'
    });

    // Display config
    const displayConfig = ref<WssAdmDisplayConfig>({
        showHeader: true,
        showFooter: true,
        autoScroll: false,
        scrollSpeed: 50,
        itemsPerPage: 10,
        theme: 'dark'
    });

    // ============================================
    // Getters
    // ============================================

    // Get summary
    const summary = computed(() => {
        let totalJobs = 0;
        let completedJobs = 0;
        let wipJobs = 0;

        lines.value.forEach(line => {
            const lineSummary = calculateSummary(line.detail);
            totalJobs += lineSummary.totalJobs;
            completedJobs += lineSummary.completedJobs;
            wipJobs += lineSummary.wipJobs;
        });

        return {
            totalLines: lines.value.length,
            totalJobs,
            completedJobs,
            wipJobs,
            completionRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
        } as WeldingSummary;
    });

    // Filtered details for selected line
    const filteredDetails = computed(() => {
        if (!selectedLine.value) return [];

        let details = [...selectedLine.value.detail];

        // Filter by status
        if (!filter.value.statusPlan.includes('ALL')) {
            details = details.filter(d =>
                filter.value.statusPlan.includes(d.status_plan as 'FP' | 'WIP')
            );
        }

        // Filter by search query
        if (filter.value.searchQuery) {
            const query = filter.value.searchQuery.toLowerCase();
            details = details.filter(d =>
                d.part_number.toLowerCase().includes(query) ||
                d.job_number.toLowerCase().includes(query)
            );
        }

        // Sort
        details.sort((a, b) => {
            let comparison = 0;

            switch (filter.value.sortBy) {
                case 'urut':
                    comparison = parseInt(a.urut) - parseInt(b.urut);
                    break;
                case 'part_number':
                    comparison = a.part_number.localeCompare(b.part_number);
                    break;
                case 'status_plan':
                    comparison = a.status_plan.localeCompare(b.status_plan);
                    break;
                case 'uph_plan':
                    comparison = parseFloat(a.uph_plan) - parseFloat(b.uph_plan);
                    break;
            }

            return filter.value.sortOrder === 'asc' ? comparison : -comparison;
        });

        return details;
    });

    // Line names for selection
    const lineNames = computed(() => {
        return lines.value.map(line => ({
            id: line.line_id,
            name: line.line_id.replace(/-/g, ' ').trim(),
            patan: line.patan,
            jobCount: line.detail.length
        }));
    });

    // ============================================
    // Actions
    // ============================================

    // Fetch WSS ADM lines
    async function fetchLines(params?: WeldingAchievementParams) {
        loading.value = true;
        error.value = null;

        try {
            const queryParams = params || buildParams();
            currentParams.value = queryParams;

            const fetchedLines = await weldingAchievementService.getLinesByCategory('WSS ADM', queryParams);
            lines.value = fetchedLines;
            lastUpdated.value = new Date();

            // Auto-select first line if none selected
            if (!selectedLine.value && fetchedLines.length > 0) {
                selectedLine.value = fetchedLines[0];
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Unknown error occurred';
            console.error('Error fetching WSS ADM lines:', e);
        } finally {
            loading.value = false;
        }
    }

    // Select line
    function selectLine(lineId: string) {
        const line = lines.value.find(l => l.line_id === lineId);
        if (line) {
            selectedLine.value = line;
        }
    }

    // Update filter
    function updateFilter(newFilter: Partial<WssAdmFilterOptions>) {
        filter.value = { ...filter.value, ...newFilter };
    }

    // Update display config
    function updateDisplayConfig(newConfig: Partial<WssAdmDisplayConfig>) {
        displayConfig.value = { ...displayConfig.value, ...newConfig };
    }

    // Refresh data
    async function refresh() {
        await fetchLines(currentParams.value || undefined);
    }

    // Set auto refresh
    function setAutoRefresh(enabled: boolean, interval?: number) {
        autoRefresh.value = enabled;
        if (interval) {
            refreshInterval.value = interval;
        }
    }

    // Clear selection
    function clearSelection() {
        selectedLine.value = null;
    }

    // Reset filter
    function resetFilter() {
        filter.value = {
            statusPlan: ['ALL'],
            searchQuery: '',
            sortBy: 'urut',
            sortOrder: 'asc'
        };
    }

    return {
        // State
        lines,
        selectedLine,
        loading,
        error,
        lastUpdated,
        autoRefresh,
        refreshInterval,
        filter,
        displayConfig,

        // Getters
        summary,
        filteredDetails,
        lineNames,

        // Actions
        fetchLines,
        selectLine,
        updateFilter,
        updateDisplayConfig,
        refresh,
        setAutoRefresh,
        clearSelection,
        resetFilter
    };
});