import { useConfigStore } from '@/stores/config';
import axios from 'axios';
import type { DriverItem, DriverFormData } from '@/types/Logistik/MasterData/MasterDriver';


interface GetParams {
  id?: string;
  nik?: string;
  nama_driver?: string;
  nama_lp?: string;
}

interface UpdatePayload {
  id: string;
  nik?: string;
  nama_driver?: string;
  nama_lp?: string;
}

export const useMasterDriver = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/driver`;

  const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.messages || error.message || 'Terjadi kesalahan pada server';
      throw new Error(message);
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  };

  const fetchMasterDriver = async (id?: string, nik?: string, nama_driver?: string, nama_lp?: string): Promise<DriverItem[]> => {
    try {
      const params: GetParams = {};
      if (id) params.id = id;
      if (nik) params.nik = nik;
      if (nama_driver) params.nama_driver = nama_driver;
      if (nama_lp) params.nama_lp = nama_lp;
      const response = await axios.get<unknown>(apiUrl, { params });

      if (response.status === 200) {
        const data = response.data;

        if (Array.isArray(data)) return data as DriverItem[];
        if (data && typeof data === 'object') return Object.values(data) as DriverItem[];
      }

      return [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const insertDriver= async (formData: DriverFormData) => {
    try {
      const payload = {
        nik: formData.nik,
        nama_driver: formData.nama_driver,
        nama_lp: formData.nama_lp,
      };

      const response = await axios.post(apiUrl, payload);
      return response;
    } catch (error) {
      handleError(error);
    }
  };

  const updateDriver = async (id: string, formData: Partial<DriverFormData>) => {
    try {
      const payload: UpdatePayload = { id };

      if (formData.nik !== undefined) payload.nik = formData.nik;
      if (formData.nama_driver !== undefined) payload.nama_driver = formData.nama_driver;
      if (formData.nama_lp !== undefined) payload.nama_lp = formData.nama_lp;

      const response = await axios.put(apiUrl, payload);
      return response;
    } catch (error) {
      handleError(error);
    }
  };

  const deleteDriver = async (id: string) => {
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
    link.download = 'template_master_driver.xlsx';
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
    fetchMasterDriver,
    insertDriver,
    updateDriver,
    deleteDriver,
    downloadTemplate,
    uploadExcel,
  };
};