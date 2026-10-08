import axios from "axios";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useUtilityStore } from "@/pinia/utility";
import moment from "moment";

const configStore = useConfigStore();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
let formDetail = {
  tandem: [],
  urut: [],
  job_number: [],
  part_number: [],
  patan: [],
  status: [],
  op: [],
  main_process: [],
  press_line: [],
  add_process: [],
  press_line2: [],
  forecast: [],
  lot_size: [],
  interval_prod: [],
  ct: [],
  press_time: [],
  dct: [],
  downtime: [],
  pt: [],
  tpt: [],
  gsph: [],
  stroke: [],
  qty_kbn: [],
  total_palet: [],
  palet: [],
  material: [],
};
export const useStampingAchievementStore = defineStore({
  id: "master-gsph",
  state() {
    return {
      is_done: "",
      context: null,
      line_id: "",
      patan: "",
      formDetail,
      permissions: {
        create: authStore.checkAccess("Production.Create.AchievementStamping"),
        update: authStore.checkAccess("Production.Update.AchievementStamping"),
        download: authStore.checkAccess("Report.Download.AchievementStamping"),
        pcd: authStore.checkAccess("Production.PCD.AchievementStamping"),
      },

      dialog: {
        detail: false,
        chart: false,
      },
      partItems: [],
      lines: [],
      line: {
        patan: "",
        shift: "",
        date: "",
        line_id: "",
        length: 0,
        connection: false,
        detail: formDetail,
      },
      statusList: ["WIP", "FP", "BL"],
      tandem: ["TANDEM", ""],
      addList: ["A", "B", "C", "D", "E", "F", "G", "H", "300T", "SP", "T"],
      listShift: [1, 2],
      params: utilityStore.getCurrentShift(),
      shiftNow: utilityStore.getShiftNow(),
      view: false,
      machine: "",
      statusForm: "",
      order: 1,
      urut: "",
      filterDate: {
        date: date.date,
        shift: date.shift,
      },
      formData: {
        period: "",
        line: "",
      },
      form: [
        "period2",
        "urut",
        "patan",
        "job_number",
        "part_number",
        "status",
        "tandem",
        "model",
        "op",
        "main_process",
        "press_line",
        "add_process",
        "press_line2",
        "forecast",
        "lot_size",
        "interval_prod",
        "ct",
        "press_time",
        "dct",
        "downtime",
        "pt",
        "tpt",
        "gsph",
        "stroke",
        "qty_kbn",
        "total_palet",
        "palet",
        "material",
      ],
      datatablesUpload: {
        search: "",
        headers: [
          { text: "Period", align: "left", value: "period2" },
          { text: "No", align: "left", value: "urut" },
          { text: "Patan", align: "left", value: "patan" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Status", align: "left", value: "status" },
          { text: "Tandem", align: "left", value: "tandem" },
          { text: "Model", align: "left", value: "model" },
          { text: "OP", align: "left", value: "op" },
          { text: "Main Process", align: "left", value: "main_process" },
          { text: "Press Line", align: "left", value: "press_line" },
          { text: "Add Process", align: "left", value: "add_process" },
          { text: "Press Line", align: "left", value: "press_line2" },
          { text: "Forecast", align: "left", value: "forecast" },
          { text: "Lot Size", align: "left", value: "lot_size" },
          { text: "Interval Prod", align: "left", value: "interval_prod" },
          { text: "CT", align: "left", value: "ct" },
          { text: "Press Time", align: "left", value: "press_time" },
          { text: "DCT", align: "left", value: "dct" },
          { text: "Downtime", align: "left", value: "downtime" },
          { text: "PT", align: "left", value: "pt" },
          { text: "TPT", align: "left", value: "tpt" },
          { text: "GSPH", align: "left", value: "gsph" },
          { text: "Stroke", align: "left", value: "stroke" },
          { text: "QTY Kbn", align: "left", value: "qty_kbn" },
          { text: "Total Palet", align: "left", value: "total_palet" },
          { text: "Palet", align: "left", value: "palet" },
          { text: "Material", align: "left", value: "material" },
          { text: "Simulate", align: "left", value: "ERROR" },
        ],
        items: [],
      },
    };
  },
  actions: {
    resetForm() {
      this.fetchDataLine();
      // this.dialog.detail = false;
      this.dialog.formLed = false;
      this.dialog.formData = false;
      this.dialog.formKetRepair = false;
      this.dialog.formKetDT = false;
      this.dialog.confirmDelete = false;
      this.dialog.formStartLed = false;
      this.formData.machine = "";
      this.formData.process = "";
      this.formData.period = "";
      this.formData.line = "";
    },
    onUpload() {
      notificationStore.loading = true;
      if (this.datatablesUpload.items.length) {
        const data = new FormData();
        this.datatablesUpload.items.map((item) => {
          data.append("period", this.formData.period);
          data.append("line", this.formData.line);
          Object.keys(item).map((val) => {
            if (this.form.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
        });
        // window.open(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report?start=${utilityStore.formatDate(date.date,'YYYY-MM-DD',-1,'days')}&end=${utilityStore.formatDate(date.date,'YYYY-MM-DD',1,'days')}`, '_blank');
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/gsph`,
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
    refreshForm(line) {
      this.fetchDataLineByID(line);
    },
    searchPart(item) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
    },
    fetchDataPart() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/part`)
        .then((response) => {
          if (response.status === 200) {
            this.partItems = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    filteredItems() {
      return this.report.datatables.items.filter((d) => {
        return Object.keys(this.report.datatables.filters).every((f) => {
          return (
            this.report.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.report.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    filteredItemsSummary() {
      return this.reportSummary.datatables.items.filter((d) => {
        return Object.keys(this.reportSummary.datatables.filters).every((f) => {
          return (
            this.reportSummary.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.reportSummary.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    filteredItemsMachine() {
      return this.reportMachine.datatables.items.filter((d) => {
        return Object.keys(this.reportMachine.datatables.filters).every((f) => {
          return (
            this.reportMachine.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.reportMachine.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    filteredItemsSap() {
      return this.reportSAP.datatables.items.filter((d) => {
        return Object.keys(this.reportSAP.datatables.filters).every((f) => {
          return (
            this.reportSAP.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.reportSAP.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    fetchDataLine() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/gsph`)
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.lines = response.data.data.map((data) => {
                const time = this.params.shift == "1" ? "07:15" : "20:00";
                let current_machine = moment(
                  `${this.params.date} ${time}`,
                  "YYYY-MM-DD HH:mm"
                );
                let current = moment(
                  `${this.params.date} ${time}`,
                  "YYYY-MM-DD HH:mm"
                );
                this.patan = data.patan;
                data.detail = data.detail.map((item) => {
                  const startMachine = current_machine.format(
                    "YYYY-MM-DD HH:mm"
                  );
                  current_machine = moment(current_machine, "hh:mm:ss A").add(
                    item.tpt_machine ? item.tpt_machine : 0,
                    "minutes"
                  );
                  const endMachine = current_machine.format("YYYY-MM-DD HH:mm");
                  const breakTimeMachine = utilityStore.mappingBreak(
                    this.params,
                    startMachine,
                    endMachine
                  );
                  current_machine = moment(current_machine, "hh:mm:ss A").add(
                    breakTimeMachine,
                    "minutes"
                  );
                  item.finish_machine = item.tpt_machine
                    ? current_machine.format("HH : mm")
                    : "-";
                  const start = current.format("YYYY-MM-DD HH:mm");
                  current = moment(current, "hh:mm:ss A").add(
                    item.tpt ? item.tpt : 0,
                    "minutes"
                  );
                  const end = current.format("YYYY-MM-DD HH:mm");
                  const breakTime = utilityStore.mappingBreak(
                    this.params,
                    start,
                    end
                  );
                  current = moment(current, "hh:mm:ss A").add(
                    breakTime,
                    "minutes"
                  );
                  item.finish_plan = item.job_number
                    ? current.format("HH : mm")
                    : "-";
                  return item;
                });

                data.expand = false;
                return data;
              });
            } else {
              utilityStore.onApiResponse(response);
            }

            // configStore.page.name = `Achievement Stamping (${utilityStore.formatDate(
            //   this.params.date
            // )} / Shift ${this.params.shift} / Patan ${this.patan})`;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
      setTimeout(() => {
        this.dialog.filter = false;
      }, 500);
    },
    fetchDataReport() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", this.report.filter.dates[0]);
      data.append(
        "end",
        this.report.filter.dates[1] ?? this.report.filter.dates[0]
      );
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.report.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
      setTimeout(() => {
        this.dialog.filter = false;
      }, 500);
    },
    fetchDataReportSummary() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", this.reportSummary.filter.dates[0]);
      data.append(
        "end",
        this.reportSummary.filter.dates[1] ?? this.reportSummary.filter.dates[0]
      );
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/summary`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.reportSummary.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
      setTimeout(() => {
        this.dialog.filter = false;
      }, 500);
    },
    fetchDataReportMachine() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", this.reportMachine.filter.dates[0]);
      data.append(
        "end",
        this.reportMachine.filter.dates[1] ?? this.reportMachine.filter.dates[0]
      );
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report-machine`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.reportMachine.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
      setTimeout(() => {
        this.dialog.filter = false;
      }, 500);
    },
    fetchDataReportSAP() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", this.reportSAP.filter.dates[0]);
      data.append(
        "end",
        this.reportSAP.filter.dates[1] ?? this.reportSAP.filter.dates[0]
      );
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report_sap`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.reportSAP.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
      setTimeout(() => {
        this.dialog.filter = false;
      }, 500);
    },
    fetchDataLineByID(id) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display?line=${id}`
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.loadDataDetailEdit(response.data.data);
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchDataSAP() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/sync_sap`
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    fetchDataLineByIDDireksi(id, status) {
      notificationStore.loading = status;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display?line=${id}`
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.loadDataDetailEdit(response.data.data);
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchDataLineRefresh(id) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_refresh?line=${id}`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.loadDataDetailEdit(response.data.data);
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    onSaveDetail(vm,period) {
      notificationStore.loading = true;
      const data = new FormData();
      for (let index in this.formDetail) {
        for (let idx = 0; idx < this.formDetail[index].length; idx++) {
          data.append(
            `${index}[]`,
            this.formDetail[index][idx] ? this.formDetail[index][idx] : ""
          );
        }
      }
      data.append("line_id", this.line_id);
      data.append("period", period);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/gsph/glc`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response, this.resetForm);
          // vm.$socket.emit("updateAcievement", this.line_id);
        })
        .catch(utilityStore.onError);
    },
    loadDataDetailEdit(line) {
      this.line = line;
      let item = line.detail;
      this.dialog.detail = true;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetail = {
        tandem: [],
        job_number: [],
        urut: [],
        part_number: [],
        model: [],
        patan: [],
        status: [],
        op: [],
        main_process: [],
        press_line: [],
        add_process: [],
        press_line2: [],
        forecast: [],
        lot_size: [],
        interval_prod: [],
        ct: [],
        press_time: [],
        dct: [],
        downtime: [],
        pt: [],
        tpt: [],
        gsph: [],
        stroke: [],
        qty_kbn: [],
        total_palet: [],
        palet: [],
        material: [],
      };
      let loop = 0;
      while (loop < (item.length > 13 ? item.length : 13)) {
        const arrVar = ["machine", "process"];
        if (item[loop]) {
          Object.entries(this.formDetail).map((k) => {
            if (
              k[0] == "is_tandem" ||
              k[0] == "is_trial" ||
              k[0] == "is_terusan"
            ) {
              this.formDetail[k[0]][loop] =
                item[loop][k[0]] == "1" ? true : false;
            } else {
              if (arrVar.includes(k[0])) {
                this.formDetail[k[0]][loop] = item[loop][k[0]]
                  ? item[loop][k[0]].split(" ")
                  : [];
              } else {
                this.formDetail[k[0]][loop] = item[loop][k[0]];
              }
            }
          });
        } else {
          Object.entries(this.formDetail).map((k) => {
            if (
              k[0] == "is_tandem" ||
              k[0] == "is_trial" ||
              k[0] == "is_terusan"
            ) {
              this.formDetail[k[0]][loop] = false;
            } else {
              if (arrVar.includes(k[0])) {
                this.formDetail[k[0]][loop] = [];
              } else {
                this.formDetail[k[0]][loop] = "";
              }
            }
          });
        }
        loop++;
      }
    },
    loadDataLed(line) {
      this.dialog.formLed = true;
      this.loadDataDetailEdit(line);
      this.dialog.detail = false;
    },
    loadQualityRepair(line) {
      this.dialog.formKetRepair = true;
      this.loadDataDetailEdit(line);
      this.dialog.detail = false;
    },
    loadKeteranganRepair() {
      this.dialog.formKetRepair = true;
      // this.loadDataDetailEdit(line);
      // this.dialog.detail = false;
    },
    loadKeteranganDT() {
      this.dialog.formKetDT = true;
      // this.loadDataDetailEdit(line);
      // this.dialog.detail = false;
    },
    loadDataChart(line) {
      this.dialog.chart = true;
      this.line_id = line;
    },
    loadStart(line, rh, lh, lot_rh, lot_lh, urut) {
      this.dialog.formStartLed = true;
      this.part_number_rh = rh;
      this.part_number_lh = lh;
      this.lot_size_rh = lot_rh;
      this.lot_size_lh = lot_lh;
      this.urut = urut;
      this.loadDataDetailEdit(line);
      this.dialog.detail = false;
    },
    onSaveStart() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("line_id", this.line_id);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("patan", this.patan);
      data.append("part_number_rh", this.part_number_rh);
      data.append("part_number_lh", this.part_number_lh);
      data.append("lot_size_rh", this.lot_size_rh);
      data.append("urut", this.urut);
      data.append("machine", this.formData.machine);
      data.append("process", this.formData.process);
      console.log(data);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/kanban_start`,
        data,
      };
      axios(configHttp).then((response) => {
        notificationStore.onApiResponseToastAlert(response, this.resetForm);
        // vm.$socket.emit("updateAcievement", this.line_id);
      });
    },
    deleteData() {
      this.dialog.confirmDelete = true;
    },
    onMove(to, data) {
      const fd = new URLSearchParams();
      const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);
      fd.append("urut", data);
      fd.append("move", to);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/move`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.fetchDataLineRefresh(id)
          )
        )
        .catch(configStore.onError);
    },
    addRow() {
      const arrVar = ["machine", "process"];
      // notificationStore.loading = true;
      Object.entries(this.formDetail).map((k) => {
        if (k[0] == "is_tandem" || k[0] == "is_trial") {
          this.formDetail[k[0]].push(false);
        } else {
          if (arrVar.includes(k[0])) {
            this.formDetail[k[0]].push([]);
          } else {
            this.formDetail[k[0]].push("");
          }
        }
      });
      notificationStore.disableLoading();
    },
    onDelete(data) {
      const fd = new URLSearchParams();
      const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);
      fd.append("urut", data);

      const configHttp = {
        method: "delete",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/data`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.fetchDataLineByID(id)
          )
        )
        .catch(configStore.onError);
    },
    onPrint(data) {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);
      fd.append("urut", data);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response
            // this.fetchDataLineByID(id)
          )
        )
        .catch(configStore.onError);
    },
    openForm() {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/open`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp);
    },
    closeForm() {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/close`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp);
      // this.resetForm();
    },
    checkForm(userNow) {
      const id = this.line_id;
      const date = this.params.date;
      const shift = this.params.shift;
      const user = userNow;
      // notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/check?line_id=${id}&date=${date}&shift=${shift}`
        )
        .then((response) => {
          this.statusForm = response.data;
          if (this.statusForm.user !== user && response.data.status == false) {
            utilityStore.onApiResponse(response);
            notificationStore.disableLoading();
          }
        })
        .catch(utilityStore.onError);
    },
    closeRefreshForm(userNow) {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);
      fd.append("user_open", userNow);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/close_refresh`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp);
      this.resetForm();
    },
    updateQty() {
      axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/update_qty`,
        {
          params: this.filterDate,
        }
      );
    },
    updateQtyLh() {
      axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/update_qty_lh`,
        {
          params: this.filterDate,
        }
      );
    },
    linkAndonwithSAP(id) {
      window.open(
        `http://${configStore.apiUrl}/mims/andon-production-line-sap/${id}`,
        "_blank"
      );
    },

    startItem(vm, part_rh, urut_plan) {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("part_rh", part_rh);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/start_running`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievement", this.line_id);
          this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },

    stopItem(vm, part_rh, urut_plan) {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("part_rh", part_rh);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/stop_running`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievement", this.line_id);
          this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },
  },
});
