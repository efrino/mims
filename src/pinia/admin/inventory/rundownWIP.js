import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
export const useRundownWIP = defineStore({
  id: "rundown-wip",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      datatables: {
        headers: [
          { text: "Customer", align: "left", value: "customer" },
          { text: "Model", align: "left", value: "model" },
          { text: "Minimal Strength", align: "left", value: "min_str" },
          { text: "Maximal Strength", align: "left", value: "max_str" },
        ],
        items: [],
        filters: {
          customer: [],
          model: [],
          min_str: [],
          max_str: [],
        },
      },
      table: {
        items: [],
      },
      tableMonitoring: {
        headers: [{ text: "Part Number", align: "left", value: "part_number" }],
        items: [],
        filters: {
          part_number: [],
        },
      },
      data: {
        wip_sap: [],
      },
      tipeData: ["Over", "Safe", "Kritis"],
      dialog: {
        detailItem: false,
        upload: false,
        uploadData: false,
        datePickerPeriod: false,
        datePicker: false,
        form: false,
      },
      tableDetail: {
        items: [],
        type: "",
        customer: "",
        model: "",
      },
      datatablesUpload: {
        search: "",
        headers: [
          { text: "No", align: "left", value: "no" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Part Name", align: "left", value: "part_name" },
          { text: "Customer", align: "left", value: "customer" },
          { text: "Line", align: "left", value: "line_id" },
          { text: "Lot Size", align: "left", value: "lotsize" },
          { text: "QTY KBN", align: "left", value: "qty_kbn" },
          { text: "Orderan", align: "left", value: "orderan" },

          // Loop untuk day_1 sampai day_31
          ...Array.from({ length: 31 }, (_, i) => ({
            text: `Day ${i + 1}`,
            align: "left",
            value: `day_${i + 1}`,
          })),

          { text: "Total", align: "left", value: "total" },
        ],
        items: [],
      },
      form: [
        "no",
        "part_number",
        "job_number",
        "part_name",
        "customer",
        "line_id",
        "lotsize",
        "qty_kbn",
        "orderan",
        "stock_awal",

        // Loop untuk day_1 sampai day_31
        ...Array.from({ length: 31 }, (_, i) => `day_${i + 1}`),

        "total",
      ],

      formWLD: [
        "no",
        "part_number",
        "job_number",
        "part_name",
        "customer",
        "line_id",
        "lotsize",
        "qty_kbn",
        "orderan",

        // Loop untuk day_1_d dan day_1_n sampai day_31_d dan day_31_n
        ...Array.from({ length: 31 }, (_, i) => `day_${i + 1}_d`),
        ...Array.from({ length: 31 }, (_, i) => `day_${i + 1}_n`),

        "total",
      ],
      formData: {
        period: date.period,
        type_data: "",
      },
      formMaster: {
        part_number: "",
        job_number: "",
        part_name: "",
        line_id: "",
        stock_awal: "",
        part_finish: "",
      },
    };
  },
  actions: {
    resetForm() {
      this.fetchMonitoringWIPInhouse();
    },
    fetchDataWIP() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip`)
        .then((response) => {
          if (response.status === 200) {
            this.table.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    stockSAP() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip/stock_sap`
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.wip_sap = response.data;
            notificationStore.disableLoading();
          }
        });
    },
    viewDetailItemSAP(model, customer, type) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/item_detail_sap?customer=${customer}&model=${model}&type=${type}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableDetail.items = response.data;
            this.tableDetail.type = type;
            this.tableDetail.customer = customer;
            this.tableDetail.model = model;
            this.dialog.detailItem = true;
            notificationStore.disableLoading();
          }
        });
    },
    stockInSAP() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip/stock_in_sap`
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.wip_sap = response.data;
            notificationStore.disableLoading();
          }
        });
    },

    fetchMonitoringWIPInhouse() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip/monitoring_wip_inhouse`,
          {
            params: this.formData,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.tableMonitoring.items = response.data;
            notificationStore.disableLoading();
            this.dialog.datePickerPeriod = false;
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    filteredItems() {
      return this.tableMonitoring.items.filter((d) => {
        return Object.keys(this.tableMonitoring.filters).every((f) => {
          return (
            this.tableMonitoring.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.tableMonitoring.filters[f].toLowerCase())
          );
        });
      });
    },

    setTypeData(value) {
      this.formData.type_data = value;
    },

    handleUpload() {
      if (!this.formData.period) {
        notificationStore.showConfirm(
          "Confirm Change",
          "Apakah Anda ingin mengubah / menambahkan achievement yang sekarang?",
          () => {
            this.onUpload();
          }
        );
      } else {
        this.onUpload();
      }
    },

    onUpload() {
      notificationStore.loading = true;
      if (this.datatablesUpload.items.length) {
        const data = new FormData();
        this.datatablesUpload.items.map((item) => {
          data.append("period", this.formData.period);
          data.append("type_data", this.formData.type_data);
          Object.keys(item).map((val) => {
            if (this.formData.type_data == "Prod Welding") {
              if (this.formWLD.includes(val)) {
                data.append(val + "[]", item[val]);
              }
            } else {
              if (this.form.includes(val)) {
                data.append(val + "[]", item[val]);
              }
            }
          });
        });
        // window.open(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report?start=${utilityStore.formatDate(date.date,'YYYY-MM-DD',-1,'days')}&end=${utilityStore.formatDate(date.date,'YYYY-MM-DD',1,'days')}`, '_blank');
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip/data_wip`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        axios(configHttp)
          .then((response) => {
            if (response.status === 200) {
              let error = true;
              let message = "";
              if (response.data.success) {
                error = false;
                this.resetForm();
                this.dialog.upload = false;
              }
              let tmp = document.createElement("DIV");
              tmp.innerHTML = response.data.messages + message;
              if (error) {
                utilityStore.onApiResponse(response);
              } else {
                notificationStore.showAlertSuccess(
                  tmp.textContent || tmp.innerText || ""
                );
              }
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap"
        );
      }
    },

    editMasterData(data) {
      Object.entries(this.formMaster).map((i) => {
        this.formMaster[i[0]] = data[i[0]];
      });
      this.dialog.form = true;
    },

    onUpdate() {
      notificationStore.loading = true;
      let valid = true;
      const data = new URLSearchParams();

      Object.entries(this.formMaster).forEach(([key, value]) => {
        if (!value && key !== "part_number") {
          valid = false;
        }
        data.append("period", this.formData.period);
        data.append(key, value);
      });

      if (valid) {
        let configHttp = {
          method: "put",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip/master_data`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };

        axios(configHttp)
          .then((response) =>
            notificationStore.onApiResponseToastAlert(response, this.resetForm)
          )
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
        notificationStore.disableLoading();
      }
    },

    updateRundownExcelToDB(location) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory/sync?file=Master%20` +
            // `http://192.168.10.67/majsf_rest_api/api/inventory/sync?file=Master%20` +
            location
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.showAlertSuccess(
              `Update Rundown ` + location + ` Success!`
            );
            notificationStore.disableLoading();
          }
        });
    },

    deleteRundownDB(location) {
      if (location == "IFP") {
        axios
          .get(
            `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/delete_rundown_ifp`
            // `http://192.168.10.67/majsf_rest_api/api/rundown_ifp/delete_rundown_ifp`
          )
          .then((response) => {
            if (response.status === 200) {
              notificationStore.showAlertSuccess(
                `Delete Data Rundown ` + location + ` Success!`
              );
              notificationStore.disableLoading();
            }
          });
      } else if (location == "IRM") {
        axios
          .get(
            `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/delete_rundown_irm`
            // `http://192.168.10.67/majsf_rest_api/api/rundown_irm/delete_rundown_irm`
          )
          .then((response) => {
            if (response.status === 200) {
              console.log(response.status);
              notificationStore.showAlertSuccess(
                `Delete Data Rundown ` + location + ` Success!`
              );
              notificationStore.disableLoading();
            }
          });
      } else if (location == "WIP") {
        axios
          .get(
            `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip/delete_rundown_wip`
            // `http://192.168.10.67/majsf_rest_api/api/rundown_wip/delete_rundown_wip`
          )
          .then((response) => {
            if (response.status === 200) {
              console.log(response.status);
              notificationStore.showAlertSuccess(
                `Delete Data Rundown ` + location + ` Success!`
              );
              notificationStore.disableLoading();
            }
          });
      }
    },
  },
});
