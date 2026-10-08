import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import axios from "axios";

export const addDataReportLKH = async (date: string): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/data?tag=LKH-WLD&date=${date}`
  )

  return response;
}

export const updateDataReportLKH = async (filter: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/update_qty`,
    {
      params: filter,
    }
  )
  
  return response;
}

export const fetchDataReportLKH = async (filter: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/welding`,
    {
      params: filter,
    }
  )
  
  return response;
}
