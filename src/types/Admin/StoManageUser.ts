// Bentuk data akun STO (majsf_sto.users + users_area).
// Mengikuti BaseSto::formatUser() pada modul STO di backend.

export interface StoUser {
  id: number | null;
  nik: string;
  role: string;
  permissions: string[];
  tim: string;
  device_id: number | null;
  device_name: string;
  android_id: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  area: string[];
  total_area: number;
}

// Baris tabel -- TableBasic menerima Record<string, unknown>.
export interface StoUserRow extends StoUser {
  [key: string]: unknown;
}

export interface StoDevice {
  id: number;
  name: string;
  android_id: string;
  total_user: number;
  created_at: string;
  updated_at: string;
}

export interface StoUserListResponse {
  status: string;
  message: string;
  limit_terpakai: number;
  total_row: number;
  data: StoUser[];
}

export interface StoDeviceListResponse {
  status: string;
  message: string;
  limit_terpakai: number;
  total_row: number;
  data: StoDevice[];
}

export interface StoUserFormData {
  nik: string;
  role: string;
  tim: '' | 'A' | 'B';
  device_id: number | null;
  permissions: string[];
  area: string[];
}

// Jejak yang menempel pada satu user, dikirim balik oleh user-delete
// sebelum penghapusan benar-benar dijalankan.
export interface StoUserJejak {
  tag_dicetak: number;
  scan: number;
  area: number;
  akun_didaftarkan: number;
}

export interface StoUserDeleteResponse {
  status: 'success' | 'confirm' | 'failed';
  message: string;
  id_user?: number;
  nik?: string;
  jejak?: StoUserJejak;
  data?: StoUser;
}

export interface StoUserSaveResponse {
  status: string;
  message: string;
  diubah?: string[];
  data?: StoUser;
}

export interface StoManageUserDialog {
  form: boolean;
  delete: boolean;
}

export interface StoManageUserState {
  dataTable: StoUserRow[];
  devices: StoDevice[];
  adminNik: string;
  /** Tombol Logout pada "Diakses sebagai" sedang memproses. */
  isLoggingOut: boolean;
  search: string;
  limit: number;
  formData: StoUserFormData;
  dialog: StoManageUserDialog;
  action: 'Create' | 'Edit';
  editId: number | null;
  deleteTarget: StoUserRow | null;
  deleteJejak: StoUserJejak | null;
  needForce: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  lastError: string;
  permissions: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
}
