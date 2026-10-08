import { useConfigStore } from "@/stores/config";
import type { ParamsFilter } from "@/types/PCD/Stamping/WeeklyAchievement";
import type { response } from "@/types/response";
import axios from "axios";

export const fetchWeeklyAchievementStamp = async (filter: ParamsFilter): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/range_date`,
    {
      params: filter
    }
  )

  return response;
};