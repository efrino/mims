export interface params {
  date: string;
  shift: string;
  patan?: string;
}

export interface GangguanItem {
  machine: string;
  job_number_actual: string;
  d_start: string;
  d_end: string;
  urut: string;
  machine_position: string;
  act_mesin: string;
  act_dies: string;
  act_sarana: string;
  is_done: string;
  last_status: string;
}

export interface Action{
  part_number: string;
  date: string;
  shift: string;
  machine: string;
  urut: number;
  machine_position: string;
}