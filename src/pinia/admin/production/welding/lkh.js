import axios from "axios";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useUtilityStore } from "@/pinia/utility";

const configStore = useConfigStore();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
export const useWeldingLkhStore = defineStore({
  id: "production-welding-lkh",
  state() {
    return {
      tag: "LKH-WLD",
      datatables: {
        search: "",
        headers: [
          { text: "ID", align: "left", value: "ZID" },
          { text: "Date", align: "left", value: "ZDATE" },
          { text: "Shift", align: "left", value: "ZSHIFT" },
          { text: "Model", align: "left", value: "ZPROJECT" },
          { text: "Job Number", align: "left", value: "BISMT" },
          { text: "Part Number", align: "left", value: "MATNR" },
          { text: "Description", align: "left", value: "MAKTX" },
          { text: "Created At", align: "left", value: "ZDATE_CREATE" },
          { text: "Qty", align: "right", value: "ZQTY" },
        ],
        items: [],
      },
      datatablesReport: {
        headers: [
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
        ],
      },
      form: {
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 10),
        shift: "",
        partNumber: "",
        qty: "",
        period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 7),
      },
      filters: {
        ZID: [],
        ZDATE: [],
        ZSHIFT: [],
        ZPROJECT: [],
        BISMT: [],
        MATNR: [],
        MAKTX: [],
        ZQTY: [],
        ZDATE_CREATE: [],
      },
      filterDate: {
        date: date.date,
      },
      filter: {
        date: date.date,
        line: "S/A ROBOT",
      },
      permissions: {
        downloadReport: authStore.checkAccess("Report.Download.LkhWelding"),
        create: authStore.checkAccess("Production.Create.LkhWelding"),
        download: authStore.checkAccess("Production.Download.LkhWelding"),
        update: authStore.checkAccess("Production.Update.LkhWelding"),
      },
      shiftItems: ["1", "2"],
      partItems: [],
      current: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .substr(0, 10),
      dialog: false,
      dialogFilter: false,
      dialogdatePicker: false,
      list: {
        line: [
          "S/A ROBOT",
          "S/A MANUAL",
          "CO ROBOT",
          "WSS A",
          "WSS B",
          "WSS C",
          "WSS D",
          "WSS E",
          "WSS G",
          "WSS H",
          "CO ROBOT HMMI",
          "S/A HMMI",
          "WSS HMMI",
        ],
      },
    };
  },
  actions: {
    resetForm() {
      this.form.partNumber = "";
      this.form.qty = "";
    },
    searchPart(item) {
      return `<strong>${item.BISMT}</strong> - ${item.FIELD} ( ${item.DESC} )`;
    },
    genareateDataTablesItems(data) {
      this.datatables.items = data.map((item) => {
        item.date = utilityStore.formatDate(item.date);
        item.ZSHIFT = `Shift ${item.ZSHIFT}`;
        return item;
      });
    },
    filterData() {
      return this.datatables.items.filter((d) => {
        return Object.keys(this.filters).every((f) => {
          return (
            this.filters[f].length < 1 ||
            d[f].toLowerCase().includes(this.filters[f].toLowerCase())
          );
        });
      });
    },
    fetchData() {
      // notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh-now?tag=${this.tag}&date=${this.filterDate}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.genareateDataTablesItems(response.data);
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    // fetchDataReport() {
    //   notificationStore.loading = true;
    //   axios
    //     .get(
    //       `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh-report?tag=${this.tag}&period=${this.form.period.replace("-", "")}`
    //     )
    //     .then((response) => {
    //       if (response.status === 200) {
    //         this.genareateDataTablesItems(response.data);
    //         notificationStore.disableLoading();
    //       } else {
    //         utilityStore.onApiResponse(response);
    //       }
    //     })
    //     .catch(utilityStore.onError);
    // },
    fetchDataReport() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/welding`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.genareateDataTablesItems(response.data);
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchDataMaterial() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/material?tag=${this.tag}`
        )
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
    onSave() {
      notificationStore.loading = true;
      const form = this.form;
      if (form.date && form.shift && form.partNumber && form.qty) {
        const data = new FormData();

        data.append("date", form.date);
        data.append("shift", form.shift);
        data.append("part_number", form.partNumber);
        data.append("qty", form.qty);
        data.append("tag", this.tag);

        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        axios(configHttp)
          .then((response) =>
            notificationStore.onApiResponseToastAlert(response, this.resetForm)
          )
          .catch(utilityStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap"
        );
      }
      notificationStore.disableLoading();
    },
    onVoid(params) {
      notificationStore.loading = true;
      notificationStore.showConfirm(
        "Confirmation",
        "Do you really to void this data",
        () => {
          if (params.ZID) {
            const data = new URLSearchParams();
            data.append("id", params.ZID);
            data.append("tag", this.tag);
            const configHttp = {
              method: "delete",
              url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh`,
              headers: {
                "Content-Type": "multipart/form-data",
              },
              data,
            };
            axios(configHttp)
              .then((response) =>
                notificationStore.onApiResponseToastAlert(
                  response,
                  this.fetchData
                )
              )
              .catch(utilityStore.onError);
          } else {
            notificationStore.showAlertWarning(
              "Data yang anda kirim tidak Lengkap"
            );
          }
        }
      );
      notificationStore.disableLoading();
    },
    addDataReport() {
      notificationStore.loading = true;
      const tag = this.tag;
      // const period = this.form.period.replace("-", "");
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/data?tag=${tag}&date=${this.filterDate.date}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.fetchDataReport();
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    updateQty() {
      // notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/update_qty`,
          {
            params: this.filterDate,
          }
        )
        .catch(utilityStore.onError);
    },
  },
});
