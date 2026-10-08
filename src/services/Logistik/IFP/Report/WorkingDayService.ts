import axios from 'axios'
import { useConfigStore } from '@/stores/config';
import type {
  WorkingDayFilter,
  WorkingDayResponse,
  UploadResponse,
} from '@/types/Logistik/IFP/Report/WorkingDay'

const getBaseUrl = (): string => {
  const configStore = useConfigStore()
  return `http://${configStore.apiUrl}/majsf_rest_api/api/WorkingDay`
}

export const workingDayService = {
  async getWorkingDay(filter: WorkingDayFilter): Promise<WorkingDayResponse> {
    const response = await axios.get<WorkingDayResponse>(`${getBaseUrl()}/get_data`, {
      params: filter,
    })
    return response.data
  },
  async uploadWorkingDay(file: File): Promise<UploadResponse> {
    if (!file) throw new Error('File tidak ditemukan!')

    const formData = new FormData()
    formData.append('file_excel', file)

    const response = await axios.post<UploadResponse>(`${getBaseUrl()}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    if (response.data.status === false) {
      throw new Error(response.data.message || 'Upload gagal')
    }

    return response.data
  },
  downloadFormat(type?: string): void {
    const configStore = useConfigStore()
    const url = `http://${configStore.apiUrl}/majsf_rest_api/api/WorkingDay/download_format${type ? `?type=${type}` : ''}`
    window.location.href = url
  },
}