import { stoAxios, stoHandleError, useStoApiUrl } from '@/services/Admin/StoApi';
import type { StoTagOkRow } from '@/types/Admin/StoTagList';
import type {
  StoCancelAreaPreviewResponse,
  StoCancelAreaResponse,
  StoCancelDecisionResponse,
  StoCancelRequestListResponse,
  StoTag,
  StoTagDetailResponse
} from '@/types/Admin/StoCancelTag';

/**
 * Modul STO -- pengajuan pembatalan tag (majsf_sto.sto_data).
 *
 * Tiga keadaan `is_canceled`:
 *   0 = normal
 *   2 = pembatalan diajukan, menunggu keputusan admin (masih terhitung di summary)
 *   1 = dibatalkan
 *
 * cancel-requests / cancel-approve / cancel-reject wajib NIK ber-role admin.
 * Pengajuannya sendiri dibuat dari perangkat lewat cancel-request.
 */
export const useStoCancelTagService = () => {
  const apiUrl = useStoApiUrl();

  // GET /api/sto/cancel-requests?nik=&area=&limit=
  // Pengajuan yang masih menunggu keputusan, urut dari yang paling lama.
  const fetchCancelRequests = async (
    adminNik: string,
    params: { area?: string; id_event?: number | null; limit?: number } = {}
  ): Promise<StoTag[]> => {
    try {
      const response = await stoAxios.get<StoCancelRequestListResponse>(`${apiUrl}/cancel-requests`, {
        params: {
          nik: adminNik,
          area: params.area?.trim() || undefined,
          id_event: params.id_event ?? undefined,
          limit: params.limit || undefined
        }
      });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  // POST /api/sto/cancel-approve -- is_canceled 2 -> 1. Satu id_tag per request.
  const approveCancel = async (adminNik: string, idTag: string): Promise<StoCancelDecisionResponse> => {
    try {
      const response = await stoAxios.post<StoCancelDecisionResponse>(`${apiUrl}/cancel-approve`, {
        nik: adminNik,
        id_tag: idTag
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  // POST /api/sto/cancel-reject -- is_canceled 2 -> 0, jejak pengajuan dibersihkan.
  const rejectCancel = async (adminNik: string, idTag: string): Promise<StoCancelDecisionResponse> => {
    try {
      const response = await stoAxios.post<StoCancelDecisionResponse>(`${apiUrl}/cancel-reject`, {
        nik: adminNik,
        id_tag: idTag
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  // GET /api/sto/tag-detail?id_tag=
  const fetchTagDetail = async (idTag: string): Promise<StoTag> => {
    try {
      const response = await stoAxios.get<StoTagDetailResponse>(`${apiUrl}/tag-detail`, { params: { id_tag: idTag } });
      return response.data.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /**
   * GET /api/sto/cancel-area-preview -- hanya menghitung, tidak mengubah apa
   * pun. Dipanggil sebelum konfirmasi supaya angka yang dilihat admin datang
   * dari kriteria yang sama dengan yang nanti dipakai mengubah.
   */
  const fetchAreaPreview = async (
    adminNik: string,
    params: { area: string; id_event: number | null }
  ): Promise<StoCancelAreaPreviewResponse> => {
    try {
      const response = await stoAxios.get<StoCancelAreaPreviewResponse>(`${apiUrl}/cancel-area-preview`, {
        params: {
          nik: adminNik,
          area: params.area,
          id_event: params.id_event ?? undefined
        }
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /**
   * POST /api/sto/cancel-area -- batalkan seluruh tag yang belum discan di
   * satu area, dalam satu UPDATE ber-WHERE (bukan ribuan id bolak-balik).
   *
   * `confirm_area` wajib sama dengan `area`; itu pengaman terakhir di sisi
   * backend, terpisah dari konfirmasi ketik di layar.
   */
  const cancelArea = async (adminNik: string, params: { area: string; id_event: number | null }): Promise<StoCancelAreaResponse> => {
    try {
      const response = await stoAxios.post<StoCancelAreaResponse>(`${apiUrl}/cancel-area`, {
        nik: adminNik,
        area: params.area,
        id_event: params.id_event ?? undefined,
        confirm_area: params.area
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /**
   * POST /cancel-request -- mengajukan pembatalan satu tag STO.
   *
   * Parameter alasannya bernama `reason` di sini, bukan `alasan` seperti pada
   * tag OK. Perbedaan itu ada di backend dan sengaja tidak diseragamkan dari
   * sisi klien supaya permintaannya tetap apa adanya.
   */
  const ajukanCancel = async (nik: string, idTag: string, reason: string): Promise<{ status: string; message: string }> => {
    try {
      const response = await stoAxios.post<{ status: string; message: string }>(`${apiUrl}/cancel-request`, {
        nik,
        id_tag: idTag,
        reason
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  // ── Tag OK ────────────────────────────────────────────────────────
  //
  // Tag OK tidak punya endpoint pengajuan tersendiri: daftarnya dibaca dari
  // tag-ok-list dengan batal = 2, dan keputusannya lewat tag-ok-cancel yang
  // sama untuk mengajukan maupun memutuskan -- yang membedakan hanya ada
  // tidaknya `keputusan`.

  // GET /tag-ok-list?batal=2 -- pengajuan yang menunggu keputusan admin.
  const fetchCancelRequestsOk = async (
    adminNik: string,
    params: { area?: string; id_event?: number | null; limit?: number } = {}
  ): Promise<StoTagOkRow[]> => {
    try {
      const response = await stoAxios.get<{ data: StoTagOkRow[] }>(`${apiUrl}/tag-ok-list`, {
        params: {
          nik: adminNik,
          batal: '2',
          area: params.area?.trim() || undefined,
          id_event: params.id_event ?? undefined,
          limit: params.limit || 500
        }
      });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  // POST /tag-ok-cancel dengan `keputusan` -- hanya admin yang boleh.
  const decideCancelOk = async (
    adminNik: string,
    idTagOk: string,
    keputusan: 'setuju' | 'tolak'
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await stoAxios.post<{ status: string; message: string }>(`${apiUrl}/tag-ok-cancel`, {
        nik: adminNik,
        id_tag_ok: idTagOk,
        keputusan
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /** POST /tag-ok-cancel tanpa `keputusan` -- mengajukan, bukan memutuskan. */
  const ajukanCancelOk = async (nik: string, idTagOk: string, alasan: string): Promise<{ status: string; message: string }> => {
    try {
      const response = await stoAxios.post<{ status: string; message: string }>(`${apiUrl}/tag-ok-cancel`, {
        nik,
        id_tag_ok: idTagOk,
        alasan
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  // GET /tag-ok-cancel-area-preview -- hanya menghitung, tidak mengubah apa pun.
  const fetchAreaPreviewOk = async (
    adminNik: string,
    params: { area: string; id_event: number | null }
  ): Promise<StoCancelAreaPreviewResponse> => {
    try {
      const response = await stoAxios.get<StoCancelAreaPreviewResponse>(`${apiUrl}/tag-ok-cancel-area-preview`, {
        params: {
          nik: adminNik,
          area: params.area,
          id_event: params.id_event ?? undefined
        }
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  // POST /tag-ok-cancel-area -- satu UPDATE ber-WHERE, bukan ribuan panggilan.
  const cancelAreaOk = async (
    adminNik: string,
    params: { area: string; id_event: number | null; alasan?: string }
  ): Promise<StoCancelAreaResponse> => {
    try {
      const response = await stoAxios.post<StoCancelAreaResponse>(`${apiUrl}/tag-ok-cancel-area`, {
        nik: adminNik,
        area: params.area,
        id_event: params.id_event ?? undefined,
        confirm_area: params.area,
        alasan: params.alasan || undefined
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  return {
    fetchCancelRequests,
    approveCancel,
    rejectCancel,
    fetchTagDetail,
    fetchAreaPreview,
    cancelArea,
    ajukanCancel,
    fetchCancelRequestsOk,
    decideCancelOk,
    ajukanCancelOk,
    fetchAreaPreviewOk,
    cancelAreaOk
  };
};
