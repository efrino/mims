import axios from 'axios';
import { useConfigStore } from '@/stores/config';

export interface ProfileData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  photo: string;
}

export interface UpdateProfileData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  photo_data?: string;
  photo_type?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  messages?: string;
}

const getUsersApiUrl = (): string => {
  const configStore = useConfigStore();
  return `http://${configStore.apiUrl}/majsf_rest_api/api/users`;
};

export const getUserPhotoUrl = (username: string, version = 0): string =>
  `${getUsersApiUrl()}/user-photo?user=${encodeURIComponent(username)}&v=${version}`;

export const getMyProfile = async (username: string): Promise<ProfileData> => {
  const response = await axios.get(`${getUsersApiUrl()}/my-profile`, {
    params: { username }
  });

  return response.data;
};

export const updateMyProfile = async (data: UpdateProfileData): Promise<UpdateProfileResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', data.username);
  formData.append('first_name', data.first_name);
  formData.append('last_name', data.last_name);
  formData.append('email', data.email);
  formData.append('phone', data.phone);

  if (data.photo_data && data.photo_type) {
    formData.append('photo_data', data.photo_data);
    formData.append('photo_type', data.photo_type);
  }

  const response = await axios.put(`${getUsersApiUrl()}/my-profile`, formData);

  return response.data;
};
