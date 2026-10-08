import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import success from "@/assets/sound/success.mp3";
import labelMaj from "@/assets/sound/label_salah.mp3";
import kanbanAdm from "@/assets/sound/kanban_adm.mp3";
import scanFirst from "@/assets/sound/adm_first.mp3";
import double from "@/assets/sound/is_doubled.mp3";
import not_matched from "@/assets/sound/not_matched.mp3";

const authStore = useAuthStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useScanBarcodeStore = defineStore({
  id: "ifp-scan-barcode",
  state() {
    return {
      context: null,
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Module.Create.ScanBarcodeIFP"),
        update: authStore.checkAccess("Module.Update.ScanBarcodeIFP"),
      },
      error: 0,
      formData: {
        scan: "",
        jarak: 0,
        scan_maj: "",
        scan_adm: "",
        case_mark: "",
        qty: 0,
        part_number: "",
        type: "",
        area:""
      },

      formScan: {
        kanban_adm: "",
        qr_code: 0,
      },

      formDataETD: {
        key: "",
      },
      datatables: {
        headers: [
          {
            text: "ID Kanban",
            align: "center",
            value: "barcode",
          },
          {
            text: "Part Number",
            align: "center",
            value: "part_number",
          },
          {
            text: "Qty",
            align: "center",
            value: "qty",
          },
          {
            text: "Area",
            align: "center",
            value: "area",
          },
          {
            text: "Jenis",
            align: "center",
            value: "jenis",
          },
          {
            text: "Nik",
            align: "center",
            value: "nik",
          },
          {
            text: "Date",
            align: "center",
            value: "date",
          },
          {
            text: "Hour",
            align: "center",
            value: "hour",
          },
        ],
        items: [],
        filters: {
          part_number: [],
          barcode: [],
          qty: [],
          area: [],
          jenis: [],
          nik: [],
          date: [],
          hour: [],
        },
      },
      form: ["type", "jarak", "barcode"],
      listArea: [
        "Ekspor / DCWA",
        "Koridor Welding",
        "IFP ADM",
        "IFP MKM/MMKI",
        "IFP HMMI",
      ],
      typePart: ["WIP", "IFP"],
      partItems: [],
      jenisKanban: ["Terpasang", "Tambahan"],
      filter: {
        create_date: date.clock,
      },
      dialog: {
        datePicker: false,
        datePickerForm: false,
        filter: false,
        upload: false,
        form: false,
      },
      table_label: {
        items: {
          kanban: 0,
          scan: 0,
          remain: 0,
        },
      },
      datatablesAdm: {
        headers: [
          {
            text: "No",
            align: "left",
            value: "index",
          },
          {
            text: "Part Number",
            align: "left",
            value: "PARTNO",
          },
          {
            text: "Status Scan",
            align: "left",
            value: "scan_status",
          },
          {
            text: "Qty Box",
            align: "left",
            value: "QTYBOX",
          },
        ],
        items: [],
      },
      list: {
        customer: ["ADM PLANT 4", "ADM PLANT 5"],
      },
    };
  },

  actions: {
    resetForm() {
      // this.fetchDataBarcode();
      this.formData = {
        qty: "",
        part_number: 0,
      };
      this.formDataETD = {
        customer: "",
        cycle: 0,
        key: "",
      };
      (this.formScan = {
        kanban_adm: "",
        qr_code: 0,
      }),
        (this.dialog.form = false);
    },
    fetchDataPart() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/part/sto`)
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
    searchPart(item) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
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
    fetchReportStoKanban() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/kanban`,
          {
            params: this.filter,
          }
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
    fetchPrintRepeat() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/print-barcode/print`,
          {
            params: this.filter1,
          }
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
    onScan(vm) {
      const fd = new URLSearchParams();
      fd.append("scan", this.formData.scan);
      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/scan`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response, this.resetForm);
          vm.$socket.emit("updateRundown", this.line_id);
        })
        .catch(utilityStore.onError);
    },
    onScanEkanban() {
      const fd = new URLSearchParams();
      fd.append("scan", this.formData.scan);
      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/kanban_circulation/scan_ekanban`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          utilityStore.onApiResponse(response);
          this.formData.scan = '';
        })
        .catch(utilityStore.onError);
    },
    onScanKanban() {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      // fd.append("line_id", this.line_id);
      // fd.append("date", this.params.date);
      // fd.append("shift", this.params.shift);
      fd.append("part_number", this.formData.part_number);
      fd.append("type", this.formData.type);
      fd.append("qty", this.formData.qty);
      fd.append("area", this.formData.area);
      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(
            response,
            (this.formData.qty = '', this.formData.part_number = '')
          );
          // vm.$socket.emit("updateRundown", this.line_id);
        })
        .catch(utilityStore.onError);
    },
    onScanShipping(vm) {
      const scanData = [
        {
          type: this.formScan.type,
          kanban_adm: this.formScan.kanban_adm,
          tag_ok: this.formScan.tag_ok,
        },
      ];

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/scan_shipping`,
        headers: {
          "Content-Type": "application/json",
        },
        data: scanData,
      };
      axios(configHttp)
        .then((response) => {
          if (response.data.success === true) {
            notificationStore.onApiResponseDialogAlert(
              response,
              this.resetForm()
            );
            vm.$socket.emit("update_shipping", response.data.plant);
          } else {
            notificationStore.onApiResponseDialogAlert(
              response,
              this.resetForm()
            );
          }
        })
        .catch(utilityStore.onError);
    },
    checkDN() {
      notificationStore.loading = true;
      let barcode_adm = this.formData.scan_adm.substring(0, 16);
      axios
        .get(
          `http://${
            configStore.apiUrl
          }/majsf_rest_api/api/scan_barcode/dn?dn=${this.formData.scan_adm.substring(
            0,
            16
          )}`
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.success == undefined) {
              this.table_label.items = response.data;
              this.fetchdataScanned(barcode_adm);
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    onScanKanbanADM(vm, username) {
      const fd = new URLSearchParams();
      fd.append("scan_adm", this.formData.scan_adm);
      fd.append("scan_maj", this.formData.scan_maj);
      fd.append("case_mark", this.formData.case_mark);
      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/scan_adm`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          if (response.data.success) {
            notificationStore.onApiResponseToastAlert(response);
            this.onCheckKanbanMAJ(this.formData.case_mark);
            const audio = new Audio(success);
            audio.play();
            vm.$socket.emit("update_ekspor", response.data.plant);
          } else if (response.data.messages == "E Kanban Salah !!!") {
            const audio = new Audio(labelMaj);
            audio.play();
            utilityStore.onApiResponse(response);
            this.lockUser(username);
            notificationStore.showDialogWarning(
              "Warning",
              response.data.messages,
              () => {
                this.checkUserLock(username);
              } // Arahkan ke dashboard saat menekan tombol Close
            );
          } else if (response.data.messages == "Kanban ADM Salah !!!") {
            const audio = new Audio(kanbanAdm);
            audio.play();
            utilityStore.onApiResponse(response);
            this.lockUser(username);
            notificationStore.showDialogWarning(
              "Warning",
              response.data.messages,
              () => {
                this.checkUserLock(username);
              } // Arahkan ke dashboard saat menekan tombol Close
            );
          } else if (
            response.data.messages == "Scan Kanban ADM terlebih dahulu !!!"
          ) {
            const audio = new Audio(scanFirst);
            audio.play();
            utilityStore.onApiResponse(response);
            this.lockUser(username);
            notificationStore.showDialogWarning(
              "Warning",
              response.data.messages,
              () => {
                this.checkUserLock(username);
              } // Arahkan ke dashboard saat menekan tombol Close
            );
          } else if (response.data.messages == "Kanban Pernah discan !!!") {
            vm.$socket.emit("update_ekspor", response.data.plant);
            const audio = new Audio(double);
            audio.play();
            utilityStore.onApiResponse(response);
            this.lockUser(username);
            notificationStore.showDialogWarning(
              "Warning",
              response.data.messages,
              () => {
                this.checkUserLock(username);
              } // Arahkan ke dashboard saat menekan tombol Close
            );
          } else if (response.data.messages == "Kanban Tidak Cocok !!!") {
            const audio = new Audio(not_matched);
            audio.play();
            utilityStore.onApiResponse(response);
            this.lockUser(username);
            notificationStore.showDialogWarning(
              "Warning",
              response.data.messages,
              () => {
                this.checkUserLock(username);
              } // Arahkan ke dashboard saat menekan tombol Close
            );
          } else if (
            response.data.messages ==
            "Module Number tidak cocok dengan Case Mark !!!"
          ) {
            const audio = new Audio(not_matched);
            audio.play();
            utilityStore.onApiResponse(response);
            this.lockUser(username);
            notificationStore.showDialogWarning(
              "Warning",
              response.data.messages,
              () => {
                this.checkUserLock(username);
              } // Arahkan ke dashboard saat menekan tombol Close
            );
          } else if (
            response.data.messages == "Module Number tidak cocok !!!"
          ) {
            const audio = new Audio(not_matched);
            audio.play();
            utilityStore.onApiResponse(response);
            this.lockUser(username);
            notificationStore.showDialogWarning(
              "Warning",
              response.data.messages,
              () => {
                this.checkUserLock(username);
              } // Arahkan ke dashboard saat menekan tombol Close
            );
          }
          this.formData.scan_maj = "";
          this.formData.scan_adm = "";
          document.getElementById("adm").focus();
        })
        .catch(utilityStore.onError);
    },

    onCheckKanbanMAJ(case_mark) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/list_scanned?case_mark=${case_mark}`
        )
        .then((response) => {
          if (response.data.success == undefined) {
            this.datatablesAdm.items = response.data;
            document.getElementById("adm").focus();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    checkUserLock(username) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/users/check_user_lock?username=${username}`
        )
        .then((response) => {
          if (response.data.success == false) {
            notificationStore.showDialogError(
              "Failed",
              response.data.messages,
              () => {
                configStore.router.push({ name: "dashboard" });
              } // Arahkan ke dashboard saat menekan tombol Close
            );
          }
        })
        .catch(utilityStore.onError);
    },

    lockUser(username) {
      const data = new URLSearchParams();
      data.append("username", username);
      let configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/users/lock_user`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp).catch(utilityStore.onError);
    },

    updateETD(vm) {
      const data = this.action == "Edit" ? new FormData() : new FormData();
      Object.entries(this.formDataETD).map((e) => {
        data.append(e[0], e[1]);
      });
      // data.append("customer", this.formDataETD.customer);
      // fd.append("cycle", this.formDataETD.cycle);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/scan_etd`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: data,
      };
      axios(configHttp)
        .then((response) => {
          if (response.data.success === true) {
            notificationStore.onApiResponseToastAlert(response, this.resetForm);
            vm.$socket.emit("update_shipping", response.data.plant);
          } else {
            notificationStore.onApiResponseToastAlert(response, this.resetForm);
          }
        })
        .catch(utilityStore.onError);
    },
  },
});
