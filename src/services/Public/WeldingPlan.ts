// ============================================
// Welding Auto Planning API Services
// ============================================

import axios from 'axios';
import type {
    ApiResponse,
    SummaryResponse,
    DashboardResponse,
    EventStatusResponse,
    ExportResponse,
    PlanningStatusMonitor,
    Area,
    LineMapping,
    PlanningParams,
    GenerateParams,
    DateRangeParams
} from '@/types/Public/Welding/WeldingPlan';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.10.67/majsf_rest_api';
const API_PATH = '/api/welding-auto';

// ============================================
// Helper Functions
// ============================================

export function getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
}

export function getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
}

// ============================================
// API Service
// ============================================

export const weldingPlanService = {
    // Test endpoint
    async test() {
        const response = await axios.get(`${BASE_URL}${API_PATH}/test`);
        return response.data;
    },

    // Get planning status (date range)
    async getPlanningStatus(params?: DateRangeParams): Promise<ApiResponse<PlanningStatusMonitor[]>> {
        const response = await axios.get(`${BASE_URL}${API_PATH}/planning-status`, { params });
        return response.data;
    },

    // Get management review
    async getManagementReview(date?: string): Promise<ApiResponse<any[]>> {
        const targetDate = date || getTomorrowDate();
        const response = await axios.get(`${BASE_URL}${API_PATH}/management-review/${targetDate}`);
        return response.data;
    },

    // Get dashboard
    async getDashboard(date?: string, shift?: number): Promise<DashboardResponse> {
        const targetDate = date || getTomorrowDate();
        const params = shift ? { shift } : {};
        const response = await axios.get(`${BASE_URL}${API_PATH}/dashboard/${targetDate}`, { params });
        return response.data;
    },

    // Get summary
    async getSummary(date?: string): Promise<SummaryResponse> {
        const targetDate = date || getTomorrowDate();
        const response = await axios.get(`${BASE_URL}${API_PATH}/summary/${targetDate}`);
        return response.data;
    },

    // Generate schedule
    async generateSchedule(): Promise<ApiResponse<any>> {
        const response = await axios.post(`${BASE_URL}${API_PATH}/generate-schedule`);
        return response.data;
    },

    // Explode BOM
    async explodeBOM(params: GenerateParams): Promise<ApiResponse<any>> {
        const response = await axios.post(`${BASE_URL}${API_PATH}/explode-bom`, params);
        return response.data;
    },

    // Manual refresh
    async manualRefresh(params: GenerateParams): Promise<ApiResponse<any>> {
        const response = await axios.post(`${BASE_URL}${API_PATH}/manual-refresh`, params);
        return response.data;
    },

    // Delete schedule
    async deleteSchedule(date: string): Promise<ApiResponse<any>> {
        const response = await axios.delete(`${BASE_URL}${API_PATH}/schedule/${date}`);
        return response.data;
    },

    // Get areas
    async getAreas(): Promise<ApiResponse<Area[]>> {
        const response = await axios.get(`${BASE_URL}${API_PATH}/areas`);
        return response.data;
    },

    // Get line mappings
    async getLineMappings(): Promise<ApiResponse<LineMapping[]>> {
        const response = await axios.get(`${BASE_URL}${API_PATH}/line-mappings`);
        return response.data;
    },

    // Get BOM overview
    async getBOMOverview(): Promise<ApiResponse<any[]>> {
        const response = await axios.get(`${BASE_URL}${API_PATH}/bom`);
        return response.data;
    },

    // Get BOM by parent
    async getBOMByParent(parentPart: string): Promise<ApiResponse<any[]>> {
        const response = await axios.get(`${BASE_URL}${API_PATH}/bom/${parentPart}`);
        return response.data;
    },

    // Get master parts
    async getMasterParts(search?: string, line?: string): Promise<ApiResponse<any[]>> {
        const params: any = {};
        if (search) params.search = search;
        if (line) params.line = line;
        const response = await axios.get(`${BASE_URL}${API_PATH}/master-parts`, { params });
        return response.data;
    },

    // Get event status
    async getEventStatus(): Promise<EventStatusResponse> {
        const response = await axios.get(`${BASE_URL}${API_PATH}/event-status`);
        return response.data;
    },

    // Export planning
    async exportPlanning(date?: string): Promise<ExportResponse> {
        const targetDate = date || getTomorrowDate();
        const response = await axios.get(`${BASE_URL}${API_PATH}/export/${targetDate}`);
        return response.data;
    }
};

// ============================================
// Utility Functions
// ============================================

export function getStatusColor(status: 'FP' | 'WIP'): string {
    return status === 'FP' ? 'blue' : 'amber';
}

export function getShiftName(shift: number): string {
    return shift === 1 ? 'Shift 1 (07:15-19:00)' : 'Shift 2 (20:00-06:00)';
}

export function calculateCompletionRate(completed: number, total: number): number {
    return total > 0 ? (completed / total) * 100 : 0;
}