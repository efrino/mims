import axios from "axios";
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

export const stampingLkhService = {
  async fetchDataReport(payload: {tag: string; date: string; shift?: string;}): Promise<response> {
    const configStore = useConfigStore();

    const res = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/`,
      {
        params: payload,
      }
    );

    return {
      status: res.status,
      data: res.data,
    };
  },
};
