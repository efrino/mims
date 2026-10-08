import axios from 'axios';
import { useConfigStore } from '@/stores/config';

export interface ChangePasswordData {
  username: string;
  old: string;
  new: string;
  new_confirm: string;
}

export interface ChangePasswordResponse {
  status: string;
  messages?: string;
}

/**
 * Change user password via API
 * @param data - Password change data containing username, old password, new password, and confirmation
 * @returns Promise with the API response
 */
export const changePassword = async (data: ChangePasswordData): Promise<ChangePasswordResponse> => {
  const configStore = useConfigStore();

  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('old', data.old);
  formData.append('new', data.new);
  formData.append('new_confirm', data.new_confirm);

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/users/reset-password`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};
