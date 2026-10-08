export interface SpecMachinePress {
  id: number;
  area: string | null;
  line: string | null;
  machine: string;
  press_type: string | null;
  tonnage: string | null;
  stroke: string | null;
  die_size: string | null;
  pos_row: number | null;
  pos_col: number | null;
  is_deleted?: number | string | null;
  note: string | null;
  status: number | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface SpecMachinePressForm {
  id?: number | string;
  area: string;
  line: string;
  machine: string;
  press_type: string;
  tonnage: string;
  stroke: string;
  die_size: string;
  note: string;
}
