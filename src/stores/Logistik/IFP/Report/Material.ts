import axios from "axios";
import pinia from "@/pinia/store";
import { defineStore } from "pinia";
import { useConfigStore } from "@/stores/config";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";

interface MaterialPart {
  [key: string]: any;
}

interface MaterialState {
  tag: string;
  type: string;
  parts: MaterialPart[];
  pcsSummaryParts: MaterialPart[];
  partsMatnr: MaterialPart[];
  estimated: any[];
  fields: string[];
  headers: any[];
  loading: boolean;
  destination: string;
  dialog: {
    uploadData: boolean;
  };
}

const configStore = useConfigStore(pinia);
const utilityStore = useUtilityStore(pinia);
const notificationStore = useNotificationStore(pinia);

export const useMaterialStore = defineStore("material", {
  state: (): MaterialState => ({
    tag: "Materials",
    type: "",
    parts: [],
    pcsSummaryParts: [],
    partsMatnr: [],
    estimated: [],
    fields: [],
    headers: [],
    loading: false,
    destination: "All",
    dialog: {
      uploadData: false,
    },
  }),

  getters: {
    reportUrl: (state): string =>
      `http://${configStore.apiUrl}/monitoring/production/rundown/report?type=${String(
        state.type || ""
      ).toLowerCase()}&destination=${state.destination}`,
  },

  actions: {
    resetData(): void {
      this.parts = [];
      this.partsMatnr = [];
      this.pcsSummaryParts = [];
      this.estimated = [];
    },

    get() {
      return this.fetchPartTrial({
        type: this.type.toUpperCase(),
        data: true,
      });
    },

    async fetchPart(params: Record<string, any>): Promise<MaterialPart[]> {
      this.loading = true;
      this.parts = [];

      try {
        const response = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory`,
          { params }
        );

        if (response.status === 200) {
          this.type = params.type ?? "";
          this.parts = Array.isArray(response.data) ? response.data : [];
          return this.parts;
        }

        notificationStore.showAlertError(
          response.data?.message || "Gagal memuat data"
        );
        return [];
      } catch (error) {
        utilityStore.onError(error);
        return [];
      } finally {
        this.loading = false;
      }
    },

    async fetchPartTrial(params: Record<string, any>): Promise<MaterialPart[]> {
      this.loading = true;
      this.parts = [];

      try {
        const response = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory/trial`,
          { params }
        );

        if (response.status === 200) {
          this.type = params.type ?? "";
          this.parts = Array.isArray(response.data) ? response.data : [];
          return this.parts;
        }

        notificationStore.showAlertError(
          response.data?.message || "Gagal memuat data trial"
        );
        return [];
      } catch (error) {
        utilityStore.onError(error);
        return [];
      } finally {
        this.loading = false;
      }
    },

    filterPart(column: string, field_db: string[] = []): MaterialPart[] {
      if (column !== "All") {
        return this.parts.filter((el) => {
          let match = false;
          field_db.forEach((field) => {
            match = match || el[field] === column;
          });
          return match;
        });
      }

      return this.parts;
    },

    searchPart(value: unknown, search: unknown): boolean {
      return (
        value != null &&
        search != null &&
        typeof value === "string" &&
        value.toString().indexOf(String(search)) !== -1
      );
    },

    async deletePart(id: string | number): Promise<any | null> {
      const data = new URLSearchParams();
      data.append("id", String(id));
      this.loading = true;

      try {
        const response = await axios.delete(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory/wip`,
          { data }
        );

        if (response.status === 200) {
          notificationStore.showAlertSuccess("Item has been deleted");
          await this.fetchPart({ type: this.type, data: true });
          return response.data;
        }

        notificationStore.showAlertError(
          response.data?.message || "Gagal hapus item"
        );
        return null;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async submitData(data: Record<string, any>): Promise<any | null> {
      this.loading = true;

      try {
        const response = await axios.post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory/wip`,
          data
        );

        if (response.status === 200) {
          notificationStore.showAlertSuccess("Item has been created");
          await this.fetchPart({ type: this.type, data: true });
          return response.data;
        }

        notificationStore.showAlertError(
          response.data?.message || "Gagal simpan data"
        );
        return null;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async fetchGetShortageStock(start: string, end: string): Promise<any> {
      notificationStore.loading = true;

      try {
        const response = await axios.get(
          `http://192.168.10.67/majsf_rest_api/api/rundown_irm/shortage_stock?start=${start}&end=${end}`
        );

        if (response.status === 200) {
          notificationStore.disableLoading();
          return response.data;
        }

        notificationStore.disableLoading();
        return [];
      } catch (error) {
        notificationStore.disableLoading();
        throw error;
      }
    },

    async fetchGetScheduleMaterial(date: string): Promise<any> {
      notificationStore.loading = true;

      try {
        const response = await axios.get(
          `http://192.168.10.67/majsf_rest_api/api/ifrm/schedule_ifrm/prpogr?period=${date}`
        );

        if (response.status === 200) {
          notificationStore.disableLoading();
          return response.data;
        }

        notificationStore.disableLoading();
        return [];
      } catch (error) {
        notificationStore.disableLoading();
        throw error;
      }
    },

    async fetchMdfoSap(month: string): Promise<any | null> {
      this.loading = true;
      this.parts = [];

      const url = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/getMdfo`;

      try {
        const response = await axios.get(url, {
          params: { period: month },
        });

        if (response.status === 200) {
          this.parts = Array.isArray(response.data?.data)
            ? response.data.data
            : Array.isArray(response.data)
            ? response.data
            : [];

          notificationStore.showAlertSuccess(
            `Data MDFO (${month}) berhasil dimuat.`
          );
          return response.data;
        }

        notificationStore.showAlertError(
          response.data?.message ||
            `Gagal memuat data MDFO: Status ${response.status}`
        );
        return null;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async fetchCompareMdfoSo(month: string): Promise<any | null> {
      this.loading = true;
      this.parts = [];
      this.partsMatnr = [];

      const url = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/compareMdfoSo`;

      try {
        const response = await axios.get(url, { params: { period: month } });

        if (response.status === 200) {
          const payload = response.data || {};
          this.parts = Array.isArray(payload.data) ? payload.data : [];
          this.partsMatnr = Array.isArray(payload.dataMatnr)
            ? payload.dataMatnr
            : [];

          notificationStore.showAlertSuccess(
            `Data MDFO SO (${month}) berhasil dimuat.`
          );
          return payload;
        }

        notificationStore.showAlertError(
          response.data?.message ||
            `Gagal memuat data MDFO SO: Status ${response.status}`
        );
        return null;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async generateMdfo(month: string): Promise<any | null> {
      try {
        const response = await axios.post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/generateMdfo`,
          { month }
        );

        if (response.status === 200 && response.data?.status) {
          notificationStore.showAlertSuccess(response.data.message);
          return response.data;
        }

        notificationStore.showAlertError(
          response.data?.message || "Gagal generate MDFO"
        );
        return response.data;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      }
    },

    async fetchEstimatedPcsHour(month: string): Promise<any[]> {
      this.loading = true;
      this.estimated = [];

      try {
        const url = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/calculateMonthlyPlan`;

        const response = await axios.get(url, { params: { month } });

        if (response.status === 200) {
          this.estimated = response.data?.data || [];
          notificationStore.showAlertSuccess(
            `Estimated PCS/Hour bulan ${month} berhasil dimuat.`
          );
          return this.estimated;
        }

        notificationStore.showAlertError(
          response.data?.message || "Gagal memuat perhitungan PCS/hour"
        );
        return [];
      } catch (error) {
        utilityStore.onError(error);
        return [];
      } finally {
        this.loading = false;
      }
    },

    async fetchSoSap(month: string): Promise<any | null> {
      this.loading = true;
      this.parts = [];

      const url = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/getSalesOrder`;

      try {
        const response = await axios.get(url, { params: { month } });

        if (response.status === 200) {
          this.parts = Array.isArray(response.data?.data)
            ? response.data.data
            : [];
          notificationStore.showAlertSuccess(
            `Sales Order (${month}) berhasil dimuat.`
          );
          return response.data;
        }

        notificationStore.showAlertError(
          response.data?.message ||
            `Gagal memuat Sales Order: Status ${response.status}`
        );
        return null;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async generateSo(month: string): Promise<any | null> {
      try {
        const response = await axios.post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/generateSalesOrder`,
          { month }
        );

        if (response.status === 200) {
          notificationStore.showAlertSuccess(
            response.data?.message || "Sales Order berhasil digenerate"
          );
        }

        return response.data;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      }
    },

    async generateDo(
      dateStart: string,
      dateEnd: string,
      customer: string
    ): Promise<any | null> {
      if (!dateStart || !dateEnd || !customer) {
        notificationStore.showAlertError("Isi tanggal dan customer dulu");
        return null;
      }

      const validCustomers = ["MKM", "TMMIN"];
      if (!validCustomers.includes(String(customer).toUpperCase())) {
        notificationStore.showAlertError(
          "Customer tidak valid. Gunakan MKM atau TMMIN"
        );
        return null;
      }

      try {
        const response = await axios.post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/generateDo`,
          {
            date_start: dateStart,
            date_end: dateEnd,
            customer,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        return response.data;
      } catch (error) {
        utilityStore.onError(error);
        return null;
      }
    },

    async updateCalculationsMonth(payload: {
      month: string;
      data: any[];
    }): Promise<any | null> {
      this.loading = true;

      try {
        const url = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/updateCalculationPcsMonth`;

        const response = await axios.post(
          url,
          {
            month: payload.month,
            data: payload.data,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (response.status === 200) {
          notificationStore.showAlertSuccess(
            response.data?.message || "Update berhasil"
          );
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

    async fetchPcsSummaryTrial(params: Record<string, any>): Promise<any[]> {
      this.loading = true;

      try {
        const response = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory/trial`,
          { params }
        );

        const raw = response.data;
        const arr = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : [];

        this.pcsSummaryParts = arr;
        return arr;
      } catch (error) {
        this.pcsSummaryParts = [];
        utilityStore.onError(error);
        return [];
      } finally {
        this.loading = false;
      }
    },
  },
});