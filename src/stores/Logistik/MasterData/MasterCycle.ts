import { defineStore } from "pinia";

import { useNotificationStore } from "@/pinia/notification";
import { useUtilityStore } from "@/pinia/utility";

// TYPES
import type {
    ControlPrepareState,
    ControlPrepareFormData,
} from "@/types/Logistik/MasterData/MasterCycle";

// SERVICES
import {
    fetchMasterCycleService,
    fetchAllCycleService,
    fetchDataItemP5Service,
    fetchDataItemP4Service,
    fetchDataEksporService,
    fetchTotalCycleService,
    fetchTotalCycleNowService,
    fetchTimeCycleP4Service,
} from "@/services/Logistik/MasterData/MasterCycle";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useControlPrepare = defineStore("control-prepare", {
    state: (): ControlPrepareState => ({
        action: "Add",
        apiUrl: "",

        dataMieruka: [],
        data: [],
        datap4: [],
        dataEkspor: [],

        cycle: 0,
        allCycle: [],
        totalCycle: [],

        timecyclep4: 0,
        itemP5: 0,
        itemP4: 0,
        itemEkspor: 0,
        actItemp4: 0,

        filter: {
            cycle: 0,
            date: "",
            customer: "",
            period: date.period,
        },

        datatables: {
            headers: [
                { text: "Cycle", align: "left", value: "cycle" },
                { text: "ETD (Estimated Time of Departure)", align: "left", value: "etd" },
                { text: "ETA (Estimated Time of Arrival)", align: "left", value: "eta" },
            ],
            p5: [],
            p4: [],
            items: [],
            filters: {
                cycle: [],
                etd: [],
                eta: [],
            },
        },

        dialog: {
            datePicker: false,
            form: false,
            timePickerForm: false,
            timePickerFormStart: false,
            filter: true,
        },

        speedDial: {
            model: false,
            btn: false,
        },

        formData: {
            customer: "",
            cycle: "",
            etd: "",
            eta: "",
        },

        list: {
            customer: [
                "ADM PLANT 1",
                "ADM PLANT 4",
                "ADM PLANT 5",
                "TMMIN",
                "GAYA MOTOR",
                "MMKI",
                "MKM",
                "HMMI",
            ],
        },

        form: ["customer", "cycle", "etd", "eta"],
    }),

    actions: {
        resetForm() {
            this.fetchMasterCycle();
            this.fetchAllCycle();
            this.formData = {
                customer: "",
                cycle: "",
                etd: "",
                eta: "",
            } as ControlPrepareFormData;

            this.dialog.form = false;
        },

        async fetchDataItem(
            cycle: string | number,
            notification: boolean,
            plant: string,
            date: string | null = null
        ) {
            notificationStore.loading = notification;
            try {
                const res = await fetchDataItemP5Service(cycle, plant, date);
                if (res.status === 200) {
                    this.data = res.data;
                } else {
                    utilityStore.onApiResponse(res);
                }
            } finally {
                notificationStore.disableLoading();
            }
        },

        async fetchDataItemValue(
            cycle: string | number,
            notification: boolean,
            plant: string
        ) {
            notificationStore.loading = notification;
            try {
                const res = await fetchDataItemP5Service(cycle, plant);
                return res.status === 200 ? res.data : null;
            } finally {
                notificationStore.disableLoading();
            }
        },

        async fetchDataItemP4(
            cycle: string | number,
            notification: boolean,
            plant: string,
            date: string | null = null
        ) {
            notificationStore.loading = notification;
            try {
                const res = await fetchDataItemP4Service(cycle, plant, date);
                this.datap4 = res.data;
            } finally {
                notificationStore.disableLoading();
            }
        },

        async fetchDataEkspor(notification: boolean) {
            notificationStore.loading = notification;
            try {
                const res = await fetchDataEksporService(this.filter);
                if (res.status === 200) {
                    this.dataEkspor = res.data.data;
                } else {
                    utilityStore.onApiResponse(res);
                }
            } finally {
                notificationStore.disableLoading();
            }
        },

        async fetchTotalCycle() {
            const res = await fetchTotalCycleService(this.filter);
            if (res.status === 200) {
                this.allCycle = res.data;
            } else {
                utilityStore.onApiResponse(res);
            }
        },

        async fetchTotalCycleNOW(
            cycle: string | number,
            plant: string,
            date: string | null = null
        ) {
            const res = await fetchTotalCycleNowService(cycle, plant, date);
            if (res.status === 200) {
                this.totalCycle = res.data;
            } else {
                utilityStore.onApiResponse(res);
            }
        },

        async fetchTimeCycleP4() {
            const res = await fetchTimeCycleP4Service(this.filter);
            if (res.status === 200) {
                this.timecyclep4 = res.data;
            } else {
                utilityStore.onApiResponse(res);
            }
        },

        async fetchMasterCycle() {
            try {
                const res = await fetchMasterCycleService();
                if (res.status === 200) {
                    this.datatables.p5 = res.data.p5.detail;
                    this.datatables.p4 = res.data.p4.detail;
                } else {
                    utilityStore.onApiResponse(res);
                }
            } catch (err) {
                utilityStore.onError(err);
            }
        },

        async fetchAllCycle() {
            notificationStore.loading = true;
            try {
                const res = await fetchAllCycleService(this.filter);
                this.dialog.filter = false;
                this.datatables.items = res.data;
            } catch (err) {
                utilityStore.onError(err);
            } finally {
                notificationStore.disableLoading();
            }
        },
    },
});
