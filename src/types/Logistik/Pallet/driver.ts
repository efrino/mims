export interface LogPallet {
  id: number
  no_rfid: string
  type: string | null
  no_pallet: string | null
  status: 'EMPTY' | 'IN' | 'OUT' 
  category: string | null
  customer: string
  id_label: string | null
  nik: string | null
  nama_driver: string | null
  nama_lp: string | null
  no_polisi: string | null
  created_at: string
}

export interface DriverPayload {
  nik: string
  nama_driver: string
  nama_lp: string
  no_polisi: string
  nik_pic?: string
  ids: number[]
}

export interface DriverSummary {
  total: number
  success: number
  failed: number
}

export interface DriverError {
  id: number
  reason: string
}

export interface DriverResponse {
  success: boolean
  messages: string
  summary: DriverSummary
  success_ids: number[]
  errors: DriverError[]
}

export interface DriverFilter {
  status?: 'EMPTY' | 'IN' | 'OUT' 
  customer?: string
  id?: number
}

export interface PalletRow {
  rowIndex: number
  type: string
  id_log: number | null      
  no_pallet: string
  no_rfid: string
}

export interface DriverDeliveryForm {
  nik: string
  nama_driver: string
  nama_lp: string
  no_polisi: string
  nik_pic: string
  customer: string
  jumlah_pallet: number
  pallet_rows: PalletRow[]
}

export interface DriverInPalletItem {
  id: string
  no_rfid: string
  no_pallet: string
  type: string
  status: 'IN'
  category: string
  customer: string
  id_label: string
  is_active: string
}

export interface TripItem {
  no_urut: string
  job_number: string
  part_number: string
  qty: string
  cycle: string | null
  trip: string | null
  barcode: string
  part_category: string | null
  jenis: string
  shop_code: string | null
  etd: string | null
  eta: string | null
  delivery_date: string | null
  is_scan: string
  route: string | null
  plan: string
  project: string | null
}

export interface DriverInPayload {
  nik: string
  nama_driver: string
  nama_lp: string
  no_polisi: string
  pallets: DriverInPalletItem[]
}