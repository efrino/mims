import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { useConfigStore } from '@/stores/config';
import type { RundownAccuracyIFPPItem, RundownAccuracyIFPPDetailItem } from '@/types/Public/Quality/rundownAccuracyIFPP';

const getBaseUrl = (): string => {
  const configStore = useConfigStore();
  const apiUrl = configStore.apiUrl;
  return apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
};

export type RundownAccuracyIFPPType = 'inhouse' | 'outhouse';

export class RundownAccuracyIFPPService {
  constructor(private readonly type: RundownAccuracyIFPPType) {}

  async getRundownAccuracy(): Promise<RundownAccuracyIFPPItem[]> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/quality/rundown-accuracy/quality-accu-ifpp-${this.type}`;

      const response: AxiosResponse<RundownAccuracyIFPPItem[]> = await axios.get(url);

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown accuracy IFPP');
    } catch (error) {
      console.error('API Error getRundownAccuracy (IFPP):', error);
      throw error;
    }
  }

  async getAccuracyDetail(
    customer: string,
    model: string,
    projectDetail: string | null,
    category: string,
  ): Promise<RundownAccuracyIFPPDetailItem[]> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/quality/rundown-accuracy/item_detail_accuracy_ifpp`;

      const response: AxiosResponse<RundownAccuracyIFPPDetailItem[]> = await axios.get(url, {
        params: {
          customer,
          model,
          project_detail: projectDetail ?? 'NULL',
          category,
          loc_process: this.type.toUpperCase(),
        },
      });

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data detail accuracy IFPP');
    } catch (error) {
      console.error('API Error getAccuracyDetail (IFPP):', error);
      throw error;
    }
  }
}
