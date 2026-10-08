import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { AreaKelolaItem, RakKelolaItem, AreaFormData, RakFormData } from '@/types/Admin/MasterLokasi';

interface ActionResponse {
  success: boolean;
  messages: string;
}

export const useMasterLokasiService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/lokasi`;

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

  const request = async <T>(fn: () => Promise<{ data: T }>): Promise<T> => {
    try {
      const response = await fn();
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchArea = async (): Promise<AreaKelolaItem[]> => {
    const data = await request(() => axios.get<AreaKelolaItem[]>(`${apiUrl}/area`));
    return Array.isArray(data) ? data : [];
  };

  const saveArea = async (form: AreaFormData, action: 'Create' | 'Edit') =>
    checkResponse(
      await request(() =>
        action === 'Edit' ? axios.put<ActionResponse>(`${apiUrl}/area`, form) : axios.post<ActionResponse>(`${apiUrl}/area`, form)
      )
    );

  const deleteArea = async (kode_area: string) =>
    checkResponse(await request(() => axios.delete<ActionResponse>(`${apiUrl}/area`, { data: { kode_area } })));

  const fetchRak = async (): Promise<RakKelolaItem[]> => {
    const data = await request(() => axios.get<RakKelolaItem[]>(`${apiUrl}/rak`));
    return Array.isArray(data) ? data : [];
  };

  const saveRak = async (form: RakFormData, action: 'Create' | 'Edit') =>
    checkResponse(
      await request(() =>
        action === 'Edit' ? axios.put<ActionResponse>(`${apiUrl}/rak`, form) : axios.post<ActionResponse>(`${apiUrl}/rak`, form)
      )
    );

  const deleteRak = async (id_rak: string | number) =>
    checkResponse(await request(() => axios.delete<ActionResponse>(`${apiUrl}/rak`, { data: { id_rak } })));

  return {
    fetchArea,
    saveArea,
    deleteArea,
    fetchRak,
    saveRak,
    deleteRak
  };
};
