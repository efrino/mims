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
export const useAndonManagementStore = defineStore({
  id: "andon-management",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Master.Create.AndonManagement"),
      },
      datatables: {
        headers: [
          { text: "ID", align: "left", value: "id" },
          { text: "Andon Name", align: "left", value: "title" },
          { text: "Location", align: "left", value: "location" },
          { text: "Device", align: "left", value: "device" },
          { text: "IP Address", align: "left", value: "ip_address" },
          { text: "Short Link", align: "left", value: "short_link" },
          { text: "Action", align: "left", value: "action" },
        ],
        items: [],
        filters: {
          id: [],
          title: [],
          location: [],
          device: [],
          ip_address: [],
          short_link: [],
        },
      },
      datatablesList: {
        headers: [
          { text: "Order", align: "left", value: "urut" },
          { text: "Andon Name", align: "left", value: "title_andon" },
          { text: "Link", align: "left", value: "link" },
          { text: "Parameter", align: "left", value: "parameter" },
          { text: "Duration (Minutes)", align: "left", value: "duration" },
          { text: "Move Action", align: "center", value: "action" },
          { text: "Delete Action", align: "center", value: "action" },
        ],
        items: [],
        filters: {
          title_andon: [],
          link: [],
          duration: [],
        },
      },
      table: {
        items: [],
      },
      form: ["id", "title", "location", "device", "ip_address", "short_link"],
      dialog: {
        formData: false,
        formListAndon: false,
        formDataGroupAndon: false,
      },
      formData: {
        id: "",
        title: "",
        location: "",
        device: "",
        ip_address: "",
        short_link: "",
      },
      formDataAndon: {
        id: "",
        andon_id: "",
        title_andon: "",
        duration: "",
        parameter: ""
      },
      list: {
        device: ["Windows", "Raspberry PI"],
      },
      listAndon: [],
    };
  },
  actions: {
    resetForm() {
      this.fetchDataAndonManagement();
      this.formData = {
        id: "",
        title: "",
        location: "",
        device: "",
        ip_address: "",
        short_link: "",
      };
      this.formDataAndon = {
        id: "",
        title_andon: "",
        andon_id: "",
        duration: "",
        parameter: ""
      };
      // this.datatables.items = [];
      this.datatablesList.items = [];
      this.dialog.formData = false;
      this.dialog.formDataGroupAndon = false;
    },

    fetchDataAndonManagement() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/Display`)
        .then((response) => {
          if (response.data) {
            this.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    filterItemsAndon() {
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

    loadData(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.formData = true;
    },

    loadDataAndon(data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });

      this.fetchListDataAndon(data["id"]);
      this.dialog.formListAndon = true;
    },

    addDataAndonGroup(action, data) {
      Object.entries(this.formDataAndon).map((i) => {
        this.formDataAndon[i[0]] = data[i[0]];
      });

this.action = action;
      this.dialog.formDataGroupAndon = true;
    },

    onUpdate() {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formData).map((e) => {
        if (e[0] === "short_link" && e[1]) {
          valid = true;
        }
        data.append(e[0], e[1]);
      });
      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Display`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Display`,
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
        notificationStore.showAlertWarning("Short Link harus diisi.");
        notificationStore.disableLoading();
      }
      this.fetchDataAndonManagement();
    },

    fetchDataDisplayAndon(shortlink) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Display/andon?shortlink=${shortlink}`
        )
        .then((response) => {
          if (response.data) {
            this.table.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    fetchListDataAndon(id) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Display/andon?id=${id}`
        )
        .then((response) => {
          if (response.data) {
            this.datatablesList.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    deleteItem(id, title, display_id) {
      const self = this;
      notificationStore.showConfirm(
        "Delete Item",
        `Do you really to delete ${title}?`,
        function () {
          self.deleteAndon(id, display_id);
        }
      );
    },

    deleteAndon(id, display_id) {
      let data = new URLSearchParams();
      data.append("id", id);
      this.loading = true;
      axios
        .delete(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Display/index_delete`,
          { data: data }
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.showAlertSuccess("Item has been deleted");
            this.loading = false;
            this.fetchListDataAndon(display_id);
          } else {
            notificationStore.showAlertFailed(response.data.message);
          }
        })
        .catch(configStore.onError);
    },

    onUpdateAndonGroup(id) {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formDataAndon).map((e) => {
        if (e[0] === "short_link" && e[1]) {
          valid = true;
        }
        data.append(e[0], e[1]);
      });
      data.append("display_id", id);
      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Display/Group`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Display/Group`,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            data,
          };
        }

        axios(configHttp)
          .then((response) =>
            notificationStore.onApiResponseToastAlert(response, this.fetchListDataAndon(id), this.dialog.formDataGroupAndon = false)
          )
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning("Short Link harus diisi.");
        notificationStore.disableLoading();
      }
      
    },

    fetchListAndon() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/andon/display/andon`
        )
        .then((response) => {
          if (response.status === 200) {
            this.listAndon = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    onMove(to, urut, id, display_id) {
      const fd = new URLSearchParams();
      fd.append("urut", urut);
      fd.append("id", id);
      fd.append("move", to);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Display/move`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.fetchListDataAndon(display_id)
          )
        )
        .catch(configStore.onError);
    },
  },
});
