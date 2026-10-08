import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { KategoriItem, KategoriFormData } from '@/types/Admin/MasterKategori';

interface GetParams {
  search?: string;
  status?: string;
}

interface ActionResponse<T = unknown> {
  success: boolean;
  messages: string;
  data?: T;
}

export const useMasterKategoriService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/kategori`;

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
  const checkResponse = <T>(data: ActionResponse<T>): ActionResponse<T> => {
    if (data && data.success === false) {
      throw new Error(data.messages || 'Proses gagal');
    }
    return data;
  };

  const fetchKategori = async (search?: string, status?: string): Promise<KategoriItem[]> => {
    try {
      const params: GetParams = {};
      if (search) params.search = search;
      if (status) params.status = status;

      const response = await axios.get<KategoriItem[]>(apiUrl, { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const insertKategori = async (formData: Pick<KategoriFormData, 'kode_kategori' | 'nama_kategori'>) => {
    try {
      const response = await axios.post<ActionResponse<KategoriItem>>(apiUrl, formData);
      return checkResponse(response.data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const updateKategori = async (formData: KategoriFormData) => {
    try {
      const response = await axios.put<ActionResponse>(apiUrl, formData);
      return checkResponse(response.data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const deleteKategori = async (kode_kategori: string) => {
    try {
      const response = await axios.delete<ActionResponse>(apiUrl, {
        data: { kode_kategori }
      });
      return checkResponse(response.data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  return {
    fetchKategori,
    insertKategori,
    updateKategori,
    deleteKategori
  };
};
