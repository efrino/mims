import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { 
  StrengthStandardPayload, 
  StrengthStandardUpdatePayload,
  StrengthStandardDeletePayload,
  StrengthStandardBulkPayload
} from '@/types/Logistik/IFP/Transaction/StrengthStandard';

export const useStrengthStandardService = {
 
  async fetchStrengthStandard(): Promise<response> {
    const configStore = useConfigStore();
    try {
      return await axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api/mutation_ifp/strength_standard`
      );
    } catch (error) {
      console.error('Error in fetchStrengthStandard:', error);
      throw new Error('Gagal memuat data standar kekuatan');
    }
  },
  async fetchStrengthStandardDetail(id: number): Promise<response> {
    const configStore = useConfigStore();
    try {
      return await axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api/mutation_ifp/strength_standard_detail`,
        { params: { id } }
      );
    } catch (error) { 
      console.error('Error in fetchStrengthStandardDetail:', error);
      throw new Error('Gagal memuat detail standar kekuatan');
    }
  },
  createFormData(payload: Record<string, any>): URLSearchParams {
    const params = new URLSearchParams();
    Object.keys(payload).forEach(key => {
      if (payload[key] !== null && payload[key] !== undefined) {
        params.append(key, payload[ key].toString());
      }
    });
    return params;
  },

  async createStrengthStandard(payload: StrengthStandardPayload): Promise<response> {
    const configStore = useConfigStore();
    try {
      const body = this.createFormData(payload);
      return await axios.post(
        `http://${configStore.apiUrl}/majsf_rest_api/api/mutation_ifp/strength_standard`,
        body
      );
    } catch (error) {
      console.error('Error in createStrengthStandard:', error);
      throw new Error('Gagal menyimpan data standar kekuatan');
    }
  },

  async updateStrengthStandard(payload: StrengthStandardUpdatePayload): Promise<response> {
    const configStore = useConfigStore();
    try {
      const body = this.createFormData(payload);
      return await axios.post(
        `http://${configStore.apiUrl}/majsf_rest_api/api/mutation_ifp/strength_standard`,
        body
      );
    } catch (error) {
      console.error('Error in updateStrengthStandard:', error);
      throw new Error('Gagal mengupdate data standar kekuatan');
    }
  },

  async deleteStrengthStandard(payload: StrengthStandardDeletePayload): Promise<response> {
    const configStore = useConfigStore();
    try {
      const body = this.createFormData(payload);
      return await axios.post(
        `http://${configStore.apiUrl}/majsf_rest_api/api/mutation_ifp/strength_standard`,
        body
      );
    } catch (error) {
      console.error('Error in deleteStrengthStandard:', error);
      throw new Error('Gagal menghapus data standar kekuatan');
    }
  },


async bulkUpdateStrengthStandard(payload: StrengthStandardBulkPayload): Promise<response> {
    const configStore = useConfigStore();
    try {
      // Memastikan action yang dikirim ke backend murni tertulis 'bulk'
      const body = this.createFormData({ ...payload, action: 'bulk' });
      return await axios.post(
        `http://${configStore.apiUrl}/majsf_rest_api/api/mutation_ifp/strength_standard`,
        body
      );
    } catch (error) {
      console.error('Error in bulkUpdateStrengthStandard:', error);
      throw new Error('Gagal melakukan bulk update data');
    }
  }
};