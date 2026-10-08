// utils/diesTemplate.ts
// Template Excel tambah dies (QR Aset) + pembacanya. Kolom mengikuti format tabel PM press;
// sel PART NO. / MODEL / LINE boleh dikosongkan di baris lanjutan (ikut baris di atasnya,
// diisi ulang di backend). Satu baris = satu dies; kunci "PART NO. #DIE" → sudah ada = diperbarui.
import * as XLSX from 'xlsx'
import type { DiesImportRow } from '@/services/Public/Asset/assetQrService'

// alias = awalan header (huruf besar, tanpa spasi/tanda baca) yang juga diterima, supaya
// file format tabel PM ("AVG PCS / M", "FREKUENSI ( STROKE )", "DIE") ikut terbaca.
const COLUMNS: { key: keyof DiesImportRow; header: string; width: number; alias: string[] }[] = [
  { key: 'line', header: 'LINE', width: 8, alias: ['LINE'] },
  { key: 'part_number', header: 'PART NO.', width: 22, alias: ['PARTNO', 'PARTNUMBER'] },
  { key: 'model', header: 'MODEL', width: 10, alias: ['MODEL'] },
  { key: 'die', header: 'DIE (n/N)', width: 10, alias: ['DIE'] },
  { key: 'proses', header: 'PROSES', width: 18, alias: ['PROSES', 'PROCESS'] },
  { key: 'avg_pcs_month', header: 'AVG PCS / BULAN', width: 16, alias: ['AVGPCS'] },
  { key: 'material_mpa', header: 'MATERIAL (MPa)', width: 15, alias: ['MATERIAL'] },
  { key: 'pm_interval_month', header: 'FREKUENSI PM (BULAN)', width: 20, alias: ['FREKUENSI'] },
  { key: 'tonnage_required', header: 'TONNAGE (T)', width: 12, alias: ['TONNAGE'] },
  { key: 'dies_length', header: 'PANJANG (mm)', width: 13, alias: ['PANJANG'] },
  { key: 'dies_width', header: 'LEBAR (mm)', width: 12, alias: ['LEBAR'] },
  { key: 'dies_height', header: 'TINGGI (mm)', width: 12, alias: ['TINGGI'] },
]

const EXAMPLE: (string | number)[][] = [
  ['D', 'MB282966', 'SL', '1/5', 'BL', 1253, '', 6, '', '', '', ''],
  ['A', '', '', '2/5', 'DRAW', '', '', '', '', '', '', ''],
  ['', '', '', '3/5', 'BEND', '', '', '', '', '', '', ''],
]

export function downloadDiesTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([COLUMNS.map(c => c.header), ...EXAMPLE])
  ws['!cols'] = COLUMNS.map(c => ({ wch: c.width }))
  const info = XLSX.utils.aoa_to_sheet([
    ['Petunjuk'],
    ['1 baris = 1 dies. DIE ditulis n/N, mis. 1/5 (gabungan proses boleh 2-3/4).'],
    ['PART NO., MODEL, LINE boleh dikosongkan di baris lanjutan — mengikuti baris di atasnya.'],
    ['PART NO. boleh ringkas (51474-BZ070/80); part master data dihubungkan otomatis.'],
    ['AVG PCS / BULAN, MATERIAL, FREKUENSI PM berlaku untuk semua dies part itu. Frekuensi 1/6M ditulis 6.'],
    ['Dies yang sudah ada (PART NO. + DIE sama) akan diperbarui, bukan dobel.'],
  ])
  info['!cols'] = [{ wch: 100 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dies')
  XLSX.utils.book_append_sheet(wb, info, 'Petunjuk')
  XLSX.writeFile(wb, 'Template_Tambah_Dies.xlsx')
}

/** Baca sheet pertama; header dicocokkan longgar (huruf besar, tanpa spasi/tanda baca). */
export async function readDiesFile(file: File): Promise<DiesImportRow[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: '', raw: false })
  const norm = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const headerIdx = aoa.findIndex(r => r.some(c => norm(c) === 'PARTNO'))
  if (headerIdx < 0) throw new Error('Kolom "PART NO." tidak ditemukan — pakai template dari tombol Template.')
  const head = aoa[headerIdx].map(norm)
  const col = COLUMNS.map(c => head.findIndex(h => c.alias.some(a => h.startsWith(a))))
  return aoa.slice(headerIdx + 1)
    .filter(r => r.some(c => String(c ?? '').trim() !== ''))
    .map(r => {
      const row = Object.fromEntries(COLUMNS.map((c, i) => [c.key, col[i] >= 0 ? String(r[col[i]] ?? '').trim() : ''])) as unknown as DiesImportRow
      // "1/6M" (1× per 6 bulan) → 6
      const f = row.pm_interval_month.toUpperCase().replace(/\s+/g, '').match(/^1\/(\d+)M?$/)
      if (f) row.pm_interval_month = f[1]
      // "1.253" (pemisah ribuan) → 1253
      if (/^\d{1,3}(\.\d{3})+$/.test(row.avg_pcs_month)) row.avg_pcs_month = row.avg_pcs_month.replace(/\./g, '')
      return row
    })
}
