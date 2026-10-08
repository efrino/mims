import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import { useUtilityStore } from '@/stores/utility';
import type {
  MetalFinishResponse,
  MetalFinishItem,
  MetalFinishReportItem,
  MetalFinishReportResponse,
  MetalFinishMonthlyItem,
  MetalFinishMonthlyResponse,
  MetalFinishMonthlyNikResponse,
  BatchUpdatePayload,
  CreatePayload,
  EmployeeItem,
  ProblemListItem,
  RepairProcessListItem,
  PartListItem
} from '@/types/Stamping/Transaction/MetalFinish';

const base = () => `http://${useConfigStore().apiUrl}/majsf_rest_api/api/stamping/metal_finish`;

export const metalFinishService = {
  async fetchData(params: { date?: string; shift?: number | string; nik?: string }) {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.get<MetalFinishResponse>(base(), { params });
      if (response.status !== 200 || !response.data.status) {
        utilityStore.onApiResponse(response);
        return null;
      }
      return response.data;
    } catch (error) {
      utilityStore.onError(error);
      return null;
    }
  },

  async fetchProblemList(): Promise<ProblemListItem[]> {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.get(`${base()}/problem_list`);
      if (response.status !== 200) {
        utilityStore.onApiResponse(response);
        return [];
      }
      return response.data?.data ?? response.data ?? [];
    } catch (error) {
      utilityStore.onError(error);
      return [];
    }
  },

  async fetchRepairList(): Promise<RepairProcessListItem[]> {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.get(`${base()}/repair_list`);
      if (response.status !== 200) {
        utilityStore.onApiResponse(response);
        return [];
      }
      return response.data?.data ?? response.data ?? [];
    } catch (error) {
      utilityStore.onError(error);
      return [];
    }
  },

  async fetchPartList(): Promise<PartListItem[]> {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.get(`http://${useConfigStore().apiUrl}/majsf_rest_api/api/stamping/metal_finish/master-part`);
      if (response.status !== 200) {
        utilityStore.onApiResponse(response);
        return [];
      }
      return response.data?.data ?? response.data ?? [];
    } catch (error) {
      utilityStore.onError(error);
      return [];
    }
  },

  async fetchEmployees(query?: string): Promise<EmployeeItem[]> {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.get(`http://${useConfigStore().apiUrl}/majsf_rest_api/api/stamping/employee`, {
        params: { name: query || undefined, active: 1, department: 'Stamping' }
      });
      if (response.status !== 200) {
        utilityStore.onApiResponse(response);
        return [];
      }
      return response.data?.data ?? [];
    } catch (error) {
      utilityStore.onError(error);
      return [];
    }
  },

  async create(payload: CreatePayload) {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.post(base(), payload);
      if (response.status !== 200 && response.status !== 201) {
        utilityStore.onApiResponse(response);
        return null;
      }
      return response.data;
    } catch (error) {
      utilityStore.onError(error);
      return null;
    }
  },

  async deleteRecord(id: number) {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.delete(`${base()}/${id}`);
      if (response.status !== 200 && response.status !== 204) {
        utilityStore.onApiResponse(response);
        return null;
      }
      return response.data ?? true;
    } catch (error) {
      utilityStore.onError(error);
      return null;
    }
  },

  async fetchReport(params: { start: string; end: string; shift?: number | string; nik?: string }): Promise<MetalFinishReportItem[]> {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.get<MetalFinishReportResponse>(`${base()}/report`, { params });
      if (response.status !== 200 || !response.data.status) {
        utilityStore.onApiResponse(response);
        return [];
      }
      return response.data.data ?? [];
    } catch (error) {
      utilityStore.onError(error);
      return [];
    }
  },

  async fetchMonthlyReport(params: { month: string; shift?: number | string }): Promise<MetalFinishMonthlyResponse | null> {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.get<MetalFinishMonthlyResponse>(`${base()}/monthly_report`, { params });
      if (response.status !== 200 || !response.data.status) {
        utilityStore.onApiResponse(response);
        return null;
      }
      return response.data;
    } catch (error) {
      utilityStore.onError(error);
      return null;
    }
  },

  async fetchMonthlyReportByNik(params: {
    month: string;
    shift?: number | string;
    nik?: string;
    part_number?: string;
  }): Promise<MetalFinishMonthlyNikResponse | null> {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.get<MetalFinishMonthlyNikResponse>(`${base()}/monthly_report_nik`, { params });
      if (response.status !== 200 || !response.data.status) {
        utilityStore.onApiResponse(response);
        return null;
      }
      return response.data;
    } catch (error) {
      utilityStore.onError(error);
      return null;
    }
  },

  async exportExcel(params: { start: string; end: string; shift?: number | string; nik?: string }): Promise<void> {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.get(`${base()}/export`, { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `metal_finish_${params.start}_${params.end}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      utilityStore.onError(error);
    }
  },

  async batchUpdate(payload: BatchUpdatePayload) {
    const utilityStore = useUtilityStore();
    try {
      const response = await axios.put(`${base()}/batch`, payload);
      if (response.status !== 200) {
        utilityStore.onApiResponse(response);
        return null;
      }
      return response.data;
    } catch (error) {
      utilityStore.onError(error);
      return null;
    }
  }
};
