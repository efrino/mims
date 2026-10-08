<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'
import QrScanner from 'qr-scanner'
import { driverService } from '@/services/Logistik/Pallet/logsDriverService'
import { useMasterDriver } from '@/services/Logistik/MasterData/MasterDriver'
import { useNotificationStore } from '@/stores/notification'
import type { DriverItem } from '@/types/Logistik/MasterData/MasterDriver'
import type { TripItem, LogPallet, DriverPayload } from '@/types/Logistik/Pallet/driver'

const masterDriver      = useMasterDriver()
const notificationStore = useNotificationStore()

// ─── Step 1: QR / Scanner ────────────────────────────────────────────────────
const qrInput       = ref('')
const qrDriver      = ref<DriverItem | null>(null)
const qrError       = ref('')
const noPolisi      = ref('')
const noPolisiError = ref('')

// ─── Camera modal (qr-scanner) ───────────────────────────────────────────────
const cameraOpen  = ref(false)
const cameraError = ref('')
const videoEl     = ref<HTMLVideoElement | null>(null)
let   scanner     : QrScanner | null = null

async function openCamera() {
  const hasCamera = await QrScanner.hasCamera()
  if (!hasCamera) {
    qrError.value = 'Tidak ada kamera yang tersedia di perangkat ini.'
    return
  }

  cameraError.value = ''
  cameraOpen.value  = true
  await nextTick()
  if (!videoEl.value) return

  scanner = new QrScanner(
    videoEl.value,
    (result) => {
      stopCamera()
      handleQrResult(result.data)
    },
    {
      preferredCamera       : 'environment',
      highlightScanRegion   : true,
      highlightCodeOutline  : true,
      maxScansPerSecond     : 10,
      returnDetailedScanResult: true,
    }
  )

  try {
    await scanner.start()
  } catch (err: any) {
    cameraError.value = err?.message?.includes('ermission')
      ? 'Izin kamera ditolak. Izinkan akses kamera di browser.'
      : 'Gagal membuka kamera.'
    scanner?.destroy()
    scanner = null
  }
}

function stopCamera() {
  scanner?.stop()
  scanner?.destroy()
  scanner           = null
  cameraOpen.value  = false
  cameraError.value = ''
}

onUnmounted(stopCamera)

// ─── QR Result handler ───────────────────────────────────────────────────────
async function handleQrResult(raw: string) {
  const val = raw.trim()
  if (!val) return

  qrError.value  = ''
  qrDriver.value = null
  qrInput.value  = ''

  try {
    const list  = await masterDriver.fetchMasterDriver()
    const found = list.find(d => d.nik === val)
    if (!found) {
      qrError.value = `Driver "${val}" tidak ditemukan`
      return
    }
    qrDriver.value = found
  } catch {
    qrError.value = 'Gagal membaca data driver'
  }
}

async function onScanQr() {
  await handleQrResult(qrInput.value)
}

// ─── Step 2: Pilih Trip ───────────────────────────────────────────────────────
const dnList = [
  { value: 'DN1', label: 'ADM PLANT 1' },
  { value: 'DN4', label: 'ADM PLANT 4' },
  { value: 'DN5', label: 'ADM PLANT 5' },
]
const selectedDn    = ref('')
const tripRows      = ref<TripItem[]>([])
const selectedRoute = ref('')
const selectedTrip  = ref('')
const loadingTrip   = ref(false)

// Hanya data yang sudah discan (is_scan = 1)
const scannedRows = computed(() =>
  tripRows.value.filter(r => String(r.is_scan) === '1')
)

const routeList = computed(() => [
  ...new Set(
    scannedRows.value
      .map(r => r.route)
      .filter((rt): rt is string => !!rt && String(rt).trim() !== '')
  )
].sort())

// Baris sesuai route terpilih (kosong = semua route)
const routeFilteredRows = computed(() =>
  selectedRoute.value
    ? scannedRows.value.filter(r => String(r.route) === String(selectedRoute.value))
    : scannedRows.value
)

const tripList = computed(() => [
  ...new Set(
    routeFilteredRows.value
      .map(r => r.trip)
      .filter((t): t is string => !!t && String(t).trim() !== '')
  )
].sort((a, b) => Number(a) - Number(b)))

function onRouteChange() {
  selectedTrip.value = ''
  matchedLogs.value  = []
}

async function fetchTrips() {
  if (!selectedDn.value) return
  loadingTrip.value   = true
  selectedRoute.value = ''
  selectedTrip.value  = ''
  matchedLogs.value   = []
  try {
    // Tanggal otomatis hari ini
    const today = new Date().toISOString().slice(0, 10)
    tripRows.value = await driverService.getTripAll(today, selectedDn.value)
    if (tripList.value.length === 0) {
      notificationStore.showAlertWarning('Tidak ada trip untuk plant ini hari ini')
    }
  } catch {
    tripRows.value = []
    notificationStore.showAlertError('Gagal mengambil data trip')
  } finally {
    loadingTrip.value = false
  }
}

