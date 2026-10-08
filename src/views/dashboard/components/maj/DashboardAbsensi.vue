<template>
  <div class="p-5 bg-slate-50 min-h-screen font-sans">

    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h5 class="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Kehadiran Karyawan</h5>
        <p class="text-sm font-bold text-slate-600 mt-1 flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span :class="activeShiftLabel.class" class="px-2 py-0.5 rounded-full">{{ activeShiftLabel.text }}</span>
          <span class="text-slate-400 font-normal">—</span>
          <span>{{ dayToday }}, {{ dateToday }}</span>
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="bg-white border border-slate-200 px-4 py-1.5 rounded-xl shadow-sm flex items-center gap-3">
          <span class="text-[11px] text-slate-400 font-medium uppercase">Total Karyawan</span>
          <span class="text-xl font-black text-blue-600 font-mono">{{ filteredStats.total }}</span>
        </div>
        <button
          @click="loadData"
          :disabled="loading"
          class="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 transition-all shadow-sm active:scale-95"
        >
          <svg class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>
    </div>

    <div class="mb-5 flex flex-wrap gap-2 items-center">
      <span class="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Filter Shift:</span>
      <button
        v-for="shift in availableShifts"
        :key="shift"
        @click="selectedShift = shift"
        :class="[
          'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm',
          selectedShift === shift
            ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
        ]"
      >
        {{ shift === 'ALL' ? 'Semua Shift' : shift }}
      </button>
      <span class="ml-auto text-[11px] text-slate-400 font-medium">
        Menampilkan <span class="font-bold text-slate-700">{{ filteredDepartmentData.length }}</span> departemen
      </span>
    </div>

    <div v-if="loading" class="grid grid-cols-3 gap-6 mb-6">
      <div v-for="i in 3" :key="i" class="bg-white h-[320px] rounded-2xl border border-slate-200/60 animate-pulse"></div>
    </div>

    <div v-else class="space-y-6">

      <div
        class="grid gap-4"
        :style="{ gridTemplateColumns: `repeat(${visibleCards.length}, minmax(0, 1fr))` }"
      >
        <div
          v-for="(card, i) in visibleCards"
          :key="i"
          class="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm flex items-center justify-between"
        >
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ card.title }}</span>
            <h3 class="text-4xl font-bold mt-1 tracking-tight" :class="card.valueClass">{{ card.value }}</h3>
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-sm" :class="card.iconBg">
              <svg class="w-5 h-5" :class="card.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="card.iconPath" />
              </svg>
            </div>
            <p class="text-[10px] text-slate-400 mt-0.5 text-center">{{ dateToday }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div
          v-for="(dept, index) in filteredDepartmentData"
          :key="dept.nama"
          class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col h-[300px]"
        >
          <div class="flex items-center justify-between mb-2">
            <h5 class="text-sm font-bold text-slate-800 tracking-wide uppercase truncate max-w-[140px] sm:max-w-[180px]" :title="dept.nama">
              {{ dept.nama }}
            </h5>
            
            <div class="flex gap-1 flex-shrink-0">
              <button
                @click="openModal(dept, 'bar')"
                title="Detail Bagian"
                class="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all border border-slate-100"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              <button
                @click="openModal(dept, 'list')"
                title="Daftar Karyawan"
                class="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all border border-slate-100"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] font-bold items-center mb-1.5 opacity-90">
            <span class="flex items-center gap-1 text-emerald-500">
              <span class="w-2 h-2 rounded-full bg-emerald-300"></span>H: {{ dept.tepatWaktu }}
            </span>
            <span class="flex items-center gap-1 text-amber-500">
              <span class="w-2 h-2 rounded-full bg-amber-200"></span>T: {{ dept.terlambat }}
            </span>
            <span class="flex items-center gap-1 text-rose-400">
              <span class="w-2 h-2 rounded-full bg-rose-200"></span>A: {{ dept.tidakMasuk }}
            </span>
            <span v-if="dept.shift2 > 0" class="flex items-center gap-1 text-indigo-400">
              <span class="w-2 h-2 rounded-full bg-indigo-200"></span>M: {{ dept.shift2 }}
            </span>
          </div>

          <div :ref="el => setDonutRef(el, index)" class="w-full mt-auto" style="height: 210px;"></div>
        </div>
      </div>

      <div v-if="stats.shifts && stats.shifts.length" class="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
        <h6 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span></span> Kehadiran Berdasarkan Shift Hari Ini
        </h6>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead>
              <tr class="bg-slate-50/80 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th class="px-4 py-3 text-left font-bold">Shift Kerja</th>
                <th class="px-4 py-3 text-left font-bold">Jadwal Jam</th>
                <th class="px-4 py-3 text-center font-bold">Total</th>
                <th class="px-4 py-3 text-center font-bold text-emerald-600">Hadir</th>
                <th class="px-4 py-3 text-center font-bold text-amber-500">Terlambat</th>
                <th class="px-4 py-3 text-center font-bold text-rose-500">Henkaten</th>
                <th class="px-4 py-3 text-center font-bold text-slate-400">Belum Absen</th>
                <th class="px-4 py-3 text-center font-bold">% Hadir</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="shift in stats.shifts" :key="shift.nama" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-4 py-2.5 font-semibold text-slate-800">{{ shift.nama }}</td>
                <td class="px-4 py-2.5 text-slate-500 font-mono text-[11px]">{{ shift.jam_masuk }} – {{ shift.jam_keluar }}</td>
                <td class="px-4 py-2.5 text-center font-bold text-slate-700">{{ shift.total }}</td>
                <td class="px-4 py-2.5 text-center font-medium text-emerald-600">{{ shift.hadir }}</td>
                <td class="px-4 py-2.5 text-center font-medium text-amber-600">{{ shift.terlambat }}</td>
                <td class="px-4 py-2.5 text-center font-medium text-rose-600">{{ shift.tidak_hadir }}</td>
                <td class="px-4 py-2.5 text-center text-slate-400">{{ shift.belum_absen }}</td>
                <td class="px-4 py-2.5 text-center font-bold" :class="shiftPctColor(shift)">{{ shiftPct(shift) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <Teleport to="body">
      <div
        v-if="modalDept"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
        @click.self="closeModal"
      >
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-full md:max-w-2xl lg:max-w-3xl h-auto max-h-[85vh] flex flex-col overflow-hidden transition-all duration-300">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 gap-3 flex-shrink-0">
            <div class="min-w-0 flex-1">
              <h3 class="text-sm sm:text-base font-bold text-slate-800 truncate">{{ modalDept.nama }}</h3>
              <div class="flex flex-wrap items-center gap-2 mt-0.5">
                <p class="text-xs text-slate-400">
                  {{ modalView === 'bar' ? 'Detail per Bagian' : 'Detail Karyawan' }} — {{ dateToday }}
                </p>
                <span v-if="modalStatusLabel" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                  Filter: {{ modalStatusLabel }}
                </span>
              </div>
            </div>
            <div class="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
              <div class="flex items-center gap-1.5">
                <button
                  @click="modalView = 'bar'"
                  :class="['px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all', modalView === 'bar' ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200']"
                >Bagian</button>
                <button
                  @click="modalView = 'list'"
                  :class="['px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all', modalView === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100']"
                >Karyawan</button>
              </div>
              <button @click="closeModal" class="ml-2 text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none hidden sm:block">&times;</button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">

            <div v-if="modalView === 'bar'" class="w-full overflow-x-auto">
              <div ref="modalBarRef" class="w-full min-w-[500px] md:min-w-0"></div>
            </div>

            <div v-if="modalView === 'list'">
              <div class="mb-3 max-w-xs">
                <input
                  v-model="modalSearch"
                  type="text"
                  placeholder="Cari nama, NIK, atau bagian..."
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                />
              </div>
              
              <div class="overflow-auto border border-slate-100 rounded-xl max-h-[56vh]">
                <table class="min-w-full text-[11px] border-collapse">
                  <thead class="bg-slate-50 text-slate-500 uppercase font-bold sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                    <tr>
                      <th class="px-3 py-2.5 text-left">No</th>
                      <th @click="handleModalSort('nama')" class="px-3 py-2.5 text-left cursor-pointer select-none hover:bg-slate-100">
                        Karyawan{{ modalSortIcon('nama') }}
                      </th>
                      <th @click="handleModalSort('bagian')" class="px-3 py-2.5 text-left cursor-pointer select-none hover:bg-slate-100">
                        Bagian{{ modalSortIcon('bagian') }}
                      </th>
                      <th @click="handleModalSort('jadwal')" class="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-slate-100">
                        Jadwal{{ modalSortIcon('jadwal') }}
                      </th>
                      <th @click="handleModalSort('status')" class="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-slate-100">
                        Status{{ modalSortIcon('status') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    <tr v-for="(emp, idx) in filteredModalEmployees" :key="emp.id" class="hover:bg-slate-50">
                      <td class="px-3 py-2 text-slate-400 font-mono">{{ idx + 1 }}</td>
                      <td class="px-3 py-2">
                        <div class="font-bold text-slate-800">{{ emp.nama }}</div>
                        <div class="text-[9px] text-slate-400 font-mono">{{ emp.nik }}</div>
                      </td>
                      <td class="px-3 py-2 text-slate-500 truncate max-w-[140px] sm:max-w-[200px]">{{ emp.bagian }}</td>
                      <td class="px-3 py-2 text-center font-mono text-slate-400">{{ emp.jadwal }}</td>
                      <td class="px-3 py-2 text-center">
                        <span v-if="emp.status === 'TEPAT'" class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">{{ emp.jam_absen }}</span>
                        <span v-else-if="emp.status === 'TERLAMBAT'" class="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 font-bold">{{ emp.jam_absen }} ⚠️</span>
                        <span 
                          v-else-if="emp.status === 'SHIFT_2' || emp.status === 'BELUM_WAKTUNYA'" 
                          class="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 font-bold"
                        >
                          {{ emp.shift || 'Shift 2' }}
                        </span>
                        <span v-else class="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-bold">Absent</span>
                      </td>
                    </tr>
                    <tr v-if="filteredModalEmployees.length === 0">
                      <td colspan="5" class="text-center py-8 text-slate-400 italic">Tidak ada data.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <div class="p-3 border-t border-slate-100 bg-slate-50 flex justify-end flex-shrink-0">
            <button @click="closeModal" class="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 shadow-sm transition-colors">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onBeforeUpdate } from 'vue'
import { useAttendanceStore } from '@/stores/HRD/AttendanceStore'
import Highcharts from 'highcharts'

// ============================================================
// TYPE DEFINITIONS / INTERFACES
// ============================================================
interface Employee {
  id: string | number;
  nik: string;
  nama: string;
  bagian: string;
  status: string;
  shift: string;
  jam_absen: string;
  jadwal: string;
}

interface SectionData {
  namaBagian: string;
  total: number;
  tepatWaktu: number;
  terlambat: number;
  shift2: number;
  tidakMasuk: number;
  pctTepatWaktu: number;
  pctTerlambat: number;
  pctShift2: number;
  pctTidakMasuk: number;
}

interface DepartmentData {
  nama: string;
  total: number;
  tepatWaktu: number;
  terlambat: number;
  shift2: number;
  tidakMasuk: number;
  employees: Employee[];
  sections: SectionData[];
}

interface DashboardCard {
  title: string;
  alwaysShow: boolean;
  value: number;
  valueClass: string;
  iconBg: string;     
  iconColor: string;  
  iconPath: string;   
}

// ============================================================
// STORE & BASE STATE
// ============================================================
const store = useAttendanceStore()
const loading = computed(() => store.loading)
const error = computed(() => store.error)
const stats = computed(() => store.stats)

const donutRefs = ref<HTMLElement[]>([])
const modalBarRef = ref<HTMLElement | null>(null)

const modalDept = ref<DepartmentData | null>(null) 
const modalView = ref<'bar' | 'list'>('bar')
const modalSearch = ref('')
const modalStatusFilter = ref<string | null | 'ALL'>('ALL')
const modalStatusLabel = ref('')
const modalSortKey = ref<string>('status')
const modalSortOrder = ref<'asc' | 'desc'>('asc')

onBeforeUpdate(() => { donutRefs.value = [] })
const setDonutRef = (el: any, index: number) => { if (el) donutRefs.value[index] = el }

const dateToday = ref(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))
const dayToday = ref(new Date().toLocaleDateString('id-ID', { weekday: 'long' }))

// ============================================================
// FILTER SHIFT — STATE & COMPUTED
// ============================================================
const selectedShift = ref<string>('ALL')

const availableShifts = computed<string[]>(() => {
  const mappedRecords = store.dataMapping || []
  const today = new Date().toISOString().slice(0, 10)
  const shifts = new Set<string>()

  mappedRecords.forEach((emp: any) => {
    if (emp.tanggal !== today) return
    if (emp.shift) shifts.add(emp.shift.trim().toUpperCase())
  })

  return ['ALL', ...Array.from(shifts).sort()]
})

const activeShiftLabel = computed(() => {
  if (selectedShift.value === 'ALL') {
    return { text: 'Semua Shift', class: 'bg-slate-100 text-slate-700' }
  }
  const s = selectedShift.value.toLowerCase()
  if (s.includes('shift 1')) return { text: `🟢 ${selectedShift.value}`, class: 'bg-emerald-100 text-emerald-700' }
  if (s.includes('shift 2')) return { text: `🟣 ${selectedShift.value}`, class: 'bg-indigo-100 text-indigo-700' }
  return { text: `🔵 ${selectedShift.value}`, class: 'bg-blue-100 text-blue-700' }
})

const visibleCards = computed<DashboardCard[]>(() => 
  kpiCards.value.filter(card => card.alwaysShow || card.value > 0)
)

// ============================================================
// AGREGASI UTAMA — FILTER BERDASARKAN SHIFT DIPILIH
// ============================================================
const checkIsLate = (scheduleIn: string | null, actualIn: string | null): boolean => {
  if (!scheduleIn || !actualIn) return false
  const actualTime = actualIn.includes(' ') ? actualIn.split(' ')[1] : actualIn
  const scheduleTime = scheduleIn.includes(' ') ? scheduleIn.split(' ')[1] : scheduleIn
  const baseDate = '1970-01-01T'
  return new Date(`${baseDate}${actualTime}`).getTime() > new Date(`${baseDate}${scheduleTime}`).getTime() + 6 * 60 * 1000
}

const buildDepartmentData = (shiftFilter: string): DepartmentData[] => {
  const mappedRecords = store.dataMapping || []
  const today = new Date().toISOString().slice(0, 10)
  const nowTimeStr = new Date().toTimeString().split(' ')[0]

  const dataTree: Record<string, any> = {}

  mappedRecords.forEach((emp: any) => {
    if (emp.tanggal !== today) return

    if (shiftFilter !== 'ALL') {
      const shiftVal = emp.shift ? emp.shift.trim().toUpperCase() : ''
      if (shiftVal !== shiftFilter) return
    }

    const dept = emp.departemen ? emp.departemen.trim().toUpperCase() : 'LAINNYA'
    if (dept === 'LAINNYA') return
    const section = emp.bagian ? emp.bagian.trim().toUpperCase() : 'BELUM ADA BAGIAN'
    const schedIn = emp.jam_masuk_schedule
    const actIn = emp.jam_masuk_actual
    const statusKehadiranBase = emp.status_kehadiran

    if (!dataTree[dept]) {
      dataTree[dept] = { nama: dept, total: 0, tepatWaktu: 0, terlambat: 0, shift2: 0, tidakMasuk: 0, employees: [], sections: {} }
    }
    if (!dataTree[dept].sections[section]) {
      dataTree[dept].sections[section] = { total: 0, tepatWaktu: 0, terlambat: 0, shift2: 0, tidakMasuk: 0 }
    }

    dataTree[dept].total++
    dataTree[dept].sections[section].total++

    let empStatus = 'BELUM_ABSEN'
    let formattedJamAbsen = '—'

    if (actIn) {
      formattedJamAbsen = actIn.includes(' ') ? actIn.split(' ')[1].slice(0, 5) : actIn.slice(0, 5)
      if (checkIsLate(schedIn, actIn)) {
        dataTree[dept].terlambat++
        dataTree[dept].sections[section].terlambat++
        empStatus = 'TERLAMBAT'
      } else {
        dataTree[dept].tepatWaktu++
        dataTree[dept].sections[section].tepatWaktu++
        empStatus = 'TEPAT'
      }
    } else {
      const scheduleTimeStr = schedIn && schedIn.includes(' ')
        ? schedIn.split(' ')[1]
        : (schedIn || '')

      const jamMasukBelumTiba = scheduleTimeStr && nowTimeStr < scheduleTimeStr

      if (jamMasukBelumTiba) {
        const shiftLabel = emp.shift ? emp.shift.trim().toUpperCase() : 'SHIFT_2'
        
        dataTree[dept].shift2++
        dataTree[dept].sections[section].shift2++
        empStatus = 'BELUM_WAKTUNYA' 
        
        formattedJamAbsen = `Belum Absen (${shiftLabel})`
      } else if (statusKehadiranBase === 'lembur') {
        // ... existing lembur logic
      } else {
        dataTree[dept].tidakMasuk++
        dataTree[dept].sections[section].tidakMasuk++
      }
    }

    dataTree[dept].employees.push({
      id: emp.id_finger,
      nik: emp.nik,
      nama: emp.nama,
      bagian: section,
      status: empStatus,
      shift: emp.shift ? emp.shift.trim() : '-',  
      jam_absen: formattedJamAbsen,
      jadwal: schedIn && emp.jam_keluar_schedule
        ? `${schedIn.slice(0, 5)} - ${emp.jam_keluar_schedule.slice(0, 5)}`
        : schedIn
          ? schedIn.slice(0, 5)
          : 'Libur'
    })
  })

  return Object.keys(dataTree).map(deptKey => {
    const d = dataTree[deptKey]
    const sortedEmployees = [...d.employees].sort((a, b) => {
      const order: Record<string, number> = { 'TERLAMBAT': 1, 'BELUM_WAKTUNYA': 2, 'TEPAT': 3, 'BELUM_ABSEN': 4 }
      return (order[a.status] || 99) - (order[b.status] || 99)
    })
    const formattedSections = Object.keys(d.sections).map(secKey => {
      const s = d.sections[secKey]
      return {
        namaBagian: secKey,
        total: s.total,
        tepatWaktu: s.tepatWaktu,
        terlambat: s.terlambat,
        shift2: s.shift2,
        tidakMasuk: s.tidakMasuk,
        pctTepatWaktu: s.total > 0 ? parseFloat(((s.tepatWaktu / s.total) * 100).toFixed(1)) : 0,
        pctTerlambat: s.total > 0 ? parseFloat(((s.terlambat / s.total) * 100).toFixed(1)) : 0,
        pctShift2: s.total > 0 ? parseFloat(((s.shift2 / s.total) * 100).toFixed(1)) : 0,
        pctTidakMasuk: s.total > 0 ? parseFloat(((s.tidakMasuk / s.total) * 100).toFixed(1)) : 0,
      }
    }).sort((a, b) => b.total - a.total)

    return {
      nama: d.nama,
      total: d.total,
      tepatWaktu: d.tepatWaktu,
      terlambat: d.terlambat,
      shift2: d.shift2,
      tidakMasuk: d.tidakMasuk,
      employees: sortedEmployees,
      sections: formattedSections
    }
  }).sort((a, b) => b.total - a.total)
}

const filteredDepartmentData = computed<DepartmentData[]>(() => buildDepartmentData(selectedShift.value))

// ============================================================
// KPI CARDS — IKUT FILTER SHIFT
// ============================================================
const filteredStats = computed(() => {
  const data = filteredDepartmentData.value
  return {
    total: data.reduce((s, d) => s + d.total, 0),
    hadir: data.reduce((s, d) => s + d.tepatWaktu, 0),
    terlambat: data.reduce((s, d) => s + d.terlambat, 0),
    tidak_hadir: data.reduce((s, d) => s + d.tidakMasuk, 0),
    belum_absen: data.reduce((s, d) => s + d.shift2, 0),
  }
})

const pctOf = (val: number) => {
  const t = filteredStats.value.total
  return t > 0 ? ((val / t) * 100).toFixed(1) : '0.0'
}

const kpiCards = computed<DashboardCard[]>(() => [
  {
    title: 'Hadir',
    alwaysShow: true,
    value: filteredStats.value.hadir,
    valueClass: 'text-green-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    title: 'Terlambat',
    alwaysShow: true,
    value: filteredStats.value.terlambat,
    valueClass: 'text-yellow-500',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    title: 'Tidak Hadir (Henkaten)',
    alwaysShow: true,
    value: filteredStats.value.tidak_hadir,
    valueClass: 'text-red-500',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    iconPath: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
  },
  {
    title: 'Shift 2',
    alwaysShow: false,
    value: filteredStats.value.belum_absen,
    valueClass: 'text-indigo-500',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
  },
])

// ============================================================
// MODAL
// ============================================================
const handleModalSort = (key: string) => {
  if (modalSortKey.value === key) {
    modalSortOrder.value = modalSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    modalSortKey.value = key
    modalSortOrder.value = 'asc'
  }
}

const modalSortIcon = (key: string): string => {
  if (modalSortKey.value !== key) return ' ⇅'
  return modalSortOrder.value === 'asc' ? ' ▴' : ' ▾'
}

const openModal = async (dept: DepartmentData, view: 'bar' | 'list') => {
  modalDept.value = dept
  modalView.value = view
  modalSearch.value = ''
  modalStatusFilter.value = 'ALL'
  modalStatusLabel.value = ''
  modalSortKey.value = 'status'
  modalSortOrder.value = 'asc'
  if (view === 'bar') {
    await nextTick()
    renderModalBarChart(dept)
  }
}

watch(modalView, async (newView) => {
  if (newView === 'bar' && modalDept.value) {
    await nextTick()
    renderModalBarChart(modalDept.value)
  }
})

const closeModal = () => {
  modalDept.value = null
  modalSearch.value = ''
}

const openModalFiltered = (dept: DepartmentData, status: string | null, label: string) => {
  modalDept.value = dept
  modalView.value = 'list'
  modalSearch.value = ''
  modalStatusFilter.value = status === null ? 'ABSENT_GROUP' : status
  modalStatusLabel.value = label
}

const filteredModalEmployees = computed<Employee[]>(() => {
  if (!modalDept.value) return []

  let employees = [...modalDept.value.employees]

  if (modalStatusFilter.value && modalStatusFilter.value !== 'ALL') {
    if (modalStatusFilter.value === 'ABSENT_GROUP') {
      employees = employees.filter((e: Employee) => e.status === 'BELUM_ABSEN' || !e.status)
    } else if (modalStatusFilter.value === 'SHIFT_2') {
      employees = employees.filter((e: Employee) => 
        e.status === 'SHIFT_2' || e.status === 'BELUM_WAKTUNYA'
      )
    } else {
      employees = employees.filter((e: Employee) => e.status === modalStatusFilter.value)
    }
  }

  const q = modalSearch.value.toLowerCase().trim()
  if (q) {
    employees = employees.filter((e: Employee) =>
      (e.nama || '').toLowerCase().includes(q) ||
      (e.nik || '').toLowerCase().includes(q) ||
      (e.bagian || '').toLowerCase().includes(q)
    )
  }

  employees.sort((a: any, b: any) => {
    let aVal: any = a[modalSortKey.value]
    let bVal: any = b[modalSortKey.value]

    if (modalSortKey.value === 'status') {
      const orderMap: Record<string, number> = { TERLAMBAT: 1, BELUM_WAKTUNYA: 2, TEPAT: 3, BELUM_ABSEN: 4 }
      aVal = orderMap[a.status] || 99
      bVal = orderMap[b.status] || 99
    }

    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()

    if (aVal < bVal) return modalSortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return modalSortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return employees
})

// ============================================================
// HIGHCHARTS
// ============================================================
const PASTEL_COLORS = {
  tepat:  '#6ee7b7',
  lambat: '#fcd34d',
  shift2: '#a5b4fc',
  absent: '#fca5a5',
}

const renderSingleDonutChart = (index: number) => {
  const dept = filteredDepartmentData.value[index]
  const donutEl = donutRefs.value[index]
  if (!dept || !donutEl) return

  Highcharts.chart(donutEl, {
    chart: { type: 'pie', backgroundColor: 'transparent', height: 210, margin: [0, 0, 0, 0] },
    title: {
      text: `
        <div style="text-align: center; width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; line-height: 1.0;">
          <span style="font-size: 24px; font-weight: 900; color: #1e293b; font-family: sans-serif; display: block; margin-bottom: 0px; padding: 0;">${dept.total}</span>
          <span style="font-size: 9px; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; display: block; margin-top: 1px;">KARYAWAN</span>
        </div>
      `,
      align: 'center', 
      verticalAlign: 'middle', 
      y: 20, 
      useHTML: true
    },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.name}</b>: {point.y} orang ({point.percentage:.1f}%)' },
    plotOptions: {
      pie: {
        innerSize: '50%',
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '{point.percentage:.0f}%',
          distance: -20, 
          style: { 
            fontSize: '14px', 
            color: '#4a4e53', 
            textOutline: '2px solid #ffffff', 
            fontWeight: '900' 
          },
          filter: { property: 'percentage', operator: '>', value: 5 }
        },
        borderWidth: 2,
        borderColor: '#ffffff',
        point: {
          events: {
            click: function (this: any) {
              const statusMap: Record<string, string | null> = {
                'On Time': 'TEPAT',
                'Terlambat': 'TERLAMBAT',
                'Shift 2': 'SHIFT_2',
                'Absent': null
              }
              const clickedStatus = statusMap[this.name]
              openModalFiltered(dept, clickedStatus, this.name)
            }
          }
        }
      }
    },
    series: [{
      name: 'Status',
      data: [
        { name: 'On Time', y: dept.tepatWaktu, color: PASTEL_COLORS.tepat },
        { name: 'Terlambat', y: dept.terlambat, color: PASTEL_COLORS.lambat },
        { name: 'Shift 2', y: dept.shift2, color: PASTEL_COLORS.shift2 },
        { name: 'Absent', y: dept.tidakMasuk, color: PASTEL_COLORS.absent }
      ]
    }]
  } as any)
}

const renderModalBarChart = (dept: DepartmentData) => {
  const barEl = modalBarRef.value
  if (!dept || !barEl) return

  const categories = dept.sections.map((s: SectionData) => s.namaBagian)
  Highcharts.chart(barEl, {
    chart: { type: 'bar', backgroundColor: 'transparent', height: Math.max(200, categories.length * 40) },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: { categories, labels: { style: { fontSize: '10px', fontWeight: 'bold', color: '#4b5563' } } },
    yAxis: { min: 0, max: 100, title: { text: '' }, labels: { enabled: false }, gridLineWidth: 0 },
    legend: { enabled: true, align: 'center', verticalAlign: 'bottom', itemStyle: { fontSize: '10px', color: '#64748b' } },
    tooltip: { pointFormat: '{series.name}: <b>{point.y}%</b>' },
    plotOptions: {
      series: {
        stacking: 'normal',
        dataLabels: {
          enabled: true,
          format: '{point.y}%',
          style: { fontSize: '9px', textOutline: 'none', color: '#1e293b', fontWeight: 'bold' },
          filter: { property: 'y', operator: '>', value: 5 }
        }
      }
    },
    series: [
      { name: 'On Time', data: dept.sections.map((s: SectionData) => s.pctTepatWaktu), color: PASTEL_COLORS.tepat },
      { name: 'Terlambat', data: dept.sections.map((s: SectionData) => s.pctTerlambat), color: PASTEL_COLORS.lambat },
      { name: 'Shift 2', data: dept.sections.map((s: SectionData) => s.pctShift2), color: PASTEL_COLORS.shift2 },
      { name: 'Absent', data: dept.sections.map((s: SectionData) => s.pctTidakMasuk), color: PASTEL_COLORS.absent }
    ]
  } as any)
}

watch([filteredDepartmentData, () => store.loading], () => {
  nextTick(() => {
    filteredDepartmentData.value.forEach((_, index) => renderSingleDonutChart(index))
  })
}, { deep: true })

// ============================================================
// SHIFT BREAKDOWN TABLE
// ============================================================
const shiftPct = (shift: any) => {
  const total = shift.total ?? 0
  const hadir = (shift.hadir ?? 0) + (shift.terlambat ?? 0)
  return total > 0 ? ((hadir / total) * 100).toFixed(1) : '0.0'
}

const shiftPctColor = (shift: any) => {
  const p = parseFloat(shiftPct(shift))
  if (p >= 80) return 'text-emerald-600'
  if (p >= 50) return 'text-amber-600'
  return 'text-rose-600'
}

// ============================================================
// LIFECYCLE
// ============================================================
const loadData = () => store.fetchStats()
onMounted(() => { loadData() })
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

@keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
</style>