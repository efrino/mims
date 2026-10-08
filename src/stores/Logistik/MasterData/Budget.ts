import type { DataBudget, FilterBudget, FormBudget } from "@/types/Logistik/MasterData/Budget";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import { defineStore } from "pinia";
import { addBudget, editBudget, getBudget } from "@/services/Logistik/MasterData/Budget";

const notificationStore = useNotificationStore();
const utils = useUtilityStore();
const date = utils.getCurrentShift()

export const useBudgetStore = defineStore('budget-store', {
  state: () => ({
    filter: {
      department: "Press",
      period: date.period,
      date: date.date,
      inventaris: "",
    } as FilterBudget,
    data: {} as DataBudget,
    form: {
      ZMATL: "",
      ZDESK: "",
      ZSATUAN: "",
      ZPRESS: "",
      ZWELD: "",
      ZLOG: "",
      ZDIEMTC: "",
      ZDIEMFG: "",
      ZPSPRESS: "",
      ZPSWELDING: "",
      ZTOOLJIG: "",
      ZQC: "",
      ZGA: "",
      ZPLAN: "",
      department: "",
      period: "",
    } as FormBudget,
    isModalUpdateOpen: false as boolean,
    isModalFilterOpen: false as boolean,
    action: "add" as string,
    departmentList: [
      "Press",
      "Welding",
      "Logistic",
      "Dies Maintenance",
      "Dies Manufacture",
      "Plant Service Press",
      "Plant Service Welding",
      "Tooling JIG",
      "Quality Control",
      "General Affair",
    ] as string[],
  }),
  actions: {
    async fetchDataBudget() {
      try {
        notificationStore.loading = true;

        const res = await getBudget(this.filter);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data"
          );
          return;
        }

        this.data = res.data;

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
      } finally {
        this.isModalFilterOpen = false;
        notificationStore.disableLoading();
      }
    },

    async updateData() {
      try {

        if (!this.form.ZDESK || !this.form.ZMATL || !this.form.ZPLAN) {
          this.isModalUpdateOpen = false;
          notificationStore.showDialogWarning(
            "Warning",
            "Data yang anda kirim tidak lengkap"
          );
          return;
        }

        notificationStore.loading = true;

        const data = this.action === "add" ? new FormData() : new URLSearchParams();

        Object.entries(this.form).forEach(([key, value]) => {
          data.append(key, value);
        });

        const res = this.action === "add" ? await addBudget(data) : await editBudget(data);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengirim data"
          );
          return;
        }

        notificationStore.showAlertSuccess(
          this.action === "add"
            ? "Berhasil menambahkan data"
            : "Berhasil mengubah data"
        );

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
      } finally {
        this.isModalUpdateOpen = false;
        notificationStore.disableLoading();
        this.action = "add";
        await this.fetchDataBudget();
      }
    },

    detailData(code: string) {
      const selectedLine = this.data.data.find(
        e => e.ZMATL === code
      );

      if (!selectedLine) {
        notificationStore.showDialogWarning(
          "Warning",
          "Data tidak tersedia!"
        );
        return;
      }

      this.action = "edit";
      this.isModalUpdateOpen = true;

      this.form = {
        ZMATL: selectedLine.ZMATL,
        ZDESK: selectedLine.ZDESK,
        ZPLAN: selectedLine.ZPLAN,
        ZSATUAN: "",
        ZPRESS: "",
        ZWELD: "",
        ZLOG: "",
        ZDIEMTC: "",
        ZDIEMFG: "",
        ZPSPRESS: "",
        ZPSWELDING: "",
        ZTOOLJIG: "",
        ZQC: "",
        ZGA: "",
        department: this.filter.department,
        period: this.filter.period,
      }
    },
  }
})