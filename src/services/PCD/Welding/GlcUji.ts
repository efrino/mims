import { useConfigStore } from '@/stores/config'
import axios from 'axios'
import type {
  GlcParamCt, GlcIstirahat, GlcKombinasi, GlcUji, GlcUjiRobot,
  GlcUjiKombinasi, GlcUjiSegmen, GlcUjiPart, RingkasReview,
  GlcPartKombinasi, GlcDaftarRobot, GlcShiftRobot, GlcUjiRiwayat, GlcTskk,
} from '@/types/PCD/Welding/GlcUji'

const base = () => `http://${useConfigStore().apiUrl}/majsf_rest_api/api/glcuji`

const get = async <T>(path: string, params?: Record<string, any>): Promise<T> => {
  const r = await axios.get(`${base()}/${path}`, { params })
  return r.data?.data as T
}

/** Backend membungkus hasil aksi sebagai {status, data:{ok, message, ...}}.
 *  Kalau ok=false, lemparkan pesannya supaya pemanggil tinggal menangkap. */
const post = async <T = any>(path: string, body: Record<string, any>): Promise<T> => {
  try {
    const r = await axios.post(`${base()}/${path}`, body)
    const d = r.data?.data ?? r.data
    if (d && d.ok === false) throw new Error(d.message || 'Gagal')
    return d as T
  } catch (e: any) {
    if (e?.response?.data?.message) throw new Error(e.response.data.message)
    throw e
  }
}

// ---- parameter CT ----
export const fetchParamCt = () => get<GlcParamCt>('param_ct')
export const simpanParamCt = (body: Partial<GlcParamCt> & { by?: string }) =>
  post('param_ct', body)

// ---- jadwal istirahat ----
export const fetchIstirahat = () => get<GlcIstirahat[]>('istirahat')
export const simpanIstirahat = (rows: Partial<GlcIstirahat>[]) =>
  post('istirahat', { rows })

// ---- master kombinasi ----
export const fetchKombinasi = (machine?: string) =>
  get<GlcKombinasi[]>('kombinasi', machine ? { machine } : undefined)
export const simpanKombinasi = (rows: Partial<GlcKombinasi>[], by?: string) =>
  post('kombinasi', { rows, by })
export const hapusKombinasi = (id: number) => post('hapus_kombinasi', { id })

/** Semua OP satu robot, termasuk yang belum diberi label kombinasi. */
export const fetchPartKombinasi = (machine: string) =>
  get<GlcPartKombinasi[]>('part_kombinasi', { machine })
export const fetchDaftarRobot = () => get<GlcDaftarRobot[]>('daftar_robot')

// ---- setelan shift per robot ----
export const fetchShiftRobot = () => get<GlcShiftRobot[]>('shift_robot')
export const simpanShiftRobot = (rows: Partial<GlcShiftRobot>[], by?: string) =>
  post('shift_robot', { rows, by })

// ---- TSKK ----
export const fetchTskkList = (machine?: string) =>
  get<GlcTskk[]>('tskk', machine ? { machine } : undefined)
export const fetchTskk = (id: number) => get<GlcTskk>('tskk', { id })
export const simpanTskk = (body: Record<string, any>) => post('tskk', body)
export const hapusTskk = (id: number) => post('hapus_tskk', { id })
export const salinTskk = (id: number, by?: string) => post('salin_tskk', { id, by })

// ---- riwayat ----
export const fetchRiwayat = (id: number) => get<GlcUjiRiwayat[]>('riwayat', { id })

// ---- skenario ----
export const fetchUjiList = (f?: { periode?: string; status?: string }) =>
  get<GlcUji[]>('list', f)
export const fetchUjiDetail = (id: number) =>
  get<{ header: GlcUji; robot: GlcUjiRobot[] }>('detail', { id })
export const buatUji = (body: Record<string, any>) => post('buat', body)
export const ubahUji = (id: number, body: Record<string, any>) =>
  post('ubah', { id, ...body })
export const hapusUji = (id: number) => post('hapus', { id })
export const hitungUji = (id: number, by?: string) => post('hitung', { id, by })

// ---- hasil ----
export const fetchRobot = (id: number) => get<GlcUjiRobot[]>('robot', { id })
export const fetchKombinasiHasil = (id: number, machine?: string) =>
  get<GlcUjiKombinasi[]>('kombinasi_hasil', { id, machine })
export const fetchSegmen = (id: number, machine?: string) =>
  get<GlcUjiSegmen[]>('segmen', { id, machine })
export const fetchPartUph = (id: number, status?: string) =>
  get<GlcUjiPart[]>('part', { id, status })

// ---- review, accept, terbit ----
export const reviewRobot = (
  id: number, machine: string, status: string, catatan?: string, by?: string,
) => post<{ ok: true; ringkas: RingkasReview }>('review', { id, machine, status, catatan, by })

export const acceptUji = (id: number, by?: string) => post('accept', { id, by })
export const batalAccept = (id: number, by?: string) => post('batal_accept', { id, by })
export const terbitUji = (id: number, by?: string) =>
  post<{ ok: true; glc_id: number; versi: number; message: string }>('terbit', { id, by })

/** Tarik kembali versi yang sudah terbit. Ditolak kalau versinya sudah beku
 *  atau sudah ada versi yang lebih baru. */
export const batalTerbit = (id: number, alasan?: string, by?: string) =>
  post<{ ok: true; message: string }>('batal_terbit', { id, alasan, by })

/** Salin skenario jadi DRAFT baru untuk direvisi. Yang lama tidak disentuh. */
export const revisiUji = (id: number, nama?: string, by?: string) =>
  post<{ ok: true; id: number; message: string }>('revisi', { id, nama, by })
