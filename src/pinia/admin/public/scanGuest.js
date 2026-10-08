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

export const useScanGuest = defineStore({
  id: "public-guest",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Public.View.Guest"),
      },
      formData: {
        barcode: "",
      },
      dataGuest: [],
      name: [],
      company: [],
      undangan: "",
      hadir: "",
    };
  },
  actions: {
    resetForm() {
      this.formData = {
        barcode: "",
      };
    },
    submit() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("barcode", this.formData.barcode);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/guest-book`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          if (response.data.success == true) {
            const welcomeElements =
            document.getElementsByClassName("welcome_page");
            const formElements = document.getElementsByClassName("form_scan");
            
            // Show welcome elements
            Array.from(welcomeElements).forEach((element) => {
              element.classList.add("visible");
              element.classList.remove("hidden");
              setTimeout(() => {
                element.style.display = "block"; // Ensure display is set after transition
              }, 500); // Match transition duration in CSS
            });

            // Hide form elements
            Array.from(formElements).forEach((element) => {
              element.classList.add("hidden");
              element.classList.remove("visible");
              setTimeout(() => {
                element.style.display = "none"; // Ensure display is set after transition
              }, 500); // Match transition duration in CSS
            });

            this.dataGuest = response.data.data;
            notificationStore.loading = false;
          } else {
            utilityStore.onApiResponseCustom(response, this.resetForm);
          }
          this.resetForm();
        })
        .catch(utilityStore.onError);
    },
    submitNumber() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("barcode", this.formData.barcode);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/guest-book/number`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          utilityStore.onApiResponseCustom(response, this.resetForm);
          if (response.data.success == true) {
            window.location.href = `http://${configStore.apiUrl}/mims/display-guest-book-2`;
          }
          this.resetForm();
        })
        .catch(utilityStore.onError);
    },
    fetchName() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/guest-book`)
        .then((response) => {
          if (response.status === 200) {
            this.name = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchCompany() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/guest-book/company`
        )
        .then((response) => {
          if (response.status === 200) {
            this.company = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchHadir() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/guest-book/hadir`)
        .then((response) => {
          if (response.status === 200) {
            this.hadir = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchUndangan() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/guest-book/undangan`
        )
        .then((response) => {
          if (response.status === 200) {
            this.undangan = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
  },
});
