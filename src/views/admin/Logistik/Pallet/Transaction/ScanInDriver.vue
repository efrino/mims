<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'
import QrScanner from 'qr-scanner'
import { useLogsDriverInStore } from '@/stores/Logistik/Pallet/DriverIn'
import { useCombineStore } from '@/stores/Logistik/MasterData/CombinePallet'
import { usePalletService } from '@/services/Logistik/MasterData/CombinePallet'
import { usePalletLogService } from '@/services/Logistik/Pallet/ScanInPalletService'
import { useMasterDriver } from '@/services/Logistik/MasterData/MasterDriver'
import { useNotificationStore } from '@/stores/notification'
import socket from '@/plugins/socket'
import type { PalletItem } from '@/types/Logistik/MasterData/CombinePallet'
import type { DriverItem } from '@/types/Logistik/MasterData/MasterDriver'

interface PalletItemWithError extends PalletItem {
  errorMessage?: string
}

const driverInStore    = useLogsDriverInStore()
const combineStore     = useCombineStore()
const palletService    = usePalletService()
const palletLogService = usePalletLogService()
const masterDriverSvc  = useMasterDriver()
const notificationStore = useNotificationStore()

// ─── Step 0: Scan Driver ──────────────────────────────────────────────────────
const qrInput   = ref('')
const qrDriver  = ref<DriverItem | null>(null)
const qrError   = ref('')

// Camera modal
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
    (result) => { stopCamera(); handleQrResult(result.data) },
    {
      preferredCamera        : 'environment',
      highlightScanRegion    : true,
      highlightCodeOutline   : true,
      maxScansPerSecond      : 10,
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
  scanner?.stop(); scanner?.destroy()
  scanner = null; cameraOpen.value = false; cameraError.value = ''
}

onUnmounted(stopCamera)

async function handleQrResult(raw: string) {
  const val = raw.trim()
  if (!val) return
  qrError.value  = ''
  qrDriver.value = null
  qrInput.value  = ''
  try {
    const list  = await masterDriverSvc.fetchMasterDriver()
    const found = list.find(d => d.nik === val)
    if (!found) { qrError.value = `Driver "${val}" tidak ditemukan`; return }
    qrDriver.value = found
    driverInStore.fillDriverFromMaster(found)
  } catch {
    qrError.value = 'Gagal membaca data driver'
  }
}

async function onScanQr() {
  await handleQrResult(qrInput.value)
}

// ─── Step 1: Scan RFID ────────────────────────────────────────────────────────
const inputId      = ref('')
const listPalletIN = ref<PalletItemWithError[]>([])
const isSaving     = ref(false)
const nikPenerima  = ref('')

const driverReady = computed(() => !!qrDriver.value && !!driverInStore.noPolisi.trim())

const handleScanInput = async () => {
  const no_rfid = inputId.value.trim()
  if (!no_rfid) return

  if (!driverReady.value) {
    notificationStore.showDialogWarning('Driver Belum Terisi', 'Scan QR driver dan isi No. Polisi terlebih dahulu')
    inputId.value = ''
    return
  }

  const isDuplicate = listPalletIN.value.some(item => item.no_rfid === no_rfid)
  if (isDuplicate) {
    notificationStore.showDialogWarning('Duplikat', `NO RFID ${no_rfid} sudah ada di dalam list`)
    inputId.value = ''
    return
  }

  try {
    notificationStore.loading = true
    const data = await palletService.fetchMasterPallet(undefined, no_rfid)

    if (!data || data.length === 0) {
      notificationStore.showDialogWarning('Tidak Ditemukan', `NO RFID ${no_rfid} tidak ditemukan`)
      inputId.value = ''
      return
    }

    const pallet = data[0]

    if (listPalletIN.value.some(item => item.no_rfid === pallet.no_rfid)) {
      notificationStore.showDialogWarning('Duplikat', `Pallet No. ${pallet.no_pallet} (${pallet.type}) sudah ada di dalam list`)
      inputId.value = ''
      return
    }

    if (pallet.status === 'IN') {
      notificationStore.showDialogWarning('Status Sudah IN', `Pallet No. ${pallet.no_pallet} Type ${pallet.type} status sudah IN`)
      inputId.value = ''
      return
    }

    listPalletIN.value.push({ ...pallet } as PalletItemWithError)
    inputId.value = ''
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal mengambil data pallet'
    notificationStore.showDialogError('Gagal Fetch', msg)
  } finally {
    notificationStore.loading = false
  }
}

