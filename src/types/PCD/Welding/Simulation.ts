export interface SimulationHeader {
  id: number;
  title: string;
  area: string;
  periode: string;
  status: number | string;
  is_active: number | string;
  note: string;
  created_by: string;
  updated_by: string;
  approved_by: string;
  approved_at: string;
  go_live_by: string;
  go_live_at: string;
  approval_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SimulationLoad {
  id_load: number;
  part_number: string;
  job_number: string;
  model: string;
  total_proses: string;
  qty_kanban: string;
  area_part: string;
  machine_use: string;
  use_upper_holder: string;
  use_lower_holder: string;
  use_kva: string;
  machine_prev: string;
  prev_upper_holder: string;
  prev_lower_holder: string;
  prev_kva: string;
  pcs_day: string | number;
  lot_cycle: string | number;
  patan?: string;
  cycle_time_sec: string | number;
  dandori: string | number;
  downtime: string | number;
  kapasitas_shift: string | number;
  lot_size_shift: string | number;
  prod_time: string | number;
  tpt: string | number;
  beban_persen: string | number;
  is_overload: number;
  is_warning: number;
  machine_use_recommended?: string | null;
  machine_prev_recommended?: string | null;
  machine_recommended?: string | null;
  next_process?: string | null;
  time_proc_start?: string | null;
  time_proc_end?: string | null;
  time_proc_start_shift2?: string | null;
  time_proc_end_shift2?: string | null;
  jig?: string | null;
  jumlah_spot?: number | string | null;
  freq_dresser?: number | string | null;
  freq_tip_change?: number | string | null;
}

export interface SimulationDetail {
  header: SimulationHeader;
  loads: SimulationLoad[];
  summary?: any[];
}

export interface AreaOption {
  area: string;
}

export interface MachineOption {
  id: number;
  line: string;
  machine: string;
  upper_holder: string;
  lower_holder: string;
  kva: string;
  nut_type: string;
  nut_type_alias?: string;
  nut_part_number?: string;
  id_ms_nut?: number;
  nut_feeder: string;
  rotary_holder: string;
  handy_navi: string;
  robo_navi: string;
  gate_sensor: string;
  nut_feeder_type: string;
  note: string;
  area?: string;
  tipe_gun?: string;
  gun_type?: string;
  stroke_dress?: number;
  dress_tip_change?: number;
  downtime_min?: number | string;
}

export interface SimulationCreateLoad {
  id?: number;
  id_ms_part?: number | null;
  area?: string;
  part_number: string;
  job_number?: string;
  part_name?: string;
  model?: string;
  machine?: string;
  proses?: string;
  proses_ke?: number;
  total_proses?: number | string;
  machine_use: string;
  machine_prev: string;
  qty_kanban?: string;
  uph?: string;
  pcs_day_monthly?: string | number | null;
  pcs_day?: string | number;
  lot_cycle?: string | number;
  patan?: string;
  cycle_time_sec?: string | number;
  upper_holder?: string | null;
  lower_holder?: string | null;
  kva?: string | null;
  dandori?: string | number;
  downtime?: string | number;
  lot_size_shift?: string | number;
  prod_time?: string | number;
  tpt?: string | number;
  ckd?: number | string;
  stroke?: number | string;
  is_warning?: number;
  selected?: boolean;
  process?: string;
  ckd_part_number?: string | null;
  id_load?: number;
  _old_machine?: string;
  machine_use_recommended?: string | null;
  machine_prev_recommended?: string | null;
  machine_recommended?: string | null;
  pcs_day_prev?: string | number | null;
  next_process?: string | null;
  status_patan?: string;
  count_pallet?: number | string;
  is_deleted?: boolean;
  part_top_parent?: string | null;
  top_parent_part_number?: string | null;
  is_new_parent_row?: boolean;
  jig?: string | null;
  status_part?: string;
  part_number_delivery?: string;
  jumlah_spot?: number | string | null;
  freq_dresser?: number | string | null;
  freq_tip_change?: number | string | null;
}

export interface CreateSimulationPayload {
  area: string;
  periode: string;
  note?: string;
  created_by: string;
  loads: SimulationCreateLoad[];
}
