<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'
import CustomSelectSearch from '@/components/CustomSelectSearch.vue'
import { useAttendanceStore } from '@/stores/HRD/AttendanceStore'
import type { MappedRecord } from '@/services/HRD/AttendanceService'
import { exportKehadiran } from '@/services/HRD/Exportkehadiranservice'

const page        = ref({ title: 'Mapping Kehadiran Karyawan' })
const breadcrumbs = ref([
  { title: 'HRD', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'Mapped', disabled: true, href: '#' },
])

interface GroupedEmp extends MappedRecord {
  _records:         MappedRecord[]
  _totalHari:       number
  _hadir:           number
  _terlambat:       number
  _tidak_hadir:     number
  _izin:            number
  _sakit:           number
  _belum_absen:     number
  tanggal_terakhir: string
}

const store   = useAttendanceStore()
const loading = computed(() => store.loading)
const error   = computed(() => store.error)
const allRaw  = computed<MappedRecord[]>(() => store.dataMapping ?? [])

const currentView = ref<'grid' | 'table'>('grid')
const currentPage = ref(1)
const perPage     = ref(30)
const modalEmp    = ref<GroupedEmp | null>(null)

const filter = ref({
  tanggal_start: todayISO(),
  tanggal_end:   todayISO(),
  id_finger:     '',
})

const localFilter = ref({
  status:     '',
  department: '',
  search:     '',
  shift:      '',
})

const sort = ref({ field: 'jabatan', order: 'asc' as 'asc' | 'desc' })

const itemsPerPageOptions = [10, 20, 30, 50, 100]

const JABATAN_PRIORITY: Record<string, number> = {
  'DEPUTY EXECUTIVE OFFICER COMMERCIAL':  0,
  'DEPUTY EXECUTIVE OFFICER MANUFACTURE': 0,
  'DIVISION HEAD':                        1,
  'DEPUTY DIVISION HEAD':                 2,
  'DEPT. HEAD':                           3,
  'DEPUTY DEPT. HEAD':                    4,
  'ASSISTANT DEPT. HEAD':                 5,
  'SECTION HEAD':                         6,
  'PJS SECTION HEAD':                     6,
  'STAFF AHLI':                           7,
  'FOREMAN':                              7,
  'STAFF':                                7,
  'PJS FOREMAN':                          8,
  'PELAKSANA':                            9,
  'OPERATOR':                            10,
  'KMI SUPERVISOR':                      10,
  'PKL':                                 11,
}

const JABATAN_SHORT: Record<string, string> = {
  'DEPUTY EXECUTIVE OFFICER COMMERCIAL':  'DEO Commercial',
  'DEPUTY EXECUTIVE OFFICER MANUFACTURE': 'DEO Manufacture',
  'DIVISION HEAD':                        'DIV HEAD',
  'DEPUTY DIVISION HEAD':                 'DEPUTY DIV HEAD',
  'DEPT. HEAD':                           'MANAGER',
  'DEPUTY DEPT. HEAD':                    'DEPUTY MANAGER',
  'ASSISTANT DEPT. HEAD':                 'ASST. MANAGER',
  'SECTION HEAD':                         'SEC HEAD',
  'PJS SECTION HEAD':                     'PJS SEC HEAD',
}

function jabatanRank (j: string | null) { return JABATAN_PRIORITY[j?.trim() ?? ''] ?? 999 }
function jabatanShort(j: string | null) { return JABATAN_SHORT[j?.trim() ?? ''] ?? '' }

function todayISO() { return new Date().toISOString().slice(0, 10) }

function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < String(str || '').length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i); h = h & h
  }
  return Math.abs(h).toString(16).padStart(6, '0')
}

