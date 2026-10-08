import { useConfigStore } from '@/stores/config'
import axios from 'axios'
import type {
  GlcParam, GlcPeriode, GlcMachine, GlcPart, GlcPattern, GlcTandem, GlcDataKurang,
  GlcBalance, Jadwal
} from '@/types/PCD/Welding/Glc'

const base = () => `http://${useConfigStore().apiUrl}/majsf_rest_api/api/glc`

const get = async <T>(path: string, params?: Record<string, any>): Promise<T> => {
  const r = await axios.get(`${base()}/${path}`, { params })
  return r.data?.data as T
}

const post = async (path: string, body: Record<string, any>) => {
  const r = await axios.post(`${base()}/${path}`, body)
  return r.data
}

// ---- periode & parameter ----
export const fetchParamDefault = () => get<GlcParam>('param_default')
export const fetchPeriodeList = (f?: Record<string, any>) => get<GlcPeriode[]>('periode', f)
export const fetchSpmon = () => get<{ spmon: string; baris: number; total_pcs_day: number }[]>('spmon')

export const createPeriode = (body: Partial<GlcParam> & { periode: string }) =>
  post('periode', body)

export const updatePeriode = (id: number, body: Partial<GlcParam> & { updated_by?: string }) =>
  post('update_periode', { id, ...body })

export const hapusPeriode = (id: number) => post('hapus', { id })

// ---- pembekuan ----
export const freezePeriode = (id: number, by?: string, note?: string) =>
  post('freeze', { id, by, note })

export const unfreezePeriode = (id: number, by?: string) => post('unfreeze', { id, by })

// ---- perhitungan ----
export const generateGlc = (id: number) => post('generate', { id })
export const generatePattern = (id: number) => post('generate_pattern', { id })
export const generateAll = (id: number) => post('generate_all', { id })

// ---- hasil ----
export const fetchDetail = (id: number) =>
  get<{ header: GlcPeriode; machine: GlcMachine[] }>('detail', { id })
export const fetchMachine = (id: number) => get<GlcMachine[]>('machine', { id })
export const fetchPart = (id: number, machine?: string) => get<GlcPart[]>('part', { id, machine })
export const fetchPattern = (id: number, machine?: string, pattern?: string) =>
  get<GlcPattern[]>('pattern', { id, machine, pattern })
export const fetchTandem = (id: number) => get<GlcTandem[]>('tandem', { id })
export const fetchDataKurang = (id: number) => get<GlcDataKurang[]>('data_kurang', { id })

// ---- balancing & round up ----
/**
 * Menghitung rencana perpindahan part. Uji kering: backend tidak menulis apa
 * pun, hasilnya hanya untuk ditampilkan dan dibandingkan.
 */
export const fetchBalance = (id: number, mode: 'BALANCING' | 'ROUNDUP') =>
  get<GlcBalance>('balance', { id, mode })

/** Menyimpan rencana balancing sebagai DRAFT. Backend menghitung ulang sendiri. */
export const simpanBalance = (id: number, mode: 'BALANCING' | 'ROUNDUP', nama?: string, by?: string) =>
  post('balance_simpan', { id, mode, nama, by })

/** Menyetujui rencana; sesudah ini PATAN mengikutinya. */
export const accBalance = (balance_id: number, by?: string) =>
  post('balance_acc', { balance_id, by })

/** Membatalkan persetujuan; PATAN kembali memakai GLC current. */
export const batalAccBalance = (balance_id: number, by?: string) =>
  post('balance_batal_acc', { balance_id, by })

export const fetchBalanceList = (id: number) =>
  get<{ daftar: any[]; disetujui: any | null; sumber_patan: string }>('balance_list', { id })

/**
 * Jadwal part per minggu beserta skema recovery akhir pekannya.
 * Diturunkan dari data GLC yang sudah ada; backend tidak menulis apa pun.
 */
export const fetchJadwal = (id: number) => get<Jadwal>('jadwal', { id })
