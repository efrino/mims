import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useConfigStore } from "@/stores/config";
import { useUtilityStore } from "@/stores/utility";
import { useAuthStore } from "@/stores/auth";
import { MdfoService, type GenerateSOPayload } from "@/services/Logistik/IFP/Report/MdfoService";

type AnyRecord = Record<string, any>;
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();


export const useRundownIFP = defineStore("rundown-ifp", {
state: () => {
    // ← Pindah semua ke DALAM state()
    const authStore = useAuthStore();
    const configStore = useConfigStore();

    return {
      apiUrl: configStore.apiUrl,
      combineData: [] as AnyRecord[],
      permissions: {
        updateRundown:   authStore.checkAccess("Logistik.View.RundownIfpInhouse"),
        downloadRundown: authStore.checkAccess("Logistik.View.RundownIfpInhouse"),
        createSap:       authStore.checkAccess("Marketing.Create.Monthly.Mdfo"),
      },
      dataAging:    [] as AnyRecord[],
      loadingAging: false,
      loading:      false,
      estimated:    [] as AnyRecord[],
    };
  },

  actions: {
    async fetchPcsWeeklyChart(customer: string) {
      try {
        const res = await MdfoService.fetchPcsWeeklyChart(this.apiUrl, customer);
        return res.data.data || [];
      } catch (error) {
        utilityStore.onError(error);
        return [];
      }
    },

    async fetchCombine(params: Record<string, any> = {}) {
      this.loading = true;
      try {
        const response = await MdfoService.fetchCombine(this.apiUrl, params);

        if (response.status === 200 && Array.isArray(response.data.data)) {
          this.combineData = response.data.data;
        } else {
          this.combineData = [];
          notificationStore.showAlertError("Gagal fetch data combine result");
        }
      } catch (error) {
        this.combineData = [];
        notificationStore.showAlertError("Gagal fetch data combine result");
      } finally {
        this.loading = false;
      }
    },

    async generateSO(payload: GenerateSOPayload) {
      try {
        notificationStore.loading = true;
        const response = await MdfoService.generateSO(this.apiUrl, payload);

        if (response.status === 200 && response.data.status === "success") {
          const data = response.data;
          return {
            updated: Array.isArray(data.updated) ? data.updated : [],
            not_found: Array.isArray(data.not_found) ? data.not_found : [],
            total_updated: data.total_updated || 0,
            total_not_found: data.total_not_found || 0,
          };
        }

        notificationStore.showAlertError("Gagal generate SO!");
        return null;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      } finally {
        notificationStore.disableLoading();
      }
    },

    async updateRundownExcelToDB(location: string) {
      notificationStore.loading = true;
      try {
        const response = await MdfoService.updateRundownExcelToDB(
          this.apiUrl,
          location
        );

        if (response.status === 200) {
          notificationStore.showAlertSuccess(`Update Data Rundown ${location} Success!`);
        }
      } catch (er: any) {
        notificationStore.showAlertError(
          "Upload Failed : " + (er?.response?.data?.messages || "Unknown error")
        );
      } finally {
        notificationStore.disableLoading();
      }
    },

    async deleteRundownDB(location: string) {
      notificationStore.loading = true;
      try {
        const response = await MdfoService.deleteRundownDB(this.apiUrl, location);

        if (response.status === 200) {
          notificationStore.showAlertSuccess(`Delete Data Rundown ${location} Success!`);
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async downloadIfpInhouse() {
      return MdfoService.downloadIfpInhouse(this.apiUrl);
    },

    async fetchCustMdfo(period: string, status: string) {
      this.loading = true;
      this.estimated = [];

      try {
        const response = await MdfoService.fetchCustMdfo(
          this.apiUrl,
          period,
          status
        );

        if (response.status === 200) {
          this.estimated = response.data.data || [];
        } else {
          notificationStore.showAlertError(response.data.message || "Gagal memuat data");
        }

        return this.estimated;
      } catch (error) {
        utilityStore.onError(error);
        return [];
      } finally {
        this.loading = false;
      }
    },

    async fetchResumeStockHistory(
      alias: string | number,
      group: string | number | null = null
    ) {
      notificationStore.loading = true;
      try {
        const response = await MdfoService.fetchResumeStockHistory(
          this.apiUrl,
          alias,
          group
        );

        return response.data;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      } finally {
        notificationStore.disableLoading();
      }
    },

    async updateCalculationsMonth(payload: { month: string; data: any[] }) {
      this.loading = true;
      try {
        const response = await MdfoService.updateCalculationsMonth(
          this.apiUrl,
          payload
        );

        if (response.status === 200) {
          notificationStore.showAlertSuccess(response.data.message || "Update berhasil");
          return response.data;
        }

        return null;
      } catch (error) {
        utilityStore.onError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});