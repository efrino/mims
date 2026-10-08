export interface ResScanKanban {
  BEHMG: string;
  MATNR: string;
  MESSAGE: string;
  LT_EKBE: any[];
  LT_EKKO: any[];
  LT_ZGRUSER: any[];
  ZEKBE: any[];
  ZGRUSER: any[];
  ZPOUSER: any[];
  ZTBL_GR: any[];
  ZTBL_RPT_REJECT: any[];
  ZTBL_SELECTION: any[];
  Z_RESULT: any[];
  Z_SCHEDULE_PO: any[];

  id_kanban?: string;
}

export interface SaveKanbanIN {
  part_number: string;
  id_kanban: string;
  qty: string;
  status: string;
}