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
export const useStampingLkhStore = defineStore({
  id: "production-stamping-lkh",
  state() {
    return {
      tag: "LKH-STP",
      datatables: {
        search: "",
        headers: [
          { title: "Date", align: "left", value: "ZDATE" },
          { title: "Shift", align: "left", value: "ZSHIFT" },
          { title: "Model", align: "left", value: "ZPROJECT" },
          { title: "Job Number", align: "left", value: "BISMT" },
          { title: "Part Number", align: "left", value: "MATNR" },
          { title: "Description", align: "left", value: "MAKTX" },
          { title: "Created At", align: "left", value: "ZDATE_CREATE" },
          { title: "Qty", align: "right", value: "ZQTY" },
          { title: "Keterangan", align: "right", value: "ZKET" },
        ],
        items: [],
      },
      datatablesReport: {
        headers: [
          { title: "Part Number", align: "left", value: "part_number" },
          { title: "Job Number", align: "left", value: "job_number" },
        ],
      },
      form: {
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 10),
        shift: "",
        partNumber: "",
        qty: "",
        keterangan: "",
        period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 7),
      },
      filters: {
        ZID: [],
        date: [],
        shift: [],
        ZPROJECT: [],
        BISMT: [],
        part_number: [],
        part_name: [],
        qty: [],
        ZKET: [],
        ZDATE_CREATE: [],
      },
      filterDate: {
        date: date.date
      },
      permissions: {
        downloadReport: authStore.checkAccess("Report.Download.LkhStamping"),
        create: authStore.checkAccess("Production.Create.LkhStamping"),
        download: authStore.checkAccess("Production.Download.LkhStamping"),
        update: authStore.checkAccess("Production.Update.LkhStamping"),
      },
      shiftItems: ["1", "2"],
      partItems: [],
      current: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .substr(0, 10),
      dialog: false
    };
  },
  actions: {
    resetForm() {
      this.form.partNumber = "";
      this.form.qty = "";
      this.form.keterangan = "";
    },
    searchPart(item) {
      return `<strong>${item.BISMT}</strong> - ${item.FIELD} ( ${item.DESC} )`;
    },
    genareateDataTablesItems(data) {
      this.datatables.items = data.map((item) => {
        item.date = utilityStore.formatDate(item.date);
        item.shift = `Shift ${item.shift}`;
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
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh-now?tag=${this.tag}&period=${this.form.date}`
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
    fetchDataReport() {
      notificationStore.loading = true;
      console.log('date',this.filterDate);
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/`, {
          params: this.filterDate
        })
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
        data.append("keterangan", form.keterangan);

        const configHttp = {
          method: "post",
          url: //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh`,
          `http://192.168.10.67/majsf_rest_api/api/inventory-lkh/lkh`,
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
              url: `http://192.168.10.67/majsf_rest_api/api/inventory-lkh/lkh`,
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
      const period = this.form.period.replace("-", "");
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/data?tag=${
            tag
          }&period=${period}`
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    updateQty() {
      notificationStore.loading = true;
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
