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
const date = utilityStore.getCurrentShift();
export const useAddPartStore = defineStore({
  id: "master-patan",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Master.Create.Patan")
      },
      datatables: {
        search: "",
        headers: [
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
        ],
        items: []
      },
      datatablesUpload: {
        search: "",
        headers: [
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
        ],
        items: []
      },
      form: [
        "period",
        "line",
        "patan",
        "job_number",
        "part_number",
        "tpt",
        "lotsize",
        "gsph",
        "cycletime",
        "status_plan",
        "machine",
        "process",
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
      filter: {
        period: date.period,
        line: "A",
        patan: "A"
      },
      formData: {
        id: "",
        urut: "",
        period: date.period,
        line_id: "",
        patan: "",
        job_number: "",
        part_number: "",
        tpt: "",
        gsph: "",
        cycletime: "",
        status_plan:"",
        lotsize: "",
        is_active: 0
      },
      list: {
        line: ["A", "B", "C", "D", "E", "F", "SP", "300T"],
        patan: ["A", "B", "C", "D", "R1", "R2", "R3", "R4"],
        status: ["1", "0"],
        status_plan: ["BL", "WIP", "FP"],
      }
    };
  },
  actions: {
    resetForm() {
      this.fetchPatan();
      this.formData = {
        id: "",
        urut: "",
        period: date.period,
        line_id: "",
        patan: "",
        job_number: "",
        part_number: "",
        tpt: "",
        gsph: "",
        cycletime: "",
        status_plan:"",
        lotsize: "",
        is_active: 0
      };
      this.datatablesUpload.items = [];
      this.dialog.form = false;
    },
    fetchPart() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/part`, {
        })
        .then((response) => {
          if (response.status === 200) {
            this.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
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
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/part`,
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
