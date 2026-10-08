import { useConfigStore } from '@/stores/config'
import axios from 'axios'
import type {
  GlcPressBalance, GlcPressDetail, GlcPressLine, GlcPressSimulation,
  GlcPressSourceParam, GlcPressSourcePreview, GlcPressStatus
} from '@/types/PCD/Stamping/GlcSimulation'

const base = () => `http://${useConfigStore().apiUrl}/majsf_rest_api/api/Glc_press_simulation`

/** Backend membalas { status: 'success' | 'error', message?, ... }; galat dilempar. */
const check = (d: any) => {
  if (d?.status !== 'success') throw new Error(d?.message || 'Permintaan gagal')
  return d
}

const get = async <T>(path: string, params?: Record<string, any>): Promise<T> =>
  check((await axios.get(`${base()}/${path}`, { params })).data).data as T

const post = async (path: string, body: Record<string, any>) =>
  check((await axios.post(`${base()}/${path}`, body)).data)

export const fetchLines = () => get<GlcPressLine[]>('Lines')
// Default form simulasi baru (PCD › Auto › Params GLC Press).
export const fetchDefaults = () =>
  get<{ working_day: number; dandori_menit: number; dandori_freq: number; downtime_menit: number }>('Default')
export const fetchSimulationList = (periode?: string) =>
  get<GlcPressSimulation[]>('List', periode ? { periode } : undefined)
export const fetchSourcePreview = (p: GlcPressSourceParam) => get<GlcPressSourcePreview>('Source', p)
export const fetchDetail = (id: number) => get<GlcPressDetail>('Detail', { id })
export const fetchAutoBalance = (id: number, target: number, onlyHistory: boolean) =>
  get<GlcPressBalance>('AutoBalance', { id, target, only_history: onlyHistory ? 1 : 0 })

export const storeSimulation = async (p: GlcPressSourceParam) => (await post('Store', p)).id as number
export const updateLoad = (id: number, items: { id: number; line_use?: string; mesin_awal?: number }[]) =>
  post('UpdateLoad', { id, items })
export const updateHeader = (id: number, body: { note?: string | null; downtime_menit?: number }) =>
  post('UpdateHeader', { id, ...body })
export const updateStatus = (id: number, status: GlcPressStatus) => post('UpdateStatus', { id, status })
export const deleteSimulation = (id: number) => post('Delete', { id })
