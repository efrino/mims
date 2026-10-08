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
export const useWeldingScheduleStore = defineStore({
  id: "master-welding-schedule",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Master.Create.WeldingSchedule"),
      },
      datatables: {
        search: "",
        headers: [
          { text: "Period", align: "left", value: "period" },
          { text: "Line", align: "left", value: "line_id" },
          // { text: "Mesin", align: "left", value: "machine" },
          { text: "Patan", align: "left", value: "patan" },
          { text: "Total Process", align: "left", value: "total_process" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Stroke", align: "left", value: "stroke" },
          { text: "Lot Size", align: "left", value: "lotsize" },
          { text: "TPT (Menit)", align: "left", value: "tpt" },
          { text: "UPH Plan", align: "left", value: "uph" },
          { text: "Status Plan", align: "left", value: "status_plan" },
        ],
        items: [],
      },
      datatablesUpload: {
        search: "",
        headers: [
          { text: "Period", align: "left", value: "period" },
          { text: "Line", align: "left", value: "line_id" },
          { text: "Patan", align: "left", value: "patan" },
          { text: "Jumlah Process", align: "left", value: "total_process" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Stroke", align: "left", value: "stroke" },
          { text: "Lot Size", align: "left", value: "lotsize" },
          { text: "TPT (Menit)", align: "left", value: "tpt" },
          { text: "UPH Plan", align: "left", value: "uph" },
          { text: "Status Plan", align: "left", value: "status_plan" },
          { text: "Simulate", align: "left", value: "ERROR" },
        ],
        items: [],
      },
      form: [
        "period",
        "date",
        "shift",
        "line_id",
        "patan",
        "total_process",
        "part_number",
        "lotsize",
        "stroke",
        "uph",
        "tpt",
        "urut",
        "status_plan",
      ],
      dialog: {
        datePicker: false,
        datePickerFilter: false,
        datePickerForm: false,
        filter: false,
        upload: false,
        form: false,
        filterSchedule: false,
        showPrintTagOK: false,
      },
      error: 0,
      speedDial: {
        model: false,
        btn: false,
      },
      filter: {
        date: date.date,
        shift: date.shift,
        line_id: "S/A HMMI",
      },
      formData: {
        period: date.period,
        date: date.date,
        shift: "",
        line_id: "",
        machine: "",
        patan: "",
        value_combination: "",
        part_number: "",
        lotsize: "",
        stroke: "",
        uph: "",
        tpt: "",
        urut: "",
        status_plan: "",
      },
      list: {
        line: [
          // "S/A ADM ROBOT",
          // "S/A ADM MANUAL",
          // "CO2 ROBOT",
          // "WSS ADM",
          // "HMMI",
          // "MKM",
          // "MMKI",
          // "V to V",
        ],
        patan: ["A - C", "B - D"],
        status: ["1", "0"],
        shift: ["1", "2"],
        tipe_part: ["FP", "WIP"],
        Robot: [
          "R-1",
          "R-2",
          "R-3",
          "R-4",
          "R-5",
          "R-6",
          "R-7",
          "R-8",
          "R-9",
          "R-10",
          "R-11",
          "R-12",
        ],
      },
      params: utilityStore.getCurrentShift(),
      dataPatan: [],
    };
  },
  actions: {
    resetForm() {
      this.fetchWeldingSchedule();
      this.formData = {
        period: date.period,
        date: date.date,
        shift: "",
        line_id: "",
        machine: "",
        patan: "",
        nut_spot: "",
        part_number: "",
        job_number: "",
        machine_weld: "",
        lotsize: "",
        stroke: "",
        cycletime: "",
        tpt: "",
        urut: "",
      };
      this.datatablesUpload.items = [];
      this.dialog.form = false;
    },
    searchPart(item) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
    },
    getLineList() {
      notificationStore.loading = true;
      const configHttp = {
        method: "get",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding_schedule/line_list`,
      };
      axios(configHttp)
        .then((response) => {
          let lines = [];
          response.data.forEach((element) => {
            lines.push(element.line);
          });
          this.list.line = lines;
        })
        .catch(configStore.onError);
    },
    onMove(to, data) {
      notificationStore.loading = true;
      const fd = new URLSearchParams();
      fd.append("id", data.id);
      fd.append("urut", data.urut);
      fd.append("move", to);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding_schedule/move`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.fetchWeldingSchedule()
          )
        )
        .catch(configStore.onError);
    },
    fetchWeldingSchedule() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding_schedule`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.data.status == true) {
            this.datatables.items = response.data.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    loadDataSchedule(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
        if (i[0] == "period") {
          this.formData[i[0]] = utilityStore.formatDate(
            `${data[i[0]]}01`,
            "YYYY-MM"
          );
        }
      });
      this.action = action;
      this.dialog.form = true;
    },
    onUpdate() {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formData).map((e) => {
        if (this.action == "Add" || this.action == "Edit") {
          valid = true;
        }
        data.append(e[0], e[1]);
      });

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding_schedule/add`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding_schedule`,
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
        this.datatables.items.length > 0
      ) {
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
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding-schedule`,
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
      if (this.formData.line_id && this.formData.shift) {
        const fd = new URLSearchParams();
        let line_tag = "";
        switch (this.formData.line_id) {
          case "CO2 ROBOT":
            line_tag = "CO2 RB";
            break;
          case "S/A ADM MANUAL":
            line_tag = "S/A MAN";
            break;
          case "S/A ADM ROBOT":
            line_tag = "S/A RB";
            break;
          default:
            line_tag = this.formData.line_id;
        }
        console.log(this.formData);

        fd.append("date", this.formData.date);
        fd.append("shift", this.formData.shift);
        fd.append("tipe_part", this.formData.tipe_part);
        fd.append("line_id", line_tag);

        const configHttp = {
          method: "put",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/print_tag_ok`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data: fd,
        };
        axios(configHttp)
          .then((response) => {
            console.log(response);
            if (response.data.success === true) {
              const secretKey = "armada123";
              const dataToEncrypt = JSON.stringify({
                line_id: line_tag,
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
                }/mims/production-welding/tag-ok?parameter_tag=${encodeURIComponent(
                  encryptedData
                )}`,
                // `http://localhost:8080/production-welding/tag-ok?parameter_tag=${encodeURIComponent(
                //   encryptedData
                // )}`,
                "_blank"
              );

              this.dialog.showPrintTagOK = false;
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

    async fetchDataTagOK(parameter_tag) {
      try {
        notificationStore.loading = true;
        const response = await axios.get(
          // `http://192.168.10.67/majsf_rest_api/api/master/Welding-schedule/data_tag_ok?parameter_tag=${parameter_tag}`
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding-schedule/data_tag_ok?parameter_tag=${parameter_tag}`
        );

        if (response.status === 200) {
          this.dataPatan = response.data;
          notificationStore.disableLoading();
          console.log(response.data);

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
  },
});
