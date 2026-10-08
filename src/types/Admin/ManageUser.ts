export interface User {
  username: string;
  fullname: string;
  first_name: string;
  last_name: string;
  group_sto_id: string;
  group: string;
  group_id: number;
  group_name: string;
  group_description: string;
  photo?: string;
  email?: string;
  phone?: string;
  status_lock?: 'LOCK' | 'UNLOCK';
}

export interface GroupSto {
  sto_group_id: string;
  description: string;
}
export interface Group {
  id: number;
  name: string;
  description: string;
}

export interface AddUserForm {
  identity: string;
  first_name: string;
  last_name: string;
  group_id: number;
  password: string;
  password_confirm: string;
  phone?: string;
  photo_data?: string;
  photo_type?: string;
}

export interface EditUserForm {
  username: string;
  first_name: string;
  last_name: string;
  group_id: number;
  email?: string;
  phone?: string;
  password?: string;
  password_confirm?: string;
  photo_data?: string;
  photo_type?: string;
}

export interface ChangePasswordForm {
  username: string;
  old: string;
  new: string;
  new_confirm: string;
}

export interface PermissionItem {
  type: 'header' | 'submenu' | 'link';
  title: string;
  permission?: {
    parent: string;
    child: string[];
  };
}

export interface SetPermissionForm {
  user: string;
  permission: string[];
}

export interface UnlockScanForm {
  username: string;
  tipe: 'LOCK' | 'UNLOCK';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  messages: string;
  data?: T;
  status?: string;
}

export interface ApiError {
  response?: {
    data?: {
      status?: string;
      messages?: string;
    };
    statusText?: string;
  };
  message?: string;
}

