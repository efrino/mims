// ============================================
// Welding Auto Planning Store (FIXED)
// ============================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
    SummaryResponse,
    DashboardResponse,
    EventStatusResponse,
    Area,
    LineMapping,
    PlanningStatistics,
    AreaSummary,
    ShiftSummary,
    BOMCoverage,
    PlanningDetail
} from '@/types/Public/Welding/WeldingPlan';
import { weldingPlanService, getTomorrowDate } from '@/services/Public/WeldingPlan';

// Helper to convert string to number
const toNumber = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

export const useWeldingPlanStore = defineStore('weldingPlan', () => {
    // ============================================
    // State
    // ============================================
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastUpdated = ref<Date | null>(null);
    const autoRefresh = ref(true);
    const refreshInterval = ref(60000); // 1 minute

    // Data
    const currentDate = ref<string>(getTomorrowDate());
    const statistics = ref<PlanningStatistics | null>(null);
    const areasSummary = ref<AreaSummary[]>([]);
    const shiftsSummary = ref<ShiftSummary[]>([]);
    const bomCoverage = ref<BOMCoverage[]>([]);
    const planningDetails = ref<PlanningDetail[]>([]);
    const areas = ref<Area[]>([]);
    const lineMappings = ref<LineMapping[]>([]);
    const eventStatus = ref<EventStatusResponse | null>(null);

    // ============================================
    // Getters
    // ============================================

    const hasPlanningData = computed(() => {
        return statistics.value !== null && areasSummary.value.length > 0;
    });

    const totalParts = computed(() => toNumber(statistics.value?.total_parts));
    const fpParts = computed(() => toNumber(statistics.value?.fp_parts));
    const wipParts = computed(() => toNumber(statistics.value?.wip_parts));
    const totalQty = computed(() => toNumber(statistics.value?.total_qty));

    const completionRate = computed(() => {
        if (!statistics.value) return 0;
        const total = toNumber(statistics.value.total_parts);
        const fp = toNumber(statistics.value.fp_parts);
        return total > 0 ? (fp / total) * 100 : 0;
    });

    const areasByShift = computed(() => {
        const grouped = new Map<number, AreaSummary[]>();
        areasSummary.value.forEach(area => {
            const shift = 1; // Default
            const existing = grouped.get(shift) || [];
            existing.push(area);
            grouped.set(shift, existing);
        });
        return grouped;
    });

    const schedulerStatus = computed(() => {
        return eventStatus.value?.scheduler?.is_enabled ? 'ON' : 'OFF';
    });

    const nextEventInfo = computed(() => {
        return eventStatus.value?.next_event;
    });

    // ============================================
    // Actions
    // ============================================

    async function fetchSummary(date?: string) {
        loading.value = true;
        error.value = null;

        try {
            const targetDate = date || getTomorrowDate();
            currentDate.value = targetDate;

            console.log('Fetching summary for date:', targetDate);
            const response = await weldingPlanService.getSummary(targetDate);
            console.log('Summary response:', response);

            if (response.success) {
                statistics.value = response.statistics;
                areasSummary.value = response.by_area || [];
                shiftsSummary.value = response.by_shift || [];
                bomCoverage.value = response.bom_coverage || [];
                lastUpdated.value = new Date();
                error.value = null;

                console.log('Data loaded successfully:', {
                    statistics: statistics.value,
                    areas: areasSummary.value.length,
                    shifts: shiftsSummary.value.length
                });
            } else {
                error.value = response.messages || 'Data tidak tersedia';
                clearPlanningData();
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Terjadi kesalahan';
            clearPlanningData();
            console.error('Error fetching summary:', e);
        } finally {
            loading.value = false;
            console.log('Loading state:', loading.value);
        }
    }

    async function fetchDashboard(date?: string, shift?: number) {
        loading.value = true;
        error.value = null;

        try {
            const targetDate = date || getTomorrowDate();
            currentDate.value = targetDate;

            const response = await weldingPlanService.getDashboard(targetDate, shift);

            if (response.success) {
                statistics.value = response.statistics;
                areasSummary.value = response.summary_by_area || [];
                shiftsSummary.value = response.summary_by_shift || [];
                planningDetails.value = response.details || [];
                lastUpdated.value = new Date();
                error.value = null;
            } else {
                error.value = response.messages || 'Data tidak tersedia';
                clearPlanningData();
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Terjadi kesalahan';
            clearPlanningData();
            console.error('Error fetching dashboard:', e);
        } finally {
            loading.value = false;
        }
    }

    async function fetchEventStatus() {
        try {
            console.log('Fetching event status...');
            const response = await weldingPlanService.getEventStatus();
            console.log('Event status response:', response);

            if (response.success) {
                eventStatus.value = response;
            }
        } catch (e) {
            console.error('Error fetching event status:', e);
        }
    }

    async function fetchAreas() {
        try {
            const response = await weldingPlanService.getAreas();
            if (response.success && response.data) {
                areas.value = response.data;
            }
        } catch (e) {
            console.error('Error fetching areas:', e);
        }
    }

    async function fetchLineMappings() {
        try {
            const response = await weldingPlanService.getLineMappings();
            if (response.success && response.data) {
                lineMappings.value = response.data;
            }
        } catch (e) {
            console.error('Error fetching line mappings:', e);
        }
    }

    async function generateSchedule() {
        loading.value = true;
        error.value = null;

        try {
            const response = await weldingPlanService.generateSchedule();
            if (response.success) {
                await fetchSummary(currentDate.value);
                return { success: true, message: response.messages || 'Schedule generated' };
            } else {
                error.value = response.messages || 'Failed to generate schedule';
                return { success: false, message: error.value };
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Terjadi kesalahan';
            return { success: false, message: error.value };
        } finally {
            loading.value = false;
        }
    }

    async function explodeBOM(date: string) {
        loading.value = true;
        error.value = null;

        try {
            const response = await weldingPlanService.explodeBOM({ date });
            if (response.success) {
                await fetchSummary(date);
                return { success: true, message: 'BOM exploded successfully' };
            } else {
                error.value = response.messages || 'Failed to explode BOM';
                return { success: false, message: error.value };
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Terjadi kesalahan';
            return { success: false, message: error.value };
        } finally {
            loading.value = false;
        }
    }

    async function manualRefresh(date: string) {
        loading.value = true;
        error.value = null;

        try {
            const response = await weldingPlanService.manualRefresh({ date });
            if (response.success) {
                await fetchSummary(date);
                return { success: true, message: 'Planning refreshed successfully' };
            } else {
                error.value = response.messages || 'Failed to refresh planning';
                return { success: false, message: error.value };
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Terjadi kesalahan';
            return { success: false, message: error.value };
        } finally {
            loading.value = false;
        }
    }

    async function deleteSchedule(date: string) {
        loading.value = true;
        error.value = null;

        try {
            const response = await weldingPlanService.deleteSchedule(date);
            if (response.success) {
                clearPlanningData();
                return { success: true, message: 'Schedule deleted' };
            } else {
                error.value = response.messages || 'Failed to delete schedule';
                return { success: false, message: error.value };
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Terjadi kesalahan';
            return { success: false, message: error.value };
        } finally {
            loading.value = false;
        }
    }

    async function exportPlanning(date?: string) {
        try {
            const response = await weldingPlanService.exportPlanning(date);
            return response;
        } catch (e) {
            console.error('Error exporting planning:', e);
            throw e;
        }
    }

    function clearPlanningData() {
        statistics.value = null;
        areasSummary.value = [];
        shiftsSummary.value = [];
        bomCoverage.value = [];
        planningDetails.value = [];
    }

    function setAutoRefresh(enabled: boolean, interval?: number) {
        autoRefresh.value = enabled;
        if (interval) {
            refreshInterval.value = interval;
        }
    }

    async function refresh() {
        await fetchSummary(currentDate.value);
        await fetchEventStatus();
    }

    return {
        // State
        loading,
        error,
        lastUpdated,
        autoRefresh,
        refreshInterval,
        currentDate,
        statistics,
        areasSummary,
        shiftsSummary,
        bomCoverage,
        planningDetails,
        areas,
        lineMappings,
        eventStatus,

        // Getters
        hasPlanningData,
        totalParts,
        fpParts,
        wipParts,
        totalQty,
        completionRate,
        areasByShift,
        schedulerStatus,
        nextEventInfo,

        // Actions
        fetchSummary,
        fetchDashboard,
        fetchEventStatus,
        fetchAreas,
        fetchLineMappings,
        generateSchedule,
        explodeBOM,
        manualRefresh,
        deleteSchedule,
        exportPlanning,
        clearPlanningData,
        setAutoRefresh,
        refresh
    };
});