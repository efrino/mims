import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { combineResultApi } from '@/services/Logistik/IFP/Report/ListScanShippingService'
import type { CombineResult, CombineFilters } from '@/types/Logistik/IFP/Report/ListScanShipping'

export const useRundownIFPStore = defineStore('rundown-ifp', () => {
  const combineData = ref<CombineResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const totalCombineData = computed(() => combineData.value.length)
  
  const scannedCount = computed(() => 
    combineData.value.filter(item => item.id_label).length
  )

  async function fetchCombine(filters?: CombineFilters) {
    loading.value = true
    error.value = null
    
    try {
      const response = await combineResultApi.getCombineResult(filters)
      
      if (response.status === 'success' && Array.isArray(response.data)) {
        combineData.value = response.data
      } else {
        combineData.value = []
        throw new Error('Invalid response format')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch combine data'
      combineData.value = []
      console.error('Fetch combine error:', err)
    } finally {
      loading.value = false
    }
  }

  function resetState() {
    combineData.value = []
    loading.value = false
    error.value = null
  }

  return {
    combineData,
    loading,
    error,
    totalCombineData,
    scannedCount,
    fetchCombine,
    resetState
  }
})