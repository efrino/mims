// Baris data Supply Material, sumber dari tabel majsf_irm.reservation.
// Key unik satu baris: no_reservasi (RSNUM) + no_item (RSPOS) - satu no reservasi
// bisa punya beberapa item/part berbeda.
export interface SupplyMaterialItem {
  id: number;
  no_reservasi: string;
  no_item: string;
  line: string;
  job_no: string;
  part_no: string;
  // Storage location (LGORT) dan batch (CHARG) dari SAP. Optional karena baris
  // lama di tabel reservation belum punya kolomnya.
  lgort?: string | null;
  charg?: string | null;
  req_date: string | null;
  stock_irm: number;
  qty_request: number;
  qty_supply: number;
  tp_problem: string | null;
  deleted_at: string | null;
  is_deleted: number;
  // Status TP berlaku per item, bukan per no reservasi
  is_tp: number;
  // 1 kalau SAP menandai item ini sudah di-TP langsung dari sisi SAP (KZEAR = 'X').
  // Efeknya sama dengan is_tp: item terkunci dari ubah qty supply dan TP.
  is_sap_tp: number;
  mat_doc: string | null;
  tp_at: string | null;
  tp_by: string | null;
  posting_date: string | null;
  // Terisi kalau baris ini ternyata cocok dengan item pemanfaatan yang pernah
  // diinput pada no reservasi yang sama - artinya baris ini adalah item
  // pemanfaatan ATAS item util_for_no_item.
  util_for_no_item: string | null;
  util_status: string | null;
  util_for_part_no: string | null;
  created_at: string;
  updated_at: string;
}

export type SupplyLogAction = "adjust" | "tp" | "cancel_tp" | "deleted" | "restored" | "sap_sync";

// Satu baris riwayat perubahan qty supply (ditampilkan di modal Riwayat)
export interface SupplyLogItem {
  action: SupplyLogAction;
  qty_plus: number;
  qty_minus: number;
  qty_change: number;
  qty_before: number;
  qty_after: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

// Satu baris riwayat yang membawa identitas itemnya. Dipakai download Excel:
// riwayat semua baris diambil sekali lewat endpoint historyBulk, lalu
// dikelompokkan di client dengan key no_reservasi + no_item.
export interface SupplyLogEntry extends SupplyLogItem {
  no_reservasi: string;
  no_item: string;
}

// Item pemanfaatan: item pengganti/tambahan yang dipakai atas salah satu item
// pada suatu no reservasi.
export interface UtilizationItem {
  id: number;
  no_reservasi: string;
  part_no: string;
  status: string;
  qty: number;
  for_no_item: string;
  for_part_no: string | null;
  sap_status: string;
  // 1 kalau item ini sudah muncul sebagai baris reservation dari SAP
  sap_matched: number;
  created_by: string | null;
  created_at: string;
}

// Yang dikirim adalah SELISIH (tambah/kurang), bukan nilai akhir - nilai akhir
// dihitung backend supaya dua user yang menyimpan bersamaan tidak saling menimpa.
export interface AdjustItemPayload {
  no_item: string;
  qty_plus: number;
  qty_minus: number;
}

export interface AdjustQtySupplyPayload {
  no_reservasi: string;
  items: AdjustItemPayload[];
}

export interface TransferPostingPayload {
  no_reservasi: string;
  posting_date: string;
  // { no_item: pesan problem } - wajib untuk item yang qty supply != qty request
  problems: Record<string, string>;
}

// Hasil pencarian material dari SAP (RPT SEARCH_MAT / tabel ZSEARCH_MAT)
export interface SapMaterialItem {
  part_no: string;
  job_no: string;
  description: string;
}

export interface AddUtilizationPayload {
  no_reservasi: string;
  part_no: string;
  status: string;
  qty: number;
  for_no_item: string;
}

export interface CancelTpPayload {
  mat_doc: string | null;
  no_reservasi: string;
  reason: string;
}

// Filter tanggal - client-side, berdasarkan created_at
export interface FilterDateSupply {
  start: string;
  end: string;
}
