export interface CombineResult {
  id: string
  customer: string
  id_label: string
  id_kanban: string
  part: string
  user_created: string
  created_at: string
}

export interface CombineFilters {
  customer?: string
  part?: string
  created_at?: string
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  data: T
  message?: string
}