import { useConfigStore } from '@/stores/config';
import axios from 'axios';
import type { PalletItem, PalletFormData } from '@/types/Logistik/MasterData/MasterPallet';


interface GetParams {
  id?: string;
  pallet?: string;
}

interface UpdatePayload {
  id: string;
  pallet?: string;
}

export const usePalletService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/logistic`;

  const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.messages || error.message || 'Terjadi kesalahan pada server';
      throw new Error(message);
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  };

  const fetchMasterPallet = async (id?: string, pallet?: string): Promise<PalletItem[]> => {
    try {
      const params: GetParams = {};
      if (id) params.id = id;
      if (pallet) params.pallet = pallet;
      const response = await axios.get<unknown>(apiUrl, { params });

      if (response.status === 200) {
        const data = response.data;

        if (Array.isArray(data)) return data as PalletItem[];
        if (data && typeof data === 'object') return Object.values(data) as PalletItem[];
      }

      return [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const insertPallet = async (formData: PalletFormData) => {
    try {
      const payload = {
        pallet: formData.pallet,
      };

      const response = await axios.post(apiUrl, payload);
      return response;
    } catch (error) {
      handleError(error);
    }
  };

  const updatePallet = async (id: string, formData: Partial<PalletFormData>) => {
    try {
      const payload: UpdatePayload = { id };

      if (formData.pallet !== undefined) payload.pallet = formData.pallet;

      const response = await axios.put(apiUrl, payload);
      return response;
    } catch (error) {
      handleError(error);
    }
  };

  const deletePallet = async (id: string) => {
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
    fetchMasterPallet,
    insertPallet,
    updatePallet,
    deletePallet,
    downloadTemplate,
    uploadExcel,
  };
};