import { defineStore } from 'pinia'
import { useNotificationStore } from '@/stores/notification'
import { useUtilityStore } from '@/stores/utility'
import { useConfigStore } from '@/stores/config'
import { workingDayService } from '@/services/Logistik/IFP/Report/WorkingDayService'
import { useAuthStore } from '@/stores/auth';
import type {
  WorkingDayState,
  WorkingDayFilter,
  WorkingDayDetail,
  WorkingDayHeader,
} from '@/types/Logistik/IFP/Report/WorkingDay'
const authStore = useAuthStore();

export const useWorkingDayStore = defineStore('workingDay', {
  state: (): WorkingDayState => ({
    data: [],
    header: null,
    loading: false,
    error: null,  
      permissions: {
      create: authStore.checkAccess("Marketing.Create.Monthly.WorkingDay"),
      
    },
  }),

  getters: {
    hasData: (state): boolean => state.data.length > 0,

    groupedByCustomer: (state): Map<string, WorkingDayDetail[]> => {
      const map = new Map<string, WorkingDayDetail[]>()
      for (const item of state.data) {
        const key = item.customer_name
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(item)
      }
      return map
    },
  },

  actions: {
    async fetchWorkingDay(filter: WorkingDayFilter): Promise<void> {
      const notificationStore = useNotificationStore()
      const utilityStore = useUtilityStore()

      this.loading = true
      this.error = null
      this.header = null
      this.data = []

      try {
        const response = await workingDayService.getWorkingDay(filter)
        this.header = response.header ?? null
        this.data = response.details ?? []
      } catch (err: unknown) {
        const status = (err as any)?.response?.status
        if (status === 404) {
          this.data = []
          this.header = null
          return
        }
        const msg = err instanceof Error ? err.message : 'Gagal memuat data Working Day'
        this.error = msg
        notificationStore.showDialogError('Error', msg)
      } finally {
        this.loading = false
      }
    },

async uploadWorkingDay(file: File, filter?: WorkingDayFilter): Promise<void> {
  const notificationStore = useNotificationStore()

  this.loading = true
  this.error = null

  try {
    await workingDayService.uploadWorkingDay(file)
    notificationStore.showDialogSuccess('Success', 'Upload Working Calendar berhasil!')
    if (filter) {
      await this.fetchWorkingDay(filter)
    }
  } catch (err: unknown) {
    const axiosError = err as any
    const responseData = axiosError?.response?.data

    // Jika 400 dengan body JSON dari API → lempar langsung tanpa notifikasi
    if (responseData && responseData.success === false) {
      this.error = responseData.message ?? 'Upload gagal'
      throw err
    }

    // Error lain (network, 500, dll) → tampilkan notifikasi
    const msg = err instanceof Error ? err.message : 'Upload gagal'
    this.error = msg
    notificationStore.showDialogError('Error', msg)
    throw err
  } finally {
    this.loading = false
  }
},

    downloadFormat(type?: string): void {
      const configStore = useConfigStore()
      workingDayService.downloadFormat(type)
    },

    reset(): void {
      this.data = []
      this.header = null
      this.loading = false
      this.error = null
    },
  },
})