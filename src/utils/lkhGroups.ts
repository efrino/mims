// utils/lkhGroups.ts
// Grup LKH = 1 dokumen LKH per foreman (khusus halaman LKH; master area tetap 7 area).
//  ADM  : SA ADM BARAT | SA ADM TIMUR + CO ADM | WSS ADM
//  MMKI : WSS MMKI + CO MMKI
//  HMMI : WSS HMMI + SA HMMI
// SA ADM dipecah per mesin: robot di BARAT_ROBOTS = BARAT; robot lain dan mesin
// manual (eks SA MANUAL: ST*, T*, GUN, ...) = TIMUR.
import type { AreaPlant } from '@/services/Public/Welding/weldingAreaService'
import type { LKHDualRow, LKHDualShift } from '@/types/Public/Welding/lkh'

export type LKHSide = 'BARAT' | 'TIMUR'

export interface LKHSource {
  area: string          // kode area master (param area backend lkh_dual)
  side?: LKHSide        // hanya untuk SA ADM
}

export interface LKHGroup {
  code: string          // dipakai di URL
  label: string
  plant: AreaPlant
  sources: LKHSource[]
}

export const LKH_GROUPS: LKHGroup[] = [
  { code: 'SA ADM BARAT', label: 'SA ADM BARAT', plant: 'ADM', sources: [{ area: 'SA ADM', side: 'BARAT' }] },
  { code: 'SA ADM TIMUR', label: 'SA ADM TIMUR & CO ADM', plant: 'ADM', sources: [{ area: 'SA ADM', side: 'TIMUR' }, { area: 'CO ADM' }] },
  { code: 'WSS ADM', label: 'WSS ADM', plant: 'ADM', sources: [{ area: 'WSS ADM' }] },
  { code: 'WSS MMKI', label: 'WSS MMKI & CO MMKI', plant: 'MMKI', sources: [{ area: 'WSS MMKI' }, { area: 'CO MMKI' }] },
  { code: 'WSS HMMI', label: 'WSS HMMI & SA HMMI', plant: 'HMMI', sources: [{ area: 'WSS HMMI' }, { area: 'SA HMMI' }] },
]

export const DEFAULT_LKH_GROUP = LKH_GROUPS[0]

/** Cari grup dari kode grup, atau dari kode area master lama (link lama /lkh/SA ADM, /lkh/CO MMKI, ...). */
export function lkhGroupByCode(code: string | null | undefined): LKHGroup | null {
  const c = (code || '').trim().toUpperCase()
  if (!c) return null
  return LKH_GROUPS.find(g => g.code === c)
    ?? LKH_GROUPS.find(g => g.sources.some(s => s.area === c))
    ?? null
}

/** Judul lembar untuk 1 area dalam grup (SA ADM → "SA ADM BARAT" / "SA ADM TIMUR"). */
export function sheetLabel(group: LKHGroup, area: string): string {
  const src = group.sources.find(s => s.area === area)
  return src?.side ? `${area} ${src.side}` : area || group.label
}

// Nomor robot (RSW/RB) wilayah BARAT — dari user 2026-09-25.
// TIMUR: 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 22, 23, 27.
const BARAT_ROBOTS = new Set([1, 3, 4, 11, 17, 18, 19, 20, 21, 24, 25, 26])

/** Sisi mesin SA ADM: robot di BARAT_ROBOTS = BARAT, selain itu (robot lain / manual) = TIMUR. */
export function machineSide(machine: string): LKHSide {
  const m = /^(?:RSW|RB-?)(\d+)$/i.exec((machine || '').trim())
  return m && BARAT_ROBOTS.has(Number(m[1])) ? 'BARAT' : 'TIMUR'
}

/** Sisi 1 part (gabungan mesin rute): ikut mesin robot pertama; tanpa robot = TIMUR (manual). */
export function rowSide(row: LKHDualRow): LKHSide {
  const mcs = (row.mc_weld || '').trim().split(/\s+/).filter(Boolean)
  const robot = mcs.find(m => /^(RSW|RB-?)\d/i.test(m))
  return robot ? machineSide(robot) : 'TIMUR'
}

// ── Lembar cetak ─────────────────────────────────────────────────
// 1 area = 1 lembar dokumen (grup gabungan → lembar WSS MMKI, lalu lembar CO MMKI).
// Tiap lembar dipecah per halaman; halaman terakhir lembar dikurangi jatah baris
// agar total + tanda tangan muat. Dipakai LKHPrint (cetak) & LKHDualTable (garis batas halaman).
export const LKH_ROWS_PER_PAGE = 26

export interface LKHPage {
  area: string
  rows: LKHDualRow[]
  sheet: LKHDualRow[]   // semua baris lembar ini (untuk TOTAL)
  pageNo: number        // halaman ke- di dalam lembar
  pageCount: number
  isLast: boolean
}

