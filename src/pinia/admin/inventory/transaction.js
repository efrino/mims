import axios from "axios";
import pinia from "@/pinia/store.js";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import { useNotificationStore } from "@/pinia/notification";

const configStore = useConfigStore(pinia);
const utilityStore = useUtilityStore(pinia);
const notificationStore = useNotificationStore(pinia);
export const useTransactionStore = defineStore({
    id: "transaction",
    state() {
        return {
            mutations: [],
            mutationDetails: []
        }
    }, actions: {
        fetchTransaction() {
            notificationStore.loading = true;
            axios
                .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/transaction`)
                .then(response => {
                    notificationStore.disableLoading();
                    if (response.status === 200) {
                        this.transactions = response.data.transactions;
                    }
                })
                .catch(utilityStore.onApiResponse)
        },
        fetchTransactionDetail(data) {
            notificationStore.loading = true;
            axios
                .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/transaction`, { params: data })
                .then(response => {
                    notificationStore.disableLoading();
                    if (response.status === 200) {
                        this.transactionDetails = response.data.transactions
                    }
                })
                .catch(utilityStore.onApiResponse)
        },
    }
});