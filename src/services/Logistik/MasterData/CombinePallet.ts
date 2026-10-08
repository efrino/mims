import { useConfigStore } from '@/stores/config';
import axios from 'axios';
import type { PalletItem, PalletFormData, CombineDriverItem } from '@/types/Logistik/MasterData/CombinePallet';


interface GetParams {
  id?: string;
  no_rfid?: string;
}

interface UpdatePayload {
  id: string;
  no_rfid?: string;
  no_pallet?: string;
  name?: string;
  type?: string;
  is_active?: string;
  category?: string;
  customer?: string;
}

export const usePalletService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/pallet`;

  const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.messages || error.message || 'Terjadi kesalahan pada server';
      throw new Error(message);
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  };

  const fetchMasterPallet = async (id?: string, no_rfid?: string): Promise<PalletItem[]> => {
    try {
      const params: GetParams = {};
      if (id) params.id = id;
      if (no_rfid) params.no_rfid = no_rfid;
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
        no_rfid: formData.no_rfid,
        no_pallet: formData.no_pallet,
        name: formData.name,
        type: formData.type,
        category: formData.category,
        customer: formData.customer
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

      if (formData.no_rfid !== undefined) payload.no_rfid = formData.no_rfid;
      if (formData.no_pallet !== undefined) payload.no_pallet = formData.no_pallet;
      if (formData.name !== undefined) payload.name = formData.name;
      if (formData.type !== undefined) payload.type = formData.type;
      if (formData.is_active !== undefined) payload.is_active = formData.is_active;
      if (formData.category !== undefined) payload.category = formData.category;
      if (formData.customer !== undefined) payload.customer = formData.customer;

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

const downloadExcel = async () => {
  try {
    const response = await axios.get(`${apiUrl}/download`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `master_pallet_${new Date().getTime()}.xlsx`;
    link.click();

  } catch (error) {
    handleError(error);
  }
};

  const fetchCombineDriver = async (status?: 'IN' | 'OUT'): Promise<CombineDriverItem[]> => {
    try {
      const params = status ? { status } : {};
      const response = await axios.get<unknown>(`${apiUrl}/combine_driver`, { params });
      if (response.status === 200) {
        const data = response.data;
        if (Array.isArray(data)) return data as CombineDriverItem[];
        if (data && typeof data === 'object') return Object.values(data) as CombineDriverItem[];
      }
      return [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  return {
    fetchMasterPallet,
    insertPallet,
    updatePallet,
    deletePallet,
    downloadTemplate,
    uploadExcel,
    downloadExcel,
    fetchCombineDriver
  };
};