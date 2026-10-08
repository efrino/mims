/**
 * Modul STO -- bentuk data Report STO.
 *
 * Angka report dihitung dari daftar tag yang sebenarnya. Rekap `summary-*`
 * hanya dipakai StoTagOkCollector sebagai daftar nama area dan part untuk
 * memecah permintaan, bukan sebagai sumber angka -- rekap itu menyaring per
 * rentang tanggal dan tidak menerima id_event.
 */

/**
 * Satu baris GET /summary-tag-ok-part -- rekap tag OK, digroup
 * part_number + job_number + area + qty_kbn. Karena qty_kbn ikut jadi kunci,
 * satu kombinasi part+job+area bisa muncul lebih dari sekali.
 */
export interface StoSummaryTagOkPartRow {
  part_number: string;
  job_number: string;
  area: string;
  qty_kbn: number;
  status: string;
  total_tag: number;
  total_qty: number;
}

export interface StoSummaryTagOkPartResponse {
  status: string;
  message: string;
  start_date: string;
  end_date: string;
  total_row: number;
  grand_total: {
    total_tag: number;
    total_qty: number;
  };
  data: StoSummaryTagOkPartRow[];
}

/** Satu baris Report STO -- hasil gabung kedua rekap di atas. */
export interface StoReportRow {
  part_number: string;
  job_number: string;
  area: string;
  customer: string;
  /** Hanya ada pada tag STO; tag OK tidak menyimpan plant. */
  plant: string;
  /** Storage location dari master_data; hanya ada pada tag STO. */
  sloc: string;
  /** Kategori part dari master_data (mis. GPART); hanya ada pada tag STO. */
  category: string;
  material_description: string;
  sto_total_tag: number;
  sto_qty_a: number;
  sto_qty_b: number;
  sto_selisih: number;
  ok_total_tag: number;
  ok_total_qty: number;
}

/** Rentang tanggal report beserta keterangan asalnya, untuk header file. */
export interface StoReportRentang {
  start_date: string;
  end_date: string;
  /** Nama event asal rentang, atau '' bila jatuh ke bulan berjalan. */
  event_name: string;
}
