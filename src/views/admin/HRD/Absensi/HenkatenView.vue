<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'
import CustomSelectSearch from '@/components/CustomSelectSearch.vue'
import { useAttendanceStore } from '@/stores/HRD/AttendanceStore'
import type { MappedRecord } from '@/services/HRD/AttendanceService'
import { exportKehadiran } from '@/services/HRD/Exportkehadiranservice'

const page = ref({ title: 'Laporan Henkaten (Ketidakhadiran)' })
const breadcrumbs = ref([
  { title: 'HRD', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'Laporan Henkaten', disabled: true, href: '#' },
])

const store = useAttendanceStore()
const loading = computed(() => store.loading)
const error = computed(() => store.error)
const allRaw = computed<MappedRecord[]>(() => store.dataMapping ?? [])

const currentView = ref<'grid' | 'table'>('grid')
const currentPage = ref(1)
const perPage = ref(30)
const itemsPerPageOptions = [10, 20, 30, 50, 100]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const filter = ref({
  tanggal_start: todayISO(),
  tanggal_end: todayISO(),
  id_finger: '',
})

const localFilter = ref({
  department: '',
  search: '',
  status: 'tidak_hadir', // default fokus ke tidak hadir / henkaten
})

const sort = ref({ field: 'nama', order: 'asc' as 'asc' | 'desc' })

interface HenkatenItem extends MappedRecord {
  alasan?: string
  frekuensi_bulan_ini?: number
}

// Hanya ambil yang statusnya tidak_hadir, henkaten, izin, atau sakit
const henkatenList = computed<HenkatenItem[]>(() => {
  return allRaw.value
    .filter((r) => {
      const s = r.status_kehadiran || ''
      if (localFilter.value.status) {
        if (localFilter.value.status === 'tidak_hadir') {
          return s === 'tidak_hadir' || s === 'henkaten'
        }
        return s === localFilter.value.status
      }
      return ['tidak_hadir', 'henkaten', 'izin', 'sakit', 'terlambat'].includes(s)
    })
    .filter((r) => {
      if (localFilter.value.department && r.departemen !== localFilter.value.department) {
        return false
      }
      if (localFilter.value.search) {
        const q = localFilter.value.search.toLowerCase()
        const matchNama = (r.nama || '').toLowerCase().includes(q)
        const matchNik = (r.nik || '').toLowerCase().includes(q)
        const matchDept = (r.departemen || '').toLowerCase().includes(q)
        const matchJabatan = (r.jabatan || '').toLowerCase().includes(q)
        return matchNama || matchNik || matchDept || matchJabatan
      }
      return true
    })
    .sort((a, b) => {
      const field = sort.value.field as keyof MappedRecord
      const vA = String(a[field] ?? '').toLowerCase()
      const vB = String(b[field] ?? '').toLowerCase()
      const cmp = vA.localeCompare(vB)
      return sort.value.order === 'asc' ? cmp : -cmp
    })
})

const totalPages = computed(() => Math.ceil(henkatenList.value.length / perPage.value) || 1)
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return henkatenList.value.slice(start, start + perPage.value)
})

const totalHenkaten = computed(() => {
  return allRaw.value.filter((r) => ['tidak_hadir', 'henkaten'].includes(r.status_kehadiran || '')).length
})

const totalTerlambat = computed(() => {
  return allRaw.value.filter((r) => r.status_kehadiran === 'terlambat').length
})

const totalIzinSakit = computed(() => {
  return allRaw.value.filter((r) => ['izin', 'sakit'].includes(r.status_kehadiran || '')).length
})

const selectedItem = ref<HenkatenItem | null>(null)

function openDetailModal(item: HenkatenItem) {
  selectedItem.value = item
}

function closeDetailModal() {
  selectedItem.value = null
}

function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < String(str || '').length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h = h & h
  }
  return Math.abs(h).toString(16).padStart(6, '0')
}

