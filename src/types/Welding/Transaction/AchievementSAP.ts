export enum ShiftEnum {
  SHIFT_1 = 1,
  SHIFT_2 = 2,
}

export enum AdditionalTypeEnum {
  REGULAR = 0,
  ADD = 1,
  LJ = 2,
  TP = 3,
}

export const KETERANGAN_SAP_OPTIONS = [
  'Scan Minus Kbn',
  'Minus Kbn Cut Off',
  'Minus Part Reject',
  'Minus Trouble Dies',
  'Minus Trouble Mesin',
  'Minus R/M kurang',
  'Kanban Error',
  'Add Request Qty',
  'Add Pcs Reject',
] as const;

export type KeteranganSAPOption = typeof KETERANGAN_SAP_OPTIONS[number];

export interface SAPFormDetail {
  urut_plan: number[];
  additional: AdditionalTypeEnum[];
  patan: string[];
  part_number: string[];
  lotsize: number[];
  lotsize_actual: number[];
  qty_sap: number[];
  reject: number[];
  keterangan_sap: KeteranganSAPOption[][];
  total_lot_rh: number;
  total_ok: number;
  total_sap: number;
  total_repair: number;
}

export interface SAPLineDetail {
  urut_plan: number;
  additional: AdditionalTypeEnum;
  patan: string;
  part_number: string;
  lotsize: number;
  lotsize_actual: number;
  qty_sap: number;
  reject: number;
  keterangan_sap: string;
}

export interface SAPLine {
  line_id: string;
  patan: string;
  shift: ShiftEnum;
  date: string;
  connection: boolean;
  detail: SAPLineDetail[];
  total_lot_rh: number;
  total_ok: number;
  total_sap: number;
  total_repair: number;
}

export interface SAPDialogState {
  detail: boolean;
  filter: boolean;
  sync: boolean;
  datePicker: boolean;
}

export interface SAPParams {
  date: string;
  shift: ShiftEnum;
  period: string;
}

export interface SAPList {
  keterangan_sap: readonly KeteranganSAPOption[];
}

export interface SAPState {
  view: boolean;
  lines: SAPLine[];
  line: SAPLine | null;
  formDetail: SAPFormDetail;
  dialog: SAPDialogState;
  params: SAPParams;
  listShift: readonly ShiftEnum[];
  list: SAPList;
}

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data?: T;
  additional_info?: string;
}

export interface SAPApiResponse extends ApiResponse<SAPLine[]> {}

export interface SAPSaveResponse extends ApiResponse<null> {
  additional_info?: string;
}

export interface SAPSyncResponse extends ApiResponse<null> {}

export interface RawApiResponse {
  status: unknown;
  message: unknown;
  data?: unknown;
  additional_info?: unknown;
}

export interface SAPFormDataPayload {
  formDetail: SAPFormDetail;
  lineId: string;
  date: string;
  shift: ShiftEnum;
  patan: string;
}

export interface FormDetailInitOptions {
  length?: number;
}

export interface SocketUpdatePayload {
  lineId: string;
  date: string;
  shift: ShiftEnum;
}

export type PataanDisplay = 'Add' | 'LJ' | 'TP' | string;

export function isSAPLine(obj: unknown): obj is SAPLine {
  if (typeof obj !== 'object' || obj === null) return false;

  const line = obj as Record<string, unknown>;

  return (
    typeof line.line_id === 'string' &&
    typeof line.patan === 'string' &&
    (line.shift === ShiftEnum.SHIFT_1 || line.shift === ShiftEnum.SHIFT_2) &&
    typeof line.date === 'string' &&
    typeof line.connection === 'boolean' &&
    Array.isArray(line.detail)
  );
}

export function isSAPLineDetail(obj: unknown): obj is SAPLineDetail {
  if (typeof obj !== 'object' || obj === null) return false;

  const detail = obj as Record<string, unknown>;

  return (
    typeof detail.urut_plan === 'number' &&
    typeof detail.additional === 'number' &&
    typeof detail.patan === 'string' &&
    typeof detail.part_number === 'string' &&
    typeof detail.lotsize === 'number' &&
    typeof detail.lotsize_actual === 'number' &&
    typeof detail.qty_sap === 'number' &&
    typeof detail.reject === 'number' &&
    typeof detail.keterangan_sap === 'string'
  );
}

export function isApiResponse(obj: unknown): obj is RawApiResponse {
  if (typeof obj !== 'object' || obj === null) return false;

  const response = obj as Record<string, unknown>;

  return (
    typeof response.status === 'boolean' &&
    typeof response.message === 'string'
  );
}