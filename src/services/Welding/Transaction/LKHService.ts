import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

interface addData {
  date: string;
  shift: string;
  partNumber: string;
  qty: string;
}

/**
 * @param data 
 * @returns
 */
export const fetchDataLKH = async (filter: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh-now?tag=LKH-WLD&date=${filter}`
  );

  return response.data;
};

export const addDataLKH = async (params: addData): Promise<response> => {
  const configStore = useConfigStore();

  const data = new FormData();

  data.append("date", params.date);
  data.append("shift", params.shift);
  data.append("part_number", params.partNumber);
  data.append("qty", params.qty);
  data.append("tag", "LKH-WLD");

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    },
  );
  
  return response;
};

export const getPartItemLKH = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/material?tag=LKH-WLD`
  );

  return response;
};