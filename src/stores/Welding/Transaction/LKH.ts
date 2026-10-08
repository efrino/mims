import { defineStore } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { addDataLKH, fetchDataLKH, getPartItemLKH } from '@/services/Welding/Transaction/LKHService';
import { useUtilityStore } from '@/stores/utility';
import { useNotificationStore } from '@/stores/notification';

const authStore = useAuthStore();
const utilityStore = useUtilityStore();
const notificationStore = useNotificationStore();
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
}

interface PartItem {
  BISMT: string
  FIELD: string
  DESC: string
}

export const useLKHStore = defineStore('WeldingProductionLKH', {
  state: () => ({
    tableRows: [] as Rows[],
    form: {
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .substr(0, 10),
      shift: "",
      partNumber: "",
      qty: "",
      period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .substr(0, 7),
    },
    permissions: {
      downloadReport: authStore.checkAccess("Report.Download.LkhWelding"),
      create: authStore.checkAccess("Transaction.Create.LkhWelding"),
      download: authStore.checkAccess("Transaction.Download.LkhWelding"),
      update: authStore.checkAccess("Transaction.Update.LkhWelding"),
    },
    filterDate: {
      date: date.date,
    },
    partItems: [] as PartItem[],
  }),
  actions: {
    async fetchTableData() {

      notificationStore.loading = true;

      try {
        const currentShift = utilityStore.getCurrentShift();
        const response = await fetchDataLKH(currentShift.date);
        this.tableRows = response.data as Rows[];

      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.loading = false;
      }
    },

    async addData() {
      try {

        const form = this.form;
        if (!form.date || !form.shift || !form.partNumber || !form.qty) {
          notificationStore.showAlertError(
            "Data yang dikirim harus lengkap!"
          )
          return;
        }

        notificationStore.loading = true;

        const res = await addDataLKH(this.form);
        if (res.status === 200) {
          notificationStore.showAlertSuccess(
            "Data berhasil ditambah!"
          )
        } else {
          notificationStore.showAlertWarning(
            "Ada kesalahan saat menambah data!"
          )
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async getPartItem() {
      try {
        const res = await getPartItemLKH();

        if (res.status === 200) {
          this.partItems = res.data;
        }
      } catch (error) {
        utilityStore.onError(error);
      }
    },
  }
});