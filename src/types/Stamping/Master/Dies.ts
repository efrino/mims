export interface PressDies {
  id: number;
  dies_code: string;
  dies_name: string | null;
  part_number: string | null;
  tonnage_required: string | null;
  dies_length: string | null;
  dies_width: string | null;
  is_deleted?: number | string | null;
  note: string | null;
  status: number | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface PressDiesForm {
  id?: number | string;
  dies_code: string;
  dies_name: string;
  part_number: string;
  tonnage_required: string;
  dies_length: string;
  dies_width: string;
  note: string;
}

export interface DiesPairing {
  id: number;
  dies_id: number;
  machine_id: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  dies_code: string;
  dies_name: string | null;
  part_number: string | null;
  tonnage_required: string | null;
  dies_length: string | null;
  dies_width: string | null;
  machine: string;
  line: string | null;
  area: string | null;
  machine_tonnage: string | null;
  machine_die_size: string | null;
}
