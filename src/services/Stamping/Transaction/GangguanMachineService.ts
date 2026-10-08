import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { params, Action } from '@/types/Stamping/Transaction/GangguanMachine';

/**
 * @param data 
 * @returns
 */

export const useGangguanService = {
  async fetchDataGangguan(params: params): Promise<response> {
    const configStore = useConfigStore();
    
    return await axios.get<response>(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/gangguan`,
      { params }
    );
  },
  async postActionStart(payload: Action): Promise<response> {
    const configStore = useConfigStore();
    
    const formData = new FormData();
    formData.append("part_number", payload.part_number);
    formData.append("date", payload.date);
    formData.append("shift", payload.shift);
    formData.append("machine", payload.machine);
    formData.append("urut", payload.urut.toString());
    formData.append("machine_position", payload.machine_position);

    return await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/action_start`,
      formData
    );
  },
  async postActionDone(payload: Action) {
    const configStore = useConfigStore();

    const formData = new FormData();
    formData.append("part_number", payload.part_number);
    formData.append("date", payload.date);
    formData.append("shift", payload.shift);
    formData.append("machine", payload.machine);
    formData.append("urut", payload.urut.toString());
    formData.append("machine_position", payload.machine_position);

    return await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/action_done`,
      formData
    );
  },
  async fetchDataGangguanSarana(params: params): Promise<response> {
    const configStore = useConfigStore();
    
    return await axios.get<response>(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/gangguan_sarana`,
      { params }
    );
  },
  async fetchDataGangguanDies(params: params): Promise<response> {
    const configStore = useConfigStore();
    return await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/gangguan_dies`,
      { params }
    );
  },
}