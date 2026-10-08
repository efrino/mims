import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
export const useSummarySupplier = defineStore({
  id: "summary-supplier",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      table: {
        items: [],
      },
      table_detail: {
        items: []
      }
    };
  },
  actions: {
    fetchSummaryDeliverySupplier(id) {
      notificationStore.loading = true;
      axios
        // .get(`http://192.168.10.67/majsf_rest_api/api/summary_supplier?supplier=${id}`)
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/summary_supplier?supplier=${id}`)
        .then((response) => {
          if (response.status === 200) {
            this.table.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    fetchDataSap() {
      // notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/summary_supplier/sap`
        )
        .then((response) => {
          if (response.status === 200) {
            // notificationStore.disableLoading();
          }
        });
    },

    fetchDeliverySupplier(tipe, cust) {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/summary_supplier/detail?supplier=${tipe}&customer=${cust}`)
        .then((response) => {
          if (response.status === 200) {
            this.table_detail.items = response.data;
            notificationStore.disableLoading();
            // window.location.reload();
            this.updateDeliverySupplier(tipe, cust);
          }
        });
    },

    updateDeliverySupplier(tipe, cust) {
      const data = new FormData();
      data.append("supplier", tipe);
      data.append("customer", cust);

      axios
        .post(`http://192.168.10.67/majsf_rest_api/api/summary_supplier/detail?supplier=${tipe}&customer=${cust}`,
        data
      ).then((response) => {
        if (response.data.status == false) {
          utilityStore.onApiResponse(response);
        }
      });
    },

  },
});
