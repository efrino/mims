import axios from 'axios';
import type { ApiResponse, Material } from '@/types/Logistik/IFPP/Transaction/RundownIFPP';
import { useConfigStore } from '@/stores/config';

export const rundownService = {
  async fetchInventory(type: 'IFPP-INHOUSE' | 'IFPP-OUTHOUSE'): Promise<Material[]> {
    const configStore = useConfigStore();
    try {
      const response = await axios.get<ApiResponse<Material[]>>(
        `http://${configStore.apiUrl}/majsf_rest_api/api/inventory`,
        {
          params: {
            type,
            data: true
          }
        }
      );
      
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data as Material[];
      } else {
        return [];
      }
    } catch (error) {
      throw new Error(`Failed to fetch inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async uploadRundown(location: string) {
    const configStore = useConfigStore();
    try {
      const response = await axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api/inventory/sync`,
        {
          params: {
            file: `Master ${location}`
          }
        }
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to upload rundown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteRundown(location: string) {
    const configStore = useConfigStore();
    try {
      const endpoint = location === 'IFPP-INHOUSE' 
        ? '/rundown_ifp/delete_rundown_ifp'
        : '/rundown_wip/delete_rundown_wip';
      
      const response = await axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api${endpoint}`
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to delete rundown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};