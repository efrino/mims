import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import CryptoJS from "crypto-js";

const authStore = useAuthStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
export const usePatanStore = defineStore({
  id: "master-patan",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Master.Create.Patan"),
      },
      datatables: {
        search: "",
        headers: [
          { text: "No", align: "left", value: "urut_plan" },
          { text: "Date", align: "left", value: "date" },
          { text: "Line", align: "left", value: "line" },
          { text: "Patan", align: "left", value: "patan" },
          { text: "Combination", align: "left", value: "combination" },
          { text: "Part RH", align: "left", value: "part_rh" },
          { text: "Part LH", align: "left", value: "part_lh" },
          { text: "Stroke Plan", align: "left", value: "stroke_plan" },
          { text: "Lot Size RH", align: "left", value: "lot_rh" },
          { text: "Lot Size LH", align: "left", value: "lot_lh" },
          { text: "TPT (Menit)", align: "left", value: "tpt" },
          { text: "Status Plan", align: "left", value: "status_plan" },
          { text: "Dandori Plan", align: "left", value: "dandori_plan" },
          { text: "GSPH Plan", align: "left", value: "gsph" },
          { text: "Action", align: "left", value: "period" },
        ],
        items: [],
      },
      datatablesUpload: {
        search: "",
        headers: [
          { text: "Period", align: "left", value: "period" },
          { text: "Line", align: "left", value: "line" },
          { text: "Patan", align: "left", value: "patan" },
          { text: "Combination", align: "left", value: "combination" },
          {
            text: "Value Combination",
            align: "left",
            value: "value_combination",
          },
          { text: "Jumlah Process", align: "left", value: "plan_process" },
          { text: "Part RH", align: "left", value: "part_rh" },
          { text: "Part LH", align: "left", value: "part_lh" },
          { text: "Stroke Plan", align: "left", value: "stroke_plan" },
          { text: "Lot Size RH", align: "left", value: "lot_rh" },
          { text: "Lot Size LH", align: "left", value: "lot_lh" },
          { text: "TPT (Menit)", align: "left", value: "tpt" },
          { text: "GSPH", align: "left", value: "gsph" },
          { text: "Cyle Time", align: "left", value: "cycletime" },
          { text: "Dandori Plan", align: "left", value: "dandori_plan" },
          { text: "Status Plan", align: "left", value: "status_plan" },
          { text: "R/M", align: "left", value: "raw_matnr" },
          { text: "Qty Plan R/M", align: "left", value: "need+qty" },
          { text: "Stock SAP R/M", align: "left", value: "stock_sap" },
          { text: "Simulate", align: "left", value: "ERROR" },
          { text: "Simulate R/M", align: "left", value: "WARNING" },
        ],
        items: [],
      },
      datatablesSchedule: {
        search: "",
        headers: [
          { text: "Period", align: "left", value: "period" },
          { text: "Date", align: "left", value: "date" },
          { text: "Line", align: "left", value: "line" },
          { text: "Patan", align: "left", value: "patan" },
          { text: "Shift", align: "left", value: "shift" },
          { text: "Urut", align: "left", value: "urut" },
          { text: "Combination", align: "left", value: "combination" },
          { text: "Jumlah Proses", align: "left", value: "plan_process" },
          { text: "Part RH", align: "left", value: "part_rh" },
          { text: "Part LH", align: "left", value: "part_lh" },
          { text: "Stroke Plan", align: "left", value: "stroke_plan" },
          { text: "Lot Size RH", align: "left", value: "lot_rh" },
          { text: "Lot Size LH", align: "left", value: "lot_lh" },
          { text: "TPT (Menit)", align: "left", value: "tpt" },
          { text: "Status Plan", align: "left", value: "status_plan" },
          { text: "Action", align: "left", value: "period" },
        ],
        items: [],
      },
      form: [
        "period",
        "line",
        "patan",
        "combination",
        "value_combination",
        "plan_process",
        "part_rh",
        "part_lh",
        "stroke_plan",
        "lot_rh",
        "lot_lh",
        "tpt",
        "gsph",
        "cycletime",
        "dandori_plan",
        "status_plan",
        "machine",
        "process",
        "raw_matnr",
        "need_qty",
        "stock_sap",
      ],
      dialog: {
        datePicker: false,
        datePickerForm: false,
        filter: false,
        upload: false,
        form: false,
        filterSchedule: false,
        printTagOK: false,
      },
      error: 0,
      speedDial: {
        model: false,
        btn: false,
      },
      filter: {
        date: date.date,
        line: "A",
        shift: "1",
      },
      filterSchedule: {
        date: date.date,
        line: "A",
        patan: "A",
        shift: "1",
      },
      formData: {
        id: "",
        urut: "",
        date: date.date,
        shift: "",
        line_id: "",
        patan: "",
        combination: "",
        part_rh: "",
        part_lh: "",
        lot_rh: "",
        lot_lh: "",
        plan_process: "",
        stroke_plan: "",
        tpt: "",
        gsph: "",
        cycletime: "",
        dandori_plan: "",
        status_plan: "",
        stock_sap: "",
        need_qty: "",
        raw_matnr: "",
        is_active: 0,
      },
      list: {
        line: ["A", "B", "C", "D", "E", "F", "G", "H", "SP", "300T"],
        patan: ["A", "B", "C", "D", "R1", "R2", "R3", "R4"],
        status: ["1", "0"],
        status_plan: ["BL", "WIP", "FP"],
        combination: ["5 - 0", "4 - 0", "3 - 0", "2 - 0", "1 - 0"],
        shift: ["1", "2"],
        tipe_part: ["FP", "WIP"],
        planProcess: ["1", "2", "3", "4", "5", "6", "7"],
      },
    listShift: [1, 2],
      params: utilityStore.getCurrentShift(),
      lines: {
        line: ["A", "B", "C", "D", "E", "F", "G", "H", "SP", "300T"],
      },
      dataPatan: [],
    };
  },
  actions: {
    resetForm() {
      this.fetchPatan();
      this.fetchSchedulePress();
      this.formData = {
        id: "",
        urut: "",
        date: date.date,
        shift: "",
        line_id: "",
        patan: "",
        combination: "",
        part_rh: "",
        part_lh: "",
        stroke_plan: "",
        lot_rh: "",
        lot_lh: "",
        tpt: "",
        gsph: "",
        cycletime: "",
        dandori_plan: "",
        status_plan: "",
        is_active: 0,
      };
      this.datatablesUpload.items = [];
      this.dialog.form = false;
    },
    searchPart(item) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
    },
    onMove(to, data) {
      notificationStore.loading = true;
      const fd = new URLSearchParams();
      fd.append("id", data.id);
      fd.append("urut", data.urut);
      fd.append("move", to);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/move`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(response, this.fetchPatan())
        )
        .catch(configStore.onError);
    },
    fetchPatan() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/schedule_press`,
          {
            params: this.filter,
          }
        )
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
    async fetchDataTagOK(parameter_tag) {
      try {
        notificationStore.loading = true;

        const response = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/data_tag_ok?parameter_tag=${parameter_tag}`,
          {
            params: this.filter,
          }
        );

        if (response.status === 200) {
          this.dataPatan = response.data;
          notificationStore.disableLoading();
          return response.data; // PASTIKAN data dikembalikan!
        } else {
          utilityStore.onApiResponse(response);
          return []; // Return array kosong jika gagal
        }
      } catch (error) {
        utilityStore.onError(error);
        return []; // Return array kosong jika error
      }
    }, 
    async fetchDataTagOKAdd(parameter_tag) {
      try {
        notificationStore.loading = true;

        const response = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/data_tag_ok_add?parameter_tag=${parameter_tag}`,
          {
            params: this.filter,
          }
        );

        if (response.status === 200) {
          this.dataPatan = response.data;
          notificationStore.disableLoading();
          return response.data; // PASTIKAN data dikembalikan!
        } else {
          utilityStore.onApiResponse(response);
          return []; // Return array kosong jika gagal
        }
      } catch (error) {
        utilityStore.onError(error);
        return []; // Return array kosong jika error
      }
    },
    fetchLineOnOFF() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/schedule`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.data.status === true) {
            this.lines = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchSchedulePress() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/schedule_press`,
          {
            params: this.filterSchedule,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesSchedule.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    loadDataPatan(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
        // if (i[0] == "period") {
        //   this.formData[i[0]] = utilityStore.formatDate(
        //     `${data[i[0]]}01`,
        //     "YYYY-MM"
        //   );
        // }
      });
      this.action = action;
      this.dialog.form = true;
    },
    onUpdate() {
      notificationStore.loading = true;
      let valid = false;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formData).map((e) => {
        if (
          (this.action == "Add" || this.action == "Edit") &&
          this.formData.date.length > 1 &&
          this.formData.shift.length > 0
        ) {
          valid = true;
        }
        data.append(e[0], e[1]);
      });

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/add`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan`,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            data,
          };
        }

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

    handleUpload() {
      if (
        this.formData.date == this.params.date &&
        this.formData.shift == this.params.shift &&
        this.datatablesSchedule.items.length > 0
      ) {
        notificationStore.showConfirm(
          "Confirm Change",
          "Apakah Anda ingin mengubah jadwal yang sekarang?",
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
          data.append("shift", this.formData.shift);
          data.append("date", this.formData.date);
          Object.keys(item).map((val) => {
            if (this.form.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
        });
        // window.open(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report?start=${utilityStore.formatDate(date.date,'YYYY-MM-DD',-1,'days')}&end=${utilityStore.formatDate(date.date,'YYYY-MM-DD',1,'days')}`, '_blank');
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan`,
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

    countDataActual() {
      this.formData.stroke_plan_calculate =
        parseInt(this.formData.plan_process) * parseInt(this.formData.lot_rh);
    },

    printTagOK() {
      console.log(this.formData.line_id && this.formData.shift);
      if (
        this.formData.line_id &&
        this.formData.shift &&
        this.formData.tipe_part
      ) {
        const fd = new URLSearchParams();
        fd.append("date", this.formData.date);
        fd.append("shift", this.formData.shift);
        fd.append("line_id", this.formData.line_id);
        fd.append("tipe_part", this.formData.tipe_part);

        const configHttp = {
          method: "put",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print_tag_ok`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data: fd,
        };
        axios(configHttp)
          .then((response) => {
            if (response.data.success === true) {
              const secretKey = "armada123";
              const dataToEncrypt = JSON.stringify({
                line_id: this.formData.line_id,
                date: this.formData.date,
                shift: this.formData.shift,
                tipe_part: this.formData.tipe_part,
              });

              const encryptedData = CryptoJS.AES.encrypt(
                dataToEncrypt,
                secretKey
              ).toString();
              window.open(
                `http://${
                  configStore.apiUrl
                }/mims/production/tag-ok?parameter_tag=${encodeURIComponent(
                  encryptedData
                )}`,
                // `http://localhost:8080/production/tag-ok?parameter_tag=${encodeURIComponent(
                //   encryptedData
                // )}`,
                "_blank"
              );
              this.dialog.printTagOK = false;
            } else {
              utilityStore.onApiResponse(response);
            }
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
      }
    },
  },
});
