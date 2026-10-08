import { fetchReportPareto, syncReportParetoSap } from "@/services/PCD/Stamping/ReportPareto";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { CategoryConfig, CleanData, DataAPI, ParamsFilter, ParetoClean, ParetoRaw, ReportCategory, ResolvedFilter, WeekRange } from "@/types/PCD/Stamping/ReportPareto";
import { defineStore } from "pinia";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

const categories: CategoryConfig[] = [
  {
    key: 'repair-rate',
    title: 'Repair Rate (Metal Finish)',
    charts: [
      { key: 'roc_repair', title: 'Pareto ROC Repair Metal Finish' },
      { key: 'item_repair', title: 'Pareto Item Repair' }
    ]
  },
  {
    key: 'reject-rate',
    title: 'Reject Rate',
    charts: [
      { key: 'roc_reject', title: 'Pareto ROC Reject' },
      { key: 'item_reject', title: 'Pareto Item Reject' },
      { key: 'part_reject', title: 'Pareto Part Reject' },
      { key: 'line_reject', title: 'Pareto Reject Per Line' }
    ]
  },
  {
    key: 'tpm-akurasi',
    title: 'TPM (Akurasi)',
    charts: [
      { key: 'akurasi_model', title: 'Pareto Akurasi Model' },
      { key: 'item_akurasi_model_terendah', title: 'Item Akurasi Model Terendah' }
    ]
  }
];

const defaultParams = (): ParamsFilter => ({
  mode: 'akumulasi',
  date: date.date,
  year: Number(date.period.slice(0, 4)),
  month: Number(date.period.slice(5, 7)),
  week: 1,
  start: `${date.period}-01`,
  end: date.date,
});

