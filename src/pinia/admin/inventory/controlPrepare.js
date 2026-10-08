import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
export const useControlPrepare = defineStore({
  id: "control-prepare",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      dataMieruka: [],
      data: [],
      datap4: [],
      dataEkspor: [],
      cycle: 0,
      allCycle: [],
      totalCycle: [],
      timecyclep4: 0,
      itemP5: 0,
      itemP4: 0,
      itemEkspor: 0,
      actItemp4: 0,
      filter: {
        cycle: 0,
        date: date.date,
        customer: "",
        period: date.period,
      },
      datatables: {
        headers: [
          { text: "Cycle", align: "left", value: "cycle" },
          { text: "ETD (Estimated Time of Departure)", align: "left", value: "etd" },
          { text: "ETA (Estimated Time of Arrival)", align: "left", value: "eta" },
        ],
        p5: [],
        p4: [],
        items: [],
        filters: {
          cycle: [],
          etd: [],
          eta: [],
        },
      },
      dialog: {
        datePicker: false,
        form: false,
        timePickerForm: false,
        timePickerFormStart: false,
        filter: true,
      },
      speedDial: {
        model: false,
        btn: false,
      },
      formData: {
        customer: "",
        cycle: "",
        etd: "",
        eta: "",
      },
      list: {
        customer: [
          "ADM PLANT 1",
          "ADM PLANT 4",
          "ADM PLANT 5",
          "TMMIN",
          "GAYA MOTOR",
          "MMKI",
          "MKM",
          "HMMI",
        ],
      },
      form: ["customer", "cycle", "etd", "eta"],
    };
  },
  actions: {
    resetForm() {
      this.fetchMasterCycle();
      this.fetchAllCycle();
      this.formData = {
        customer: "",
        cycle: "",
        etd: "",
        eta: "",
      };
      this.dialog.form = false;
    },

    fetchDataItem(cycle, notification, plant) {
      notificationStore.loading = notification;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5?cycle=${cycle}&dn=${plant}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.data = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchDataItemP4(cycle, notification, plant) {
      notificationStore.loading = notification;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4?cycle=${cycle}&dn=${plant}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.datap4 = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchDataEkspor(notification) {
      notificationStore.loading = notification;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/ekspor`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.dataEkspor = response.data.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchTotalCycle() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.allCycle = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchTotalCycleNOW(cycle, plant) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/total_cycle?cycle=${cycle}&dn=${plant}`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.totalCycle = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchTimeCycleP4() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/time_p4`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.timecyclep4 = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchTotalItem(cycle) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/act?cycle=${cycle}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.itemP5 = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchTotalItemEkspor() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/act_ekspor`
        )
        .then((response) => {
          if (response.status === 200) {
            this.itemEkspor = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchActItemP4(cycle) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/total_p4?cycles=${cycle}`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.actItemp4 = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchTotalItemP4() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/total_p4`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.itemP4 = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    // Insert Laber dari SAP Ke Database MySql
    onUpload() {
      notificationStore.loading = true;
      axios
        .post(`http://${configStore.apiUrl}/majsf_rest_api/api/Shipping/`)
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchMasterCycle() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`)
        .then((response) => {
          if (response.status === 200) {
            this.datatables.p5 = response.data.p5.detail;
            this.datatables.p4 = response.data.p4.detail;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    fetchAllCycle() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/cycle`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.data.warning == false) {
            utilityStore.onApiResponse(response);
          } else {
            this.dialog.filter = false;
            this.datatables.items = response.data;
            notificationStore.disableLoading();
          }
        })
        .catch(utilityStore.onError);
    },

    loadDataMasterCycle(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.form = true;
    },

    onUpdate() {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formData).map((e) => {
        if (
          !e[1] &&
          !(this.action == "Add" && e[0] == "customer" && e[0] == "cycle")
        ) {
          valid = false;
        }
        data.append(e[0], e[1]);
      });

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`,
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

    filterItems() {
      return this.datatables.items.filter((d) => {
        return Object.keys(this.datatables.filters).every((f) => {
          return (
            this.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    filterItemsSAP() {
      return this.datatables.p4.filter((d) => {
        return Object.keys(this.datatables.filters).every((f) => {
          return (
            this.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    deletePart(cycle, customer) {
      let data = new URLSearchParams();
      data.append("cycle", cycle);
      data.append("customer", customer);
      this.loading = true;
      axios
        .delete(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`,
          { data: data }
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.showAlertSuccess("Item has been deleted");
            this.resetForm();
          } else {
            notificationStore.showAlertFailed(response.data.message);
          }
        })
        .catch(configStore.onError);
    },

    fetchDataMieruka(cycle, customer) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/mieruka_shipping?cycle=${cycle}&customer=${customer}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.dataMieruka = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchDataSAP() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/report-delivery/delivery_detail`)
        .then((response) => {
          if (response.status === 200) {
            // notificationStore.disableLoading();
          }
        });
    },
  },
});
