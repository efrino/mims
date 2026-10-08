// services/Admin/DashboardDeliveryService.ts
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { useConfigStore } from '@/stores/config';
import type { StockDetailIFPD, StockDetailIFPP, StockDetailIFRM, StockIFPD, StockIFPP, StockIFRM } from '@/types/Admin/RundownStock';
import type { RundownSupplyMatResponse } from '@/types/Admin/RundownSupplyMat';

const getBaseUrl = (): string => {
  const configStore = useConfigStore();
  const apiUrl = configStore.apiUrl;
  return apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
};

export class DashboardRundownService {
  async getStockIFPD(): Promise<StockIFPD[]> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/rundown_ifp/ifp`;

      // console.log('Fetching URL:', url);

      const response: AxiosResponse<StockIFPD[]> = await axios.get(url);

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown stock IFPD');
    } catch (error) {
      console.error('API Error getStockIFPD:', error);
      throw error;
    }
  }
  async getStockIFRM(): Promise<StockIFRM[]> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/rundown_irm`;

      // console.log('Fetching URL:', url);

      const response: AxiosResponse<StockIFRM[]> = await axios.get(url);

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown stock IFRM');
    } catch (error) {
      console.error('API Error getStockIFRM:', error);
      throw error;
    }
  }
  async getStockIFPP(location: string | undefined): Promise<StockIFPP[]> {
    try {
      const baseUrl = getBaseUrl();
      const url =
        location === 'IN'
          ? `${baseUrl}/majsf_rest_api/api/rundown_ifpp/ifpp_inhouse_andon`
          : `${baseUrl}/majsf_rest_api/api/rundown_ifpp/ifpp_outhouse_andon`;

      // console.log('Fetching URL:', url);

      const response: AxiosResponse<StockIFPP[]> = await axios.get(url);

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown stock IFPP');
    } catch (error) {
      console.error('API Error getStockIFPP:', error);
      throw error;
    }
  }
  async getStockDetailIFPD(customer: string, model: string, type: string, project_detail: string | null): Promise<StockDetailIFPD[]> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/rundown_ifp/item_detail_ifpd?customer=${customer}&model=${model}&type=${type}&project_detail=${project_detail}`;

      // console.log('Fetching URL:', url);

      const response: AxiosResponse<StockDetailIFPD[]> = await axios.get(url);

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown stock IFPD');
    } catch (error) {
      console.error('API Error getStockDetailIFPD:', error);
      throw error;
    }
  }
  async getStockDetailIFPP(location: string | undefined, customer: string, model: string, type: string): Promise<StockDetailIFPP[]> {
    try {
      const baseUrl = getBaseUrl();
      const url =
        location === 'IN'
          ? `${baseUrl}/majsf_rest_api/api/rundown_ifpp/item_detail_ifpp_inhouse_andon?customer=${customer}&model=${model}&type=${type}`
          : `${baseUrl}/majsf_rest_api/api/rundown_ifpp/item_detail_ifpp_outhouse_andon?customer=${customer}&model=${model}&type=${type}`;

      // console.log('Fetching URL:', url);

      const response: AxiosResponse<StockDetailIFPP[]> = await axios.get(url);

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown stock IFPP');
    } catch (error) {
      console.error('API Error getStockDetailIFPP:', error);
      throw error;
    }
  }
  async getRundownSupplyMat(): Promise<RundownSupplyMatResponse> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/ifrm/RundownSupplyMat/showAll`;

      const response: AxiosResponse<RundownSupplyMatResponse> = await axios.get(url);

      if (response.status === 200) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown supply material');
    } catch (error) {
      console.error('API Error getRundownSupplyMat:', error);
      throw error;
    }
  }

  async getStockDetailIFRM(customer: string, model: string, type: string): Promise<StockDetailIFRM[]> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/majsf_rest_api/api/rundown_irm/item_detail?customer=${customer}&model=${model}&type=${type}`;

      // console.log('Fetching URL:', url);

      const response: AxiosResponse<StockDetailIFRM[]> = await axios.get(url);

      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Gagal mengambil data rundown stock IFRM');
    } catch (error) {
      console.error('API Error getStockDetailIFRM:', error);
      throw error;
    }
  }
}
