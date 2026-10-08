import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type {
  FolderSharingAksi,
  FolderSharingFilter,
  FolderSharingFormData,
  FolderSharingListResponse,
  FolderSharingMe,
  FolderSharingRequest,
  FolderSharingSaveResponse
} from '@/types/Approval/FolderSharing';

/**
 * Approval > Folder Sharing (majsf_approval.folder_sharing_request).
 *
 * Memakai axios bawaan karena endpoint ini ada di majsf_rest_api yang sama dengan
 * login dashboard -- token dari interceptor global memang yang dibutuhkan di sini.
 */
const handleError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; status?: string; errors?: string[] } | undefined;
    const detail = Array.isArray(data?.errors) && data.errors.length > 0 ? ` (${data.errors.join('; ')})` : '';
    // BD_Controller::auth() membalas { status: "Access Denied!!" } tanpa message.
    const message = data?.message || (data?.status !== 'error' ? data?.status : '') || error.message;
    throw new Error(`${message || 'Terjadi kesalahan pada server'}${detail}`);
  }
  if (error instanceof Error) throw error;
  throw new Error('Terjadi kesalahan yang tidak diketahui');
};

export const useFolderSharingService = () => {
  const configStore = useConfigStore();
  const baseUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/approval/folder-sharing`;

  // GET me -- identitas + hak pemakai; sumber isian awal form.
  const fetchMe = async (): Promise<FolderSharingMe> => {
    try {
      const response = await axios.get<{ data: FolderSharingMe }>(`${baseUrl}/me`);
      return response.data.data;
    } catch (error) {
      return handleError(error);
    }
  };

  // GET request-list?status=&start_date=&end_date=
  // Cakupannya (milik sendiri / semua) ditentukan backend dari jabatan pemakai,
  // jadi tidak ada parameter scope yang bisa dikirim dari sini.
  const fetchList = async (filter: FolderSharingFilter): Promise<FolderSharingListResponse> => {
    try {
      const response = await axios.get<FolderSharingListResponse>(`${baseUrl}/request-list`, {
        params: {
          status: filter.status || undefined,
          start_date: filter.start_date || undefined,
          end_date: filter.end_date || undefined
        }
      });
      return {
        ...response.data,
        data: Array.isArray(response.data?.data) ? response.data.data : []
      };
    } catch (error) {
      return handleError(error);
    }
  };

  // GET request-detail?id= -- satu permintaan lengkap dengan `riwayat`-nya.
  const fetchDetail = async (id: number): Promise<FolderSharingRequest> => {
    try {
      const response = await axios.get<{ data: FolderSharingRequest }>(`${baseUrl}/request-detail`, { params: { id } });
      return response.data.data;
    } catch (error) {
      return handleError(error);
    }
  };

  // GET departemen-list -- daftar tetap milik backend, supaya pilihan di layar dan
  // yang divalidasi server tidak bisa berbeda.
  /**
   * `semua` untuk departemen pemohon, `tujuan` untuk departemen yang dituju (tanpa
   * FINANCE / ACCOUNTING). `tujuan` kosong = backend lama yang belum mengirimnya.
   */
  const fetchDepartemen = async (): Promise<{ semua: string[]; tujuan: string[] }> => {
    try {
      const response = await axios.get<{ data: string[]; tujuan?: string[] }>(`${baseUrl}/departemen-list`);
      return {
        semua: Array.isArray(response.data?.data) ? response.data.data : [],
        tujuan: Array.isArray(response.data?.tujuan) ? response.data.tujuan : []
      };
    } catch (error) {
      return handleError(error);
    }
  };

  const createRequest = async (form: FolderSharingFormData): Promise<FolderSharingSaveResponse> => {
    try {
      const response = await axios.post<FolderSharingSaveResponse>(`${baseUrl}/request-create`, {
        nama: form.nama.trim(),
        nik: form.nik.trim(),
        departemen: form.departemen,
        departemen_tujuan: form.departemen_tujuan,
        folder_path: form.folder_path.trim(),
        alasan: form.alasan.trim(),
        jenis_akses: form.jenis_akses,
        // '3bulan' tidak mengirim tanggal: batasnya dihitung server dari jam server.
        akses_sampai: form.jenis_akses === 'sampai' ? form.akses_sampai : ''
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  };

  // POST request-approve | request-reject | request-cancel
  const processRequest = async (aksi: FolderSharingAksi, id: number, catatan: string): Promise<FolderSharingSaveResponse> => {
    try {
      const response = await axios.post<FolderSharingSaveResponse>(`${baseUrl}/request-${aksi}`, {
        id,
        catatan: catatan.trim()
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  };

  return {
    fetchMe,
    fetchList,
    fetchDetail,
    fetchDepartemen,
    createRequest,
    processRequest
  };
};
