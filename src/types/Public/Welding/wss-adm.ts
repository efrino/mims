// ============================================
// WSS ADM Types
// ============================================

import type {
    WeldingDetail,
    WeldingAttendance,
    WeldingLineData,
    WeldingSummary
} from './index';

// WSS ADM Line Data
export interface WssAdmLineData extends WeldingLineData {
    category: 'WSS ADM';
}

// WSS ADM Detail dengan computed fields
export interface WssAdmDetailComputed extends WeldingDetail {
    // Computed fields
    progressPercentage: number;
    isCompleted: boolean;
    isRunning: boolean;
    estimatedFinishTime: string | null;
}

// WSS ADM Line dengan summary
export interface WssAdmLineWithSummary {
    lineData: WssAdmLineData;
    summary: WeldingSummary;
    details: WssAdmDetailComputed[];
}

// WSS ADM Store State
export interface WssAdmState {
    lines: WssAdmLineData[];
    selectedLine: WssAdmLineData | null;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    autoRefresh: boolean;
    refreshInterval: number; // in milliseconds
}

// WSS ADM Filter Options
export interface WssAdmFilterOptions {
    statusPlan: ('FP' | 'WIP' | 'ALL')[];
    searchQuery: string;
    sortBy: 'urut' | 'part_number' | 'status_plan' | 'uph_plan';
    sortOrder: 'asc' | 'desc';
}

// WSS ADM Display Config
export interface WssAdmDisplayConfig {
    showHeader: boolean;
    showFooter: boolean;
    autoScroll: boolean;
    scrollSpeed: number;
    itemsPerPage: number;
    theme: 'light' | 'dark' | 'auto';
}