// ─── Step 3: Match barcode → logs_pallet.id_label ────────────────────────────
const matchedLogs  = ref<LogPallet[]>([])
const loadingMatch = ref(false)

async function onTripChange() {
  matchedLogs.value = []
  if (!selectedTrip.value) return

  const barcodes = [
    ...new Set(
      routeFilteredRows.value
        .filter(r => String(r.trip) === String(selectedTrip.value))
        .map(r => r.barcode)
        .filter((b): b is string => !!b && b.trim() !== '')
    )
  ]

  loadingMatch.value = true
  notificationStore.loading = true
  try {
    const results = await Promise.all(
      barcodes.map(barcode =>
        driverService.getLogsByLabel(barcode).catch(() => [] as LogPallet[])
      )
    )

    const logs: LogPallet[] = []
    results.forEach(found => {
      // Hanya log yang belum ada drivernya
      found.filter(l => !l.nik).forEach(l => {
        if (!logs.some(x => Number(x.id) === Number(l.id))) logs.push(l)
      })
    })

    matchedLogs.value = logs
    if (logs.length === 0) {
      notificationStore.showAlertWarning('Tidak ada pallet yang cocok dengan barcode trip ini')
    }
  } finally {
    loadingMatch.value = false
    notificationStore.disableLoading()
  }
}

function removeLog(index: number) {
  matchedLogs.value.splice(index, 1)
}

// ─── Step status ─────────────────────────────────────────────────────────────
const step1Done = computed(() => !!qrDriver.value && !!noPolisi.value.trim())
const step2Done = computed(() => !!selectedTrip.value)
const step3Done = computed(() => matchedLogs.value.length > 0)

// ─── Submit ───────────────────────────────────────────────────────────────────
const isSaving = ref(false)

function validate(): boolean {
  noPolisiError.value = noPolisi.value.trim() ? '' : 'No polisi wajib diisi'
  if (!qrDriver.value)    { qrError.value = 'Scan QR driver terlebih dahulu'; return false }
  if (noPolisiError.value) return false
  if (!matchedLogs.value.length) return false
  return true
}

async function onSubmit() {
  if (!validate()) return

  isSaving.value = true
  notificationStore.loading = true
  try {
    const payload: DriverPayload = {
      nik        : qrDriver.value!.nik,
      nama_driver: qrDriver.value!.nama_driver,
      nama_lp    : qrDriver.value!.nama_lp,
      no_polisi  : noPolisi.value.trim(),
      ids        : matchedLogs.value.map(l => Number(l.id)),
    }
    const result = await driverService.postDriver(payload)

    if (result.success) {
      const msg = result.summary.failed === 0
        ? `${result.summary.success} data berhasil disimpan`
        : `${result.summary.success} berhasil, ${result.summary.failed} gagal`
      result.summary.failed === 0
        ? notificationStore.showAlertSuccess(msg)
        : notificationStore.showAlertWarning(msg)

      if (result.summary.failed === 0) {
        onReset()
      } else if (result.success_ids?.length) {
        matchedLogs.value = matchedLogs.value.filter(
          l => !result.success_ids.includes(Number(l.id))
        )
      }
    } else {
      notificationStore.showAlertError(result.messages ?? 'Gagal menyimpan data driver')
    }
  } catch (err: any) {
    notificationStore.showAlertError(err?.response?.data?.messages ?? 'Gagal menyimpan data driver')
  } finally {
    notificationStore.disableLoading()
    isSaving.value = false
  }
}

function onReset() {
  qrDriver.value      = null
  qrInput.value       = ''
  qrError.value       = ''
  noPolisi.value      = ''
  noPolisiError.value = ''
  selectedDn.value    = ''
  selectedRoute.value = ''
  selectedTrip.value  = ''
  tripRows.value      = []
  matchedLogs.value   = []
}
</script>

