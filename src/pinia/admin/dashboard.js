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
export const useDashboardStore = defineStore({
  id: "master-UpdateLog",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      user: authStore.checkUserName(),
      date: date,
      permissions: {
        create: authStore.checkAccess("Master.Create.UpdateLog"),
      },
      table: {
        items: [],
      },
      datatables: {
        headers: [
          { text: "Date", align: "left", value: "date" },
          { text: "End Date", align: "left", value: "end_date" },
          { text: "Data", align: "left", value: "data_update" },
        ],
        items: [],
        filters: {
          date: [],
          data_update: [],
        }
      },
      dialog: {
        update: false,
        form: false,
        datePickerForm: false,
        dateEndPickerForm: false,
      },
      error: 0,
      formData: {
        date: date.date,
        end_date: date.date,
        data_update: "",
      },
    };
  },
  actions: {
    resetForm() {
      this.formData = {
        date: "",
        data_update: "",
      };
      this.dialog.form = false;
      this.fetchAllDataUpdate();
    },

    fetchDataUpdate() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Update_log`
        )
        .then((response) => {
          if (response.status === 200) {
            this.table.items = response.data;
            if(this.table.items.length >= 1) {
              this.dialog.update = true;
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    // checkUserName() {
    //   return this.user;
    // },

    // checkReadUpdate() {
    //   const user = this.checkUserName();
    //   // notificationStore.loading = true;
    //   axios
    //     .get(
    //       `http://${configStore.apiUrl}/majsf_rest_api/api/master/Update_log/check?user=${user}`
    //     )
    //     .then((response) => {
    //       if (response.data == false) {
    //         this.dialog.update = true;
    //         notificationStore.disableLoading();
    //       }
    //     })
    //     .catch(utilityStore.onError);
    // },

    // readUpdate() {
    //   const fd = new URLSearchParams();
    //   // const id = this.line_id;
    //   fd.append("user", this.user);

    //   const configHttp = {
    //     method: "post",
    //     url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Update_log/read`,
    //     data: fd,
    //   };
    //   axios(configHttp);
    //   // this.resetForm();
    // },

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

    fetchAllDataUpdate() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Update_log/all`
        )
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

    loadDataLog(action, data) {
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
          !(this.action == "Add" && (e[0] == "date" || e[0] == "shift"))
        ) {
          valid = false;
        }
        data.append(e[0], e[1]);
      });

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Update_log/add`,
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
  },
});
