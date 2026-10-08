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
export const useCountdownStore = defineStore({
  id: "countdown-store",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      context: null,
      permissions: {
        create: authStore.checkAccess("Master.Create.CountdownManagement"),
        update: authStore.checkAccess("Master.Update.CountdownManagement"),
      },
      datatables: {
        headers: [
          { text: "No", align: "left", value: "" },
          { text: "Job Description", align: "left", value: "job_description" },
          { text: "Group", align: "left", value: "description" },
          { text: "PIC", align: "left", value: "first_name" },
          { text: "Due Date", align: "left", value: "due_date" },
          { text: "Status", align: "left", value: "" },
          { text: "Action", align: "left", value: "" },
        ],
        items: [],
        filters: {
          job_description: [],
          description: [],
          first_name: [],
          due_date: [],
        },
      },
      table: {
        items: [],
      },
      dataUsers: [],
      params: utilityStore.getCurrentShift(),
      speedDial: {
        model: false,
        btn: false,
      },
      form: ["id", "title", "location", "device", "ip_address", "short_link"],
      dialog: {
        form: false,
      },
      formData: {
        job_description: "",
        user_id: "",
        due_date: "",
      },
    };
  },
  actions: {
    resetForm() {
      this.fetchScheduleSTO("all");
      this.formData = {
        job_description: "",
        user_id: "",
        due_date: "",
      };
      this.dialog.form = false;
    },

    fetchScheduleSTO(status) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/countdown?status=${status}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.table.items = response.data;
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

    fetchUsers() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/users/user-list`)
        .then((response) => {
          if (response.status === 200) {
            this.dataUsers = response.data;
          } else {
            this.onApiResponse(response);
          }
        })
        .catch(this.onError);
    },

    searchUser(item) {
      return `<strong>${item.fullname}</strong> - ${item.description}`;
    },

    onUpdate(vm) {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formData).forEach((e) => {
        console.log(!e[1]);
        if (!e[1]) {
          valid = false;
        }
        data.append(e[0], e[1]);
      });
      if (valid && this.action == "Add") {
        valid = true;
      } else {
        valid = false;
      }

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/countdown`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/countdown`,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            data,
          };
        }

        axios(configHttp)
          .then((response) => {
            notificationStore.onApiResponseToastAlert(response, this.resetForm);
            vm.$socket.emit("updateCountdown");
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
        notificationStore.disableLoading();
      }
    },

    jobDone(vm, job, user_id) {
      const fd = new URLSearchParams();
      fd.append("job_description", job);
      fd.append("user_id", user_id);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/countdown/job-done`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response, this.resetForm);
          vm.$socket.emit("updateCountdown");
        })
        .catch(utilityStore.onError);
    },
  },
});
