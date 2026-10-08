import { defineStore } from 'pinia';
import moment from 'moment';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useConfigStore } from './config';

// JANGAN panggil useStore() di top-level module: utility store di-import hampir di
// semua halaman, dan pada urutan load tertentu (navigasi SPA pertama) Pinia belum aktif
// → store ter-bentuk tapi action tak ter-attach (mis. "utils.dateMonth is not a function")
// → render throw → halaman blank sampai user reload. Ambil store secara LAZY di tiap action.

export const useUtilityStore = defineStore('utility', {
  state: () => ({}),
  actions: {
    showLocalWarning(title: string, message: string) {
      const notificationStore = useNotificationStore();
      notificationStore.showDialogWarning(title, message);
    },
    formatDate(value: string, format = 'DD-MM-YYYY', adjust_time = 0, time_type: moment.unitOfTime.DurationConstructor = 'days') {
      if (value) {
        return moment(String(value)).locale('id').add(adjust_time, time_type).format(format);
      }
    },
    dateMonthFull(value: string) {
      const tanggal = value.split('-');
      let bulan = '';
      const bulanMap: Record<string, string> = {
        '01': 'Januari',
        '02': 'Februari',
        '03': 'Maret',
        '04': 'April',
        '05': 'Mei',
        '06': 'Juni',
        '07': 'Juli',
        '08': 'Agustus',
        '09': 'September',
        '10': 'Oktober',
        '11': 'November',
        '12': 'Desember'
      };
      bulan = bulanMap[tanggal[1]] ?? '';
      return `${tanggal[2] ?? ''} ${bulan} ${tanggal[0]}`;
    },
    dateMonth(value: string) {
      const tanggal = value.split('-');
      let bulan = '';
      const bulanMap: Record<string, string> = {
        '01': 'Jan',
        '02': 'Feb',
        '03': 'Mar',
        '04': 'Apr',
        '05': 'Mei',
        '06': 'Jun',
        '07': 'Jul',
        '08': 'Agu',
        '09': 'Sep',
        '10': 'Okt',
        '11': 'Nov',
        '12': 'Des'
      };
      bulan = bulanMap[tanggal[1]] ?? '';
      return `${tanggal[2]} ${bulan} ${tanggal[0]}`;
    },
    getCurrentShift() {
      const shift_1 = 71500;
      const shift_2 = 200000;
      const time = parseInt(moment().format('HHmmss'));
      let result = {
        date: moment().format('YYYY-MM-DD'),
        period: moment().format('YYYY-MM'),
        period2: moment().format('YYYYMM'),
        clock: moment().format('YYYY-MM-DD HH:mm'),
        hour: moment().format('HH:mm'),
        shift: 1,
        day: moment().format('DD')
      };
      if (!(time >= shift_1 && time < shift_2)) {
        result.shift = 2;
        if (!(time >= shift_2)) {
          result.date = moment().subtract(1, 'days').format('YYYY-MM-DD');
          result.period = moment().subtract(1, 'days').format('YYYY-MM');
          result.period2 = moment().subtract(1, 'days').format('YYYYMM');
          result.clock = moment().subtract(1, 'days').format('YYYY-MM-DD H:mm');
        }
      }
      return result;
    },
    getShiftNow() {
      const shift_1 = 71500;
      const shift_2 = 200000;
      const time = parseInt(moment().format('HHmmss'));
      let result = {
        period: moment().format('YYYY-MM'),
        date: moment().format('YYYY-MM-DD'),
        shift: 1
      };
      if (!(time >= shift_1 && time < shift_2)) {
        result.shift = 2;
        if (!(time >= shift_2)) {
          result.date = moment().subtract(1, 'days').format('YYYY-MM-DD');
        }
      }
      return result;
    },
    onApiResponse(response: any, callback = () => {}) {
      const notificationStore = useNotificationStore();
      if (response.status === 200) {
        let tmp = document.createElement('DIV');
        tmp.innerHTML = response.data.messages;
        let msg = tmp.textContent || tmp.innerText || '';
        if (response.data.success) {
          notificationStore.showDialogSuccess('Success', msg, callback);
        } else {
          msg != undefined || msg != 'undefined' || msg != null
            ? notificationStore.showDialogWarning('Information', msg, callback)
            : console.log(msg);
          notificationStore.timeoutDisableResponse(30000);
        }
      } else {
        response.data.status != undefined || response.data.status != null
          ? notificationStore.showDialogWarning('Information', response.data.status, callback)
          : console.log(response.data.status);
        notificationStore.timeoutDisableResponse(30000);
      }
      notificationStore.disableLoading();
    },
    onError(error: any) {
      const authStore = useAuthStore();
      const configStore = useConfigStore();
      const notificationStore = useNotificationStore();
      let msg,
        callback = () => {};
      if (error.response.data.status) {
        console.log(error);
        msg = error.response.data.status;
        switch (error.response.data.status) {
          case 'Expired token':
            callback = () => {
              authStore.logout();
              configStore.router?.push({
                name: 'login'
              });
            };
            break;
          case 'Access Denied!!':
            callback = () => {
              configStore.router?.back();
            };
            break;
          default:
            break;
        }
      } else {
        msg = error.response.statusText;
      }
      notificationStore.showDialogWarning('Information', msg, callback);
      notificationStore.disableLoading();
    },
    dateIndonesian(value: string) {
      if (!value) return '-';
      if (!value.includes('-')) return value;
      const tanggal = value.split('-');
      if (tanggal.length < 3) return value;
      return `${tanggal[2]}-${tanggal[1]}-${tanggal[0]}`;
    },
    formatNumber(value = 0) {
      return isNaN(value) ? 0 : value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },
    formatPercentOneZero(value: any = 0, decimal = 1) {
      return `${parseFloat(value).toFixed(decimal)}`;
    },
    formatPercent(value: any = 0, decimal = 2) {
      return `${parseFloat(value).toFixed(decimal)} %`;
    },
    formatNumberOneDecimal(value: any = 0, decimal = 1) {
      const num = parseFloat(value);
      return isNaN(num) ? '-' : num.toFixed(decimal);
    },
    formatDecimaltoNumber(value: any = 0, decimal = 0) {
      const num = parseFloat(value);
      return isNaN(num) ? '-' : num.toFixed(decimal);
    },
    formatPeriod(value: any) {
      switch (value.substr(5, 6)) {
        case '01':
          return 'January' + ' ' + value.substr(0, 4);
        case '02':
          return 'February' + ' ' + value.substr(0, 4);
        case '03':
          return 'March' + ' ' + value.substr(0, 4);
        case '04':
          return 'April' + ' ' + value.substr(0, 4);
        case '05':
          return 'May' + ' ' + value.substr(0, 4);
        case '06':
          return 'June' + ' ' + value.substr(0, 4);
        case '07':
          return 'July' + ' ' + value.substr(0, 4);
        case '08':
          return 'August' + ' ' + value.substr(0, 4);
        case '09':
          return 'September' + ' ' + value.substr(0, 4);
        case '10':
          return 'October' + ' ' + value.substr(0, 4);
        case '11':
          return 'November' + ' ' + value.substr(0, 4);
        case '12':
          return 'December' + ' ' + value.substr(0, 4);
      }
    },
    mappingBreak(date: any, start: any, end: any) {
      var istirahat = 0;
      const breakTime = [
        {
          start: '09:30',
          end: '09:40',
          duration: 10,
          addDays: 0
        },
        {
          start: '11:40',
          end: '12:20',
          duration: 40,
          addDays: 0
        },
        {
          start: '14:20',
          end: '14:30',
          duration: 10,
          addDays: 0
        },
        {
          start: '16:15',
          end: '16:25',
          duration: 10,
          addDays: 0
        },
        {
          start: '18:00',
          end: '18:30',
          duration: 30,
          addDays: 0
        },
        // Break Ramadhan
        // {
        //   start: "17:55",
        //   end: "18:25",
        //   duration: 30,
        //   addDays: 0
        // },
        {
          start: '21:50',
          end: '22:00',
          duration: 10,
          addDays: 0
        },
        // Break Ramadhan
        // {
        //   start: "22:20",
        //   end: "22:30",
        //   duration: 10,
        //   addDays: 0
        // },
        {
          start: '00:10',
          end: '00:50',
          duration: 40,
          addDays: 1
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
          start: '02:30',
          end: '02:40',
          duration: 10,
          addDays: 1
        },
        {
          start: '05:00',
          end: '05:10',
          duration: 10,
          addDays: 1
        }
      ];
      const breakTimeFriday = [
        {
          start: '09:30',
          end: '09:40',
          duration: 10,
          addDays: 0
        },
        {
          start: '11:40',
          end: '12:40',
          duration: 60,
          addDays: 0
        },
        {
          start: '14:50',
          end: '15:00',
          duration: 10,
          addDays: 0
        },
        {
          start: '16:35',
          end: '16:45',
          duration: 10,
          addDays: 0
        },
        {
          start: '18:00',
          end: '18:30',
          duration: 30,
          addDays: 0
        },
        // Break Ramadhan
        // {
        //   start: "17:55",
        //   end: "18:25",
        //   duration: 30,
        //   addDays: 0
        // },
        {
          start: '21:50',
          end: '22:00',
          duration: 10,
          addDays: 0
        },
        // {
        //   start: "22:20",
        //   end: "22:30",
        //   duration: 10,
        //   addDays: 0
        // },
        {
          start: '00:10',
          end: '00:50',
          duration: 40,
          addDays: 1
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
          start: '02:30',
          end: '02:40',
          duration: 10,
          addDays: 1
        },
        {
          start: '05:00',
          end: '05:10',
          duration: 10,
          addDays: 1
        }
      ];

      const dateWork = moment(`${date.date}`).day();
      let breakTimeSelect = [];
      if (dateWork == 5) {
        breakTimeSelect = breakTimeFriday;
      } else {
        breakTimeSelect = breakTime;
      }

      breakTimeSelect.forEach((time) => {
        const breakStart = moment(`${date.date} ${time.start}`, 'YYYY-MM-DD HH:mm').add(time.addDays, 'days');
        const breakEnd = breakStart.clone().add(time.duration, 'minutes'); // FIXED: Tambah durasi dengan benar

        if (
          (moment(start).isSameOrBefore(breakEnd) && moment(end).isSameOrAfter(breakStart)) || // Ada overlap
          moment(start).isBetween(breakStart, breakEnd, null, '[)') || // Start dalam break
          moment(end).isBetween(breakStart, breakEnd, null, '(]') // End dalam break
        ) {
          istirahat += time.duration;
        }
      });
      return istirahat;
    },
    // If `timeMoment` lands inside a break window, snap it forward to the break's end.
    snapToBreakEnd(params: any, timeMoment: moment.Moment): moment.Moment {
      const breakTime = [
        { start: '09:30', end: '09:40', duration: 10, addDays: 0 },
        { start: '11:40', end: '12:20', duration: 40, addDays: 0 },
        { start: '14:20', end: '14:30', duration: 10, addDays: 0 },
        { start: '16:15', end: '16:25', duration: 10, addDays: 0 },
        { start: '18:00', end: '18:30', duration: 30, addDays: 0 },
        { start: '21:50', end: '22:00', duration: 10, addDays: 0 },
        { start: '00:10', end: '00:50', duration: 40, addDays: 1 },
        { start: '02:30', end: '02:40', duration: 10, addDays: 1 },
        { start: '05:00', end: '05:10', duration: 10, addDays: 1 }
      ];
      const breakTimeFriday = [
        { start: '09:30', end: '09:40', duration: 10, addDays: 0 },
        { start: '11:40', end: '12:40', duration: 60, addDays: 0 },
        { start: '14:50', end: '15:00', duration: 10, addDays: 0 },
        { start: '16:35', end: '16:45', duration: 10, addDays: 0 },
        { start: '18:00', end: '18:30', duration: 30, addDays: 0 },
        { start: '21:50', end: '22:00', duration: 10, addDays: 0 },
        { start: '00:10', end: '00:50', duration: 40, addDays: 1 },
        { start: '02:30', end: '02:40', duration: 10, addDays: 1 },
        { start: '05:00', end: '05:10', duration: 10, addDays: 1 }
      ];
      const dateWork = moment(`${params.date}`).day();
      const list = dateWork === 5 ? breakTimeFriday : breakTime;

      for (const b of list) {
        const breakStart = moment(`${params.date} ${b.start}`, 'YYYY-MM-DD HH:mm').add(b.addDays, 'days');
        const breakEnd = breakStart.clone().add(b.duration, 'minutes');
        if (timeMoment.isSameOrAfter(breakStart) && timeMoment.isBefore(breakEnd)) {
          return breakEnd.clone();
        }
      }
      return timeMoment.clone();
    },
    isCurrentTimeBetween(startTime: any, endTime: any) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const startTotal = startHour * 60 + startMinute;
      const endTotal = endHour * 60 + endMinute;

      // Handle overnight range (e.g., 22:00 to 06:00)
      if (startTotal > endTotal) {
        return currentTime >= startTotal || currentTime <= endTotal;
      }

      return currentTime >= startTotal && currentTime <= endTotal;
    },
    focusNext(e: any) {
      const inputs = Array.from(e.target.form.querySelectorAll('input')) as HTMLInputElement[];
      const index = inputs.indexOf(e.target as HTMLInputElement);

      if (index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    }
  }
});
