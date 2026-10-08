<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'
import CustomSelectSearch from '@/components/CustomSelectSearch.vue'
import { useAttendanceStore } from '@/stores/HRD/AttendanceStore'
import type { UnmappedRecord } from '@/services/HRD/AttendanceService'

// ─── Page & Breadcrumb ────────────────────────────────────────────────────────
const page        = ref({ title: 'Absensi Tidak Terpetakan' })
const breadcrumbs = ref([
  { title: 'HRD', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'Unmapped', disabled: true, href: '#' },
])

// ─── Store ────────────────────────────────────────────────────────────────────
const store       = useAttendanceStore()
const loading     = computed(() => store.loading)
const error       = computed(() => store.error)
const allUnmapped = computed<UnmappedRecord[]>(() => store.dataUnmapped ?? [])

// ─── State ────────────────────────────────────────────────────────────────────
const currentPage = ref(1)
const perPage     = ref(30)

const filter = ref({
  tanggal_start: todayISO(),
  tanggal_end:   todayISO(),
  id_finger:     '',
})

const localSearch = ref('')
const localDept   = ref('')
const sort        = ref({ field: 'jabatan', order: 'asc' as 'asc' | 'desc' })

const itemsPerPageOptions = [10, 20, 30, 50, 100]

// ─── Jabatan Priority ─────────────────────────────────────────────────────────
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
  'STAFF':                                7,
  'FOREMAN':                              8,
  'PJS FOREMAN':                          8,
  'PELAKSANA':                            9,
  'OPERATOR':                            10,
  'KMI SUPERVISOR':                      10,
  'PKL':                                 11,
}

const JABATAN_SHORT: Record<string, string> = {
  'DEPUTY EXECUTIVE OFFICER COMMERCIAL':  'DEO',
  'DEPUTY EXECUTIVE OFFICER MANUFACTURE': 'DEO',
  'DIVISION HEAD':                        'DVH',
  'DEPUTY DIVISION HEAD':                 'DDVH',
  'DEPT. HEAD':                           'DH',
  'DEPUTY DEPT. HEAD':                    'DDH',
  'ASSISTANT DEPT. HEAD':                 'ADH',
  'SECTION HEAD':                         'SH',
  'PJS SECTION HEAD':                     'PJS SH',
}

function jabatanRank (j: string | null | undefined) { return JABATAN_PRIORITY[j?.trim() ?? ''] ?? 999 }
function jabatanShort(j: string | null | undefined) { return JABATAN_SHORT[j?.trim() ?? ''] ?? '' }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().slice(0, 10) }

function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < String(str || '').length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i); h = h & h
  }
  return Math.abs(h).toString(16).padStart(6, '0')
}

