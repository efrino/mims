import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import axios from "axios";

export const getSubAssyRobots = async (): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SubAssyRobots`
  );
  return response;
};

export const getSubAssyLoad = async (id_simulation: number | string = 96, ct_mode: string = 'HITUNG'): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SubAssyLoad?id_simulation=${id_simulation}&ct_mode=${ct_mode}`
  );
  return response;
};

export const postSubAssyAutoBalance = async (id_simulation: number | string, ct_mode: string = 'HITUNG', user: string = 'system'): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SubAssyAutoBalance`,
    {
      id_simulation,
      ct_mode,
      user
    }
  );
  return response;
};

export const getGlcConfig = async (area: string = 'SUB ASSY'): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/Config?area=${encodeURIComponent(area)}`
  );
  return response;
};

export const saveGlcConfig = async (payload: any): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/Config`,
    payload
  );
  return response;
};

