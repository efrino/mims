import { stoAxios, stoHandleError, useStoApiUrl } from '@/services/Admin/StoApi';
import type {
  StoMasterDetailResponse,
  StoMasterFilter,
  StoMasterFormData,
  StoMasterListResponse,
  StoMasterSaveResponse
} from '@/types/Admin/StoMasterData';

/**
 * Modul STO -- master data material (majsf_sto.master_data).
 *
 *   GET  /api/sto/master-list
 *   GET  /api/sto/master-detail
 *   POST /api/sto/master-create
 *   POST /api/sto/master-update
 *   POST /api/sto/master-delete
 *
 * Membaca cukup dengan NIK terdaftar; yang mengubah isinya wajib role admin.
 *
 */
export const useStoMasterDataService = () => {
  const apiUrl = useStoApiUrl();

  const fetchItems = async (nik: string, filter: StoMasterFilter): Promise<StoMasterListResponse> => {
    try {
      const response = await stoAxios.get<StoMasterListResponse>(`${apiUrl}/master-list`, {
        params: {
          nik,
          q: filter.q.trim() || undefined,
          area: filter.area || undefined,
          limit: filter.limit,
          offset: filter.offset || undefined
        }
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  const fetchItem = async (nik: string, idItem: number): Promise<StoMasterDetailResponse> => {
    try {
      const response = await stoAxios.get<StoMasterDetailResponse>(`${apiUrl}/master-detail`, {
        params: { nik, id_item: idItem }
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  const createItem = async (adminNik: string, form: StoMasterFormData): Promise<StoMasterSaveResponse> => {
    try {
      const response = await stoAxios.post<StoMasterSaveResponse>(`${apiUrl}/master-create`, {
        nik: adminNik,
        ...form
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /**
   * Partial update. Form ini mengirim seluruh kolom yang bisa diubah, jadi
   * mengosongkan kolom opsional (plant/process/category/model) memang berarti
   * melepasnya -- bukan "tidak disentuh".
   */
  const updateItem = async (adminNik: string, idItem: number, form: StoMasterFormData): Promise<StoMasterSaveResponse> => {
    try {
      const response = await stoAxios.post<StoMasterSaveResponse>(`${apiUrl}/master-update`, {
        nik: adminNik,
        id_item: idItem,
        ...form
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /**
   * Tidak ada opsi `force`: FK sto_data.id_item bersifat RESTRICT, jadi baris
   * yang sudah dipakai tag ditolak backend dengan 409 dan memang tidak bisa
   * dipaksa.
   */
  const deleteItem = async (adminNik: string, idItem: number): Promise<StoMasterSaveResponse> => {
    try {
      const response = await stoAxios.post<StoMasterSaveResponse>(`${apiUrl}/master-delete`, {
        nik: adminNik,
        id_item: idItem
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  return { fetchItems, fetchItem, createItem, updateItem, deleteItem };
};
