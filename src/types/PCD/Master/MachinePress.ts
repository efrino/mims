export interface MachinePress {
  line_id: string;
  jumlah_mesin: number | null;
  created_date?: string | null;
  user_created?: string | null;
  updated_date?: string | null;
  user_updated?: string | null;
}

export interface MachinePressCreatePayload {
  line_id: string;
  jumlah_mesin: number | null;
  user_created: string;
}

export interface MachinePressUpdatePayload {
  line_id: string;
  jumlah_mesin: number | null;
  user_updated: string;
}

export interface MachinePressDeletePayload {
  line_id: string;
}

/**
 * Backend (Machine_press.php) tidak konsisten antara jalur sukses dan gagal:
 * - Sukses (dari model): { status: true, message, data }
 * - Gagal (dari catch controller): { success: false, messages }
 */
export interface ApiResponse<T = unknown> {
  status?: boolean;
  success?: boolean;
  message?: string;
  messages?: string;
  data?: T;
}
