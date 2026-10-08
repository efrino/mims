import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { useGangguanService } from '@/services/Stamping/Transaction/GangguanMachineService';
import type { GangguanItem } from '@/types/Stamping/Transaction/GangguanMachine';

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const gangguanService =  useGangguanService;

export const useGangguanMachine = defineStore('Gangguan Machine', {
  state: () => {
    return {
      form: {
        period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 7),
      },
      mesin: "",
      job_number_actual: "",
      d_start: "",
      d_end: "0000-00-00 00:00:00",
      act_mesin: "",
      is_done: "",
      act_sarana: "",
      act_dies: "",
      machine_position:"",
      urut: "",
      params: utilityStore.getCurrentShift(),
      gangguan: [] as GangguanItem[],
      gangguan_sarana: [] as GangguanItem[],
      gangguan_dies: [] as GangguanItem[],
      dialog: {
        detail: false,
        datePicker: false,
        filter: false,
        formLed: false,
        formKetRepair: false,
        formKetDT: false,
        confirmDelete: false,
        formKanban: false,
        formStartLed: false,
        formAction: false,
      },
      selectedForm: null as GangguanItem | null,
    };
  },
  actions: {
    loadFormAction(item: GangguanItem) {
      this.selectedForm = item;

      this.mesin = item.machine;
      this.job_number_actual = item.job_number_actual;
      this.d_start = item.d_start;
      this.d_end = item.d_end;
      this.act_mesin = item.act_mesin;
      this.act_sarana = item.act_sarana;
      this.act_dies = item.act_dies;
      this.is_done = item.is_done;
      this.machine_position = item.machine_position;
      this.urut = item.urut;

      // Buka Dialog
      this.dialog.formAction = true;
    },

    closeFormAction() {
      this.dialog.formAction = false;
      
      setTimeout(() => {
        this.selectedForm = null;
        this.mesin = "";
        this.act_mesin = "0";
        this.is_done = "N";
      }, 300);
    },
    async fetchDataGangguan() {
      const utilityStore = useUtilityStore();
      notificationStore.loading = true;
      try {
        const params = {
            ...this.params,
            shift: String(this.params.shift)
        };
        const response = await gangguanService.fetchDataGangguan(params);
        if (response.status === 200 && response.data.status) {
          if (response.data.status) {
            this.gangguan = response.data.data;
          } else {
            utilityStore.onApiResponse(response);
          }
          notificationStore.disableLoading();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error: any) {
        notificationStore.disableLoading();
        utilityStore.onError(error);
      }
    },
    async onAction() {
      if (!this.mesin) {
        console.error("No machine selected");
        return;
      }
      
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      notificationStore.loading = true;
      
      const payload = {
        part_number: this.job_number_actual,
        date: this.params.date,
        shift: String(this.params.shift),
        machine: this.mesin,
        urut: Number(this.urut),
        machine_position: this.machine_position,
      };

      try {
        const response = await useGangguanService.postActionStart(payload);
        notificationStore.onApiResponseToastAlert(
          response,
          () => {
            this.closeFormAction();
            this.fetchDataGangguan();
          }
        );
      } catch (error: any) {
        notificationStore.disableLoading();
        utilityStore.onError(error);
      }
    },
    async onDone() {
      if (!this.mesin) return;
      
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      notificationStore.loading = true;
      
      const isSarana = this.act_sarana == '1';
      const isMesin = this.act_mesin == '1';

      const payload = {
        part_number: this.job_number_actual,
        date: this.params.date,
        shift: String(this.params.shift),
        machine: this.mesin,
        urut: Number(this.urut),
        machine_position: this.machine_position,
      };

      try {
        const response = await useGangguanService.postActionDone(payload);
        notificationStore.onApiResponseToastAlert(
          response,
          () => {
            this.closeFormAction();
            if (isSarana) {
               this.fetchDataGangguanSarana();
            } else if (isMesin) {
               this.fetchDataGangguan();
            } else {
               this.fetchDataGangguanDies();
            }
          }
        );
      } catch (error: any) {
        notificationStore.disableLoading();
        utilityStore.onError(error);
      }
    },
    async fetchDataGangguanSarana() {
      const utilityStore = useUtilityStore();
      const notificationStore = useNotificationStore();

      notificationStore.loading = true;

      try {
        const params = { ...this.params, shift: String(this.params.shift) };
        const response = await gangguanService.fetchDataGangguanSarana(params);

        if (response.status === 200) {
          if (response.data.status) {
            // Update State
            this.gangguan_sarana = response.data.data;
          } else {
            utilityStore.onApiResponse(response);
          }
          notificationStore.disableLoading();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error: any) {
        notificationStore.disableLoading();
        utilityStore.onError(error);
      }
    },
    async fetchDataGangguanDies() {
      const utilityStore = useUtilityStore();
      const notificationStore = useNotificationStore();

      notificationStore.loading = true;

      try {
        const params = { ...this.params, shift: String(this.params.shift) };
        const response = await gangguanService.fetchDataGangguanDies(params);

        if (response.status === 200) {
          if (response.data.status) {
            this.gangguan_dies = response.data.data;
          } else {
            utilityStore.onApiResponse(response);
          }
          notificationStore.disableLoading();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error: any) {
        notificationStore.disableLoading();
        utilityStore.onError(error);
      }
    },
  }
})