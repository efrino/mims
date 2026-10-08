export interface FormDetail {
  // kehadiran
  hadir: number[];
  izin: number[];
  sakit: number[];
  ganti_hari?: number[];
  jumlah_mesin?: number[];

  // flag / status
  is_tandem: any[];
  is_trial: any[];
  is_terusan: any[];
  is_running?: any[];
  is_next?: any[];
  is_start?: any[];
  is_done: any[];

  // job
  job_number: any[];
  job?: any[];
  job_rh?: any[];
  job_lh?: any[];
  job_number_actual: any[];

  // urutan
  urut: any[];
  urut_new: any[];
  urut_plan: any[];

  // part / kombinasi
  additional: any[];
  patan: any[];
  part_rh: any[];
  part_lh: any[];
  combination: any[];
  value_combination: any[];
  part_number_fix?: any[];

  // status plan & process
  status_plan: any[];
  total_process: any[];
  plan_process: any[];
  act_process: any[];

  // stroke
  stroke_plan: any[];
  stroke_act: any[];
  stroke_machine: any[];

  // lot / kbn / sap
  lot_rh: any[];
  lot_lh: any[];
  kbn_rh: any[];
  kbn_lh: any[];
  sap_rh: any[];
  sap_lh: any[];
  total_sap: number;

  // lotsize
  lotsize: any[];
  total_lotsize_rh: any[];
  total_lotsize_lh: any[];

  // shift – lotsize
  lotsize_rh_shift1: number[];
  lotsize_lh_shift1: number[];
  lotsize_rh_shift2: number[];
  lotsize_lh_shift2: number[];

  // produksi shift
  total_prod_lh_shift1: number[];
  total_prod_lh_shift2: number[];
  total_prod_rh_shift1: number[];
  total_prod_rh_shift2: number[];

  // SAP shift
  SAP_LH_SHIFT1: number[];
  SAP_LH_SHIFT2: number[];
  SAP_RH_SHIFT1: number[];
  SAP_RH_SHIFT2: number[];

  // reject shift
  reject_lh_shift1?: number[];
  reject_lh_shift2?: number[];
  reject_rh_shift1?: number[];
  reject_rh_shift2?: number[];

  total_reject_lh_shift1: number[];
  total_reject_lh_shift2: number[];
  total_reject_rh_shift1: number[];
  total_reject_rh_shift2: number[];

  // pembagi
  pembagi_repair: any[];
  pembagi_reject: any[];

  // actual / finish
  tpt: any[];
  tpt_actual: any[];
  finish_plan: any[];
  finish_plan_current: any[];
  finish_actual_current: any[];
  finish_actual: any[];

  // act / repair / reject
  act_rh: any[];
  act_lh: any[];
  sum_act_rh: any[];
  repair_rh: any[];
  repair_lh: any[];
  reject_rh: any[];
  reject_lh: any[];

  // downtime
  dandori: any[];
  dandori_plan: any[];
  dandori_machine: any[];
  dt_machines: any[];
  dt_dies: any[];
  dt_other: any[];
  dt_material: any[];
  total_dt: any[];

  // gap
  gap_rh: any[];
  gap_lh: any[];

  // GSPH
  gsph: any[];
  gsph_plan: any[];
  gsph_machine?: any[];

  // machine
  machine: any[];
  process: any[];
  qty_actual_machine: any[];
  tpt_machine: any[];
  finish_machine: any[];

  // palet
  act_palet?: any[];
  tipe_palet?: any[];
  qty_palet?: any[];

  // info / ket
  keterangan: string[];
  keterangan_all: string[];
  keterangan_sap: string[];
  keterangan_sap_shift1: string[];
  keterangan_sap_shift2: string[];

  ket_repair_rh: string[];
  ket_repair_lh: string[];
  ket_reject_rh: string[];
  ket_reject_lh: string[];
  ket_idletime?: string[];
  ket_dt_machines: string[];
  ket_dt_dies: string[];
  ket_dt_other: string[];
  ket_dt_material: string[];

  // misc
  status: string[];
  status_delivery: string[];
  last_status?: string[];
  update_date: string[];
  information: string[];
  idletime: string[];

  // shift tambahan
  additional_shift1?: number[];
  additional_shift2?: number[];
  patan_shift1?: number[];
  patan_shift2?: number[];

  // akumulasi
  accum_lotsize_rh: number[];
  actual_progress_now?: number[];
  total_lkh?: number;
  accum_lotsize_rh_1: number;
  accum_lotsize_rh_2: number;
  accum_lotsize_lh_1: number;
  accum_lotsize_lh_2: number;

  accum_prod_rh_1: number;
  accum_prod_rh_2: number;
  accum_prod_lh_1: number;
  accum_prod_lh_2: number;

  accum_sap_rh_1: number;
  accum_sap_rh_2: number;
  accum_sap_lh_1: number;
  accum_sap_lh_2: number;

  accum_gap_rh: number;
  accum_gap_lh: number;

  accum_reject_rh_1: number;
  accum_reject_lh_1: number;
  accum_reject_rh_2: number;
  accum_reject_lh_2: number;
}
