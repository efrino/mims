import axios from "axios";
import pinia from "@/pinia/store.js";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useNotificationStore } from "@/pinia/notification";
import { useUtilityStore } from "@/pinia/utility";
import { permissionList } from "@/router/list_jangan-dipake-lagi(buat referensi aja)";
import { useAuthStore } from "@/pinia/auth";

const configStore = useConfigStore(pinia);
const authStore = useAuthStore(pinia);
const utilityStore = useUtilityStore(pinia);
const notificationStore = useNotificationStore(pinia);

export const useManageUserStore = defineStore({
  id: "manage-user",
  state() {
    return {
      datatables: {
        search: "",
        headers: [
          { text: "NIK/Username", align: "left", value: "username" },
          { text: "Fullname", align: "left", value: "fullname" },
          { text: "Action", align: "center", value: "action", sortable: false }
        ],
        items: []
      },
      setPermission: {
        headers: [
          { text: "Menu", align: "left" },
          { text: "View", align: "center" },
          { text: "Create", align: "center" },
          { text: "Update", align: "center" },
          { text: "Download", align: "center" }
        ],
        data: [],
        permisionSelect: [],
        permissionList: Object.entries(permissionList).map((e) => e[1])
      },
      form: {
        username: "",
        firstName: "",
        lastName: "",
        password: "",
        passwordConfirm: "",
        passwordOld: "",
        photo_type: "",
        photo_data: "",

        avatarImg: require("@/assets/profile.png"),
        urlPreview: ""
      },
      isPasswordVisible: false,
      isPasswordConfirmVisible: false,
      isPasswordOldVisible: false
    };
  },
  actions: {
    resetForm() {
      this.form.username = "";
      this.form.firstName = "";
      this.form.lastName = "";
      this.form.password = "";
      this.form.passwordConfirm = "";
      this.form.passwordOld = "";
      this.form.photo_type = "";
      this.form.photo_data = "";

      this.form.urlPreview = "";
    },
    fetchUsers() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/users/user-list`)
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
    getDataUsers() {
      notificationStore.loading = true;
      const config = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/users/user-data`,
        data: { username: this.form.username }
      };
      axios(config)
        .then((response) => {
          if (response.data) {
            this.form.firstName = response.data.first_name;
            this.form.lastName = response.data.last_name;
            this.form.urlPreview = response.data.photo
              ? response.data.photo
              : this.form.avatarImg;
            configStore.page.name = `Edit User (${this.form.username} - ${this.form.firstName} ${this.form.lastName})`;
            notificationStore.disableLoading();
          }
        })
        .catch(utilityStore.onError);
    },
    getUserPermissions() {
      notificationStore.loading = true;
      this.setPermission.permisionSelect = [];
      const config = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/users/user-permission`,
        data: { username: this.form.username }
      };
      axios(config)
        .then((response) => {
          if (response.data.permission) {
            this.setPermission.permisionSelect = response.data.permission;
          }
          console.log();
          configStore.page.name = `Set Permission (${response.data.username} - ${response.data.fullname})`;
          notificationStore.disableLoading();
        })
        .catch(utilityStore.onError);
    },
    onSave() {
      notificationStore.loading = true;
      const form = this.form;
      if (
        form.username &&
        form.firstName &&
        form.lastName &&
        form.password &&
        form.passwordConfirm
      ) {
        const data = new FormData();
        data.append("identity", form.username);
        data.append("first_name", form.firstName);
        data.append("last_name", form.lastName);
        data.append("password", form.password);
        data.append("password_confirm", form.passwordConfirm);
        if (form.photo_data && form.photo_type) {
          data.append("photo_data", form.photo_data);
          data.append("photo_type", form.photo_type);
        }
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/users/add-data-user`,
          headers: {
            "Content-Type": "multipart/form-data"
          },
          data
        };
        axios(configHttp)
          .then((response) =>
            utilityStore.onApiResponse(response, this.resetForm)
          )
          .catch(utilityStore.onError);
      } else {
        const alert = notificationStore.alert;

        alert.status = true;
        alert.title = "Peringatan";
        alert.message = "Data yang anda kirim tidak Lengkap";
        alert.type = "warning";
      }
      notificationStore.disableLoading();
    },
    onEdit() {
      notificationStore.loading = true;
      const form = this.form;
      if (form.firstName && form.lastName) {
        const data = new URLSearchParams();
        data.append("username", form.username);
        data.append("first_name", form.firstName);
        data.append("last_name", form.lastName);
        data.append("password", form.password);
        data.append("password_confirm", form.passwordConfirm);
        if (form.photo_data && form.photo_type) {
          data.append("photo_data", form.photo_data);
          data.append("photo_type", form.photo_type);
        }
        const config = {
          method: "put",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/users/user-data`,
          headers: {
            "Content-Type": "multipart/form-data"
          },
          data
        };
        axios(config)
          .then((response) =>
            utilityStore.onApiResponse(response, () => {
              configStore.page.name = `Edit User (${this.form.username} - ${this.form.firstName} ${this.form.lastName})`;
            })
          )
          .catch(utilityStore.onError);
      } else {
        const alert = notificationStore.alert;

        alert.status = true;
        alert.title = "Peringatan";
        alert.message = "Data yang anda kirim tidak Lengkap";
        alert.type = "warning";
      }
      notificationStore.disableLoading();
    },
    onSetPermission() {
      notificationStore.loading = true;
      const setPermission = this.setPermission;
      if (setPermission.permisionSelect.length) {
        const data = new URLSearchParams();
        setPermission.permisionSelect.forEach((element) => {
          data.append("permission[]", element);
        });
        data.append("user", this.form.username);
        const config = {
          method: "put",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/users/user-permission`,
          data
        };
        axios(config)
          .then(utilityStore.onApiResponse)
          .catch(utilityStore.onError);
      } else {
        const alert = notificationStore.alert;

        alert.status = true;
        alert.title = "Peringatan";
        alert.message = "Data yang anda kirim tidak Lengkap";
        alert.type = "warning";
      }
      notificationStore.disableLoading();
    },
    onChangePassword() {
      notificationStore.loading = true;
      const form = this.form;
      if (
        authStore.user.username &&
        form.passwordOld &&
        form.password &&
        form.passwordConfirm
      ) {
        const data = new FormData();
        data.append("username", authStore.user.username);
        data.append("old", form.passwordOld);
        data.append("new", form.password);
        data.append("new_confirm", form.passwordConfirm);
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/users/reset-password`,
          headers: {
            "Content-Type": "multipart/form-data"
          },
          data
        };
        axios(configHttp)
          .then((response) =>
            utilityStore.onApiResponse(response, () => {
              authStore.logout();
              this.resetForm();
              configStore.router.push({
                name: "login"
              });
            })
          )
          .catch(utilityStore.onError);
      } else {
        const alert = notificationStore.alert;

        alert.status = true;
        alert.title = "Warning";
        alert.message = "Please check if your data is complete";
        alert.type = "warning";
      }
      notificationStore.disableLoading();
    }
  }
});
