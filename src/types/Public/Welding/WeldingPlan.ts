// ============================================
// Welding Auto Planning Types (FIXED)
// ============================================

export interface PlanningStatistics {
    total_parts: string | number;  // API returns STRING
    fp_parts: string | number;
    wip_parts: string | number;
    total_qty: string | number;
    fp_qty: string | number;
    wip_qty: string | number;
    last_generated: string;
    minutes_ago: string | number;
}

export interface AreaSummary {
    area_code: string;
    area_name: string;
    status_plan: 'FP' | 'WIP';
    total_parts: string | number;  // API returns STRING
    total_qty: string | number;
    total_kanban: string | number;
}

export interface ShiftSummary {
    shift: string | number;  // API returns STRING
    shift_name: string;
    total_parts: string | number;
    fp_parts: string | number;
    wip_parts: string | number;
    total_qty: string | number;
}

export interface BOMCoverage {
    bom_status: 'Has BOM' | 'No BOM';
    parts: string | number;
    qty: string | number;
    percentage: string | number;
}

export interface PlanningDetail {
    date: string;
    shift: number;
    time_shift: string;
    area_code: string;
    area_name: string;
    part_number: string;
    status_plan: 'FP' | 'WIP';
    plan_process: number;
    lotsize: number;
    total_kanban: number;
    user_create: string;
    create_date: string;
}

export interface Area {
    area_code: string;
    area_name: string;
    is_active: string | number;
}

export interface LineMapping {
    id: number;
    line_name: string;
    area_code: string;
    area_name: string;
    is_active: string | number;
}

export interface EventScheduler {
    status: string;
    is_enabled: boolean;
}

export interface EventInfo {
    event_name: string;
    execution_time: string;
    status: string;
    event_comment: string;
    countdown: string;
}

export interface NextEvent {
    event_name: string;
    next_run_time: string;
    event_comment: string;
    countdown: string;
}

export interface PlanningStatusMonitor {
    production_date: string;
    total_parts: number;
    fp_parts: number;
    wip_parts: number;
    total_qty: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    messages?: string;
    message?: string;
}

export interface SummaryResponse {
    success: boolean;
    date: string;
    statistics: PlanningStatistics;
    by_area: AreaSummary[];
    by_shift: ShiftSummary[];
    bom_coverage: BOMCoverage[];
    messages?: string;
    message?: string;
}

export interface DashboardResponse {
    success: boolean;
    date: string;
    statistics: PlanningStatistics;
    summary_by_area: AreaSummary[];
    summary_by_shift: ShiftSummary[];
    details: PlanningDetail[];
    messages?: string;
    message?: string;
}

export interface EventStatusResponse {
    success: boolean;
    scheduler: EventScheduler;
    events: EventInfo[];
    next_event: NextEvent;
    total_events: number;
    messages?: string;
    message?: string;
}

export interface ExportResponse {
    success: boolean;
    date: string;
    data: any[];
    total_records: number;
}

// ============================================
// Request Params
// ============================================

export interface PlanningParams {
    date?: string;
    shift?: number;
}

export interface GenerateParams {
    date: string;
}

export interface DateRangeParams {
    date_from?: string;
    date_to?: string;
}