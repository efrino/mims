import { defineStore } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { PLANT_ORDER, useWeldingAreas } from '@/composables/useWeldingAreas';
import type { AreaPlant } from '@/services/Public/Welding/weldingAreaService';
import type { AreaLocks, DataGroup, Detail, FilterParams, FormEdit, KetActual_Plan, LockSlot, PartItem, ResponseData, SummaryData, UserCheck, ViewerInfo } from '@/types/Welding/Transaction/Achievement_v2';

import {
  getDataAch,
  saveData,
  refreshData,
  removeData,
  checkUser,
  getLocks,
  openFormEdit,
  heartbeatFormEdit,
  pingViewer,
  closeFormEdit,
  closeRefreshArea,
  type LockKey,
  startRunning,
  stopRunning,
  startProcess,
  stopProcess,
  moveUrut,
  getPart,
  getKetPlan,
  getKetActual,
  importExcel,
} from '@/services/Welding/Transaction/Achievement_v2';

// Akuisisi store secara LAZY — JANGAN panggil useStore() di top-level module:
// saat view di-lazy-load pertama kali, Pinia bisa belum aktif → store gagal init →
// data/area kosong sampai user reload. Pakai fungsi yg dipanggil di dalam state/actions.
const _ns = () => useNotificationStore();
const _utils = () => useUtilityStore();
const _auth = () => useAuthStore();

