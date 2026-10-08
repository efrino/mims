import axios from 'axios';
import type { 
  MonitoringItem, 
  FilterDate, 
  UploadParams 
} from '@/types/Logistik/WIP/Transaction/Monitoring';
import { useConfigStore } from '@/stores/config';

const configStore = useConfigStore();

export interface FetchParams {
  period: string;
}

export interface UpdateMasterDataParams {
  period: string;
  part_number: string;
  job_number: string;
  part_finish?: string;
  line_id: string;
  stock_awal?: string;
  part_name?: string;
}

export const monitoringService = {
  baseUrl: `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip`,
  
  async fetchMonitoringData(params: FetchParams): Promise<MonitoringItem[]> {
    try {
      const response = await axios.get<MonitoringItem[]>(
        `${this.baseUrl}/monitoring_wip_inhouse`,
        { params }
      );
      
      if (response.status === 200 && Array.isArray(response.data)) {
        return response.data;
      }
      
      throw new Error('Invalid response from server');
      
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to fetch monitoring data: ${message}`);
    }
  },

  async uploadData(params: UploadParams): Promise<any> {
    try {
      const formData = new FormData();
      const { period, type_data, items } = params;
      
      items.forEach((item) => {
        formData.append('period', period);
        formData.append('type_data', type_data);
        
        Object.keys(item).forEach((key) => {
          const value = item[key];
          if (value !== undefined && value !== null && value !== '') {
            formData.append(`${key}[]`, String(value));
          }
        });
      });

      const response = await axios.post(
        `${this.baseUrl}/data_wip`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );

      return response;
      
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to upload data: ${message}`);
    }
  },
  
  async updateMasterData(params: UpdateMasterDataParams): Promise<any> {
    try {
      const formData = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      const response = await axios.put(
        `${this.baseUrl}/master_data`,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );

      return response;
      
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to update master data: ${message}`);
    }
  },
  
  validatePeriod(period: string): boolean {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
  },
  
  getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },
  
  parsePeriod(period: string): FilterDate {
    if (!this.validatePeriod(period)) {
      throw new Error('Invalid period format');
    }
    const [year, month] = period.split('-');
    return { year, month };
  },
  
  formatPeriod(filterDate: FilterDate): string {
    return `${filterDate.year}-${filterDate.month.padStart(2, '0')}`;
  }
};