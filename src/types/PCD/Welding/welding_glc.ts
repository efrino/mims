export interface WeldingGlcPart {
  part_number: string;
  job_number: string;
  part_name: string | null;
  op: string;
  status_part: string;
  model: string;
  machine: string;
  total_proses: string;
  uph: string;
  qty_kanban: string;
  lot_cycle: string | null;
  patan?: string | null;
  pcs_kanban: string;
}
