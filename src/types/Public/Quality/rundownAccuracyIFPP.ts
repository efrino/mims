export interface RundownAccuracyIFPPItem {
  customer: string;
  model: string;
  model_name: string;
  project_detail: string | null;

  safe_1: number | string;
  safe_2: number | string;
  safe_3: number | string;

  over_total: number | string;
  kritis_total: number | string;
  kritis: number | string;
  safe: number | string;
  over: number | string;
  total: number | string;

  semi_sa: number | string;
  sa: number | string;
  module: number | string;

  shift: number | string;
  cycle_delv: number | string;

  pallet: number | string;
  polybox: number | string;
  pcs_pallet: number | string;
  pcs_polybox: number | string;

  acc_std: number;
  acc_mid: number;
  acc_kritis: number;
  acc_total: number;
}

export interface RundownAccuracyIFPPDetailItem {
  no: number;
  part_no: string;
  status_part: string;
  plant: string;
  project_detail: string | null;
  surface: string;
  hole: string;
  trimline: string;
  appearance: string;
  passrate: number | string;
}
