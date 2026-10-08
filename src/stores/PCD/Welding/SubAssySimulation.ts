import { defineStore } from "pinia";
import { getSubAssyRobots, getSubAssyLoad, postSubAssyAutoBalance } from "@/services/PCD/Welding/SubAssySimulation";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { SubAssyRobot, SubAssyPartLoad, SubAssySummaryByMachine, GunType } from "@/types/PCD/Welding/SubAssySimulation";

export const useSubAssySimulationStore = defineStore("SubAssySimulationStore", {
  state: () => ({
    robots: [] as SubAssyRobot[],
    loads: [] as SubAssyPartLoad[],
    summary: [] as SubAssySummaryByMachine[],
    loading: false,
    autoBalanceLoading: false,
    selectedSimulationId: 96 as number | string,
    ctMode: 'HITUNG' as 'HITUNG' | 'TERSIMPAN',
    selectedRobot: null as string | null,
    searchQuery: '',
    movementHistory: [] as any[]
  }),

  getters: {
    totalRobots: (state) => state.robots.length,
    gunCRobots: (state) => state.robots.filter(r => r.gun_type === 'GUN C'),
    gunXRobots: (state) => state.robots.filter(r => r.gun_type === 'GUN X'),
    gunXCRobots: (state) => state.robots.filter(r => r.gun_type === 'GUN X&C'),
    
    overloadedRobots: (state) => state.summary.filter(s => s.tpt > 16.0),
    warningRobots: (state) => state.summary.filter(s => s.tpt > 11.0 && s.tpt <= 16.0),
    normalRobots: (state) => state.summary.filter(s => s.tpt <= 11.0),

    filteredLoads: (state) => {
      let res = state.loads;
      if (state.selectedRobot) {
        res = res.filter(l => l.machine_use === state.selectedRobot);
      }
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        res = res.filter(l => 
          l.part_number.toLowerCase().includes(q) || 
          (l.job_number && l.job_number.toLowerCase().includes(q)) ||
          (l.model && l.model.toLowerCase().includes(q))
        );
      }
      return res;
    }
  },

  actions: {
    async fetchRobots() {
      try {
        const res = await getSubAssyRobots();
        if (res.data?.status === "success") {
          this.robots = res.data.data;
        }
      } catch (err) {
        console.error("Error fetching Sub Assy robots:", err);
      }
    },

    async fetchLoads(id_simulation: number | string = 96, ct_mode: 'HITUNG' | 'TERSIMPAN' = 'HITUNG') {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      this.selectedSimulationId = id_simulation;
      this.ctMode = ct_mode;

      try {
        this.loading = true;
        if (this.robots.length === 0) {
          await this.fetchRobots();
        }

        const res = await getSubAssyLoad(id_simulation, ct_mode);
        if (res.data?.status === "success") {
          this.loads = res.data.data;
          this.computeSummary();
        } else {
          notificationStore.showDialogWarning("Warning", res.data?.message || "Gagal mengambil data beban Sub Assy");
        }
      } catch (err) {
        console.error("Error fetching Sub Assy loads:", err);
        utilityStore.onError(err);
      } finally {
        this.loading = false;
      }
    },

    computeSummary() {
      const robotMap = new Map<string, SubAssySummaryByMachine>();

      // Initialize all master robots
      for (const r of this.robots) {
        const dtRaw = Number(r.downtime_min ?? 0.3833);
        const dtJam = dtRaw > 1.0 ? dtRaw / 60.0 : dtRaw;
        robotMap.set(r.machine, {
          machine: r.machine,
          gun_type: r.gun_type,
          pcs_day: 0,
          stroke_day: 0,
          prod_time: 0,
          dandori: 0,
          downtime: Number(dtJam.toFixed(4)),
          tip_change: 0,
          tpt: 0,
          uph: 0,
          beban_persen: 0,
          is_overload: 0
        });
      }

      // Sum from loads
      for (const item of this.loads) {
        const mach = item.machine_use;
        if (!robotMap.has(mach)) {
          robotMap.set(mach, {
            machine: mach,
            gun_type: 'GUN X',
            pcs_day: 0,
            stroke_day: 0,
            prod_time: 0,
            dandori: 0,
            downtime: 0.3833,
            tip_change: 0,
            tpt: 0,
            uph: 0,
            beban_persen: 0,
            is_overload: 0
          });
        }

        const sum = robotMap.get(mach)!;
        sum.pcs_day += Number(item.pcs_day || 0);
        sum.stroke_day += Number(item.stroke_day || 0);
        sum.prod_time += Number(item.prod_time || 0);
        sum.dandori += Number(item.dandori || 0) / 60.0;
        sum.tip_change += Number(item.tip_change || 0);
      }

      // Finalize hours and percentages
      for (const sum of robotMap.values()) {
        sum.prod_time = Number(sum.prod_time.toFixed(4));
        sum.dandori = Number(sum.dandori.toFixed(4));
        sum.tip_change = Number(sum.tip_change.toFixed(4));
        sum.tpt = Number((sum.prod_time + sum.dandori + sum.tip_change + sum.downtime).toFixed(4));
        sum.uph = sum.tpt > 0 ? Number((sum.pcs_day / sum.tpt).toFixed(1)) : 0;
        sum.beban_persen = Number(((sum.tpt / 16.0) * 100.0).toFixed(1));
        sum.is_overload = sum.tpt > 16.0 ? 1 : 0;
      }

      this.summary = Array.from(robotMap.values());
    },

    isGunCompatible(sourceGun: GunType, targetMachine: string): boolean {
      const target = this.robots.find(r => r.machine === targetMachine);
      if (!target) return false;
      if (target.gun_type === 'GUN X&C') return true;
      return target.gun_type === sourceGun;
    },

    movePartLocal(partId: number, targetMachine: string): boolean {
      const part = this.loads.find(p => p.id === partId);
      if (!part) return false;

      const sourceGun = (part.gun_type || 'GUN X') as GunType;
      if (!this.isGunCompatible(sourceGun, targetMachine)) {
        const notificationStore = useNotificationStore();
        notificationStore.showDialogWarning(
          "Incompatible Gun Type",
          `Part dengan tipe ${sourceGun} tidak kompatibel dengan robot ${targetMachine}!`
        );
        return false;
      }

      part.machine_prev = part.machine_use;
      part.machine_use = targetMachine;
      this.computeSummary();
      return true;
    },

    async runAutoBalance() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      try {
        this.autoBalanceLoading = true;
        const res = await postSubAssyAutoBalance(this.selectedSimulationId, this.ctMode, 'user');
        if (res.data?.status === "success") {
          notificationStore.showDialogSuccess(
            "Auto Balance Berhasil",
            `Berhasil menyeimbangkan ${res.data.moves_count} pergerakan part Sub Assy!`
          );
          await this.fetchLoads(this.selectedSimulationId, this.ctMode);
        } else {
          notificationStore.showDialogWarning("Gagal", res.data?.message || "Gagal melakukan auto balance");
        }
      } catch (err) {
        console.error("Error auto-balancing Sub Assy:", err);
        utilityStore.onError(err);
      } finally {
        this.autoBalanceLoading = false;
      }
    }
  }
});