// ID per tab utk presence View (1 user di 2 tab = 2 entri, tampilan dedupe per user)
const SPLIT_OP_KEY = 'ach.splitOp';
const viewerClientId = Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useAchievementWld = defineStore('achievementWeldingV2', {
  state: () => {
    const date = _utils().getCurrentShift();
    return {
    filter: {
      date: date.date,
      period: date.period,
      period2: date.period2,
      clock: date.clock,
      hour: date.hour,
      shift: date.shift,
      day: date.day,
    } as FilterParams,
    cleanData: [] as DataGroup[],
    selectedPrefixArea: '' as string,
    selectedArea: '' as string,
    partData: [] as PartItem[],
    formEdit: {
      detail: [],
      attendance: [],
    } as FormEdit,
    // Nama permission ikut MainRoutes (parent Transaction.View.AchievementWelding,
    // child Create/Update/PCD). Production.* dipertahankan utk data lama.
    permissions: {
      create: _auth().checkAccess("Transaction.Create.AchievementWeldingV2"),
      update: _auth().checkAccess("Transaction.Update.AchievementWeldingV2"),
      download: _auth().checkAccess("Report.Download.AchievementWelding"),
      pcd: _auth().checkAccess("Transaction.PCD.AchievementWeldingV2"),
    },
    currentUser: {} as UserCheck,
    // Lock aktif per area (badge kartu) — diisi fetchLocks() + socket achLockChanged
    locks: {} as Record<string, AreaLocks>,
    // Slot departemen saya (dari backend): PCD → ['plan'], Welding → ['actual'], admin → keduanya
    mySlots: ['actual'] as LockSlot[],
    // Pembuka modal View per area (boleh banyak) — diisi fetchLocks() + socket achView
    viewers: {} as Record<string, ViewerInfo[]>,
    // Saklar OP (modal View & Edit): false = 1 baris/part (mesin digabung), true = 1 baris per proses
    splitOp: (() => { try { return localStorage.getItem(SPLIT_OP_KEY) === '1'; } catch { return false; } })() as boolean,
    currentPatan: '' as string,
    keteranganPlan: [] as KetActual_Plan[],
    keteranganActual: [] as KetActual_Plan[],
    isModalFilterOpen: false as boolean,
    isModalViewOpen: false as boolean,
    isModalEditOpen: false as boolean,
    // Area yg baru saja di-sinkron otomatis dari mutasi oleh backend (auto-connect planning)
    lastAutoSeeded: [] as string[],
    };
  },

  actions: {
    async fetchData() {
      try {
        _ns().loading = true;
        // Master area (pengelompokan kartu) dimuat paralel dgn data — hemat 1 round-trip.
        const [, res, partRes, ketActual, ketPlan] = await Promise.all([
          useWeldingAreas().load(),
          getDataAch(this.filter),
          getPart(),
          getKetActual(),
          getKetPlan(),
        ]);

        if (res.status !== 200 || partRes.status !== 200 || ketActual.status !== 200 || ketPlan.status !== 200) {
          _ns().showDialogWarning("Warning", "Terjadi kesalahan saat mengambil data");
          return;
        }

        if (res.data.data && res.data.data.length > 0) {
          this.cleanData = this.mappingData(res.data.data);
        } else {
          this.cleanData = [];
        }
        this.noteAutoSeed(res.data.seed);
        this.fetchLocks();   // non-blocking: badge "sedang diedit" di kartu

        this.partData = partRes.data;
        this.keteranganActual = ketActual.data;
        this.keteranganPlan = ketPlan.data;
      } catch (error) {
        console.log("err: ", error);
        _utils().onError(error);
      } finally {
        this.isModalFilterOpen = false;
        _ns().disableLoading();
      }
    },

    // Refresh RINGAN (anti-lag): hanya tarik data achievement + remap, TANPA part/keterangan
    // (master list, sudah dimuat saat fetchData awal) & TANPA overlay loading → operasi tulis
    // (save/start/stop/move/delete) terasa instan. Pakai fetchData penuh hanya saat ganti
    // tanggal/shift atau load awal.
    async refreshAchievement() {
      try {
        const res = await getDataAch(this.filter);
        if (res.status === 200) {
          this.cleanData = (res.data.data && res.data.data.length > 0) ? this.mappingData(res.data.data) : [];
          this.noteAutoSeed(res.data.seed);
        }
      } catch (error) {
        console.log("err: ", error);
        _utils().onError(error);
      }
    },

    // Backend achievement_get menyertakan `seed: {checked, seeded[]}` — area yg planning-nya
    // baru di-tarik ulang dari mutasi saat request ini. Tampilkan sekilas supaya user tahu
    // angka plan barusan berubah mengikuti mutasi (bukan hilang/tertimpa tanpa sebab).
    noteAutoSeed(seed?: { checked: number; seeded: string[] } | null) {
      const seeded = seed?.seeded ?? [];
      this.lastAutoSeeded = seeded;
      // Sinkron berjalan di background (tiap fetch + realtime) → tanpa toast, cukup log.
      if (seeded.length) console.debug('[ach-v2] auto-seed:', seeded.join(', '));
    },

    // Kartu = 1 AREA MASTER (line_id = kode area, mis. SA ADM; backend sudah gabung
    // zone-nya). Grup judul = plant (ADM / MMKI / HMMI) urut master. Kode di luar
    // master → grup LAINNYA paling akhir.
    mappingData(data: ResponseData[]): DataGroup[] {
      const { areaByCode } = useWeldingAreas();
      const OTHER = 'LAINNYA';
      const map = new Map<string, ResponseData[]>();

      data.forEach(item => {
        const { summary_data, note } = this.buildSummary(item.detail);
        item.summary_data = summary_data;
        item.note = note;

        const area = areaByCode(item.line_id);
        item.area_code = area?.area_code ?? null;
        const key = area ? area.plant : OTHER;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      });

      const rank = (k: string) => (k === OTHER ? PLANT_ORDER.length : PLANT_ORDER.indexOf(k as AreaPlant));
      const order = (code: string) => areaByCode(code)?.sort_order ?? Number.MAX_SAFE_INTEGER;

      return Array.from(map.entries())
        .sort(([a], [b]) => rank(a) - rank(b))
        .map(([prefix_area, items]) => ({
          prefix_area,
          total_area: items.length,
          detail: items.sort((a, b) => order(a.line_id) - order(b.line_id)),
        }));
    },

    buildSummary(detail: Detail[]): { summary_data: SummaryData; note: string } {
      let lotsize_sum = 0;
      let repair_sum = 0;
      let reject_sum = 0;
      let stroke_act_sum = 0;
      let total_lotsize_act_sum = 0;
      let tpt_actual_sum = 0;
      let ach_pct_sum = 0;     // Σ akurasi per part (actual/plan)
      let ach_count = 0;       // jumlah part ber-plan
      let last_updated = '';   // timestamp terbaru di area
      const notes: string[] = [];

      detail.forEach(d => {
        const lotsizeAct = Number(d.lotsize_actual ?? 0);
        const repair = Number(d.repair ?? 0);
        const reject = Number(d.reject ?? 0);
        const strokeAct = Number(d.stroke_act ?? 0);
        const tptActual = Number(d.tpt_actual ?? 0);

        const totalLotsizeAct = lotsizeAct + repair;
        d.total_lotsize_act = totalLotsizeAct;
        d.total_dt =
          Number(d.dt_wip ?? 0) +
          Number(d.dt_jig ?? 0) +
          Number(d.dt_machines ?? 0) +
          Number(d.dt_other ?? 0);

        d.uph = tptActual > 0 ? Number(((totalLotsizeAct / tptActual) * 60).toFixed(2)) : null;

        lotsize_sum += lotsizeAct;
        repair_sum += repair;
        reject_sum += reject;
        stroke_act_sum += strokeAct;
        total_lotsize_act_sum += totalLotsizeAct;
        tpt_actual_sum += tptActual;

        // Akurasi per part = actual OK / plan (lotsize). Rata-rata, BUKAN total.
        const plan = Number(d.lotsize ?? 0);
        if (plan > 0) { ach_pct_sum += (lotsizeAct / plan) * 100; ach_count++; }
        const ud = String((d as any).update_date || (d as any).finish_actual || '');
        if (ud && ud > last_updated) last_updated = ud;

        if (d.information) notes.push(d.information);
      });

      const totalQty = lotsize_sum + repair_sum;

      return {
        summary_data: {
          qty_total: lotsize_sum,
          qty_persen: totalQty > 0 ? (lotsize_sum / totalQty) * 100 : 0,
          repair_total: repair_sum,
          repair_persen: totalQty > 0 ? (repair_sum / totalQty) * 100 : 0,
          reject_total: reject_sum,
          reject_persen: totalQty > 0 ? (reject_sum / totalQty) * 100 : 0,
          total_stroke_actual: stroke_act_sum,
          avg_uph: tpt_actual_sum > 0 ? (total_lotsize_act_sum / tpt_actual_sum) * 60 : 0,
          tpt_total: tpt_actual_sum,
          part_count: detail.length,
          ach_avg: ach_count > 0 ? ach_pct_sum / ach_count : 0,
          updated: last_updated,
        },
        note: [...new Set(notes)].join(', '),
      };
    },

    // ── Form lock (per area + date + shift) ──────────────────────────
    lockKey(area: string): LockKey {
      return { area, date: this.filter.date, shift: this.filter.shift };
    },

    async checkUser(area: string) {
      try {
        const res = await checkUser(this.lockKey(area));
        this.currentUser = res.data;
      } catch (error) {
        console.log("err: ", error);
        _utils().onError(error);
      }
    },

    /** Muat semua lock aktif (badge di kartu area). */
    async fetchLocks() {
      try {
        const res = await getLocks(this.filter.date, this.filter.shift);
        this.locks = res.data?.data ?? {};
        this.viewers = res.data?.viewers ?? {};
        if (Array.isArray(res.data?.my_slots) && res.data.my_slots.length) this.mySlots = res.data.my_slots;
      } catch (error) {
        console.log("err: ", error);
      }
    },

    setSplitOp(v: boolean) {
      this.splitOp = v;
      try { localStorage.setItem(SPLIT_OP_KEY, v ? '1' : '0'); } catch { /* abaikan */ }
    },

    /** Presence modal View: ping (buka / heartbeat) atau leave (tutup). Non-fatal. */
    async pingViewer(area: string, action: 'ping' | 'leave' = 'ping') {
      try {
        const res = await pingViewer(viewerClientId, this.lockKey(area), action);
        if (res.data?.viewers) this.viewers = res.data.viewers;
      } catch (error) {
        console.log("err: ", error);
      }
    },

    /**
     * Minta lock lalu buka modal. Return true bila berhasil.
     * Ditolak → currentUser terisi info pemegang; modal TIDAK dibuka.
     */
    async openFormEditById(area: string, force = false): Promise<boolean> {
      try {
        const res = await openFormEdit(this.lockKey(area), force);
        this.currentUser = res.data;
        if (res.data?.locks) this.locks = { ...this.locks, [area]: res.data.locks };
        if (Array.isArray(res.data?.my_slots) && res.data.my_slots.length) this.mySlots = res.data.my_slots;
        return res.data?.status === true;
      } catch (error) {
        console.log("err: ", error);
        _utils().onError(error);
        return false;
      }
    },

    async heartbeat(area: string): Promise<boolean> {
      try {
        const res = await heartbeatFormEdit(this.lockKey(area));
        if (res.data?.status !== true) { this.currentUser = res.data; return false; }
        return true;
      } catch (error) {
        return true;   // jaringan gagal ≠ lock hilang; jangan tendang user
      }
    },

    async closeFormEditById(area: string) {
      try {
        await closeFormEdit(this.lockKey(area));
      } catch (error) {
        console.log("err: ", error);
      } finally {
        this.currentUser = { status: true, user: null, messages: null, lock: null, locks: null, is_me: false };
        // Lepas hanya slot saya; slot departemen lain tetap tampil
        const cur = this.locks[area];
        if (cur) {
          const next: AreaLocks = { ...cur };
          for (const sl of this.mySlots) next[sl] = null;
          if (!next.plan && !next.actual) { const { [area]: _drop, ...rest } = this.locks; this.locks = rest; }
          else this.locks = { ...this.locks, [area]: next };
        }
      }
    },

    async closeRefreshArea() {
      try {
        await closeRefreshArea(this.filter.date, this.filter.shift, this.selectedArea);
      } catch (error) {
        console.log("err: ", error);
      }
    },

    async editData() {
      try {
        // Validation Logic
        // Lock harus masih milik kita — cek ulang ke server (bisa saja diambil alih).
        const chk = await checkUser(this.lockKey(this.selectedArea));
        this.currentUser = chk.data;
        const holder = this.currentUser.user;
        const mine = this.currentUser.status === true;   // semua slot saya bebas / milik saya
        if (!mine) {
          _ns().showDialogWarning("Form diambil alih", this.currentUser.messages || `Form sedang dibuka oleh ${holder}. Perubahan tidak disimpan.`);
          return false;
        }

        // ── Hitung actual turunan: stroke_act, uph (actual), tpt_actual ──
        // stroke_act = total(OK+repair+reject) × stroke master.
        // finish part = WAKTU SIMPAN (now); start = selesai part sebelumnya di area sama,
        // atau awal shift (day 07:15 / night 20:00). worked = (finish−start) − downtime(menit).
        // uph_act = total / worked_jam ; tpt_actual = total / uph_act (rumus master).
        const pad = (n: number) => String(n).padStart(2, '0');
        const _now = new Date();
        const nowStr = `${_now.getFullYear()}-${pad(_now.getMonth() + 1)}-${pad(_now.getDate())} `
          + `${pad(_now.getHours())}:${pad(_now.getMinutes())}:${pad(_now.getSeconds())}`;
        const shiftStart = String(this.filter.shift) === '2' ? '20:00:00' : '07:15:00';
        const startBase = `${this.filter.date} ${shiftStart}`;
        const prevFinish: Record<string, string> = {};
        const numv = (v: any) => Number(v) || 0;
        (this.formEdit.detail as any[]).forEach((r) => {
          const total = numv(r.lotsize_actual) + numv(r.repair) + numv(r.reject);
          if (total <= 0) return;
          r.stroke_act = total * numv(r.stroke_plan);
          if (!r.finish_actual) r.finish_actual = nowStr;             // finish = waktu simpan (sticky)
          const mkey = (r.mc_weld || '') as string;                   // antrian per MESIN (paralel)
          const start = prevFinish[mkey] || startBase;
          const dtMin = numv(r.dt_machines) + numv(r.dt_jig) + numv(r.dt_other) + numv(r.dt_wip);
          let workedMin = (Date.parse(r.finish_actual.replace(' ', 'T')) - Date.parse(start.replace(' ', 'T'))) / 60000 - dtMin;
          if (!(workedMin > 0)) workedMin = 0;
          const workedH = workedMin / 60;
          r.uph = workedH > 0 ? Math.round((total / workedH) * 100) / 100 : 0;
          r.tpt_actual = numv(r.uph) > 0 ? Math.round((total / numv(r.uph)) * 100) / 100 : 0;
          prevFinish[mkey] = r.finish_actual;
        });

        const data = new FormData();
        this.formEdit.detail.forEach((row) => {
          Object.entries(row).forEach(([key, value]) => {
            data.append(`${key}[]`, value === null || value === undefined ? '' : String(value));
          });
        });

        this.formEdit.attendance.forEach((row) => {
          Object.entries(row).forEach(([key, value]) => {
            data.append(`${key}[]`, value === null || value === undefined ? '' : String(value));
          });
        });

        // The PHP controller uses post('date'), post('shift'), post('line_id'), post('patan')
        data.append('line_id', this.selectedArea);
        data.append('patan', this.currentPatan);
        data.append('date', this.filter.date);
        data.append('shift', String(this.filter.shift));

        const res = await saveData(data);

        if (res.status !== 200) {
          _ns().showDialogWarning("Warning", "Terjadi kesalahan saat memperbarui data");
          return false;
        }

        _ns().showAlertSuccess("Data berhasil diperbarui");

        // Refresh data kartu di belakang TANPA menahan UI (toast saja, modal tetap terbuka).
        this.refreshAchievement();
        return true;
      } catch (error) {
        console.log("err: ", error);
        _utils().onError(error);
        return false;
      }
    },

    async deleteRow(schedule_id: string | number) {
      try {
        const res = await removeData(schedule_id);
        if (res.status !== 200) {
          _ns().showDialogWarning("Warning", "Terjadi kesalahan saat menghapus data");
          return;
        }

        _ns().showAlertSuccess("Data berhasil dihapus");
        await this.refreshAchievement();
      } catch (error) {
        console.log("err: ", error);
        _utils().onError(error);
      }
    },

    // Process Actions
    async startRunningItem(schedule_id: string | number) {
      try {
        await startRunning(schedule_id);
        await this.refreshAchievement();
      } catch (error) { _utils().onError(error); }
    },
    async stopRunningItem(schedule_id: string | number) {
      try {
        await stopRunning(schedule_id);
        await this.refreshAchievement();
      } catch (error) { _utils().onError(error); }
    },
    async startProcessItem(schedule_id: string | number) {
      try {
        await startProcess(schedule_id);
        await this.refreshAchievement();
      } catch (error) { _utils().onError(error); }
    },
    async stopProcessItem(schedule_id: string | number) {
      try {
        await stopProcess(schedule_id);
        await this.refreshAchievement();
      } catch (error) { _utils().onError(error); }
    },
    async moveItem(schedule_id: string | number, direction: 'up' | 'down') {
      try {
        await moveUrut(schedule_id, direction);
        await this.refreshAchievement();
      } catch (error) { _utils().onError(error); }
    },

    async uploadFileXlsx(file: File) {
      try {
        _ns().loading = true;
        const res = await importExcel(file);
        if (res.status !== 200) {
          _ns().showDialogWarning("Warning", "Terjadi kesalahan saat upload data");
          return;
        }

        await this.refreshAchievement();
        _ns().showDialogWarning("Information", res.data.messages || "Berhasil import data report");
      } catch (error) {
        console.log("err: ", error);
        _utils().onError(error);
      } finally {
        _ns().disableLoading();
      }
    },
  }
});