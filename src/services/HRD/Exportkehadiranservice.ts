/**
 * ExportKehadiranService.ts
 * Port dari ExportKehadiranController.php (CodeIgniter 4) → TypeScript + ExcelJS
 * Digunakan di Vue 3 + Vite
 *
 * Install: npm install exceljs file-saver
 *          npm install -D @types/file-saver
 */

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { MappedRecord, UnmappedRecord } from '@/services/HRD/AttendanceService'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CellStyleOpts {
  fill?:        string
  fontColor?:   string
  bold?:        boolean
  size?:        number
  align?:       'left' | 'center'
  border?:      boolean
  borderColor?: string
  wrap?:        boolean
  italic?:      boolean
}

interface DeptStat {
  planning:      number
  hadir:         number
  terlambat:     number
  tidak_hadir:   number
  lembur:        number          // ← tambah
  karyawan_unik: Set<string>
  jabatan:       Record<string, number>
}


interface ShiftStat extends DeptStat {
  jam_masuk:  string
  jam_keluar: string
}

interface ExportFilter {
  tanggal_start?: string
  tanggal_end?:   string
  department?:    string
  id_finger?:     string
}

// ─── Konstanta ────────────────────────────────────────────────────────────────
const JABATAN_RANK_LABEL = [
  { key: 'DEO',     label: 'DEO',               jabatans: ['DEPUTY EXECUTIVE OFFICER COMMERCIAL', 'DEPUTY EXECUTIVE OFFICER MANUFACTURE'] },
  { key: 'DIVHEAD', label: 'Division Head',      jabatans: ['DIVISION HEAD'] },
  { key: 'DDIVH',   label: 'Dep. Division Head', jabatans: ['DEPUTY DIVISION HEAD'] },
  { key: 'DHEAD',   label: 'Dept. Head',         jabatans: ['DEPT. HEAD'] },
  { key: 'DDHEAD',  label: 'Dep. Dept. Head',    jabatans: ['DEPUTY DEPT. HEAD'] },
  { key: 'ADHEAD',  label: 'Asst. Dept. Head',   jabatans: ['ASSISTANT DEPT. HEAD'] },
  { key: 'SHEAD',   label: 'Section Head',       jabatans: ['SECTION HEAD', 'PJS SECTION HEAD'] },
  { key: 'STAFF',   label: 'Staff / Staff Ahli', jabatans: ['STAFF AHLI', 'STAFF'] },
  { key: 'FOREMAN', label: 'Foreman',            jabatans: ['FOREMAN', 'PJS FOREMAN'] },
  { key: 'PELAKS',  label: 'Pelaksana',          jabatans: ['PELAKSANA'] },
  { key: 'OPR',     label: 'Operator / SPV',     jabatans: ['OPERATOR', 'KMI SUPERVISOR'] },
  { key: 'PKL',     label: 'PKL',               jabatans: ['PKL'] },
]

const STATUS_TEXT: Record<string, string> = {
  hadir:        'Hadir',
  terlambat:    'Terlambat',
  tidak_hadir:  'Tidak Hadir',
  henkaten:     'Henkaten',
  izin:         'Izin',
  sakit:        'Sakit',
  belum_absen:  'Belum Absen',
  lembur:       'Lembur',    
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO()  { return new Date().toISOString().slice(0, 10) }
function fmtDate(d?: string) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtNow() {
  return new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtTimestamp(ts?: string | null, showDate = false): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  if (showDate) return d.toISOString().slice(0, 16).replace('T', ' ')
  return d.toTimeString().slice(0, 5)
}

function getJabatanKey(jabatan: string): string {
  const j = (jabatan || '').trim().toUpperCase()
  for (const rank of JABATAN_RANK_LABEL) {
    if (rank.jabatans.includes(j)) return rank.key
  }
  return 'LAINNYA'
}

function initDept(): DeptStat {
  return {
    planning: 0, hadir: 0, terlambat: 0, tidak_hadir: 0, lembur: 0,  // ← tambah
    karyawan_unik: new Set<string>(),
    jabatan: Object.fromEntries([...JABATAN_RANK_LABEL.map(r => [r.key, 0]), ['LAINNYA', 0]]),
  }
}

// ─── Cell style helpers ───────────────────────────────────────────────────────
function solidFill(hex: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } }
}

function fontColor(hex: string, bold = false, size = 9): Partial<ExcelJS.Font> {
  return { bold, size, name: 'Calibri', color: { argb: 'FF' + hex } }
}

function thinBorder(hex = 'D1D5DB'): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF' + hex } }
  return { top: s, bottom: s, left: s, right: s }
}

function centerAlign(wrap = false): Partial<ExcelJS.Alignment> {
  return { horizontal: 'center', vertical: 'middle', wrapText: wrap }
}

function leftAlign(): Partial<ExcelJS.Alignment> {
  return { horizontal: 'left', vertical: 'middle' }
}

function styleCell(cell: ExcelJS.Cell, opts: CellStyleOpts) {
  if (opts.fill)        cell.fill = solidFill(opts.fill)
  if (opts.fontColor)   cell.font = { ...cell.font, color: { argb: 'FF' + opts.fontColor }, bold: opts.bold ?? false, size: opts.size ?? 9, name: 'Calibri', italic: opts.italic }
  if (opts.align)       cell.alignment = opts.align === 'center' ? centerAlign(opts.wrap) : leftAlign()
  if (opts.border)      cell.border = thinBorder(opts.borderColor)
}

function styleRow(
  ws: ExcelJS.Worksheet,
  row: ExcelJS.Row,
  colStart: number,
  colEnd: number,
  opts: CellStyleOpts,
) {
  for (let c = colStart; c <= colEnd; c++) {
    styleCell(row.getCell(c), opts)
  }
}

