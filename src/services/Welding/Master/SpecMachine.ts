import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import type { SpecMachineForm } from "@/types/Welding/Master/SpecMachine";
import axios from "axios";

export const getSpecMachineAreaList = async (): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_spec_machine/AreaList`
  );
  return response;
};

export const getSpecMachine = async (line?: string, machine?: string, is_deleted?: string): Promise<response> => {
  const configStore = useConfigStore();
  let url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_spec_machine/SpecMachine`;
  
  const params = new URLSearchParams();
  if (line) params.append('line', line);
  if (machine) params.append('machine', machine);
  if (is_deleted !== undefined && is_deleted !== '') params.append('is_deleted', is_deleted);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await axios.get(url);
  return response;
};

export const getSpecMachineDetail = async (id: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_spec_machine/SpecMachineDetail?id=${id}`
  );
  return response;
};

export const insertSpecMachine = async (data: SpecMachineForm): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_spec_machine/StoreSpecMachine`,
    data
  );
  return response;
};

export const updateSpecMachine = async (id: number | string, data: SpecMachineForm): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_spec_machine/UpdateSpecMachine?id=${id}`,
    data
  );
  return response;
};

export const deleteSpecMachine = async (id: number | string, updated_by: string = 'SYSTEM'): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_spec_machine/DelSpecMachine?id=${id}`,
    { updated_by }
  );
  return response;
};

export const activatedSpecMachine = async (id: number | string, updated_by: string = 'SYSTEM'): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_spec_machine/ActivatedSpecMachine?id=${id}`,
    { updated_by }
  );
  return response;
};

export const updateLayout = async (layoutData: any[], updated_by: string = 'SYSTEM'): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_spec_machine/UpdateLayout`,
    { layout: layoutData, updated_by }
  );
  return response;
};
