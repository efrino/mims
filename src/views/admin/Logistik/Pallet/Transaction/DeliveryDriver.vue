<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'
import QrScanner from 'qr-scanner'
import { useLogsDriverStore } from '@/stores/Logistik/Pallet/Driver'
import { useMasterDriver } from '@/services/Logistik/MasterData/MasterDriver'
import socket from '@/plugins/socket'
import type { DriverItem } from '@/types/Logistik/MasterData/MasterDriver'

const driverStore  = useLogsDriverStore()
const masterDriver = useMasterDriver()

// ─── Step 1: QR / Scanner ────────────────────────────────────────────────────
const qrInput        = ref('')
const qrDriver       = ref<DriverItem | null>(null)
const qrError        = ref('')
const noPolisi       = ref('')
const noPolisiError  = ref('')
const nikMengetahui  = ref('')

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
  rfidList.value = []       // reset rfid list saat ganti driver
  rfidError.value = ''

  try {
    const list  = await masterDriver.fetchMasterDriver()
    const found = list.find(d => d.nik === val)
    if (!found) {
      qrError.value = `Driver "${val}" tidak ditemukan`
      return
    }
    qrDriver.value = found
    driverStore.fillDriverFromMaster(found)

    // ✅ Fetch semua log status OUT setelah driver ditemukan
    // logs akan tersedia di driverStore.logs untuk lookup RFID
    await driverStore.fetchDriverEmpty({ status: 'OUT' })

  } catch {
    qrError.value = 'Gagal membaca data driver'
  }
}

async function onScanQr() {
  await handleQrResult(qrInput.value)
}

// ─── Step 2: RFID Scan ───────────────────────────────────────────────────────
interface RfidRow {
  no_rfid    : string
  no_pallet  : string
  pallet_type: string
  status     : string
  id_log     : number
}

const rfidInput = ref('')
const rfidList  = ref<RfidRow[]>([])
const rfidError = ref('')

function onScanRfid() {
  const raw = rfidInput.value.trim()
  if (!raw) return
  rfidInput.value = ''
  rfidError.value = ''

  // Sudah ada di list → skip
  if (rfidList.value.some(r => r.no_rfid === raw)) {
    rfidError.value = `RFID "${raw}" sudah ada di daftar`
    return
  }

  // ✅ Lookup dari driverStore.logs (status OUT, sudah di-fetch saat scan QR)
  const log = driverStore.logs.find(l => l.no_rfid === raw)

  if (!log) {
    rfidError.value = `RFID "${raw}" tidak ditemukan atau tidak berstatus OUT`
    return
  }

  rfidList.value.push({
    no_rfid    : log.no_rfid,
    no_pallet  : log.no_pallet ?? '',
    pallet_type: log.type      ?? '',
    status     : log.status    ?? 'OUT',
    id_log     : Number(log.id),
  })
}

function removeRfid(index: number) {
  rfidList.value.splice(index, 1)
}

// ─── Step status ─────────────────────────────────────────────────────────────
const step1Done = computed(() => !!qrDriver.value && !!noPolisi.value.trim())
const step2Done = computed(() => rfidList.value.length > 0)

// ─── Submit ───────────────────────────────────────────────────────────────────
const showResult = ref(false)

function validate(): boolean {
  noPolisiError.value = noPolisi.value.trim() ? '' : 'No polisi wajib diisi'
  if (!qrDriver.value)    { qrError.value = 'Scan QR driver terlebih dahulu'; return false }
  if (noPolisiError.value) return false
  if (!rfidList.value.length) return false
  return true
}

async function onSubmit() {
  if (!validate()) return
  showResult.value = false

  driverStore.form.no_polisi   = noPolisi.value.trim()
  driverStore.form.nik_pic     = nikMengetahui.value.trim()
  driverStore.form.pallet_rows = rfidList.value.map((r, i) => ({
    rowIndex  : i + 1,
    type      : r.pallet_type,
    id_log    : r.id_log,
    no_pallet : r.no_pallet,
    no_rfid   : r.no_rfid,
  }))

  const result = await driverStore.submitDriver()
  if (result) {
    showResult.value = true
    if (result.summary.failed === 0) {
      socket.emit('updateRequestPallet', { status: 'OUT' })
      onReset()
    }
  }
}

