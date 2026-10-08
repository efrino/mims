import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { BarangItem, BarangFormData, RingkasanBarangItem, AreaItem, RakItem, ModeKodeExcel } from '@/types/Admin/MasterBarang';

interface GetParams {
  search?: string;
  status?: string;
  kondisi?: string;
  kode_kategori?: string;
}

interface ActionResponse {
  success: boolean;
  messages: string;
}

export const useMasterBarangService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/barang`;

  const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.messages || error.message || 'Terjadi kesalahan pada server';
      throw new Error(message);
    }
    // Error dari checkResponse sudah membawa pesan backend, jangan ditimpa
    if (error instanceof Error) throw error;
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  };

  // Backend membalas HTTP 200 walau prosesnya gagal, jadi flag success wajib dicek
  const checkResponse = (data: ActionResponse): ActionResponse => {
    if (data && data.success === false) {
      throw new Error(data.messages || 'Proses gagal');
    }
    return data;
  };

  const fetchBarang = async (search?: string, status?: string, kondisi?: string, kode_kategori?: string): Promise<BarangItem[]> => {
    try {
      const params: GetParams = {};
      if (search) params.search = search;
      if (status) params.status = status;
      if (kondisi) params.kondisi = kondisi;
      if (kode_kategori) params.kode_kategori = kode_kategori;

      const response = await axios.get<BarangItem[]>(apiUrl, { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchRingkasan = async (): Promise<RingkasanBarangItem[]> => {
    try {
      const response = await axios.get<RingkasanBarangItem[]>(`${apiUrl}/ringkasan`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchNextKode = async (kode_kategori: string): Promise<string> => {
    try {
      const response = await axios.get<ActionResponse & { data?: { kode_barang: string } }>(`${apiUrl}/next-kode`, {
        params: { kode_kategori }
      });
      return response.data?.success ? response.data.data?.kode_barang || '' : '';
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchAreaList = async (): Promise<AreaItem[]> => {
    try {
      const response = await axios.get<AreaItem[]>(`${apiUrl}/area-list`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchRakList = async (): Promise<RakItem[]> => {
    try {
      const response = await axios.get<RakItem[]>(`${apiUrl}/rak-list`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const insertBarang = async (formData: BarangFormData) => {
    try {
      // kode_barang kosong akan digenerate backend dengan format NNN-KATEGORI-TBN
      const response = await axios.post<ActionResponse>(apiUrl, formData);
      return checkResponse(response.data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const updateBarang = async (formData: BarangFormData) => {
    try {
      const response = await axios.put<ActionResponse>(apiUrl, formData);
      return checkResponse(response.data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const deleteBarang = async (kode_barang: string) => {
    try {
      const response = await axios.delete<ActionResponse>(apiUrl, {
        data: { kode_barang }
      });
      return checkResponse(response.data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  // mode: manual = template dengan kolom kode barang, otomatis = tanpa kolom kode barang
  const downloadTemplate = async (mode: ModeKodeExcel) => {
    try {
      const response = await axios.get(`${apiUrl}/template`, {
        params: { mode },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `template_master_barang_kode_${mode}.xlsx`;
      link.click();
    } catch (error) {
      handleError(error);
    }
  };

  const uploadExcel = async (file: File, mode: ModeKodeExcel): Promise<ActionResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);

      const response = await axios.post<ActionResponse>(`${apiUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  return {
    fetchBarang,
    fetchRingkasan,
    fetchNextKode,
    fetchAreaList,
    fetchRakList,
    insertBarang,
    updateBarang,
    deleteBarang,
    downloadTemplate,
    uploadExcel
  };
};
