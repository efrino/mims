import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const authStore = useAuthStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
export const useMaintenanceStore = defineStore({
  id: "inventory-barcode",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Master.Create.Patan")
      },
      table: {
        items: []
      },
      table_sc: {
        items: []
      },
      filter: {
        est_start_checking: date.date,
      },
      plan:0,
      act:0,
      job_daily:0,
      job_request:0,
      job_daily_total:0,
      job_request_total:0,
    };
  },
  actions: {
    fetchJob() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/maintenance`,{
          params: this.filter
        })
        .then((response) => {
          if (response.status === 200) {
              this.table.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchJobSC() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/maintenance/sc`,{
          params: this.filter
        })
        .then((response) => {
          if (response.status === 200) {
              this.table_sc.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchPlan() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/maintenance/plan`,{
          params: this.filter
        })
        .then((response) => {
          if (response.status === 200) {
              this.plan = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchAct() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/maintenance/act`,{
          params: this.filter
        })
        .then((response) => {
          if (response.status === 200) {
              this.act = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchDaily() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/maintenance/daily`,{
          params: this.filter
        })
        .then((response) => {
          if (response.status === 200) {
              this.job_daily = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchRequest() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/maintenance/request`,{
          params: this.filter
        })
        .then((response) => {
          if (response.status === 200) {
              this.job_request = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
  }
});
