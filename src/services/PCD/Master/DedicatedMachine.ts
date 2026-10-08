import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import axios from "axios";

export const getDedicatedMachines = async (part_number?: string, machine?: string, area?: string, id_simulation?: number | string): Promise<response> => {
  const configStore = useConfigStore();
  let url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc_dedicated_machine/DedicatedMachine`;
  
  const params = new URLSearchParams();
  if (part_number) params.append('part_number', part_number);
  if (machine) params.append('machine', machine);
  if (area) params.append('area', area);
  if (id_simulation) params.append('id_simulation', String(id_simulation));
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await axios.get(url);
  return response;
};

export const getDedicatedMachineById = async (id: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc_dedicated_machine/DedicatedMachine?id=${id}`
  );
  return response;
};

export const postDedicatedMachine = async (payload: { part_number: string, machine: string, area?: string, note?: string }): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc_dedicated_machine/StoreDedicatedMachine`,
    payload
  );
  return response.data;
};

export const updateDedicatedMachine = async (id: number | string, payload: { part_number: string, machine: string, area?: string, note?: string }): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc_dedicated_machine/UpdateDedicatedMachine?id=${id}`,
    payload
  );
  return response.data;
};

export const deleteDedicatedMachine = async (id: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc_dedicated_machine/DelDedicatedMachine?id=${id}`
  );
  return response.data;
};
