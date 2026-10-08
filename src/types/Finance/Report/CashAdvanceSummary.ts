export interface CashAdvanceSummaryItem {
  // group_by dikunci ke "employee_nik" di sisi frontend — nik/name/department selalu milik karyawan penerima kasbon
  nik: string;
  name: string;
  department: string;
  qty_kasbon: number;
  balance_due: number;
  current_amount: number;
  overdue_0_5: number;
  overdue_6_10: number;
  overdue_11_15: number;
  overdue_16_20: number;
  overdue_21_25: number;
  overdue_gt_25: number;
}

export interface CashAdvanceSummaryDepartmentItem {
  department: string;
  qty_kasbon: number;
  balance_due: number;
  current_amount: number;
  overdue_0_5: number;
  overdue_6_10: number;
  overdue_11_15: number;
  overdue_16_20: number;
  overdue_21_25: number;
  overdue_gt_25: number;
}

export interface CashAdvanceSummaryFilter {
  // Tanggal acuan penentu level overdue (pengganti "hari ini") — bukan filter rentang kasbon_date
  till_date: string;
  employee_nik: string; // tidak dipakai frontend (halaman ini group by departemen saja) — dikosongkan saat fetch
  department: string;   // opsional, filter departemen tunggal
}