function aggregateMapped(data: MappedRecord[]): [Record<string, DeptStat>, string[]] {
  const deptMap: Record<string, DeptStat> = {}
  for (const emp of data) {
    const dept   = emp.departemen || '(Tidak Ada Departemen)'
    const jabKey = getJabatanKey(emp.jabatan || '')
    const status = emp.status_kehadiran || 'belum_absen'

    if (!deptMap[dept]) deptMap[dept] = initDept()
    const d = deptMap[dept]
    d.planning++

    const uid = emp.nik || emp.id_finger || ''
    if (uid) d.karyawan_unik.add(uid)

    if (status === 'hadir')                            d.hadir++
    if (status === 'terlambat')                        d.terlambat++
    if (status === 'lembur') d.lembur++
    if (['tidak_hadir', 'henkaten'].includes(status))  d.tidak_hadir++
    // lembur tidak masuk planning/hadir/tidak_hadir — hanya jabatan
    d.jabatan[jabKey] = (d.jabatan[jabKey] ?? 0) + 1
  }
  const sorted = Object.keys(deptMap).sort()
  return [deptMap, sorted]
}

function aggregateByShift(data: MappedRecord[]): Record<string, ShiftStat> {
  const shiftMap: Record<string, ShiftStat> = {}
  for (const emp of data) {
    const shift = emp.shift ?? (emp.status_kehadiran === 'lembur' ? 'Lembur' : 'Tidak Diketahui')
    const jamMasuk  = emp.jam_masuk_schedule  || '-'
    const jamKeluar = emp.jam_keluar_schedule || '-'
    const jabKey    = getJabatanKey(emp.jabatan || '')
    const status    = emp.status_kehadiran || 'belum_absen'

    if (!shiftMap[shift]) {
      shiftMap[shift] = { ...initDept(), jam_masuk: jamMasuk, jam_keluar: jamKeluar }
    }
    const s = shiftMap[shift]
    s.planning++
    if (status === 'hadir')                            s.hadir++
    if (status === 'terlambat')                        s.terlambat++
    if (['tidak_hadir', 'henkaten'].includes(status))  s.tidak_hadir++
    s.jabatan[jabKey] = (s.jabatan[jabKey] ?? 0) + 1
  }
  // Sort by jam_masuk
  return Object.fromEntries(
    Object.entries(shiftMap).sort((a, b) => a[1].jam_masuk.localeCompare(b[1].jam_masuk))
  )
}

function aggregateMappedByDeptShift(data: MappedRecord[]): Record<string, Record<string, ShiftStat>> {
  const result: Record<string, Record<string, ShiftStat>> = {}
  for (const emp of data) {
    const dept      = emp.departemen || '(Tidak Ada Departemen)'
    const shift = emp.shift ?? (emp.status_kehadiran === 'lembur' ? 'Lembur' : 'Tidak Diketahui')
    const jamMasuk  = emp.jam_masuk_schedule  || '-'
    const jamKeluar = emp.jam_keluar_schedule || '-'
    const jabKey    = getJabatanKey(emp.jabatan || '')
    const status    = emp.status_kehadiran || 'belum_absen'

    if (!result[dept]) result[dept] = {}
    if (!result[dept][shift]) {
      result[dept][shift] = { ...initDept(), jam_masuk: jamMasuk, jam_keluar: jamKeluar }
    }
    const s = result[dept][shift]
    s.planning++
    if (status === 'hadir')                            s.hadir++
    if (status === 'terlambat')                        s.terlambat++
    if (['tidak_hadir', 'henkaten'].includes(status))  s.tidak_hadir++
    s.jabatan[jabKey] = (s.jabatan[jabKey] ?? 0) + 1
  }
  // Sort dept keys, then sort shifts by jam_masuk
  const sorted: typeof result = {}
  for (const dept of Object.keys(result).sort()) {
    sorted[dept] = Object.fromEntries(
      Object.entries(result[dept]).sort((a, b) => a[1].jam_masuk.localeCompare(b[1].jam_masuk))
    )
  }
  return sorted
}

function aggregateUnmapped(data: UnmappedRecord[]): [Record<string, DeptStat>, string[]] {
  const deptMap: Record<string, DeptStat> = {}
  for (const emp of data) {
    const dept   = emp.departemen || '(Tidak Ada Departemen)'
    const jabKey = getJabatanKey(emp.jabatan || '')
    if (!deptMap[dept]) deptMap[dept] = initDept()
    deptMap[dept].hadir++
    deptMap[dept].jabatan[jabKey] = (deptMap[dept].jabatan[jabKey] ?? 0) + 1
  }
  const sorted = Object.keys(deptMap).sort()
  return [deptMap, sorted]
}

