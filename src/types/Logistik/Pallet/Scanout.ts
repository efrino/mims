export interface KanbanPayload {
  id_kanban: string;
  id_label: string;
}

export interface PolyboxPayload {
  id_label: string;
}

export interface KanbanApiResponse {
  status: boolean;
  message: string;
  dn?: string | null;
  scanned?: number | null;
  total?: number | null;
}

export interface KanbanSubmitResult {
  success: boolean;
  message: string;
  dn?: string | null;
  scanned?: number | null;
  total?: number | null;
}

export interface KanbanHistoryItem {
  part: string;
  created_at: string;
  dn?: string | null;
  customer?: string | null;
  id_kanban?: string | null;
  id_label?: string | null;
  status?: string | null;
}

export interface KanbanHistoryApiResponse {
  data: KanbanHistoryItem[];
}

export interface HmmiPreviewResponse {
  status: boolean;
  message?: string;
  part_label?: string | null;
  customer?: string | null;
  qty_label?: number | string | null;
  qty_kanban?: number | string | null;
}
 
export interface HmmiPreviewResult {
  success: boolean;
  message: string;
  data?: HmmiPreviewResponse;
}
 
export interface HmmiSubmitPayload {
  id_kanban: string;
  id_label: string;
  qty_label: string;
  qty_kanban: string;
}
 
export interface HmmiSubmitResult {
  success: boolean;
  message: string;
  dn?: string | null;
  scanned?: number | null;
  total?: number | null;
}
