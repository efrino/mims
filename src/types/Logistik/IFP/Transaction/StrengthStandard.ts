export interface StrengthStandardPayload {
  action: 'insert';
  part_no: string;
  customer: string;
  std_min: number;
  std_max: number;
}

export interface StrengthStandardUpdatePayload {
  action: 'update';
  id: number;
  part_no: string;
  customer: string;
  std_min: number;
  std_max: number;
}

export interface StrengthStandardDeletePayload {
  action: 'delete';
  id: number;
}

export interface StrengthStandardBulkPayload {
  action: 'bulk';
  by: 'customer' | 'zrouting';
  value: string;
  std_min: number;
  std_max: number;
}