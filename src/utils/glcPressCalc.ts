// Hitung beban GLC Press dari daftar part (jam/hari).
// Sama dengan M_glc_press_simulation::summary_lines di backend, dihitung ulang
// di sini supaya pindah part langsung terlihat di grafik sebelum disimpan.
import type { GlcPressBar, GlcPressLine, GlcPressPart } from '@/types/PCD/Stamping/GlcSimulation'

const r2 = (v: number) => Math.round(v * 100) / 100

const kosong = (label: string, downtime: number, jumlah_mesin?: number): GlcPressBar => ({
  label, jumlah_mesin, prod_time: 0, dandori: 0, downtime, tpt: 0,
  pcs_day: 0, stroke_day: 0, item: 0, uph: 0,
})

const tambah = (b: GlcPressBar, p: GlcPressPart) => {
  b.prod_time += p.prod_min / 60
  b.dandori += p.dandori_min / 60
  b.pcs_day += Number(p.pcs_day)
  b.stroke_day += Number(p.stroke_day)
  b.item++
}

const tutup = (b: GlcPressBar): GlcPressBar => ({
  ...b,
  prod_time: r2(b.prod_time),
  dandori: r2(b.dandori),
  downtime: r2(b.downtime),
  tpt: r2(b.prod_time + b.dandori + b.downtime),
  pcs_day: r2(b.pcs_day),
  stroke_day: r2(b.stroke_day),
  uph: b.prod_time > 0 ? Math.round((b.pcs_day / b.prod_time) * 10) / 10 : 0,
})

/** Satu batang per line master; line di data tapi tidak di master tetap ikut. */
export const bebanLine = (lines: GlcPressLine[], parts: GlcPressPart[], downtimeMenit: number): GlcPressBar[] => {
  const dt = downtimeMenit / 60
  const map = new Map<string, GlcPressBar>()
  lines.forEach(l => map.set(l.line_id, kosong(l.line_id, dt, l.jumlah_mesin)))
  parts.forEach(p => {
    if (!map.has(p.line_use)) map.set(p.line_use, kosong(p.line_use, dt, 1))
    tambah(map.get(p.line_use)!, p)
  })
  return [...map.values()].map(tutup)
}

/**
 * Beban tiap mesin di satu line. Line tandem: part dengan N proses memakai
 * mesin mesin_awal..mesin_awal+N-1, semuanya sibuk selama jam jalan part itu.
 */
export const bebanMesin = (line: GlcPressLine, parts: GlcPressPart[], downtimeMenit: number): GlcPressBar[] => {
  const dt = downtimeMenit / 60
  const n = Math.max(1, line.jumlah_mesin)
  const mesin = Array.from({ length: n }, (_, i) => kosong(`${line.line_id}-${i + 1}`, dt))
  parts.filter(p => p.line_use === line.line_id).forEach(p => {
    const awal = Math.max(1, p.mesin_awal)
    const akhir = Math.min(n, awal + p.proses - 1)
    for (let i = awal; i <= akhir; i++) tambah(mesin[i - 1], p)
  })
  return mesin.map(tutup)
}

export const jamPart = (p: GlcPressPart) => (Number(p.prod_min) + Number(p.dandori_min)) / 60

export const formatPeriode = (p: string) => {
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
    'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const m = /^(\d{4})(\d{2})$/.exec(String(p || ''))
  return m ? `${bulan[Number(m[2]) - 1]} ${m[1]}` : p
}
