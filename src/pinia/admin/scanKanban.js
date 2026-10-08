import axios from "axios";
import pinia from "@/pinia/store.js";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useNotificationStore } from "@/pinia/notification";

const configStore = useConfigStore(pinia);
const notificationStore = useNotificationStore(pinia);

export const useScanKanbanStore = defineStore({
    id: "scan-kanban",
    state() {
        return {
            tag: 'SCAN KANBAN',
            loading: false,
            dialog: false,
            data: [],
            kanban: '',
            alert: {
                title: 'Submit Data',
                message: 'Do you really to submit data?'
            },
            headers: [
                { text: "", align: "center" },
                { text: "Kanban", align: "center", value: "kanban", sortable: false },
                {
                    text: "Part Number",
                    align: "center",
                    value: "partNumber",
                    sortable: false
                },
                { text: "Qty", align: "right", value: "qty", sortable: false }
            ],
            type:''
        }
    },
    actions: {
        getKanban() {
            this.loading = true;
            this.dialog = true;
            const config = {
                method: "post",
                url: `http://${configStore.apiUrl}/majsf_rest_api/api/sap/execute`,
                data: {
                    function: "Z_QC",
                    params: {
                        RPT: "GET_MATNR",
                        PKKEY: this.kanban
                    }
                }
            };
            axios(config)
                .then(response => {
                    if (response.status === 200) {
                        let exist = this.data.find(x => x.kanban === this.kanban)
                        if (exist) {
                            notificationStore.showAlertWarning(`Kanban ${this.kanban} already listed`);
                        } else if (response.data.data.BEHMG < 1 || response.data.data.MATNR.length < 1) {
                            notificationStore.showAlertError(`Unknown Kanban Data`);
                        } else {
                            this.data.push({
                                partNumber: response.data.data.MATNR,
                                kanban: this.kanban,
                                qty: response.data.data.BEHMG
                            });
                        }
                    }
                    this.kanban = '';
                    this.loading = false;
                    this.dialog = false;
                })
                .catch(configStore.onApiResponse);
        },
        saveData(vm) {
            const data = new FormData();
            this.dialog = true;

            this.data.forEach(dt => {
                data.append("part_number[]", dt.partNumber);
                data.append("kanban[]", dt.kanban);
                data.append("qty[]", dt.qty);
                data.append("status",this.type);
            });

            const config = {
                method: "post",
                url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-stock/scan-kanban`,
                headers: {
                    "Content-Type": "multipart/form-data"
                },
                data
            };

            axios(config)
                .then(response => {
                    if (response.status === 200) {
                        let partNumber = [];
                        this.data.forEach(dt => {
                            partNumber.push(dt.partNumber);
                        });
                        vm.$socket.emit("scanKanban", partNumber);
                        this.data = [];
                        notificationStore.showAlertSuccess("Data has been saved");
                    } else {
                        notificationStore.showAlertWarning(response.data.message ?? "Something went wrong");
                    }
                    this.kanban = "";
                    this.dialog = false;
                    this.loading = false;
                })
                .catch(configStore.onApiResponse);
        },
        deleteKanban(kanban) {
            this.data = this.data.filter((item) => item.kanban !== kanban);
        }
    }
});
