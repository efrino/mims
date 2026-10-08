import axios from 'axios'
import { useConfigStore } from '@/stores/config'

const getBaseUrl = () => {
  const configStore = useConfigStore()
  const apiUrl = configStore.apiUrl
  return apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`
}

export const combineResultApi = {
  async getCombineResult(filters = {}) {
    try {
      const baseUrl = getBaseUrl()
      const queryString = new URLSearchParams(filters).toString()
      const url = `${baseUrl}/majsf_rest_api/api/ScanCombinedTag/getCombineResult${queryString ? `?${queryString}` : ''}`
      
      const response = await axios.get(url)
      return response.data
    } catch (error) {
      throw error
    }
  }
}