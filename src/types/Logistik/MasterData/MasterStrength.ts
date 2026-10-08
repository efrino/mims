export interface StrengthItem {
  location: any;
  cycle_type: any;
  unit_str: any;
  is_active?: any;
  customer: string;
  model: string;
  min_str: string;
  max_str: string;
}

export interface StrengthFilters {
  keyword: string;
}

export interface StrengthFormData {
  customer: string;
  model: string;
  min_str: string;
  max_str: string;
  location: string;
  unit_str: string;
  cycle_type: string;
  is_active?: number;
}

export type StrengthActionType = 'Add' | 'Edit' | '';
