import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const configStore = useConfigStore();
const utilityStore = useUtilityStore();
const notificationStore = useNotificationStore();
export const useReportDeliveryStore = defineStore({
  id: "report-delivery-adm",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      shiftNow: utilityStore.getShiftNow(),
      table: {
        items: [],
      },
      tableMonthly: {
        items: [],
      },
      tableCycle: {
        items: [],
      },
      tableKembali: {
        items: [],
      },
      tableBilling: {
        items: [],
      },
      tableKembaliMonthly: {
        items: [],
      },
      card: {
        items: [],
      },
      tableBillingDaily: {
        items: [],
      },
      tableBillingMonthly: {
        items: [],
      },
      tableCycleDelivery: {
        items: [],
      },
      tableCycleDeliverySAP: {
        items: [],
      },
      dialog: {
        detailBreakdown: false,
        detailItem: false,
        volumeOrder: false,
      },
      tableBreakdownDN: {
        items: [],
      },
      tableDetail: {
        items: [],
        all: false,
      },
      tableVolumeOrder: {
        items: [],
        grouped: [],
        summary: [],
        showDetails: [],
        showCustomer: "",
        showModel: "",
      },
      tableDNBilling: {
        details: [],
        summary_daily: [],
        summary_monthly: [],
        showCustomer: "",
        showModel: "",
      },
      dn: "",
    };
  },
  actions: {
    fetchDelivery(id) {
      notificationStore.loading = true;
      axios
        .get(
          // `http://192.168.10.67/majsf_rest_api/api/report_delivery/trial?period=${id}`
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/index?period=${id}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.table.items = response.data;
            this.tableVolumeOrder.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    fetchDeliveryKembali(id) {
      notificationStore.loading = true;
      axios
        .get(
          `http://192.168.10.67/majsf_rest_api/api/report_delivery/kembali?period=${id}`
          // `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/kembali?period=${id}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableKembali.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    fetchBilling(id) {
      notificationStore.loading = true;
      axios
        // .get(`http://192.168.10.67/majsf_rest_api/api/report_delivery/trial_billing?period=${id}`)
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/billing?period=${id}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableBilling.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    fetchDeliveryCycle() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/cycle`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableCycle.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    fetchDataSap() {
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/index`
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          }
        });
    },

    fetchDataSap2() {
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/index_monthly`
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          }
        });
    },

    syncDataSAPDeliveryKembali(value) {
      if (value.toUpperCase() == "DAILY") {
        axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/sap`
        );
      } else if (value.toUpperCase() == "MONTHLY") {
        axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/sap_monthly`
        );
      }
    },

    fetchSapOrder() {
      notificationStore.loading = true;
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/order`
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          }
        });
    },

    fetchOrderDaily() {
      notificationStore.loading = true;
      axios
        .get(
          `http://192.168.10.67/majsf_rest_api/api/report_delivery/order`
          // `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/order`
        )
        .then((response) => {
          if (response.status === 200) {
            this.card.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    fetchBillingDaily() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/billing`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableBillingDaily.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },
    fetchBillingMonthly() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/billing_monthly`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableBillingMonthly.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },
    fetchCycleDelivery() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/delivery_cycle`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableCycleDelivery.items = response.data;
            this.fetchCycleDeliveryFromSAP();
            notificationStore.disableLoading();
          }
        });
    },
    fetchCycleDeliverySAP() {
      notificationStore.loading = true;
      axios
        .get(
          // `http://192.168.10.67/majsf_rest_api/api/report_delivery/delivery_cycle_all`
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/delivery_cycle_all`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableCycleDeliverySAP.items = response.data;

            this.fetchCycleDeliveryItemFromSAP();
            this.fetchCycleDeliveryFromSAP();
            notificationStore.disableLoading();
          }
        });
    },

    fetchCycleDeliveryFromSAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/delivery`
        )
        // .get(`http://192.168.10.67/majsf_rest_api/api/report_delivery/delivery`)
        .then(() => {});
    },
    fetchCycleDeliveryItemFromSAP() {
      axios
        .get(
          // `http://192.168.10.67/majsf_rest_api/api/report_delivery/delivery_cycle_item_sync_sap`
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/delivery_cycle_item_sync_sap`
        )
        .then(() => {});
    },

    viewBreakdownDN(customer, cycle, vdatu) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/delivery_breakdown?customer=${customer}&cycle=${cycle}&vdatu=${vdatu}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableBreakdownDN.items = response.data;
            this.dialog.detailBreakdown = true;
            notificationStore.disableLoading();
          }
        });
    },

    viewBreakdownDNP4(customer, time, vdatu) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/delivery_breakdown_p4?customer=${customer}&time=${time}&vdatu=${vdatu}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableBreakdownDN.items = response.data;
            this.dialog.detailBreakdown = true;
            notificationStore.disableLoading();
          }
        });
    },
    viewBreakdownItemSO(customer, time) {
      notificationStore.loading = true;
      let mergeSO = [];
      let data = [
        ...this.tableCycleDeliverySAP.items[customer].filter(
          (elem) => elem.ETD.slice(0, 2) == time.slice(0, 2)
        ),
      ];
      data.forEach((element) => {
        mergeSO = mergeSO.concat(element.details);
      });
      this.tableDetail.items = mergeSO;
      this.tableDetail.all = true;
      this.dialog.detailItem = true;
      notificationStore.disableLoading();
    },
    viewBreakdownDNSO(customer, time) {
      notificationStore.loading = true;
      let mergeSO = [];
      let data = [
        ...this.tableCycleDeliverySAP.items[customer].filter(
          (elem) => elem.ETD.slice(0, 2) == time.slice(0, 2)
        ),
      ];
      data.forEach((element) => {
        mergeSO = mergeSO.concat(element.details);
      });

      const uniqSO = Array.from(
        new Map(mergeSO.map((item) => [item.VBELN, item])).values()
      );
      this.tableBreakdownDN.items = uniqSO;
      this.dialog.detailBreakdown = true;
      notificationStore.disableLoading();
    },

    viewItemBySO(customer, time, vbeln, dn) {
      notificationStore.loading = true;
      let mergeSO = [];
      let data = [
        ...this.tableCycleDeliverySAP.items[customer].filter(
          (elem) => elem.ETD.slice(0, 2) == time.slice(0, 2)
        ),
      ];
      data.forEach((element) => {
        mergeSO = mergeSO.concat(element.details);
      });
      const filtered = mergeSO.filter((elem) => elem.VBELN == vbeln);
      this.tableDetail.items = filtered;
      this.tableDetail.all = false;
      this.dn = dn;
      this.dialog.detailItem = true;
      notificationStore.disableLoading();
    },
    loadDataDetailSO(so_number, DN) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/detail_delivery?so_number=${so_number}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableDetail.items = response.data;
            this.dialog.detailItem = true;
            this.dn = DN;
            notificationStore.disableLoading();
          }
        });
    },

    groupingOrderByModel(cust, model) {
      // if (cust.includes("ADM")) {
      //   cust = cust.replace(/[ P,!]/g, "");
      // }
      let filtered = this.tableVolumeOrder.items.filter(
        (elem) => elem.ZCUST == cust && elem.ZMODEL == model
      );

      return filtered;
    },

    sumOrderPlanActual(cust, model) {
      const order = this.groupingOrderByModel(cust, model);

      const plan_daily = order.reduce((sum, item) => sum + item.plan_daily, 0);
      const plan_accum = order.reduce((sum, item) => sum + item.plan_accum, 0);
      const act_daily = order.reduce((sum, item) => sum + item.plan_daily, 0);
      const act_accum = order.reduce((sum, item) => sum + item.plan_accum, 0);
      const diff_daily = act_daily - plan_daily;
      const diff_accum = act_accum - plan_accum;

      return {
        plan_daily,
        plan_accum,
        act_daily,
        act_accum,
        diff_daily,
        diff_accum,
      };
    },

    viewVolumeOrderItem(cust, model) {
      this.tableVolumeOrder.showCustomer = cust;
      this.tableVolumeOrder.showModel = model;

      this.tableVolumeOrder.showDetails = this.groupingOrderByModel(
        cust,
        model
      );

      this.dialog.volumeOrder = true;
    },
    syncVolumeOrderSap() {
      notificationStore.loading = true;
      axios
        .get(
          // `http://192.168.10.67/majsf_rest_api/api/report_delivery/volume_order_sync_sap`
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/volume_order_sync_sap`
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          }
        });
    },
    fetchVolumeOrder(date = utilityStore.formatDate(new Date(), "DD.MM.yyyy")) {
      notificationStore.loading = true;
      axios
        .get(
          // `http://192.168.10.67/majsf_rest_api/api/report_delivery/volume_order?date=${date}`
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/volume_order?date=${date}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableVolumeOrder.items = response.data.full;
            this.tableVolumeOrder.grouped = response.data.group;
            notificationStore.disableLoading();
            this.syncVolumeOrderSap();
          }
        });
    },
    fetchDnBillingDetail() {
      notificationStore.loading = true;
      axios
        .get(
          `http://192.168.10.67/majsf_rest_api/api/report_delivery/dn_detail`
          // `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/dn_detail`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableDNBilling.details = response.data;
            notificationStore.disableLoading();
            // this.syncVolumeOrderSap();
          }
        });
    },
    fetchDnBillingDaily() {
      notificationStore.loading = true;
      axios
        .get(
          `http://192.168.10.67/majsf_rest_api/api/report_delivery/dn_daily`
          // `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/dn_detail`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableDNBilling.summary_daily = response.data;
            notificationStore.disableLoading();
            // this.syncVolumeOrderSap();
          }
        });
    },
    fetchDnBillingMonthly() {
      notificationStore.loading = true;
      axios
        .get(
          `http://192.168.10.67/majsf_rest_api/api/report_delivery/dn_monthly`
          // `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/dn_detail`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableDNBilling.summary_daily = response.data;
            notificationStore.disableLoading();
            // this.syncVolumeOrderSap();
          }
        });
    },
  },
});
