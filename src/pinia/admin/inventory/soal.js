import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();

export const useSoalStore = defineStore({
  id: "ifp-view-soal",
  state() {
    return {
      context: null,
      apiUrl: configStore.apiUrl,
    };
  },

  actions: {
    mulaiTest() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/soal`
        )
        .then((response) => {
          if (response.status === 200) {
            window.open(
              `${response.data}`,
              "_blank" // <- This is what makes it open in a new window.
            );
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
  },
});
