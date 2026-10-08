<script setup lang="ts">
import { ref, shallowRef, reactive, computed, onMounted } from 'vue'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'
import { useWorkingDayStore } from '@/stores/Logistik/IFP/Report/WorkingDay'
import type { WorkingDayDetail } from '@/types/Logistik/IFP/Report/WorkingDay'
import { storeToRefs } from 'pinia'
const page = ref({ title: 'Working Day' })
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'IFP', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'Working Day', disabled: true, href: '#' },
])

const store = useWorkingDayStore()

const MONTHS = [
  { text: 'Januari',   value: 'Januari'   },
  { text: 'Februari',  value: 'Februari'  },
  { text: 'Maret',     value: 'Maret'     },
  { text: 'April',     value: 'April'     },
  { text: 'Mei',       value: 'Mei'       },
  { text: 'Juni',      value: 'Juni'      },
  { text: 'Juli',      value: 'Juli'      },
  { text: 'Agustus',   value: 'Agustus'   },
  { text: 'September', value: 'September' },
  { text: 'Oktober',   value: 'Oktober'   },
  { text: 'November',  value: 'November'  },
  { text: 'Desember',  value: 'Desember'  },
]

const filter = reactive({
  month: MONTHS[new Date().getMonth()].value,
  year: new Date().getFullYear(),
})

const showUploadModal = ref(false)
const uploadFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const openUploadModal = () => {
  uploadFile.value = null
  showUploadModal.value = true
}

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  uploadFile.value = input.files?.[0] ?? null
}

const uploadError = reactive<{
  show: boolean
  message: string
  errors: { customer: string; wd_excel: number; wd_sistem: number; message: string }[]
}>({
  show: false,
  message: '',
  errors: [],
})

const submitUpload = async () => {
  if (!uploadFile.value) return

  try {
    // Karena store akan melakukan 'throw err' jika gagal, 
    // maka jika proses sukses, baris di bawah ini langsung menutup modal upload.
    await store.uploadWorkingDay(uploadFile.value, { ...filter })
    showUploadModal.value = false

    // Reset error jika sebelumnya ada error tertinggal
    uploadError.show = false
    uploadError.message = ''
    uploadError.errors = []
  } catch (err: any) {
    // Jalur ini otomatis tereksekusi karena store melemparkan 'throw err' saat HTTP 400 / Gagal
    const responseData = err?.response?.data

    if (responseData && responseData.success === false) {
      uploadError.show = true
      uploadError.message = responseData.message ?? 'Upload gagal.'
      uploadError.errors = responseData.errors ?? []
    } else {
      // Backup jika response structure berbeda atau ada gangguan network/500
      uploadError.show = true
      uploadError.message = err?.message ?? 'Terjadi kesalahan saat upload. Silakan coba lagi.'
      uploadError.errors = []
    }
  }
}
const loadData = async () => {
  await store.fetchWorkingDay({ ...filter })
}

onMounted(() => loadData())