// ─── SHEET 1: DASHBOARD ───────────────────────────────────────────────────────
function buildDashboardSheet(
  ws: ExcelJS.Worksheet,
  mapped: MappedRecord[],
  unmapped: UnmappedRecord[],
  deptMap: Record<string, DeptStat>,
  sortedDepts: string[],
  startLabel: string,
  endLabel: string,
  exportedAt: string,
) {
  ws.properties.tabColor = { argb: 'FF2563EB' }

  ws.getColumn(1).width = 2
  ws.getColumn(2).width = 32
  for (let c = 3; c <= 8; c++) ws.getColumn(c).width = 18

  // ── Statistik ──────────────────────────────────────────────────────────────
  const totalRecords  = mapped.length
  const totalHadir    = mapped.filter(e => e.status_kehadiran === 'hadir').length
  const totalTerlambat = mapped.filter(e => e.status_kehadiran === 'terlambat').length
  const totalAbsen    = mapped.filter(e => ['tidak_hadir', 'henkaten'].includes(e.status_kehadiran ?? '')).length
  const totalBelum    = mapped.filter(e => (e.status_kehadiran ?? 'belum_absen') === 'belum_absen').length
  const totalUnmapped = unmapped.length
  const pctHadir      = totalRecords > 0 ? ((totalHadir + totalTerlambat) / totalRecords * 100).toFixed(1) : '0.0'

  const unikNiks    = [...new Set(mapped.map(e => e.nik).filter(Boolean))]
  const unikKaryawan = unikNiks.length || [...new Set(mapped.map(e => e.id_finger).filter(Boolean))].length
  const unikHari     = [...new Set(mapped.map(e => e.tanggal).filter(Boolean))].length

  // ── Title block ────────────────────────────────────────────────────────────
  ws.getRow(1).height = 6
  ws.getRow(2).height = 38; ws.getRow(3).height = 22; ws.getRow(4).height = 18; ws.getRow(5).height = 10

  const r2 = ws.getRow(2)
  ws.mergeCells('B2:H2')
  r2.getCell(2).value = '  LAPORAN REKAPITULASI KEHADIRAN KARYAWAN'
  styleCell(r2.getCell(2), { fill: '1E3A5F', fontColor: 'FFFFFF', bold: true, size: 18, align: 'left' })

  ws.mergeCells('B3:H3')
  ws.getRow(3).getCell(2).value = `  Periode: ${startLabel} s/d ${endLabel}`
  styleCell(ws.getRow(3).getCell(2), { fill: '1E3A5F', fontColor: 'DBEAFE', size: 11, align: 'left' })

  ws.mergeCells('B4:H4')
  ws.getRow(4).getCell(2).value = `  Diekspor: ${exportedAt}`
  styleCell(ws.getRow(4).getCell(2), { fill: '1E3A5F', fontColor: '93C5FD', size: 9, italic: true, align: 'left' })

  // ── KPI Cards (row 7–10) ───────────────────────────────────────────────────
  ws.getRow(6).height = 8; ws.getRow(7).height = 18; ws.getRow(8).height = 30
  ws.getRow(9).height = 16; ws.getRow(10).height = 16; ws.getRow(11).height = 10

  const kpis = [
    { col: 2, label: 'Total Terjadwal',      value: String(totalRecords),  d1: `${unikKaryawan} karyawan`,           d2: `${unikHari} hari kerja`,                      txt: '1E3A5F', bg: 'DBEAFE' },
    { col: 3, label: 'Hadir Tepat Waktu',    value: String(totalHadir),    d1: totalRecords > 0 ? `${(totalHadir/totalRecords*100).toFixed(1)}% dari records` : '-',    d2: unikHari > 0 ? `rata-rata ${Math.round(totalHadir/unikHari)}/hari` : '-', txt: '166534', bg: 'DCFCE7' },
    { col: 4, label: 'Terlambat',            value: String(totalTerlambat),d1: totalRecords > 0 ? `${(totalTerlambat/totalRecords*100).toFixed(1)}% dari records` : '-', d2: unikHari > 0 ? `rata-rata ${Math.round(totalTerlambat/unikHari)}/hari` : '-', txt: '92400E', bg: 'FEF3C7' },
    { col: 5, label: 'Tidak Hadir',          value: String(totalAbsen),    d1: totalRecords > 0 ? `${(totalAbsen/totalRecords*100).toFixed(1)}% dari records` : '-',     d2: unikHari > 0 ? `rata-rata ${Math.round(totalAbsen/unikHari)}/hari` : '-',  txt: '991B1B', bg: 'FEE2E2' },
    { col: 6, label: 'Belum Absen',          value: String(totalBelum),    d1: totalRecords > 0 ? `${(totalBelum/totalRecords*100).toFixed(1)}% dari records` : '-',     d2: '-',                                   txt: '374151', bg: 'F3F4F6' },
    { col: 7, label: 'Tidak Terjadwal',      value: String(totalUnmapped), d1: `${new Set(unmapped.map(e=>e.nik).filter(Boolean)).size} karyawan unik`,                  d2: '-',                                   txt: '5B21B6', bg: 'EDE9FE' },
    { col: 8, label: '% Kehadiran',          value: `${pctHadir}%`,        d1: `${totalHadir + totalTerlambat} hadir dari ${totalRecords}`,                              d2: `${unikKaryawan} karyawan terjadwal`,  txt: '0F766E', bg: 'CCFBF1' },
  ]

  for (const kpi of kpis) {
    for (let r = 7; r <= 10; r++) {
      const cell = ws.getRow(r).getCell(kpi.col)
      cell.fill      = solidFill(kpi.bg)
      cell.alignment = centerAlign(true)
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF' + kpi.txt } },
        bottom: { style: 'medium', color: { argb: 'FF' + kpi.txt } },
        left: { style: 'medium', color: { argb: 'FF' + kpi.txt } },
        right: { style: 'medium', color: { argb: 'FF' + kpi.txt } },
      }
    }
    // Label
    const c7 = ws.getRow(7).getCell(kpi.col)
    c7.value = kpi.label
    c7.font = fontColor(kpi.txt, true, 9)
    // Value
    const c8 = ws.getRow(8).getCell(kpi.col)
    c8.value = kpi.value
    c8.font = fontColor(kpi.txt, true, 22)
    // Detail 1
    const c9 = ws.getRow(9).getCell(kpi.col)
    c9.value = kpi.d1
    c9.font = { ...fontColor(kpi.txt, false, 8), italic: true }
    // Detail 2
    const c10 = ws.getRow(10).getCell(kpi.col)
    c10.value = kpi.d2
    c10.font = { ...fontColor(kpi.txt, false, 8), italic: true }
  }

  // ── Tabel departemen (row 12+) ─────────────────────────────────────────────
  ws.getRow(12).height = 18
  const tableHeaders: Record<number, string> = {
    2: 'Departemen', 3: 'Planning', 4: 'Hadir', 5: 'Terlambat', 6: 'Tidak Hadir', 7: 'Belum Absen', 8: 'Total Karyawan',
  }
  for (const [col, label] of Object.entries(tableHeaders)) {
    const cell = ws.getRow(12).getCell(Number(col))
    cell.value = label
    cell.fill = solidFill('1E3A5F')
    cell.font = fontColor('FFFFFF', true, 9)
    cell.alignment = centerAlign()
  }

  let rowIdx = 13
  for (const dept of sortedDepts) {
    const d = deptMap[dept]
    const belum = Math.max(0, d.planning - d.hadir - d.terlambat - d.tidak_hadir)
    const bg    = rowIdx % 2 === 0 ? 'F8FAFF' : 'FFFFFF'
    const row   = ws.getRow(rowIdx)
    row.height  = 14

    const rowData: Record<number, string | number> = {
    2: dept, 3: d.planning, 4: d.hadir, 5: d.terlambat,
    6: d.tidak_hadir, 7: belum, 8: d.lembur, 9: d.karyawan_unik.size,
    }
    for (const [col, val] of Object.entries(rowData)) {
      const cell = row.getCell(Number(col))
      cell.value = val
      cell.fill = solidFill(bg)
      cell.font = fontColor('111827', false, 9)
      cell.border = thinBorder()
      cell.alignment = Number(col) === 2 ? leftAlign() : centerAlign()
    }
    // Total Karyawan highlight
    const c8 = row.getCell(8)
    c8.fill = solidFill('D1FAE5')
    c8.font = fontColor('065F46', true, 9)

    const c9 = row.getCell(9)  // ← Total Karyawan geser ke 9
    c9.fill = solidFill('DBEAFE')
    c9.font = fontColor('1E3A5F', true, 9)
    
    rowIdx++
  }
}

