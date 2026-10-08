import axios from "axios";
import pinia from "@/pinia/store.js";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useNotificationStore } from "@/pinia/notification";
import { useUtilityStore } from "@/pinia/utility";
import { useWipStore } from "@/pinia/admin/inventory/wip";

const configStore = useConfigStore(pinia);
const utilityStore = useUtilityStore(pinia);
const notificationStore = useNotificationStore(pinia);
const wipStore = useWipStore(pinia);

export const useMaterialStore = defineStore({
    id: "material",
    state() {
        return {
            tag: 'Materials',
            type: '',
            parts: [],
            fields: [],
            headers: [],
            loading: false,
            destination: 'All',
            dialog:{
                'uploadData': false
            }
        }
    },
    getters: {
        reportUrl: (state) => `http://${configStore.apiUrl}/monitoring/production/rundown/report?type=${state.type.toLowerCase()}&destination=${state.destination}`,
    }, actions: {
        fetchPart(params) {
            this.loading = true;
            this.parts = [];
            axios
                .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory`, { params: params })
                .then(response => {
                    this.loading = false;
                    if (response.status === 200) {
                        this.type = params.type;
                        this.parts = response.data;
                    } else {
                        notificationStore.showAlertFailed(response.data.message);
                    }
                })
                .catch(utilityStore.onError)
        },
        filterPart(column, field_db = []) {
            if (column != "All") {
                return this.parts.filter(function (el) {
                    let match = false;
                    field_db.forEach(field => {
                        match = match || (el[field] == column);
                    });
                    return match;
                });
            } else {
                return this.parts;
            }
        },
        searchPart(value, search) {
            return (
                value != null &&
                search != null &&
                typeof value === "string" &&
                value.toString().indexOf(search) !== -1
            );
        },
        deletePart(id) {
            let data = new URLSearchParams();
            data.append('id', id);
            this.loading = true;
            axios
                .delete(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/wip`, { data: data })
                .then(response => {
                    if (response.status === 200) {
                        notificationStore.showAlertSuccess("Item has been deleted");
                        this.loading = false;
                        this.fetchPart({ type: this.type, data: true });
                    } else {
                        notificationStore.showAlertFailed(response.data.message);
                    }
                })
                .catch(configStore.onError)
        },
        submitData(data) {
            this.loading = true;
            axios
                .post(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/wip`, data)
                .then(response => {
                    if (response.status === 200) {
                        wipStore.formOpen = false;
                        this.loading = false;
                        notificationStore.showAlertSuccess("Item has been created");
                        this.fetchPart({ type: this.type, data: true });
                    } else {
                        notificationStore.showAlertFailed(response.data.message);
                    }
                })
                .catch(utilityStore.onError)
        },
    }
});