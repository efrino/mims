import axios from "axios";
import type { FilterState, FilterDateState, } from "@/types/Stamping/Report/reportStock";
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

export const reportStockService = {
  async fetchReportBlank(filter: FilterState): Promise<response> {
   const configStore = useConfigStore();
  
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/blank`,
      { params: filter }
  );
  
  return {
      status: response.status,
      data: response.data,
   };
  },
  async fetchReportIFP(filter: FilterState): Promise<response> {
    const configStore = useConfigStore();
    const response = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/ifp`,
      { params: filter }
    );

    return {
      status: response.status,
      data: response.data
    };
  },
  async fetchReportAchievementPeriod(filter: FilterState): Promise<response> {
    const configStore = useConfigStore();

    const response = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/period`,
      { params: filter }
    );

    return {
      status: response.status,
      data: response.data,
    };
  },
  async updateQty(filter: FilterDateState): Promise<response> {
    const configStore = useConfigStore();

    const response = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/update_qty`,
      { params: filter }
    );

    return {
      status: response.status,
      data: response.data,
    };
  },

  async updateStockAwal(data: URLSearchParams): Promise<response> {
    const configStore = useConfigStore();

    const response = await axios.put(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/stock_awal`,
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return {
      status: response.status,
      data: response.data,
    };
  },

  async uploadFixOrder(data: FormData): Promise<response> {
    const configStore = useConfigStore();

    const response = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/master/fix_order`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    return {
      status: response.status,
      data: response.data,
    };
  },
};