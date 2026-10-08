export type GunType = 'GUN C' | 'GUN X' | 'GUN X&C';

export interface SubAssyRobot {
  machine: string;
  gun_type: GunType;
  downtime_min: number;
  shift: number;
  max_hours: number;
  one_mp_hours: number;
  lot_cycle_factor: number;
  total_tpt?: number;
  total_prod_time?: number;
  total_dandori?: number;
  total_downtime?: number;
  total_stroke?: number;
  total_pcs?: number;
  uph?: number;
  beban_persen?: number;
  is_overload?: boolean;
}

export interface SubAssyPartLoad {
  id: number;
  id_simulation: number;
  part_number: string;
  job_number?: string;
  part_name?: string;
  model?: string;
  machine_use: string;
  machine_prev?: string;
  gun_type?: GunType;
  pcs_day: number;
  jumlah_spot: number;
  stroke_day: number;
  freq_dresser: number;
  freq_tip_change: number;
  tip_change: number; // in seconds
  dandori: number; // in minutes
  downtime: number; // in minutes
  lot_size_shift: number;
  cycle_time_sec: number;
  prod_time: number; // in hours
  tpt: number; // in hours
  uph?: number;
  process?: string;
  jig?: string;
  status_part?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubAssyBalanceMove {
  part_number: string;
  process?: string;
  from: string;
  to: string;
  gun_source: GunType;
  gun_target: GunType;
  status?: string;
  reason?: string;
}

export interface SubAssySummaryByMachine {
  machine: string;
  gun_type: GunType;
  pcs_day: number;
  stroke_day: number;
  prod_time: number; // hours
  dandori: number; // hours
  downtime: number; // hours
  tip_change: number; // hours
  tpt: number; // hours
  uph: number;
  beban_persen: number;
  is_overload: number;
}
