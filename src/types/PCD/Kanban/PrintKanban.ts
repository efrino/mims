export interface PartItems {
  job_number: string;
  part_number: string;
}

export interface KanbanItem {
  car: string;
  check_date: string;
  customer: string;
  id_kanban: string;
  identity: string | null;
  job_number: string;
  line: string;
  line2: string;
  no_kanban: string;
  part_name: string;
  part_number: string;
  qty_kbn: string;
  qty_pallet: string;
  range: string;
  status: string;
  status_lock: string;
  storage: string;
  type_pallet: string;
  zstatus: string;
}

export interface PrintPreviewKanbanData {
  car: string;
  create_date: string;
  customer: string;
  id_kanban: string;
  identity: string;
  is_nc: string;
  job_number: string;
  line: string;
  line2: string;
  no_kanban: string;
  part_name: string;
  part_number: string;
  qty_kbn: string;
  qty_pallet: string;
  range: string;
  storage: string;
  type_pallet: string;
  user_create: string;
  zstatus: string;
}