function onReset() {
  qrDriver.value      = null
  qrInput.value       = ''
  qrError.value       = ''
  noPolisi.value      = ''
  noPolisiError.value = ''
  nikMengetahui.value = ''
  rfidInput.value     = ''
  rfidList.value      = []
  rfidError.value     = ''
  showResult.value    = false
  driverStore.resetForm()
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
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">

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

          <!-- NIK Mengetahui -->
          <div>
            <label class="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              NIK Mengetahui
            </label>
            <input
              v-model="nikMengetahui"
              type="text"
              placeholder="NIK yang mengetahui…"
              class="w-full px-3 py-2 text-sm border rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-600 focus:ring-blue-300"
            />
          </div>

        </div>
      </div>
    </div>

    <!-- ══════════════════════════════
         STEP 2 — SCAN RFID PALLET
    ═══════════════════════════════ -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">

      <div class="flex items-center gap-3 px-5 py-3.5 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
        <span
          class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold text-white shrink-0"
          :class="step2Done ? 'bg-green-600' : 'bg-blue-600'"
        >
          <svg v-if="step2Done" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <span v-else>2</span>
        </span>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Scan RFID pallet</span>
        <span v-if="rfidList.length" class="ml-auto text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full font-medium">
          {{ rfidList.length }} pallet
        </span>
      </div>

      <div class="px-5 pt-5 pb-4">
        <div class="max-w-sm">
          <p v-if="rfidError" class="mt-1 text-xs text-red-500">{{ rfidError }}</p>
          <label class="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            No RFID <span class="text-red-500">*</span>
          </label>
          <input
            v-model="rfidInput"
            type="text"
            placeholder="Scan RFID pallet…"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            @keyup.enter="onScanRfid"
          />
        </div>
      </div>

      <!-- Tabel Desktop -->
      <div v-if="rfidList.length" class="hidden md:block overflow-x-auto border-t border-gray-100 dark:border-gray-700">
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
              v-for="(row, i) in rfidList"
              :key="row.no_rfid"
              class="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <td class="px-4 py-3 text-xs text-gray-400 text-center">{{ i + 1 }}</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{{ row.no_rfid }}</td>
              <td class="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">{{ row.no_pallet }}</td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{{ row.pallet_type }}</td>
              <td class="px-4 py-3 text-center">
                <button type="button" class="text-red-400 hover:text-red-600 transition-colors" @click="removeRfid(i)">
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
      <div v-if="rfidList.length" class="md:hidden divide-y divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
        <div v-for="(row, i) in rfidList" :key="row.no_rfid" class="p-4 flex items-start justify-between gap-3">
          <div class="flex-1 grid grid-cols-2 gap-y-1.5 text-sm">
            <span class="text-gray-500 dark:text-gray-400 text-xs">No RFID</span>
            <span class="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{{ row.no_rfid }}</span>
            <span class="text-gray-500 dark:text-gray-400 text-xs">No Pallet</span>
            <span class="font-medium text-gray-800 dark:text-gray-100">{{ row.no_pallet }}</span>
            <span class="text-gray-500 dark:text-gray-400 text-xs">Type</span>
            <span class="text-gray-700 dark:text-gray-300">{{ row.pallet_type }}</span>
          </div>
          <button type="button" class="text-red-400 hover:text-red-600 mt-1 shrink-0" @click="removeRfid(i)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="!rfidList.length" class="px-5 pb-5 text-sm text-gray-400 dark:text-gray-500">
        Belum ada pallet yang di scan.
      </div>

      <!-- Footer Action -->
      <div
        v-if="rfidList.length"
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-4 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
      >
        <div v-if="driverStore.error" class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          {{ driverStore.error }}
        </div>
        <div v-else class="text-xs text-gray-400 dark:text-gray-500">{{ rfidList.length }} pallet akan disimpan</div>

        <div class="flex gap-2 sm:ml-auto">
          <button
            type="button"
            class="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
            @click="onReset"
          >Reset</button>
          <button
            type="button"
            class="flex-1 sm:flex-none px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed transition-colors"
            :disabled="!step1Done || !step2Done"
            @click="onSubmit"
          >Simpan data driver</button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════
         RESULT ALERT
    ═══════════════════════════════ -->
    <div
      v-if="showResult && driverStore.lastResult"
      class="rounded-xl border p-4"
      :class="driverStore.lastResult.summary.failed === 0
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'"
    >
      <div class="flex items-start gap-3">
        <svg
          class="w-5 h-5 mt-0.5 shrink-0"
          :class="driverStore.lastResult.summary.failed === 0 ? 'text-green-600' : 'text-amber-600'"
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path v-if="driverStore.lastResult.summary.failed === 0"
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
          <path v-else
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="flex-1">
          <p
            class="text-sm font-medium"
            :class="driverStore.lastResult.summary.failed === 0 ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'"
          >
            {{ driverStore.lastResult.summary.success }} data berhasil disimpan
            <span v-if="driverStore.lastResult.summary.failed"> · {{ driverStore.lastResult.summary.failed }} gagal</span>
          </p>
          <ul v-if="driverStore.lastResult.errors.length" class="mt-1 text-xs text-amber-700 dark:text-amber-400 list-disc list-inside">
            <li v-for="err in driverStore.lastResult.errors" :key="err.id">
              ID {{ err.id }}: {{ err.reason }}
            </li>
          </ul>
        </div>
        <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="showResult = false">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
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