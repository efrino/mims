export interface tableWeldingSchedule {
  id: string;
  period: string;
  date: string;
  patan: string;
  shift: string;
  time_shift: string;
  line_id: string;
  urut: string;
  urut_plan: string;
  part_number: string;
  total_process: string;
  plan_process: string | null;
  act_process: string | null;
  lotsize: string;
  stroke: string;
  uph: string;
  tpt: string;
  dandori: string | null;
  status_plan: string;
  create_date: string;
  user_create: string;
  update_date: string | null;
  user_update: string | null;
}

export interface filterData {
	date: string;
	shift: number;
	line_id: string;
}

export interface formAddData {
	period: string;
	date: string;
	shift: string;
	patan: string;
	line_id: string;
	lotsize: string;
	part_number: string;
	job_number: string;
	tpt: string;
	stroke: string;
	uph: string;
	tipe_part: string;
}

export interface LineItems {
	line: string;
}

export interface TableTagOK {
  id: string;
  id_tag_ok: string;
  id_kanban: string;
  no_kanban: string;
  line_id: string;
  area: string;
  project: string;
  customer: string;
  part_number: string;
  part_name: string;
  job_number: string;
  qty_kbn: string;
  range: string;
  total_tag_ok: string;
  status: string;
  shift: string;
  date: string;
  is_scanned: string;
  scan_date: string;
  scan_user: string | null;
  unscan_date: string;
  unscan_user: string | null;
  additional: string;
  identity: string | null;
  user_create: string;
  user_update: string | null;
  create_date: string;
  update_date: string | null;
  print_date: string;
  created_at: string;
  updated_at: string;
}

export interface UploadPlanItem {
  period: number;
  line_id: string;
  patan: string;
  total_process: string;
  part_number: string;
  stroke: number;
  lotsize: number;
  tpt: number;
  uph: number;
  status_plan: string;
  ERROR: string | null;
  ERROR_UPLOAD: string | null;
}