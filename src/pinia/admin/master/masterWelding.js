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
export const useMasterWeldingStore = defineStore({
  id: "master-welding",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Master.Create.AndonWelding"),
      },
      datatables_plan: {
        search: "",
        headers: [
          { text: "ID", align: "left", value: "id" },
          { text: "Keterangan", align: "left", value: "information" },
        ],
        items: [],
        filters: {
          id: [],
          information: [],
        }
      },
      datatables_act: {
        search: "",
        headers: [
          { text: "ID", align: "left", value: "id" },
          { text: "Keterangan", align: "left", value: "information" },
        ],
        items: [],
        filters: {
          id: [],
          information: [],
        }
      },
      datatables_part: {
        search: "",
        headers: [
          { text: "ID", align: "left", value: "id" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Line", align: "left", value: "line" },
          { text: "Model", align: "left", value: "model" },
        ],
        items: [],
        filters: {
          id: [],
          part_number: [],
          job_number: [],
          line: [],
          model: [],
        }
      },
      form: [
        "id",
        "information",
        "part_number",
        "job_number",
        "line",
        "model",
      ],
      dialog: {
        formPlan: false,
        formAct: false,
        formPart: false,
      },
      formData: {
        id: "",
        information: "",
        part_number: "",
        job_number: "",
        line: "",
        model: "",
      },
    };
  },
  actions: {
    resetForm() {
      this.fetchMasterKeteranganPlan();
      this.fetchMasterKeteranganActual();
      this.fetchMasterPartNumber();
      this.formData = {
        id: "",
        information: "",
        part_number: "",
        job_number: "",
        line: "",
        model: "",
      };
      this.datatables_plan.items = [];
      this.datatables_act.items = [];
      this.datatables_part.items = [];
      this.dialog.formPlan = false;
      this.dialog.formAct = false;
      this.dialog.formPart = false;
    },
    searchPart(item) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
    },
    fetchMasterKeteranganPlan() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/plan?tipe=plan`
        )
        .then((response) => {
          if (response.data) {
            this.datatables_plan.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    filterItemsPlan() {
      return this.datatables_plan.items.filter((d) => {
        return Object.keys(this.datatables_plan.filters).every((f) => {
          return (
            this.datatables_plan.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatables_plan.filters[f].toLowerCase())
          );
        });
      });
    },

    fetchMasterKeteranganActual() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/actual?tipe=actual`
        )
        .then((response) => {
          if (response.data) {
            this.datatables_act.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    filterItemsActual() {
      return this.datatables_act.items.filter((d) => {
        return Object.keys(this.datatables_act.filters).every((f) => {
          return (
            this.datatables_act.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatables_act.filters[f].toLowerCase())
          );
        });
      });
    },

    fetchMasterPartNumber() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/part?tipe=part`
        )
        .then((response) => {
          if (response.data) {
            this.datatables_part.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    filterItemspart() {
      return this.datatables_part.items.filter((d) => {
        return Object.keys(this.datatables_part.filters).every((f) => {
          return (
            this.datatables_part.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatables_part.filters[f].toLowerCase())
          );
        });
      });
    },

    loadData(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.formPlan = true;
    },
    loadDataAct(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.formAct = true;
    },
    loadDataPart(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.formPart = true;
    },
    onUpdate(tipe) {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formData).map((e) => {
        if (this.action == "Add" || this.action == "Edit") {
          valid = true;
        }
        data.append(e[0], e[1]);
      });
      data.append("tipe", tipe);
      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/welding`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/welding`,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            data,
          };
        }

        axios(configHttp)
          .then((response) =>
            notificationStore.onApiResponseToastAlert(response, this.resetForm)
          )
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
        notificationStore.disableLoading();
      }
    },
  },
});
