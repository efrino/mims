// ============================================
// WSS Mitsubishi Types
// ============================================

import type {
    WeldingDetail,
    WeldingAttendance,
    WeldingLineData,
    WeldingSummary
} from './index';

// WSS Mitsubishi Line Data
export interface WssMitsubishiLineData extends WeldingLineData {
    category: 'WSS MITSUBISHI';
}

// WSS Mitsubishi Detail dengan computed fields
export interface WssMitsubishiDetailComputed extends WeldingDetail {
    // Computed fields
    progressPercentage: number;
    isCompleted: boolean;
    isRunning: boolean;
    estimatedFinishTime: string | null;
}

// WSS Mitsubishi Line dengan summary
export interface WssMitsubishiLineWithSummary {
    lineData: WssMitsubishiLineData;
    summary: WeldingSummary;
    details: WssMitsubishiDetailComputed[];
}

// WSS Mitsubishi Store State
export interface WssMitsubishiState {
    lines: WssMitsubishiLineData[];
    selectedLine: WssMitsubishiLineData | null;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    autoRefresh: boolean;
    refreshInterval: number;
}

// WSS Mitsubishi Filter Options
export interface WssMitsubishiFilterOptions {
    statusPlan: ('FP' | 'WIP' | 'ALL')[];
    searchQuery: string;
    sortBy: 'urut' | 'part_number' | 'status_plan' | 'uph_plan';
    sortOrder: 'asc' | 'desc';
}

// WSS Mitsubishi Display Config
export interface WssMitsubishiDisplayConfig {
    showHeader: boolean;
    showFooter: boolean;
    autoScroll: boolean;
    scrollSpeed: number;
    itemsPerPage: number;
    theme: 'light' | 'dark' | 'auto';
}