import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import axios from "axios";

export const getPatanLines = async (area?: string, id_simulation?: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const res = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc_patan/Lines`,
    {
      params: { area, id_simulation }
    }
  );
  return res;
};

export const getPatanByLine = async (line?: string, area?: string, id_simulation?: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const res = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc_patan/ByLine`,
    {
      params: { line: line || 'ALL', area, id_simulation }
    }
  );
  return res;
};

export const getPatanBySimulation = async (area?: string, id_simulation?: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const res = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc_patan/BySimulation`,
    {
      params: { id_simulation, area }
    }
  );
  return res;
};

export const getPatanAllMachines = async (id_simulation?: number | string, area?: string): Promise<response> => {
  return getPatanBySimulation(area, id_simulation);
};

