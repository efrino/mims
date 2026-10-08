import { useConfigStore } from '@/stores/config';
import axios from 'axios';
import type { RfidItem, RfidFormData } from '@/types/Logistik/MasterData/MasterRfid';


interface GetParams {
  id?: string;
  no_rfid?:string;
}

interface UpdatePayload {
  id: string;
  no_rfid?:string;
}

export const useRfidService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/rfid`;

  const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.messages || error.message || 'Terjadi kesalahan pada server';
      throw new Error(message);
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  };

  const fetchMasterRfid = async (id?: string, no_rfid?: string): Promise<RfidItem[]> => {
    try {
      const params: GetParams = {};
      if (id) params.id = id;
      if (no_rfid) params.no_rfid = no_rfid;
      const response = await axios.get<unknown>(apiUrl, { params });

      if (response.status === 200) {
        const data = response.data;

        if (Array.isArray(data)) return data as RfidItem[];
        if (data && typeof data === 'object') return Object.values(data) as RfidItem[];
      }

      return [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const insertRfid= async (formData: RfidFormData) => {
    try {
      const payload = {
        no_rfid: formData.no_rfid,
      };

      const response = await axios.post(apiUrl, payload);
      return response;
    } catch (error) {
      handleError(error);
    }
  };

  const updateRfid = async (id: string, formData: Partial<RfidFormData>) => {
    try {
      const payload: UpdatePayload = { id };

      if (formData.no_rfid !== undefined) payload.no_rfid = formData.no_rfid;

      const response = await axios.put(apiUrl, payload);
      return response;
    } catch (error) {
      handleError(error);
    }
  };

  const deleteRfid = async (id: string) => {
    try {
      const response = await axios.delete(apiUrl, {
        data: { id }
      });
      return response;
    } catch (error) {
      handleError(error);
    }
  };

  const downloadTemplate = async () => {
  try {
    const response = await axios.get(`${apiUrl}/template`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'template_master_pallet.xlsx';
    link.click();

  } catch (error) {
    handleError(error);
  }
};

const uploadExcel = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${apiUrl}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;

  } catch (error) {
    handleError(error);
  }
};

  return {
    fetchMasterRfid,
    insertRfid,
    updateRfid,
    deleteRfid,
    downloadTemplate,
    uploadExcel,
  };
};