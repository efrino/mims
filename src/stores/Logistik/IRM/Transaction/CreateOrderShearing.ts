import type { MaterialItems, ShearingSpecs, OrderResults, ShearingItems } from "@/types/Logistik/IRM/Transaction/CreateOrderShearing";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import { defineStore } from "pinia";
import { fetchdataDropdown, fetchdataShearing, submitToSAP } from "@/services/Logistik/IRM/Transaction/CreateOrderShearing";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();

export const useCreateOrderShearingStore = defineStore('orderShearing', {
  state: () => ({
    materialItems: [] as MaterialItems[],
    shearingItems: {} as ShearingItems,
    shearingSpecs: [] as ShearingSpecs[],
    shearingResult: [] as OrderResults[],
    shearingResultTest: [],
    selectedMaterialNumber: "" as string,
    tanggal: '',
    shift: '',
    mesin: '',
    operator: '',
    supplier: '',
  }),
  actions: {
    async getMaterialItems() {
      try {
        notificationStore.loading = true;

        const res = await fetchdataDropdown();

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Gagal mendapatkan items part"
          );
        }

        this.materialItems = res.data.data.data.ZDT_MTRL2.map((item: any) => ({
          part_number: item.MATNR,
          spec: item.MAKTG,
          job_number: item.BISMT,
        }));

      } catch (error) {
        utilityStore.onError(error);
        console.log("err: ", error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async getShearingItems() {
      try {
        notificationStore.loading = true;

        const res = await fetchdataShearing(this.selectedMaterialNumber);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Gagal mendapatkan data shearing"
          );
        }

        this.shearingItems = res.data.data.data;
      } catch (error) {
        utilityStore.onError(error);
        console.log("err: ", error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async getShearingSpecs() {
      try {
        notificationStore.loading = true;

        const res = await fetchdataDropdown();

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Gagal mendapatkan items part"
          );
        }

        this.shearingSpecs = res.data.data.data.ZDT_SHEAR2.map((item: any) => ({
          part_number: item.MATNR,
          spec: item.MAKTG,
          job_number: item.BISMT,
        }));
      } catch (error) {
        utilityStore.onError(error);
        console.log("err: ", error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async submitOrderShearing(shearing: string, quantity: string) {
      try {
        notificationStore.loading = true;

        const res = await submitToSAP(shearing, quantity);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            'Warning',
            'Gagal membuat order shearing'
          );
          return false;
        }

        this.shearingResult = res.data.map((item: any) => ({
          icon: item.ICON,
          zno: item.ZNO,
          shearing_number: item.PLNBEZ,
          order_type: item.SFCPF,
          shearing_quantity: item.GAMNG,
          date: item.GLTRP,
          company_code: item.WERKS,
          status: item.MESSAGE2,
          shearing_doc: item.MESSAGE,
        }));
        this.shearingResultTest = res.data[0].MESSAGE!;

        notificationStore.showDialogSuccess(
          'Success',
          `${this.shearingResult[0].status}!\nNomor dokumen ${this.shearingResult[0].shearing_doc} telah dibuat.`,
        );

        return true;
      } catch (error) {
        console.log("err: ", error);
        return false;
      } finally {
        notificationStore.disableLoading();
      }
    },
  }
});