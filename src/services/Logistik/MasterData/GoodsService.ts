import type { GoodsItem, GoodsFormData } from '@/types/Logistik/MasterData/Goods';
import { useConfigStore } from '@/stores/config';
import axios from 'axios';

interface FetchParams {
  type?: string;
}

interface FetchConsumableParams {
  code_material: string;
}

interface DeleteParams {
  code_material: string;
  type: string;
}

export const useGoodsService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/consumable`;

  const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message || 'Terjadi kesalahan pada server';
      throw new Error(message);
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  };

  const fetchMasterDataGoods = async (type?: string): Promise<GoodsItem[]> => {
    try {
      const params: FetchParams = type ? { type: type.toUpperCase() } : {};
      const response = await axios.get<unknown>(`${apiUrl}/master_data`, { params });

      if (response.status === 200) {
        const data = response.data;
        
        if (Array.isArray(data)) {
          return data as GoodsItem[];
        }
        
        if (data && typeof data === 'object') {
          return Object.values(data) as GoodsItem[];
        }
      }

      return [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchMasterConsumable = async (codeMaterial: string): Promise<GoodsItem[]> => {
    try {
      const params: FetchConsumableParams = { code_material: codeMaterial };
      const response = await axios.get<unknown>(apiUrl, { params });

      if (response.status === 200) {
        const data = response.data;
        
        if (Array.isArray(data)) {
          return data as GoodsItem[];
        }
        
        if (data && typeof data === 'object') {
          return Object.values(data) as GoodsItem[];
        }
      }

      return [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const updateGoods = async (formData: GoodsFormData, action: string, type: string) => {
    try {
      const data = new FormData();

      (Object.entries(formData) as [keyof GoodsFormData, GoodsFormData[keyof GoodsFormData]][]).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'photo' && value instanceof File) {
            data.append(key, value);
          } else if (key !== 'photoPreview' && key !== 'photo') {
            data.append(key, String(value));
          }
        }
      });

      data.append('type', type);
      data.append('action', action);

      const response = await axios.post(apiUrl, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const getImageUrl = (codeMaterial: string, imageTimestamp?: number): string => {
    const timestamp = imageTimestamp || Date.now();
    return `http://192.168.10.67/part/consumable/${codeMaterial}.png?t=${timestamp}`;
  };

  const deleteGoods = async (codeMaterial: string, type: string) => {
    try {
      const deleteData: DeleteParams = {
        code_material: codeMaterial,
        type: type
      };

      const response = await axios.delete(apiUrl, {
        data: deleteData
      });

      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  return {
    fetchMasterDataGoods,
    fetchMasterConsumable,
    updateGoods,
    getImageUrl,
    deleteGoods
  };
};