<template>
  <div class="flex flex-col gap-5 pb-10">

    <!-- ══════════════════════════════
         STEP 1 — IDENTITAS DRIVER
    ═══════════════════════════════ -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">

      <div class="flex items-center gap-3 px-5 py-3.5 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
        <span
          class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold text-white shrink-0"
          :class="step1Done ? 'bg-green-600' : 'bg-blue-600'"
        >
          <svg v-if="step1Done" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <span v-else>1</span>
        </span>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Identitas driver</span>
        <span v-if="step1Done" class="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">Lengkap</span>
      </div>

      <div class="p-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">

          <!-- QR Scan Input -->
          <div>
            <label class="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Scan QR Driver <span class="text-red-500">*</span>
            </label>
            <div class="flex gap-2">
              <div class="relative flex-1">
                <input
                  v-model="qrInput"
                  type="text"
                  placeholder="Scan / ketik NIK…"
                  class="w-full px-3 py-2 text-sm border rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2"
                  :class="qrError ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-300'"
                  @keyup.enter="onScanQr"
                />
              </div>
              <!-- Tombol buka kamera -->
              <button
                type="button"
                title="Buka kamera untuk scan QR"
                class="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
                @click="openCamera"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke-width="1.8"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke-width="1.8"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke-width="1.8"/>
                  <path stroke-linecap="round" d="M14 14h2v2h-2zM18 14h3M14 18v3M18 18h3v3h-3z"/>
                </svg>
              </button>
            </div>
            <p v-if="qrError" class="mt-1 text-xs text-red-500">{{ qrError }}</p>
          </div>

          <!-- NIK readonly -->
          <div>
            <label class="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">NIK</label>
            <div class="px-3 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 min-h-[38px] truncate">
              {{ qrDriver?.nik || '—' }}
            </div>
          </div>

          <!-- Nama Driver readonly -->
          <div>
            <label class="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nama driver</label>
            <div class="px-3 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 min-h-[38px] truncate">
              {{ qrDriver?.nama_driver || '—' }}
            </div>
          </div>

          <!-- No Polisi -->
          <div>
            <label class="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              No polisi <span class="text-red-500">*</span>
            </label>
            <input
              v-model="noPolisi"
              type="text"
              placeholder="B 1234 XYZ"
              class="w-full px-3 py-2 text-sm border rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2"
              :class="noPolisiError ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-300'"
              @input="noPolisiError = ''"
            />
            <p v-if="noPolisiError" class="mt-1 text-xs text-red-500">{{ noPolisiError }}</p>
          </div>

        </div>
      </div>
    </div>

    <!-- ══════════════════════════════
         STEP 2 — PILIH TRIP
    ═══════════════════════════════ -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">

      <div class="flex items-center gap-3 px-5 py-3.5 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
        <span
          class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold text-white shrink-0"
          :class="step2Done ? 'bg-green-600' : 'bg-blue-600'"
        >
          <svg v-if="step2Done" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <span v-else>2</span>
        </span>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Pilih trip</span>
        <span v-if="step2Done" class="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">
          {{ dnList.find(d => d.value === selectedDn)?.label }}<template v-if="selectedRoute"> · Route {{ selectedRoute }}</template> · Trip {{ selectedTrip }}
        </span>
      </div>

      <div class="p-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">

          <!-- Plant -->
          <div>
            <label class="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Plant <span class="text-red-500">*</span>
            </label>
            <select
              v-model="selectedDn"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              @change="fetchTrips"
            >
              <option value="">— Pilih plant —</option>
              <option v-for="dn in dnList" :key="dn.value" :value="dn.value">{{ dn.label }}</option>
            </select>
          </div>

          <!-- Route -->
          <div>
            <label class="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Route
            </label>
            <select
              v-model="selectedRoute"
              :disabled="loadingTrip || routeList.length === 0"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-300"
              @change="onRouteChange"
            >
              <option value="">
                {{ loadingTrip ? 'Memuat…' : routeList.length === 0 ? '— Pilih plant dulu —' : '— Semua route —' }}
              </option>
              <option v-for="rt in routeList" :key="rt" :value="rt">{{ rt }}</option>
            </select>
          </div>

          <!-- Trip -->
          <div>
            <label class="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Trip <span class="text-red-500">*</span>
            </label>
            <select
              v-model="selectedTrip"
              :disabled="loadingTrip || tripList.length === 0"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-300"
              @change="onTripChange"
            >
              <option value="">
                {{ loadingTrip ? 'Memuat…' : tripList.length === 0 ? '— Pilih plant dulu —' : '— Pilih trip —' }}
              </option>
              <option v-for="t in tripList" :key="t" :value="t">Trip {{ t }}</option>
            </select>
          </div>

        </div>
      </div>
    </div>

    <!-- ══════════════════════════════
         STEP 3 — LIST PALLET
    ═══════════════════════════════ -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">

      <div class="flex items-center gap-3 px-5 py-3.5 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
        <span
          class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold text-white shrink-0"
          :class="step3Done ? 'bg-green-600' : 'bg-blue-600'"
        >
          <svg v-if="step3Done" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <span v-else>3</span>
        </span>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Data pallet</span>
        <span v-if="matchedLogs.length" class="ml-auto text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full font-medium">
          {{ matchedLogs.length }} pallet
        </span>
      </div>

      <!-- Tabel Desktop -->
      <div v-if="matchedLogs.length" class="hidden md:block overflow-x-auto border-t border-gray-100 dark:border-gray-700">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide w-10">#</th>
              <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">No RFID</th>
              <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">No Pallet</th>
              <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</th>
              <th class="px-4 py-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr
              v-for="(row, i) in matchedLogs"
              :key="row.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <td class="px-4 py-3 text-xs text-gray-400 text-center">{{ i + 1 }}</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{{ row.no_rfid }}</td>
              <td class="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">{{ row.no_pallet }}</td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{{ row.type }}</td>
              <td class="px-4 py-3 text-center">
                <button type="button" class="text-red-400 hover:text-red-600 transition-colors" @click="removeLog(i)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Card Mobile -->
      <div v-if="matchedLogs.length" class="md:hidden divide-y divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
        <div v-for="(row, i) in matchedLogs" :key="row.id" class="p-4 flex items-start justify-between gap-3">
          <div class="flex-1 grid grid-cols-2 gap-y-1.5 text-sm">
            <span class="text-gray-500 dark:text-gray-400 text-xs">No RFID</span>
            <span class="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{{ row.no_rfid }}</span>
            <span class="text-gray-500 dark:text-gray-400 text-xs">No Pallet</span>
            <span class="font-medium text-gray-800 dark:text-gray-100">{{ row.no_pallet }}</span>
            <span class="text-gray-500 dark:text-gray-400 text-xs">Type</span>
            <span class="text-gray-700 dark:text-gray-300">{{ row.type }}</span>
          </div>
          <button type="button" class="text-red-400 hover:text-red-600 mt-1 shrink-0" @click="removeLog(i)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="!matchedLogs.length" class="px-5 py-5 text-sm text-gray-400 dark:text-gray-500">
        {{ loadingMatch ? 'Mencocokkan barcode…' : 'Belum ada pallet. Pilih plant dan trip terlebih dahulu.' }}
      </div>

      <!-- Footer Action -->
      <div
        v-if="matchedLogs.length"
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-4 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
      >
        <div class="text-xs text-gray-400 dark:text-gray-500">{{ matchedLogs.length }} pallet akan disimpan</div>

        <div class="flex gap-2 sm:ml-auto">
          <button
            type="button"
            class="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
            @click="onReset"
          >Reset</button>
          <button
            type="button"
            class="flex-1 sm:flex-none px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed transition-colors"
            :disabled="!step1Done || !step3Done || isSaving"
            @click="onSubmit"
          >{{ isSaving ? 'Menyimpan…' : 'Simpan data driver' }}</button>
        </div>
      </div>
    </div>

  </div>

  <!-- ══════════════════════════════
       CAMERA MODAL
  ═══════════════════════════════ -->
  <Teleport to="body">
    <Transition name="cam-fade">
      <div
        v-if="cameraOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="stopCamera"
      >
        <div class="relative w-full max-w-sm bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">

          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 bg-gray-800">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span class="text-sm font-medium text-white">Scan QR Driver</span>
            </div>
            <button type="button" class="text-gray-400 hover:text-white transition-colors" @click="stopCamera">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Video — qr-scanner meng-attach overlay-nya sendiri ke sini -->
          <div class="relative bg-black aspect-square">
            <video
              ref="videoEl"
              class="w-full h-full object-cover"
              autoplay
              playsinline
              muted
            />
          </div>

          <!-- Error / hint -->
          <div v-if="cameraError" class="px-4 py-3 bg-red-900/40 text-red-300 text-sm text-center">
            {{ cameraError }}
          </div>
          <div v-else class="px-4 py-3 text-gray-400 text-xs text-center">
            Arahkan kamera ke QR Code driver
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal transition */
.cam-fade-enter-active,
.cam-fade-leave-active { transition: opacity 0.2s ease; }
.cam-fade-enter-active .relative,
.cam-fade-leave-active .relative { transition: transform 0.2s ease, opacity 0.2s ease; }
.cam-fade-enter-from,
.cam-fade-leave-to { opacity: 0; }
.cam-fade-enter-from .relative {
  transform: scale(0.95) translateY(8px);
  opacity: 0;
}

/*
  qr-scanner meng-inject elemen scan-region & outline ke dalam <video>.
  Override supaya pas dengan ukuran modal kita.
*/
:deep(.scan-region-highlight) {
  border-radius: 12px;
}
:deep(.scan-region-highlight-svg) {
  stroke: #60a5fa !important; /* blue-400 */
}
:deep(.code-outline-highlight) {
  stroke: #34d399 !important; /* emerald-400 */
}
</style>
