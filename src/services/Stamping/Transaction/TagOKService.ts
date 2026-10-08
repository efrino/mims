import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { FormDataTagOk, params, } from '@/types/Stamping/Transaction/TagOK';

/**
 * @param data 
 * @returns
 */

export const usetagOKService = {
  async scanTagOkKanban (params : params): Promise<response> {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append("date", params.date);
    fd.append("shift", params.shift);
    fd.append("id_kanban", params.id_kanban);
    fd.append("tipe", "STP");

    const response = await axios.put(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print`,
      fd,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      }
    )

    return response;
  },
  // TagOkByKanban
  async fetchDataByKanban  (params: string): Promise<response> {
    const configStore = useConfigStore();
    
    const response = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory_achievement/tag_ok_by_id_kanban?parameter_tag=${params}`
    );

    return response;
  },
  // type = FP / WIP; backend memetakannya ke ms_part_sap.status (IFP / WIP)
  async getPartNumber (type: string): Promise<response> {
    const configStore = useConfigStore();

    const response = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/master/part`,
      { params: { type } }
    );

    return response;
  },
  async createTagOkService  (formData: FormDataTagOk): Promise<response> {
    const configStore = useConfigStore();
    
    const data = new FormData();
    data.append("part_number", formData.part_number);
    data.append("job_number", formData.job_number);
    data.append("lotsize_actual", formData.lotsize_actual);
    data.append("date", formData.date);
    data.append("shift", formData.shift.toString());
    data.append("qty_kbn", formData.qty_pallet.toString());
  
    const response = await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print_tag_ok`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      }
    )
    return response;
  },
  
  async getTagOkService  (params: any): Promise<response> {
    const configStore = useConfigStore();
    
    const data = JSON.stringify({
      part_number: params.part_number,
      job_number: params.job_number,
      type: params.type,
      date: params.date,
      shift: params.shift,
      tipe_part: params.tipe_part,
      qty_kbn: params.qty_pallet,
      lotsize_actual: params.lotsize_actual,
    });
  
    const response = await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/data_tag_ok_add?parameter_tag=${data}`
    )
    return response;
  },
}