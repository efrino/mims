import axios from "axios";
// import type { FilterItems, } from "@/types/Stamping/Production/LKH";
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

export const stampingLkhService = {
  async onVoid(payload: FormData | URLSearchParams): Promise<response> {
    const configStore = useConfigStore();

    const res = await axios({
      method: "delete",
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh`,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      data: payload,
    });

    return {
      status: res.status,
      data: res.data,
    };
  },

  async fetchData(payload: { tag: string; period: string }): Promise<response> {
    const configStore = useConfigStore();

    const res = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh-now`,
      {
        params: {
          tag: payload.tag,
          period: payload.period,
        },
      }
    );

    return {
      status: res.status,
      data: res.data,
    };
  },
};
