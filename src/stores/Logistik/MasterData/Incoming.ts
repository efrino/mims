import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { useIncomingService } from '@/services/Logistik/MasterData/IncomingService';
import type { MasterIncomingItem, IncomingFormData, IncomingFormKey, filterDate } from '@/types/Logistik/MasterData/Incoming';
import { useConfigStore } from '@/stores/config';

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const incomingService = useIncomingService;
const date = utilityStore.getCurrentShift();
const configStore = useConfigStore();

const now = new Date();
const currentYear = String(now.getFullYear());
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

export const useIncomingStore = defineStore('Master Data Incoming', {
  state: () => {
    return {
      dataTable: [] as MasterIncomingItem[],
      urlPreview: null,
      filter: {
        inventaris: '',
        department: '',
        period: date.period,
        date: date.date
      },
      filterDate: {
        clock: '',
        date: '',
        day: '',
        hour: '',
        period: `${currentYear}-${currentMonth}`,
        period2: '',
        shift: 1,
        month: currentMonth,
        year: currentYear
      } as filterDate,
      dialog: {
        detail: false,
        masterData: false,
        filter: false,
        form: false,
        upload: false,
        datePickerPeriod: false,
        dataIncoming: false,
        dataBudget: false
      },
      action: 'Add',
      formDataIncoming: {
        ZMATL: '',
        ZDESK: '',
        ZPLAN: '',
        ZQTY: '',
        ZSATUAN: '',
        ZASPEK: ''
      } as IncomingFormData
    };
  },
  actions: {
    resetForm() {
      this.dialog.detail = false;
      this.dialog.form = false;
    },
    loadDataMasterIncoming(action: string, data: MasterIncomingItem) {
      const keys = Object.keys(this.formDataIncoming) as IncomingFormKey[];

      keys.forEach((key) => {
        if (key in data) {
          this.formDataIncoming[key] = String(data[key as keyof MasterIncomingItem]);
        }
      });

      this.action = action;
      this.dialog.form = true;
    },
    async fetchMasterDataIncoming(value?: string) {
      let year = this.filterDate.year;
      let month = this.filterDate.month;

      if (!year || !month) {
        const now = new Date();
        year = String(now.getFullYear());
        month = String(now.getMonth() + 1).padStart(2, '0');

        this.filterDate.year = year;
        this.filterDate.month = month;
      }
      this.filter.period = `${year}-${month}`;

      if (value === 'static') {
        const currentShift = utilityStore.getCurrentShift();
        const sYear = currentShift.period.substring(0, 4);
        const sMonth = currentShift.period.substring(4, 6);

        this.filterDate.year = sYear;
        this.filterDate.month = sMonth;
        this.filter.period = `${sYear}-${sMonth}`;
      }

      notificationStore.loading = true;

      try {
        const response = await incomingService.getMasterDataIncoming(this.filter);

        if (response.status === 200) {
          this.dataTable = response.data.data;
          notificationStore.disableLoading();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        utilityStore.onError(error);
      }
    },
async onUpdateIncoming() {
  notificationStore.loading = true;
  let valid = true;

  const formattedPeriod = `${this.filterDate.year}-${this.filterDate.month}`;

  const data = new URLSearchParams();

  const keys = Object.keys(this.formDataIncoming) as IncomingFormKey[];
  keys.forEach((key) => {
    const value = this.formDataIncoming[key];
    if (!value) valid = false;
    data.append(key, value);
  });

  data.append('period', formattedPeriod);

  if (!valid) {
    notificationStore.showAlertWarning('Data yang anda kirim tidak Lengkap.');
    notificationStore.loading = false;
    return;
  }

  try {
    const response = await incomingService.updateIncoming(data);
    notificationStore.onApiResponseToastAlert(response, () => {
      this.resetForm();
    });
    await this.fetchMasterDataIncoming();
  } catch (error) {
    configStore.onError(error);
  } finally {
    notificationStore.loading = false;
  }
}
  }
});
