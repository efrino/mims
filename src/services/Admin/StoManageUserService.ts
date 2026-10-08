import { stoAxios, stoHandleError, useStoApiUrl } from '@/services/Admin/StoApi';
import type {
  StoDevice,
  StoDeviceListResponse,
  StoUser,
  StoUserDeleteResponse,
  StoUserFormData,
  StoUserListResponse,
  StoUserSaveResponse
} from '@/types/Admin/StoManageUser';

/**
 * Modul STO -- pengelolaan akun (majsf_sto.users).
 *
 * Seluruh endpoint di sini adalah endpoint admin: `nik` yang dikirim harus
 * milik akun ber-role admin di majsf_sto.users. Pada register gerbangnya
 * bernama `created_by`, sebab `nik` di sana sudah dipakai untuk akun baru.
 */
export const useStoManageUserService = () => {
  const apiUrl = useStoApiUrl();

  // GET /api/sto/user-list?nik=&q=&limit=
  const fetchUsers = async (adminNik: string, params: { q?: string; limit?: number } = {}): Promise<StoUser[]> => {
    try {
      const response = await stoAxios.get<StoUserListResponse>(`${apiUrl}/user-list`, {
        params: {
          nik: adminNik,
          q: params.q?.trim() || undefined,
          limit: params.limit || undefined
        }
      });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  // GET /api/sto/device-list?nik=&q=&limit=
  // Dipakai sebagai sumber pilihan perangkat pada form user.
  const fetchDevices = async (adminNik: string, params: { q?: string; limit?: number } = {}): Promise<StoDevice[]> => {
    try {
      const response = await stoAxios.get<StoDeviceListResponse>(`${apiUrl}/device-list`, {
        params: {
          nik: adminNik,
          q: params.q?.trim() || undefined,
          limit: params.limit || 500
        }
      });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  // POST /api/sto/register -- pendaftaran akun baru, gerbangnya `created_by`.
  const registerUser = async (adminNik: string, form: StoUserFormData): Promise<StoUserSaveResponse> => {
    try {
      const response = await stoAxios.post<StoUserSaveResponse>(`${apiUrl}/register`, {
        created_by: adminNik,
        nik: form.nik.trim(),
        role: form.role.trim(),
        tim: form.tim,
        device_id: form.device_id ?? '',
        permissions: form.permissions,
        area: form.area
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /**
   * POST /api/sto/user-update
   *
   * Partial update: field yang tidak dikirim tidak disentuh. Form ini
   * mengirim seluruh field yang bisa diubah, jadi mengosongkan tim /
   * perangkat / permissions / area berarti melepasnya. NIK sengaja tidak
   * ikut -- backend menolaknya dengan 409.
   */
  const updateUser = async (adminNik: string, idUser: number, form: StoUserFormData): Promise<StoUserSaveResponse> => {
    try {
      const response = await stoAxios.post<StoUserSaveResponse>(`${apiUrl}/user-update`, {
        nik: adminNik,
        id_user: idUser,
        role: form.role.trim(),
        tim: form.tim,
        device_id: form.device_id ?? '',
        permissions: form.permissions,
        area: form.area
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /**
   * POST /api/sto/user-delete
   *
   * Tanpa `force`, backend membalas 200 dengan status "confirm" bila user
   * masih meninggalkan jejak -- bukan error. Panggil ulang dengan
   * force = true untuk benar-benar menghapus.
   */
  const deleteUser = async (adminNik: string, idUser: number, force = false): Promise<StoUserDeleteResponse> => {
    try {
      const response = await stoAxios.post<StoUserDeleteResponse>(`${apiUrl}/user-delete`, {
        nik: adminNik,
        id_user: idUser,
        force
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /**
   * Kosongkan permissions, area, dan tim SELURUH akun ber-role operator.
   *
   * Dipakai saat event baru dibuat: hak akses sisa event sebelumnya tidak
   * boleh terbawa, sebab area dan tim biasanya dibagi ulang tiap STO.
   * Role dan perangkat sengaja tidak disentuh -- itu identitas akunnya,
   * bukan pembagian tugas.
   *
   * Dijalankan per akun karena user-update memang hanya menerima satu
   * sasaran. Kegagalan satu akun tidak menghentikan sisanya; yang gagal
   * dilaporkan balik supaya admin tahu mana yang perlu diulang.
   */
  const resetAksesOperator = async (
    adminNik: string
  ): Promise<{ total: number; berhasil: number; gagal: string[] }> => {
    const users = await fetchUsers(adminNik, { limit: 500 });
    const operator = users.filter((u) => u.role.trim().toLowerCase() === 'operator' && u.id !== null);

    const gagal: string[] = [];
    let berhasil = 0;

    for (const u of operator) {
      try {
        await updateUser(adminNik, u.id as number, {
          nik: u.nik,
          role: u.role,
          tim: '',
          device_id: u.device_id,
          permissions: [],
          area: []
        });
        berhasil += 1;
      } catch {
        gagal.push(u.nik);
      }
    }

    return { total: operator.length, berhasil, gagal };
  };

  return {
    fetchUsers,
    fetchDevices,
    registerUser,
    updateUser,
    deleteUser,
    resetAksesOperator
  };
};
