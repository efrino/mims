import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { useTagOkIFPDService } from '@/services/Logistik/IFP/Report/tagOkIFPDService';
import { useAuthStore } from '@/stores/auth';
import type { ParamsFilter, ScannedTagRawItem, UnscanTagPayload, ScannedItem } from '@/types/Logistik/IFP/Report/TagOkIFPD';

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const tagOKService = useTagOkIFPDService;
const date = utilityStore.getCurrentShift();

export const useTagOkIFPDStore = defineStore('TagOkIFPD', {
  state: () => {
    return {
      type: '',
      scannedTags: [] as ScannedTagRawItem[],
      scannedTable: [] as ScannedItem[],
      isLoading: false,
      params: { start: date.date, end: '' } as ParamsFilter,
      dialog: {
        deleteScan: false
      }
    };
  },
  getters: {
    permissions: (state) => {
      const authStore = useAuthStore();

      return {
        create: authStore.checkAccess('Module.Create.ScanBarcodeIFP'),
        update: authStore.checkAccess('Module.Update.ScanBarcodeIFP'),
        deleteInIfpd: authStore.checkAccess('Module.Update.ScannedTagIfp')
      };
    }
  },
  actions: {
    async validateDateRange() {
      const utilityStore = useUtilityStore();
      this.isLoading = true;

      try {
        const startDate = this.params.start;
        const endDate = this.params.end;

        if (startDate && endDate) {
          if (new Date(startDate) > new Date(endDate)) {
            const msg = 'Invalid date selection! Start Date tidak bisa lebih besar dari End Date.';

            notificationStore.showAlertError(msg);
          }

          await this.fetchScannedTags(startDate, endDate);
          return true;
        } else if (startDate && !endDate) {
          await this.fetchScannedTags(startDate, undefined);
          return true;
        } else {
          throw new Error('Start Date perlu di isi!');
        }
      } catch (error: any) {
        utilityStore.onError(error);
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async fetchScannedTags(start?: string, end?: string) {
      const utilityStore = useUtilityStore();
      this.isLoading = true;

      if (start) this.params.start = start;
      if (end) this.params.end = end;

      try {
        const response = await tagOKService.fetchScannedTagIfp({
          start: this.params.start,
          end: this.params.end || this.params.start
        });

        if (response.data && response.data.success === false) {
          this.scannedTags = [];
          this.scannedTable = [];
        } else {
          const dataArray = Array.isArray(response.data) ? response.data : response.data.data;

          this.scannedTags = dataArray || [];

          this.scannedTable = (dataArray || []).map(
            (item: ScannedTagRawItem): ScannedItem => ({
              id_tag_ok: item.id_tag_ok,
              date: item.date,
              shift: item.shift,
              line_id: item.line_id,
              part_number: item.part_number,
              job_number: item.job_number,
              project: item.project,
              qty: item.qty,
              scan_in_date: item.scan_in_date,
              scan_in_user: item.scan_in_user,
              action: ''
            })
          );
        }
      } catch (error) {
        utilityStore.onError(error);
        this.scannedTags = [];
        this.scannedTable = [];
      } finally {
        this.isLoading = false;
      }
    },
    async unscanTag(id: string | number) {
      const authStore = useAuthStore();
      const utilityStore = useUtilityStore();

      this.isLoading = true;

      try {
        const payload: UnscanTagPayload = {
          id_tag_ok: id,
          nik: authStore.user.username ?? ''
        };

        const response = await tagOKService.unscanTagIfpd(payload);

        if (response.status === 200) {
          notificationStore.showAlertSuccess('Scan tag berhasil di hapus');
          // Refresh data table setelah hapus
          await this.fetchScannedTags();
        } else {
          const message = response.data?.message || 'Gagal untuk unscan tag';
          notificationStore.showAlertError(message);
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        this.isLoading = false;
      }
    }
  }
});
