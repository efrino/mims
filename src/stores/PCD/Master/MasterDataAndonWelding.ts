import { addData, editData, getKetActual, getKetPlan, getMasterPartNum } from "@/services/PCD/Master/MasterAndonWelding";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { FormAndonWld, MasterPart, PlanAndActual } from "@/types/PCD/Master/MasterAndonWelding";
import { defineStore } from "pinia";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();

export const useMasterAndonWld = defineStore('masterAndonWelding', {
  state: () => ({
    planData: [] as PlanAndActual[],
    actualData: [] as PlanAndActual[],
    partData: [] as MasterPart[],
    form: {
      id: "",
      information: "",
      part_number: "",
      job_number: "",
      line: "",
      model: "",
    } as FormAndonWld,
    isModalPlanOpen: false as boolean,
    isModalActualOpen: false as boolean,
    isModalPartOpen: false as boolean,
    action: "add" as string,
  }),
  actions: {
    async fetchPlanData() {
      try {
        notificationStore.loading = true;

        const res = await getKetPlan();

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data"
          );
          return;
        }

        this.planData = res.data;
        
      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchActualData() {
      try {
        notificationStore.loading = true;

        const res = await getKetActual();

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data"
          );
          return;
        }

        this.actualData = res.data;

      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchMasterPart() {
      try {
        notificationStore.loading = true;

        const res = await getMasterPartNum();

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data"
          );
          return;
        }

        this.partData = res.data;

      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    detailPlan(data: PlanAndActual) {
      Object.assign(this.form, data);

      this.isModalPlanOpen = true;
    },

    detailActual(data: PlanAndActual) {
      Object.assign(this.form, data);

      this.isModalActualOpen = true;
    },

    detailPart(data: MasterPart) {
      Object.assign(this.form, data);

      this.isModalPartOpen = true;
    },

    async onUpdate(type: string) {
      try {

        const requiredFieldsMap: Record<string, string[]> = {
          part: ["id", "job_number", "part_number", "line", "model"],
          plan: ["id", "information"],
          act: ["id", "information"],
        };

        const requiredFields = requiredFieldsMap[type];

        if (!requiredFields) {
          notificationStore.showAlertError("Tipe data tidak valid");
          return;
        }

        const isInvalid = requiredFields.some(
          field => !(this.form as any)[field]
        );

        if (isInvalid) {
          notificationStore.showDialogWarning(
            "Warning",
            "Data yang anda masukan tidak lengkap"
          );
          return;
        }

        notificationStore.loading = true;

        const data = this.action === "add" ? new FormData() : new URLSearchParams();

        Object.entries(this.form).forEach(([key, value]) => {
          data.append(key, value);
        });

        data.append("tipe", type);

        const res = this.action === "add" ? await addData(data) : await editData(data);

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
        utilityStore.onError(error);
      } finally {
        this.isModalActualOpen = false;
        this.isModalPartOpen = false;
        this.isModalPlanOpen = false;
        notificationStore.disableLoading();
        this.action = "add";
      }
    }
  }
})