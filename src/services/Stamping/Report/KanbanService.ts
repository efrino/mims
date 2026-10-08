import axios from "axios";
import type { FilterState, } from "@/types/Stamping/Report/reportStock";
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

export const reportKanbanService = {
   async fetchAchievementKanbanStamping(payload: FormData | URLSearchParams): Promise<response> {
    const configStore = useConfigStore();

    const response = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban`,
      payload,
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
  async fetchDataDashboard(filter: FilterState): Promise<response> {
    const configStore = useConfigStore();

    const response = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban`,
      { params: filter }
    );

    return {
      status: response.status,
      data: response.data,
    };
  },
  async loadDetail(payload: FormData | URLSearchParams): Promise<response> {
    const configStore = useConfigStore();

    const res = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/detail`,
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    return {
      status: res.status,
      data: res.data,
    };
  },
  async fetchDataChart(payload: FormData | URLSearchParams): Promise<response> {
    const configStore = useConfigStore();

    const res = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/chart`,
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    return {
      status: res.status,
      data: res.data,
    };
  },

   async fetchIncompleteKanbanStamping(payload: FormData | URLSearchParams): Promise<response> {
      const configStore = useConfigStore();

      const res = await axios.post(
        `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/incomplete`,
        payload,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      return {
        status: res.status,
        data: res.data,
      };
    },
}