import axios from "axios";
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

export const reportStockV2Service = {
  async fetchReportIFP(period: string): Promise<response> {
    const configStore = useConfigStore();

    const response = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock-v2/ifp`,
      { params: { period } }
    );

    return {
      status: response.status,
      data: response.data,
    };
  },

  async compareMaster(start: string, end: string): Promise<response> {
    const configStore = useConfigStore();

    const response = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock-v2/compare_master`,
      { params: { start, end } }
    );

    return {
      status: response.status,
      data: response.data,
    };
  },
};
