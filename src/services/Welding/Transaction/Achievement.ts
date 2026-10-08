import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { FilterParams } from '@/types/Welding/Transaction/Achievement';

interface checkForm {
  line_id: string;
  date: string;
  shift: string | number;
  patan: string;
}

export const getDataAch = async (params: FilterParams): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement`,
    {
      params: params,
    }
  );

  return response;
};

export const getPart = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/part?tipe=part`
  );

  return response;
};

export const userCheck = async (id: string, date: string, shift: number | string): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/check`,
    {
      params: { line_id: id, date, shift },
    }
  );

  return response;
};

export const openFormEdit = async (params: checkForm): Promise<response> => {
  const configStore = useConfigStore();

  const data = new URLSearchParams();

  data.append("line_id", params.line_id);
  data.append("date", params.date);
  data.append("shift", params.shift.toString());
  data.append("patan", params.patan);

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/open`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response;
};

export const closeFormEdit = async (params: checkForm): Promise<response> => {
  const configStore = useConfigStore();

  const data = new URLSearchParams();

  data.append("line_id", params.line_id);
  data.append("date", params.date);
  data.append("shift", params.shift.toString());
  data.append("patan", params.patan);

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/close`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response;
};

export const updateData = async (params: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement`,
    params,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response;
};

export const removeData = async (params: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.delete(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/data`,
    {
      data: params,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response;
};

export const refreshData = async (params: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/display_refresh`,
    {
      params: params,
    }
  );

  return response;
};

export const getKetPlan = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/plan?tipe=plan`
  );

  return response;
};

export const getKetActual = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/actual?tipe=actual`
  );

  return response;
};

export const importExcel = async (file: any): Promise<response> => {
  const configStore = useConfigStore();

  const data = new FormData();

  data.append("file", file)

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/import_template_excel`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    }
  );

  return response;
};