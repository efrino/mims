// ─────────────────────────────────────────────────────────────────────────────
// Hit langsung ke external MAJ Finger API untuk data kehadiran.
// ─────────────────────────────────────────────────────────────────────────────

const FINGER_API = import.meta.env.DEV ? '/finger-api/api/v1' : 'http://192.168.10.8/maj-finger-api/api/v1'
const HR_PORTAL  = import.meta.env.DEV ? '/hr-portal' : 'http://192.168.10.8/maj-hr-portal'
const rawToken = import.meta.env.VITE_FINGER_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NzEyMzI3ODksImRhdGEiOnsiaWQiOiI3IiwiZW1haWwiOiJhcGlAZ21haWwuY29tIiwibmFtZSI6IiJ9fQ.bmAQ8Qw4R-eNo0Yq2WqZ8-jBEIvIwkRwzr79mJSGYWU'
const FINGER_TOKEN = String(rawToken).replace(/^['"]|['"]$/g, '').trim()

const LATE_TOLERANCE_SECONDS = 359

const MIN_GAP_SECONDS = 3600

export interface AttendanceFilter {
  tanggal_start?: string
  tanggal_end?:   string
  department?:    string
  id_finger?:     string
}

export interface MappedRecord {
  tanggal:             string
  id_finger:           string
  nik:                 string
  nama:                string
  jenis_kelamin:       string
  divisi:              string
  departemen:          string
  bagian:              string
  jabatan:             string
  status_karyawan:     string
  shift:               string | null
  jam_masuk_schedule:  string | null
  jam_keluar_schedule: string | null
  is_overnight:        boolean
  status_kehadiran:    string
  jam_masuk_actual:    string | null
  jam_keluar_actual:   string | null
}

export interface UnmappedRecord {
  tanggal:          string
  id_finger:        string
  nik:              string
  nama:             string
  jenis_kelamin:    string
  divisi:           string
  departemen:       string
  bagian:           string
  jabatan:          string
  status_karyawan:  string
  shift:            string
  jam_masuk_actual: string | null
  jam_keluar_actual:string | null
}



export interface ShiftStat {
  nama:         string
  jam_masuk:    string
  jam_keluar:   string
  total:        number
  hadir:        number
  terlambat:    number
  tidak_hadir:  number
  belum_absen:  number
  lembur:       number
}

export interface AttendanceStats {
  total:        number
  hadir:        number
  terlambat:    number
  tidak_hadir:  number
  izin:         number
  sakit:        number
  belum_absen:  number
  lembur:       number   
  shifts:       ShiftStat[]
}

export interface AttendanceResult {
  mapped:   MappedRecord[]
  unmapped: UnmappedRecord[]
  stats:    AttendanceStats
}

interface RawPunch   { punch: number; ts: string }
interface PunchEntry { in: string | null; out: string | null; all: string[] }
type AttendanceMap   = Record<string, Record<string, PunchEntry>>   // [userId][tanggal]

interface ShiftItem {
  id_finger:    string
  shift:        string | null
  jam_masuk:    string | null
  jam_keluar:   string | null
  actual_absen: [string | null, string | null]
  is_overnight: boolean
  [key: string]: any
}

interface DeptData {
  departemen: string
  detail:     Record<string, ShiftItem[]>
  [key: string]: any
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function* dateRange(start: string, end: string): Generator<string> {
  const cur = new Date(start)
  const fin = new Date(end)
  while (cur <= fin) {
    yield cur.toISOString().slice(0, 10)
    cur.setDate(cur.getDate() + 1)
  }
}

function monthsInRange(start: string, end: string): { bulan: number; tahun: number }[] {
  const result: { bulan: number; tahun: number }[] = []
  const cur = new Date(start)
  cur.setDate(1)
  const fin = new Date(end)
  fin.setDate(1)
  while (cur <= fin) {
    result.push({ bulan: cur.getMonth() + 1, tahun: cur.getFullYear() })
    cur.setMonth(cur.getMonth() + 1)
  }
  return result
}

/** Apakah shift overnight (jam_keluar < jam_masuk secara waktu) */
function isOvernightShift(jamMasuk: string | null, jamKeluar: string | null): boolean {
  if (!jamMasuk || !jamKeluar) return false
  return (
    new Date(`1970-01-01T${jamKeluar}`).getTime() <
    new Date(`1970-01-01T${jamMasuk}`).getTime()
  )
}

async function apiFetch(url: string, withAuth = false): Promise<any> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (withAuth) headers['Authorization'] = `Bearer ${FINGER_TOKEN}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}


async function fetchMappingByMonths(
  tanggal_start: string,
  tanggal_end:   string,
  department:    string,
  id_finger:     string,
): Promise<{ depts: Record<string, DeptData>; scheduledFingerIds: Set<string> }> {
  const months = monthsInRange(tanggal_start, tanggal_end)
  const mergedDepts: Record<string, DeptData> = {}
  const scheduledFingerIds = new Set<string>()

  await Promise.all(
    months.map(async ({ bulan, tahun }) => {
      const params = new URLSearchParams({ bulan: String(bulan), tahun: String(tahun) })
      if (department) params.set('department', department)
      if (id_finger)  params.set('id_finger', id_finger)

      const data = await apiFetch(`${FINGER_API}/attendance/mapping?${params}`, true)
      if (data?.status !== 'success') return

      // Kumpulkan semua id_finger terjadwal bulan ini
      for (const fid of (data?.data?.scheduled_finger_ids ?? []) as string[]) {
        scheduledFingerIds.add(String(fid))
      }

      for (const dept of (data?.data?.data ?? []) as DeptData[]) {
        const name = dept.departemen ?? ''
        if (!mergedDepts[name]) {
          mergedDepts[name] = { ...dept, detail: { ...dept.detail } }
        } else {
          Object.assign(mergedDepts[name].detail, dept.detail)
        }
      }
    }),
  )

  return { depts: mergedDepts, scheduledFingerIds }
}

export interface EmployeeOption {
  nik:        string
  nama:       string
  departemen: string
}

interface RawEmployee {
  NIK?:        string
  nama?:       string
  departemen?: string
  is_active?:  number | string
}

// Daftar karyawan aktif, dipakai untuk dropdown pilih NIK/nama (mis. peminjaman barang)
export async function fetchEmployeeList(): Promise<EmployeeOption[]> {
  const data = await apiFetch(`${HR_PORTAL}/auth/get-employee`)
  return ((data?.get_user ?? []) as RawEmployee[])
    .filter(emp => emp.is_active == 1 && emp.NIK)
    .map(emp => ({
      nik:        String(emp.NIK).trim(),
      nama:       String(emp.nama ?? '').trim(),
      departemen: String(emp.departemen ?? '').trim(),
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama))
}

export async function fetchDepartmentList(): Promise<string[]> {
  const data = await apiFetch(`${HR_PORTAL}/auth/get-employee`)
  const depts = new Set<string>()
  for (const emp of (data?.get_user ?? []) as any[]) {
    if (emp.departemen) depts.add(emp.departemen)
  }
  return [...depts].sort()
}
async function fetchAttendanceMap(
  tanggal_start: string,
  tanggal_end:   string,
  id_finger:     string,
): Promise<AttendanceMap> {
  const params = new URLSearchParams({ start_date: tanggal_start, end_date: tanggal_end })
  const data = await apiFetch(`${FINGER_API}/attendance?${params}`, true)

  const rangeStartExt = addDays(tanggal_start, -1)
  const rangeEndExt   = addDays(tanggal_end,    1)

  const rawPunches: Record<string, Record<string, RawPunch[]>> = {}

  for (const record of (data?.data?.records ?? []) as any[]) {
    const userId = String(record.user_id)
    const tanggal = record.timestamp?.slice(0, 10) ?? ''

    if (!tanggal || tanggal < rangeStartExt || tanggal > rangeEndExt) continue
    if (id_finger && userId !== String(id_finger)) continue

    rawPunches[userId] ??= {}
    rawPunches[userId][tanggal] ??= []
    rawPunches[userId][tanggal].push({ punch: record.punch, ts: record.timestamp })
  }

  const map: AttendanceMap = {}

  for (const [userId, dates] of Object.entries(rawPunches)) {
    for (const [tanggal, punches] of Object.entries(dates)) {
      const allTs = punches.map(p => p.ts).sort()
      const firstPunch = allTs[0] ?? null
      const lastPunch  = allTs.length > 1 ? allTs[allTs.length - 1] : null

      const isValidOut =
        lastPunch &&
        firstPunch &&
        new Date(lastPunch).getTime() - new Date(firstPunch).getTime() >= MIN_GAP_SECONDS * 1000

      map[userId] ??= {}
      map[userId][tanggal] = {
        in:  firstPunch,
        out: isValidOut ? lastPunch : null,
        all: allTs,
      }
    }
  }

  return map
}

async function fetchEmployeeIndexes(): Promise<{
  employeeIndex:   Record<string, any>
  fingerUserIndex: Record<string, any>
}> {
  const [empData, fingerData] = await Promise.all([
    apiFetch(`${HR_PORTAL}/auth/get-employee`),
    apiFetch(`${FINGER_API}/users/device/2/db`, true),
  ])

  // Index karyawan aktif per fingerprint_id
  const employeeIndex: Record<string, any> = {}
  for (const emp of (empData?.get_user ?? []) as any[]) {
    if (emp.is_active == 1 && emp.fingerprint_id) {
      employeeIndex[String(emp.fingerprint_id)] = emp
    }
  }

  // Index finger users per user_id
  const fingerUserIndex: Record<string, any> = {}
  for (const fu of (fingerData?.data ?? []) as any[]) {
    if (fu.user_id) fingerUserIndex[String(fu.user_id)] = fu
  }

  return { employeeIndex, fingerUserIndex }
}
function isEmptyJam(v: string | null): boolean {
  return !v || v.trim() === '' || v.trim() === '-'
}
function attachActualPunch(
  depts:         Record<string, DeptData>,
  attendanceMap: AttendanceMap,
): { depts: Record<string, DeptData>; mappedFingerIds: Set<string> } {
  const mappedFingerIds = new Set<string>()

  for (const dept of Object.values(depts)) {
    for (const [tanggal, shifts] of Object.entries(dept.detail ?? {})) {
      for (const shift of shifts) {
        const fid = String(shift.id_finger)
        mappedFingerIds.add(fid)

        const jamMasuk  = shift.jam_masuk  ?? null
        const jamKeluar = shift.jam_keluar ?? null
        const overnight = isOvernightShift(jamMasuk, jamKeluar)
        shift.is_overnight = overnight

        if (overnight) {
          const punchesH = attendanceMap[fid]?.[tanggal]?.all ?? []
          let jamMasukActual: string | null = null
          for (const ts of punchesH) {
            if (ts.slice(11) >= (jamMasuk ?? '00:00:00')) {
              jamMasukActual = ts
              break
            }
          }

          const tanggalBesok = addDays(tanggal, 1)
          const punchesH1 = attendanceMap[fid]?.[tanggalBesok]?.all ?? []
          const jamKeluarActual = punchesH1[0] ?? null

          shift.actual_absen = [jamMasukActual, jamKeluarActual]
        } else {
          const dayData = attendanceMap[fid]?.[tanggal]
          shift.actual_absen = [dayData?.in ?? null, dayData?.out ?? null]
        }
      }
    }
  }

  return { depts, mappedFingerIds }
}

function flattenToMapped(
  depts:          Record<string, DeptData>,
  tanggal_start:  string,
  tanggal_end:    string,
  employeeIndex:  Record<string, any>,
  fingerUserIndex:Record<string, any>,
  attendanceMap:  AttendanceMap,
): MappedRecord[] {
  const mappingIndex: Record<string, Record<string, ShiftItem>> = {}
  for (const dept of Object.values(depts)) {
    for (const [tanggal, shifts] of Object.entries(dept.detail ?? {})) {
      if (tanggal < tanggal_start || tanggal > tanggal_end) continue
      for (const shift of shifts) {
        const fid = String(shift.id_finger)
        mappingIndex[fid] ??= {}
        mappingIndex[fid][tanggal] = shift
      }
    }
  }

  const today = todayISO()
  const now   = Date.now()
  const mapped: MappedRecord[] = []

  // Loop 1: karyawan dengan jadwal
  for (const fid of Object.keys(mappingIndex)) {
    const emp        = employeeIndex[fid]
    const fingerUser = fingerUserIndex[fid]

    for (const tanggal of dateRange(tanggal_start, tanggal_end)) {
      const shiftData = mappingIndex[fid]?.[tanggal]
      if (!shiftData) continue

      const jamMasuk  = shiftData.jam_masuk  ?? null
      const jamKeluar = shiftData.jam_keluar ?? null

      // Shift terdaftar tapi tidak ada jam → hari libur/tanpa jadwal resmi
      // Kalau ada punch → lembur, kalau tidak → skip
      const isEmptyJam = (v: string | null) => !v || v.trim() === '' || v.trim() === '-'
      if (isEmptyJam(jamMasuk) && isEmptyJam(jamKeluar)) {
        const dayData = attendanceMap[fid]?.[tanggal]
        if (dayData?.in || dayData?.out) {
          mapped.push({
            tanggal,
            id_finger:           fid,
            nik:                 emp?.NIK             ?? 'N/A',
            nama:                emp?.nama            ?? fingerUser?.name ?? 'No Name',
            jenis_kelamin:       emp?.jenis_kelamin   ?? '',
            divisi:              emp?.divisi          ?? '',
            departemen:          emp?.departemen      ?? '',
            bagian:              emp?.bagian          ?? '',
            jabatan:             emp?.jabatan         ?? 'N/A',
            status_karyawan:     emp?.status_karyawan ?? '',
            shift:               shiftData.shift ?? null,
            jam_masuk_schedule:  null,
            jam_keluar_schedule: null,
            is_overnight:        false,
            status_kehadiran:    'lembur',
            jam_masuk_actual:    dayData.in  ?? null,
            jam_keluar_actual:   dayData.out ?? null,
          })
        }
        continue  // skip kalkulasi status normal
      }

      const overnight = shiftData.is_overnight ?? isOvernightShift(jamMasuk, jamKeluar)
      const [jamMasukActual, jamKeluarActual] = shiftData.actual_absen ?? [null, null]

      const tanggalKemarin = addDays(tanggal, -1)
      const shiftKemarin   = mappingIndex[fid]?.[tanggalKemarin]
      if (shiftKemarin && overnight) {
        const kemarinOvernight = isOvernightShift(shiftKemarin.jam_masuk, shiftKemarin.jam_keluar)
        if (
          kemarinOvernight &&
          shiftKemarin.jam_masuk  === jamMasuk &&
          shiftKemarin.jam_keluar === jamKeluar &&
          !jamMasukActual
        ) continue
      }

      let status_kehadiran: string
      const isToday = tanggal === today

      if (jamMasukActual || jamKeluarActual) {
        status_kehadiran = 'hadir'
        if (jamMasuk && jamMasukActual) {
          const jadwalTs = new Date(`${tanggal}T${jamMasuk}`).getTime()
          const actualTs = new Date(jamMasukActual).getTime()
          if ((actualTs - jadwalTs) / 1000 > LATE_TOLERANCE_SECONDS) {
            status_kehadiran = 'terlambat'
          }
        }
      } else if (isToday && jamMasuk) {
        const jadwalMasukTs   = new Date(`${tanggal}T${jamMasuk}`).getTime()
        const batasTidakHadir = jadwalMasukTs + 30 * 60 * 1000
        status_kehadiran = now < batasTidakHadir ? 'belum_absen' : 'tidak_hadir'
      } else {
        status_kehadiran = 'tidak_hadir'
      }

      mapped.push({
        tanggal,
        id_finger:           fid,
        nik:                 emp?.NIK             ?? 'N/A',
        nama:                emp?.nama            ?? fingerUser?.name ?? 'No Name',
        jenis_kelamin:       emp?.jenis_kelamin   ?? '',
        divisi:              emp?.divisi          ?? '',
        departemen:          emp?.departemen      ?? '',
        bagian:              emp?.bagian          ?? '',
        jabatan:             emp?.jabatan         ?? 'N/A',
        status_karyawan:     emp?.status_karyawan ?? '',
        shift:               shiftData.shift,
        jam_masuk_schedule:  jamMasuk,
        jam_keluar_schedule: jamKeluar,
        is_overnight:        overnight,
        status_kehadiran,
        jam_masuk_actual:    jamMasukActual  ?? null,
        jam_keluar_actual:   jamKeluarActual ?? null,
      })
    }
  }

  // Loop 2: karyawan terjadwal yang punch di hari tanpa jadwal sama sekali → 'lembur'
  for (const fid of Object.keys(mappingIndex)) {
    const emp        = employeeIndex[fid]
    const fingerUser = fingerUserIndex[fid]

    for (const tanggal of dateRange(tanggal_start, tanggal_end)) {
      if (mappingIndex[fid]?.[tanggal]) continue  // sudah diproses di loop 1

      const dayData = attendanceMap[fid]?.[tanggal]
      if (!dayData?.in && !dayData?.out) continue  // tidak ada punch, skip

      mapped.push({
        tanggal,
        id_finger:           fid,
        nik:                 emp?.NIK             ?? 'N/A',
        nama:                emp?.nama            ?? fingerUser?.name ?? 'No Name',
        jenis_kelamin:       emp?.jenis_kelamin   ?? '',
        divisi:              emp?.divisi          ?? '',
        departemen:          emp?.departemen      ?? '',
        bagian:              emp?.bagian          ?? '',
        jabatan:             emp?.jabatan         ?? 'N/A',
        status_karyawan:     emp?.status_karyawan ?? '',
        shift:               null,
        jam_masuk_schedule:  null,
        jam_keluar_schedule: null,
        is_overnight:        false,
        status_kehadiran:    'lembur',
        jam_masuk_actual:    dayData.in  ?? null,
        jam_keluar_actual:   dayData.out ?? null,
      })
    }
  }

  return mapped
}

function flattenToUnmapped(
  attendanceMap:  AttendanceMap,
  mappedFingerIds:Set<string>,
  tanggal_start:  string,
  tanggal_end:    string,
  employeeIndex:  Record<string, any>,
  fingerUserIndex:Record<string, any>,
): UnmappedRecord[] {
  const unmapped: UnmappedRecord[] = []

  for (const [userId, dates] of Object.entries(attendanceMap)) {
    if (mappedFingerIds.has(userId)) continue

    for (const [tanggal, punches] of Object.entries(dates)) {
      if (tanggal < tanggal_start || tanggal > tanggal_end) continue

      const emp        = employeeIndex[userId]
      const fingerUser = fingerUserIndex[userId]

      unmapped.push({
        tanggal,
        id_finger:        userId,
        nik:              emp?.NIK             ?? 'N/A',
        nama:             emp?.nama            ?? fingerUser?.name ?? 'No Name',
        jenis_kelamin:    emp?.jenis_kelamin   ?? '',
        divisi:           emp?.divisi          ?? '',
        departemen:       emp?.departemen      ?? '',
        bagian:           emp?.bagian          ?? '',
        jabatan:          emp?.jabatan         ?? 'N/A',
        status_karyawan:  emp?.status_karyawan ?? '',
        shift:            'Tidak Ada Jadwal',
        jam_masuk_actual: punches.in  ?? null,
        jam_keluar_actual:punches.out ?? null,
      })
    }
  }

  return unmapped
}

function calculateStats(mapped: MappedRecord[]): AttendanceStats {
  const today = todayISO()

  const counts = { hadir: 0, terlambat: 0, tidak_hadir: 0, izin: 0, sakit: 0, belum_absen: 0, lembur: 0 }
  const shiftsMap: Record<string, ShiftStat> = {}

  for (const emp of mapped) {
    if (emp.tanggal !== today) continue

    const status = emp.status_kehadiran ?? 'belum_absen'
    const key = ['tidak_hadir', 'henkaten'].includes(status) ? 'tidak_hadir' : status as keyof typeof counts
    if (key in counts) counts[key as keyof typeof counts]++
    else counts.belum_absen++

    const shiftName = emp.shift ?? 'Lembur'
    if (!shiftsMap[shiftName]) {
      shiftsMap[shiftName] = {
        nama:        shiftName,
        jam_masuk:   emp.jam_masuk_schedule  ?? '-',
        jam_keluar:  emp.jam_keluar_schedule ?? '-',
        total: 0, hadir: 0, terlambat: 0, tidak_hadir: 0, belum_absen: 0, lembur: 0,
      }
    }
    shiftsMap[shiftName].total++
    const shiftKey = ['tidak_hadir', 'henkaten'].includes(status) ? 'tidak_hadir' : status
    if (shiftKey in shiftsMap[shiftName]) {
      (shiftsMap[shiftName] as any)[shiftKey]++
    } else {
      shiftsMap[shiftName].belum_absen++
    }
  }

  const shifts = Object.values(shiftsMap).sort((a, b) =>
    (a.jam_masuk ?? '').localeCompare(b.jam_masuk ?? ''),
  )

  return {
    total: Object.values(counts).reduce((s, v) => s + v, 0),
    ...counts,
    shifts,
  }
}


export async function fetchAttendanceData(
  filter: AttendanceFilter = {},
): Promise<AttendanceResult> {
  const tanggal_start = filter.tanggal_start ?? todayISO()
  const tanggal_end   = filter.tanggal_end   ?? todayISO()
  const department    = filter.department    ?? ''
  const id_finger     = filter.id_finger     ?? ''

  const [{ depts, scheduledFingerIds }, attendanceMap, { employeeIndex, fingerUserIndex }] = await Promise.all([
    fetchMappingByMonths(tanggal_start, tanggal_end, department, id_finger),
    fetchAttendanceMap(tanggal_start, tanggal_end, id_finger),
    fetchEmployeeIndexes(),
  ])

  const { depts: deptsWithPunch, mappedFingerIds } = attachActualPunch(depts, attendanceMap)

  const mapped   = flattenToMapped(deptsWithPunch, tanggal_start, tanggal_end, employeeIndex, fingerUserIndex, attendanceMap)
  
  // Pakai scheduledFingerIds (semua terjadwal bulan ini) bukan mappedFingerIds
  // agar karyawan lembur tidak ikut masuk unmapped
  const unmapped = flattenToUnmapped(attendanceMap, scheduledFingerIds, tanggal_start, tanggal_end, employeeIndex, fingerUserIndex)
  
  const stats    = calculateStats(mapped)

  return { mapped, unmapped, stats }
}