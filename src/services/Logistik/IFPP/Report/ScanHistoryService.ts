import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { ScanHistoryItem, AreaType } from '@/types/Logistik/IFPP/Report/ScanHistory';

interface FetchScanHistoryParams {
  category_scan?: string | null;
  date_from?: string | null;
  shift_start?: number | string | null;
  date_to?: string | null;
  shift_end?: number | string | null;
}

export const useScanHistoryIFPPService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifpp`;

  const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.messages || error.message || 'Terjadi kesalahan pada server';
      throw new Error(message);
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  };

  const fetchScanHistory = async (area: AreaType, params: FetchScanHistoryParams = {}): Promise<ScanHistoryItem[]> => {
    try {
      const response = await axios.get<unknown>(`${apiUrl}/history_scan_ifpp_v2`, {
        params: {
          area,
          category_scan: params.category_scan || null,
          date_from: params.date_from || null,
          shift_start: params.shift_start || null,
          date_to: params.date_to || null,
          shift_end: params.shift_end || null
        }
      });

      if (response.status === 200) {
        const data = response.data;

        if (Array.isArray(data)) return data as ScanHistoryItem[];
        if (data && typeof data === 'object') return Object.values(data) as ScanHistoryItem[];
      }

      return [];
    } catch (error) {
      handleError(error);
      throw error
    }
  };

  return {
    fetchScanHistory
  };
};