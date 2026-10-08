import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { StrengthFormData } from '@/types/Logistik/MasterData/MasterStrength';

export const fetchMasterStrengthService = async (): Promise<response> => {
  const configStore = useConfigStore();

  return axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/strength`);
};

export const addMasterStrengthService = async (payload: StrengthFormData): Promise<response> => {
  const configStore = useConfigStore();

  const data = new FormData();
  Object.entries(payload).forEach(([key, value]) => data.append(key, value));

  return axios.post(`http://${configStore.apiUrl}/majsf_rest_api/api/master/strength`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const updateMasterStrengthService = async (payload: StrengthFormData): Promise<response> => {
  const configStore = useConfigStore();
  const data = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => data.append(key, value));
  
  
  return axios.put(`http://${configStore.apiUrl}/majsf_rest_api/api/master/strength`, data);
};
