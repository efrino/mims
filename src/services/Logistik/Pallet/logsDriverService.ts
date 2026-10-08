import axios from 'axios'
import { useConfigStore } from '@/stores/config'
import type { DriverFilter, DriverPayload, DriverInPayload, DriverResponse, LogPallet, TripItem } from '@/types/Logistik/Pallet/driver'

const getApiUrl = () => {
  const configStore = useConfigStore()
  return `http://${configStore.apiUrl}/majsf_rest_api/api/pallet`
}

const getControlPrepareUrl = () => {
  const configStore = useConfigStore()
  return `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`
}

export const driverService = {
  // Fetch semua log tanpa filter — untuk extract customer list
  async getAllDriverEmpty(): Promise<LogPallet[]> {
    const res = await axios.get(`${getApiUrl()}/driver`)
    return res.data
  },

  // Fetch log dengan filter customer (untuk isi tabel pallet rows)
  async getDriverEmpty(filter?: DriverFilter): Promise<LogPallet[]> {
    const params: Record<string, any> = {}
    if (filter?.status)   params.status   = filter.status
    if (filter?.customer) params.customer = filter.customer
    if (filter?.id)       params.id       = filter.id
    const res = await axios.get(`${getApiUrl()}/driver`, { params })
    return res.data
  },

  async postDriver(payload: DriverPayload): Promise<DriverResponse> {
    const res = await axios.post(`${getApiUrl()}/driver`, payload)
    return res.data
  },

  // Fetch trip dari control prepare (adm_trip_all)
  async getTripAll(date: string, dn: string): Promise<TripItem[]> {
    const res = await axios.get(`${getControlPrepareUrl()}/adm_trip_all`, {
      params: { date, dn },
    })
    return Array.isArray(res.data) ? res.data : []
  },

  // Fetch logs_pallet berdasarkan id_label (match dengan barcode trip)
  // Hanya status OUT — pallet IN tidak boleh diisi driver
  async getLogsByLabel(id_label: string): Promise<LogPallet[]> {
    const res = await axios.get(`${getApiUrl()}/log`, { params: { id_label, status: 'OUT' } })
    return Array.isArray(res.data) ? res.data : []
  },

  async postDriverIn(payload: DriverInPayload): Promise<DriverResponse> {
    const res = await axios.post(`${getApiUrl()}/driver/in`, payload)
    return res.data
  },
}