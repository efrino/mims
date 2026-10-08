// src/types/Logistik/MasterData/MasterCycle.ts

/* =======================
 * Core Models
 * ======================= */

export interface ControlPrepareItem {
    cycle: string;
    etd: string;
    eta: string;
    customer?: string;
}

export interface ControlPrepareFilter {
    cycle: number | string;
    date: string;
    customer: string;
    period: string;
}

export interface ControlPrepareFormData {
    customer: string;
    cycle: string;
    etd: string;
    eta: string;
}

/* =======================
 * Datatable Models
 * ======================= */

export interface DatatableHeader {
    text: string;
    align: "left" | "right" | "center";
    value: string;
}

export interface DatatableFilters {
    cycle: string[];
    etd: string[];
    eta: string[];
}

export interface ControlPrepareDatatables {
    headers: DatatableHeader[];
    p5: any[];
    p4: any[];
    items: any[];
    filters: DatatableFilters;
}

/* =======================
 * Dialog & UI State
 * ======================= */

export interface DialogState {
    datePicker: boolean;
    form: boolean;
    timePickerForm: boolean;
    timePickerFormStart: boolean;
    filter: boolean;
}

export interface SpeedDialState {
    model: boolean;
    btn: boolean;
}

/* =======================
 * Store State
 * ======================= */

export interface ControlPrepareState {
    action: "Add" | "Edit";
    apiUrl: string;

    dataMieruka: any[];
    data: any[];
    datap4: any[];
    dataEkspor: any[];

    cycle: number;
    allCycle: any[];
    totalCycle: any[];

    timecyclep4: number;
    itemP5: number;
    itemP4: number;
    itemEkspor: number;
    actItemp4: number;

    filter: ControlPrepareFilter;
    datatables: ControlPrepareDatatables;
    dialog: DialogState;
    speedDial: SpeedDialState;

    formData: ControlPrepareFormData;

    list: {
        customer: string[];
    };

    form: string[];
}
