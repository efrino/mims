// ============================================
// S/A ADM (Sub Assembly ADM) Types
// ============================================

import type {
    WeldingDetail,
    WeldingAttendance,
    WeldingLineData,
    WeldingSummary
} from './index';

// S/A ADM Line Data
export interface SaAdmLineData extends WeldingLineData {
    category: 'S/A ADM';
}

// S/A ADM Detail dengan computed fields
export interface SaAdmDetailComputed extends WeldingDetail {
    // Computed fields
    progressPercentage: number;
    isCompleted: boolean;
    isRunning: boolean;
    estimatedFinishTime: string | null;
}

// S/A ADM Line dengan summary
export interface SaAdmLineWithSummary {
    lineData: SaAdmLineData;
    summary: WeldingSummary;
    details: SaAdmDetailComputed[];
}

// S/A ADM Store State
export interface SaAdmState {
    lines: SaAdmLineData[];
    selectedLine: SaAdmLineData | null;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    autoRefresh: boolean;
    refreshInterval: number;
}

// S/A ADM Filter Options
export interface SaAdmFilterOptions {
    statusPlan: ('FP' | 'WIP' | 'ALL')[];
    searchQuery: string;
    sortBy: 'urut' | 'part_number' | 'status_plan' | 'uph_plan';
    sortOrder: 'asc' | 'desc';
}

// S/A ADM Display Config
export interface SaAdmDisplayConfig {
    showHeader: boolean;
    showFooter: boolean;
    autoScroll: boolean;
    scrollSpeed: number;
    itemsPerPage: number;
    theme: 'light' | 'dark' | 'auto';
}