// ─── SHEET 2: REKAPITULASI ────────────────────────────────────────────────────
function buildRekapSheet(
  ws: ExcelJS.Worksheet,
  mappedData: MappedRecord[],
  unmapData: UnmappedRecord[],
  mappedDeptMap: Record<string, DeptStat>,
  sortedMappedDepts: string[],
  unmappedDeptMap: Record<string, DeptStat>,
  sortedUnmappedDepts: string[],
  startLabel: string,
  endLabel: string,
  exportedAt: string,
) {
  ws.properties.tabColor = { argb: 'FF166534' }

  ws.getColumn(1).width = 5
  ws.getColumn(2).width = 32
  for (let c = 3; c <= 7; c++) ws.getColumn(c).width = 11
  let ci = 8
  for (const r of JABATAN_RANK_LABEL) { ws.getColumn(ci).width = 18; ci++ }
  ws.getColumn(ci).width = 10

  const totalCols = 7 + JABATAN_RANK_LABEL.length + 1

  const headers = ['No', 'Departemen', 'Planning', 'Hadir', 'Terlambat', 'Henkaten', '% Hadir',
    ...JABATAN_RANK_LABEL.map(r => r.label), 'Lainnya']

  // Title
  for (const [r, h, text, color, size] of [
    [1, 28, 'LAPORAN REKAPITULASI KEHADIRAN', 'FFFFFF', 14],
    [2, 20, `Periode: ${startLabel} s/d ${endLabel}`, 'DBEAFE', 11],
    [3, 18, `Diekspor: ${exportedAt}`, '93C5FD', 9],
  ] as Array<[number, number, string, string, number]>) {
    ws.getRow(r).height = h
    ws.mergeCells(r, 1, r, totalCols)
    const cell = ws.getRow(r).getCell(1)
    cell.value = text
    cell.fill = solidFill('1E3A5F')
    cell.font = fontColor(color, r === 1, size)
    cell.alignment = centerAlign()
  }

  const deptShiftMap = aggregateMappedByDeptShift(mappedData)
  let currentRow = 5

  currentRow = writeRekapSection(ws, currentRow, headers, totalCols, 'KARYAWAN TERJADWAL (MAPPED)',    '15803D', '2563EB', 'TOTAL MAPPED',    '166534', false, mappedDeptMap,   sortedMappedDepts,   mappedData, deptShiftMap)
  currentRow += 2
  currentRow = writeRekapSection(ws, currentRow, headers, totalCols, 'KARYAWAN TIDAK TERJADWAL (UNMAPPED)', 'B45309', 'D97706', 'TOTAL UNMAPPED', '92400E', true,  unmappedDeptMap, sortedUnmappedDepts, unmapData)
  currentRow += 2

  // Grand total
  ws.getRow(currentRow).height = 22
  ws.mergeCells(currentRow, 1, currentRow, totalCols)
  const gtHeader = ws.getRow(currentRow).getCell(1)
  gtHeader.value = 'TOTAL KESELURUHAN (MAPPED + UNMAPPED)'
  gtHeader.fill  = solidFill('1E3A5F')
  gtHeader.font  = fontColor('FFFFFF', true, 11)
  gtHeader.alignment = leftAlign()
  currentRow++

  const gMH = mappedData.filter(e => e.status_kehadiran === 'hadir').length
  const gMT = mappedData.filter(e => e.status_kehadiran === 'terlambat').length
  const gMA = mappedData.filter(e => ['tidak_hadir', 'henkaten'].includes(e.status_kehadiran ?? '')).length
  const gMP = mappedData.length
  const gPct = gMP > 0 ? `${((gMH + gMT) / gMP * 100).toFixed(1)}%` : '0%'
  const gUH  = unmapData.length

  const finalRow = ['', 'GRAND TOTAL', gMP, gMH + gUH, gMT, gMA, gPct,
    ...JABATAN_RANK_LABEL.map(r => Object.values(mappedDeptMap).reduce((s, d) => s + (d.jabatan[r.key] ?? 0), 0) + Object.values(unmappedDeptMap).reduce((s, d) => s + (d.jabatan[r.key] ?? 0), 0)),
    Object.values(mappedDeptMap).reduce((s, d) => s + (d.jabatan['LAINNYA'] ?? 0), 0) + Object.values(unmappedDeptMap).reduce((s, d) => s + (d.jabatan['LAINNYA'] ?? 0), 0),
  ]
  ws.getRow(currentRow).height = 22
  for (let c = 1; c <= totalCols; c++) {
    const cell = ws.getRow(currentRow).getCell(c)
    cell.value = finalRow[c - 1]
    cell.fill  = solidFill('1E3A5F')
    cell.font  = fontColor('FFFFFF', true, 10)
    cell.alignment = c === 2 ? leftAlign() : centerAlign()
    cell.border = { top: { style: 'medium', color: { argb: 'FF000000' } }, bottom: { style: 'medium', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } }
  }
}

