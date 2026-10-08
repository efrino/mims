import { useConfigStore } from "@/stores/config";
import type { FilterBudget } from "@/types/Logistik/MasterData/Budget";
import type { response } from "@/types/response";
import axios from "axios";

export const getBudget = async (filter: FilterBudget): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/master_data_budget?inventaris=${filter.inventaris}&department=${filter.department}&period=${filter.period}&date=${filter.date}`
  )

  return response;
};

export const addBudget = async (data: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/budget`,
    data,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  )

  return response;
};

export const editBudget = async (data: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/budget`,
    data,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  )

  return response;
};