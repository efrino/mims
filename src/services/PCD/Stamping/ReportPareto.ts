import { useConfigStore } from "@/stores/config";
import type { ResolvedFilter, ReportCategory } from "@/types/PCD/Stamping/ReportPareto";
import type { response } from "@/types/response";
import axios from "axios";

export const fetchReportPareto = async (category: ReportCategory, filter: ResolvedFilter): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-pareto/${category}`,
    {
      params: filter
    }
  )

  return response;
};

export const syncReportParetoSap = async (start: string, end: string): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-pareto/sync`,
    { start, end }
  )

  return response;
};