function writeRekapSection(
  ws: ExcelJS.Worksheet,
  startRow: number,
  headers: string[],
  totalCols: number,
  sectionLabel: string,
  sectionColor: string,
  headerColor: string,
  grandLabel: string,
  grandColor: string,
  isUnmapped: boolean,
  deptMap: Record<string, DeptStat>,
  sortedDepts: string[],
  rawData: MappedRecord[] | UnmappedRecord[],
  deptShiftMap: Record<string, Record<string, ShiftStat>> = {},
): number {
  let row = startRow

  // Section header
  ws.getRow(row).height = 22
  ws.mergeCells(row, 1, row, totalCols)
  const sh = ws.getRow(row).getCell(1)
  sh.value = sectionLabel
  sh.fill  = solidFill(sectionColor)
  sh.font  = fontColor('FFFFFF', true, 11)
  sh.alignment = leftAlign()
  row++

  const useShift = !isUnmapped && Object.keys(deptShiftMap).length > 0

  // Column headers
  const colHeaders = useShift
    ? ['No', 'Departemen / Shift', 'Jam Masuk', 'Jam Keluar', ...headers.slice(2)]
    : headers

  ws.getRow(row).height = 36
  for (let c = 0; c < colHeaders.length; c++) {
    const cell = ws.getRow(row).getCell(c + 1)
    cell.value = colHeaders[c]
    cell.fill  = solidFill(headerColor)
    cell.font  = fontColor('FFFFFF', true, 9)
    cell.alignment = centerAlign(true)
    cell.border = thinBorder('000000')
  }
  row++

  if (sortedDepts.length === 0) {
    ws.getRow(row).getCell(2).value = '(Tidak ada data)'
    row++
  } else if (useShift) {
    for (const dept of sortedDepts) {
      const d      = deptMap[dept]
      const shifts = deptShiftMap[dept] ?? {}

      // Dept header row
      ws.getRow(row).height = 17
      ws.mergeCells(row, 1, row, totalCols)
      const dh = ws.getRow(row).getCell(1)
      dh.value = '  ' + dept.toUpperCase()
      dh.fill  = solidFill('1D4ED8')
      dh.font  = fontColor('FFFFFF', true, 9)
      dh.alignment = leftAlign()
      dh.border = { top: { style: 'medium', color: { argb: 'FF1E3A5F' } } }
      row++

      let shiftIdx = 0
      for (const [shiftName, sd] of Object.entries(shifts)) {
        const belum = Math.max(0, sd.planning - sd.hadir - sd.terlambat - sd.tidak_hadir)
        const pct   = sd.planning > 0 ? `${((sd.hadir + sd.terlambat) / sd.planning * 100).toFixed(1)}%` : '0%'

        const rowData = ['', `      ${shiftName}`, sd.jam_masuk, sd.jam_keluar,
          sd.planning, sd.hadir, sd.terlambat, sd.tidak_hadir, pct,
          ...JABATAN_RANK_LABEL.map(r => sd.jabatan[r.key] ?? 0), sd.jabatan['LAINNYA'] ?? 0,
        ]
        ws.getRow(row).height = 15
        const bg = shiftIdx % 2 === 0 ? 'EFF6FF' : 'F8FAFF'
        for (let c = 0; c < rowData.length; c++) {
          const cell = ws.getRow(row).getCell(c + 1)
          cell.value = rowData[c]
          cell.fill  = solidFill(bg)
          cell.font  = fontColor('111827', false, 9)
          cell.alignment = c === 1 ? leftAlign() : centerAlign()
          cell.border = thinBorder()
        }
        // Highlight
        ws.getRow(row).getCell(5).fill = solidFill('DBEAFE'); ws.getRow(row).getCell(5).font = fontColor('1E40AF', true, 9)
        ws.getRow(row).getCell(6).fill = solidFill('DCFCE7'); ws.getRow(row).getCell(6).font = fontColor('15803D', true, 9)
        ws.getRow(row).getCell(7).fill = solidFill('FEF3C7'); ws.getRow(row).getCell(7).font = fontColor('92400E', true, 9)
        ws.getRow(row).getCell(8).fill = solidFill('FEE2E2'); ws.getRow(row).getCell(8).font = fontColor('991B1B', true, 9)
        shiftIdx++; row++
      }

      // Subtotal dept
      const dPct  = d.planning > 0 ? `${((d.hadir + d.terlambat) / d.planning * 100).toFixed(1)}%` : '0%'
      const subtotal = ['', `  TOTAL ${dept}`, '-', '-', d.planning, d.hadir, d.terlambat, d.tidak_hadir, dPct,
        ...JABATAN_RANK_LABEL.map(r => d.jabatan[r.key] ?? 0), d.jabatan['LAINNYA'] ?? 0,
      ]
      ws.getRow(row).height = 16
      for (let c = 0; c < subtotal.length; c++) {
        const cell = ws.getRow(row).getCell(c + 1)
        cell.value = subtotal[c]
        cell.fill  = solidFill('475569')
        cell.font  = fontColor('FFFFFF', true, 9)
        cell.alignment = c === 1 ? leftAlign() : centerAlign()
        cell.border = { top: { style: 'medium', color: { argb: 'FF334155' } }, bottom: { style: 'medium', color: { argb: 'FF334155' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
      }
      row++
    }
  } else {
    // Unmapped flat
    for (let idx = 0; idx < sortedDepts.length; idx++) {
      const dept = sortedDepts[idx]
      const d    = deptMap[dept]
      const rowData = [idx + 1, dept, 0, d.hadir, 0, 0, '-',
        ...JABATAN_RANK_LABEL.map(r => d.jabatan[r.key] ?? 0), d.jabatan['LAINNYA'] ?? 0,
      ]
      ws.getRow(row).height = 15
      const bg = idx % 2 === 0 ? 'FFFBEB' : 'FFFFFF'
      for (let c = 0; c < rowData.length; c++) {
        const cell = ws.getRow(row).getCell(c + 1)
        cell.value = rowData[c]
        cell.fill  = solidFill(bg)
        cell.font  = fontColor('111827', false, 9)
        cell.alignment = c === 1 ? leftAlign() : centerAlign()
        cell.border = thinBorder()
      }
      ws.getRow(row).getCell(4).fill = solidFill('DCFCE7'); ws.getRow(row).getCell(4).font = fontColor('15803D', true, 9)
      row++
    }
  }

  // Grand total
  const mapped   = rawData as MappedRecord[]
  const unmapped = rawData as UnmappedRecord[]

  let grandData: (string | number)[]
  if (isUnmapped) {
    grandData = ['', grandLabel, 0, unmapped.length, 0, 0, '-',
      ...JABATAN_RANK_LABEL.map(r => Object.values(deptMap).reduce((s, d) => s + (d.jabatan[r.key] ?? 0), 0)),
      Object.values(deptMap).reduce((s, d) => s + (d.jabatan['LAINNYA'] ?? 0), 0),
    ]
  } else {
    const gP   = mapped.length
    const gH   = mapped.filter(e => e.status_kehadiran === 'hadir').length
    const gT   = mapped.filter(e => e.status_kehadiran === 'terlambat').length
    const gA   = mapped.filter(e => ['tidak_hadir', 'henkaten'].includes(e.status_kehadiran ?? '')).length
    const gPct = gP > 0 ? `${((gH + gT) / gP * 100).toFixed(1)}%` : '0%'
    grandData = ['', grandLabel, ...(useShift ? ['-', '-'] : []), gP, gH, gT, gA, gPct,
      ...JABATAN_RANK_LABEL.map(r => Object.values(deptMap).reduce((s, d) => s + (d.jabatan[r.key] ?? 0), 0)),
      Object.values(deptMap).reduce((s, d) => s + (d.jabatan['LAINNYA'] ?? 0), 0),
    ]
  }

  ws.getRow(row).height = 18
  for (let c = 0; c < grandData.length; c++) {
    const cell = ws.getRow(row).getCell(c + 1)
    cell.value = grandData[c]
    cell.fill  = solidFill(grandColor)
    cell.font  = fontColor('FFFFFF', true, 9)
    cell.alignment = c === 1 ? leftAlign() : centerAlign()
    cell.border = { top: { style: 'medium', color: { argb: 'FF000000' } }, bottom: { style: 'medium', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } }
  }

  return row + 1
}

// ─── SHEET 3: DETAIL KEHADIRAN ────────────────────────────────────────────────
function buildDetailSheet(ws: ExcelJS.Worksheet, data: MappedRecord[], unmapData: UnmappedRecord[]) {
  ws.properties.tabColor = { argb: 'FF2563EB' }

  // Kolom ID Finger dihapus; NIK N/A → fallback ke id_finger
  const headers = ['No', 'Status Mapping', 'Tanggal', 'NIK / ID Finger', 'Nama Karyawan', 'Departemen', 'Jabatan', 'Shift', 'Jadwal Masuk', 'Jadwal Keluar', 'Jam Masuk Aktual', 'Jam Keluar Aktual', 'Overnight', 'Status Kehadiran']
  const widths  = [5, 16, 12, 16, 28, 22, 22, 12, 13, 13, 18, 18, 10, 16]

  headers.forEach((h, i) => {
    ws.getColumn(i + 1).width = widths[i]
    const cell = ws.getRow(1).getCell(i + 1)
    cell.value = h
    cell.fill  = solidFill('1E3A5F')
    cell.font  = fontColor('FFFFFF', true, 9)
    cell.alignment = centerAlign()
    cell.border = thinBorder('000000')
  })
  ws.getRow(1).height = 20

  const rows: (string | number)[][] = []

  for (const emp of data) {
    const status  = emp.status_kehadiran || 'belum_absen'
    const isOvn   = !!emp.is_overnight
    // NIK N/A → tampilkan id_finger sebagai gantinya
    const nikOrId = (emp.nik && emp.nik !== 'N/A') ? emp.nik : (emp.id_finger ?? 'N/A')
    rows.push(['', 'Terjadwal', emp.tanggal ?? '', nikOrId,
      emp.nama ?? '', emp.departemen ?? '', emp.jabatan ?? '', emp.shift ?? '',
      emp.jam_masuk_schedule ?? '', emp.jam_keluar_schedule ?? '',
      fmtTimestamp(emp.jam_masuk_actual, false),
      fmtTimestamp(emp.jam_keluar_actual, isOvn),
      isOvn ? 'Ya' : 'Tidak',
      STATUS_TEXT[status] ?? 'Belum Absen',
    ])
  }
  for (const emp of unmapData) {
    // Unmapped: NIK N/A → id_finger
    const nikOrId = (emp.nik && emp.nik !== 'N/A') ? emp.nik : (emp.id_finger ?? 'N/A')
    rows.push(['', 'Tidak Terjadwal', emp.tanggal ?? '', nikOrId,
      emp.nama ?? '', emp.departemen ?? '', emp.jabatan ?? '', '', '', '',
      fmtTimestamp(emp.jam_masuk_actual), fmtTimestamp(emp.jam_keluar_actual), '', 'Tidak Ada Jadwal',
    ])
  }

  // Sort: Tanggal → Status Mapping → Nama
  rows.sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[1]).localeCompare(String(b[1])) || String(a[5]).localeCompare(String(b[5])))
  rows.forEach((r, i) => { r[0] = i + 1 })

  const STATUS_COLORS: Record<string, { txt: string; bg: string }> = {
    'Hadir':           { txt: '15803D', bg: 'DCFCE7' },
    'Terlambat':       { txt: '92400E', bg: 'FEF3C7' },
    'Tidak Hadir':     { txt: '991B1B', bg: 'FEE2E2' },
    'Henkaten':        { txt: '991B1B', bg: 'FEE2E2' },
    'Izin':            { txt: '1E40AF', bg: 'DBEAFE' },
    'Sakit':           { txt: '5B21B6', bg: 'EDE9FE' },
    'Belum Absen':     { txt: '374151', bg: 'F3F4F6' },
    'Tidak Ada Jadwal':{ txt: '92400E', bg: 'FEF3C7' },
    'Lembur':          { txt: '065F46', bg: 'D1FAE5' },  // ← tambah
    }

  for (let ri = 0; ri < rows.length; ri++) {
    const row  = ws.getRow(ri + 2)
    row.height = 14
    const bg   = ri % 2 === 0 ? 'FFFFFF' : 'F9FAFB'
    for (let c = 0; c < rows[ri].length; c++) {
      const cell = row.getCell(c + 1)
      cell.value = rows[ri][c]
      cell.fill  = solidFill(bg)
      cell.font  = fontColor('374151', false, 9)
      cell.alignment = leftAlign()
      cell.border = thinBorder()
    }

    // Status Mapping (col 2)
    const mapping = String(rows[ri][1])
    const mc = row.getCell(2)
    mc.fill  = solidFill(mapping === 'Terjadwal' ? 'DCFCE7' : 'FEF3C7')
    mc.font  = fontColor(mapping === 'Terjadwal' ? '166534' : '92400E', true, 9)
    mc.alignment = centerAlign()

    // Status Kehadiran (col 14, setelah ID Finger dihapus)
    const statusLabel = String(rows[ri][13])
    const sc = STATUS_COLORS[statusLabel]
    if (sc) {
      const c14 = row.getCell(14)
      c14.fill      = solidFill(sc.bg)
      c14.font      = fontColor(sc.txt, true, 9)
      c14.alignment = centerAlign()
    }

    // Overnight (col 13, setelah ID Finger dihapus)
    if (rows[ri][12] === 'Ya') {
      const c13 = row.getCell(13)
      c13.fill      = solidFill('DBEAFE')
      c13.font      = fontColor('1E40AF', true, 9)
      c13.alignment = centerAlign()
    }
  }

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  ws.autoFilter = { from: 'A1', to: `N1` }
}

// ─── SHEET 4: PER SHIFT ───────────────────────────────────────────────────────
function buildShiftSheet(
  ws: ExcelJS.Worksheet,
  mappedData: MappedRecord[],
  startLabel: string,
  endLabel: string,
  exportedAt: string,
) {
  ws.properties.tabColor = { argb: 'FF0F766E' }

  const shiftMap   = aggregateByShift(mappedData)
  const jabHeaders = JABATAN_RANK_LABEL.map(r => r.label)
  const headers    = ['No', 'Shift', 'Jam Masuk', 'Jam Keluar', 'Planning', 'Hadir', 'Terlambat', 'Henkaten', 'Belum Absen', '% Hadir', ...jabHeaders, 'Lainnya']
  const totalCols  = headers.length
  const widths     = [5, 20, 12, 12, 11, 11, 11, 11, 12, 10, ...jabHeaders.map(() => 18), 10]

  headers.forEach((_, i) => { ws.getColumn(i + 1).width = widths[i] ?? 15 })

  // Title
  for (const [r, h, text, color, size] of [
    [1, 28, 'REKAPITULASI KEHADIRAN PER SHIFT', 'FFFFFF', 14],
    [2, 20, `Periode: ${startLabel} s/d ${endLabel}`, 'CCFBF1', 11],
    [3, 18, `Diekspor: ${exportedAt}`, '99F6E4', 9],
  ] as Array<[number, number, string, string, number]>) {
    ws.getRow(r).height = h
    ws.mergeCells(r, 1, r, totalCols)
    const cell = ws.getRow(r).getCell(1)
    cell.value = text
    cell.fill  = solidFill('0F766E')
    cell.font  = fontColor(color, r === 1, size)
    cell.alignment = centerAlign()
  }

  // Header row
  const hRow = ws.getRow(5)
  hRow.height = 36
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1)
    cell.value = h
    cell.fill  = solidFill('0F766E')
    cell.font  = fontColor('FFFFFF', true, 9)
    cell.alignment = centerAlign(true)
    cell.border = thinBorder('000000')
  })

  let rowNum = 6
  let idx = 0
  let grandP = 0, grandH = 0, grandT = 0, grandA = 0, grandB = 0

  for (const [shiftName, d] of Object.entries(shiftMap)) {
    const belum = Math.max(0, d.planning - d.hadir - d.terlambat - d.tidak_hadir)
    const pct   = d.planning > 0 ? `${((d.hadir + d.terlambat) / d.planning * 100).toFixed(1)}%` : '0%'

    const rowData = [idx + 1, shiftName, d.jam_masuk, d.jam_keluar,
      d.planning, d.hadir, d.terlambat, d.tidak_hadir, belum, pct,
      ...JABATAN_RANK_LABEL.map(r => d.jabatan[r.key] ?? 0), d.jabatan['LAINNYA'] ?? 0,
    ]
    const row  = ws.getRow(rowNum)
    row.height = 15
    const bg   = idx % 2 === 0 ? 'F0FDFA' : 'FFFFFF'

    for (let c = 0; c < rowData.length; c++) {
      const cell = row.getCell(c + 1)
      cell.value = rowData[c]
      cell.fill  = solidFill(bg)
      cell.font  = fontColor('111827', false, 9)
      cell.alignment = c === 1 ? leftAlign() : centerAlign()
      cell.border = thinBorder()
    }
    row.getCell(5).fill  = solidFill('DBEAFE'); row.getCell(5).font  = fontColor('1E40AF', true, 9)
    row.getCell(6).fill  = solidFill('DCFCE7'); row.getCell(6).font  = fontColor('15803D', true, 9)
    row.getCell(7).fill  = solidFill('FEF3C7'); row.getCell(7).font  = fontColor('92400E', true, 9)
    row.getCell(8).fill  = solidFill('FEE2E2'); row.getCell(8).font  = fontColor('991B1B', true, 9)
    row.getCell(9).fill  = solidFill('F3F4F6'); row.getCell(9).font  = fontColor('374151', true, 9)

    grandP += d.planning; grandH += d.hadir; grandT += d.terlambat; grandA += d.tidak_hadir; grandB += belum
    idx++; rowNum++
  }

  // Grand total row
  const gPct  = grandP > 0 ? `${((grandH + grandT) / grandP * 100).toFixed(1)}%` : '0%'
  const grandRow = ['', 'TOTAL', '-', '-', grandP, grandH, grandT, grandA, grandB, gPct,
    ...JABATAN_RANK_LABEL.map(r => Object.values(shiftMap).reduce((s, d) => s + (d.jabatan[r.key] ?? 0), 0)),
    Object.values(shiftMap).reduce((s, d) => s + (d.jabatan['LAINNYA'] ?? 0), 0),
  ]
  const gRow  = ws.getRow(rowNum)
  gRow.height = 20
  for (let c = 0; c < grandRow.length; c++) {
    const cell = gRow.getCell(c + 1)
    cell.value = grandRow[c]
    cell.fill  = solidFill('0F766E')
    cell.font  = fontColor('FFFFFF', true, 10)
    cell.alignment = c === 1 ? leftAlign() : centerAlign()
    cell.border = { top: { style: 'medium', color: { argb: 'FF000000' } }, bottom: { style: 'medium', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } }
  }

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }]
  ws.autoFilter = { from: 'A5', to: `${String.fromCharCode(64 + totalCols)}5` }
}

