// services/Public/Welding/deliveryVariantService.ts
// Varian delivery per part FISIK welding (ms_welding_delivery_variant): 1 part
// produksi bisa punya N nomor part/job versi customer (mis. 57406-BZ270-00 /
// -00-26 / -00-E26 — barang sama, order beda). Hierarki/BOM/plan tetap ke part
// fisik; order/DN/label pilih varian. Backend: Welding_variant.php + M_welding_variant.php.

import axios from 'axios'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api/welding_variant'

export interface DeliveryVariant {
  id: number
  part_id: number
  part_number_delivery: string
  job_number_delivery: string | null
  customer: string | null
  model: string | null
  qty_kbn: number | null          // null = ikut qty_kbn part fisik
  sap_matnr: string | null
  is_default: number
  is_active: number
  note: string | null
  created_at: string | null
  created_by: string | null
  updated_at: string | null
  updated_by: string | null
}

export interface DeliveryVariantForm {
  part_number_delivery: string
  job_number_delivery?: string | null
  customer?: string | null
  model?: string | null
  qty_kbn?: number | null
  sap_matnr?: string | null
  is_default?: number
  is_active?: number
  note?: string | null
}

/** Hasil resolve nomor delivery → part fisik. */
export interface ResolvedVariant extends DeliveryVariant {
  part_number: string
  part_number_mix: string
  part_name: string | null
  area: string | null
  is_wip: number
  part_is_runout: number
}

/** Part lain yang kemungkinan duplikat fisik (prefix nomor sama). */
export interface MergeCandidate {
  id: number
  part_number: string
  part_number_mix: string
  part_number_delivery: string | null
  job_number: string | null
  job_number_delivery: string | null
  part_name: string | null
  customer_1: string | null
  model: string | null
  qty_kbn: number | null
  area: string | null
  category: string | null
  layer: string | null
  is_wip: number
  child_count: number
  mother_count: number
}

export interface MergeResult {
  status: string
  message: string
  variant: DeliveryVariant
  affected_children: number[]
}

type Ok<T = unknown> = { status: string; message?: string; data?: T }

const deliveryVariantService = {
  async list(partId: number): Promise<DeliveryVariant[]> {
    const res = await axios.get(`${BASE_URL}/list`, { params: { part_id: partId } })
    return res.data.data ?? []
  },
  async resolve(number: string): Promise<ResolvedVariant[]> {
    const res = await axios.get(`${BASE_URL}/resolve`, { params: { number } })
    return res.data.data ?? []
  },
  async store(partId: number, data: DeliveryVariantForm): Promise<Ok<DeliveryVariant>> {
    const res = await axios.post(`${BASE_URL}/store`, data, { params: { part_id: partId } })
    return res.data
  },
  async update(id: number, data: Partial<DeliveryVariantForm>): Promise<Ok<DeliveryVariant>> {
    const res = await axios.post(`${BASE_URL}/update`, data, { params: { id } })
    return res.data
  },
  async setDefault(id: number): Promise<Ok<DeliveryVariant>> {
    const res = await axios.post(`${BASE_URL}/set_default`, {}, { params: { id } })
    return res.data
  },
  async remove(id: number): Promise<Ok> {
    const res = await axios.post(`${BASE_URL}/delete`, {}, { params: { id } })
    return res.data
  },
  async mergeCandidates(partId: number): Promise<MergeCandidate[]> {
    const res = await axios.get(`${BASE_URL}/merge_candidates`, { params: { part_id: partId } })
    return res.data.data ?? []
  },
  async merge(primaryId: number, dupId: number, variant?: Partial<DeliveryVariantForm>): Promise<MergeResult> {
    const res = await axios.post(`${BASE_URL}/merge`, { primary_id: primaryId, dup_id: dupId, variant })
    return res.data
  },
}

export default deliveryVariantService
