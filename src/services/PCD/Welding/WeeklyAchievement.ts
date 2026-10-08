import { useConfigStore } from "@/stores/config";
import type { ParamsFilter } from "@/types/PCD/Welding/WeeklyAchievement";
import type { response } from "@/types/response";
import axios from "axios";

export const fetchWeeklyAchievementWld = async (filter: ParamsFilter): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/range_date_weld`,
    {
      params: filter
    }
  )

  return response;
};