import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { useAuthStore } from '@/stores/auth';
import { useRundownService } from '@/services/Logistik/IFP/Transaction/RundownService';
import type { ParamsFilter, RundownItem, CustomerWorkday, GenerateSOResponse } from '@/types/Logistik/IFP/Transaction/Rundown';
import { useConfigStore } from '@/stores/config';

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const RundownService = useRundownService;
const date = utilityStore.getCurrentShift();
const configStore = useConfigStore();
const authStore = useAuthStore();
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

      type: 'IFP-INHOUSE',

      dataTable: [] as RundownItem[],
      loading: false,
      /* tambahan agar cocok dengan fitur dari Vue 2 */
      parts: [] as RundownItem[],
      pcsSummaryParts: [] as RundownItem[],
      permissions: {
        create: authStore.checkAccess('Logistik.Create.RundownTrial'),
        update: authStore.checkAccess('Logistik.Update.RundownTrial'),
        delete: authStore.checkAccess('Logistik.Delete.RundownTrial')
      },

      dialog: {
        deleteRundown: false,
        generateSO: false,
        loading: false
      },

      urlExport: {
        kritis: 'http://192.168.10.67/majsf_rest_api/api/rundown_ifp/export_priority_item?status=kritis',
        kritisMgl: 'http://192.168.10.67/majsf_rest_api/api/rundown_ifp/export_priority_item?status=kritis&routing=MGL%20-%20IFPD',
        over: 'http://192.168.10.67/majsf_rest_api/api/rundown_ifp/export_priority_item?status=over',
        overMgl: 'http://192.168.10.67/majsf_rest_api/api/rundown_ifp/export_priority_item?status=over&routing=MGL%20-%20IFPD',
        kritisHmmi: 'http://192.168.10.67/majsf_rest_api/api/rundown_ifp/export_priority_item?status=kritis&customer=HMMI',
        overHmmi: 'http://192.168.10.67/majsf_rest_api/api/rundown_ifp/export_priority_item?status=over&customer=HMMI'
      },

      isLoading: false,

      params: {
        start: new Date(new Date(date.date).setDate(new Date(date.date).getDate())).toISOString().slice(0, 10),
        end: date.date
      } as ParamsFilter,

      generateResult: {
        show: false,
        updated: [] as GenerateSOResponse['updated'],
        notFound: [] as GenerateSOResponse['not_found'],
        totalUpdated: 0,
        totalNotFound: 0
      }
    };
  },

  getters: {
    reportUrl: (state) =>
      `http://${configStore.apiUrl}/monitoring/production/rundown/report?type=${state.type.toLowerCase()}&destination=${state.destination}`
  },

  actions: {
    async updateRundownExcelToDB(location: string) {
      this.isLoading = true;
      this.dialog.loading = true;

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
        this.dialog.loading = false;
      }
    },

    async deleteRundownDB(location: string) {
      this.isLoading = true;
      this.dialog.loading = true;

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
        this.dialog.loading = false;
      }
    },

    async fetchPartIFP() {
      this.isLoading = true;
      this.dataTable = [];
      this.parts = [];
      this.pcsSummaryParts = [];

      try {
        const params: ParamsFilter = {
          type: 'IFP-INHOUSE',
          data: 'true'
        };

        const response = await RundownService.fetchInventory(params);

        if (response.status === 200) {
          const rows = Array.isArray(response.data) ? response.data : [];
          this.dataTable = rows;
          this.parts = rows;
          this.pcsSummaryParts = rows;
        } else {
          const msg = (response.data as any).message || 'Gagal mengambil data inventory';
          notificationStore.showAlertError(msg);
        }
      } catch (error: any) {
        utilityStore.onError(error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchPartIFPTrial(weekOffset?: number | null) {
      this.isLoading = true;
      this.dataTable = [];
      this.parts = [];
      this.pcsSummaryParts = [];

      try {
        const params: ParamsFilter = {
          type: 'IFP-INHOUSE',
          data: 'true',
          week_offset: weekOffset ?? undefined
        };

        const response = await RundownService.fetchInventoryTrial(params);
        if (response.status === 200) {
          const rows = Array.isArray(response.data) ? response.data : [];
          this.dataTable = rows;
          this.parts = rows;
          this.pcsSummaryParts = rows;
        } else {
          const msg = (response.data as any).message || 'Gagal mengambil data inventory';
          notificationStore.showAlertError(msg);
        }
      } catch (error: any) {
        utilityStore.onError(error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchCustMdfo(period: string, status: string): Promise<CustomerWorkday[] | any | null> {
      this.isLoading = true;

      try {
        const response = await RundownService.fetchCustMdfo(period, status);

        if (response.status === 200) {
          return response.data;
        } else {
          const msg = (response.data as any).message || 'Gagal mengambil data customer';
          notificationStore.showAlertError(msg);
          return null;
        }
      } catch (error: any) {
        utilityStore.onError(error);
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async generateSO(payload: { customers: any[]; default_workdays: number }): Promise<GenerateSOResponse | any | null> {
      this.isLoading = true;
      this.dialog.loading = true;

      try {
        const response = await RundownService.generateSO(payload);

        if (response.status === 200 && response.data.status === 'success') {
          this.generateResult = {
            show: true,
            updated: response.data.updated || [],
            notFound: response.data.not_found || [],
            totalUpdated: response.data.total_updated || 0,
            totalNotFound: response.data.total_not_found || 0
          };

          notificationStore.showAlertSuccess('Generate SO berhasil!');
          return response.data;
        } else {
          const msg = response.data?.message || 'Gagal generate SO';
          notificationStore.showAlertError(msg);
          return null;
        }
      } catch (error: any) {
        utilityStore.onError(error);
        return null;
      } finally {
        this.isLoading = false;
        this.dialog.loading = false;
      }
    },

    resetGenerateResult() {
      this.generateResult = {
        show: false,
        updated: [],
        notFound: [],
        totalUpdated: 0,
        totalNotFound: 0
      };
    },

    // RundownExcelStore.ts
    async downloadIfpInhouse(): Promise<any> {
      try {
        const res = await RundownService.downloadIfpInhouse();
        return res; // Mengembalikan object response (termasuk data dan headers)
      } catch (error) {
        console.error('Service Error:', error);
        throw error;
      }
    }
  }
});