function avatarUrl(nama: string, finger: string, size = 40) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nama || '?')}&background=${hashColor(finger)}&color=fff&size=${size}`
}


async function exportToExcel() {
  try {
    await exportKehadiran(
      store.dataMapping,
      store.dataUnmapped,
      { tanggal_start: filter.value.tanggal_start, tanggal_end: filter.value.tanggal_end }
    )
  } catch (err) {
    console.error('Export gagal:', err)
  }
}

function getStatusConfig(status: string | null | undefined) {
  const s = status || 'belum_absen'
  const map: Record<string, any> = {
    hadir:       { borderColor: 'border-green-400',  bgColor: 'bg-green-500',  badgeClass: 'bg-green-100 text-green-800',   text: 'Hadir',       hasPulse: true,  opacity: '',           rowClass: '' },
    terlambat:   { borderColor: 'border-yellow-400', bgColor: 'bg-yellow-500', badgeClass: 'bg-yellow-100 text-yellow-800', text: 'Terlambat',   hasPulse: true,  opacity: '',           rowClass: '' },
    tidak_hadir: { borderColor: 'border-red-400',    bgColor: 'bg-red-500',    badgeClass: 'bg-red-100 text-red-800',       text: 'Henkaten',    hasPulse: false, opacity: 'opacity-60', rowClass: 'bg-red-50/40' },
    henkaten:    { borderColor: 'border-red-400',    bgColor: 'bg-red-500',    badgeClass: 'bg-red-100 text-red-800',       text: 'Henkaten',    hasPulse: false, opacity: 'opacity-60', rowClass: 'bg-red-50/40' },
    izin:        { borderColor: 'border-blue-400',   bgColor: 'bg-blue-500',   badgeClass: 'bg-blue-100 text-blue-800',     text: 'Izin',        hasPulse: false, opacity: '',           rowClass: '' },
    sakit:       { borderColor: 'border-purple-400', bgColor: 'bg-purple-500', badgeClass: 'bg-purple-100 text-purple-800', text: 'Sakit',       hasPulse: false, opacity: '',           rowClass: '' },
    belum_absen: { borderColor: 'border-gray-200',   bgColor: 'bg-gray-300',   badgeClass: 'bg-gray-100 text-gray-600',     text: 'Belum Absen', hasPulse: false, opacity: '',           rowClass: '' },
  }
  return map[s] ?? map.belum_absen
}

function attendancePct(emp: GroupedEmp) {
  return emp._totalHari > 0
    ? Math.round((emp._hadir + emp._terlambat) / emp._totalHari * 100)
    : 0
}

function pctColor(pct: number) {
  if (pct >= 80) return 'text-green-600'
  if (pct >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

function groupByKaryawan(list: MappedRecord[]): GroupedEmp[] {
  const map = new Map<string, GroupedEmp>()
  list.forEach(emp => {
    const key = emp.nik || emp.id_finger || emp.nama
    if (!map.has(key)) {
      map.set(key, { ...emp, _records: [emp], _totalHari: 0, _hadir: 0, _terlambat: 0, _tidak_hadir: 0, _izin: 0, _sakit: 0, _belum_absen: 0, tanggal_terakhir: '-' })
    } else {
      map.get(key)!._records.push(emp)
    }
  })
  map.forEach(item => {
    item._totalHari = item._records.length
    item._records.forEach(r => {
      const s = r.status_kehadiran || 'belum_absen'
      if      (s === 'hadir')                           item._hadir++
      else if (s === 'terlambat')                       item._terlambat++
      else if (s === 'tidak_hadir' || s === 'henkaten') item._tidak_hadir++
      else if (s === 'izin')                            item._izin++
      else if (s === 'sakit')                           item._sakit++
      else                                              item._belum_absen++
    })
    const latest = [...item._records].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
    item.status_kehadiran  = latest[0]?.status_kehadiran  || 'belum_absen'
    item.jam_masuk_actual  = latest[0]?.jam_masuk_actual  || null
    item.jam_keluar_actual = latest[0]?.jam_keluar_actual || null
    item.tanggal_terakhir  = latest[0]?.tanggal           || '-'
  })
  return Array.from(map.values())
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
function sortGrouped(list: GroupedEmp[]): GroupedEmp[] {
  const { field, order } = sort.value
  return [...list].sort((a, b) => {
    if (field === 'jabatan') {
      const jA = (a.jabatan || '').trim(), jB = (b.jabatan || '').trim()
      const empty = (v: string) => !v || v === 'N/A' || v === '-'
      if (empty(jA) && empty(jB)) return 0
      if (empty(jA)) return 1
      if (empty(jB)) return -1
      const pA = JABATAN_PRIORITY[jA] ?? 998, pB = JABATAN_PRIORITY[jB] ?? 998
      if (pA === pB) return a.nama.localeCompare(b.nama)
      return order === 'asc' ? pA - pB : pB - pA
    }
    const STATUS_ORDER: Record<string, number> = {
      hadir: 1, terlambat: 2, izin: 3, sakit: 4, tidak_hadir: 5, henkaten: 5, belum_absen: 6,
    }
    let vA: any = (a as any)[field] ?? '', vB: any = (b as any)[field] ?? ''
    if      (field === 'status_kehadiran') { vA = STATUS_ORDER[vA] ?? 999; vB = STATUS_ORDER[vB] ?? 999 }
    else if (field === 'nik')              { vA = parseInt(vA) || 0;       vB = parseInt(vB) || 0 }
    else                                   { vA = String(vA).toLowerCase(); vB = String(vB).toLowerCase() }
    const cmp = vA > vB ? 1 : vA < vB ? -1 : 0
    return order === 'desc' ? -cmp : cmp
  })
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const filteredEmployees = computed(() => {
  const { status, department, search, shift } = localFilter.value
  const term = search.toLowerCase().trim()
  return allRaw.value.filter(emp => {
    if (department && emp.departemen !== department)    return false
    if (status     && emp.status_kehadiran !== status) return false
    if (shift      && emp.shift !== shift)             return false
    if (term && !['nama','nik','id_finger','departemen','jabatan']
      .some(k => String((emp as any)[k] || '').toLowerCase().includes(term))) return false
    return true
  })
})

const allGrouped      = computed(() => groupByKaryawan(allRaw.value))
const groupedFiltered = computed(() => sortGrouped(groupByKaryawan(filteredEmployees.value)))
const totalFiltered   = computed(() => groupedFiltered.value.length)
const totalPages      = computed(() => Math.ceil(totalFiltered.value / perPage.value))
const pagedGrouped    = computed(() =>
  groupedFiltered.value.slice((currentPage.value - 1) * perPage.value, currentPage.value * perPage.value)
)
const startEntry = computed(() => totalFiltered.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
const endEntry   = computed(() => Math.min(currentPage.value * perPage.value, totalFiltered.value))

const visiblePages = computed(() => {
  const total = totalPages.value, cur = currentPage.value
  const pages: (number | string)[] = []
  const s = Math.max(1, cur - 2), e = Math.min(total, cur + 2)
  if (s > 1) { pages.push(1); if (s > 2) pages.push('...') }
  for (let i = s; i <= e; i++) pages.push(i)
  if (e < total) { if (e < total - 1) pages.push('...'); pages.push(total) }
  return pages
})

const departmentOptions = computed(() =>
  [...new Set(allRaw.value.map(e => e.departemen).filter(Boolean))].sort().map(v => ({
    part_number: v, job_number: v, customer: v,
  }))
)

const shiftOptions = computed(() =>
  [...new Set(allRaw.value.map(e => e.shift).filter(Boolean))].sort()
)

const statusOptions = [
  { value: 'hadir',       label: 'Hadir'       },
  { value: 'terlambat',   label: 'Terlambat'   },
  { value: 'tidak_hadir', label: 'Henkaten'    },
  { value: 'belum_absen', label: 'Belum Absen' },
]

const hasLocalFilter = computed(() =>
  !!(localFilter.value.status || localFilter.value.department || localFilter.value.search || localFilter.value.shift)
)

// ─── Table columns ────────────────────────────────────────────────────────────
const tableCols = [
  { field: 'nik',              label: 'NIK'           },
  { field: 'nama',             label: 'Nama'          },
  { field: 'departemen',       label: 'Departemen'    },
  { field: 'jabatan',          label: 'Jabatan'       },
  { field: 'shift',            label: 'Shift'         },
  { field: 'ringkasan',        label: 'Ringkasan'     },
  { field: 'pct',              label: '% Hadir'       },
  { field: 'status_kehadiran', label: 'Status'        },
]

function handleSort(field: string) {
  if (sort.value.field === field) sort.value.order = sort.value.order === 'asc' ? 'desc' : 'asc'
  else { sort.value.field = field; sort.value.order = 'asc' }
}
function sortIcon(field: string) {
  if (sort.value.field !== field) return '↕'
  return sort.value.order === 'asc' ? '↑' : '↓'
}

const legends = [
  { label: 'Hadir',       bg: 'bg-green-500'  },
  { label: 'Terlambat',   bg: 'bg-yellow-500' },
  { label: 'Henkaten',    bg: 'bg-red-500'    },
  { label: 'Izin',        bg: 'bg-blue-500'   },
  { label: 'Sakit',       bg: 'bg-purple-500' },
  { label: 'Belum Absen', bg: 'bg-gray-400'   },
]

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(emp: GroupedEmp) {
  modalEmp.value = emp
  document.body.style.overflow = 'hidden'
  nextTick(() => {
    const el = document.querySelector('.modal-scroll') as HTMLElement
    if (el) el.scrollTop = 0
  })
}
function closeModal() {
  modalEmp.value = null
  document.body.style.overflow = ''
}

const modalRecords = computed(() => {
  if (!modalEmp.value) return []
  return [...modalEmp.value._records].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
})

const modalPeriode = computed(() => {
  if (!modalEmp.value) return ''
  const dates = modalEmp.value._records.map(r => r.tanggal).filter(Boolean).sort()
  return dates.length
    ? `Periode: ${dates[0]} s/d ${dates[dates.length - 1]} (${modalEmp.value._totalHari} hari)`
    : 'Semua periode'
})

const modalPct = computed(() => {
  if (!modalEmp.value) return 0
  const { _totalHari: t, _hadir: h, _terlambat: tl } = modalEmp.value
  return t > 0 ? parseFloat(((h + tl) / t * 100).toFixed(1)) : 0
})

const modalBarColor = computed(() => {
  const p = modalPct.value
  return p >= 80 ? '#22c55e' : p >= 50 ? '#f59e0b' : '#ef4444'
})

const modalStatCards = computed(() => {
  if (!modalEmp.value) return []
  const e = modalEmp.value
  return [
    { label: 'Total Hari', value: e._totalHari,  bg: 'bg-white',     border: 'border-gray-200',   textColor: 'text-gray-800',   sub: 'text-gray-500'   },
    { label: 'Hadir',      value: e._hadir,       bg: 'bg-green-50',  border: 'border-green-200',  textColor: 'text-green-700',  sub: 'text-green-600'  },
    { label: 'Terlambat',  value: e._terlambat,   bg: 'bg-yellow-50', border: 'border-yellow-200', textColor: 'text-yellow-700', sub: 'text-yellow-600' },
    { label: 'Henkaten',   value: e._tidak_hadir, bg: 'bg-red-50',    border: 'border-red-200',    textColor: 'text-red-700',    sub: 'text-red-600'    },
    { label: 'Blm Absen',  value: e._belum_absen, bg: 'bg-gray-50',   border: 'border-gray-200',   textColor: 'text-gray-600',   sub: 'text-gray-500'   },
  ]
})

// ─── Actions ──────────────────────────────────────────────────────────────────
async function applyServerFilter() {
  currentPage.value = 1
  await store.fetchDataMapping(filter.value)
}

function resetLocalFilter() {
  localFilter.value = { status: '', department: '', search: '', shift: '' }
  currentPage.value = 1
}

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p
}

function changePerPage() { currentPage.value = 1 }

watch(localFilter, () => { currentPage.value = 1 }, { deep: true })
watch(perPage,     () => { currentPage.value = 1 })

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
onMounted(() => {
  window.addEventListener('keydown', onKey)
  store.fetchDataMapping(filter.value)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex flex-col gap-7">
    <div class="bg-white p-6 rounded-xl shadow w-full">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h5 class="text-base font-semibold text-gray-900">Mapping Kehadiran Karyawan</h5>
        <button
          @click="exportToExcel"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Excel
        </button>
      </div>

      <!-- Row 1: Server Filter -->
      <div class="flex flex-wrap items-end gap-4 w-full">
        <div class="flex flex-col">
          <label class="text-xs font-medium text-gray-500 mb-1">Tanggal Start</label>
          <input
            v-model="filter.tanggal_start"
            type="date"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
            :disabled="loading"
          />
        </div>
        <div class="flex flex-col">
          <label class="text-xs font-medium text-gray-500 mb-1">Tanggal End</label>
          <input
            v-model="filter.tanggal_end"
            type="date"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
            :disabled="loading"
          />
        </div>
        <div class="flex flex-col flex-1">
          <label class="text-xs font-medium text-gray-500 mb-1">ID Finger</label>
          <input
            v-model="filter.id_finger"
            type="text"
            placeholder="ID Finger..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
            :disabled="loading"
          />
        </div>
        <div class="flex flex-col self-end">
          <button
            @click="applyServerFilter"
            :disabled="loading"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            Terapkan Filter
          </button>
        </div>
      </div>

      <div class="border-t border-gray-100 my-4" />

      <!-- Row 2: Local Filter -->
      <div class="flex flex-wrap items-end gap-4 w-full">
        <div class="flex flex-col w-44">
          <label class="text-xs font-medium text-gray-500 mb-1">Status Kehadiran</label>
          <select
            v-model="localFilter.status"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Semua Status</option>
            <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>

        <div class="flex flex-col w-52">
          <label class="text-xs font-medium text-gray-500 mb-1">Departemen</label>
          <CustomSelectSearch
            v-model="localFilter.department"
            :items="departmentOptions"
            label=""
            placeholder="Semua Departemen"
            return-type="part_number"
          />
        </div>

        <div class="flex flex-col w-44">
          <label class="text-xs font-medium text-gray-500 mb-1">Shift</label>
          <select
            v-model="localFilter.shift"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Semua Shift</option>
            <option v-for="(s, i) in shiftOptions" :key="i" :value="s">{{ s }}</option>
          </select>
        </div>

        <div class="flex flex-col flex-1 min-w-[200px]">
          <label class="text-xs font-medium text-gray-500 mb-1">Pencarian</label>
          <input
            v-model="localFilter.search"
            type="text"
            placeholder="Nama, NIK, Jabatan..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            autocomplete="off"
          />
        </div>

        <button
          v-if="hasLocalFilter"
          @click="resetLocalFilter"
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors self-end"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reset Filter
        </button>
      </div>

      <!-- Stats Info -->
      <div v-if="allRaw.length > 0" class="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <span class="text-xs text-gray-500">
          Total Karyawan: <span class="font-semibold text-gray-700">{{ allGrouped.length }}</span>
        </span>
        <span v-if="totalFiltered !== allGrouped.length" class="text-xs text-blue-600">
          Hasil filter: <span class="font-semibold">{{ totalFiltered }}</span> karyawan
        </span>
      </div>
    </div>
</div>

    <div
      v-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
    >
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ error }}</span>
      <button
        @click="applyServerFilter"
        class="ml-auto text-sm font-medium text-red-800 hover:text-red-900 underline"
      >
        Coba lagi
      </button>
    </div>

    <!-- ── Main Card ──────────────────────────────────────────────────────── -->
    <div class="bg-white rounded-xl shadow overflow-hidden">

      <!-- Toolbar -->
      <div class="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between flex-wrap gap-3">

          <!-- View Toggle -->
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-gray-600">Tampilan:</span>
            <div class="inline-flex rounded-lg overflow-hidden border border-gray-300 text-sm">
              <button
                @click="currentView = 'grid'"
                :class="currentView === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
                class="px-3 py-1.5 flex items-center gap-1.5 font-medium transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Grid
              </button>
              <button
                @click="currentView = 'table'"
                :class="currentView === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
                class="px-3 py-1.5 flex items-center gap-1.5 font-medium transition-colors border-l border-gray-300"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Table
              </button>
            </div>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap gap-3">
            <div v-for="l in legends" :key="l.label" class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-sm" :class="l.bg" />
              <span class="text-xs text-gray-500">{{ l.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter badge aktif -->
      <div v-if="hasLocalFilter" class="px-6 py-3 bg-blue-50 border-b border-blue-100">
        <div class="flex items-center gap-2 text-sm text-blue-700">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter aktif:</span>
          <span v-if="localFilter.status"
            class="bg-white px-2 py-0.5 rounded-md text-xs border border-blue-100">
            Status: <span class="font-semibold">{{ localFilter.status }}</span>
          </span>
          <span v-if="localFilter.department"
            class="bg-white px-2 py-0.5 rounded-md text-xs border border-blue-100">
            Dept: <span class="font-semibold">{{ localFilter.department }}</span>
          </span>
          <span v-if="localFilter.shift"
            class="bg-white px-2 py-0.5 rounded-md text-xs border border-blue-100">
            Shift: <span class="font-semibold">{{ localFilter.shift }}</span>
          </span>
          <span v-if="localFilter.search"
            class="bg-white px-2 py-0.5 rounded-md text-xs border border-blue-100">
            Cari: <span class="font-semibold">"{{ localFilter.search }}"</span>
          </span>
        </div>
      </div>

      <!-- Section header -->
      <div class="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-blue-500" />
            <span class="text-sm font-semibold text-gray-900">Mapping Kehadiran</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Terjadwal</span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5">
            Menampilkan <span class="font-medium text-gray-700">{{ totalFiltered }}</span>
            dari <span class="font-medium text-gray-700">{{ allGrouped.length }}</span> karyawan
          </p>
        </div>
        <div class="text-xs text-gray-400 flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Urutan: {{ sort.field === 'jabatan' ? 'Jabatan (Hierarki)' : sort.field }}
          {{ sort.order === 'asc' ? '↑' : '↓' }}
        </div>
      </div>

      <!-- ── Loading skeleton ───────────────────────────────────────────── -->
      <template v-if="loading && allRaw.length === 0">
        <div class="p-4">
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            <div v-for="i in 12" :key="i" class="h-52 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </template>

      <!-- ── GRID VIEW ──────────────────────────────────────────────────── -->
      <div v-else-if="currentView === 'grid'" class="p-4">
        <div
          v-if="pagedGrouped.length"
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
        >
          <div
            v-for="emp in pagedGrouped"
            :key="emp.nik || emp.id_finger"
            class="relative group cursor-pointer"
            @click="openModal(emp)"
          >
            <div
              class="bg-white border-2 rounded-xl p-3 hover:shadow-md transition-all duration-200 group-hover:-translate-y-0.5"
              :class="getStatusConfig(emp.status_kehadiran).borderColor"
            >
              <!-- Status dot -->
              <div class="absolute top-2 right-2">
                <div class="w-2.5 h-2.5 rounded-full"
                  :class="[
                    getStatusConfig(emp.status_kehadiran).bgColor,
                    getStatusConfig(emp.status_kehadiran).hasPulse ? 'animate-pulse' : ''
                  ]" />
              </div>
              <!-- Jabatan badge -->
              <div class="absolute top-2 left-2">
                <span
                  v-if="jabatanRank(emp.jabatan) <= 6"
                  class="text-xs font-bold px-1 py-0.5 rounded bg-indigo-100 text-indigo-700"
                >{{ jabatanShort(emp.jabatan) }}</span>
              </div>

              <div class="flex flex-col items-center pt-2">
                <img
                  class="h-14 w-14 rounded-full border-2 mt-1"
                  :class="[getStatusConfig(emp.status_kehadiran).borderColor, getStatusConfig(emp.status_kehadiran).opacity]"
                  :src="avatarUrl(emp.nama, emp.id_finger)"
                  :alt="emp.nama"
                />
                <h4 class="mt-2 text-xs font-semibold text-gray-900 text-center line-clamp-2 leading-tight">
                  {{ emp.nama }}
                </h4>
                <p class="text-xs text-gray-400 mt-0.5">{{ emp.nik }}</p>
                <p class="text-xs text-gray-400 text-center leading-tight">{{ emp.departemen }}</p>
                <p class="text-xs text-gray-500 text-center font-medium leading-tight">{{ emp.jabatan }}</p>
                <p class="text-xs text-gray-400">{{ emp.shift || '-' }}</p>

                <div class="mt-2 w-full space-y-1">
                  <span
                    class="inline-flex w-full justify-center items-center px-1.5 py-0.5 rounded text-xs font-medium"
                    :class="getStatusConfig(emp.status_kehadiran).badgeClass"
                  >
                    {{ getStatusConfig(emp.status_kehadiran).text }}
                  </span>
                  <div class="flex justify-center gap-1 text-xs">
                    <span class="bg-green-100 text-green-700 px-1 py-0.5 rounded font-medium" title="Hadir">{{ emp._hadir }}H</span>
                    <span class="bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded font-medium" title="Terlambat">{{ emp._terlambat }}T</span>
                    <span class="bg-red-100 text-red-700 px-1 py-0.5 rounded font-medium" title="Henkaten">{{ emp._tidak_hadir }}X</span>
                  </div>
                  <p class="text-xs text-center text-gray-400">{{ emp._totalHari }} hari · {{ attendancePct(emp) }}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="py-16 text-center">
          <div class="flex flex-col items-center gap-2 text-gray-400">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p class="text-sm font-medium text-gray-500">Tidak ada karyawan yang sesuai filter</p>
          </div>
        </div>
      </div>

      <!-- ── TABLE VIEW ─────────────────────────────────────────────────── -->
      <div v-else class="overflow-x-auto">
        <table v-if="pagedGrouped.length" class="w-full text-sm text-gray-500">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left w-10">No</th>
              <th
                v-for="col in tableCols"
                :key="col.field"
                class="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                @click="handleSort(col.field)"
              >
                {{ col.label }}
                <span class="ml-1 text-gray-400">{{ sortIcon(col.field) }}</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="(emp, idx) in pagedGrouped"
              :key="emp.nik || emp.id_finger"
              class="hover:bg-blue-50 cursor-pointer transition-colors"
              :class="getStatusConfig(emp.status_kehadiran).rowClass"
              @click="openModal(emp)"
            >
              <td class="px-4 py-3 text-gray-400 text-xs">{{ startEntry + idx }}</td>
              <td class="px-4 py-3 font-mono text-xs font-medium text-gray-700">{{ emp.nik }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <img class="h-9 w-9 rounded-full flex-shrink-0 border border-gray-200"
                    :src="avatarUrl(emp.nama, emp.id_finger)" :alt="emp.nama" />
                  <div>
                    <div class="font-medium text-gray-900 text-sm">{{ emp.nama }}</div>
                    <div class="text-xs text-gray-400">ID: {{ emp.id_finger }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{{ emp.departemen }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <span v-if="jabatanRank(emp.jabatan) <= 6"
                    class="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {{ jabatanShort(emp.jabatan) }}
                  </span>
                  <span class="text-sm text-gray-700">{{ emp.jabatan }}</span>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                  {{ emp.shift || '-' }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex gap-1 flex-wrap">
                  <span class="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-xs font-medium">{{ emp._hadir }} H</span>
                  <span class="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full text-xs font-medium">{{ emp._terlambat }} T</span>
                  <span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-medium">{{ emp._tidak_hadir }} X</span>
                  <span v-if="emp._belum_absen > 0"
                    class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs font-medium">
                    {{ emp._belum_absen }} ?
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5">{{ emp._totalHari }} hari kerja</p>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="font-bold text-base" :class="pctColor(attendancePct(emp))">
                  {{ attendancePct(emp) }}%
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full"
                  :class="getStatusConfig(emp.status_kehadiran).badgeClass">
                  {{ getStatusConfig(emp.status_kehadiran).text }}
                </span>
                <p class="text-xs text-gray-400 mt-0.5">{{ emp.tanggal_terakhir }}</p>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="py-16 text-center">
          <p class="text-sm font-medium text-gray-500">Tidak ada data sesuai filter</p>
        </div>
      </div>

      <!-- ── Pagination ─────────────────────────────────────────────────── -->
      <div v-if="totalFiltered > 0" class="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="text-xs text-gray-500">
            Menampilkan <span class="font-semibold text-gray-700">{{ startEntry }}</span>–<span class="font-semibold text-gray-700">{{ endEntry }}</span>
            dari <span class="font-semibold text-gray-700">{{ totalFiltered }}</span> karyawan
          </div>

          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span>Tampilkan:</span>
            <select
              v-model="perPage"
              @change="changePerPage"
              class="border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option v-for="opt in itemsPerPageOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <span>per halaman</span>
          </div>

          <div class="flex items-center gap-1">
            <button @click="goToPage(1)" :disabled="currentPage === 1"
              class="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
              class="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <template v-for="p in visiblePages" :key="String(p)">
              <span v-if="p === '...'" class="px-2 text-gray-400">…</span>
              <button
                v-else
                @click="goToPage(p as number)"
                :class="p === currentPage
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'"
                class="min-w-[32px] h-8 px-2 flex items-center justify-center rounded-md text-sm transition-colors"
              >{{ p }}</button>
            </template>

            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
              class="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages"
              class="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal ─────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="modalEmp"
          class="fixed inset-0 z-50"
          style="background-color: rgba(0,0,0,0.5);"
        >
          <div
            class="modal-scroll fixed inset-0 overflow-y-auto"
            @click.self="closeModal"
          >
            <div
              class="flex min-h-full items-center justify-center p-4"
              @click.self="closeModal"
            >
              <div
                class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                @click.stop
              >
                <!-- Header -->
                <div class="px-6 py-5" style="background-color: #2563eb;">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <img
                        :src="avatarUrl(modalEmp.nama, modalEmp.id_finger, 56)"
                        class="h-14 w-14 rounded-full flex-shrink-0"
                        style="border: 2px solid rgba(255,255,255,0.5);"
                      />
                      <div>
                        <h3 class="text-lg font-bold leading-tight" style="color: #ffffff;">
                          {{ modalEmp.nama }}
                        </h3>
                        <p class="text-sm mt-0.5" style="color: rgba(255,255,255,0.8);">
                          NIK: {{ modalEmp.nik }} · ID Finger: {{ modalEmp.id_finger }}
                        </p>
                        <p class="text-xs mt-0.5" style="color: rgba(255,255,255,0.7);">
                          {{ modalEmp.departemen }} — {{ modalEmp.jabatan }}
                        </p>
                      </div>
                    </div>
                    <button
                      @click="closeModal"
                      class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                      style="color: rgba(255,255,255,0.8); background-color: transparent;"
                      @mouseenter="($event.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.2)'"
                      @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor = 'transparent'"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Stats -->
                <div class="px-6 py-4 border-b border-gray-200" style="background-color: #f9fafb;">
                  <p class="text-xs text-gray-400 mb-3">{{ modalPeriode }}</p>
                  <div class="grid grid-cols-5 gap-2">
                    <div
                      v-for="s in modalStatCards"
                      :key="s.label"
                      class="text-center rounded-xl p-3 border"
                      :class="[s.bg, s.border]"
                    >
                      <div class="text-2xl font-bold" :class="s.textColor">{{ s.value }}</div>
                      <div class="text-xs mt-1 font-medium" :class="s.sub">{{ s.label }}</div>
                    </div>
                  </div>
                  <div class="mt-4">
                    <div class="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Tingkat Kehadiran</span>
                      <span class="font-semibold" style="color: #2563eb;">{{ modalPct }}%</span>
                    </div>
                    <div class="w-full rounded-full overflow-hidden" style="background-color: #e5e7eb; height: 10px;">
                      <div
                        class="h-full rounded-full transition-all duration-700"
                        :style="{ width: modalPct + '%', backgroundColor: modalBarColor }"
                      />
                    </div>
                  </div>
                </div>

                <!-- Riwayat -->
                <div class="px-6 py-4" style="max-height: 288px; overflow-y: auto;">
                  <h4 class="text-sm font-semibold text-gray-700 mb-3">Riwayat Kehadiran</h4>
                  <table class="w-full text-sm">
                    <thead>
                      <tr style="background-color: #f9fafb;">
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Masuk</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keluar</th>
                        <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(r, i) in modalRecords"
                        :key="i"
                        :style="{ backgroundColor: i % 2 === 1 ? '#f9fafb' : '#ffffff' }"
                      >
                        <td class="px-3 py-2 text-xs font-medium text-gray-800">{{ r.tanggal || '-' }}</td>
                        <td class="px-3 py-2">
                          <span class="px-1.5 py-0.5 rounded text-xs" style="background-color: #f3f4f6; color: #4b5563;">
                            {{ r.shift || '-' }}
                          </span>
                        </td>
                        <td
                          class="px-3 py-2 text-xs"
                          :style="{
                            color: r.status_kehadiran === 'terlambat' ? '#dc2626' : '#374151',
                            fontWeight: r.status_kehadiran === 'terlambat' ? '600' : '400'
                          }"
                        >
                          {{ r.jam_masuk_actual || '-' }}
                        </td>
                        <td class="px-3 py-2 text-xs text-gray-700">{{ r.jam_keluar_actual || '-' }}</td>
                        <td class="px-3 py-2 text-center">
                          <span
                            class="px-2 py-0.5 rounded-full text-xs font-medium"
                            :class="getStatusConfig(r.status_kehadiran).badgeClass"
                          >
                            {{ getStatusConfig(r.status_kehadiran).text }}
                          </span>
                        </td>
                      </tr>
                      <tr v-if="modalRecords.length === 0">
                        <td colspan="5" class="px-3 py-8 text-center text-sm text-gray-400">
                          Tidak ada riwayat kehadiran
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Footer -->
                <div class="px-6 py-3 flex justify-end border-t border-gray-200" style="background-color: #f9fafb;">
                  <button
                    @click="closeModal"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

</template>

<style scoped>
.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to     { opacity: 0; }

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>