export const useReportParetoStamping = defineStore('reportParetoStamping', {
  state: () => ({
    categories,
    activeCategory: 'repair-rate' as ReportCategory,
    paramsByCategory: {
      'repair-rate': defaultParams(),
      'reject-rate': defaultParams(),
      'tpm-akurasi': defaultParams(),
    } as Record<ReportCategory, ParamsFilter>,
    allData: {
      charts: {},
      list: [],
    } as CleanData,
    selectedProblem: null as string | null,
    selectedDefect: null as string | null,
    selectedPart: null as string | null,
    rejectDept: 'PRESS' as string,
    rejectChartLimit: 5 as number | 'all',
    // Filter layer Repair Rate (kosong = semua). Opsinya datang dari backend (meta.layer_options).
    repairLayer: '' as string,
  }),
  getters: {
    activeCategoryConfig(state): CategoryConfig {
      return state.categories.find((c) => c.key === state.activeCategory) ?? state.categories[0];
    },
    params(state): ParamsFilter {
      return state.paramsByCategory[state.activeCategory];
    },
    resolvedFilter(state): ResolvedFilter {
      const { mode, date, year, month, week, start, end } = this.params;
      const sel_roc = this.selectedProblem ?? undefined;

      const layerExtra = state.activeCategory === 'repair-rate' && state.repairLayer
        ? { layer: state.repairLayer }
        : {};

      const rejectExtra = state.activeCategory === 'reject-rate'
        ? {
          dept: state.rejectDept,
          chart_limit: state.rejectChartLimit,
          sel_defect: this.selectedDefect ?? undefined,
          sel_part: this.selectedPart ?? undefined,
        }
        : {};

      if (mode === 'harian') {
        return { mode, date, sel_roc, ...rejectExtra, ...layerExtra };
      }

      if (mode === 'mingguan') {
        return { mode, year, month, week, sel_roc, ...rejectExtra, ...layerExtra };
      }

      return { mode, start, end, sel_roc, ...rejectExtra, ...layerExtra };
    },
    weekRanges(): WeekRange[] {
      const { year, month } = this.params;
      if (!year || !month) return [];

      const daysInMonth = new Date(year, month, 0).getDate();
      const weeks: WeekRange[] = [];
      let cursor = 1;

      while (cursor <= daysInMonth) {
        const endDay = Math.min(cursor + 6, daysInMonth);
        weeks.push({
          id: `${weeks.length + 1}`,
          label: `W${weeks.length + 1}`,
          start: cursor,
          end: endDay,
        });
        cursor = endDay + 1;
      }

      return weeks;
    },
  },
  actions: {
    async setCategory(category: ReportCategory) {
      this.activeCategory = category;
      this.selectedProblem = null;
      this.selectedDefect = null;
      this.selectedPart = null;
      await this.fetchAllData(true);
    },

    async setMode(mode: ParamsFilter['mode']) {
      this.params.mode = mode;
      await this.fetchAllData(false);
    },

    /**
     * Ketiga action di bawah bersifat TOGGLE: memilih nilai yang sama = melepas
     * filternya, dan level di bawahnya selalu ikut direset.
     *
     * Sebelumnya memilih nilai yang sama hanya di-abaikan (return), sehingga
     * sekali sebuah batang diklik filternya TIDAK BISA dilepas lagi tanpa ganti
     * periode/dept — padahal tampilan default-nya sekarang "semua". Level bawah
     * wajib direset karena sisa pilihan lama bisa bikin hasilnya kosong tanpa
     * sebab yang terlihat (mis. ganti ROC tapi defect lama tak ada di ROC baru).
     */
    async selectProblem(problem: string) {
      this.selectedProblem = this.selectedProblem === problem ? null : problem;
      this.selectedDefect = null;
      this.selectedPart = null;
      await this.fetchAllData(false);
    },

    async selectDefect(defect: string) {
      this.selectedDefect = this.selectedDefect === defect ? null : defect;
      this.selectedPart = null;
      await this.fetchAllData(false);
    },

    async selectPart(part: string) {
      this.selectedPart = this.selectedPart === part ? null : part;
      await this.fetchAllData(false);
    },

    /** Lepas semua filter drill-down sekaligus (tombol "Tampilkan semua"). */
    async clearSelection() {
      if (this.selectedProblem === null && this.selectedDefect === null && this.selectedPart === null) return;
      this.selectedProblem = null;
      this.selectedDefect = null;
      this.selectedPart = null;
      await this.fetchAllData(false);
    },

    setDept(dept: string) {
      if (this.rejectDept === dept) return;
      this.rejectDept = dept;
      this.selectedProblem = null;
      this.selectedDefect = null;
      this.selectedPart = null;
      this.fetchAllData(false);
    },

    async setLayer(layer: string) {
      if (this.repairLayer === layer) return;
      this.repairLayer = layer;
      await this.fetchAllData(false);
    },

    setChartLimit(limit: number | 'all') {
      if (this.rejectChartLimit === limit) return;
      this.rejectChartLimit = limit;
      this.fetchAllData(false);
    },

    async syncSap() {
      try {
        notificationStore.loading = true;
        const { start, end } = this.params;
        const res = await syncReportParetoSap(start, end);

        if (res.data?.status !== 'success') {
          notificationStore.showAlertError(res.data?.message ?? 'Sinkronisasi SAP gagal');
          return;
        }

        notificationStore.showAlertSuccess(res.data.message ?? 'Sinkronisasi SAP berhasil');
        await this.fetchAllData(false);
      } catch (error) {
        notificationStore.showAlertError('Terjadi kesalahan saat sinkronisasi SAP');
        console.log('err: ', error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchAllData(syncFallback = false) {
      try {
        notificationStore.loading = true;

        const res = await fetchReportPareto(this.activeCategory, this.resolvedFilter);

        if (res.status !== 200) {
          notificationStore.showAlertError("Terjadi kesalahan saat mengambil data");
          this.resetData();
          return;
        }

        this.allData = this.mappingData(res.data);
        if (this.allData.selected_problem) {
          this.selectedProblem = this.allData.selected_problem;
        }
        if (this.allData.selected_defect) {
          this.selectedDefect = this.allData.selected_defect;
        }
        if (this.allData.selected_part) {
          this.selectedPart = this.allData.selected_part;
        }

        if (syncFallback && this.allData.note && this.allData.start && this.allData.end) {
          if (this.activeCategory === 'tpm-akurasi' && (this.params.mode !== 'akumulasi' || this.params.start !== this.allData.start || this.params.end !== this.allData.end)) {
            this.params.mode = 'akumulasi';
            this.params.start = this.allData.start;
            this.params.end = this.allData.end;
          } else if (this.activeCategory === 'repair-rate' && (this.params.mode !== 'harian' || this.params.date !== this.allData.start)) {
            this.params.mode = 'harian';
            this.params.date = this.allData.start;
          }
        }

      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status !== 404 && status !== 405) {
          notificationStore.showAlertError("Terjadi kesalahan saat mengambil data");
        }
        console.log("err: ", error);
        this.resetData();
      } finally {
        notificationStore.disableLoading();
      }
    },

    resetData() {
      this.allData = { charts: {}, list: [], selected_problem: null };
      this.selectedProblem = null;
      this.selectedDefect = null;
      this.selectedPart = null;
    },

    mappingChart(raw: ParetoRaw[], key?: string): ParetoClean[] {
      const withoutLainnya = raw.filter((item) => item.category !== 'LAINNYA');
      const clean = withoutLainnya.map((item) => ({ category: item.category, qty: Number(item.qty) || 0 }));

      const total = clean.reduce((sum, item) => sum + item.qty, 0);

      let cumm_qty = 0;

      if (key === 'item_akurasi_model_terendah') {
        return clean.map((item) => ({
          category: item.category,
          qty: item.qty,
          pct: item.qty.toFixed(1),
          cumm_qty: item.qty,
          cumm_pct: item.qty.toFixed(1),
        }));
      }

      const sorted = clean.sort((a, b) => b.qty - a.qty);

      return sorted
        .map((item) => {
          cumm_qty += item.qty;

          return {
            category: item.category,
            qty: item.qty,
            pct: total !== 0 ? ((item.qty / total) * 100).toFixed(1) : "0.0",
            cumm_qty,
            cumm_pct: total !== 0 ? ((cumm_qty / total) * 100).toFixed(1) : "0.0",
          };
        });
    },

    mappingData(data: DataAPI): CleanData {
      const charts: Record<string, ParetoClean[]> = {};

      Object.keys(data.charts ?? {}).forEach((key) => {
        charts[key] = this.mappingChart(data.charts[key] ?? [], key);
      });

      return {
        charts,
        list: data.list ?? [],
        selected_problem: data.meta?.drill?.roc ?? null,
        selected_defect: data.meta?.drill?.defect ?? null,
        selected_part: data.meta?.drill?.part ?? null,
        layer_options: data.meta?.layer_options ?? [],
        last_sync: data.meta?.last_sync ?? null,
        note: data.meta?.note ?? null,
        start: data.meta?.start ?? null,
        end: data.meta?.end ?? null,
      };
    },
  }
})
