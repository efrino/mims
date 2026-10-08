import { defineStore } from "pinia";
import { useNotificationStore } from "./notification";
import { useAuthStore } from "@/pinia/auth.js";
import { useConfigStore } from "@/pinia/config";
import moment from "moment";

// const notificationStore = useNotificationStore();
// const authStore = useAuthStore();
// const configStore = useConfigStore();

export const useUtilityStore = defineStore({
  id: "utility-pinia",
  state: () => ({}),
  actions: {
    showLocalWarning(title, message) {
      const notificationStore = useNotificationStore();
      notificationStore.showDialogWarning(title, message);
    },
    getCurrentShift() {
      const shift_1 = 71500;
      const shift_2 = 200000;
      const time = parseInt(moment().format("HHmmss"));
      let result = {
        date: moment().format("YYYY-MM-DD"),
        period: moment().format("YYYY-MM"),
        period2: moment().format("YYYYMM"),
        clock: moment().format("YYYY-MM-DD HH:mm"),
        hour: moment().format("HH:mm"),
        shift: 1,
        day: moment().format("DD"),
      };
      if (!(time >= shift_1 && time < shift_2)) {
        result.shift = 2;
        if (!(time >= shift_2)) {
          result.date = moment().subtract(1, "days").format("YYYY-MM-DD");
          result.period = moment().subtract(1, "days").format("YYYY-MM");
          result.period2 = moment().subtract(1, "days").format("YYYYMM");
          result.clock = moment().subtract(1, "days").format("YYYY-MM-DD H:mm");
        }
      }
      return result;
    },
    getShiftNow() {
      const shift_1 = 71500;
      const shift_2 = 200000;
      const time = parseInt(moment().format("HHmmss"));
      let result = {
        period: moment().format("YYYY-MM"),
        date: moment().format("YYYY-MM-DD"),
        shift: 1,
      };
      if (!(time >= shift_1 && time < shift_2)) {
        result.shift = 2;
        if (!(time >= shift_2)) {
          result.date = moment().subtract(1, "days").format("YYYY-MM-DD");
        }
      }
      return result;
    },
    formatDate(
      value,
      format = "DD-MM-YYYY",
      adjust_time = 0,
      time_type = "days"
    ) {
      if (value) {
        return moment(String(value))
          .locale("id")
          .add(adjust_time, time_type)
          .format(format);
      }
    },
    dateMonthFull(value) {
      const tanggal = value.split("-");
      let bulan = "";
      switch (tanggal[1]) {
        case "01":
          bulan = "January";
          break;
        case "02":
          bulan = "February";
          break;
        case "03":
          bulan = "March";
          break;
        case "04":
          bulan = "April";
          break;
        case "05":
          bulan = "May";
          break;
        case "06":
          bulan = "June";
          break;
        case "07":
          bulan = "July";
          break;
        case "08":
          bulan = "August";
          break;
        case "09":
          bulan = "September";
          break;
        case "10":
          bulan = "October";
          break;
        case "11":
          bulan = "November";
          break;
        case "12":
          bulan = "December";
      }
      return `${tanggal[2]} ${bulan} ${tanggal[0]}`;
    },
    formatPeriod(value) {
      switch (value.substr(5, 6)) {
        case "01":
          return "January" + " " + value.substr(0, 4);
        case "02":
          return "February" + " " + value.substr(0, 4);
        case "03":
          return "March" + " " + value.substr(0, 4);
        case "04":
          return "April" + " " + value.substr(0, 4);
        case "05":
          return "May" + " " + value.substr(0, 4);
        case "06":
          return "June" + " " + value.substr(0, 4);
        case "07":
          return "July" + " " + value.substr(0, 4);
        case "08":
          return "August" + " " + value.substr(0, 4);
        case "09":
          return "September" + " " + value.substr(0, 4);
        case "10":
          return "October" + " " + value.substr(0, 4);
        case "11":
          return "November" + " " + value.substr(0, 4);
        case "12":
          return "December" + " " + value.substr(0, 4);
      }
    },
    formatDateTime(value) {
      const dateParts = value.split(" ");
      const time = dateParts[1];
      const date = dateParts[0];
      const parts = date.split("-");
      const year = parts[0];
      const month = this.getMonthName(parts[1]);
      const day = parts[2];
      return time + " " + day + " " + month + " " + year;
    },
    getMonthName(month) {
      switch (month) {
        case "01":
          return "January";
        case "02":
          return "February";
        case "03":
          return "March";
        case "04":
          return "April";
        case "05":
          return "May";
        case "06":
          return "June";
        case "07":
          return "July";
        case "08":
          return "August";
        case "09":
          return "September";
        case "10":
          return "October";
        case "11":
          return "November";
        case "12":
          return "December";
        default:
          return "";
      }
    },
    formatNumber(value = 0) {
      return isNaN(value)
        ? 0
        : value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatNumberThousand(value = 0) {
      const num = parseFloat(value);

      if (!isNaN(num)) {
        if (num >= 1000) {
          return Math.floor(num / 1000)
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        } else if (num > 0 && num < 1000) {
          return (num / 1000).toFixed(2).toString();
        }
      }
      // Jika num bukan angka atau kurang dari 0, kembalikan 0
      return "0";
    },
    formatNumberDecilmal(value = 0, decimal = 2) {
      return isNaN(parseFloat(value).toFixed(decimal))
        ? "-"
        : `${parseFloat(value).toFixed(decimal)}`;
    },
    formatNumberOneDecimal(value = 0, decimal = 1) {
      return isNaN(parseFloat(value).toFixed(decimal))
        ? "-"
        : `${parseFloat(value).toFixed(decimal)}`;
    },
    formatDecimaltoNumber(value = 0, decimal = 0) {
      return isNaN(parseFloat(value).toFixed(decimal))
        ? "-"
        : `${parseFloat(value).toFixed(decimal)}`;
    },
    formatDecimaltoNumberRoundDown(value = 0, decimal = 0) {
      const factor = Math.pow(10, decimal); // Create a factor to shift decimal places
      const roundedValue = Math.floor(parseFloat(value) * factor) / factor; // Round down and shift back

      return isNaN(roundedValue) ? "-" : `${roundedValue.toFixed(decimal)}`; // Format the result to the specified decimal places
    },
    formatPercent(value = 0, decimal = 2) {
      return `${parseFloat(value).toFixed(decimal)} %`;
    },
    formatPercentOneZero(value = 0, decimal = 1) {
      return `${parseFloat(value).toFixed(decimal)} %`;
    },
    formatPercentNoZero(value = 0, decimal = 0) {
      return `${parseFloat(value).toFixed(decimal)} %`;
    },
    ExcelDateToJSDate(serial, format = "DD-MM-YYYY") {
      var utc_days = Math.floor(serial - 25569);
      var utc_value = utc_days * 86400;
      var date_info = new Date(utc_value * 1000);
      return this.formatDate(
        `${date_info.getFullYear()}-${
          date_info.getMonth() + 1
        }-${date_info.getDate()}`,
        format
      );
    },
    excelTimeToJSTime(days) {
      const timeFormated = new Date(days * 864e5).toLocaleString("en-US", {
        timeStyle: "short",
        timeZone: "UTC",
      });

      return new moment.utc(timeFormated, "HH:mm").format("HH:mm");
    },

    convertToMinutes(milliseconds) {
      return (milliseconds / 60000).toFixed(2); // Konversi ke menit dan batasi dua angka di belakang koma
    },
    convertSTRtoTime(timeString) {
      if (timeString.length !== 6) {
        return "Invalid time format";
      }

      var hours = timeString.substring(0, 2);
      var minutes = timeString.substring(2, 4);
      var seconds = timeString.substring(4, 6);

      return hours + ":" + minutes + ":" + seconds;
    },
    // excelTimeToJSTime(excel_date, time = false) {
    //   let day_time = excel_date % 1
    //   let meridiem = "AMPM"
    //   let hour = Math.floor(day_time * 24)
    //   let minute = Math.floor(Math.abs(day_time * 24 * 60) % 60)
    //   let second = Math.floor(Math.abs(day_time * 24 * 60 * 60) % 60)
    //   hour >= 12 ? meridiem = meridiem.slice(2, 4) : meridiem = meridiem.slice(0, 2)
    //   hour > 12 ? hour = hour - 12 : hour = hour
    //   hour = hour < 10 ? "0" + hour : hour
    //   minute = minute < 10 ? "0" + minute : minute
    //   second = second < 10 ? "0" + second : second
    //   let daytime = "" + hour + ":" + minute + ":" + second + " " + meridiem
    //   return time ? daytime : (new Date(0, 0, excel_date, 0, -new Date(0).getTimezoneOffset(), 0)).toLocaleDateString(navigator.language, {}) + " " + daytime
    // },
    onError(error) {
      let msg,
        callback = () => {};
      if (error.response.data.status) {
        console.log(error);
        msg = error.response.data.status;
        switch (error.response.data.status) {
          case "Expired token":
            callback = () => {
              authStore.logout();
              configStore.router.push({
                name: "login",
              });
            };
            break;
          case "Access Denied!!":
            callback = () => {
              configStore.router.back();
            };
            break;
          default:
            break;
        }
      } else {
        msg = error.response.statusText;
      }
      notificationStore.showDialogWarning("Information", msg, callback);
      notificationStore.disableLoading();
    },
    onApiResponse(response, callback = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.messages;
        let msg = tmp.textContent || tmp.innerText || "";
        if (response.data.success) {
          notificationStore.showDialogSuccess("Success", msg, callback);
        } else {
          notificationStore.showDialogWarning("Information", msg);
        }
      } else {
        notificationStore.showDialogWarning(
          "Information",
          response.data.status
        );
      }
      notificationStore.disableLoading();
    },
    onApiResponseNew(response, callback) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.messages;
        let msg = tmp.textContent || tmp.innerText || "";
        if (response.data.success) {
          notificationStore.showDialogSuccess("Success", msg, callback);
        } else {
          notificationStore.showDialogWarning("Information", msg);
        }
      } else {
        notificationStore.showDialogWarning(
          "Information",
          response.data.status
        );
      }
      notificationStore.disableLoading();
    },
    onApiResponseCustom(response, callback = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.messages;
        let msg = tmp.textContent || tmp.innerText || "";
        if (response.data.success) {
          notificationStore.showDialogSuccess("Success", msg, callback);
        } else {
          notificationStore.showDialogWarning("Information", msg);
          // Autofocus
          document.getElementById("barcode").focus();
        }
      } else {
        notificationStore.showDialogWarning(
          "Information",
          response.data.status
        );
      }
      notificationStore.disableLoading();
    },
    focusNext(e) {
      const inputs = Array.from(e.target.form.querySelectorAll("input"));
      const index = inputs.indexOf(e.target);

      if (index < inputs.length) {
        inputs[index + 1].focus();
      }
    },
    dateIndonesian(value) {
      const tanggal = value.split("-");
      return `${tanggal[2]}-${tanggal[1]}-${tanggal[0]}`;
    },
    dateIndo(value) {
      // const tanggal = value.split("-");
      const jam = value.split(":");
      return `${jam[0]}:${jam[1]}`;
    },
    mappingBreak(date, start, end) {
      var istirahat = 0;
      const breakTime = [
        {
          start: "09:30",
          end: "09:40",
          duration: 10,
          addDays: 0,
        },
        {
          start: "11:40",
          end: "12:20",
          duration: 40,
          addDays: 0,
        },
        {
          start: "14:20",
          end: "14:30",
          duration: 10,
          addDays: 0,
        },
        {
          start: "16:15",
          end: "16:25",
          duration: 10,
          addDays: 0,
        },
        {
          start: "18:00",
          end: "18:30",
          duration: 30,
          addDays: 0,
        },
        // Break Ramadhan
        // {
        //   start: "17:55",
        //   end: "18:25",
        //   duration: 30,
        //   addDays: 0
        // },
        {
          start: "21:50",
          end: "22:00",
          duration: 10,
          addDays: 0,
        },
        // Break Ramadhan
        // {
        //   start: "22:20",
        //   end: "22:30",
        //   duration: 10,
        //   addDays: 0
        // },
        {
          start: "00:10",
          end: "00:50",
          duration: 40,
          addDays: 1,
        },
        // Break Ramadhan
        // {
        //   start: "01:00",
        //   end: "01:10",
        //   duration: 10,
        //   addDays: 1
        // },
        // {
        //   start: "03:20",
        //   end: "04:00",
        //   duration: 40,
        //   addDays: 1
        // },
        {
          start: "02:30",
          end: "02:40",
          duration: 10,
          addDays: 1,
        },
        {
          start: "05:00",
          end: "05:10",
          duration: 10,
          addDays: 1,
        },
      ];
      const breakTimeFriday = [
        {
          start: "09:30",
          end: "09:40",
          duration: 10,
          addDays: 0,
        },
        {
          start: "11:40",
          end: "12:40",
          duration: 60,
          addDays: 0,
        },
        {
          start: "14:50",
          end: "15:00",
          duration: 10,
          addDays: 0,
        },
        {
          start: "16:35",
          end: "16:45",
          duration: 10,
          addDays: 0,
        },
        {
          start: "18:00",
          end: "18:30",
          duration: 30,
          addDays: 0,
        },
        // Break Ramadhan
        // {
        //   start: "17:55",
        //   end: "18:25",
        //   duration: 30,
        //   addDays: 0
        // },
        {
          start: "21:50",
          end: "22:00",
          duration: 10,
          addDays: 0,
        },
        // {
        //   start: "22:20",
        //   end: "22:30",
        //   duration: 10,
        //   addDays: 0
        // },
        {
          start: "00:10",
          end: "00:50",
          duration: 40,
          addDays: 1,
        },
        // Break Ramadhan
        // {
        //   start: "01:00",
        //   end: "01:10",
        //   duration: 10,
        //   addDays: 1
        // },
        // {
        //   start: "03:20",
        //   end: "04:00",
        //   duration: 40,
        //   addDays: 1
        // },
        {
          start: "02:30",
          end: "02:40",
          duration: 10,
          addDays: 1,
        },
        {
          start: "05:00",
          end: "05:10",
          duration: 10,
          addDays: 1,
        },
      ];

      const dateWork = moment(`${date.date}`).day();
      let breakTimeSelect = [];
      if (dateWork == 5) {
        breakTimeSelect = breakTimeFriday;
      } else {
        breakTimeSelect = breakTime;
      }

      breakTimeSelect.forEach((time) => {
        const breakStart = moment(
          `${date.date} ${time.start}`,
          "YYYY-MM-DD HH:mm"
        ).add(time.addDays, "days");
        const breakEnd = breakStart.clone().add(time.duration, "minutes"); // FIXED: Tambah durasi dengan benar

        if (
          (moment(start).isSameOrBefore(breakEnd) &&
            moment(end).isSameOrAfter(breakStart)) || // Ada overlap
          moment(start).isBetween(breakStart, breakEnd, null, "[)") || // Start dalam break
          moment(end).isBetween(breakStart, breakEnd, null, "(]") // End dalam break
        ) {
          istirahat += time.duration;
        }
      });
      return istirahat;
    },
    isCurrentTimeBetween(startTime, endTime) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);

      const startTotal = startHour * 60 + startMinute;
      const endTotal = endHour * 60 + endMinute;

      // Handle overnight range (e.g., 22:00 to 06:00)
      if (startTotal > endTotal) {
        return currentTime >= startTotal || currentTime <= endTotal;
      }

      return currentTime >= startTotal && currentTime <= endTotal;
    },
    transposeArrayOfObject(arr) {
      return arr.reduce((acc, obj) => {
        Object.entries(obj).forEach(([key, value]) => {
          if (!acc[key]) acc[key] = [];
          acc[key].push(value);
        });
        return acc;
      }, {});
    }
  },
});
