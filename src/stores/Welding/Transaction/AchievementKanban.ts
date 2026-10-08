import { fetchDataAchKanban, syncSAPAchKbn } from "@/services/Welding/Transaction/AchievementKanban";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { filterDate, lineDetail, lines } from "@/types/Welding/Transaction/AchievementKanban";
import { defineStore } from "pinia";

const utilityStore = useUtilityStore();
const notificationStore = useNotificationStore();

export const useWeldingAchKanbanProdStore = defineStore('WeldingProductionAchievement', {
  state: () => ({
    filterDate: {
      clock: "",
      date: "",
      day: "",
      hour: "",
      period: "", 
      period2: "",
      shift: 1,
      month: "",
      year: "",
    } as filterDate,
    achKanbanData: {
      lines: [] as lines[],
      detail: [] as lineDetail[],
      errorMessage: "" as string,
    },
    isModalOpen: false,
  }),
  actions: {
    async fetchDataAchKanban() {
      try {
        notificationStore.loading = true;

        const res = await fetchDataAchKanban(this.filterDate);
        
        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning!",
            "Terjadi kesalahan saat mengambil data!"
          )
          return;
        }

        if (!res.data.status) {
          notificationStore.showDialogWarning(
            "Warning!",
            `${res.data.messages}`
          )
          this.achKanbanData.lines = [];
          this.achKanbanData.errorMessage = res.data.messages;
          return;
        }

        this.achKanbanData.lines = res.data.data;
        
        this.achKanbanData.lines.forEach((line) => {
          let total_lkh = 0;
          let total_sap = 0;

          line.detail.forEach((item) => {
            const actShift1 = parseInt(item.ACT_SHIFT1 ?? "0", 10);
            const actShift2 = parseInt(item.ACT_SHIFT2 ?? "0", 10);

            const sapShift1 = parseInt(item.ZQTY_SAP_ZSHIFT1 ?? "0", 10);
            const sapShift2 = parseInt(item.ZQTY_SAP_ZSHIFT2 ?? "0", 10);

            total_lkh += actShift1 + actShift2;
            total_sap += sapShift1 + sapShift2;
          });

          line.total_lkh = total_lkh;
          line.total_sap = total_sap;
        });

      } catch (error) {
        console.log("err: ", error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    detailAchKanban(line_id: string) {
      try {
        const selectedLine = this.achKanbanData.lines.find(
          e => e.line_id === line_id
        );

        this.achKanbanData.detail = selectedLine?.detail ?? [];
        this.achKanbanData.detail.map(p => {
          p.total_lkh = selectedLine?.total_lkh!;
          p.total_sap = selectedLine?.total_sap!;
        })

        this.isModalOpen = true;

      } catch (error) {
        console.log("err:", error);
      }
    },

    async syncSAP() {
      try {
        notificationStore.loading = true;

        const month = this.filterDate.month;
        const year = this.filterDate.year;

        this.filterDate.period = `${month}-${year}`
        this.filterDate.period2 = `${month}${year}`

        const res = await syncSAPAchKbn(this.filterDate);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning!",
            "Terjadi kesalahan saat sinkronisasi data SAP"
          )
          return;
        }

        notificationStore.showDialogSuccess(
          "Success!",
          `Sinkronisasi data SAP Periode ${month}-${year} berhasil`
        )

      } catch (error) {
        console.log("err: ", error)
      } finally {
        notificationStore.disableLoading();
      }
    },
  } 
})