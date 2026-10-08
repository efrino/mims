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

export const usePrintBarcodeStore = defineStore({
  id: "ifp-print-barcode",
  state() {
    return {
      partItems: [],
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Module.Create.PrintBarcode"),
      },
      error: 0,
      formData: {
        type: "",
        dateBuild: "",
        jarak: 0,
      },
      formRepeat: {
        type: "",
        from: 0,
        to: 0,
      },
      form: [
        "type",
        "jarak",
        "dateBuild",
      ],
      table: {
        items: [],
      },
      filter: {
        create_date: date.clock,
      },
      filter1: {
        update_date: date.clock,
      },
      list: {
        type: [
          { text: "Polybox 6004", value: "6004" },
          { text: "Polybox 6644", value: "6644" },
          { text: "Polybox 6655", value: "6655" },
          { text: "Polybox 6675", value: "6675" },
          { text: "Polybox 6688", value: "6688" },
          { text: "Polybox 6699", value: "6699" },
          { text: "Polybox D593", value: "D593" },
          "64900-SU2ID",
          "65131-SU2ID",
          "65197-SU2ID",
          "66700-SU2ID",
          "65111/22-SU2ID",
          "57171/81-SU2ID",
          "65212/22-SU2ID",
          "71510/20-SU2ID",
          "71530/40-SU2ID",
          "64900-KS",
          "66700-KS",
          "71510/20-KS",
          "71430/40-KS",
          "C",
          "D",
          "D1",
          "D2",
          "DASH",
          "R",
          "R Special",
          "R2",
          "RD80",
          "S11",
          "S14",
          "S2",
          "S3",
          "S4",
          "S6",
          "WB11",
          "WBD11",
          "P21",
          "P21Kit",
          "MBP01",
          "MCF08",
          "MCF01",
          "MCF02",
          "MCF03",
          "MCF04",
          "MCW01",
          "MEX01",
          "MEX02",
          "MKS01",
          "MKS02",
          "MKS03",
          "MKS04",
        ],
      },
      dialog: {
        datePicker: false,
        datePickerForm: false,
        filter: false,
        upload: false,
        form: false
      },
    };
  },

  getters: {
    sumOf(state) {
      if (state.table.items) {
        return {
          jarak: state.table.items.reduce(
            (a, b) => (a = b.jarak),
            0
          ),
        };
      } else {
        return {
          jarak: 0,
        };
      }
    },
  },

  actions: {
    resetForm() {
      this.fetchDataBarcode();
      this.formData = {
        type: "",
        jarak: 0,
      };
      this.formRepeat = {
        type: "",
        from: 0,
        to: 0,
      };
      this.dialog.form = false;
    },
    fetchDataBarcode() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/print-barcode/data`,
          {}
        )
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
    fetchPrintDataBarcode() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/print-barcode`, {
          params: this.filter,
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
    fetchPrintRepeat() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/print-barcode/print`, {
          params: this.filter1,
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
    addPrint() {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formData).map((e) => {
        if (
          !e[1] &&
          !(this.action == "Add" && (e[0] == "type" || e[0] == "jarak"))
        ) {
          valid = false;
        }
        data.append(e[0], e[1]);
      });

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/print-barcode/add`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
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
    repeatPrint() {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formRepeat).map((e) => {
        if (
          !e[1] &&
          !(this.action == "Add" && (e[0] == "type" || e[0] == "from" || e[0] == "to"))
        ) {
          valid = false;
        }
        data.append(e[0], e[1]);
      });

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/print-barcode/repeat`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
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
    searchPart(item) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
    },
    fetchDataPart() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/part`)
        .then((response) => {
          if (response.status === 200) {
            this.partItems = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
  },
});