function avatarUrl(nama: string, finger: string, size = 48) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    nama || '?'
  )}&background=${hashColor(finger || 'x')}&color=fff&size=${size}`
}

async function applyFilter() {
  currentPage.value = 1
  await store.fetchDataMapping(filter.value)
}

onMounted(() => {
  store.loadDepartmentList()
  if (store.dataMapping.length === 0) {
    store.fetchDataMapping(filter.value)
  }
})
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />

    <!-- Alert Banner Henkaten -->
    <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-bold text-red-900">Peringatan Ketidakhadiran (Henkaten)</h3>
          <p class="text-xs text-red-700 mt-0.5">
            Terdapat <strong class="text-red-900">{{ totalHenkaten }} karyawan</strong> yang tidak hadir / tanpa keterangan pada periode yang dipilih.
          </p>
        </div>
      </div>
      <button
        @click="exportKehadiran(henkatenList, [], { tanggal_start: filter.tanggal_start, tanggal_end: filter.tanggal_end })"
        class="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export Laporan
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tidak Hadir (Henkaten)</p>
            <p class="text-2xl font-bold text-red-600 mt-1">{{ totalHenkaten }}</p>
          </div>
          <div class="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Terlambat</p>
            <p class="text-2xl font-bold text-amber-500 mt-1">{{ totalTerlambat }}</p>
          </div>
          <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Izin & Sakit</p>
            <p class="text-2xl font-bold text-blue-600 mt-1">{{ totalIzinSakit }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
          <input
            v-model="filter.tanggal_start"
            type="date"
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Tanggal Akhir</label>
          <input
            v-model="filter.tanggal_end"
            type="date"
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Departemen</label>
          <select
            v-model="localFilter.department"
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="">Semua Departemen</option>
            <option v-for="d in store.departmentList" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Kategori Status</label>
          <select
            v-model="localFilter.status"
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="">Semua Anomali</option>
            <option value="tidak_hadir">Henkaten (Tidak Hadir)</option>
            <option value="terlambat">Terlambat</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
          </select>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100 items-center justify-between">
        <div class="w-full sm:w-80">
          <input
            v-model="localFilter.search"
            type="text"
            placeholder="Cari Nama, NIK, atau Jabatan..."
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <button
            @click="applyFilter"
            class="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            Terapkan Filter
          </button>
          <div class="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              @click="currentView = 'grid'"
              :class="['px-3 py-2 text-xs font-medium', currentView === 'grid' ? 'bg-red-50 text-red-600' : 'bg-white text-gray-600 hover:bg-gray-50']"
            >
              Grid
            </button>
            <button
              @click="currentView = 'table'"
              :class="['px-3 py-2 text-xs font-medium', currentView === 'table' ? 'bg-red-50 text-red-600' : 'bg-white text-gray-600 hover:bg-gray-50']"
            >
              Tabel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Grid / Table -->
    <div v-if="loading" class="text-center py-16 bg-white rounded-xl border border-gray-200">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
      <p class="text-xs text-gray-500 mt-2">Memuat data ketidakhadiran...</p>
    </div>

    <div v-else-if="henkatenList.length === 0" class="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 class="text-sm font-semibold text-gray-900">Tidak Ada Data Henkaten</h3>
      <p class="text-xs text-gray-500 mt-1">Semua karyawan hadir sesuai jadwal shift pada filter yang dipilih.</p>
    </div>

    <!-- Grid View -->
    <div v-else-if="currentView === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div
        v-for="item in paginatedList"
        :key="item.nik + item.tanggal"
        @click="openDetailModal(item)"
        class="bg-white border-2 border-red-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-1 relative"
      >
        <div class="absolute top-2 right-2">
          <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
        </div>
        <div class="flex flex-col items-center text-center">
          <img :src="avatarUrl(item.nama, item.id_finger)" class="w-14 h-14 rounded-full border-2 border-red-200 shadow-sm opacity-80" />
          <h4 class="text-xs font-bold text-gray-900 mt-2.5 truncate w-full">{{ item.nama }}</h4>
          <p class="text-[11px] text-gray-500 font-mono">{{ item.nik }}</p>
          <p class="text-[11px] text-gray-600 truncate w-full mt-0.5">{{ item.departemen }}</p>
          <div class="mt-2.5 w-full">
            <span class="inline-block w-full py-1 text-[11px] font-semibold text-red-700 bg-red-100 rounded-md">
              {{ item.status_kehadiran === 'terlambat' ? 'Terlambat' : 'Henkaten' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Table View -->
    <div v-else class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-xs">
          <thead class="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
            <tr>
              <th class="px-4 py-3 text-left">Tanggal</th>
              <th class="px-4 py-3 text-left">NIK / ID Finger</th>
              <th class="px-4 py-3 text-left">Nama</th>
              <th class="px-4 py-3 text-left">Departemen</th>
              <th class="px-4 py-3 text-left">Jabatan</th>
              <th class="px-4 py-3 text-left">Shift</th>
              <th class="px-4 py-3 text-left">Jadwal</th>
              <th class="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="item in paginatedList" :key="item.nik + item.tanggal" class="hover:bg-red-50/40 transition-colors">
              <td class="px-4 py-3 font-mono text-gray-600">{{ item.tanggal }}</td>
              <td class="px-4 py-3 font-mono text-gray-800">{{ item.nik }}</td>
              <td class="px-4 py-3 font-semibold text-gray-900">{{ item.nama }}</td>
              <td class="px-4 py-3 text-gray-600">{{ item.departemen }}</td>
              <td class="px-4 py-3 text-gray-600">{{ item.jabatan }}</td>
              <td class="px-4 py-3 text-gray-600">{{ item.shift || 'Non-Shift' }}</td>
              <td class="px-4 py-3 font-mono text-gray-500">
                {{ item.jam_masuk_schedule || '-' }} - {{ item.jam_keluar_schedule || '-' }}
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
                  {{ item.status_kehadiran === 'terlambat' ? 'Terlambat' : 'Henkaten' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="henkatenList.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
      <p class="text-xs text-gray-500">
        Menampilkan {{ (currentPage - 1) * perPage + 1 }} s/d {{ Math.min(currentPage * perPage, henkatenList.length) }} dari {{ henkatenList.length }} data
      </p>
      <div class="flex items-center gap-2">
        <button
          @click="currentPage--"
          :disabled="currentPage <= 1"
          class="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sebelumnya
        </button>
        <span class="text-xs text-gray-700 font-medium">Hal {{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="currentPage++"
          :disabled="currentPage >= totalPages"
          class="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Berikutnya
        </button>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="selectedItem" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 class="text-base font-bold text-gray-900">Detail Ketidakhadiran</h3>
          <button @click="closeDetailModal" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div class="flex items-center gap-4">
          <img :src="avatarUrl(selectedItem.nama, selectedItem.id_finger, 56)" class="w-14 h-14 rounded-full border-2 border-red-200" />
          <div>
            <h4 class="text-sm font-bold text-gray-900">{{ selectedItem.nama }}</h4>
            <p class="text-xs text-gray-500 font-mono">{{ selectedItem.nik }} (ID Finger: {{ selectedItem.id_finger }})</p>
            <p class="text-xs text-gray-600">{{ selectedItem.departemen }} - {{ selectedItem.jabatan }}</p>
          </div>
        </div>
        <div class="bg-gray-50 rounded-xl p-4 text-xs space-y-2 border border-gray-100">
          <div class="flex justify-between">
            <span class="text-gray-500">Tanggal:</span>
            <span class="font-semibold text-gray-900">{{ selectedItem.tanggal }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Shift Terjadwal:</span>
            <span class="font-semibold text-gray-900">{{ selectedItem.shift || 'Non-Shift' }} ({{ selectedItem.jam_masuk_schedule }} - {{ selectedItem.jam_keluar_schedule }})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Status Kehadiran:</span>
            <span class="font-bold text-red-600 uppercase">{{ selectedItem.status_kehadiran }}</span>
          </div>
        </div>
        <button
          @click="closeDetailModal"
          class="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
</template>
