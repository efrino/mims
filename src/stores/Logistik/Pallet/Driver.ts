import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { driverService } from '@/services/Logistik/Pallet/logsDriverService'
import { useNotificationStore } from '@/stores/notification'
import type {
  DriverFilter, DriverPayload, DriverResponse,
  LogPallet, PalletRow, DriverDeliveryForm,
} from '@/types/Logistik/Pallet/driver'

export const useLogsDriverStore = defineStore('driver', () => {

  const logs          = ref<LogPallet[]>([])
  const customerList  = ref<string[]>([])
  const notification = useNotificationStore()
  const error         = ref<string | null>(null)
  const lastResult    = ref<DriverResponse | null>(null)

  const form = ref<DriverDeliveryForm>({
    nik: '', nama_driver: '', nama_lp: '',
    no_polisi: '', nik_pic: '', customer: '',
    jumlah_pallet: 0, pallet_rows: [],
  })

  // Log yang belum dipilih baris lain
const availableLogsForRow = computed(() => (currentRowLogId: number | null, type: string) => {
  const usedIds = form.value.pallet_rows
    .map(r => r.id_log)
    .filter(id => id !== null && Number(id) !== Number(currentRowLogId))
    .map(id => Number(id))

  return logs.value.filter(log =>
    !usedIds.includes(Number(log.id)) && log.type === type
  )
})

  const selectedRowIds = computed(() =>
    form.value.pallet_rows
      .map(r => r.id_log)
      .filter((id): id is number => id !== null)
  )

  const filledRowCount = computed(() =>
    form.value.pallet_rows.filter(r => r.type).length
  )

  const typeList = computed(() => [
  ...new Set(
    logs.value
      .map(l => l.type)
      .filter((t): t is string => !!t && t.trim() !== '')
  )
].sort())

  // Watcher jumlah pallet → generate rows
  watch(() => form.value.jumlah_pallet, (newVal) => {
    const count   = Math.max(0, newVal)
    const current = form.value.pallet_rows
    if (count > current.length) {
      for (let i = current.length; i < count; i++) {
        current.push({ rowIndex: i + 1, type: '', id_log: null, no_pallet: '', no_rfid: '' })
      }
    } else {
      form.value.pallet_rows = current.slice(0, count)
    }
  })

  watch(() => form.value.customer, (val) => {
    if (val) {
      fetchDriverEmpty({ customer: val, status: 'OUT' }) // tambah status OUT
      form.value.pallet_rows = form.value.pallet_rows.map(r => ({
        ...r, type: '', id_log: null, no_pallet: '', no_rfid: '',
      }))
    } else {
      logs.value = []
    }
  })
 // Ganti fungsi fetchCustomerList yang lama dengan ini
async function fetchCustomerList() {
  notification.loading = true
  try {
    const allLogs      = await driverService.getAllDriverEmpty()
    // Extract unique customer dari logs, buang yang kosong, sort A-Z
    customerList.value = [
      ...new Set(
        allLogs
          .map(l => l.customer)
          .filter((c): c is string => !!c && c.trim() !== '')
      )
    ].sort()
  } catch {
    customerList.value = []
  } finally {
    notification.loading = false
  }
}

  async function fetchDriverEmpty(filter?: DriverFilter) {
    notification.loading = true
    error.value   = null
    try {
      logs.value = await driverService.getDriverEmpty(filter)
    } catch (err: any) {
      error.value = err?.response?.data?.messages ?? 'Gagal mengambil data log'
    } finally {
      notification.loading = false
    }
  }

  function selectPalletForRow(rowIndex: number, idLog: number | null) {
    const row = form.value.pallet_rows.find(r => r.rowIndex === rowIndex)
    if (!row) return
    if (!idLog) { row.id_log = null; row.no_pallet = ''; row.no_rfid = ''; return }
    const log = logs.value.find(l => Number(l.id) === Number(idLog))
    if (log) { row.id_log = Number(log.id); row.no_pallet = log.no_pallet ?? ''; row.no_rfid = log.no_rfid;}
  }

  function onTypeChange(rowIndex: number) {
  const row = form.value.pallet_rows.find(r => r.rowIndex === rowIndex)
  if (!row) return
  // Reset pilihan pallet saat type berubah
  row.id_log    = null
  row.no_pallet = ''
  row.no_rfid   = ''
}

  function fillDriverFromMaster(driver: { nik: string; nama_driver: string; nama_lp: string }) {
    form.value.nik         = driver.nik
    form.value.nama_driver = driver.nama_driver
    form.value.nama_lp     = driver.nama_lp
  }

  async function submitDriver(): Promise<DriverResponse | null> {
    if (selectedRowIds.value.length === 0) {
      notification.showAlertWarning('Pilih minimal satu pallet')
      error.value = 'Pilih minimal satu pallet'
      return null
    }

    notification.loading = true
    error.value          = null

    try {
      const payload: DriverPayload = {
        nik        : form.value.nik,
        nama_driver: form.value.nama_driver,
        nama_lp    : form.value.nama_lp,
        no_polisi  : form.value.no_polisi,
        nik_pic    : form.value.nik_pic,
        ids        : selectedRowIds.value,
      }
      const result     = await driverService.postDriver(payload)
      lastResult.value = result

      if (result.success) {
        const msg = result.summary.failed === 0
          ? `${result.summary.success} data berhasil disimpan`
          : `${result.summary.success} berhasil, ${result.summary.failed} gagal`
        result.summary.failed === 0
          ? notification.showAlertSuccess(msg)
          : notification.showAlertWarning(msg)
      } else {
        notification.showAlertError(result.messages ?? 'Gagal menyimpan data driver')
      }

      if (result.success_ids?.length) {
        logs.value = logs.value.filter(l => !result.success_ids.includes(l.id))
        form.value.pallet_rows = form.value.pallet_rows.map(r =>
          r.id_log && result.success_ids.includes(r.id_log)
            ? { ...r, type: '', id_log: null, no_pallet: '', no_rfid: '' }
            : r
        )
      }

      return result
    } catch (err: any) {
      const msg = err?.response?.data?.messages ?? 'Gagal menyimpan data driver'
      error.value = msg
      notification.showAlertError(msg)
      return null
    } finally {
      notification.disableLoading()
    }
  }

  function resetForm() {
    form.value = {
      nik: '', nama_driver: '', nama_lp: '',
      no_polisi: '', nik_pic: '', customer: '',
      jumlah_pallet: 0, pallet_rows: [],
    }
    logs.value       = []
    lastResult.value = null
    error.value      = null
  }

  return {
    logs, customerList, typeList, error, lastResult, form,
    availableLogsForRow, selectedRowIds, filledRowCount,
    fetchCustomerList, fetchDriverEmpty, onTypeChange,
    selectPalletForRow, fillDriverFromMaster,
    submitDriver, resetForm,
  }
})