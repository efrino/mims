import axios from "axios";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useNotificationStore } from "@/pinia/notification";

const notificationStore = useNotificationStore();
const configStore = useConfigStore();
export const useRundownIRM = defineStore({
  id: "rundown-irm",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      data: {
        irm_excel: [],
        irm_sap: [],
        stock: [],
        irm_adjustment: [],
        po: [],
      },
      tableDetail: {
        items: [],
        type: "",
        customer: "",
        model: "",
      },
      dialog: {
        detailItem: false,
      },
    };
  },
  actions: {
    stockIRM() {
      notificationStore.loading = true;
      axios
        // .get(`http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm`)
        .get(`http://192.168.10.67/majsf_rest_api/api/rundown_irm`)
        .then((response) => {
          if (response.status === 200) {
            this.data.irm_excel = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    rundownStock() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/stock`
        )
        .then((response) => {
          if (response.status === 200) {
            // console.log(response.data);
            this.data.stock = response.data;
            notificationStore.disableLoading();
          }
        });
    },
    poSAP() {
      notificationStore.loading = true;
      axios
        .get(`http://192.168.10.67/majsf_rest_api/api/rundown_irm/po_sap`)
        .then((response) => {
          if (response.status === 200) {
            // console.log(response.data);
            this.data.po = response.data;
            notificationStore.disableLoading();
          }
        });
    },
    stockAdjustment() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/stock_adjustment`,
          {
            params: this.data.irm_adjustment.filters,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.irm_adjustment = response.data;
            notificationStore.disableLoading();
          }
        });
    },
    viewDetailItem(model, customer, type) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/item_detail?customer=${customer}&model=${model}&type=${type}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableDetail.items = response.data;

            response.data.forEach((elem, index) => {
              let temp_data = this.data.po.filter((val) =>
                elem.MATNR.includes(val.MATNR)
              )[0];
              // console.log(temp_data);
              this.tableDetail.items[index].ZSCHPREV = temp_data?.ZSCHPREV
                ? Number(temp_data?.ZSCHPREV)
                : 0;
              this.tableDetail.items[index].ZACTGR = temp_data?.ZACTGR
                ? Number(temp_data?.ZACTGR)
                : 0;
              this.tableDetail.items[index].ZMONTHNEXT = temp_data?.ZMONTHNEXT
                ? temp_data?.ZMONTHNEXT
                : "";
              this.tableDetail.items[index].ZQTYNEXT = temp_data?.ZQTYNEXT
                ? Number(temp_data?.ZQTYNEXT)
                : 0;
              this.tableDetail.items[index].ZMINDELV = temp_data?.ZMINDELV
                ? Number(temp_data?.ZMINDELV)
                : 0;
            });
            this.tableDetail.type = type;
            this.tableDetail.customer = customer;
            this.tableDetail.model = model;
            this.dialog.detailItem = true;
            notificationStore.disableLoading();
          }
        });
    },

    stockIRMSAP() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/stock_sap`
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.irm_sap = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    viewDetailItemSAP(model, customer, type) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/item_detail_sap?customer=${customer}&model=${model}&type=${type}`
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
              `Update Rundown ` + location + ` Success!`
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
      } else if (location == "IRM") {
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
      } else if (location == "WIP") {
        axios
          .get(
            `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip/delete_rundown_wip`
            // `http://192.168.10.67/majsf_rest_api/api/rundown_wip/delete_rundown_wip`
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
