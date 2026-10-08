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

export const usePatanScheduleStore = defineStore({
  id: "master-patan-schedule",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Master.Create.PatanSchedule")
      },
      datatables: {
        headers: [
          { text: "Date", align: "left", value: "date" },
          { text: "Shift", align: "left", value: "shift" },
          { text: "Patan", align: "left", value: "patan" }
        ],
        items: [],
        filters: {
          date: [],
          shift: [],
          patan: [],
        }
      },
      datatablesUpload: {
        headers: [
          { text: "Date", align: "left", value: "date" },
          { text: "Shift", align: "left", value: "shift" },
          { text: "Patan", align: "left", value: "patan" },
          { text: "Simulate", align: "left", value: "ERROR" }
        ],
        items: []
      },
      form: [
        "date",
        "shift",
        "patan",
      ],
      dialog: {
        datePicker: false,
        datePickerForm: false,
        filter: false,
        upload: false,
        form: false
      },
      error: 0,
      speedDial: {
        model: false,
        btn: false
      },
      filter: {
        date: date.date.substring(0, 7)
      },
      formData: {
        date: date.date,
        shift: "",
        patan: "",
        // is_active: 0
      },
      list: {
        shift: ["1", "2"],
        patan: ["A", "B", "C", "D", "R1", "R2", "R3", "R4"],
        status: ["1", "0"]
      }
    };
  },
  actions: {
    resetForm() {
      this.fetchPatanSchedule();
      this.formData = {
        date: date.date,
        shift: "",
        patan: "",
        // is_active: 0
      };
      this.datatablesUpload.items = [];
      this.dialog.form = false;
    },
    fetchPatanSchedule() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/patan-schedule`, {
          params: this.filter
        })
        .then((response) => {
          if (response.status === 200) {
            this.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
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
    loadDataPatanSchedule(action, data) {
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
          !(this.action == "Add" && (e[0] == "date" &&  e[0] == "shift"))
          ) {
            valid = false;
          }
          data.append(e[0], e[1]);
      });

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan-schedule/add`,
          headers: {
            "Content-Type": "multipart/form-data"
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan-schedule`,
            headers: {
              "Content-Type": "multipart/form-data"
            },
            data
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
    onUpload() {
      notificationStore.loading = true;
      if (this.datatablesUpload.items.length) {
        const data = new FormData();
        this.datatablesUpload.items.map((item) => {
          Object.keys(item).map((val) => {
            if (this.form.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
        });
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan-schedule`,
          headers: {
            "Content-Type": "multipart/form-data"
          },
          data
        };
        axios(configHttp)
          .then((response) => {
            if (response.status === 200) {
              let error = true;
              let message = "";
              if (response.data.success) {
                error = false;
                this.resetForm();
                this.dialog.upload= false;
              }
              let tmp = document.createElement("DIV");
              tmp.innerHTML = response.data.messages + message;
              if (error) {
                notificationStore.showAlertWarning(
                  tmp.textContent || tmp.innerText || ""
                );
              } else {
                notificationStore.showAlertSuccess(
                  tmp.textContent || tmp.innerText || ""
                );
              }
            } else {
              notificationStore.showAlertWarning(response.data.status);
            }
            notificationStore.disableLoading();
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap"
        );
      }
    }
  }
});
