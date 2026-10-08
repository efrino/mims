// import axios from "axios";
// import pinia from "@/pinia/store.js";
import { defineStore } from "pinia";
// import { useConfigStore } from "@/pinia/config";
// import { permissionList } from "@/router/list";

// const configStore = useConfigStore(pinia);
export const usePageStore = defineStore({
    id: "page",
    state() {
        return {
            tag: 'Page',
            navigations: []
        }
    }, actions: {

    }
})