// ─── MAIN EXPORT FUNCTION ─────────────────────────────────────────────────────
export async function exportKehadiran(
  mappedData: MappedRecord[],
  unmappedData: UnmappedRecord[],
  filter: ExportFilter = {},
): Promise<void> {
  const tanggal_start = filter.tanggal_start ?? todayISO()
  const tanggal_end   = filter.tanggal_end   ?? todayISO()
  const startLabel    = fmtDate(tanggal_start)
  const endLabel      = fmtDate(tanggal_end)
  const exportedAt    = fmtNow()

  const [mappedDeptMap, sortedMapped]   = aggregateMapped(mappedData)
  const [unmappedDeptMap, sortedUnmapped] = aggregateUnmapped(unmappedData)

  const wb = new ExcelJS.Workbook()
  wb.creator  = 'Sistem Kehadiran'
  wb.created  = new Date()
  wb.modified = new Date()

  const wsDash   = wb.addWorksheet('Dashboard')
  const wsRekap  = wb.addWorksheet('Rekapitulasi')
  const wsDetail = wb.addWorksheet('Detail Kehadiran')
  const wsShift  = wb.addWorksheet('Per Shift')

  buildDashboardSheet(wsDash,   mappedData, unmappedData, mappedDeptMap,   sortedMapped,   startLabel, endLabel, exportedAt)
  buildRekapSheet    (wsRekap,  mappedData, unmappedData, mappedDeptMap,   sortedMapped, unmappedDeptMap, sortedUnmapped, startLabel, endLabel, exportedAt)
  buildDetailSheet   (wsDetail, mappedData, unmappedData)
  buildShiftSheet    (wsShift,  mappedData, startLabel, endLabel, exportedAt)

  const buffer   = await wb.xlsx.writeBuffer()
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `Laporan_Kehadiran_${tanggal_start}_${tanggal_end}.xlsx`
  saveAs(blob, filename)
}