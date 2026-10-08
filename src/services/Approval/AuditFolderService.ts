import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type {
  AuditFolderEmployee,
  AuditFolderFilter,
  AuditFolderFormData,
  AuditFolderListResponse,
  AuditFolderMe,
  AuditFolderPindahOleh,
  AuditFolderRow,
  AuditFolderSaveResponse,
  AuditFolderStatusKeputusan
} from '@/types/Approval/AuditFolder';

/**
 * General > Audit Folder (majsf_approval.audit_folder).
 *
 * Satu host dengan Folder Sharing (majsf_rest_api), jadi axios bawaan + token login
 * dashboard dari interceptor global memang yang dibutuhkan.
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

export const useAuditFolderService = () => {
  const configStore = useConfigStore();
  const baseUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/approval/audit-folder`;

  const fetchMe = async (): Promise<AuditFolderMe> => {
    try {
      const response = await axios.get<{ data: AuditFolderMe }>(`${baseUrl}/me`);
      return response.data.data;
    } catch (error) {
      return handleError(error);
    }
  };

  const fetchDepartemen = async (): Promise<string[]> => {
    try {
      const response = await axios.get<{ data: string[] }>(`${baseUrl}/departemen-list`);
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      return handleError(error);
    }
  };

  const fetchEmployee = async (nik: string): Promise<AuditFolderEmployee> => {
    try {
      const response = await axios.get<{ data: AuditFolderEmployee }>(`${baseUrl}/employee`, { params: { nik } });
      return response.data.data;
    } catch (error) {
      return handleError(error);
    }
  };

  // Cakupan departemen ditentukan backend dari jabatan pemakai, bukan dikirim dari sini.
  const fetchList = async (filter: AuditFolderFilter): Promise<AuditFolderListResponse> => {
    try {
      const response = await axios.get<AuditFolderListResponse>(`${baseUrl}/audit-list`, {
        params: {
          status: filter.status || undefined,
          start_date: filter.start_date || undefined,
          end_date: filter.end_date || undefined
        }
      });
      return { ...response.data, data: Array.isArray(response.data?.data) ? response.data.data : [] };
    } catch (error) {
      return handleError(error);
    }
  };

  const fetchDetail = async (id: number): Promise<AuditFolderRow> => {
    try {
      const response = await axios.get<{ data: AuditFolderRow }>(`${baseUrl}/audit-detail`, { params: { id } });
      return response.data.data;
    } catch (error) {
      return handleError(error);
    }
  };

  // POST audit-create | audit-update -- bentuk body sama, update membawa id.
  const save = async (form: AuditFolderFormData): Promise<AuditFolderSaveResponse> => {
    try {
      const body = {
        id: form.id ?? undefined,
        tanggal: form.tanggal,
        nik: form.nik.trim(),
        nama: form.nama.trim(),
        departemen: form.departemen,
        nama_folder: form.nama_folder.trim(),
        quota_gb: String(form.quota_gb ?? '').trim(),
        usage_gb: String(form.usage_gb ?? '').trim(),
        status: form.status,
        note: form.note.trim()
      };
      const response = await axios.post<AuditFolderSaveResponse>(`${baseUrl}/${form.id ? 'audit-update' : 'audit-create'}`, body);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  };

  const remove = async (id: number): Promise<AuditFolderSaveResponse> => {
    try {
      const response = await axios.post<AuditFolderSaveResponse>(`${baseUrl}/audit-delete`, { id });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  };

  const ubahStatus = async (
    id: number,
    status: AuditFolderStatusKeputusan,
    catatan: string,
    pindahOleh: AuditFolderPindahOleh | ''
  ): Promise<AuditFolderSaveResponse> => {
    try {
      const response = await axios.post<AuditFolderSaveResponse>(`${baseUrl}/audit-status`, {
        id,
        status,
        catatan: catatan.trim(),
        // Hanya bermakna untuk dipindahkan; backend mengabaikannya di status lain.
        pindah_oleh: status === 'dipindahkan' ? pindahOleh : ''
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  };

  return { fetchMe, fetchDepartemen, fetchEmployee, fetchList, fetchDetail, save, remove, ubahStatus };
};
