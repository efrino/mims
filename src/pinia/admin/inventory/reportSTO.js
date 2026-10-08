import axios from "axios";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import { useNotificationStore } from "@/pinia/notification";

const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
export const useReportSTOStore = defineStore({
  id: "report-delivery-adm",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      shiftNow: utilityStore.getShiftNow(),
      tableData: [],
      dataTag: [],
      list: {
        area: ["IRM", "IFP", "KORIDOR", "WELDING", "METAL FINISH", "INTGD WRHS"],
        type: ["RM", "FP", "WIP"],
      },
      formData: {
        area: "",
        type: "",
      },
      formTag: {
        id_tag: "",
      },

      datatablesDiff: {
        headers: [
          {
            text: "Part Number",
            align: "left",
            value: "part_number",
          },
          { text: "Job Number", align: "center", value: "job_number" },
          { text: "Material Description", align: "center", value: "material_description" },
          { text: "Total TIM A", align: "center", value: "total_tim_a" },
          { text: "Total TIM B", align: "center", value: "total_tim_b" },
          { text: "Total Diff", align: "center", value: "total_diff" },
        ],
        items: [],
        filters: {
          part_number: [],
          job_number: [],
          material_description: [],
          total_tim_a: [],
          total_tim_b: [],
          total_diff: [],
        },
      },
    };
  },
  actions: {
    async fetchReportSTO() {
      try {
        notificationStore.loading = true;
        const response = await axios
          // .get(`http://192.168.10.67/majsf_rest_api/api/report_delivery/trial?period=${id}`)
          .get(
            `http://192.168.10.67/report_sto/api/sto-maj/data_sto_adm?type=${this.formData.type}&area=${this.formData.area}`
          );

        if (Array.isArray(response.data) && response.data.length > 0) {
          this.tableData = response.data; // Menyimpan data ke store
        } else {
          this.tableData = [];
        }
        if(this.formData.area == "" ){
          notificationStore.showAlertWarning('Pilih Area terlebih dahulu !')
        }
        notificationStore.disableLoading();
      } catch (error) {
        console.error("Gagal fetch data:", error);
      }
    },

    fetchReportDiff() {
      notificationStore.loading = true;
      axios
        // .get(`http://192.168.10.67/majsf_rest_api/api/report_delivery/trial?period=${id}`)
        .get(
          `http://192.168.10.67/report_sto/api/sto-maj/data_sto_diff`
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesDiff.items = response.data
            notificationStore.disableLoading();
          }
        });
    },

    filteredItems() {
      return this.datatablesDiff.items.filter((d) => {
        return Object.keys(this.datatablesDiff.filters).every((f) => {
          return (
            this.datatablesDiff.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesDiff.filters[f].toLowerCase())
          );
        });
      });
    },

    searchIDTag() {
      notificationStore.loading = true;
      axios
        .get(
          `http://192.168.10.67/report_sto/api/sto-maj/data_id_tag?id_tag=${this.formTag.id_tag}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.dataTag = response.data
            notificationStore.disableLoading();
          }
        });
    },
  },
});
