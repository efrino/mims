import type { KanbanItem, PartItems, PrintPreviewKanbanData } from "@/types/PCD/Kanban/PrintKanban";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import { defineStore } from "pinia";
import { addPrintKanban, fetchKanbanData, fetchPartItems, fetchPrintDataKanban, sendToSAP } from "@/services/PCD/Kanban/PrintKanban";
import { useConfigStore } from "@/stores/config";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const configStore = useConfigStore();

export const usePrintKanbanStore = defineStore('printKanban', {
    state: () => ({
      partItems: [] as PartItems[],
      dataTable: [] as KanbanItem[],
      selectedPartNumber: "" as string,
      tablePriview: [] as PrintPreviewKanbanData[],
    }),
    actions: {
      async getPartItems() {
        try {
          notificationStore.loading = true;

          const res = await fetchPartItems();

          if (res.status !== 200) {
            notificationStore.showDialogWarning(
              "Warning",
              "Gagal mendapatkan items part"
            );
          }

          this.partItems = res.data as PartItems[];

        } catch (error) {
          utilityStore.onError(error);
          console.log("err: ", error);
        } finally {
          notificationStore.disableLoading();
        }
      },

      async fetchKanbanData() {
        try {
          notificationStore.loading = true;

          const res = await fetchKanbanData();

          if (res.status !== 200) {
            notificationStore.showDialogWarning(
              "Warning",
              "Gagal mendapatkan data kanban"
            );
          }

          this.dataTable = res.data as KanbanItem[];
          this.tablePriview = [];

        } catch (error) {
          utilityStore.onError(error);
          console.log("err: ", error);
        } finally {
          notificationStore.disableLoading();
        }
      },

      async fetchSAPData() {
        try {
          notificationStore.loading = true;

          const res = await sendToSAP(this.selectedPartNumber);

          if (res.status !== 200) {
            notificationStore.showDialogWarning(
              "Warning!",
              "Gagal mendapatkan data dari SAP"
            );
          }

          await this.fetchKanbanData();
          notificationStore.showAlertSuccess("Berhasil mendapatkan data dari SAP");

        } catch (error) {
          utilityStore.onError(error);
          console.log("err: ", error);
        } finally {
          notificationStore.disableLoading();
        }
      },

      async addPrintKanban(selectedData: PartItems[]) {
        try {
          notificationStore.loading = true;

          if (selectedData.length === 0) {
            notificationStore.showDialogWarning('No rows selected!', 'Pilih minimal satu baris untuk diproses.');
            return;
          }

          console.log("selectedData: ", selectedData);

          const res = await addPrintKanban(selectedData);

          if (res.status !== 200) {
            notificationStore.showDialogWarning(
              "Warning!",
              "Gagal mendapatkan data kanban"
            );
          }

          this.tablePriview = [];

          window.open(
            `${window.location.origin}${import.meta.env.BASE_URL}pcd/kanban/print-kanban/print-preview-kanban`,
            "_blank"
          );

          // this.previewPrintKanban();

        } catch (error) {
          console.log("err: ", error);
          utilityStore.onError(error);
        } finally {
          notificationStore.disableLoading();
        }
      },

      async previewPrintKanban() {
        try {

          const res = await fetchPrintDataKanban();

          if (res.status !== 200 ) {
            notificationStore.showDialogWarning(
              "Warning!",
              "Gagal mendapatkan data preview kanban"
            );
          }
          console.log("res preview: ", res.data);
          this.tablePriview = [];

          this.tablePriview = res.data as PrintPreviewKanbanData[];

        } catch (error) {
          utilityStore.onError(error);
          console.log("err: ", error);
        } finally {
          notificationStore.disableLoading();
        }
      },
    },
});