export function paginateLKH(rows: LKHDualRow[], rowsPerPage: number): LKHPage[] {
  const rppLast = Math.max(Math.round(rowsPerPage * 0.65), 12)   // sisa ruang: TOTAL + tanda tangan + QR 25mm
  const sheets: { area: string; rows: LKHDualRow[] }[] = []
  for (const r of rows) {
    const last = sheets[sheets.length - 1]
    if (last && last.area === r.area) last.rows.push(r)
    else sheets.push({ area: r.area, rows: [r] })
  }
  const pages: LKHPage[] = []
  for (const sh of sheets) {
    const start = pages.length
    let offset = 0
    while (offset < sh.rows.length) {
      const remaining = sh.rows.length - offset
      const rpp = remaining > rowsPerPage ? rowsPerPage : remaining <= rppLast ? remaining : rppLast
      const end = Math.min(offset + rpp, sh.rows.length)
      pages.push({ area: sh.area, rows: sh.rows.slice(offset, end), sheet: sh.rows, pageNo: pages.length - start + 1, pageCount: 0, isLast: end >= sh.rows.length })
      offset = end
    }
    for (let i = start; i < pages.length; i++) pages[i].pageCount = pages.length - start
  }
  return pages.length ? pages : [{ area: '', rows: [], sheet: [], pageNo: 1, pageCount: 1, isLast: true }]
}

// ── Pisah OP ─────────────────────────────────────────────────────
// Default LKH = 1 baris/part (mesin rute digabung "RSW22 RSW23"). Saklar "Pisah OP"
// memecah jadi 1 baris per proses (OP10 RSW22, OP20 RSW23):
//  - Plan (kbn/lot) tampil di semua OP (batch yg sama lewat tiap proses), tapi TOTAL
//    hanya menghitung OP terakhir (lihat sumLKH) supaya tidak dobel.
//  - Nut/Spot & stroke per OP dari rute; bila rute tak punya stroke, nilai part ditaruh di OP terakhir.
//  - Actual/PJK/BLC/keterangan (Achievement v2 = 1 baris/part) hanya di OP terakhir = hasil jadi.
//  - STATUS per OP: OP antara = WIP (setengah jadi), OP terakhir = status part (FP/WIP).
//  - JOB/PART ditulis di tiap baris OP; NO 1 per part, hanya di OP pertama.
const emptyAct = (s: LKHDualShift, nut: number): LKHDualShift =>
  ({ ...s, plan_stroke: s.plan_lot_size * nut, act_pcs: 0, act_pjk: null, act_blc: null })

export function splitByOp(rows: LKHDualRow[]): LKHDualRow[] {
  const out: LKHDualRow[] = []
  for (const r of rows) {
    const ops = r.ops ?? []
    if (ops.length < 2) { out.push({ ...r, op: undefined, op_first: true, op_last: true }); continue }   // 1 proses: kolom OP kosong
    const routeStroke = ops.some(o => o.stroke > 0)
    ops.forEach((o, i) => {
      const last = i === ops.length - 1
      const nut = routeStroke ? o.stroke : last ? r.sum_nut_spot : 0
      const day = last ? { ...r.day, plan_stroke: r.day.plan_lot_size * nut } : emptyAct(r.day, nut)
      const night = last ? { ...r.night, plan_stroke: r.night.plan_lot_size * nut } : emptyAct(r.night, nut)
      out.push({
        ...r, op: o.op, op_first: i === 0, op_last: last, status_part: last ? r.status_part : 'WIP', mc_weld: o.machine, ct: o.ct, total_proses: 1, sum_nut_spot: nut,
        patan: { ...r.patan, stroke: r.patan.lot_size * nut },
        day, night, keterangan: last ? r.keterangan : null,
      })
    })
  }
  // NO urut ulang per lembar (area) — 1 nomor per PART; hanya tampil di OP pertama
  // (OP lanjutan: NO kosong, JOB/PART tetap ditulis).
  let area = '', no = 0
  for (const r of out) {
    if (r.area !== area) { area = r.area; no = 0 }
    if (r.op_first !== false) no++
    r.no = no
  }
  return out
}

/** TOTAL lembar/tabel. OP antara (op_last=false) tidak menambah kbn/lot plan (hindari dobel). */
export function sumLKH(rows: LKHDualRow[]) {
  const n = (v: unknown) => Number(v) || 0
  const t = {
    patan_kbn: 0, patan_lot: 0, patan_stroke: 0,
    day:   { kbn: 0, lot: 0, stroke: 0, pcs: 0 },
    night: { kbn: 0, lot: 0, stroke: 0, pcs: 0 },
  }
  for (const r of rows) {
    const counts = r.op_last !== false
    t.patan_stroke += n(r.patan.stroke)
    if (counts) { t.patan_kbn += n(r.patan.kbn); t.patan_lot += n(r.patan.lot_size) }
    for (const s of ['day', 'night'] as const) {
      t[s].stroke += n(r[s].plan_stroke); t[s].pcs += n(r[s].act_pcs)
      if (counts) { t[s].kbn += n(r[s].plan_kbn); t[s].lot += n(r[s].plan_lot_size) }
    }
  }
  return t
}
