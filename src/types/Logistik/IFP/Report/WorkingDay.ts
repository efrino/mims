export interface WorkingDayHeader {
  period: string
  note_header: string
  note_general: string | null
  month_info?: string
  year_info?: string
}

export interface WorkingDayDetail {
  id: string
  header_id: string
  customer_name: string
  name: string
  customer_id: string
  shift: string
  total_wd_excel: string
  total_wd_sistem: string
  total_shift_day: string
  total_shift_night: string
  total_each_shift: string
  last_order_before_holiday: string | null
  first_order_after_holiday: string | null
  reference: string | null
  created_at: string
  updated_at: string
  year_info: string
  [key: string]: string | null | undefined
}

export interface WorkingDayResponse {
  status: boolean
  header: WorkingDayHeader
  details: WorkingDayDetail[]
}

export interface WorkingDayFilter {
  month: string
  year: number | string
}

export interface UploadResponse {
  status: boolean
  message: string
  data?: unknown
}

export interface WorkingDayState {
  data: WorkingDayDetail[]
  header: WorkingDayHeader | null
  loading: boolean
  error: string | null
  permissions: {        
    create: boolean;
    update?: boolean;
    delete?: boolean;
  };
}