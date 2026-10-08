import { defineStore } from 'pinia'
import { ref } from 'vue'
import { driverService } from '@/services/Logistik/Pallet/logsDriverService'
import { useNotificationStore } from '@/stores/notification'
import type { DriverInPayload, DriverInPalletItem, DriverResponse } from '@/types/Logistik/Pallet/driver'

export const useLogsDriverInStore = defineStore('driverIn', () => {

  const notification = useNotificationStore()
  const error        = ref<string | null>(null)
  const lastResult   = ref<DriverResponse | null>(null)

  // ── Driver identity ────────────────────────────────────────────────────────
  const nik         = ref('')
  const namaDriver  = ref('')
  const namaLp      = ref('')
  const noPolisi    = ref('')

  function fillDriverFromMaster(driver: { nik: string; nama_driver: string; nama_lp: string }) {
    nik.value        = driver.nik
    namaDriver.value = driver.nama_driver
    namaLp.value     = driver.nama_lp
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submitDriverIn(pallets: DriverInPalletItem[]): Promise<DriverResponse | null> {
    if (pallets.length === 0) {
      notification.showAlertWarning('Scan minimal satu pallet terlebih dahulu')
      return null
    }

    notification.loading = true
    error.value = null

    try {
      const payload: DriverInPayload = {
        nik        : nik.value,
        nama_driver: namaDriver.value,
        nama_lp    : namaLp.value,
        no_polisi  : noPolisi.value,
        pallets,
      }

      const result     = await driverService.postDriverIn(payload)
      lastResult.value = result

      if (result.success) {
        const msg = result.summary.failed === 0
          ? `${result.summary.success} data berhasil disimpan`
          : `${result.summary.success} berhasil, ${result.summary.failed} gagal`
        result.summary.failed === 0
          ? notification.showAlertSuccess(msg)
          : notification.showAlertWarning(msg)
      } else {
        notification.showAlertError(result.messages ?? 'Gagal menyimpan scan in driver')
      }

      return result
    } catch (err: any) {
      const msg = err?.response?.data?.messages ?? 'Gagal menyimpan scan in driver'
      error.value = msg
      notification.showAlertError(msg)
      return null
    } finally {
      notification.disableLoading()
    }
  }

  function reset() {
    nik.value        = ''
    namaDriver.value = ''
    namaLp.value     = ''
    noPolisi.value   = ''
    lastResult.value = null
    error.value      = null
  }

  return {
    nik, namaDriver, namaLp, noPolisi,
    error, lastResult,
    fillDriverFromMaster, submitDriverIn, reset,
  }
})
