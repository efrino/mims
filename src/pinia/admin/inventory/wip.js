// import axios from "axios";
// import pinia from "@/pinia/store.js";
import { defineStore } from "pinia";
// import { useConfigStore } from "@/pinia/config";

// const configStore = useConfigStore(pinia);
export const useWipStore = defineStore({
    id: "wip",
    state() {
        return {
            tag: 'WIP',
            formType: 'create',
            data: {},
            formOpen: false,
            lines: ["LNA", "LNB", "LNC", "LND", "LNE", "LNF", "LSP"]
        }
    }, actions: {

    }
});