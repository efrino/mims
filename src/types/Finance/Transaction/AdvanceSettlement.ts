export type KasbonStatus = 'Open' | 'Approved' | 'Closed';

export interface AdvanceSettlementItem {
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
  amount: string;
  usage_date: string;
  due_date: string;
  report_note: string | null;
  // Tanggal BKK, diinput user di form settlement (dulu closing_date). Bukan penanda kapan kasbon
  // Closed — bisa null pada kasbon Closed.
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
  active: number;
  cancelled_by: string | null;
  cancelled_at: string | null;
  // created_by berperan ganda: siapa yang input sekaligus PIC kasbon (pic_nik sudah dihapus dari backend)
  created_by: string;
  created_by_name: string;
  created_by_department: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

// Field pengajuan — hanya bisa diupdate saat status Open
export interface KasbonEditForm {
  kasbon_date: string;
  employee_nik: string;
  category_id: number | null;
  description: string;
  amount: number | null;
  usage_date: string;
}

// Field settlement — hanya bisa diupdate saat status Approved
export interface SettlementForm {
  report_note: string;
  bkk_no: string;
  bkk_date: string; // YYYY-MM-DD, '' = belum diisi
  realization_amount: number | null;
  cash_received: number | null;
}

export interface SettlementFilter {
  date_from: string;
  date_to: string;
}

export interface EmployeeOption {
  value: string;
  label: string;
  sublabel?: string;
}

// Open = kuning (menunggu approval), Approved = biru (siap settlement), Closed = hijau (selesai)
export const STATUS_CONFIG: Record<KasbonStatus, { bgClass: string; textClass: string }> = {
  Open:     { bgClass: 'bg-amber-100',   textClass: 'text-amber-700' },
  Approved: { bgClass: 'bg-blue-100',    textClass: 'text-blue-700' },
  Closed:   { bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
};
