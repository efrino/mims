import axios from "axios";
import pinia from "@/pinia/store.js";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import { useNotificationStore } from "@/pinia/notification";

const configStore = useConfigStore(pinia);
const utilityStore = useUtilityStore(pinia);
const notificationStore = useNotificationStore(pinia);
export const useMutationStore = defineStore({
    id: "mutation",
    state() {
        return {
            initialStock: 0,
            mutations: [],
            mutationHead: {},
            mutationDetails: []
        }
    }, getters: {
        sumOf(state) {
            if (state.mutationDetails) {
                return {
                    in: state.mutationDetails.reduce((a, b) => a + parseInt(b.qty_in), 0),
                    out: state.mutationDetails.reduce((a, b) => a + parseInt(b.qty_out), 0),
                    correctIn: state.mutationDetails.reduce((a, b) => a + parseInt(b.k_in), 0),
                    correctOut: state.mutationDetails.reduce((a, b) => a + parseInt(b.k_out), 0),
                    lastStock:
                        parseInt(state.initialStock) +
                        parseInt(
                            state.mutationDetails.reduce(
                                (a, b) =>
                                    a +
                                    parseInt(b.qty_in) -
                                    parseInt(b.qty_out) -
                                    parseInt(b.k_in) +
                                    parseInt(b.k_out),
                                0
                            )
                        ),
                };
            } else {
                return {
                    in: 0,
                    out: 0,
                    correctIn: 0,
                    correctOut: 0,
                    lastStock: 0
                };
            }
        },
    }, actions: {
        fetchMutation() {
            notificationStore.loading = true;
            axios
                .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/mutation`)
                .then(response => {
                    notificationStore.disableLoading();
                    if (response.status === 200) {
                        this.mutations = response.data.mutations;
                    }
                })
                .catch(utilityStore.onApiResponse)
        },
        fetchMutationDetail(data) {
            notificationStore.loading = true;
            axios
                .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/mutation`, {
                    params: data
                })
                .then(response => {
                    notificationStore.disableLoading();
                    if (response.status === 200) {
                        this.mutationHead = response.data.mutations.head;
                        this.mutationDetails = response.data.mutations.details;
                    }
                })
                .catch(utilityStore.onApiResponse)

        },

    }
});