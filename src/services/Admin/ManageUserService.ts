import axios from 'axios';
import type {
  User,
  GroupSto,
  Group,
  AddUserForm,
  EditUserForm,
  ChangePasswordForm,
  SetPermissionForm,
  UnlockScanForm,
  ApiResponse
} from '@/types/Admin/ManageUser';

export class UserService {
  private baseUrl: string;

  constructor(apiUrl: string) {
    this.baseUrl = `http://${apiUrl}/majsf_rest_api/api/users`;
  }

  async getUserList(): Promise<User[]> {
    try {
      const response = await axios.get<User[]>(`${this.baseUrl}/user-list`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserData(username: string): Promise<User> {
    try {
      const response = await axios.post<User>(`${this.baseUrl}/user-data`, {
        username
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserPermission(username: string): Promise<{ permission: string[] }> {
    try {
      const response = await axios.post<{ permission: unknown }>(`${this.baseUrl}/user-permission`, { username });

      return {
        permission: Array.isArray(response.data.permission) ? (response.data.permission as string[]) : []
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getGroupStoData(): Promise<GroupSto[]> {
    try {
      const response = await axios.get<GroupSto[]>(`${this.baseUrl}/group-sto-data`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  async getGroupData(): Promise<Group[]> {
    try {
      const response = await axios.get<Group[]>(`${this.baseUrl}/groups-data`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addUser(formData: AddUserForm): Promise<ApiResponse> {
    try {
      const data = new FormData();
      data.append('identity', formData.identity);
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('group_id', formData.group_id.toString());
      data.append('password', formData.password);
      data.append('password_confirm', formData.password_confirm);

      if (formData.phone) {
        data.append('phone', formData.phone);
      }

      if (formData.photo_data && formData.photo_type) {
        data.append('photo_data', formData.photo_data);
        data.append('photo_type', formData.photo_type);
      }

      const response = await axios.post<ApiResponse>(`${this.baseUrl}/add-data-user`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async editUser(formData: EditUserForm): Promise<ApiResponse> {
    try {
      console.log('Editing user with data:', formData); // Debugging line
      const data = new URLSearchParams();
      data.append('username', formData.username);
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('group_id', formData.group_id.toString());
      data.append('phone', formData.phone ?? '');

      if (formData.email) {
        data.append('email', formData.email);
      }

      if (formData.password && formData.password_confirm) {
        data.append('password', formData.password);
        data.append('password_confirm', formData.password_confirm);
      }

      if (formData.photo_data && formData.photo_type) {
        data.append('photo_data', formData.photo_data);
        data.append('photo_type', formData.photo_type);
      }

      const response = await axios.put<ApiResponse>(`${this.baseUrl}/user-data`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async changePassword(formData: ChangePasswordForm): Promise<ApiResponse> {
    try {
      const data = new FormData();
      data.append('username', formData.username);
      data.append('old', formData.old);
      data.append('new', formData.new);
      data.append('new_confirm', formData.new_confirm);

      const response = await axios.post<ApiResponse>(`${this.baseUrl}/reset-password`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async setPermission(formData: SetPermissionForm): Promise<ApiResponse> {
    try {
      const data = new URLSearchParams();
      formData.permission.forEach((element) => {
        data.append('permission[]', element);
      });
      data.append('user', formData.user);

      const response = await axios.put<ApiResponse>(`${this.baseUrl}/user-permission`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async toggleUserLock(formData: UnlockScanForm): Promise<ApiResponse> {
    try {
      const data = new URLSearchParams();
      data.append('username', formData.username);
      data.append('tipe', formData.tipe);

      const response = await axios.put<ApiResponse>(`${this.baseUrl}/user_unlock`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.status || error.response?.data?.messages || error.response?.statusText || error.message;
      return new Error(message);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unknown error occurred');
  }
}
