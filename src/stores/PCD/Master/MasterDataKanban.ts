import { addPart, getAllPart } from "@/services/PCD/Master/MasterDataKanban";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { DataKanban, Form } from "@/types/PCD/Master/MasterDataKanban";
import { defineStore } from "pinia";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();

export const useMasterDataKanban = defineStore('MasterDataKanban', {
  state: () => ({
    dataKanban: [] as DataKanban[],
    isModalOpen: false as boolean,
    action: "add" as string,
    form: {
      tipe: "",
      part_number: "",
      job_number: "",
      photo: "",
    } as Form,
  }),
  actions: {
    async fetchDataPart() {
      try {
        notificationStore.loading = true;

        const res = await getAllPart();

        if (res.status !== 200 ) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data"
          );
          return;
        }

        this.dataKanban = res.data;

      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async addOrEditData() {
      try {
        notificationStore.loading = true;

        if (this.action == 'add') {

          if (!this.form.job_number || !this.form.part_number || !this.form.tipe || !this.form.photo) {
            notificationStore.showDialogWarning(
              "Warning",
              "Data yang anda kirim tidak lengkap"
            );
            return;
          }
          
        } else {

          if (!this.form.job_number || !this.form.part_number || !this.form.tipe) {
            notificationStore.showDialogWarning(
              "Warning",
              "Data yang anda kirim tidak lengkap"
            );
            return;
          }
        }

        const res = await addPart(this.form)

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengirim data"
          );
          return;
        }

        await this.fetchDataPart();
        
        notificationStore.showAlertSuccess("Berhasil mengirim data")
        
      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
        this.isModalOpen = false;
      }
    },

    detailData(part_number: string) {
      const detail: DataKanban | undefined = this.dataKanban.find(
        item => item.part_number === part_number
      );
      
      if (!detail) {
        notificationStore.showDialogWarning(
          "Warning",
          "Data tidak ditemukan"
        );
        return;
      }

      this.form = {
        tipe: "",
        part_number: detail.part_number,
        job_number: detail.job_number,
        photo: "",
      }

      this.action = 'edit';
      this.isModalOpen = true;
    }
  }
})