function avatarUrl(nama: string, finger: string, size = 36) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nama || '?')}&background=${hashColor(finger || '')}&color=fff&size=${size}`
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
function sortList(list: UnmappedRecord[]): UnmappedRecord[] {
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
    let vA: any = (a as any)[field] ?? '', vB: any = (b as any)[field] ?? ''
    if (field === 'nik') { vA = parseInt(vA) || 0; vB = parseInt(vB) || 0 }
    else { vA = String(vA).toLowerCase(); vB = String(vB).toLowerCase() }
    const cmp = vA > vB ? 1 : vA < vB ? -1 : 0
    return order === 'desc' ? -cmp : cmp
  })
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const departmentOptions = computed(() =>
  [...new Set(allUnmapped.value.map(e => e.departemen).filter(Boolean))].sort().map(v => ({
    part_number: v, job_number: v, customer: v,
  }))
)

const filtered = computed(() => {
  const term = localSearch.value.toLowerCase().trim()
  let list = allUnmapped.value
  if (localDept.value)  list = list.filter(e => e.departemen === localDept.value)
  if (term) list = list.filter(e =>
    ['nama', 'nik', 'id_finger', 'departemen', 'jabatan']
      .some(k => String((e as any)[k] || '').toLowerCase().includes(term))
  )
  return sortList(list)
})

const totalFiltered = computed(() => filtered.value.length)
const totalPages    = computed(() => Math.ceil(totalFiltered.value / perPage.value))
const paged         = computed(() =>
  filtered.value.slice((currentPage.value - 1) * perPage.value, currentPage.value * perPage.value)
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

const hasLocalFilter = computed(() => !!(localSearch.value || localDept.value))

// ─── Table Columns ────────────────────────────────────────────────────────────
const tableCols = [
  { field: 'tanggal',           label: 'Tanggal'    },
  { field: 'id_finger',         label: 'ID Finger'  },
  { field: 'nama',              label: 'Nama'       },
  { field: 'nik',               label: 'NIK'        },
  { field: 'departemen',        label: 'Departemen' },
  { field: 'jabatan',           label: 'Jabatan'    },
  { field: 'jam_masuk_actual',  label: 'Jam Masuk'  },
  { field: 'jam_keluar_actual', label: 'Jam Keluar' },
  { field: 'keterangan',        label: 'Keterangan' },
]

function handleSort(field: string) {
  if (sort.value.field === field) sort.value.order = sort.value.order === 'asc' ? 'desc' : 'asc'
  else { sort.value.field = field; sort.value.order = 'asc' }
}

function sortIcon(field: string) {
  if (sort.value.field !== field) return '↕'
  return sort.value.order === 'asc' ? '↑' : '↓'
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function applyServerFilter() {
  currentPage.value = 1
  await store.fetchDataMapping(filter.value)
}

function resetLocalFilter() {
  localSearch.value = ''
  localDept.value   = ''
  currentPage.value = 1
}

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p
}

function changePerPage() { currentPage.value = 1 }

function loadData() { store.fetchDataMapping(filter.value) }

// ─── Watchers + Lifecycle ─────────────────────────────────────────────────────
watch([localSearch, localDept], () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })

onMounted(() => loadData())
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex flex-col gap-7">

    <!-- ── Filter Panel ───────────────────────────────────────────────────── -->
    <div class="bg-white p-6 rounded-xl shadow w-full">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h5 class="text-base font-semibold text-gray-900">Absensi Tidak Terpetakan</h5>
          <span
            v-if="!loading && allUnmapped.length > 0"
            class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"
          >
            {{ allUnmapped.length }} data
          </span>
        </div>
      </div>

      <!-- Info Banner -->
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-4">
        <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-amber-800">Karyawan Absen Tanpa Jadwal Shift</p>
          <p class="text-xs text-amber-700 mt-0.5">
            Data ini menampilkan karyawan yang melakukan absensi namun
            <strong>tidak memiliki jadwal shift</strong> terdaftar di sistem untuk periode tersebut.
          </p>
        </div>
      </div>

      <!-- Row 1: Server filter -->
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex flex-col">
          <label class="text-xs font-medium text-gray-500 mb-1">Tanggal Start</label>
          <input
            v-model="filter.tanggal_start"
            type="date"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-amber-400 focus:border-amber-400 outline-none disabled:bg-gray-50"
            :disabled="loading"
          />
        </div>
        <div class="flex flex-col">
          <label class="text-xs font-medium text-gray-500 mb-1">Tanggal End</label>
          <input
            v-model="filter.tanggal_end"
            type="date"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-amber-400 focus:border-amber-400 outline-none disabled:bg-gray-50"
            :disabled="loading"
          />
        </div>
        <div class="flex flex-col">
          <label class="text-xs font-medium text-gray-500 mb-1">ID Finger</label>
          <input
            v-model="filter.id_finger"
            type="text"
            placeholder="ID Finger..."
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-amber-400 focus:border-amber-400 outline-none disabled:bg-gray-50"
            :disabled="loading"
          />
        </div>
        <button
          @click="applyServerFilter"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          Terapkan Filter
        </button>
      </div>

      <div class="border-t border-gray-100 my-4" />

      <!-- Row 2: Local filter -->
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex flex-col flex-1 min-w-48">
          <label class="text-xs font-medium text-gray-500 mb-1">Pencarian</label>
          <input
            v-model="localSearch"
            type="text"
            placeholder="Nama, NIK, ID Finger, Jabatan..."
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-amber-400 focus:border-amber-400 outline-none"
            autocomplete="off"
          />
        </div>

        <div class="flex flex-col w-176">
          <label class="text-xs font-medium text-gray-500 mb-1">Departemen</label>
          <CustomSelectSearch
            v-model="localDept"
            :items="departmentOptions"
            label="Department"
            placeholder="Semua Departemen"
            return-type="part_number"
          />
        </div>

        <button
          v-if="hasLocalFilter"
          @click="resetLocalFilter"
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reset Filter
        </button>
      </div>

      <!-- Stats info -->
      <div v-if="allUnmapped.length > 0" class="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <span class="text-xs text-gray-500">
          Total Data: <span class="font-semibold text-gray-700">{{ allUnmapped.length }}</span>
        </span>
        <span v-if="totalFiltered !== allUnmapped.length" class="text-xs text-amber-600">
          Hasil filter: <span class="font-semibold">{{ totalFiltered }}</span> data
        </span>
      </div>
    </div>

    <!-- ── Error ──────────────────────────────────────────────────────────── -->
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
        @click="loadData"
        class="ml-auto text-sm font-medium text-red-800 hover:text-red-900 underline"
      >
        Coba lagi
      </button>
    </div>

    <!-- ── Empty: semua terpetakan ────────────────────────────────────────── -->
    <div
      v-else-if="!loading && allUnmapped.length === 0"
      class="bg-white rounded-xl shadow p-12 text-center"
    >
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-gray-900">Semua Absensi Sudah Terpetakan!</h3>
      <p class="text-sm text-gray-500 mt-1">Tidak ada data absensi yang unmapped untuk periode ini.</p>
    </div>

    <!-- ── Main Table Card ────────────────────────────────────────────────── -->
    <div v-else class="bg-white rounded-xl shadow overflow-hidden">

      <!-- Filter badge aktif -->
      <div v-if="hasLocalFilter" class="px-6 py-3 bg-amber-50 border-b border-amber-100">
        <div class="flex items-center gap-2 text-sm text-amber-700">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter aktif:</span>
          <span v-if="localDept"
            class="bg-white px-2 py-0.5 rounded-md text-xs border border-amber-100">
            Dept: <span class="font-semibold">{{ localDept }}</span>
          </span>
          <span v-if="localSearch"
            class="bg-white px-2 py-0.5 rounded-md text-xs border border-amber-100">
            Cari: <span class="font-semibold">"{{ localSearch }}"</span>
          </span>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-gray-500">
          <thead class="text-xs text-amber-700 uppercase bg-amber-50 border-b border-amber-200">
            <tr>
              <th class="px-4 py-3 text-left w-10">No</th>
              <th
                v-for="col in tableCols"
                :key="col.field"
                class="px-4 py-3 text-left cursor-pointer hover:bg-amber-100 select-none whitespace-nowrap transition-colors"
                @click="handleSort(col.field)"
              >
                {{ col.label }}
                <span class="ml-1 text-amber-400">{{ sortIcon(col.field) }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading skeleton -->
            <template v-if="loading">
              <tr v-for="i in perPage" :key="i" class="border-b border-gray-100">
                <td v-for="col in tableCols.length + 1" :key="col" class="px-4 py-3">
                  <div
                    class="h-4 bg-gray-200 rounded animate-pulse mx-auto"
                    :class="col === 1 ? 'w-8' : 'w-3/4'"
                  />
                </td>
              </tr>
            </template>

            <template v-else-if="paged.length > 0">
              <tr
                v-for="(emp, idx) in paged"
                :key="`${emp.id_finger}-${emp.tanggal}-${idx}`"
                class="border-b border-gray-100 hover:bg-amber-50 transition-colors"
              >
                <td class="px-4 py-3 text-gray-400 text-xs">
                  {{ startEntry + idx }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-800">
                  {{ emp.tanggal || '-' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span class="font-mono text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                    {{ emp.id_finger || '-' }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="flex items-center gap-2.5">
                    <img
                      class="h-8 w-8 rounded-full flex-shrink-0 border border-amber-200"
                      :src="avatarUrl(emp.nama, emp.id_finger)"
                      :alt="emp.nama"
                    />
                    <span class="font-medium text-gray-900 text-sm">{{ emp.nama || 'No Name' }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600">
                  {{ emp.nik || 'N/A' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {{ emp.departemen || '-' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <span
                      v-if="jabatanRank(emp.jabatan) <= 6"
                      class="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700"
                    >{{ jabatanShort(emp.jabatan) }}</span>
                    <span class="text-sm text-gray-700">{{ emp.jabatan || '-' }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ emp.jam_masuk_actual || '-' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {{ emp.jam_keluar_actual || '-' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span class="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                    Tidak Ada Jadwal
                  </span>
                </td>
              </tr>
            </template>

            <tr v-else>
              <td :colspan="tableCols.length + 1" class="py-16 text-center">
                <div class="flex flex-col items-center gap-2 text-gray-400">
                  <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p class="text-sm font-medium text-gray-500">Tidak ada data sesuai filter</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Pagination ─────────────────────────────────────────────────── -->
      <div v-if="totalFiltered > 0" class="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="text-xs text-gray-500">
            Menampilkan
            <span class="font-semibold text-gray-700">{{ startEntry }}</span>–<span class="font-semibold text-gray-700">{{ endEntry }}</span>
            dari <span class="font-semibold text-gray-700">{{ totalFiltered }}</span> data
          </div>

          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span>Tampilkan:</span>
            <select
              v-model="perPage"
              @change="changePerPage"
              class="border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-amber-400 focus:border-amber-400 outline-none"
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
                  ? 'bg-amber-500 text-white font-medium'
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

  </div>
</template>