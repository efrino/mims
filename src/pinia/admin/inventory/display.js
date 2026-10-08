import axios from "axios";
import pinia from "@/pinia/store.js";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useNotificationStore } from "@/pinia/notification";
import { useUtilityStore } from "@/pinia/utility";


const configStore = useConfigStore(pinia);
const utilityStore = useUtilityStore(pinia);
const notificationStore = useNotificationStore(pinia);
export const useDisplayStore = defineStore({
    id: "display",
    state() {
        return {
            tag: 'Display-Rundown',
            type: '',
            fields: [],
            strength: {},
            strengthIndicators: [],
            referenceFields: [],
            sheet: false,
            loading: false
        }
    }, actions: {
        fetchField(data) {
            this.loading = true;
            axios
                .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/field`, {
                    params: data
                })
                .then(response => {
                    if (response.status === 200) {
                        this.loading = false;
                        this.fields = response.data.fields;
                    } else if (response.status === 401) {
                        //
                    }
                })
                .catch(utilityStore.onError)
        },
        addField(form) {
            let data = form;
            data.type = this.type;
            axios
                .post(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/field`, data)
                .then(response => {
                    if (response.status === 200) {
                        notificationStore.showAlertSuccess("Fields data has been updated");
                        this.fetchField({ type: this.type });
                    } else if (response.status === 401) {
                        //
                    } else {
                        notificationStore.showAlertFailed(response.data.message);
                    }
                    this.sheet = false;
                })
                .catch(utilityStore.onApiResponse)
        },
        fetchReferenceField(data) {
            axios
                .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/field`, {
                    params: data
                })
                .then(response => {
                    if (response.status === 200) {
                        this.referenceFields = response.data.fields;
                    } else if (response.status === 401) {
                        //
                    }
                })
                .catch(utilityStore.onApiResponse)
        },
        submitField(data) {
            this.loading = true;
            this.formatFields(data);
            axios
                .post(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/field`, {
                    fields: data
                })
                .then(response => {
                    this.loading = false;
                    if (response.status === 200) {
                        this.fields = data;
                        notificationStore.showAlertSuccess("Fields data has been updated");
                        this.fetchField({ type: this.type });
                    } else if (response.status === 401) {
                        //
                    } else {
                        notificationStore.showAlertFailed(response.data.message);
                    }
                })
                .catch(utilityStore.onApiResponse)
        },
        formatFields() {
            this.fields = this.fields.map(function (row, index) {
                return (row.position = index + 1);
            });
        },
        fetchStrengthIndicator(data) {
            this.loading = true;
            axios
                .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/strength-indicator`, {
                    params: data
                })
                .then(response => {
                    this.loading = false;
                    if (response.status === 200) {
                        this.strengthIndicators = response.data.data;
                    } else if (response.status === 401) {
                        //
                    }
                })
                .catch(utilityStore.onApiResponse)
        },
        submitStrengthIndicator(data) {
            this.loading = true;
            axios
                .post(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/strength-indicator`, data)
                .then(response => {
                    this.loading = false;
                    if (response.status === 200) {
                        this.strengthIndicators = response.data.data;
                        notificationStore.showAlertSuccess("Strength indicator data has been updated");
                        this.fetchStrengthIndicator({ type: this.type });
                    } else if (response.status === 401) {
                        //
                    } else {
                        notificationStore.showAlertFailed(response.data.message);
                    }
                })
                .catch(utilityStore.onApiResponse)
        },
        fetchStrength(data) {
            this.loading = true;
            axios
                .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/strength`, {
                    params: data
                })
                .then(response => {
                    this.loading = false;
                    if (response.status === 200) {
                        this.loading = false;
                        this.strength = response.data.data;
                    } else if (response.status === 401) {
                        //
                    }
                })
                .catch(utilityStore.onApiResponse)
        },
        submitStrength(data) {
            this.loading = true;
            axios
                .post(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory/strength`, data)
                .then(response => {
                    this.loading = false;
                    if (response.status === 200) {
                        notificationStore.showAlertSuccess("Strength data has been updated");
                        this.fetchStrength({ type: this.type });
                    } else if (response.status === 401) {
                        //
                    } else {
                        notificationStore.showAlertFailed(response.data.message);
                    }
                })
                .catch(utilityStore.onApiResponse)
        },
    }
});