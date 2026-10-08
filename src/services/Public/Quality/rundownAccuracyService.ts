import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { useConfigStore } from '@/stores/config';
import type { RundownAccuracyItem, RundownAccuracyDetailItem } from '@/types/Public/Quality/rundownAccuracy';

const getBaseUrl = (): string => {
  const configStore = useConfigStore();
  const apiUrl = configStore.apiUrl;
  return apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
};

export class RundownAccuracyService {
  async getRundownAccuracy(): Promise<RundownAccuracyItem[]> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/quality/rundown_accuracy/quality_accu`;

      const response: AxiosResponse<RundownAccuracyItem[]> = await axios.get(url);

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown accuracy');
    } catch (error) {
      console.error('API Error getRundownAccuracy:', error);
      throw error;
    }
  }

  async getAccuracyDetail(
    customer: string,
    model: string,
    projectDetail: string | null,
    category: string,
  ): Promise<RundownAccuracyDetailItem[]> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/quality/rundown_accuracy/item_detail_accuracy`;

      const response: AxiosResponse<RundownAccuracyDetailItem[]> = await axios.get(url, {
        params: {
          customer,
          model,
          project_detail: projectDetail ?? 'NULL',
          category,
        },
      });

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data detail accuracy');
    } catch (error) {
      console.error('API Error getAccuracyDetail:', error);
      throw error;
    }
  }
}
