import { useConfigStore } from "@/stores/config";
import type { FilterDate } from "@/types/Logistik/IRM/Transaction/ShortageStock";
import type { response } from "@/types/response";
import axios from "axios";

export const fetchdataTable = async (filter: FilterDate): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/shortage_stock?start=${filter.start}&end=${filter.end}`
  )

  return response;
};