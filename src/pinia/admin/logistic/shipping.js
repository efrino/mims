import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const authStore = useAuthStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
export const useShippingStore = defineStore({
  id: "logistic-shipping",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Logistic.Create.Shipping")
      },
      datatables: {
        search: "",
        headers: [
          { text: "No", align: "left", value: "no" },
          { text: "Order Number", align: "left", value: "order_number" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Qty/kbn", align: "left", value: "kbn" },
        ],
        items: []
      },
      datatablesUpload: {
        headers: [
          { text: "Plant Code", align: "left", value: "plant_code" },
          { text: "Shop Code", align: "left", value: "shop_code" },
          { text: "Part Category", align: "left", value: "part_category" },
          { text: "Route", align: "left", value: "route" },
          { text: "LP", align: "left", value: "lp" },
          { text: "Trip", align: "left", value: "trip" },
          { text: "Vendor Code", align: "left", value: "vendor_code" },
          { text: "Vendor Alias", align: "left", value: "vendor_alias" },
          { text: "Vendor Site", align: "left", value: "vendor_site" },
          { text: "Vendor Site Alias", align: "left", value: "vendor_site_alias" },
          { text: "Order No", align: "left", value: "order_no" },
          { text: "PO Number", align: "left", value: "po_number" },
          { text: "Calc. Date", align: "left", value: "calc_date" },
          { text: "Order Date", align: "left", value: "order_date" },
          { text: "Order Time", align: "left", value: "order_time" },
          { text: "Order Cycle", align: "left", value: "order_cycle" },
          { text: "Del. Type", align: "left", value: "del_type" },
          { text: "Del. Date", align: "left", value: "del_date" },
          { text: "Del. Time", align: "left", value: "del_time" },
          { text: "Del. Cycle", align: "left", value: "del_cycle" },
          { text: "Doc No", align: "left", value: "doc_no" },
          { text: "Total / Kanban", align: "left", value: "total_Kanban" },
          { text: "Rec Status", align: "left", value: "rec_status" },
          { text: "DN Type", align: "left", value: "dn_type" },
          { text: "Rec Date", align: "left", value: "rec_date" },
          { text: "Rec By", align: "left", value: "rec_by" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Part Name", align: "left", value: "part_name" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Lane", align: "left", value: "lane" },
          { text: "Qty / Kbn", align: "left", value: "qty_kbn" },
          { text: "Order (kbn)", align: "left", value: "order_kbn" },
          { text: "Order (pcs)", align: "left", value: "order_pcs" },
          { text: "Qty Receive", align: "left", value: "qty_receive" },
          { text: "Qty Balance", align: "left", value: "qty_balance" },
          { text: "Cancel Status", align: "left", value: "cancel_Status" },
          { text: "Remark", align: "left", value: "remark" },
        ],
        items: []
      },
      form: [
        "plant_code",
        "shop_code",
        "part_category",
        "route",
        "lp",
        "trip",
        "vendor_code",
        "vendor_alias",
        "vendor_site",
        "vendor_site_alias",
        "order_no",
        "po_number",
        "calc_date",
        "order_date",
        "order_time",
        "order_cycle",
        "del_type",
        "del_date",
        "del_time",
        "del_cycle",
        "doc_no",
        "total_Kanban",
        "rec_status",
        "dn_type",
        "rec_date",
        "rec_by",
        "part_number",
        "part_name",
        "job_number",
        "lane",
        "qty_kbn",
        "order_kbn",
        "order_pcs",
        "qty_receive",
        "qty_balance",
        "cancel_Status",
        "remark",
      ],
      dialog: {
        datePicker: false,
        datePickerForm: false,
        filter: false,
        upload: false,
        form: false
      },
      error: 0,
      speedDial: {
        model: false,
        btn: false
      },
      formData: {
        order_number: "",
        job_number: "",
        part_number: "",
        cycle: "",
        order: "",
        c1_plan1: "",
        c1: "",
        c2_plan2: "",
        c2: "",
        c3_plan3: "",
        c3: "",
        c4_plan4: "",
        c4: "",
        c5_plan5: "",
        c5: "",
        c6_plan6: "",
        c6: "",
        c7_plan7: "",
        c7: "",
        c8_plan8: "",
        c8: "",
      },
    };
  },
  actions: {
    resetForm() {
      this.fetchPart();
      this.formData = {
        order_number: "",
        job_number: "",
        part_number: "",
        cycle: "",
        order: "",
        c1_plan1: "",
        c1: "",
        c2_plan2: "",
        c2: "",
        c3_plan3: "",
        c3: "",
        c4_plan4: "",
        c4: "",
        c5_plan5: "",
        c5: "",
        c6_plan6: "",
        c6: "",
        c7_plan7: "",
        c7: "",
        c8_plan8: "",
        c8: "",
      };
      this.datatablesUpload.items = [];
      this.dialog.form = false;
    },
    // Ambil data dari SAP
    fetchPart() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/part/part`, {
        })
        .then((response) => {
          if (response.status === 200) {
              this.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
    },
    fetchPartTable() {
      notificationStore.loading = false;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/part`, {
        })
        .then((response) => {
          if (response.status === 200) {
            this.table.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
            notificationStore.disableLoading();
          }
        })
    },
    cancelAutoUpdate () {
      clearInterval(this.timer);
  },
    onUpload() {
      notificationStore.loading = true;
      if (this.datatablesUpload.items.length) {
        const data = new FormData();
        this.datatablesUpload.items.map((item) => {
          Object.keys(item).map((val) => {
            if (this.form.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
        });
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/Shipping/upload`,
          headers: {
            "Content-Type": "multipart/form-data"
          },
          data
        };
        axios(configHttp)
          .then((response) => {
            if (response.status === 200) {
              let error = true;
              let message = "";
              if (response.data.success) {
                error = false;
                this.resetForm();
                this.dialog.upload= false;
              }
              let tmp = document.createElement("DIV");
              tmp.innerHTML = response.data.messages + message;
              if (error) {
                notificationStore.showAlertWarning(
                  tmp.textContent || tmp.innerText || ""
                );
              } else {
                notificationStore.showAlertSuccess(
                  tmp.textContent || tmp.innerText || ""
                );
              }
            } else {
              notificationStore.showAlertWarning(response.data.status);
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
    onUploadDisplay() {
      notificationStore.loading = true;
      if (this.datatablesUploadDisplay.items.length) {
        const data = new FormData();
        this.datatablesUploadDisplay.items.map((item) => {
          Object.keys(item).map((val) => {
            if (this.form.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
        });
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/Barcode/upload`,
          headers: {
            "Content-Type": "multipart/form-data"
          },
          data
        };
        axios(configHttp)
          .then((response) => {
            if (response.status === 200) {
              let error = true;
              let message = "";
              if (response.data.success) {
                error = false;
                this.resetForm();
                this.dialog.upload= false;
              }
              let tmp = document.createElement("DIV");
              tmp.innerHTML = response.data.messages + message;
              if (error) {
                notificationStore.showAlertWarning(
                  tmp.textContent || tmp.innerText || ""
                );
              } else {
                notificationStore.showAlertSuccess(
                  tmp.textContent || tmp.innerText || ""
                );
              }
            } else {
              notificationStore.showAlertWarning(response.data.status);
            }
            notificationStore.disableLoading();
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap"
        );
      }
    }
  }
});
