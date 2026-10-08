import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { useRundownService } from '@/services/Logistik/IFP/Transaction/RundownService';
import type { ParamsFilter, RundownItem } from '@/types/Logistik/WIP/Transaction/RundownWIP';
import { useConfigStore } from '@/stores/config';

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const RundownService = useRundownService;
const date = utilityStore.getCurrentShift();
const configStore = useConfigStore();

export const useRundownStore = defineStore('Rundown Excel', {
  state: () => {
    return {
      destination: 'All',
      customers: [
        'All',
        'ADM PLANT 1',
        'ADM PLANT 4',
        'ADM PLANT 5',
        'TMMIN',
        'GMR',
        'MMKI',
        'HMMI',
        'MKM',
        'METINDO',
        'SUZUKI',
        'KTB',
        'PAMINDO',
        'SANWA',
        'HPM',
        'NISSAN',
        'UPIN'
      ],
      type: '',
      dataTable: [] as RundownItem[],
      dialog: {
        deleteRundown: false
      },
      urlExport: {
        kritis: 'http://192.168.10.67/majsf_rest_api/api/rundown_ifp/export_priority_item?status=kritis',
        over: 'http://192.168.10.67/majsf_rest_api/api/rundown_ifp/export_priority_item?status=over'
      },
      isLoading: false,
      params: {
        start: new Date(new Date(date.date).setDate(new Date(date.date).getDate())).toISOString().slice(0, 10),
        end: date.date
      } as ParamsFilter
    };
  },
  getters: {
    reportUrl: (state) =>
      `http://${configStore.apiUrl}/monitoring/production/rundown/report?type=${state.type.toLowerCase()}&destination=${state.destination}`
  },
  actions: {
    async updateRundownExcelToDB(location: string) {
      this.isLoading = true;

      try {
        const response = await RundownService.RundownToDB(location);

        if (response.status === 200) {
          notificationStore.showAlertSuccess(`Update Data Rundown ${location} Success!`);
        }
      } catch (error: any) {
        console.error('Error syncing rundown:', error);

        const message = error.response?.data?.message || `Gagal mengupdate data ${location}`;
        notificationStore.showAlertError(message);
      } finally {
        notificationStore.disableLoading();
        this.isLoading = false;
      }
    },
    async deleteRundownDB(location: string) {
      this.isLoading = true;

      try {
        const response = await RundownService.deleteRundown(location);

        if (response.status === 200) {
          notificationStore.showAlertSuccess(`Delete Data Rundown ${location} Success!`);
        }
      } catch (error: any) {
        console.error(`Error deleting rundown ${location}:`, error);

        const message = error.response?.data?.message || `Gagal menghapus data ${location}`;
        notificationStore.showAlertError(message);
      } finally {
        notificationStore.disableLoading();
        this.isLoading = false;
      }
    },
    async fetchPartWIP() {
      this.isLoading = true;
      this.dataTable = [];

      try {
        const params = {
          type: 'WIP-OUTHOUSE',
          data: 'true'
        };

        const response = await useRundownService.fetchInventory(params);

        if (response.status === 200) {
          this.dataTable = response.data;
        } else {
          const msg = (response.data as any).message || 'Gagal mengambil data inventory';
          notificationStore.showAlertError(msg);
        }
      } catch (error: any) {
        utilityStore.onError(error);
      } finally {
        this.isLoading = false;
      }
    }
  }
});
