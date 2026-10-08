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
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetailA = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetailB = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetailC = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetailD = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetailE = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetailF = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetailG = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetailH = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetailSP = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
let formDetail300T = {
  is_tandem: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  urut: [],
  urut_plan: [],
  part_rh: [],
  part_lh: [],
  act_rh: [],
  act_lh: [],
  lot_rh: [],
  lot_lh: [],
  value_combination: [],
  act_process: [],
  stroke_plan: [],
  tpt: [],
  tpt_plan: [],
  tpt_act: [],
  finish_plan: [],
  stroke_act: [],
  tpt_actual: [],
  finish_actual: [],
};
export const useStampingAchievementStore = defineStore({
  id: "production-stamping-achievement",
  state() {
    return {
      tag: "LKH-STP",
      context: null,
      formDetail,
      formDetailA,
      formDetailB,
      formDetailC,
      formDetailD,
      formDetailE,
      formDetailF,
      formDetailG,
      formDetailH,
      formDetailSP,
      formDetail300T,
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Production.Create.AchievementStamping"),
        update: authStore.checkAccess("Production.Update.AchievementStamping"),
        download: authStore.checkAccess("Report.Download.AchievementStamping"),
        pcd: authStore.checkAccess("Production.PCD.AchievementStamping"),
      },
      lines: [],
      line: {
        patan: "",
        shift: "",
        date: "",
        line_id: "",
        gsph_plan: 0,
        downtime_plan: 0,
        idletime_plan: 0,
        cycle_time_plan: 0,
        good_plan: 0,
        repair_plan: 0,
        reject_plan: 0,
        length: 0,
        connection: false,
        detail: formDetail,
      },
      params: utilityStore.getCurrentShift(),
      shiftNow: utilityStore.getShiftNow(),
      view: false,
      filterDate: {
        date: date.date,
        shift: date.shift,
      },
      form: {
        period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 7),
      },
    };
  },
  actions: {
    resetForm() {
      this.fetchDataLine();
    },
    fetchDataLineAkurasi() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_akurasi`
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              if(response.data.data[0].line_id =='300T') {
                this.loadDataDetailEdit(response.data.data[0]);
              }
              if(response.data.data[0].line_id =='A') {
                this.loadDataDetailAkurasi(response.data.data[0]);
              } else if (response.data.data[1].line_id =='A'){
                this.loadDataDetailAkurasi(response.data.data[1]);
              }
              if(response.data.data[1].line_id =='B'){
                this.loadDataDetailAkurasiB(response.data.data[1]);
              } else if(response.data.data[2].line_id =='B'){
                this.loadDataDetailAkurasiB(response.data.data[2]);
              }
              if(response.data.data[2].line_id =='C'){
                this.loadDataDetailAkurasiC(response.data.data[2]);
              } else if(response.data.data[3].line_id =='C'){
                this.loadDataDetailAkurasiC(response.data.data[3]);
              }
              if(response.data.data[3].line_id =='D'){
                this.loadDataDetailAkurasiD(response.data.data[3]);
              } else if(response.data.data[4].line_id =='D'){
                this.loadDataDetailAkurasiD(response.data.data[4]);
              }
              if(response.data.data[4].line_id =='E'){
                this.loadDataDetailAkurasiE(response.data.data[4]);
              } else if(response.data.data[5] ? response.data.data[5].line_id =='E' : ''){
                this.loadDataDetailAkurasiE(response.data.data[5]);
              }
              if(response.data.data[5] ? response.data.data[5].line_id =='F' : ''){
                this.loadDataDetailAkurasiF(response.data.data[5]);
              } else if(response.data.data[6] ? response.data.data[6].line_id =='F' : ''){
                this.loadDataDetailAkurasiF(response.data.data[6]);
              }
              if(response.data.data[6] ? response.data.data[6].line_id =='G' : ''){
                this.loadDataDetailAkurasiG(response.data.data[6]);
              } else if(response.data.data[7] ? response.data.data[7].line_id =='G' : ''){
                this.loadDataDetailAkurasiG(response.data.data[7]);
              }
              
              if(response.data.data[7] ? response.data.data[7].line_id =='H' : ''){
                this.loadDataDetailAkurasiH(response.data.data[7]);
              } else if(response.data.data[8] ? response.data.data[8].line_id =='H' : ''){
                this.loadDataDetailAkurasiH(response.data.data[8]);
              }
              
              if(response.data.data[8] ? response.data.data[8].line_id =='SP' : ''){
                this.loadDataDetailAkurasiSP(response.data.data[8]);
              } else if(response.data.data[9] ? response.data.data[9].line_id =='SP' : ''){
                this.loadDataDetailAkurasiSP(response.data.data[9]);
              }
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    countDataActual() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      let current_now = moment(`${this.params.date}`, "YYYY-MM-DD HH:mm");

      this.formDetail.tpt_actual.map((item, index) => {
        if (this.formDetail.act_rh[index]) {
          if (!this.formDetail.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetail.tpt_act[index]
                ? this.formDetail.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
            current_now = moment(current_now, "hh:mm:ss A").add(
              this.formDetail.tpt_act[index]
                ? this.formDetail.tpt_act[index]
                : 0,
              "minutes"
            );
          }

          this.formDetail.finish_actual[index] =
            this.formDetail.tpt_actual[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetail.stroke_plan[index] =
          this.formDetail.lot_rh[index] *
          this.formDetail.value_combination[index];

        this.formDetail.stroke_act[index] = this.formDetail.act_rh[index]
          ? this.formDetail.act_rh[index] * this.formDetail.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetail.tpt_plan[index] ? this.formDetail.tpt_plan[index] : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetail.finish_plan[index] = this.formDetail.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
    loadDataDetailEdit(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetail = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      while (loop < (item.length > 12 ? item.length : 13)) {
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
      this.countDataActual();
    },
    loadDataDetailAkurasi(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetailA = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      if (line.length !== 0) {
        while (loop < (item.length > 12 ? item.length : 13)) {
          const arrVar = ["machine", "process"];
          if (item[loop]) {
            Object.entries(this.formDetailA).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailA[k[0]][loop] =
                  item[loop][k[0]] == "1" ? true : false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailA[k[0]][loop] = item[loop][k[0]]
                    ? item[loop][k[0]].split(" ")
                    : [];
                } else {
                  this.formDetailA[k[0]][loop] = item[loop][k[0]];
                }
              }
            });
          } else {
            Object.entries(this.formDetailA).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailA[k[0]][loop] = false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailA[k[0]][loop] = [];
                } else {
                  this.formDetailA[k[0]][loop] = "";
                }
              }
            });
          }
          loop++;
        }
      }
      this.countDataActualA();
    },
    countDataActualA() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      this.formDetailA.urut.map((item, index) => {
        if (this.formDetailA.act_rh[index]) {
          if (!this.formDetailA.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetailA.tpt_act[index] !== "0"
                ? this.formDetailA.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetailA.finish_actual[index] =
            this.formDetailA.tpt_act[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetailA.stroke_plan[index] =
          this.formDetailA.lot_rh[index] *
          this.formDetailA.value_combination[index];

        this.formDetailA.stroke_act[index] = this.formDetailA.act_rh[index]
          ? this.formDetailA.act_rh[index] * this.formDetailA.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetailA.tpt_plan[index] !== 0
            ? this.formDetailA.tpt_plan[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetailA.finish_plan[index] = this.formDetailA.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
    loadDataDetailAkurasiB(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetailB = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      if (line.length !== 0) {
        while (loop < (item.length > 12 ? item.length : 13)) {
          const arrVar = ["machine", "process"];
          if (item[loop]) {
            Object.entries(this.formDetailB).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailB[k[0]][loop] =
                  item[loop][k[0]] == "1" ? true : false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailB[k[0]][loop] = item[loop][k[0]]
                    ? item[loop][k[0]].split(" ")
                    : [];
                } else {
                  this.formDetailB[k[0]][loop] = item[loop][k[0]];
                }
              }
            });
          } else {
            Object.entries(this.formDetailB).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailB[k[0]][loop] = false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailB[k[0]][loop] = [];
                } else {
                  this.formDetailB[k[0]][loop] = "";
                }
              }
            });
          }
          loop++;
        }
      }
      this.countDataActualB();
    },
    countDataActualB() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      this.formDetailB.urut.map((item, index) => {
        if (this.formDetailB.act_rh[index]) {
          if (!this.formDetailB.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetailB.tpt_act[index] !== "0"
                ? this.formDetailB.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetailB.finish_actual[index] =
            this.formDetailB.tpt_act[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetailB.stroke_plan[index] =
          this.formDetailB.lot_rh[index] *
          this.formDetailB.value_combination[index];

        this.formDetailB.stroke_act[index] = this.formDetailB.act_rh[index]
          ? this.formDetailB.act_rh[index] * this.formDetailB.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetailB.tpt_plan[index] !== 0
            ? this.formDetailB.tpt_plan[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetailB.finish_plan[index] = this.formDetailB.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
    loadDataDetailAkurasiC(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetailC = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      if (line.length !== 0) {
        while (loop < (item.length > 12 ? item.length : 13)) {
          const arrVar = ["machine", "process"];
          if (item[loop]) {
            Object.entries(this.formDetailC).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailC[k[0]][loop] =
                  item[loop][k[0]] == "1" ? true : false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailC[k[0]][loop] = item[loop][k[0]]
                    ? item[loop][k[0]].split(" ")
                    : [];
                } else {
                  this.formDetailC[k[0]][loop] = item[loop][k[0]];
                }
              }
            });
          } else {
            Object.entries(this.formDetailC).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailC[k[0]][loop] = false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailC[k[0]][loop] = [];
                } else {
                  this.formDetailC[k[0]][loop] = "";
                }
              }
            });
          }
          loop++;
        }
      }
      this.countDataActualC();
    },
    countDataActualC() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      this.formDetailC.urut.map((item, index) => {
        if (this.formDetailC.act_rh[index]) {
          if (!this.formDetailC.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetailC.tpt_act[index] !== "0"
                ? this.formDetailC.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetailC.finish_actual[index] =
            this.formDetailC.tpt_act[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetailC.stroke_plan[index] =
          this.formDetailC.lot_rh[index] *
          this.formDetailC.value_combination[index];

        this.formDetailC.stroke_act[index] = this.formDetailC.act_rh[index]
          ? this.formDetailC.act_rh[index] * this.formDetailC.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetailC.tpt_plan[index] !== 0
            ? this.formDetailC.tpt_plan[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetailC.finish_plan[index] = this.formDetailC.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
    loadDataDetailAkurasiD(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetailD = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      if (line.length !== 0) {
        while (loop < (item.length > 12 ? item.length : 13)) {
          const arrVar = ["machine", "process"];
          if (item[loop]) {
            Object.entries(this.formDetailD).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailD[k[0]][loop] =
                  item[loop][k[0]] == "1" ? true : false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailD[k[0]][loop] = item[loop][k[0]]
                    ? item[loop][k[0]].split(" ")
                    : [];
                } else {
                  this.formDetailD[k[0]][loop] = item[loop][k[0]];
                }
              }
            });
          } else {
            Object.entries(this.formDetailD).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailD[k[0]][loop] = false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailD[k[0]][loop] = [];
                } else {
                  this.formDetailD[k[0]][loop] = "";
                }
              }
            });
          }
          loop++;
        }
      }
      this.countDataActualD();
    },
    countDataActualD() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      this.formDetailD.urut.map((item, index) => {
        if (this.formDetailD.act_rh[index]) {
          if (!this.formDetailD.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetailD.tpt_act[index] !== "0"
                ? this.formDetailD.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetailD.finish_actual[index] =
            this.formDetailD.tpt_act[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetailD.stroke_plan[index] =
          this.formDetailD.lot_rh[index] *
          this.formDetailD.value_combination[index];

        this.formDetailD.stroke_act[index] = this.formDetailD.act_rh[index]
          ? this.formDetailD.act_rh[index] * this.formDetailD.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetailD.tpt_plan[index] !== 0
            ? this.formDetailD.tpt_plan[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetailD.finish_plan[index] = this.formDetailD.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
    loadDataDetailAkurasiE(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetailE = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      if (line.length !== 0) {
        while (loop < (item.length > 12 ? item.length : 13)) {
          const arrVar = ["machine", "process"];
          if (item[loop]) {
            Object.entries(this.formDetailE).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailE[k[0]][loop] =
                  item[loop][k[0]] == "1" ? true : false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailE[k[0]][loop] = item[loop][k[0]]
                    ? item[loop][k[0]].split(" ")
                    : [];
                } else {
                  this.formDetailE[k[0]][loop] = item[loop][k[0]];
                }
              }
            });
          } else {
            Object.entries(this.formDetailE).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailE[k[0]][loop] = false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailE[k[0]][loop] = [];
                } else {
                  this.formDetailE[k[0]][loop] = "";
                }
              }
            });
          }
          loop++;
        }
      }
      this.countDataActualE();
    },
    countDataActualE() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      this.formDetailE.urut.map((item, index) => {
        if (this.formDetailE.act_rh[index]) {
          if (!this.formDetailE.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetailE.tpt_act[index] !== "0"
                ? this.formDetailE.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetailE.finish_actual[index] =
            this.formDetailE.tpt_act[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetailE.stroke_plan[index] =
          this.formDetailE.lot_rh[index] *
          this.formDetailE.value_combination[index];

        this.formDetailE.stroke_act[index] = this.formDetailE.act_rh[index]
          ? this.formDetailE.act_rh[index] * this.formDetailE.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetailE.tpt_plan[index] !== 0
            ? this.formDetailE.tpt_plan[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetailE.finish_plan[index] = this.formDetailE.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
    loadDataDetailAkurasiF(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetailF = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      if (line.length !== 0) {
        while (loop < (item.length > 12 ? item.length : 13)) {
          const arrVar = ["machine", "process"];
          if (item[loop]) {
            Object.entries(this.formDetailF).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailF[k[0]][loop] =
                  item[loop][k[0]] == "1" ? true : false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailF[k[0]][loop] = item[loop][k[0]]
                    ? item[loop][k[0]].split(" ")
                    : [];
                } else {
                  this.formDetailF[k[0]][loop] = item[loop][k[0]];
                }
              }
            });
          } else {
            Object.entries(this.formDetailF).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailF[k[0]][loop] = false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailF[k[0]][loop] = [];
                } else {
                  this.formDetailF[k[0]][loop] = "";
                }
              }
            });
          }
          loop++;
        }
      }
      this.countDataActualF();
    },
    countDataActualF() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      this.formDetailF.urut.map((item, index) => {
        if (this.formDetailF.act_rh[index]) {
          if (!this.formDetailF.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetailF.tpt_act[index] !== "0"
                ? this.formDetailF.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetailF.finish_actual[index] =
            this.formDetailF.tpt_act[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetailF.stroke_plan[index] =
          this.formDetailF.lot_rh[index] *
          this.formDetailF.value_combination[index];

        this.formDetailF.stroke_act[index] = this.formDetailF.act_rh[index]
          ? this.formDetailF.act_rh[index] * this.formDetailF.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetailF.tpt_plan[index] !== 0
            ? this.formDetailF.tpt_plan[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetailF.finish_plan[index] = this.formDetailF.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
    loadDataDetailAkurasiG(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetailG = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      if (line.length !== 0) {
        while (loop < (item.length > 12 ? item.length : 13)) {
          const arrVar = ["machine", "process"];
          if (item[loop]) {
            Object.entries(this.formDetailG).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailG[k[0]][loop] =
                  item[loop][k[0]] == "1" ? true : false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailG[k[0]][loop] = item[loop][k[0]]
                    ? item[loop][k[0]].split(" ")
                    : [];
                } else {
                  this.formDetailG[k[0]][loop] = item[loop][k[0]];
                }
              }
            });
          } else {
            Object.entries(this.formDetailG).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailG[k[0]][loop] = false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailG[k[0]][loop] = [];
                } else {
                  this.formDetailG[k[0]][loop] = "";
                }
              }
            });
          }
          loop++;
        }
      }
      this.countDataActualG();
    },
    countDataActualG() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      this.formDetailG.urut.map((item, index) => {
        if (this.formDetailG.act_rh[index]) {
          if (!this.formDetailG.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetailG.tpt_act[index] !== "0"
                ? this.formDetailG.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetailG.finish_actual[index] =
            this.formDetailG.tpt_act[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetailG.stroke_plan[index] =
          this.formDetailG.lot_rh[index] *
          this.formDetailG.value_combination[index];

        this.formDetailG.stroke_act[index] = this.formDetailG.act_rh[index]
          ? this.formDetailG.act_rh[index] * this.formDetailG.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetailG.tpt_plan[index] !== 0
            ? this.formDetailG.tpt_plan[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetailG.finish_plan[index] = this.formDetailG.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
    loadDataDetailAkurasiH(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetailH = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      if (line.length !== 0) {
        while (loop < (item.length > 12 ? item.length : 13)) {
          const arrVar = ["machine", "process"];
          if (item[loop]) {
            Object.entries(this.formDetailH).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailH[k[0]][loop] =
                  item[loop][k[0]] == "1" ? true : false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailH[k[0]][loop] = item[loop][k[0]]
                    ? item[loop][k[0]].split(" ")
                    : [];
                } else {
                  this.formDetailH[k[0]][loop] = item[loop][k[0]];
                }
              }
            });
          } else {
            Object.entries(this.formDetailH).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailH[k[0]][loop] = false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailH[k[0]][loop] = [];
                } else {
                  this.formDetailH[k[0]][loop] = "";
                }
              }
            });
          }
          loop++;
        }
      }
      this.countDataActualH();
    },
    countDataActualH() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      this.formDetailH.urut.map((item, index) => {
        if (this.formDetailH.act_rh[index]) {
          if (!this.formDetailH.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetailH.tpt_act[index] !== "0"
                ? this.formDetailH.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetailH.finish_actual[index] =
            this.formDetailH.tpt_act[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetailH.stroke_plan[index] =
          this.formDetailH.lot_rh[index] *
          this.formDetailH.value_combination[index];

        this.formDetailH.stroke_act[index] = this.formDetailH.act_rh[index]
          ? this.formDetailH.act_rh[index] * this.formDetailH.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetailH.tpt_plan[index] !== 0
            ? this.formDetailH.tpt_plan[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetailH.finish_plan[index] = this.formDetailH.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
    loadDataDetailAkurasiSP(line) {
      if (!line) {
        line = [];
      }
      this.line = line;
      let item = line.detail;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetailSP = {
        is_tandem: [],
        job_rh: [],
        job_lh: [],
        plan: [],
        urut: [],
        urut_plan: [],
        part_rh: [],
        part_lh: [],
        act_rh: [],
        act_lh: [],
        lot_rh: [],
        lot_lh: [],
        value_combination: [],
        act_process: [],
        stroke_plan: [],
        tpt: [],
        tpt_plan: [],
        tpt_act: [],
        finish_plan: [],
        stroke_act: [],
        tpt_actual: [],
        finish_actual: [],
      };
      let loop = 0;
      if (line.length !== 0) {
        while (loop < (item.length > 12 ? item.length : 13)) {
          const arrVar = ["machine", "process"];
          if (item[loop]) {
            Object.entries(this.formDetailSP).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailSP[k[0]][loop] =
                  item[loop][k[0]] == "1" ? true : false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailSP[k[0]][loop] = item[loop][k[0]]
                    ? item[loop][k[0]].split(" ")
                    : [];
                } else {
                  this.formDetailSP[k[0]][loop] = item[loop][k[0]];
                }
              }
            });
          } else {
            Object.entries(this.formDetailSP).map((k) => {
              if (
                k[0] == "is_tandem" ||
                k[0] == "is_trial" ||
                k[0] == "is_terusan"
              ) {
                this.formDetailSP[k[0]][loop] = false;
              } else {
                if (arrVar.includes(k[0])) {
                  this.formDetailSP[k[0]][loop] = [];
                } else {
                  this.formDetailSP[k[0]][loop] = "";
                }
              }
            });
          }
          loop++;
        }
      }
      this.countDataActualSP();
    },
    countDataActualSP() {
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");

      this.formDetailSP.urut.map((item, index) => {
        if (this.formDetailSP.act_rh[index]) {
          if (!this.formDetailSP.is_tandem[index]) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetailSP.tpt_act[index] !== "0"
                ? this.formDetailSP.tpt_act[index]
                : 0,
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetailSP.finish_actual[index] =
            this.formDetailSP.tpt_act[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetailSP.stroke_plan[index] =
          this.formDetailSP.lot_rh[index] *
          this.formDetailSP.value_combination[index];

        this.formDetailSP.stroke_act[index] = this.formDetailSP.act_rh[index]
          ? this.formDetailSP.act_rh[index] *
            this.formDetailSP.act_process[index]
          : 0;

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetailSP.tpt_plan[index] !== 0
            ? this.formDetailSP.tpt_plan[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetailSP.finish_plan[index] = this.formDetailSP.part_rh[index]
          ? current.format("HH : mm")
          : "";
      });
    },
  },
});
