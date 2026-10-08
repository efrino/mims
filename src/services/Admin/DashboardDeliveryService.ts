// services/Admin/DashboardDeliveryService.ts
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { useConfigStore } from '@/stores/config';
import type { CycleHierarchy, DeliveryPlanActualItem } from '@/types/Admin/DashboardDelivery';

const getBaseUrl = (): string => {
  const configStore = useConfigStore();
  const apiUrl = configStore.apiUrl;
  return apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
};

export const deliveryPlanActualApi = {
  async fetchDeliveryPlanActual(): Promise<DeliveryPlanActualItem[]> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/report_delivery/delivery_plan_actual`;

      // console.log('Fetching URL:', url);

      const response: AxiosResponse<DeliveryPlanActualItem[]> = await axios.get(url);

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data delivery plan actual');
    } catch (error) {
      console.error('API Error fetchDeliveryPlanActual:', error);
      throw error;
    }
  },
  async getDeliveryCycles(): Promise<CycleHierarchy> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/report_delivery/delivery_cycle_all`;

      // console.log('Fetching URL:', url);

      const response: AxiosResponse<CycleHierarchy> = await axios.get(url);

      if (response.status === 200 && response.data) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown stock IFPD');
    } catch (error) {
      console.error('API Error getDeliveryCycles:', error);
      throw error;
    }
  }
};