const legends = [
  { label: 'Holiday Overtime',                 color: '#C00000', textLight: true  },
  { label: 'Replacement Day',                  color: '#FFFF00', textLight: false },
  { label: 'Working Day',                      color: '#FFFFFF', border: true, textLight: false },
  { label: 'Off Day',                          color: '#BFBFBF', textLight: false },
  { label: 'Off Production, Accept Receiving', color: '#FFF2CC', textLight: false },
  { label: 'Last Order Before Holiday',        color: '#0033CC', textLight: true  },
  { label: 'First Order After Holiday',        color: '#00B050', textLight: true  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

const isWeekend = (day: number): boolean => {
  const monthIdx = MONTHS.findIndex(m => m.value === filter.month)
  const date = new Date(Number(filter.year), monthIdx, day)
  return date.getDay() === 0 || date.getDay() === 6
}

const isDayShift = (item: WorkingDayDetail): boolean =>
  item.shift?.toLowerCase() === 'day'

const getRawColor = (item: WorkingDayDetail, day: number): string =>
  (item[`t${day}_color`] as string | null) ?? 'FFFFFFFF'

const hexColor = (raw: string): string => '#' + raw.slice(-6)

const getTextColor = (hex: string): string => {
  const u = hex.toUpperCase()
  return u === '#C00000' || u === '#0033CC' || u === '#00B050' ? '#ffffff' : '#111827'
}

const getDayNote = (item: WorkingDayDetail, day: number): string => {
  const v = (item[`t${day}_notes`] as string | null) ?? ''
  return v.trim()
}

const displayDayValue = (item: WorkingDayDetail, day: number): string => {
  const val = item[`t${day}`] as string | null
  if (val === '0' || val === '1' || val === null) return ''
  return String(val)
}

const isBeyondMonth = (item: WorkingDayDetail, day: number): boolean =>
  item[`t${day}`] === null && item[`t${day}_color`] === null

// ─── Merge Info per kolom hari ───────────────────────────────────────────────
// Syarat merge:
//   1. Semua row punya tXX_color yang sama
//   2. Minimal 1 row punya tXX_notes tidak kosong

interface MergeInfo {
  shouldMerge: boolean
  note: string
  color: string       // hex #RRGGBB
  textColor: string
  rowspan: number
}

const mergeMap = computed((): Record<number, MergeInfo> => {
  const data = store.data
  const result: Record<number, MergeInfo> = {}

  for (let d = 1; d <= 31; d++) {
    if (!data.length) {
      result[d] = { shouldMerge: false, note: '', color: '', textColor: '', rowspan: 1 }
      continue
    }

    const rawColors = data.map(item => getRawColor(item, d))
    const allSame = rawColors.every(c => c === rawColors[0])

    const foundNote = data
      .map(item => getDayNote(item, d))
      .find(n => n !== '') ?? ''

    if (allSame && foundNote !== '') {
      const hex = hexColor(rawColors[0])
      result[d] = {
        shouldMerge: true,
        note: foundNote,
        color: hex,
        textColor: getTextColor(hex),
        rowspan: data.length,
      }
    } else {
      result[d] = { shouldMerge: false, note: '', color: '', textColor: '', rowspan: 1 }
    }
  }

  return result
})

// ─── Customer rowspan ────────────────────────────────────────────────────────

const isFirstCustomerRow = (index: number): boolean => {
  if (index === 0) return true
  return store.data[index].customer_name !== store.data[index - 1].customer_name
}

const normalizeWd = (val: unknown): number => {
  if (val === null || val === undefined) return 0

  return parseFloat(
    String(val)
      .replace(',', '.')
      .trim()
  ) || 0
}

const hasExcelData = computed(() =>
  store.data.some(item =>
    normalizeWd(item.total_wd_excel) !== normalizeWd(item.total_wd_sistem)
  )
)

const getCustomerRowspan = (index: number): number =>
  store.data.filter(item => item.customer_name === store.data[index].customer_name).length
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />
  <div class="flex flex-col gap-2">

    <!-- Filter Card -->
    <div class="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-100 w-full">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-1 h-5 bg-blue-600 rounded-full shrink-0" />
        <h5 class="text-sm font-semibold text-gray-800 whitespace-nowrap shrink-0">Working Calendar</h5>
        <div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex-1 min-w-0">
          <svg class="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
          </svg>
          <p class="text-xs text-amber-700 leading-none truncate">
            <strong>Perhatian:</strong> Apabila terjadi perbedaan <strong>Total Workday</strong> antara Excel dan pembacaan sistem, pastikan <strong>format warna</strong> &amp; <strong>template Excel</strong> sudah sesuai.
          </p>
        </div>
      </div>

      <div class="flex justify-center">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex items-center gap-3">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Bulan</label>
            <select
              v-model="filter.month"
              class="border border-gray-200 rounded-lg px-12 py-2 text-sm text-gray-800 bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option v-for="m in MONTHS" :key="m.value" :value="m.value">{{ m.text }}</option>
            </select>
          </div>

          <div class="flex items-center gap-3">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tahun</label>
            <input
              v-model="filter.year"
              type="number"
              min="2000"
              max="2999"
              class="border border-gray-200 rounded-lg px-12 py-2 text-sm text-gray-800 bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div class="w-px h-8 bg-gray-200 self-end" />

          <button
              v-if="store.permissions.create"
              @click="openUploadModal"
              class="inline-flex items-center gap-2 px-12 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 transition-colors"
            >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Upload Calendar
          </button>

          <button
            @click="store.downloadFormat('WORKING_CALENDAR')"
            class="inline-flex items-center gap-2 px-12 py-2 bg-gray-200 border-2 border-green-600 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 focus:ring-4 focus:ring-green-300 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Format Excel
          </button>

          <button
            @click="loadData"
            :disabled="store.loading"
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <svg v-if="store.loading" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {{ store.loading ? 'Memuat...' : 'Load Data' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-2.5">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest">Keterangan Warna</p>
        <div v-for="leg in legends" :key="leg.label" class="flex items-center gap-2">
          <span
            class="w-4 h-4 rounded shrink-0"
            :style="{
              backgroundColor: leg.color,
              border: leg.border ? '1px solid #d1d5db' : '1px solid rgba(0,0,0,0.08)',
            }"
          />
          <span class="text-xs text-gray-600 whitespace-nowrap">{{ leg.label }}</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden -mt-1">

      <div v-if="store.loading" class="flex items-center justify-center py-20 gap-3">
        <svg class="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span class="text-sm text-gray-400">Memuat data kalender...</span>
      </div>

      <div v-else-if="!store.data.length" class="flex flex-col items-center justify-center py-20 gap-3">
        <svg class="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p class="text-sm text-gray-400">Tidak ada data untuk bulan {{ filter.month }} {{ filter.year }}.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="calendar-table w-full text-xs border-collapse">
          <thead>
            <tr class="bg-slate-700 text-white">
              <th class="sticky-col bg-slate-700 text-center px-2 py-2 font-semibold whitespace-nowrap z-10 text-sm"
                  style="width: 60px; max-width: 50px; min-width: 30px;">
                Customer
              </th>
              <th class="px-2 py-2 font-semibold text-center min-w-[50px] text-sm">Shift</th>
                            <th
                v-for="day in 31"
                :key="'h-' + day"
                class="text-center font-semibold min-w-[42px] py-2 text-sm"
                :class="mergeMap[day]?.shouldMerge
                  ? 'bg-red-600 text-white'
                  : isWeekend(day) ? 'bg-red-700' : 'bg-slate-700'"
              >
                {{ day }}
              </th>
             <th
                v-if="hasExcelData"
                class="px-1 py-2 font-semibold text-center whitespace-nowrap bg-slate-800 min-w-[45px] text-[11px]"
              >
                WD Excel
              </th>
              <th class="px-1 py-2 font-semibold text-center whitespace-nowrap bg-slate-800 min-w-[48px] text-[11px]">
                Total WD
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(item, index) in store.data"
              :key="index"
              class="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
            >
              <!-- Customer name -->
              <td
                v-if="isFirstCustomerRow(index)"
                :rowspan="getCustomerRowspan(index)"
                class="sticky-col bg-gray-50 border-r border-gray-200 px-2 py-2 align-middle min-w-[110px] text-center"
              >
                <p class="font-semibold text-gray-800 text-[13px] leading-tight">
                  {{ item.customer_name }}
                </p>
              </td>

              <!-- Shift badge -->
              <td class="px-2 py-1.5 text-center">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-bold tracking-wide"
                  :class="isDayShift(item) ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'"
                >
                  {{ isDayShift(item) ? 'DAY' : 'NIGHT' }}
                </span>
              </td>

              <!-- Day cells -->
              <template v-for="day in 31" :key="'d-' + day">

                <!-- CASE 1: Merge aktif + ini row pertama → render cell rowspan -->
                <td
                  v-if="mergeMap[day].shouldMerge && index === 0"
                  :rowspan="mergeMap[day].rowspan"
                  class="relative text-center min-w-[42px] p-0 align-middle"
                  :style="{ backgroundColor: mergeMap[day].color }"
                >
                  <div class="flex items-center justify-center w-full h-full" style="min-height: 34px;">
                    <span
                      class="text-[14px] font-bold leading-tight"
                      :style="{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        color: mergeMap[day].textColor,
                        whiteSpace: 'nowrap',
                      }"
                    >
                      {{ mergeMap[day].note }}
                    </span>
                  </div>
                </td>

                <!-- CASE 2: Merge aktif + bukan row pertama → SKIP (tidak render, covered rowspan) -->
                <template v-else-if="mergeMap[day].shouldMerge && index > 0" />

                <!-- CASE 3: Tidak merge + beyond month -->
                <td
                  v-else-if="isBeyondMonth(item, day)"
                  class="min-w-[42px] h-[34px] bg-gray-100"
                />

                <!-- CASE 4: Tidak merge + normal -->
                <td
                  v-else
                  class="relative text-center font-semibold min-w-[42px] h-[34px] p-0"
                  :style="{
                    backgroundColor: hexColor(getRawColor(item, day)),
                    color: getTextColor(hexColor(getRawColor(item, day))),
                  }"
                >
                  <div class="flex flex-col items-center justify-center h-full w-full leading-tight py-0.5">
                    <span class="text-[12px]">{{ displayDayValue(item, day) }}</span>
                    <span
                      v-if="getDayNote(item, day)"
                      class="text-[12px] font-bold block mt-0.5"
                    >
                      {{ getDayNote(item, day) }}
                    </span>
                  </div>
                </td>

              </template>

              <!-- WD Excel -->
           <td
              v-if="isFirstCustomerRow(index) && hasExcelData"
              :rowspan="getCustomerRowspan(index)"
              class="text-center font-bold border-l border-red-200 px-1 min-w-[45px] text-[13px] align-middle"
              :class="
                normalizeWd(item.total_wd_excel) !== normalizeWd(item.total_wd_sistem)
                  ? 'text-red-600 bg-red-50'
                  : 'text-transparent bg-white'
              "
            >
              {{
                normalizeWd(item.total_wd_excel) !== normalizeWd(item.total_wd_sistem)
                  ? item.total_wd_excel
                  : '-'
              }}
            </td>
              <!-- WD Sistem -->
              <td
                v-if="isFirstCustomerRow(index)"
                :rowspan="getCustomerRowspan(index)"
                class="text-center font-bold bg-slate-50 border-l border-gray-200 px-1 min-w-[48px] text-[12px] align-middle"
                :class="
                  normalizeWd(item.total_wd_excel) === normalizeWd(item.total_wd_sistem)
                    ? 'text-emerald-600'
                    : 'text-red-600'
                "
              >
                {{ item.total_wd_sistem }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- Upload Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showUploadModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showUploadModal = false"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showUploadModal = false" />

        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
              </div>
              <h3 class="font-semibold text-gray-800 text-sm">Upload Working Calendar</h3>
            </div>
            <button @click="showUploadModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="px-6 py-5">
            <label
              class="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all"
              :class="uploadFile
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'"
            >
              <div v-if="!uploadFile" class="flex flex-col items-center gap-2">
                <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <span class="text-sm text-gray-500">Klik untuk memilih file Excel</span>
                <span class="text-xs text-gray-400">.xlsx, .xls</span>
              </div>
              <div v-else class="flex flex-col items-center gap-2">
                <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-sm font-medium text-emerald-700">{{ uploadFile.name }}</span>
                <span class="text-xs text-emerald-500">{{ (uploadFile.size / 1024).toFixed(1) }} KB</span>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                @change="handleFileChange"
              />
            </label>
          </div>

          <div class="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
            <button
              @click="showUploadModal = false"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              Batal
            </button>
            <button
              @click="submitUpload"
              :disabled="!uploadFile || store.loading"
              class="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              <svg v-if="store.loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ store.loading ? 'Mengupload...' : 'Upload' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
  <!-- Error Dialog WD Mismatch -->
<Teleport to="body">
  <Transition name="modal">
    <div
      v-if="uploadError.show"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10">
        
        <!-- Header -->
        <div class="flex items-center gap-3 px-6 py-4 bg-red-50 border-b border-red-100">
          <div class="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-red-700 text-sm">Upload Gagal — WD Tidak Sesuai</h3>
            <p class="text-xs text-red-500 mt-0.5">Perbaiki file Excel dan upload ulang</p>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 py-4">
          <p class="text-sm text-gray-700 mb-4">{{ uploadError.message }}</p>

          <!-- Tabel error per customer -->
          <div class="rounded-xl border border-red-100 overflow-hidden">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-red-50 text-red-700">
                  <th class="px-3 py-2 text-left font-semibold">Customer</th>
                  <th class="px-3 py-2 text-center font-semibold">WD Excel</th>
                  <th class="px-3 py-2 text-center font-semibold">WD Sistem</th>
                  <th class="px-3 py-2 text-center font-semibold">Selisih</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(err, i) in uploadError.errors"
                  :key="i"
                  class="border-t border-red-50"
                  :class="i % 2 === 0 ? 'bg-white' : 'bg-red-50/40'"
                >
                  <td class="px-3 py-2 font-medium text-gray-800">{{ err.customer }}</td>
                  <td class="px-3 py-2 text-center text-red-600 font-bold">{{ err.wd_excel }}</td>
                  <td class="px-3 py-2 text-center text-blue-600 font-bold">{{ err.wd_sistem }}</td>
                  <td class="px-3 py-2 text-center font-bold"
                    :class="err.wd_excel - err.wd_sistem > 0 ? 'text-orange-500' : 'text-red-600'"
                  >
                    {{ err.wd_excel - err.wd_sistem > 0 ? '+' : '' }}{{ err.wd_excel - err.wd_sistem }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Info -->
          <div class="flex items-start gap-2 mt-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <svg class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd"/>
            </svg>
            <p class="text-xs text-amber-700">
              Pastikan jumlah <strong>Working Day</strong> pada file Excel sesuai dengan data sistem sebelum upload ulang.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            @click="uploadError.show = false"
            class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Upload Ulang
          </button>
        </div>
      </div>
    </div>
  </Transition>
</Teleport>
</template>

<style scoped>
.calendar-table {
  border-collapse: collapse;
  font-size: 13px;
}

.calendar-table th,
.calendar-table td {
  border: 1px solid #e5e7eb;
}

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative {
  transform: scale(0.96) translateY(8px);
}
</style>