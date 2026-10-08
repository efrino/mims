import { defineStore } from 'pinia';
import { useStrengthStandardService } from '@/services/Logistik/IFP/Transaction/StrengthStandard';
import type { response } from '@/types/response';
import type { 
  StrengthStandardPayload, 
  StrengthStandardUpdatePayload,
  StrengthStandardBulkPayload
} from '@/types/Logistik/IFP/Transaction/StrengthStandard';

export const useStrengthStandardStore = defineStore('logistikIfpStrengthStandard', {
  state: () => ({
    strengthStandards: [] as any[], 
    currentDetail: null as any | null, 
    isLoading: false,
  }),

  getters: {
    hasData: (state) => state.strengthStandards.length > 0,
  },

  actions: {
    async getStrengthStandards(): Promise<void> {
      this.isLoading = true;
      try {
        const res: response = await useStrengthStandardService.fetchStrengthStandard();
        if (res.data && res.data.success) {
          this.strengthStandards = res.data.data;
        } else {
          this.strengthStandards = [];
        }
      } catch (error) {
        this.strengthStandards = [];
        console.error('Store error in getStrengthStandards:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async getDetail(id: number): Promise<void> {
      this.isLoading = true;
      try {
        const res: response = await useStrengthStandardService.fetchStrengthStandardDetail(id);
        if (res.data && res.data.success) {
          this.currentDetail = res.data.data;
        } else {
          this.currentDetail = null;
        }
      } catch (error) {
        this.currentDetail = null;
        console.error('Store error in getDetail:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async addStrengthStandard(payload: Omit<StrengthStandardPayload, 'action'>): Promise<response> {
      this.isLoading = true;
      try {
        const res = await useStrengthStandardService.createStrengthStandard({
          action: 'insert',
          ...payload
        });
        return res;
      } catch (error) {
        console.error('Store error in addStrengthStandard:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async editStrengthStandard(payload: Omit<StrengthStandardUpdatePayload, 'action'>): Promise<response> {
      this.isLoading = true;
      try {
        const res = await useStrengthStandardService.updateStrengthStandard({
          action: 'update',
          ...payload
        });
        return res;
      } catch (error) {
        console.error('Store error in editStrengthStandard:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async removeStrengthStandard(id: number): Promise<response> {
      this.isLoading = true;
      try {
        const res = await useStrengthStandardService.deleteStrengthStandard({
          action: 'delete',
          id
        });
        if (res.data && res.data.success) {
          await this.getStrengthStandards();
        }
        return res;
      } catch (error) {
        console.error('Store error in removeStrengthStandard:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async bulkUpdate(payload: Omit<StrengthStandardBulkPayload, 'action'>): Promise<response> {
      this.isLoading = true;
   
      try {
        
        const res = await useStrengthStandardService.bulkUpdateStrengthStandard({
          action: 'bulk',
          ...payload
        });
        if (res.data && res.data.success) {
          await this.getStrengthStandards();
        }
        return res;
      } catch (error) {
        console.error('Store error in bulkUpdate:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    }
  },
});