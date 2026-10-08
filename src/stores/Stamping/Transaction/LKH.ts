import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from "@/pinia/utility";

// TS type, service & utils
import { stampingLkhService } from "@/services/Stamping/Transaction/stampingLkhService";

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export interface Rows {
  id: string;
  date: string;
  shift: string;
  model: string;
  jobNumber: string;
  partNumber: string;
  createdAt: string;
  qty: string;
  keterangan: string;
}

interface PartItem {
  BISMT: string
  FIELD: string
  DESC: string
}

export const useLkhStore = defineStore("StampingProductionLkh", {
  state: () => ({
      tag: "LKH-STP",
      tableRows: [] as Rows[],
      form: {
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 10),
        shift: "",
        partNumber: "",
        qty: "",
        keterangan: "",
        period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 7),
      },
      filterDate: {
        date: date.date
      },
      permissions: {
        downloadReport: authStore.checkAccess("Report.Download.LkhStamping"),
        create: authStore.checkAccess("Transaction.Create.LkhStamping"),
        download: authStore.checkAccess("Transaction.Download.LkhStamping"),
        update: authStore.checkAccess("Transaction.Update.LkhStamping"),
      },
      // shiftItems: ["1", "2"],
      partItems: [] as PartItem[],
      // current: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      // .toISOString()
      // .substr(0, 10),
      // dialog: false
  }),
  actions: {
    async fetchData() {
      notificationStore.loading = true;

      const payload = {
        tag: this.tag,
        period: this.form.period,
      };

      try {
        const response = await stampingLkhService.fetchData(payload);

        if (response.status === 200) {
          this.tableRows = response.data as Rows[];
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
    //  async onVoid(params: { ZID?: string }) {
    //   notificationStore.loading = true;

    //   notificationStore.showConfirm(
    //     "Confirmation",
    //     "Do you really want to void this data?",
    //     async () =>  {
    //       if (!params?.ZID) {
    //         notificationStore.showAlertWarning(
    //           "Data yang anda kirim tidak lengkap"
    //         );
    //         notificationStore.disableLoading();
    //         return;
    //       }

    //       const payload = new URLSearchParams();
    //       payload.append("id", params.ZID);
    //       payload.append("tag", this.tag);

    //       try {
    //         const response = await stampingLkhService.onVoid(payload);

    //         if (response.status === 200) {
    //           notificationStore.onApiResponseToastAlert(
    //             response,
    //             this.fetchData
    //           );
    //         } else {
    //           utilityStore.onApiResponse(response);
    //         }
    //       } catch (error) {
    //         utilityStore.onError(error);
    //       } finally {
    //         notificationStore.disableLoading();
    //       }
    //     }
    //   );
    // },
  },
});