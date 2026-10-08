import { closeFormEdit, getDataAch, getKetActual, getKetPlan, getPart, importExcel, openFormEdit, refreshData, removeData, updateData, userCheck } from "@/services/Welding/Transaction/Achievement";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { DataGroup, Detail, FilterParams, FormEdit, KetActual_Plan, PartItem, ResponseData, SummaryData, UserCheck } from "@/types/Welding/Transaction/Achievement";
import { defineStore } from "pinia";
import socket from '@/plugins/socket';

const notificationStore = useNotificationStore();
const utils = useUtilityStore();
const date = utils.getCurrentShift();
const authStore = useAuthStore();

export const useAchievementWld = defineStore('achievementWelding', {
  state: () => ({
    filter: {
      date: date.date,
      period: date.period,
      period2: date.period2,
      clock: date.clock,
      hour: date.hour,
      shift: date.shift,
      day: date.day,
    } as FilterParams,
    cleanData: [] as DataGroup[],
    selectedPrefixLine: "" as  string,
    selectedLineId: "" as  string,
    partData: [] as PartItem[],
    formEdit: {
      detail: [],
      attendance: [],
    } as FormEdit,
    permissions: {
      create: authStore.checkAccess("Transaction.Create.AchievementWelding"),
      update: authStore.checkAccess("Transaction.Update.AchievementWelding"),
      download: authStore.checkAccess("Report.Download.AchievementWelding"),
      pcd: authStore.checkAccess("Transaction.PCD.AchievementWelding"),
    },
    currentUser: {} as UserCheck,
    currentPatan: "" as string,
    keteranganPlan: [] as KetActual_Plan[],
    keteranganActual: [] as KetActual_Plan[],
    isModalFilterOpen: false as boolean,
  }),
  actions: {
    async fetchData() {
      try {
        notificationStore.loading = true;

        const res = await getDataAch(this.filter);
        const partRes = await getPart();
        const ketActual = await getKetActual();
        const ketPlan = await getKetPlan();

        if (res.status !== 200 || partRes.status !== 200 || ketActual.status !== 200 || ketPlan.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data"
          );
          return;
        };

        if (res.data.data && res.data.data.length > 0) {
          this.cleanData = this.mappingData(res.data.data);
        }

        this.partData = partRes.data;
        this.keteranganActual = ketActual.data;
        this.keteranganPlan = ketPlan.data;

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
      } finally {
        this.isModalFilterOpen = false;
        notificationStore.disableLoading();
      }
    },

    mappingData(data: ResponseData[]): DataGroup[] {
      const map = new Map<string, ResponseData[]>();

      data.forEach(item => {
        // summary per ResponseData
        const { summary_data, note } = this.buildSummary(item.detail);

        item.summary_data = summary_data;
        item.note = note;

        const prefix = item.line_id.split('-')[0].trim();

        if (!map.has(prefix)) {
          map.set(prefix, []);
        }

        map.get(prefix)!.push(item);
      });

      return Array.from(map.entries()).map(([prefix_line_id, items]) => ({
        prefix_line_id,
        total_line_id: items.length,
        detail: items,
      }));
    },

    buildSummary(detail: Detail[]): { summary_data: SummaryData; note: string; } {
      let lotsize_sum = 0;
      let repair_sum = 0;
      let reject_sum = 0;
      let stroke_act_sum = 0;
      let total_lotsize_act_sum = 0;
      let tpt_actual_sum = 0;
      const notes: string[] = [];

      detail.forEach(d => {
        const lotsizeAct = Number(d.lotsize_actual ?? 0);
        const repair = Number(d.repair ?? 0);
        const reject = Number(d.reject ?? 0);
        const strokeAct = Number(d.stroke_act ?? 0);
        const tptActual = Number(d.tpt_actual ?? 0);

        const totalLotsizeAct = lotsizeAct + repair;

        // inject ke detail (per row)
        d.total_lotsize_act = totalLotsizeAct || null;
        d.total_dt =
          Number(d.dt_wip ?? 0) +
          Number(d.dt_jig ?? 0) +
          Number(d.dt_machines ?? 0) +
          Number(d.dt_other ?? 0);

        d.uph = tptActual > 0 ? Number(((totalLotsizeAct / tptActual) * 60).toFixed(2)) : null;

        lotsize_sum += lotsizeAct;
        repair_sum += repair;
        reject_sum += reject;
        stroke_act_sum += strokeAct;
        total_lotsize_act_sum += totalLotsizeAct;
        tpt_actual_sum += tptActual;

        if (d.information) notes.push(d.information);
      });

      const totalQty = lotsize_sum + repair_sum;

      return {
        summary_data: {
          qty_total: lotsize_sum,
          qty_persen: totalQty > 0 ? (lotsize_sum / totalQty) * 100 : 0,
          repair_total: repair_sum,
          repair_persen: totalQty > 0 ? (repair_sum / totalQty) * 100 : 0,
          reject_total: reject_sum,
          reject_persen: totalQty > 0 ? (reject_sum / totalQty) * 100 : 0,
          total_stroke_actual: stroke_act_sum,
          avg_uph: tpt_actual_sum > 0 ? (total_lotsize_act_sum / tpt_actual_sum) * 60 : 0,
          tpt_total: tpt_actual_sum,
        },
        note: [...new Set(notes)].join(', '),
      };
    },

    async checkUser() {
      try {

        const res = await userCheck(this.selectedLineId, this.filter.date, this.filter.shift);

        this.currentUser = res.data;

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
      }
    },

    // Cek kunci form sebelum masuk halaman edit. false = sedang dibuka user lain
    // (pemanggil membuka mode view; remark-nya ditampilkan di halaman view detail).
    async canOpenForm(): Promise<boolean> {
      try {

        const res = await userCheck(this.selectedLineId, this.filter.date, this.filter.shift);

        this.currentUser = res.data;

        const isOwner = this.currentUser.user === authStore.user.fullname;

        return !(this.currentUser.status === false && !isOwner);

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
        return false;
      }
    },

    async openFormEdit(patan: string) {
      try {

        const params = {
          line_id: this.selectedLineId,
          date: this.filter.date,
          shift: this.filter.shift,
          patan: patan,
        }
        const res = await openFormEdit(params);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data" 
          );
          return;
        };

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
      }
    },
    
    async closeFormEdit(patan: string) {
      try {

        const params = {
          line_id: this.selectedLineId,
          date: this.filter.date,
          shift: this.filter.shift,
          patan: patan,
        }
        const res = await closeFormEdit(params);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data" 
          );
          return;
        };

        this.currentUser.status = true;
        this.currentUser.user = null;

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
      }
    },

    async editData() {
      try {

        await this.checkUser();

        const isOwner = this.currentUser.user === authStore.user.fullname;
        const isNew = this.currentUser.user === null;
        const valid = isOwner || isNew;

        if (this.currentUser.status == false) {
          if (!valid) {
            notificationStore.showDialogWarning(
              "Warning",
              this.currentUser.messages || "Terjadi kesalahan saat mengambil data" 
            );
            return;
          };
        } 

        this.closeFormEdit(this.currentPatan);

        notificationStore.loading = true;

        const data = new FormData();

        this.formEdit.detail.forEach((row, index) => {
          Object.entries(row).forEach(([key, value]) => {
            if (value === null || value === undefined) {
              data.append(`${key}[]`, '');
            } else {
              data.append(`${key}[]`, String(value));
            }
          });
        });
        
        this.formEdit.attendance.forEach((row, index) => {
          Object.entries(row).forEach(([key, value]) => {
            if (value === null || value === undefined) {
              data.append(`${key}[]`, '');
            } else {
              data.append(`${key}[]`, String(value));
            }
          });
        });

        data.append("line_id", this.selectedLineId);
        data.append("patan", this.currentPatan);
        data.append("date", this.filter.date);
        data.append("shift", this.filter.shift.toString());

        const res = await updateData(data);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat memperbarui data" 
          );
          return;
        };

        notificationStore.showAlertSuccess("Data berhasil diperbarui");
        socket.emit("updateAcievementWelding", this.selectedLineId)    
        this.closeFormEdit(this.currentPatan)
        this.formEdit.detail = [];
        this.formEdit.attendance = [];

        await this.fetchData()

        return true;

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async deleteRow(noUrut: string) {
      try {

        const data = new URLSearchParams();

        data.append("line_id", this.selectedLineId);
        data.append("patan", this.currentPatan);
        data.append("date", this.filter.date);
        data.append("shift", this.filter.shift.toString());
        data.append("urut", noUrut);

        const res = await removeData(data);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat menghapus data" 
          );
          return;
        };

        const refresh = await refreshData({
          ...this.filter,
          "line": this.selectedLineId,
        });

        this.cleanData.find(group => group.prefix_line_id === this.selectedPrefixLine)!.detail.find(item => item.line_id === this.selectedLineId)!.detail = refresh.data.data.detail;

        notificationStore.showAlertSuccess("Data berhasil dihapus");

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
      }
    },
    
    async uploadFileXlsx(file: any) {
      try {

        notificationStore.loading = true;

        const res = await importExcel(file);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat upload data" 
          );
          return;
        };

        await this.fetchData();
        notificationStore.showDialogWarning(
          "Information",
          res.data.messages || "Berhasil import data report"
        );

      } catch (error) {
        console.log("err: ", error);
        utils.onError(error);
      } finally{
        notificationStore.disableLoading();
      }
    },
    
  }
})