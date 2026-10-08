// ============================================
// Welding Achievement Types
// ============================================

// Base Detail Interface untuk semua line
export interface WeldingDetail {
    id: string;
    time_shift: string;
    urut: string;
    urut_plan: string;
    additional: string | null;
    part_number: string;
    job_number: string;
    combination: string | null;
    value_combination: string | null;
    plan_process: string | null;
    act_process: string | null;
    nut_spot: string | null;
    total_process: string;
    tpt: string;
    lotsize: string;
    status_plan: 'FP' | 'WIP' | string;
    stroke_plan: string;
    dandori_plan: string | null;
    uph_plan: string;
    tpt_actual: string | null;
    finish_actual: string | null;
    lotsize_actual: string | null;
    stroke_act: string | null;
    status: string | null;
    repair: string | null;
    reject: string | null;
    dandori: string | null;
    dt_machines: string | null;
    dt_jig: string | null;
    dt_other: string | null;
    dt_wip: string | null;
    dt_total: string | null;
    idletime: string | null;
    uph_act: string | null;
    information: string | null;
    is_open: string;
    is_tandem: string;
    is_running: string;
    is_next: string;
    update_date: string | null;
    user_open: string | null;
    keterangan_plan: string | null;
    keterangan_actual: string | null;
    ket_repair: string | null;
    ket_reject: string | null;
    ket_dt_machines: string | null;
    ket_dt_jig: string | null;
    ket_dt_other: string | null;
    ket_dt_wip: string | null;
}

// Attendance Interface
export interface WeldingAttendance {
    id?: string;
    name?: string;
    nik?: string;
    position?: string;
    status?: string;
}

// Line Data Interface
export interface WeldingLineData {
    patan: string;
    line_id: string;
    detail: WeldingDetail[];
    attendance: WeldingAttendance[];
}

// API Response Interface
export interface WeldingAchievementResponse {
    status: boolean;
    data?: WeldingLineData[];
    messages?: string;
}

// API Request Parameters
export interface WeldingAchievementParams {
    date: string;        // format: YYYY-MM-DD
    period: string;      // format: YYYY-MM
    period2: string;     // format: YYYYMM
    clock: string;       // format: YYYY-MM-DD HH:mm
    hour: string;        // format: HH:mm
    shift: number;       // 1, 2, or 3
    day: number;         // day of month
}

// Category Type untuk grouping
export type WeldingCategory =
    | 'WSS ADM'
    | 'WSS MITSUBISHI'
    | 'S/A ADM'
    | 'S/A MITSUBISHI'
    | 'SPOT ADM'
    | 'SPOT MITSUBISHI';

// Category Info untuk display
export interface WeldingCategoryInfo {
    id: string;
    name: WeldingCategory;
    description: string;
    icon: string;
    color: string;
    bgGradient: string;
}

// Line Info untuk navigation
export interface WeldingLineInfo {
    line_id: string;
    category: WeldingCategory;
    patan: string;
    displayName: string;
    totalJobs: number;
    completedJobs: number;
    wipJobs: number;
}

// Summary Statistics
export interface WeldingSummary {
    totalLines: number;
    totalJobs: number;
    completedJobs: number;
    wipJobs: number;
    completionRate: number;
}

// Status Plan Enum
export enum StatusPlan {
    FP = 'FP',    // Finished Product
    WIP = 'WIP',  // Work In Progress
}

// Display Mode
export type DisplayMode = 'grid' | 'list' | 'fullscreen';

export type {
  DateData,
  Description,
  Job,
  FilterOptions,
  FilterItem,
  FilterField,
  FilterPosition
} from './planning';
