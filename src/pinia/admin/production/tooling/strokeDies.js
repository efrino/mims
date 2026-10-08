import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
export const useStrokeDies = defineStore({
  id: "report-delivery-adm",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      dialog: {
        form: false,
        filter: false,
      },
      groupedData: { shift1: {}, shift2: {} },
      speedDial: {
        model: false,
        btn: false,
      },
      table: {
        items: [],
      },
      datatables: {
        headers: [
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Total Dies", align: "left", value: "total_dies" },
          { text: "Limit Stroke", align: "left", value: "limit_stroke" },
          { text: "Current Stroke", align: "left", value: "current_stroke" },
          { text: "% Stroke", align: "left", value: "percentage" },
          {
            text: "Accumulation Stroke",
            align: "left",
            value: "accumulation_stroke",
          },
        ],
        items: [],
        filters: {
          part_number: [],
          total_dies: [],
          limit_stroke: [],
          current_stroke: [],
          percentage: [],
          accumulation_stroke: [],
        },
      },
      datatablesPeriod: {
        headers: [
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "01", align: "left", value: "" },
          { text: "02", align: "left", value: "" },
          { text: "03", align: "left", value: "" },
          { text: "04", align: "left", value: "" },
          { text: "05", align: "left", value: "" },
          { text: "06", align: "left", value: "" },
          { text: "07", align: "left", value: "" },
          { text: "08", align: "left", value: "" },
          { text: "09", align: "left", value: "" },
          { text: "10", align: "left", value: "" },
          { text: "11", align: "left", value: "" },
          { text: "12", align: "left", value: "" },
          { text: "13", align: "left", value: "" },
          { text: "14", align: "left", value: "" },
          { text: "15", align: "left", value: "" },
          { text: "16", align: "left", value: "" },
          { text: "17", align: "left", value: "" },
          { text: "18", align: "left", value: "" },
          { text: "19", align: "left", value: "" },
          { text: "20", align: "left", value: "" },
          { text: "21", align: "left", value: "" },
          { text: "22", align: "left", value: "" },
          { text: "23", align: "left", value: "" },
          { text: "24", align: "left", value: "" },
          { text: "25", align: "left", value: "" },
          { text: "26", align: "left", value: "" },
          { text: "27", align: "left", value: "" },
          { text: "28", align: "left", value: "" },
          { text: "29", align: "left", value: "" },
          { text: "30", align: "left", value: "" },
          { text: "31", align: "left", value: "" },
          { text: "Total", align: "left", value: "" },
        ],
        items: [],
        filters: {
          part_number: [],
        },
        currentDate: new Date(), 
      },
      filter: {
        period: date.period,
      },
      formData: {
        part_number: "",
        total_dies: "",
        limit_stroke: "",
        current_stroke: "",
        percentage: "",
        accumulation_stroke: "",
      },
      form: [
        "part_number",
        "total_dies",
        "limit_stroke",
        "current_stroke",
        "percentage",
        "accumulation_stroke",
      ],
    };
  },
  actions: {
    fetchStroke() {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/stroke_dies`)
        .then((response) => {
          if (response.status === 200) {
            this.table.items = response.data;
            this.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchStrokePeriod() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/stroke_dies/period`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesPeriod.items = response.data;
            if (response.data && response.data.length > 0) {
              this.groupDataByShift(response.data);
            } else {
              console.error('API response is empty or not in the expected format.');
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    groupDataByShift(data) {
      try {
        data.forEach((item) => {
          const shiftKey = `shift${item.shift || 1}`;
          if (!this.groupedData[shiftKey][item.part_number]) {
            // Vue 3: Use reactive properties directly
            this.groupedData[shiftKey][item.part_number] = [];
          }
          this.groupedData[shiftKey][item.part_number].push(item);
        });
      } catch (error) {
        console.error('Error grouping data by shift:', error);
      }
    },

    fetchDataSap() {
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report_delivery/index`
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          }
        });
    },

    loadDataStroke(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.form = true;
    },

    filterItems() {
      return this.datatables.items.filter((d) => {
        return Object.keys(this.datatables.filters).every((f) => {
          return (
            this.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatables.filters[f].toLowerCase())
          );
        });
      });
    },

    filterItemsPeriod() {
      return this.datatablesPeriod.items.filter((d) => {
        return Object.keys(this.datatablesPeriod.filters).every((f) => {
          return (
            this.datatablesPeriod.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesPeriod.filters[f].toLowerCase())
          );
        });
      });
    },
  },
});
