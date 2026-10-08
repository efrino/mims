import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { FormDataTagOk, params, scanTagOK } from '@/types/Welding/Transaction/TagOk';

/**
 * @param data 
 * @returns
 */
export const scanTagOkKanban = async (params : params): Promise<response> => {
  const configStore = useConfigStore();

  const fd = new URLSearchParams();
  fd.append("date", params.date);
  fd.append("shift", params.shift);
  fd.append("id_kanban", params.id_kanban);
  fd.append("tipe", "WLD");

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/print`,
    fd,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    }
  )

  return response;
};

export const fatchDataByKanban = async (params: string): Promise<response> => {
  const configStore = useConfigStore();
  
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding_achievement/tag_ok_by_id_kanban?parameter_tag=${params}`
  );

  return response;
};

export const getPartNumber = async (type: string): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/part_wss?type=${type}`
  );

  return response;
}

export const createTagOkService = async (formData: FormDataTagOk): Promise<response> => {
  const configStore = useConfigStore();
  
  const data = new FormData();
  data.append("part_number", formData.part_number);
  data.append("job_number", formData.job_number);
  data.append("type", formData.type);
  data.append("lotsize_actual", formData.lotsize_actual);
  data.append("date", formData.date);
  data.append("shift", formData.shift.toString());

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/print_tag_ok_wss`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    }
  )
  return response;
}

export const getTagOkService = async (params: any): Promise<response> => {
  const configStore = useConfigStore();
  
  const data = JSON.stringify({
    part_number: params.part_number,
    job_number: params.job_number,
    type: params.type,
    date: params.date,
    shift: params.shift,
    tipe_part: params.tipe_part,
    qty_kbn: params.qty_kbn,
    lotsize: params.lotsize_actual,
  });

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding-schedule/data_tag_ok_wss_ifp?parameter_tag=${data}`
  )
  return response;
}

export const onScanTagOK = async (params: scanTagOK): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/ScanTagOK/scan_tag_ok_welding`,
    params,
    {
      headers: {
        "Content-Type": "application/json",
      }
    },
  );

  return response;
}

export const fetchDataByIdTagOK = async (id_tag_ok: string): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/tag_in_ifpd_data?id_tag_ok=${id_tag_ok}`
  );

  return response;
}