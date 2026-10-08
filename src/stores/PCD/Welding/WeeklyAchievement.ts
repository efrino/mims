import { fetchWeeklyAchievementWld } from "@/services/PCD/Welding/WeeklyAchievement";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { CleanData, DataAPI, DetailDaily, DetailWithDaily, ParamsFilter } from "@/types/PCD/Welding/WeeklyAchievement";
import { defineStore } from "pinia";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useWeeklyAchievment = defineStore('weeklyAchievementWelding', {
  state: () => ({
    params: {
      start: new Date(new Date(date.date).setDate(new Date(date.date).getDate() - 7)).toISOString().slice(0, 10),
      end: date.date,
      cutoff: "",
      line: "All",
      shift: null,
    } as ParamsFilter,
    rangeDate: [] as string[],
    allData: {
      detail: [],
      summary: [],
      summary_line: [],
    } as CleanData,
  }),
  actions: {
    async fetchAllData(start: string, end: string, cutoff: string) {
      try {
        const start_old = this.params.start;
        const end_old = this.params.end;
        const cutoff_old = this.params.cutoff;

        const start_new = new Date(start);
        const end_new = new Date(end);
        const cutOff_new = new Date(cutoff);

        if (start_new > end_new) {
          notificationStore.showAlertError("Tanggal start tidak boleh lebih dari end");
          this.params.start = start_old;
          this.params.end = end_old;
          return;
        }

        if (cutOff_new < start_new || cutOff_new > end_new) {
          notificationStore.showAlertError("Tanggal cut off tidak boleh kurang dari start date atau end date");
          this.params.cutoff = cutoff_old;
          return;
        }

        this.params.start = start;
        this.params.end = end;
        this.params.cutoff = cutoff;

        this.rangeDate = this.generateRangeDate(this.params.start, this.params.end);

        notificationStore.loading = true;

        const res = await fetchWeeklyAchievementWld(this.params);

        if (res.status !== 200) {
          notificationStore.showAlertError("Terjadi kesalahan saat mengambil data");
          return;
        }

        const dataClean = this.mappingData(res.data);
        this.allData = dataClean;

      } catch (error) {
        console.log("err: ", error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    normalizeDaily(daily: DetailDaily[], rangeDate: string[], line_id: string, part_number: string): DetailDaily[] {
      const dailyMap = new Map<string, DetailDaily>();

      daily.forEach((d) => {
        dailyMap.set(d.date, d);
      });

      return rangeDate.map((date) => {
        return (
          dailyMap.get(date) ?? {
            date,
            line_id,
            part_number,
            shift: null,
            plan: 0,
            actual: 0,
          }
        );
      });
    },

    mappingData(data: DataAPI): CleanData {
      if (!data) {
        return { detail: [], summary: [], summary_line: [] };
      }
      const detail = Array.isArray(data.detail) ? data.detail : [];
      const detail_daily = Array.isArray(data.detail_daily) ? data.detail_daily : [];
      const summary = Array.isArray(data.summary) ? data.summary : [];
      const summary_line = Array.isArray(data.summary_line) ? data.summary_line : [];

      const dailyMap = new Map<string, DetailDaily[]>();

      detail_daily.forEach((d) => {
        const keyWithShift = `${d.line_id}|${d.part_number}|${d.shift ?? ''}`;
        if (!dailyMap.has(keyWithShift)) {
          dailyMap.set(keyWithShift, []);
        }
        dailyMap.get(keyWithShift)!.push(d);

        // Fallback key tanpa shift
        const keyNoShift = `${d.line_id}|${d.part_number}`;
        if (!dailyMap.has(keyNoShift)) {
          dailyMap.set(keyNoShift, []);
        }
        dailyMap.get(keyNoShift)!.push(d);
      });

      const mappedDetail: DetailWithDaily[] = detail.map((item) => {
        const keyWithShift = `${item.line_id}|${item.part_number}|${item.shift ?? ''}`;
        const keyNoShift = `${item.line_id}|${item.part_number}`;
        const dailyRaw = dailyMap.get(keyWithShift) ?? dailyMap.get(keyNoShift) ?? [];

        const daily = this.normalizeDaily(
          dailyRaw,
          this.rangeDate,
          item.line_id,
          item.part_number
        );

        return {
          actual: item.actual ?? 0,
          plan: item.plan ?? 0,
          line_id: item.line_id ? String(item.line_id).trim() : '',
          shift: item.shift ?? null,
          job_number: item.job_number ? String(item.job_number).trim() : '-',
          part_number: item.part_number ? String(item.part_number).trim() : '',
          status: item.status ? String(item.status).trim().toUpperCase() : '-',
          daily,
        };
      });

      return {
        detail: mappedDetail,
        summary,
        summary_line,
      };
    },

    generateRangeDate(start_date: string, end_date: string): string[] {
      const result: string[] = [];

      let current = new Date(start_date);
      const end = new Date(end_date);

      while (current <= end) {
        result.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }

      return result;
    },
    
  }
})