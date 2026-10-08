import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { PressDiesForm } from '@/types/Stamping/Master/Dies';
import axios from 'axios';

export const getDies = async (is_deleted?: string): Promise<response> => {
  const configStore = useConfigStore();
  let url = `http://${configStore.apiUrl}/majsf_rest_api/api/Stamping_dies/Dies`;
  if (is_deleted !== undefined && is_deleted !== '') {
    url += `?is_deleted=${is_deleted}`;
  }
  return await axios.get(url);
};

export const insertDies = async (data: PressDiesForm): Promise<response> => {
  const configStore = useConfigStore();
  return await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Stamping_dies/StoreDies`,
    data
  );
};

export const updateDies = async (id: number | string, data: PressDiesForm): Promise<response> => {
  const configStore = useConfigStore();
  return await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Stamping_dies/UpdateDies?id=${id}`,
    data
  );
};

export const deleteDies = async (id: number | string, updated_by: string = 'SYSTEM'): Promise<response> => {
  const configStore = useConfigStore();
  return await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Stamping_dies/DelDies?id=${id}`,
    { updated_by }
  );
};

export const activatedDies = async (id: number | string, updated_by: string = 'SYSTEM'): Promise<response> => {
  const configStore = useConfigStore();
  return await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Stamping_dies/ActivatedDies?id=${id}`,
    { updated_by }
  );
};

export const getDiesPairing = async (): Promise<response> => {
  const configStore = useConfigStore();
  return await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Stamping_dies_pairing/Pairing`
  );
};

export const storeDiesPairing = async (dies_id: number, machine_id: number, created_by: string = 'SYSTEM', note = ''): Promise<response> => {
  const configStore = useConfigStore();
  return await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Stamping_dies_pairing/StorePairing`,
    { dies_id, machine_id, created_by, note }
  );
};

export const deleteDiesPairing = async (id: number | string, updated_by: string = 'SYSTEM'): Promise<response> => {
  const configStore = useConfigStore();
  return await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Stamping_dies_pairing/DelPairing?id=${id}`,
    { updated_by }
  );
};