const removeFromList = (index: number) => {
  listPalletIN.value.splice(index, 1)
}

// ─── Submit ───────────────────────────────────────────────────────────────────
const saveAll = async () => {
  if (listPalletIN.value.length === 0) return
  if (!driverReady.value) {
    notificationStore.showDialogWarning('Driver Belum Terisi', 'Scan QR driver dan isi No. Polisi terlebih dahulu')
    return
  }

  isSaving.value = true
  notificationStore.loading = true

  const driver = {
    nik          : driverInStore.nik,
    nama_driver  : driverInStore.namaDriver,
    nama_lp      : driverInStore.namaLp,
    no_polisi    : driverInStore.noPolisi,
    nik_pic      : nikPenerima.value.trim(),
  }

  try {
    const results = await Promise.allSettled(
      listPalletIN.value.map(async (item) => {
        // Step 1: update is_active di combine_pallet
        combineStore.loadFormPallet('Edit', item)
        combineStore.updateFormData('is_active', item.is_active)
        await combineStore.onSavePallet()

        // Step 2: scan IN via log_post — hanya pallet OK (is_active=1) yang lolos validasi backend
        await palletLogService.submitScanInWithDriver(
          {
            ms_pallet_id: item.id,
            no_rfid     : item.no_rfid,
            no_pallet   : item.no_pallet,
            type        : item.type,
            status      : 'IN',
            category    : item.category || '',
            customer    : item.customer || '',
            id_label    : item.id_label || '',
          },
          driver
        )
      })
    )

    const failed: PalletItemWithError[] = []
    results.forEach((res, i) => {
      if (res.status === 'rejected') {
        const msg = res.reason instanceof Error ? res.reason.message : 'Gagal'
        // Pallet NG backend tolak dengan pesan "Pallet is NG" — bukan error sejati, hanya skip
        const isNgReject = msg.toLowerCase().includes('ng')
        if (!isNgReject) {
          failed.push({ ...listPalletIN.value[i], errorMessage: msg })
        }
      }
    })

    if (failed.length > 0) {
      listPalletIN.value = failed
      notificationStore.showDialogError('Sebagian Gagal', `${failed.length} pallet gagal diproses`)
    } else {
      const okCount   = listPalletIN.value.filter(i => i.is_active === '1').length
      const ngncCount = listPalletIN.value.filter(i => i.is_active !== '1').length
      listPalletIN.value = []
      socket.emit('updateRequestPallet', { status: 'IN' })
      notificationStore.showDialogSuccess(
        'Berhasil',
        `${okCount} pallet berhasil scan-IN dengan driver${ngncCount > 0 ? `, ${ngncCount} pallet status diperbarui (NG/NC)` : ''}`
      )
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal menyimpan data'
    notificationStore.showDialogError('Gagal Simpan', msg)
  } finally {
    notificationStore.loading = false
    isSaving.value = false
  }
}

function onReset() {
  qrDriver.value     = null
  qrInput.value      = ''
  qrError.value      = ''
  listPalletIN.value = []
  inputId.value      = ''
  nikPenerima.value  = ''
  driverInStore.reset()
}
</script>

<template>
  <div class="w-full flex flex-col justify-center items-center gap-10">

    <!-- ══════════════════════════════
         IDENTITAS DRIVER
    ═══════════════════════════════ -->
    <div class="w-full p-4 sm:p-6 bg-white border border-gray-200 rounded-xl shadow">
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Identitas Driver</h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-start">

        <!-- Scan QR Driver -->
        <div>
          <label class="block mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Scan QR Driver <span class="text-red-500">*</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="qrInput"
              type="text"
              placeholder="Scan / ketik NIK…"
              class="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:outline-none focus:ring-2"
              :class="qrError ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-300'"
              @keyup.enter="onScanQr"
            />
            <button
              type="button"
              title="Buka kamera"
              class="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-400 text-gray-500 hover:text-blue-600 transition-colors"
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
          <label class="block mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">NIK</label>
          <div class="px-3 py-2 text-sm rounded-lg bg-gray-200 border border-gray-300 text-gray-700 min-h-[38px] truncate">
            {{ qrDriver?.nik || '—' }}
          </div>
        </div>

        <!-- Nama Driver readonly -->
        <div>
          <label class="block mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Nama Driver</label>
          <div class="px-3 py-2 text-sm rounded-lg bg-gray-200 border border-gray-300 text-gray-700 min-h-[38px] truncate">
            {{ qrDriver?.nama_driver || '—' }}
          </div>
        </div>

        <!-- No Polisi -->
        <div>
          <label class="block mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
            No Polisi <span class="text-red-500">*</span>
          </label>
          <input
            v-model="driverInStore.noPolisi"
            type="text"
            placeholder="B 1234 XYZ"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <!-- NIK Penerima -->
        <div>
          <label class="block mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
            NIK Penerima
          </label>
          <input
            v-model="nikPenerima"
            type="text"
            placeholder="NIK penerima…"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <!-- Scan RFID -->
        <div>
          <label for="id_pallet" class="block mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Scan RFID Pallet
          </label>
          <input
            id="id_pallet"
            v-model="inputId"
            type="text"
            placeholder="Scan Pallet…"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
            @keydown.enter="handleScanInput"
          />
        </div>

      </div>
    </div>

    <!-- ══════════════════════════════
         LIST TABLE
    ═══════════════════════════════ -->
    <div class="w-full bg-white shadow-md rounded-xl p-4 sm:p-6">
      <div class="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div class="flex items-center gap-3">
          <h1 class="font-semibold text-lg sm:text-xl text-gray-600">
            List RFID Pallet (Scan IN Driver)
          </h1>
          <span class="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
            Total: {{ listPalletIN.length }}
          </span>
        </div>
        <div class="flex gap-2 sm:ml-auto">
          <button
            v-if="listPalletIN.length > 0"
            type="button"
            @click="onReset"
            class="flex items-center justify-center gap-2 font-medium rounded-full text-sm px-4 py-2 transition-all bg-gray-200 hover:bg-gray-300 text-gray-700"
          >
            Reset
          </button>
          <button
            :disabled="listPalletIN.length === 0 || isSaving || !driverReady"
            type="button"
            @click="saveAll"
            class="flex items-center justify-center gap-2 text-white font-medium rounded-full text-sm px-4 py-2 transition-all duration-200"
            :class="listPalletIN.length > 0 && !isSaving && driverReady ? 'bg-blue-600 hover:bg-blue-800' : 'bg-gray-400 cursor-not-allowed'"
          >
            <svg v-if="isSaving" aria-hidden="true" role="status" class="inline w-4 h-4 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 50.5908Z" fill="#E5E7EB"/>
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
            </svg>
            {{ isSaving ? 'Menyimpan...' : 'Save' }}
          </button>
        </div>
      </div>

      <!-- Desktop Table -->
      <div class="hidden md:block w-full">
        <table class="w-full table-fixed text-sm text-left text-gray-500">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th class="px-4 py-3 w-[22%]">No RFID</th>
              <th class="px-4 py-3 w-[18%]">No Pallet</th>
              <th class="px-4 py-3 w-[15%]">Type Pallet</th>
              <th class="px-4 py-3 w-[12%] text-center">Category</th>
              <th class="px-4 py-3 w-[14%] text-center">Status</th>
              <th class="px-4 py-3 w-[11%] text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in listPalletIN"
              :key="item.no_rfid"
              class="border-b"
              :class="item.errorMessage ? 'bg-red-50' : 'bg-white hover:bg-gray-50'"
            >
              <td class="px-4 py-3 align-top">
                <span class="font-medium text-gray-900 break-all">{{ item.no_rfid }}</span>
                <p v-if="item.errorMessage" class="text-xs text-red-500 mt-0.5">{{ item.errorMessage }}</p>
              </td>
              <td class="px-4 py-3 align-top">
                <span class="font-medium text-gray-900 break-words">{{ item.no_pallet }}</span>
              </td>
              <td class="px-4 py-3 align-top break-words">{{ item.type }}</td>
              <td class="px-4 py-3 text-center align-top">{{ item.category || '-' }}</td>
              <td class="px-4 py-3 text-center align-top">
                <select
                  v-model="item.is_active"
                  class="w-full rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 cursor-pointer transition-colors"
                  :class="item.is_active === '1'
                    ? 'border-green-300 bg-green-50 text-green-700 focus:ring-green-400'
                    : item.is_active === '2'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-500'"
                >
                  <option value="2">✗ NC</option>
                  <option value="1">✓ OK</option>
                  <option value="0">✗ NG</option>
                </select>
              </td>
              <td class="px-4 py-3 text-center align-top">
                <button
                  type="button"
                  @click="removeFromList(index)"
                  class="px-3 py-1 text-sm text-red-600 outline outline-1 outline-red-300 rounded-md hover:bg-red-50 transition"
                >
                  Hapus
                </button>
              </td>
            </tr>
            <tr v-if="listPalletIN.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                Scan atau masukan ID Pallet terlebih dulu.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden">
        <p v-if="listPalletIN.length === 0" class="py-8 text-center text-sm text-gray-500">
          Scan atau masukan ID Pallet terlebih dulu.
        </p>
        <div class="flex flex-col gap-3">
          <div
            v-for="(item, index) in listPalletIN"
            :key="item.no_rfid"
            class="rounded-xl border p-4 text-sm shadow-sm"
            :class="item.errorMessage ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'"
          >
            <div v-if="item.errorMessage" class="mb-3 flex items-center gap-2 rounded-md bg-red-100 px-3 py-2 text-xs text-red-600">
              <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              {{ item.errorMessage }}
            </div>
            <div class="flex items-start justify-between gap-2 mb-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">No RFID</p>
                <p class="font-semibold text-gray-900 break-all text-sm">{{ item.no_rfid }}</p>
              </div>
              <button type="button" @click="removeFromList(index)" class="shrink-0 px-2.5 py-2 text-xs text-red-600 outline outline-1 outline-red-300 rounded-md hover:bg-red-50 transition">
                Hapus
              </button>
            </div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <p class="font-semibold uppercase tracking-wide text-gray-400 mb-0.5">No Pallet</p>
                <p class="font-medium text-gray-800">{{ item.no_pallet }}</p>
              </div>
              <div>
                <p class="font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Type Pallet</p>
                <p class="text-gray-700 mb-1.5">{{ item.type }}</p>
              </div>
              <div>
                <p class="font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Category</p>
                <p class="text-gray-700">{{ item.category || '-' }}</p>
              </div>
              <div>
                <select
                  v-model="item.is_active"
                  class="w-full rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 cursor-pointer transition-colors"
                  :class="item.is_active === '1'
                    ? 'border-green-300 bg-green-50 text-green-700 focus:ring-green-400'
                    : item.is_active === '2'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-500'"
                >
                  <option value="2">✗ NC</option>
                  <option value="1">✓ OK</option>
                  <option value="0">✗ NG</option>
                </select>
              </div>
            </div>
          </div>
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
          <div class="relative bg-black aspect-square">
            <video ref="videoEl" class="w-full h-full object-cover" autoplay playsinline muted/>
          </div>
          <div v-if="cameraError" class="px-4 py-3 bg-red-900/40 text-red-300 text-sm text-center">{{ cameraError }}</div>
          <div v-else class="px-4 py-3 text-gray-400 text-xs text-center">Arahkan kamera ke QR Code driver</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cam-fade-enter-active,
.cam-fade-leave-active { transition: opacity 0.2s ease; }
.cam-fade-enter-active .relative,
.cam-fade-leave-active .relative { transition: transform 0.2s ease, opacity 0.2s ease; }
.cam-fade-enter-from,
.cam-fade-leave-to { opacity: 0; }
.cam-fade-enter-from .relative { transform: scale(0.95) translateY(8px); opacity: 0; }

:deep(.scan-region-highlight) { border-radius: 12px; }
:deep(.scan-region-highlight-svg) { stroke: #60a5fa !important; }
:deep(.code-outline-highlight) { stroke: #34d399 !important; }
</style>
