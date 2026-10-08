export interface PartMovementLog {
  id: string;
  simulation_id?: number | string;
  timestamp: string; // e.g. '2026-09-09 14:35:10'
  user: string;
  part_number: string;
  part_name?: string;
  job_number?: string;
  model?: string;
  process?: number | string;
  from_machine: string;
  to_machine: string;
  reason: string;
  is_auto: boolean;
  tpt_before?: number;
  tpt_after?: number;
  pcs_day?: number;
  cycle_time_sec?: number;
  line?: string;
}
