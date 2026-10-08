import axios from "axios";
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

export const stampingReportService = {
  async fetchAchievementReport(payload: { start: string; end: string }): Promise<response> {
    const configStore = useConfigStore();

    const formData = new FormData();
    formData.append("start", payload.start);
    formData.append("end", payload.end);

    const res = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report`,
      formData
    );

    return {
      status: res.status,
      data: res.data,
    };
  }
};