import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getQuotContractData, getSalesMonthlyData, getQuotationMonthlyData } from '@/services/Marketing/QuotContractService'
import { useAuthStore } from '@/stores/auth'

export const useQuotContractStore = defineStore('quotContract', () => {
  const authStore = useAuthStore()

  const items = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const quotationSummary = ref<any[]>([])
  const quotationDetail = ref<any[]>([])

  // Multi-period caches for instant switching without re-fetching
  const salesCache = new Map<string, any[]>()
  const quotationDetailCache = new Map<string, any[]>()
  
  // In-flight promise tracking to prevent duplicate concurrent SAP calls
  const inFlightSales = new Map<string, Promise<any[]>>()
  const inFlightQuotation = new Map<string, Promise<any[]>>()

  const loadedSalesPeriod = ref<string | null>(null)
  const loadedQuotationPeriod = ref<string | null>(null)

  const permissions = computed(() => {
    const isAdmin = authStore.group === '1' || authStore.user?.username === 'administrator'
    return {
      create: isAdmin || authStore.checkAccess('Marketing.Create.Monthly.QuotContract')
    }
  })

  async function fetchSalesItems(period: string, force = false) {
    if (!force && salesCache.has(period)) {
      const cached = salesCache.get(period)!
      items.value = cached
      quotationSummary.value = cached
      loadedSalesPeriod.value = period
      return cached
    }

    if (inFlightSales.has(period)) {
      return inFlightSales.get(period)!
    }

    loading.value = true
    error.value = null

    const promise = (async () => {
      try {
        const data = await getSalesMonthlyData(period)
        salesCache.set(period, data)
        items.value = data
        quotationSummary.value = data
        loadedSalesPeriod.value = period
        return data
      } catch (e: any) {
        console.error('Error in fetchSalesItems:', e)
        error.value = e.message || 'Gagal memuat data Kontrak'
        items.value = []
        quotationSummary.value = []
        throw e
      } finally {
        inFlightSales.delete(period)
        loading.value = false
      }
    })()

    inFlightSales.set(period, promise)
    return promise
  }

  async function fetchQuotationItems(period: string, force = false) {
    if (!force && quotationDetailCache.has(period)) {
      const cached = quotationDetailCache.get(period)!
      quotationDetail.value = cached
      loadedQuotationPeriod.value = period
      return cached
    }

    if (inFlightQuotation.has(period)) {
      return inFlightQuotation.get(period)!
    }

    loading.value = true
    error.value = null

    const promise = (async () => {
      try {
        const details = await getQuotationMonthlyData(period)
        quotationDetailCache.set(period, details)
        quotationDetail.value = details
        loadedQuotationPeriod.value = period
        return details
      } catch (e: any) {
        console.error('Error in fetchQuotationItems:', e)
        error.value = e.message || 'Gagal memuat data Quotation'
        quotationDetail.value = []
        throw e
      } finally {
        inFlightQuotation.delete(period)
        loading.value = false
      }
    })()

    inFlightQuotation.set(period, promise)
    return promise
  }

  async function fetchItems(period: string, force = false) {
    if (!force && salesCache.has(period) && quotationDetailCache.has(period)) {
      const sales = salesCache.get(period)!
      const quot = quotationDetailCache.get(period)!
      items.value = sales
      quotationSummary.value = sales
      quotationDetail.value = quot
      loadedSalesPeriod.value = period
      loadedQuotationPeriod.value = period
      return {
        data: sales,
        quotationSummary: sales,
        quotationDetail: quot
      }
    }

    loading.value = true
    error.value = null
    try {
      const [salesData, quotationData] = await Promise.all([
        fetchSalesItems(period, force),
        fetchQuotationItems(period, force)
      ])
      return {
        data: salesData,
        quotationSummary: salesData,
        quotationDetail: quotationData
      }
    } catch (e: any) {
      console.error('Error in fetchItems:', e)
      error.value = e.message || 'Gagal memuat data Quotation-Contract'
      items.value = []
      quotationSummary.value = []
      quotationDetail.value = []
    } finally {
      loading.value = false
    }
  }

  function clearCache() {
    salesCache.clear()
    quotationDetailCache.clear()
    inFlightSales.clear()
    inFlightQuotation.clear()
    loadedSalesPeriod.value = null
    loadedQuotationPeriod.value = null
  }

  return {
    items,
    quotationSummary,
    quotationDetail,
    loading,
    error,
    permissions,
    loadedSalesPeriod,
    loadedQuotationPeriod,
    fetchSalesItems,
    fetchQuotationItems,
    fetchItems,
    clearCache
  }
})
