import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import axios from "axios";

export const getKetPlan = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/plan?tipe=plan`
  )

  return response;
};

export const getKetActual = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/actual?tipe=actual`
  )

  return response;
};

export const getMasterPartNum = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/part?tipe=part`
  )

  return response;
};

export const addData = async (data: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/welding`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    }
  )

  return response;
};

export const editData = async (data: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/welding`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    }
  )

  return response;
};