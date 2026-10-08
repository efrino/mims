import axios from "axios";
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

export interface UploadMDFOResponse<T = any> {
  status: number
  data: {
    success: boolean
    messages: string
    data?: T
  }
}

export const reportAndonService = {
  async fetchAchievementReportSummary(payload: {start: string, end: string, tipe: string}): Promise<response> {
    const configStore = useConfigStore()

    const formData = new FormData()
    formData.append("start", payload.start)
    formData.append("end", payload.end)
    formData.append("tipe", payload.tipe)

    const res = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/weekday`,
      formData
    )

    return {
      status: res.status,
      data: res.data,
    }
  },
  async fetchAchievementReportMutasi(payload: { start: string; end: string }): Promise<response> {
    const configStore = useConfigStore();

    const formData = new FormData();
    formData.append("start", payload.start);
    formData.append("end", payload.end);

    const res = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/mutasi`,
      formData
    );

    return {
      status: res.status,
      data: res.data,
    };
  },
  async loadDetail(payload: FormData | URLSearchParams): Promise<response> {
    const configStore = useConfigStore();

    const res = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/detail`,
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
  async onUploadMDFO(payload: FormData): Promise<UploadMDFOResponse> {
    const configStore = useConfigStore()

    const res = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/mdfo`,
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )

    return {
      status: res.status,
      data: res.data,
    }
  },
}