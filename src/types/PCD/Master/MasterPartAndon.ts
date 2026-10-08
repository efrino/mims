export interface dataTable {
  id: string;
  part_number: string;
  job_number: string;
  part_name: string | null;
  mat_group: string | null;
  pallet: string | null;
  qty_pallet: string | null;
  limit_stroke: string | null;
  total_dies: string | null;
  status: string | null;
  is_active: string;
  create_date: string;
  update_date: string | null;
  user_create: string;
  user_update: string | null;
}

export interface formDataInput {
	part_number: string;
	job_number: string;
	is_active: string;
  id: string
}