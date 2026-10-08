import axios, { type AxiosResponse } from 'axios';
import { useConfigStore } from '@/stores/config';
import type { PlanDeliveryResponse } from '@/types/Admin/PlanDelivery';

const getBaseUrl = (): string => {
  const configStore = useConfigStore();
  const apiUrl = configStore.apiUrl;
  return apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
};

export const planDeliveryApi = {
  async getDetailPcsDaily(): Promise<PlanDeliveryResponse> {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/majsf_rest_api/api/MdfoSalesOrder/detail_pcs_daily`;
    
    const response = await axios.get<PlanDeliveryResponse>(url);
    return response.data;
  },
};