// ============================================
// Welding Achievement Service
// ============================================

import type {
    WeldingAchievementResponse,
    WeldingAchievementParams,
    WeldingLineData,
    WeldingCategory,
    WeldingCategoryInfo,
    WeldingLineInfo,
    WeldingSummary,
    WeldingDetail
} from '@/types/Public/Welding';

// API Base URL
const API_BASE_URL = 'http://192.168.10.67/majsf_rest_api/api';

// ============================================
// Helper Functions
// ============================================

/**
 * Format date to YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

/**
 * Format date to YYYY-MM
 */
export const formatPeriod = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Format date to YYYYMM
 */
export const formatPeriod2 = (date: Date): string => {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Get current clock string
 */
export const getCurrentClock = (date: Date): string => {
    const dateStr = formatDate(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
};

/**
 * Get current hour string
 */
export const getCurrentHour = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Determine shift based on time
 * Shift 1: 07:15 - 20:00
 * Shift 2: 20:00 - 07:15 (next day)
 */
export const getShift = (date: Date = new Date()): number => {
    const time = parseInt(
        `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`
    );
    const shift_1 = 71500;  // 07:15:00
    const shift_2 = 200000; // 20:00:00

    // Shift 1: 07:15:00 - 19:59:59
    if (time >= shift_1 && time < shift_2) {
        return 1;
    }
    // Shift 2: 20:00:00 - 07:14:59 (next day)
    return 2;
};

/**
 * Get current shift data with proper date handling
 * Based on utility.ts getCurrentShift logic
 */
export const getCurrentShiftData = (): {
    date: string;
    period: string;
    period2: string;
    clock: string;
    hour: string;
    shift: number;
    day: number;
} => {
    const now = new Date();
    const time = parseInt(
        `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    );
    const shift_1 = 71500;  // 07:15:00
    const shift_2 = 200000; // 20:00:00

    let result = {
        date: formatDate(now),
        period: formatPeriod(now),
        period2: formatPeriod2(now),
        clock: getCurrentClock(now),
        hour: getCurrentHour(now),
        shift: 1,
        day: now.getDate(),
    };

    // Check if NOT in shift 1 range (07:15 - 20:00)
    if (!(time >= shift_1 && time < shift_2)) {
        result.shift = 2;
        // If time is before 07:15 (after midnight), use previous day's date
        if (!(time >= shift_2)) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            result.date = formatDate(yesterday);
            result.period = formatPeriod(yesterday);
            result.period2 = formatPeriod2(yesterday);
            result.clock = `${formatDate(yesterday)} ${getCurrentHour(now)}`;
            result.day = yesterday.getDate();
        }
    }

    return result;
};

/**
 * Build API parameters from date
 */
/**
 * Build API parameters using current shift data
 */
export const buildParams = (): WeldingAchievementParams => {
    const shiftData = getCurrentShiftData();
    return {
        date: shiftData.date,
        period: shiftData.period,
        period2: shiftData.period2,
        clock: shiftData.clock,
        hour: shiftData.hour,
        shift: shiftData.shift,
        day: shiftData.day
    };
};

/**
 * Extract category from line_id
 */
export const extractCategory = (lineId: string): WeldingCategory => {
    const upperLineId = lineId.toUpperCase();

    if (upperLineId.includes('WSS') && upperLineId.includes('MITSUBISHI')) {
        return 'WSS MITSUBISHI';
    }
    if (upperLineId.includes('WSS') && upperLineId.includes('ADM')) {
        return 'WSS ADM';
    }
    if (upperLineId.includes('S/A') && upperLineId.includes('MITSUBISHI')) {
        return 'S/A MITSUBISHI';
    }
    if (upperLineId.includes('S/A') && upperLineId.includes('ADM')) {
        return 'S/A ADM';
    }
    if (upperLineId.includes('SPOT') && upperLineId.includes('MITSUBISHI')) {
        return 'SPOT MITSUBISHI';
    }
    if (upperLineId.includes('SPOT') && upperLineId.includes('ADM')) {
        return 'SPOT ADM';
    }

    // Default fallback
    return 'WSS ADM';
};

/**
 * Check if a job is completed (finish_actual >= lotsize)
 */
export const isJobCompleted = (detail: WeldingDetail): boolean => {
    const finishActual = parseInt(detail.finish_actual || '0') || 0;
    const lotsize = parseInt(detail.lotsize || '0') || 0;
    return lotsize > 0 && finishActual >= lotsize;
};

/**
 * Check if a job is in progress (has some finish_actual but not complete)
 */
export const isJobInProgress = (detail: WeldingDetail): boolean => {
    const finishActual = parseInt(detail.finish_actual || '0') || 0;
    const lotsize = parseInt(detail.lotsize || '0') || 0;
    return finishActual > 0 && finishActual < lotsize;
};

/**
 * Get job progress percentage
 */
export const getJobProgress = (detail: WeldingDetail): number => {
    const finishActual = parseInt(detail.finish_actual || '0') || 0;
    const lotsize = parseInt(detail.lotsize || '0') || 0;
    if (lotsize === 0) return 0;
    return Math.min((finishActual / lotsize) * 100, 100);
};

/**
 * Calculate summary from line data
 * - completedJobs: finish_actual >= lotsize
 * - wipJobs: has progress but not complete OR is_running = '1'
 */
export const calculateSummary = (details: WeldingDetail[]): WeldingSummary => {
    const totalJobs = details.length;
    const completedJobs = details.filter(d => isJobCompleted(d)).length;
    const wipJobs = details.filter(d => {
        // WIP if: in progress OR currently running and not yet complete
        return isJobInProgress(d) || (d.is_running === '1' && !isJobCompleted(d));
    }).length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    return {
        totalLines: 1,
        totalJobs,
        completedJobs,
        wipJobs,
        completionRate
    };
};

/**
 * Get line info from line data
 */
export const getLineInfo = (lineData: WeldingLineData): WeldingLineInfo => {
    const category = extractCategory(lineData.line_id);
    const summary = calculateSummary(lineData.detail);

    return {
        line_id: lineData.line_id,
        category,
        patan: lineData.patan,
        displayName: lineData.line_id.replace(/-/g, ' ').trim(),
        totalJobs: summary.totalJobs,
        completedJobs: summary.completedJobs,
        wipJobs: summary.wipJobs
    };
};

// ============================================
// Category Definitions
// ============================================

export const WELDING_CATEGORIES: WeldingCategoryInfo[] = [
    {
        id: 'wss-adm',
        name: 'WSS ADM',
        description: 'Welding Sub Assembly - ADM',
        icon: '🔧',
        color: '#3B82F6',
        bgGradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
    },
    {
        id: 'wss-mitsubishi',
        name: 'WSS MITSUBISHI',
        description: 'Welding Sub Assembly - Mitsubishi',
        icon: '⚙️',
        color: '#EF4444',
        bgGradient: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)'
    },
    {
        id: 'sa-adm',
        name: 'S/A ADM',
        description: 'Sub Assembly - ADM',
        icon: '🔩',
        color: '#10B981',
        bgGradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)'
    },
    {
        id: 'sa-mitsubishi',
        name: 'S/A MITSUBISHI',
        description: 'Sub Assembly - Mitsubishi',
        icon: '🔨',
        color: '#F59E0B',
        bgGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
    },
    {
        id: 'spot-adm',
        name: 'SPOT ADM',
        description: 'Spot Welding - ADM',
        icon: '⚡',
        color: '#8B5CF6',
        bgGradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
    },
    {
        id: 'spot-mitsubishi',
        name: 'SPOT MITSUBISHI',
        description: 'Spot Welding - Mitsubishi',
        icon: '🔥',
        color: '#EC4899',
        bgGradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)'
    }
];

// ============================================
// API Service
// ============================================

class WeldingAchievementService {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Fetch welding achievement data
     */
    async fetchAchievement(params?: WeldingAchievementParams): Promise<WeldingAchievementResponse> {
        const queryParams = params || buildParams();

        const url = new URL(`${this.baseUrl}/welding-achievement/achievement`);
        url.searchParams.append('date', queryParams.date);
        url.searchParams.append('period', queryParams.period);
        url.searchParams.append('period2', queryParams.period2);
        url.searchParams.append('clock', queryParams.clock);
        url.searchParams.append('hour', queryParams.hour);
        url.searchParams.append('shift', String(queryParams.shift));
        url.searchParams.append('day', String(queryParams.day));

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: WeldingAchievementResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching welding achievement:', error);
            throw error;
        }
    }

    /**
     * Get lines by category
     */
    async getLinesByCategory(category: WeldingCategory, params?: WeldingAchievementParams): Promise<WeldingLineData[]> {
        const response = await this.fetchAchievement(params);

        if (!response.status || !response.data) {
            return [];
        }

        return response.data.filter(line => extractCategory(line.line_id) === category);
    }

    /**
     * Get line by ID
     */
    async getLineById(lineId: string, params?: WeldingAchievementParams): Promise<WeldingLineData | null> {
        const response = await this.fetchAchievement(params);

        if (!response.status || !response.data) {
            return null;
        }

        return response.data.find(line => line.line_id === lineId) || null;
    }

    /**
     * Get all categories with their lines
     */
    async getAllCategoriesWithLines(params?: WeldingAchievementParams): Promise<Map<WeldingCategory, WeldingLineData[]>> {
        const response = await this.fetchAchievement(params);
        const categorizedLines = new Map<WeldingCategory, WeldingLineData[]>();

        if (!response.status || !response.data) {
            return categorizedLines;
        }

        response.data.forEach(line => {
            const category = extractCategory(line.line_id);
            const existing = categorizedLines.get(category) || [];
            existing.push(line);
            categorizedLines.set(category, existing);
        });

        return categorizedLines;
    }

    /**
     * Get summary by category
     */
    async getSummaryByCategory(category: WeldingCategory, params?: WeldingAchievementParams): Promise<WeldingSummary> {
        const lines = await this.getLinesByCategory(category, params);

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
        };
    }

    /**
     * Get overall summary
     */
    async getOverallSummary(params?: WeldingAchievementParams): Promise<WeldingSummary> {
        const response = await this.fetchAchievement(params);

        if (!response.status || !response.data) {
            return {
                totalLines: 0,
                totalJobs: 0,
                completedJobs: 0,
                wipJobs: 0,
                completionRate: 0
            };
        }

        let totalJobs = 0;
        let completedJobs = 0;
        let wipJobs = 0;

        response.data.forEach(line => {
            const summary = calculateSummary(line.detail);
            totalJobs += summary.totalJobs;
            completedJobs += summary.completedJobs;
            wipJobs += summary.wipJobs;
        });

        return {
            totalLines: response.data.length,
            totalJobs,
            completedJobs,
            wipJobs,
            completionRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
        };
    }
}

// Export singleton instance
export const weldingAchievementService = new WeldingAchievementService();

// Export class for custom instances
export { WeldingAchievementService };