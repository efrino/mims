export interface RundownAccuracyItem {
  customer: string;
  model: string;
  model_name: string;
  project_detail: string | null;
  alias_name: string;
  group_name: string;

  ifpd_single: number;
  ifpd_sa: number;
  ifpd_semi_sa: number;
  ifpd_module: number;

  safe_teiki1: number;
  safe_teiki2: number;
  safe_teiryo1: number;
  safe_teiryo2: number;

  over_total: number;
  kritis_total: number;
  kritis: number;
  safe: number;
  over: number;

  strength_kritis: number | null;
  total: number;

  shift: number | string;
  cycle_delv: number | string;

  polybox: number;
  pallet: number;
  pcs_polybox: number;
  pcs_pallet: number;

  acc_std: number;
  acc_mid: number;
  acc_kritis: number;
  acc_total: number;
}

export interface RundownAccuracyDetailItem {
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
