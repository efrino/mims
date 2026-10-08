import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
export const useRundownIFP = defineStore({
  id: "rundown-ifp",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      datatables: {
        headers: [
          { text: "Customer", align: "left", value: "customer" },
          { text: "Model", align: "left", value: "model" },
          { text: "Minimal Strength", align: "left", value: "min_str" },
          { text: "Maximal Strength", align: "left", value: "max_str" },
        ],
        items: [],
        filters: {
          customer: [],
          model: [],
          min_str: [],
          max_str: [],
        },
      },
      data: {
        ifp_report: {
          headers: [
            { text: "Part Number", align: "left", value: "MATNR" },
            { text: "Part Name", align: "left", value: "MAKTG" },
            { text: "Project", align: "left", value: "ZPROJECT" },
            { text: "MDFO", align: "left", value: "TOT" },
            { text: "Destination 1", align: "left", value: "ZCUST" },
            { text: "Destination 2", align: "left", value: "ZCUST2" },
            { text: "Stock IFP", align: "left", value: "LABST_IFP" },
            { text: "Stock Shipping", align: "left", value: "LABST_SHIPPING" },
            { text: "Total Stock", align: "left", value: "total_stock" },
            { text: "Strength", align: "left", value: "-" },
            { text: "Status", align: "left", value: "-" },
          ],
          items: [],
          filters: {
            MATNR: [],
            MAKTG: [],
            ZPROJECT: [],
            TOT: [],
            ZCUST: [],
            ZCUST2: [],
            LABST_IFP: [],
            LABST_SHIPPING: [],
            total_stock: [],
          },
        },
        ifp_report_detail: {
          headers: [
            { text: "Part Number", align: "left", value: "MATNR" },
            { text: "Part Name", align: "left", value: "MAKTG" },
            { text: "MDFO", align: "left", value: "TOT" },
            { text: "PCS / DAY", align: "left", value: "pcs_day" },
            { text: "PCS / JAM", align: "left", value: "pcs_jam" },
            { text: "Destination 1", align: "left", value: "ZCUST" },
            { text: "Destination 2", align: "left", value: "ZCUST2" },
            { text: "Stock IFP", align: "left", value: "LABST_IFP" },
            { text: "Stock Shipping", align: "left", value: "LABST_SHIPPING" },
            { text: "Total Stock", align: "left", value: "total_stock" },
            { text: "Strength", align: "left", value: "-" },
          ],
          items: [],
          filters: {
            MATNR: [],
            MAKTG: [],
            TOT: [],
            pcs_day: [],
            pcs_jam: [],
            ZCUST: [],
            ZCUST2: [],
            LABST_IFP: [],
            LABST_SHIPPING: [],
            total_stock: [],
          },
        },
        wip_report_detail: {
          headers: [
            { text: "Part Number", align: "left", value: "MATNR" },
            { text: "Part Name", align: "left", value: "MAKTG" },
            { text: "PCS / DAY", align: "left", value: "pcs_day" },
            { text: "PCS / JAM", align: "left", value: "pcs_jam" },
            { text: "Mother Part", align: "left", value: "MOTHER_PART" },
            { text: "Destination 1", align: "left", value: "ZCUST" },
            { text: "Destination 2", align: "left", value: "ZCUST2" },
            { text: "Stock WIP", align: "left", value: "total_stock" },
            { text: "Strength", align: "left", value: "-" },
          ],
          items: [],
          filters: {
            MATNR: [],
            MAKTG: [],
            pcs_day: [],
            pcs_jam: [],
            MOTHER_PART: [],
            ZCUST: [],
            ZCUST2: [],
            total_stock: [],
          },
        },
        irm_report_detail: {
          headers: [
            { text: "Part Number", align: "left", value: "MATNR" },
            { text: "Part Name", align: "left", value: "MAKTG" },
            { text: "PCS / DAY", align: "left", value: "pcs_day" },
            { text: "PCS / JAM", align: "left", value: "pcs_jam" },
            { text: "Mother Part", align: "left", value: "MOTHER_PART" },
            { text: "Destination 1", align: "left", value: "ZCUST" },
            { text: "Destination 2", align: "left", value: "ZCUST2" },
            { text: "Stock IRM", align: "left", value: "total_stock" },
            { text: "Strength", align: "left", value: "-" },
          ],
          items: [],
          filters: {
            MATNR: [],
            MAKTG: [],
            pcs_day: [],
            pcs_jam: [],
            MOTHER_PART: [],
            ZCUST: [],
            ZCUST2: [],
            total_stock: [],
          },
        },
        ifp: [],
        ifp_excel: [],
        irm: [],
        wip: [],
        ckd: [],
        ifp_adjustment: [],
      },
      dialog: {
        datePicker: false,
        form: false,
        detailRundown: false,
        detailWIP: false,
        detailIRM: false,
        detailItem: false,
      },
      speedDial: {
        model: false,
        btn: false,
      },
      formFilter: {
        status: "",
      },
      formData: {
        customer: "",
        model: "",
        min_str: "",
        max_str: "",
      },
      form: ["customer", "model", "min_str", "max_str"],
      tipeData: ["Over", "Safe", "Kritis"],
      tableDetail: {
        items: [],
        type: "",
        customer: "",
        model: "",
      },
    };
  },
  actions: {
    resetForm() {
      this.fetchMasterStrength();
      this.formData = {
        customer: "",
        model: "",
        min_str: "",
        max_str: "",
      };
      this.dialog.form = false;
    },
    fetchMasterStrength() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp`)
        .then((response) => {
          if (response.status === 200) {
            this.datatables.items = response.data;
          }
        });
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
    loadDataMasterStrength(action, data) {
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
          !(this.action == "Add" && e[0] == "customer" && e[0] == "model")
        ) {
          valid = false;
        }
        data.append(e[0], e[1]);
      });

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/add`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp`,
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
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
        notificationStore.disableLoading();
      }
    },

    getZstock() {
      axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/zstock`
      );
    },

    stockSAP() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/stock`,
          {
            params: this.data.ifp.filters,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.ifp = response.data;
            notificationStore.disableLoading();
          }
        });
    },
    stockWithSAP() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/stock_sap`,
          {
            params: this.data.ifp.filters,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.ifp = response.data;
            notificationStore.disableLoading();
          }
        });
    },
    fetchStockSAP() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("status", this.formFilter.status);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/stock_ifp`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.ifp_report.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    loadDetail(customer, model, status) {
      this.fetchStockDetailSAP(customer, model, status);
      this.dialog.detailRundown = true;
    },
    fetchStockDetailSAP(customer, model, status) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("customer", customer);
      data.append("model", model);
      data.append("status", status);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/stock_detail`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.ifp_report_detail.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    loadWIPDetail(customer, model, status) {
      this.fetchWIPDetailSAP(customer, model, status);
      this.dialog.detailWIP = true;
    },
    fetchWIPDetailSAP(customer, model, status) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("customer", customer);
      data.append("model", model);
      data.append("status", status);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/wip_detail`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.wip_report_detail.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    filterDetailItemsWIPSAP() {
      return this.data.wip_report_detail.items.filter((d) => {
        return Object.keys(this.data.wip_report_detail.filters).every((f) => {
          return (
            this.data.wip_report_detail.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.data.wip_report_detail.filters[f].toLowerCase())
          );
        });
      });
    },

    loadIRMDetail(customer, model, status) {
      this.fetchIRMDetailSAP(customer, model, status);
      this.dialog.detailIRM = true;
    },
    fetchIRMDetailSAP(customer, model, status) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("customer", customer);
      data.append("model", model);
      data.append("status", status);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/irm_detail`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.irm_report_detail.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    filterDetailItemsIRMSAP() {
      return this.data.irm_report_detail.items.filter((d) => {
        return Object.keys(this.data.irm_report_detail.filters).every((f) => {
          return (
            this.data.irm_report_detail.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.data.irm_report_detail.filters[f].toLowerCase())
          );
        });
      });
    },

    stockSummarySAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/ifp_summary`,
          {
            params: this.data.ifp.filters,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.ifp = response.data;
          }
        });
    },

    irmSummarySAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/irm_summary`,
          {
            params: this.data.irm.filters,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.irm = response.data;
          }
        });
    },

    wipSummarySAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/wip_summary`,
          {
            params: this.data.wip.filters,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.wip = response.data;
          }
        });
    },

    ckdSummarySAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/ckd_summary`,
          {
            params: this.data.ckd.filters,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.ckd = response.data;
          }
        });
    },

    filterItemsSAP() {
      return this.data.ifp_report.items.filter((d) => {
        return Object.keys(this.data.ifp_report.filters).every((f) => {
          return (
            this.data.ifp_report.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.data.ifp_report.filters[f].toLowerCase())
          );
        });
      });
    },

    filterDetailItemsSAP() {
      return this.data.ifp_report_detail.items.filter((d) => {
        return Object.keys(this.data.ifp_report_detail.filters).every((f) => {
          return (
            this.data.ifp_report_detail.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.data.ifp_report_detail.filters[f].toLowerCase())
          );
        });
      });
    },

    stockIFP() {
      axios
        // .get(`http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/ifp`)
        .get(`http://192.168.10.67/majsf_rest_api/api/rundown_ifp/ifp_trial`)
        .then((response) => {
          if (response.status === 200) {
            this.data.ifp_excel = response.data;
          }
        });
    },

    stockAdjustment() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/stock_adjustment`,
          {
            params: this.data.ifp_adjustment.filters,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.ifp_adjustment = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    viewDetailItem(model, customer, type) {
      notificationStore.loading = true;
      axios
        .get(
          // `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/item_detail?customer=${customer}&model=${model}&type=${type}`
          `http://192.168.10.67/majsf_rest_api/api/rundown_ifp/item_detail?customer=${customer}&model=${model}&type=${type}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableDetail.items = response.data;
            this.tableDetail.type = type;
            this.tableDetail.customer = customer;
            this.tableDetail.model = model;
            this.dialog.detailItem = true;
            notificationStore.disableLoading();
          }
        });
    },
    viewDetailItemSAP(model, customer, type) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/item_detail_sap?customer=${customer}&model=${model}&type=${type}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableDetail.items = response.data;
            this.tableDetail.type = type;
            this.tableDetail.customer = customer;
            this.tableDetail.model = model;
            this.dialog.detailItem = true;
            notificationStore.disableLoading();
          }
        });
    },
    updateRundownExcelToDB(location) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory/sync?file=Master%20` +
            // `http://192.168.10.67/majsf_rest_api/api/inventory/sync?file=Master%20` +
            location
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.showAlertSuccess(
              `Update Data Rundown ` + location + ` Success!`
            );
            notificationStore.disableLoading();
          }
        });
    },
    deleteRundownDB(location) {
      if (location == "IFP") {
        axios
          .get(
            `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/delete_rundown_ifp`
            // `http://192.168.10.67/majsf_rest_api/api/rundown_ifp/delete_rundown_ifp`
          )
          .then((response) => {
            if (response.status === 200) {
              notificationStore.showAlertSuccess(
                `Delete Data Rundown ` + location + ` Success!`
              );
              notificationStore.disableLoading();
            }
          });
      } else {
        axios
          .get(
            `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/delete_rundown_irm`
            // `http://192.168.10.67/majsf_rest_api/api/rundown_irm/delete_rundown_irm`
          )
          .then((response) => {
            if (response.status === 200) {
              console.log(response.status);
              notificationStore.showAlertSuccess(
                `Delete Data Rundown ` + location + ` Success!`
              );
              notificationStore.disableLoading();
            }
          });
      }
    },
  },
});
