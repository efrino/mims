import { stoAxios, stoHandleError, useStoApiUrl } from '@/services/Admin/StoApi';
import type { StoTagListFilter, StoTagListResponse, StoTagOkFilter, StoTagOkResponse } from '@/types/Admin/StoTagList';

/**
 * Modul STO -- dua daftar yang ditampilkan halaman List Tags.
 *
 *   GET /tag-list     tag STO (sto_data), berpaginasi limit + offset
 *   GET /tag-ok-list  tag OK (tag hasil produksi), hanya limit
 */
export const useStoTagListService = () => {
  const apiUrl = useStoApiUrl();

  const fetchTags = async (nik: string, filter: StoTagListFilter): Promise<StoTagListResponse> => {
    try {
      const response = await stoAxios.get<StoTagListResponse>(`${apiUrl}/tag-list`, {
        params: {
          nik,
          q: filter.q.trim() || undefined,
          area: filter.area || undefined,
          id_event: filter.id_event ?? undefined,
          batal: filter.batal || undefined,
          scan: filter.scan || undefined,
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

  /**
   * `nik` wajib di sini, tidak seperti tag-list yang membolehkannya kosong.
   * Parameter `milik` sengaja tidak dikirim -- halaman ini memang untuk
   * melihat seluruh tag OK, bukan hanya milik NIK yang sedang dipakai.
   */
  const fetchTagOk = async (nik: string, filter: StoTagOkFilter): Promise<StoTagOkResponse> => {
    try {
      const response = await stoAxios.get<StoTagOkResponse>(`${apiUrl}/tag-ok-list`, {
        params: {
          nik,
          q: filter.q.trim() || undefined,
          area: filter.area || undefined,
          open: filter.open || undefined,
          batal: filter.batal || undefined,
          id_event: filter.id_event ?? undefined,
          limit: filter.limit
        }
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  return { fetchTags, fetchTagOk };
};
