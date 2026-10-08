export interface PalletLogItem {
  id: string;
  no_rfid: string;
  type: string;
  no_pallet: string;
  status: 'IN' | 'OUT' | 'EMPTY';
  category: string;
  customer: string | null;
  id_label: string | null;
  created_at: string;
}

export interface LogDateParams{
  start_date: string;
  end_date: string;
  customer?: string;
}

export interface LogDateErrorResponse {
  success: false;
  messages: string;
}

export type LogDateResponse = PalletLogItem[] | LogDateErrorResponse;

export interface CombinePalletDeliveryItem {
  // kolom asli combine_pallet
  id: string;
  no_rfid: string;
  name: string | null;
  no_pallet: string | null;
  type: string | null;
  category: string | null;
  status: 'IN' | 'OUT' | 'EMPTY';
  customer: string | null;
  id_label: string | null;
  is_active: string | null;
  created_at: string | null;
  updated_at: string | null;
  // sumber data delivery yang cocok dengan id_label
  source: 'ADM' | 'HMMI' | 'MKM' | 'MMKI' | 'TMMIN' | null;
  route: string | null;
  route_name: string | null;
  sub_route_seq: string | null;
  plant: string | null;
  plant_name: string | null;
  // hanya HMMI yang mengenal pembagian ini; customer lain null
  delivery_type: 'REGULER' | 'CKD' | null;
  cycle: string | null;
  /** asal angka cycle:
   *  'label'      = pasti, dari nomor DN di dalam label (ADM/TMMIN/MMKI)
   *  'parameter'  = cycle dikirim sbg filter oleh pemanggil
   *  'jam_keluar' = HMMI/MKM, dari jam scan OUT pallet vs ETD cycle
   *  'perkiraan'  = tebakan aturan lama, TIDAK dapat dipertanggungjawabkan */
  cycle_source: 'label' | 'parameter' | 'jam_keluar' | 'perkiraan' | null;
  // 1 = cycle masih hasil perkiraan
  cycle_is_estimated: string;
  // jam pallet discan OUT (dari logs_pallet)
  jam_keluar: string | null;
  // cycle hasil pencocokan jam keluar dgn ETD
  cycle_by_etd: string | null;
  etd_matched: string | null;
  part_number: string | null;
  qty: string | null;
  qty_scan: string | null;
  // data delivery dari mieruka_delivery
  md_vbeln: string | null;
  md_bstnk: string | null;
  md_delivery_date: string | null;
  qty_order: string | null;
  qty_actual: string | null;
  qty_scan_delivery: string | null;
  eta: string | null;
  etd: string | null;
  customer_sap: string | null;
  // khusus ADM / TMMIN
  delivery_date: string | null;
  trip: string | null;
  manifest_number: string | null;
  // data driver dari logs_pallet
  log_id: string | null;
  nik: string | null;
  nama_driver: string | null;
  nama_lp: string | null;
  no_polisi: string | null;
  log_created_at: string | null;
}

export interface CombineDeliveryParams {
  status?: 'IN' | 'OUT' | 'EMPTY';
  customer?: string;
  // kirim cycle utk mengunci cycle (pola mieruka_shipping) -
  // HMMI/MKM tidak lagi diperkirakan, cycle_is_estimated jadi '0'
  cycle?: string | number;
  // 1 = ADM PLANT 1/4/5, TMMIN, GAYA MOTOR | 2 = HMMI, MMKI, MKM
  group?: 1 | 2;
  no_rfid?: string;
  id_label?: string;
  start_date?: string;
  end_date?: string;
}

export type CombineDeliveryResponse = CombinePalletDeliveryItem[] | LogDateErrorResponse;


/** Satu baris cycle dari mieruka_delivery - dipakai sbg sumber jawaban cycle,
 *  bentuknya mengikuti report-cycle-delivery-all (per customer + cycle). */
export interface DeliveryCycleItem {
  customer: string;
  cycle: string;
  eta: string | null;
  etd: string | null;
  delivery_date: string | null;
  total_part: string;
  total_do: string;
  qty_order: string;
  qty_scan: string;
  item_scanned: string;
  item_total: string;
}

export interface DeliveryCyclesParams {
  group?: 1 | 2;
  date?: string;
  customer?: string;
}

export type DeliveryCyclesResponse = DeliveryCycleItem[] | LogDateErrorResponse;
