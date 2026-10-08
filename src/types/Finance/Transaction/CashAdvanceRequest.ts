export type KasbonStatus = 'Open' | 'Approved' | 'Closed';

export interface CashAdvanceRequestItem {
  id: number;
  kasbon_no: string;
  kasbon_date: string;
  employee_nik: string;
  employee_name: string;
  employee_department: string;
  // Nama kategori dari API (join ms_category) — field lama `category` sudah tidak dikirim backend
  category_name: string;
  category_id: number | null;
  description: string;
  amount: string;            // API mengembalikan string decimal "5000000.00"
  usage_date: string;
  due_date: string;
  report_note: string | null;
  // Tanggal BKK, diinput user di form settlement (dulu closing_date). Bisa null pada kasbon Closed.
  bkk_date: string | null;
  bkk_no: string | null;
  realization_amount: string | null;
  total_paid: string;
  outstanding_amount: string;
  cash_received: string | null;
  status: KasbonStatus;
  // approved_by/approved_at terisi begitu kasbon di-approve (Open → Approved)
  approved_by: string | null;
  approved_at: string | null;
  // created_by berperan ganda: siapa yang input sekaligus PIC kasbon (pic_nik sudah dihapus dari backend)
  created_by: string;
  created_by_name: string;
  created_by_department: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface CashAdvanceRequestForm {
  kasbon_date: string;
  employee_nik: string;
  category_id: number | null;
  description: string;
  amount: number | null;
  usage_date: string;
  created_by: string | null;
}

export interface CashAdvanceRequestFilter {
  date_from: string;
  date_to: string;
  status: string;
  employee_nik: string;
  category_id: number | null;
  created_by: string | null;
}

export interface CashAdvanceRequestApiResponse {
  status: boolean;
  message: string;
  count?: number;
  data: CashAdvanceRequestItem[] | { id: number; kasbon_no: string; due_date: string };
}

export interface EmployeeOption {
  value: string;
  label: string;
  sublabel?: string;
  // Badge di kanan opsi (fitur bawaan Autocomplete) — dipakai untuk menandai "Limit 3/3"
  statusLabel?: { label: string; colorMap?: Record<string, string> };
  // Terisi jika NIK sudah mencapai kasbon_limit. Autocomplete sendiri tidak mengenal field ini;
  // dipakai store untuk membatalkan pilihan dan menampilkan keterangan.
  disabled?: boolean;
  disabledReason?: string;
}

// Karyawan whitelist beserta limit kasbon aktifnya (dari GET /employees_ca)
export interface KasbonEmployee {
  nik: string;
  name: string;
  department?: string;
  kasbon_limit: number | null;
}

// Open = kuning (menunggu approval), Approved = biru (siap settlement), Closed = hijau (selesai)
export const STATUS_CONFIG: Record<KasbonStatus, { label: string; bgClass: string; textClass: string }> = {
  Open:     { label: 'Open',     bgClass: 'bg-amber-100',   textClass: 'text-amber-700' },
  Approved: { label: 'Approved', bgClass: 'bg-blue-100',    textClass: 'text-blue-700' },
  Closed:   { label: 'Closed',   bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
};
