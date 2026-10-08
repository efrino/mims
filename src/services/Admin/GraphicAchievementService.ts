import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { useConfigStore } from '@/stores/config';
import type { AchievementResponse, RangeDateParams } from '@/types/Admin/GraphicAchievement';

const getBaseUrl = (): string => {
  const configStore = useConfigStore();
  const apiUrl = configStore.apiUrl;
  return apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
};

export const reportStockApi = {
  async fetchAchievementRangeDate(
    params: RangeDateParams, 
    process: 'press' | 'weld' = 'press'
  ): Promise<AchievementResponse> {
    try {
      const baseUrl = getBaseUrl();
      const endpoint = process === 'press' 
        ? '/majsf_rest_api/api/report-stock/range_date'
        : '/majsf_rest_api/api/report-stock/range_date_weld';
      
      const url = `${baseUrl}${endpoint}?start=${params.start}&end=${params.end}&line=${params.line || ''}&cutoff=${params.cutoff || ''}`;
      
      const response: AxiosResponse<AchievementResponse> = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('API Error fetchAchievementRangeDate:', error);
      throw error;
    }
  }
};