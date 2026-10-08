import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import {
  getStatusPatanDetail, 
  getSimulationList, 
  getSimulationPartById,
  getSimulationGraphicSummary,
  getAreaList, 
  getCreateFromMaster, 
  postSimulation, 
  getSimulationLive,
  getSimulationLiveSummary,
  getSimulationLoadByMachine,
  updateSimulation,
  getActiveMachines,
  updateMachineLoad,
  updateMachineLoadBatch,
  deleteSimulation,
  updateSimulationStatus,
  getLinesByArea,
  getSimulationLineDetail,
  autoSimulationBalance,
  getBalancingDiagnostics,
  calculateProductionTimes,
  adjustProdTime
} from "@/services/PCD/Welding/Simulation";
import { getSpecMachine } from "@/services/Welding/Master/SpecMachine";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { SimulationHeader, SimulationLoad, SimulationDetail, AreaOption, MachineOption, SimulationCreateLoad, CreateSimulationPayload } from "@/types/PCD/Welding/Simulation";

export const useGlcSimulationStore = defineStore("GlcSimulationStore", {
  state: () => ({
    dataTable: [] as SimulationHeader[],
    loading: false,
    detailLoading: false,
    isModalDetailOpen: false,
    selectedSimulation: null as SimulationDetail | null,
    
    // Creation Flow State
    isModalCreateOpen: false,
    isModalDataSourceOpen: false,
    createLoading: false,
    areaOptions: [] as AreaOption[],
    machineOptions: [] as MachineOption[],
    activeMachineOptions: [] as MachineOption[],
    createData: [] as SimulationCreateLoad[],
    createForm: {
      area: '',
      periode: '',
      note: ''
    },
    
    // Live Dashboard State
    liveSummaryData: [] as any[],
    liveSummaryLoading: false,
    liveSummaryId: null as number | null,
    
    // Summary State
    step: 1,
    currentSimulationId: null as number | null,
    summaryData: [] as any[],
    machinePartData: [] as any[],
    machinePartLoading: false,
    lastAutoBalanceResult: null as any,
    balancingDiagnostics: [] as any[],
    diagnosticsLoading: false,
    balancingMode: 'balanced' as 'balanced' | 'shift_target',

    // Edit Flow State
    editLoading: false,
    editData: [] as SimulationCreateLoad[],
    editForm: {
      area: '',
      periode: '',
      note: ''
    },
    lineOptions: [] as string[],
    lineDetailData: null as any,
    lineDetailLoading: false,
    inactiveMachineInUseData: [] as any[],
    inactiveMachineInUseLoading: false
  }),
  actions: {
    async getStatusPatanDetail(id_simulation: number | string, part_number: string, process?: any) {
      try {
        const res: any = await getStatusPatanDetail(id_simulation, part_number, process);
        if (res.data?.status === "success" || res.status === "success") {
          return res.data?.data || res.data || [];
        }
        return [];
      } catch (err) {
        console.error("Error fetching status patan detail:", err);
        return [];
      }
    },
    async fetchSimulationList(filters?: { area?: string; periode?: string; status?: string; is_active?: string }) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      
      try {
        this.loading = true;
        const res = await getSimulationList(filters?.area, filters?.periode, filters?.status, filters?.is_active);
        
        if (res.data.status === "success") {
          this.dataTable = res.data.data;
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengambil data simulasi");
        }
      } catch (error) {
        console.error("Error fetching simulation list:", error);
        utilityStore.onError(error);
      } finally {
        this.loading = false;
      }
    },
    
    async fetchSimulationPartById(id: number | string, status_filter = 'DETAIL') {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      
      try {
        const res = await getSimulationPartById(id, status_filter);
        
        if (res.data.status === "success") {
          if (!this.selectedSimulation) {
            this.selectedSimulation = { header: res.data.header, loads: res.data.loads, summary: [] };
          } else {
            this.selectedSimulation.header = res.data.header;
            this.selectedSimulation.loads = res.data.loads;
          }
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengambil part simulasi");
        }
      } catch (error) {
        console.error("Error fetching simulation part:", error);
        utilityStore.onError(error);
      }
    },

    async fetchSimulationGraphicSummary(id: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      
      try {
        const res = await getSimulationGraphicSummary(id);
        
        if (res.data.status === "success") {
          const list = [...(res.data.summary || [])].sort((a: any, b: any) =>
            String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
          );
          if (!this.selectedSimulation) {
            this.selectedSimulation = { header: {} as any, loads: [], summary: list };
          } else {
            this.selectedSimulation.summary = list;
          }
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengambil summary simulasi");
        }
      } catch (error) {
        console.error("Error fetching graphic summary:", error);
        utilityStore.onError(error);
      }
    },

    async fetchSimulationDetail(id: number | string) {
      this.detailLoading = true;
      this.selectedSimulation = null;
      
      try {
        const [resPart, resSummary] = await Promise.all([
          getSimulationPartById(id, 'DETAIL'),
          getSimulationGraphicSummary(id)
        ]);
        
        let header = resPart?.data?.header || {};
        const loads = resPart?.data?.loads || [];
        let summary = resSummary?.data?.summary || [];
        
        // Fallback jika header tidak didapat dari getSimulationPartById
        if (!header || !header.id) {
          const resList = await getSimulationList();
          header = resList.data.data?.find((x: any) => String(x.id) === String(id)) || {};
        }

        // Fallback: Jika summary dari API kosong, hitung otomatis dari loads
        if ((!summary || summary.length === 0) && Array.isArray(loads) && loads.length > 0) {
          const area = String(header.area || '').toUpperCase().trim();
          const isSubAssy = ['SUB ASSY', 'SUBASSY', 'SA ADM'].includes(area);

          if (isSubAssy) {
            const robotSet = new Set<string>();
            let specMap: Record<string, any> = {};
            try {
              const specRes = await getSpecMachine();
              if (specRes?.data?.data && Array.isArray(specRes.data.data)) {
                specRes.data.data.forEach((s: any) => {
                  if (s.machine) {
                    const m = String(s.machine).trim();
                    specMap[m] = s;
                    const sArea = String(s.area || '').toUpperCase();
                    if (sArea === 'SA ADM' || sArea.includes('SUB ASSY') || String(s.line || '').includes('ROBOT')) {
                      robotSet.add(m);
                    }
                  }
                });
              }
            } catch (e) {
              console.warn("Could not fetch spec machine for fallback calculation:", e);
            }

            loads.forEach((l: any) => {
              const m = String(l.machine_use || l.machine || '').trim();
              if (m) robotSet.add(m);
            });

            const robotList = Array.from(robotSet).sort((a, b) =>
              a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            );

            summary = robotList.map((mach: string) => {
              const mLoads = loads.filter((l: any) => String(l.machine_use || l.machine || '').trim() === mach);
              const seenParts = new Set<string>();
              let totPcs = 0;
              let totStroke = 0;
              let totTeiki = 0;

              mLoads.forEach((l: any) => {
                const pn = String(l.part_number || '').trim();
                const pcs = Number(l.pcs_day || 0);
                const ct = Number(l.cycle_time_sec || 0);
                const spot = Number(l.jumlah_spot || 0);
                let stroke = Number(l.stroke_day || 0);
                if (stroke <= 0 && spot > 0) stroke = pcs * spot;

                const teiki = (ct * pcs * 1.1) / 3600;
                totStroke += stroke;
                totTeiki += teiki;

                if (pn && !seenParts.has(pn)) {
                  seenParts.add(pn);
                  totPcs += pcs;
                }
              });

              const spec = specMap[mach] || {};
              const isMach4 = mach === 'RSW4' || mach === 'RSW-4' || mach === 'RB4' || mach === 'RB-4';
              const strokePerDress = Number(spec.stroke_dress || (isMach4 ? 190 : 350));
              const dressPerTc = Number(spec.dress_tip_change || (isMach4 ? 20 : 2450));
              const dresserJam = strokePerDress > 0 ? ((totStroke / strokePerDress) * 40) / 3600 : 0;
              const tcJam = strokePerDress > 0 && dressPerTc > 0 ? (((totStroke / strokePerDress) / dressPerTc) * 60) / 3600 : 0;
              const tipDressTot = Number((dresserJam + tcJam).toFixed(4));
              const dtJam = Number((spec.downtime_min !== undefined ? spec.downtime_min : (spec.downtime || 0.3833)));
              const prodFinal = Number(totTeiki.toFixed(4));
              const tpt = Number((prodFinal + tipDressTot + dtJam).toFixed(4));
              const uph = tpt > 0 ? Number((totPcs / tpt).toFixed(1)) : 0;

              return {
                id_simulation: id,
                machine: mach,
                pcs_day: totPcs,
                stroke_day: totStroke,
                prod_time: prodFinal,
                prod_time_adjust: 0,
                prod_time_final: prodFinal,
                dandori: 0,
                downtime: dtJam,
                tip_change: tipDressTot,
                tc: tipDressTot,
                teiryo: 0,
                tpt: tpt,
                uph: uph,
                wt_1_shift: 8,
                wt_1_shift_pjk: 11,
                wt_2_shift: 16,
                wt_2_shift_pjk1s: 19,
                wt_2_shift_pjk2s: 21,
                working_day: 24,
                mp: tpt > 11 ? 2 : 1,
                item: seenParts.size || mLoads.length
              };
            });
          } else {
            const machineMap: Record<string, any[]> = {};
            loads.forEach((l: any) => {
              const m = String(l.machine_use || l.machine || '-').trim();
              if (!machineMap[m]) machineMap[m] = [];
              machineMap[m].push(l);
            });

            summary = Object.keys(machineMap).sort((a, b) =>
              a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            ).map((mach: string) => {
              const mLoads = machineMap[mach];
              let totPcs = 0;
              let totDandori = 0;
              let totDowntime = 0;
              let totTc = 0;
              let totProd = 0;
              let totTpt = 0;

              mLoads.forEach((l: any) => {
                totPcs += Number(l.pcs_day || 0);
                totDandori += Number(l.dandori || 0);
                totDowntime += Number(l.downtime || 0);
                const partTc = Number(l.tip_change || l.tc || 0);
                if (partTc > 0) totTc += partTc;
                totProd += Number(l.prod_time || 0);
                totTpt += Number(l.tpt || 0);
              });

              const dtJam = Number((totDowntime > 50 ? totDowntime / 60 : totDowntime).toFixed(1));
              const ddJam = Number((totDandori > 50 ? totDandori / 60 : totDandori).toFixed(1));
              const tcJam = Number((totTc > 50 ? totTc / 60 : (totTc > 0 ? (totTc > 1 ? totTc / 60 : totTc) : 0.10)).toFixed(2));
              const ptJam = Number((totProd > 50 ? totProd / 60 : totProd).toFixed(1));
              const tptJam = Number((totTpt > 50 ? totTpt / 60 : (totTpt || (ptJam + dtJam + ddJam + tcJam))).toFixed(1));
              const uph = tptJam > 0 ? Number((totPcs / tptJam).toFixed(1)) : 0;

              return {
                id_simulation: id,
                machine: mach,
                pcs_day: totPcs,
                prod_time: ptJam,
                prod_time_adjust: 0,
                prod_time_final: ptJam,
                dandori: ddJam,
                downtime: dtJam,
                tip_change: tcJam,
                tc: tcJam,
                teiryo: 0,
                tpt: tptJam,
                uph: uph,
                wt_1_shift: 8,
                wt_1_shift_pjk: 11,
                wt_2_shift: 16,
                wt_2_shift_pjk1s: 19,
                wt_2_shift_pjk2s: 21,
                working_day: 24,
                item: mLoads.length
              };
            });
          }
        }

        // Sort summary by machine name naturally
        if (Array.isArray(summary) && summary.length > 0) {
          summary = [...summary].sort((a: any, b: any) =>
            String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
          );
        }
        
        this.selectedSimulation = {
          header: header,
          loads: loads,
          summary: summary
        };
      } catch (error) {
        console.error("Error in fetchSimulationDetail:", error);
      } finally {
        this.detailLoading = false;
        this.isModalDetailOpen = true;
      }
    },

    async fetchAreaList() {
      const utilityStore = useUtilityStore();
      try {
        const res = await getAreaList();
        if (res.data.status === "success") {
          this.areaOptions = res.data.data;
        }
      } catch (error) {
        console.error("Error fetching area:", error);
        utilityStore.onError(error);
      }
    },

    async fetchLinesByArea(area: string) {
      const utilityStore = useUtilityStore();
      try {
        const res = await getLinesByArea(area);
        if (res.data.status === "success") {
          this.lineOptions = res.data.lines;
        } else {
          this.lineOptions = [];
        }
      } catch (error) {
        console.error("Error fetching lines:", error);
        utilityStore.onError(error);
      }
    },

    async fetchSimulationLineDetail(id_simulation: number | string, line: string) {
      const utilityStore = useUtilityStore();
      const notificationStore = useNotificationStore();
      try {
        this.lineDetailLoading = true;
        const res = await getSimulationLineDetail(id_simulation, line);
        if (res.data.status === "success") {
          const data = res.data.data;
          if (data && Array.isArray(data.machines)) {
            const seen = new Set();
            data.machines = data.machines.filter((m: any) => {
              const name = m.machine || '';
              if (!name || seen.has(name)) return false;
              seen.add(name);
              return true;
            });
          }
          this.lineDetailData = data;
        } else {
          this.lineDetailData = null;
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal memuat detail line");
        }
      } catch (error) {
        console.error("Error fetching line detail:", error);
        utilityStore.onError(error);
      } finally {
        this.lineDetailLoading = false;
      }
    },

    async fetchActiveMachines(area?: string) {
      const utilityStore = useUtilityStore();
      try {
        const res = await getActiveMachines(area);
        if (res.data.status === "success") {
          this.activeMachineOptions = res.data.machines || res.data.data || [];
        }
      } catch (error) {
        console.error("Error fetching active machines:", error);
        utilityStore.onError(error);
      }
    },

    async fetchCreateFromMaster(area: string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        this.createLoading = true;
        const res = await getCreateFromMaster(area);
        
        if (res.data.status === "success") {
          this.machineOptions = res.data.machines;
          this.activeMachineOptions = res.data.machines || [];
          // Map parts to SimulationCreateLoad format
          this.createData = res.data.parts.map((p: any) => {
            const machine_master = p.machine_master || p.machine || p.machine_raw || p.wsm_machine || '';
            const machine_sim_load = p.machine_sim_load || machine_master;
            const machine_use = machine_master;
            const matchedMachine = this.machineOptions.find((m: any) => m.machine === machine_use);
            
            return {
              ...p,
              selected: true,
              machine_master,
              machine_sim_load,
              machine_prev_sim_load: p.machine_prev_sim_load || '',
              last_sim_periode: p.last_sim_periode || '',
              machine_use,
              machine_prev: '', // default empty or null
              lot_cycle: p.lot_cycle || 1,
              lot_size_shift: p.lot_size_shift || 0,
              cycle_time_sec: p.cycle_time_sec || 0,
              dandori: p.dandori !== undefined ? Number(p.dandori) : 5.0,
              downtime: p.downtime !== undefined ? Number(p.downtime) : 0.2,
              tip_change: p.tip_change !== undefined ? Number(p.tip_change) : 0.1,
              pcs_day: p.pcs_day_monthly !== undefined ? Number(p.pcs_day_monthly) : (p.pcs_day || 0),
              upper_holder: matchedMachine ? matchedMachine.upper_holder : (p.upper_holder || null),
              lower_holder: matchedMachine ? matchedMachine.lower_holder : (p.lower_holder || null),
              kva: matchedMachine ? matchedMachine.kva : (p.kva || null),
              part_top_parent: p.part_top_parent || p.top_parent_part_number || p.part_number_delivery || '-'
            };
          });
          this.createForm.area = area;
          this.isModalDataSourceOpen = false;
          this.isModalCreateOpen = true;
          this.step = 1;
          this.currentSimulationId = null;
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengambil data dari master");
        }
      } catch (error) {
        console.error("Error fetching from master:", error);
        utilityStore.onError(error);
      } finally {
        this.createLoading = false;
      }
    },

    async fetchSimulationLive(area?: string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        this.createLoading = true;
        const res = await getSimulationLive(area);
        
        if (res.data.status === "success") {
          // If the backend doesn't supply machines list in Live endpoint, we might need to fetch it separately or assume it's there
          // To be safe, fetch Area list or just Master list for machines? Wait, we can fetch active machines separately if needed.
          // But for now, just map the loads:
          this.createData = res.data.loads.map((l: any) => ({
            ...l,
            selected: true
          }));
          this.createForm.area = res.data.header.area;
          this.isModalDataSourceOpen = false;
          this.isModalCreateOpen = true;
          this.step = 1;
          this.currentSimulationId = null;
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Tidak ada data Live");
        }
      } catch (error) {
        console.error("Error fetching live simulation:", error);
        utilityStore.onError(error);
      } finally {
        this.createLoading = false;
      }
    },

    async fetchSimulationFromExisting(id: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        this.createLoading = true;
        const res = await getSimulationPartById(id);
        
        if (res.data.status === "success" && res.data.loads) {
          const area = res.data.header?.area || 'WSS ADM';
          await this.fetchActiveMachines(area);
          this.machineOptions = this.activeMachineOptions;
          this.createData = res.data.loads.map((l: any) => {
            const machine_use = l.machine_use || l.machine || '';
            const matchedMachine = this.activeMachineOptions.find((m: any) => m.machine === machine_use);
            
            return {
              ...l,
              selected: true,
              machine_use,
              machine_prev: l.machine_prev || '',
              lot_cycle: l.lot_cycle || 1,
              lot_size_shift: l.lot_size_shift || 0,
              cycle_time_sec: l.cycle_time_sec || 0,
              dandori: l.dandori || 0,
              downtime: l.downtime || 0,
              pcs_day: l.pcs_day || (l.pcs_day_monthly ? Number(l.pcs_day_monthly) : 0),
              upper_holder: matchedMachine ? matchedMachine.upper_holder : (l.upper_holder || null),
              lower_holder: matchedMachine ? matchedMachine.lower_holder : (l.lower_holder || null),
              kva: matchedMachine ? matchedMachine.kva : (l.kva || null)
            };
          });
          this.createForm.area = res.data.header.area || '';
          this.createForm.periode = res.data.header.periode || '';
          this.createForm.note = res.data.header.note ? `${res.data.header.note} (Copy)` : '';
          this.isModalDataSourceOpen = false;
          this.isModalCreateOpen = true;
          this.step = 1;
          this.currentSimulationId = null;
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengambil data simulasi existing");
        }
      } catch (error) {
        console.error("Error fetching simulation from existing:", error);
        utilityStore.onError(error);
      } finally {
        this.createLoading = false;
      }
    },

    async saveSimulation(created_by?: string) {
      const authStore = useAuthStore();
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      const activeUser = (authStore.user as any)?.username || (authStore.user as any)?.fullname || (authStore.user as any)?.first_name || (created_by && created_by !== 'SYSTEM' ? created_by : 'SYSTEM');

      try {
        this.createLoading = true;
        const payload: CreateSimulationPayload = {
          area: this.createForm.area,
          periode: this.createForm.periode,
          note: this.createForm.note,
          created_by: activeUser,
          loads: this.createData.filter((d: any) => d.selected !== false && !d.is_deleted)
        };

        const res: any = await postSimulation(payload);
        // The service returns response.data directly, so 'res' is the parsed payload.
        if (res.status === "success" || res.data?.status === "success") {
          const successMessage = res.message || res.data?.message || "Simulasi berhasil disimpan";
          const idSim = res.id_simulation || res.data?.id_simulation;
          
          notificationStore.showDialogSuccess("Sukses", successMessage);
          
          this.currentSimulationId = idSim;
          
          // Re-fetch parts dari database agar kita mendapatkan ID baris glc_simulation_load asli (bukan ID ms_welding)
          const { getSimulationPartById } = await import('@/services/PCD/Welding/Simulation');
          const detailRes = await getSimulationPartById(idSim, 'DETAIL');
          if (detailRes.data.status === "success" && detailRes.data.loads) {
            const rawLoads = detailRes.data.loads || [];
            const hasDetailRows = rawLoads.some((l: any) => l.status_patan === 'DETAIL');
            const detailOnlyLoads = hasDetailRows ? rawLoads.filter((l: any) => l.status_patan === 'DETAIL') : rawLoads;
            this.createData = detailOnlyLoads.map((l: any) => {
              const machine_use = l.machine_use || l.machine || '';
              const matchedMachine = this.activeMachineOptions.find((m: any) => m.machine === machine_use);
              return {
                ...l,
                selected: true,
                machine_use,
                machine_prev: l.machine_prev || '',
                lot_cycle: l.lot_cycle || 1,
                lot_size_shift: l.lot_size_shift || 0,
                cycle_time_sec: l.cycle_time_sec || 0,
                dandori: l.dandori || 0,
                downtime: l.downtime || 0,
                pcs_day: l.pcs_day || (l.pcs_day_monthly ? Number(l.pcs_day_monthly) : 0),
                upper_holder: matchedMachine ? matchedMachine.upper_holder : (l.upper_holder || null),
                lower_holder: matchedMachine ? matchedMachine.lower_holder : (l.lower_holder || null),
                kva: matchedMachine ? matchedMachine.kva : (l.kva || null),
                part_top_parent: l.part_top_parent || l.part_parent || l.top_parent_part_number || '-'
              };
            });
          }

          this.step = 2; // move to step 2
          return true;
        } else {
          const errorMessage = res.message || res.data?.message || "Gagal menyimpan simulasi";
          notificationStore.showDialogError("Error", errorMessage);
          return false;
        }
      } catch (error) {
        console.error("Error saving simulation:", error);
        utilityStore.onError(error);
        return false;
      } finally {
        this.createLoading = false;
      }
    },

    async fetchSummaryData(id_simulation: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        this.createLoading = true;
        let list: any[] = [];

        try {
          const res = await getSimulationGraphicSummary(id_simulation);
          if (res.data.status === "success" && Array.isArray(res.data.summary) && res.data.summary.length > 0) {
            list = res.data.summary;
          }
        } catch (e) {
          console.warn("Could not fetch graphic summary directly, will check Sub Assy fallback:", e);
        }

        // If summary is returned from backend, use it directly (same as in SubAssySimulationDetail)
        if (list.length === 0) {
          let loads: any[] = [];
          
          try {
            const { getSubAssyLoad } = await import('@/services/PCD/Welding/SubAssySimulation');
            const subRes = await getSubAssyLoad(id_simulation, 'HITUNG');
            if (subRes.data?.status === 'success' && Array.isArray(subRes.data.data) && subRes.data.data.length > 0) {
              loads = subRes.data.data;
            }
          } catch (e) {
            console.warn("Could not fetch getSubAssyLoad:", e);
          }

          if (loads.length === 0) {
            try {
              const partRes = await getSimulationPartById(id_simulation, 'DETAIL');
              loads = partRes.data?.loads || [];
            } catch (e) {
              console.warn("Could not fetch simulation parts for summary calculation:", e);
            }
          }

          if (loads.length === 0 && Array.isArray(this.createData) && this.createData.length > 0) {
            loads = this.createData;
          } else if (loads.length === 0 && Array.isArray(this.editData) && this.editData.length > 0) {
            loads = this.editData;
          }

          if (loads.length > 0) {
            const area = String(this.createForm.area || this.editForm.area || this.selectedSimulation?.header?.area || '').toUpperCase().trim();
            const isSubAssy = !area || ['SUB ASSY', 'SUBASSY', 'SA ADM'].includes(area) || loads.some((l: any) => String(l.machine_use || l.machine || '').startsWith('RB-'));

            if (isSubAssy) {
              const robotSet = new Set<string>();
              let specMap: Record<string, any> = {};
              try {
                const specRes = await getSpecMachine();
                if (specRes?.data?.data && Array.isArray(specRes.data.data)) {
                  specRes.data.data.forEach((s: any) => {
                    if (s.machine) {
                      const m = String(s.machine).trim();
                      specMap[m] = s;
                      const sArea = String(s.area || '').toUpperCase();
                      if (sArea === 'SA ADM' || sArea.includes('SUB ASSY') || String(s.line || '').includes('ROBOT')) {
                        robotSet.add(m);
                      }
                    }
                  });
                }
              } catch (e) {
                console.warn("Could not fetch spec machine for fallback calculation:", e);
              }

              loads.forEach((l: any) => {
                const m = String(l.machine_use || l.machine || '').trim();
                if (m) robotSet.add(m);
              });

              const robotList = Array.from(robotSet).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
              );

              list = robotList.map((mach: string) => {
                const mLoads = loads.filter((l: any) => String(l.machine_use || l.machine || '').trim() === mach);
                const seenParts = new Set<string>();
                let totPcs = 0;
                let totStroke = 0;
                let totTeiki = 0;

                mLoads.forEach((l: any) => {
                  const pn = String(l.part_number || '').trim();
                  const pcs = Number(l.pcs_day || 0);
                  const ct = Number(l.cycle_time_sec || 0);
                  const spot = Number(l.jumlah_spot || 0);
                  let stroke = Number(l.stroke_day || 0);
                  if (stroke <= 0 && spot > 0) stroke = pcs * spot;

                  const teiki = (ct * pcs * 1.1) / 3600;
                  totStroke += stroke;
                  totTeiki += teiki;

                  if (pn && !seenParts.has(pn)) {
                    seenParts.add(pn);
                    totPcs += pcs;
                  }
                });

                const spec = specMap[mach] || {};
                const isMach4 = mach === 'RSW4' || mach === 'RSW-4' || mach === 'RB4' || mach === 'RB-4';
                const strokePerDress = Number(spec.stroke_dress || (isMach4 ? 190 : 350));
                const dressPerTc = Number(spec.dress_tip_change || (isMach4 ? 20 : 2450));
                const dresserJam = strokePerDress > 0 ? ((totStroke / strokePerDress) * 40) / 3600 : 0;
                const tcJam = strokePerDress > 0 && dressPerTc > 0 ? (((totStroke / strokePerDress) / dressPerTc) * 60) / 3600 : 0;
                const tipDressTot = Number((dresserJam + tcJam).toFixed(4));
                const dtJam = Number((spec.downtime_min !== undefined ? spec.downtime_min : (spec.downtime || 0.3833)));
                const prodFinal = Number(totTeiki.toFixed(4));
                const tpt = Number((prodFinal + tipDressTot + dtJam).toFixed(4));
                const uph = tpt > 0 ? Number((totPcs / tpt).toFixed(1)) : 0;

                return {
                  id_simulation: id_simulation,
                  machine: mach,
                  pcs_day: totPcs,
                  stroke_day: totStroke,
                  prod_time: prodFinal,
                  prod_time_adjust: 0,
                  prod_time_final: prodFinal,
                  dandori: 0,
                  downtime: dtJam,
                  tip_change: tipDressTot,
                  tc: tipDressTot,
                  teiryo: 0,
                  tpt: tpt,
                  uph: uph,
                  wt_1_shift: 8,
                  wt_1_shift_pjk: 11,
                  wt_2_shift: 16,
                  wt_2_shift_pjk1s: 19,
                  wt_2_shift_pjk2s: 21,
                  working_day: 24,
                  mp: tpt > 11 ? 2 : 1,
                  item: seenParts.size || mLoads.length
                };
              });
            } else {
              const machineMap: Record<string, any[]> = {};
              loads.forEach((l: any) => {
                const m = String(l.machine_use || l.machine || '-').trim();
                if (!machineMap[m]) machineMap[m] = [];
                machineMap[m].push(l);
              });

              list = Object.keys(machineMap).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
              ).map((mach: string) => {
                const mLoads = machineMap[mach];
                let totPcs = 0;
                let totDandori = 0;
                let totDowntime = 0;
                let totTc = 0;
                let totProd = 0;
                let totTpt = 0;

                mLoads.forEach((l: any) => {
                  totPcs += Number(l.pcs_day_monthly || l.pcs_day || 0);
                  totDandori += Number(l.dandori || 0);
                  totDowntime += Number(l.downtime || 0);
                  const partTc = Number(l.tip_change || l.tc || 0);
                  if (partTc > 0) totTc += partTc;
                  totProd += Number(l.prod_time || 0);
                  totTpt += Number(l.tpt || 0);
                });

                const dtJam = Number((totDowntime > 50 ? totDowntime / 60 : totDowntime).toFixed(2));
                const ddJam = Number((totDandori > 50 ? totDandori / 60 : totDandori).toFixed(2));
                const tcJam = Number((totTc > 50 ? totTc / 60 : (totTc > 0 ? (totTc > 1 ? totTc / 60 : totTc) : 0.10)).toFixed(2));
                const ptJam = Number((totProd > 50 ? totProd / 60 : totProd).toFixed(2));
                const tptJam = Number((totTpt > 50 ? totTpt / 60 : (totTpt || (ptJam + dtJam + ddJam + tcJam))).toFixed(2));
                const uph = tptJam > 0 ? Number((totPcs / tptJam).toFixed(1)) : 0;

                return {
                  id_simulation: id_simulation,
                  machine: mach,
                  pcs_day: totPcs,
                  prod_time: ptJam,
                  prod_time_adjust: 0,
                  prod_time_final: ptJam,
                  dandori: ddJam,
                  downtime: dtJam,
                  tip_change: tcJam,
                  tc: tcJam,
                  teiryo: 0,
                  tpt: tptJam,
                  uph: uph,
                  wt_1_shift: 8,
                  wt_1_shift_pjk: 11,
                  wt_2_shift: 16,
                  wt_2_shift_pjk1s: 19,
                  wt_2_shift_pjk2s: 21,
                  working_day: 24,
                  item: mLoads.length
                };
              });
            }
          }
        }

        this.summaryData = [...list].sort((a: any, b: any) =>
          String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
        );
      } catch (error) {
        console.error("Error fetching simulation summary:", error);
        utilityStore.onError(error);
      } finally {
        this.createLoading = false;
      }
    },

    async fetchSimulationLoadByMachine(id_simulation: number | string, machine: string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        this.machinePartLoading = true;
        let parts: any[] = [];

        try {
          const res: any = await getSimulationLoadByMachine(id_simulation, machine);
          if ((res.status === "success" || res.data?.status === "success") && Array.isArray(res.parts || res.data?.parts) && (res.parts || res.data?.parts).length > 0) {
            parts = res.parts || res.data?.parts;
          }
        } catch (e) {
          console.warn("Could not fetch parts via getSimulationLoadByMachine:", e);
        }

        // Sub Assy fallback: fetch from SubAssyLoad or SimulationPartById
        if (parts.length === 0) {
          try {
            const { getSubAssyLoad } = await import('@/services/PCD/Welding/SubAssySimulation');
            const subRes = await getSubAssyLoad(id_simulation, 'HITUNG');
            if (subRes.data?.status === 'success' && Array.isArray(subRes.data.data)) {
              parts = subRes.data.data.filter((l: any) => String(l.machine_use || l.machine || '').trim().toUpperCase() === String(machine).trim().toUpperCase());
            }
          } catch (e) {
            console.warn("Could not fetch parts from getSubAssyLoad:", e);
          }
        }

        if (parts.length === 0) {
          try {
            const partRes = await getSimulationPartById(id_simulation, 'DETAIL');
            const allLoads = partRes.data?.loads || [];
            parts = allLoads.filter((l: any) => String(l.machine_use || l.machine || '').trim().toUpperCase() === String(machine).trim().toUpperCase());
          } catch (e) {
            console.warn("Could not fetch parts from getSimulationPartById:", e);
          }
        }

        // Fallback to in-memory createData or editData if simulation was just created/edited
        if (parts.length === 0) {
          const inMem = this.createData?.length > 0 ? this.createData : this.editData;
          if (Array.isArray(inMem) && inMem.length > 0) {
            parts = inMem.filter((l: any) => String(l.machine_use || l.machine || '').trim().toUpperCase() === String(machine).trim().toUpperCase());
          }
        }

        this.machinePartData = parts;
      } catch (error) {
        console.error("Error fetching parts by machine:", error);
        utilityStore.onError(error);
      } finally {
        this.machinePartLoading = false;
      }
    },

    async fetchLiveSummary(area?: string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        this.liveSummaryLoading = true;
        const res = await getSimulationLiveSummary(area);
        if (res.data.status === "success") {
          const list = res.data.data || [];
          this.liveSummaryData = [...list].sort((a: any, b: any) =>
            String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
          );
          this.liveSummaryId = res.data.id_simulation || null;
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengambil data live summary");
        }
      } catch (error) {
        console.error("Error fetching live summary:", error);
        utilityStore.onError(error);
      } finally {
        this.liveSummaryLoading = false;
      }
    },

    async fetchInactiveMachineInUse(id_simulation: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        this.inactiveMachineInUseLoading = true;
        const { getInactiveMachineInUse } = await import('@/services/PCD/Welding/Simulation');
        const res: any = await getInactiveMachineInUse(id_simulation);
        if (res.status === "success" || res.data?.status === "success") {
          this.inactiveMachineInUseData = res.data || res.data?.data || [];
        } else {
          notificationStore.showDialogWarning("Warning", res.message || res.data?.message || "Gagal mengambil list inactive machine in use");
        }
      } catch (error) {
        console.error("Error fetching inactive machine in use:", error);
        utilityStore.onError(error);
      } finally {
        this.inactiveMachineInUseLoading = false;
      }
    },

    async fetchSimulationEdit(id: number | string, keepStep = false) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const prevStep = this.step;
      try {
        this.editLoading = true;
        const res = await getSimulationPartById(id, 'DETAIL');
        if (res.data.status === "success") {
          const header = res.data.header;
          this.editForm = {
            area: header.area || '',
            periode: header.periode || '',
            note: header.note || ''
          };

          if (header.area) {
            await this.fetchActiveMachines(header.area);
          } else if (this.activeMachineOptions.length === 0) {
            await this.fetchActiveMachines();
          }

          const rawLoads = res.data.loads || [];
          const hasDetailRows = rawLoads.some((l: any) => l.status_patan === 'DETAIL');
          const detailOnlyLoads = hasDetailRows ? rawLoads.filter((l: any) => l.status_patan === 'DETAIL') : rawLoads;
          this.editData = detailOnlyLoads.map((l: any) => {
            const m = this.activeMachineOptions.find(opt => opt.machine === l.machine_use);
            return {
              ...l,
              selected: true,
              machine_use: l.machine_use || '',
              machine_prev: l.machine_prev || '',
              upper_holder: m ? m.upper_holder : null,
              lower_holder: m ? m.lower_holder : null,
              kva: m ? m.kva : null,
              part_top_parent: l.part_top_parent || l.part_parent || l.top_parent_part_number || '-'
            };
          });
          this.currentSimulationId = Number(id);
          if (!keepStep) {
            this.step = 1;
          } else {
            this.step = prevStep || 3;
          }
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengambil detail simulasi");
        }
      } catch (error) {
        console.error("Error fetching simulation detail for edit:", error);
        utilityStore.onError(error);
      } finally {
        this.editLoading = false;
      }
    },

    async saveUpdateSimulation(id: number | string, updated_by?: string) {
      const authStore = useAuthStore();
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      const activeUser = (authStore.user as any)?.username || (authStore.user as any)?.fullname || (authStore.user as any)?.first_name || (updated_by && updated_by !== 'SYSTEM' ? updated_by : 'SYSTEM');

      try {
        this.editLoading = true;
        const payload = {
          area: this.editForm.area,
          periode: this.editForm.periode,
          note: this.editForm.note,
          updated_by: activeUser,
          loads: this.editData.filter((d: any) => d.selected !== false && !d.is_deleted)
        };

        const res: any = await updateSimulation(id, payload);
        if (res.status === "success" || res.data?.status === "success") {
          const successMessage = res.message || res.data?.message || "Simulasi berhasil diupdate";
          notificationStore.showDialogSuccess("Sukses", successMessage);

          // Re-fetch parts dari database agar kita mendapatkan ID baris glc_simulation_load baru hasil re-insert
          const { getSimulationPartById } = await import('@/services/PCD/Welding/Simulation');
          const detailRes = await getSimulationPartById(id, 'DETAIL');
          if (detailRes.data.status === "success" && detailRes.data.loads) {
            const rawLoads = detailRes.data.loads || [];
            const hasDetailRows = rawLoads.some((l: any) => l.status_patan === 'DETAIL');
            const detailOnlyLoads = hasDetailRows ? rawLoads.filter((l: any) => l.status_patan === 'DETAIL') : rawLoads;
            this.editData = detailOnlyLoads.map((l: any) => {
              const m = this.activeMachineOptions.find(opt => opt.machine === l.machine_use);
              return {
                ...l,
                selected: true,
                machine_use: l.machine_use || '',
                machine_prev: l.machine_prev || '',
                upper_holder: m ? m.upper_holder : null,
                lower_holder: m ? m.lower_holder : null,
                kva: m ? m.kva : null,
                part_top_parent: l.part_top_parent || l.part_parent || l.top_parent_part_number || '-'
              };
            });
          }
          
          this.step = 2; // move to step 2
          return true;
        } else {
          const errorMessage = res.message || res.data?.message || "Gagal mengupdate simulasi";
          notificationStore.showDialogError("Error", errorMessage);
          return false;
        }
      } catch (error) {
        console.error("Error updating simulation:", error);
        utilityStore.onError(error);
        return false;
      } finally {
        this.editLoading = false;
      }
    },

    async changeMachineLoad(id_load: number | string, machine_use: string, simId?: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        const payload = {
          id_load,
          machine_use
        };
        const res: any = await updateMachineLoad(payload);
        if (res.status === "success" || res.data?.status === "success") {
          notificationStore.showDialogSuccess("Sukses", "Part berhasil dipindah mesin.");
          
          const targetId = simId || this.currentSimulationId;
          if (targetId) {
             await this.fetchSummaryData(targetId);
             
             // Update the specific machine's parts if it's currently selected
             if (this.machinePartData.length > 0) {
                 await this.fetchSimulationLoadByMachine(targetId, this.machinePartData[0].machine_use || payload.machine_use);
             }
          }
          await this.fetchLiveSummary();
          return true;
        } else {
          notificationStore.showDialogError("Error", res.message || res.data?.message || "Gagal memindah part");
          return false;
        }
      } catch (error) {
        console.error("Error moving machine load:", error);
        utilityStore.onError(error);
        return false;
      }
    },

    async changeMachineLoadBatch(items: { id_load: number | string; new_machine: string }[], simId?: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        const res: any = await updateMachineLoadBatch(items);
        if (res.status === "success" || res.data?.status === "success") {
          notificationStore.showDialogSuccess("Sukses", "Semua part berhasil dipindah mesin.");
          
          const targetId = simId || this.currentSimulationId;
          if (targetId) {
             await this.fetchSummaryData(targetId);
          }
          await this.fetchLiveSummary();
          return true;
        } else {
          notificationStore.showDialogError("Error", res.message || res.data?.message || "Gagal memindah part");
          return false;
        }
      } catch (error) {
        console.error("Error batch moving machine load:", error);
        utilityStore.onError(error);
        return false;
      }
    },
    async previewAutoBalanceSimulation(id_simulation: number | string, mode: 'balanced' | 'shift_target' = 'balanced') {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      this.balancingMode = mode;
      try {
        const res: any = await autoSimulationBalance(id_simulation, true, undefined, mode);
        this.lastAutoBalanceResult = res?.data || res;
        if (res?.machine_diagnostics || res?.data?.machine_diagnostics) {
          this.balancingDiagnostics = res.machine_diagnostics || res.data?.machine_diagnostics || [];
        }
        if (res.status === "success" || res.data?.status === "success") {
          return res.proposed_moves || res.data?.proposed_moves || [];
        } else {
          notificationStore.showDialogError("Error", res.message || res.data?.message || "Gagal melakukan kalkulasi auto balance.");
          return null;
        }
      } catch (error) {
        console.error("Error preview auto balance:", error);
        utilityStore.onError(error);
        return null;
      }
    },
    async fetchBalancingDiagnostics(id_simulation: number | string) {
      const utilityStore = useUtilityStore();
      this.diagnosticsLoading = true;
      try {
        const res: any = await getBalancingDiagnostics(id_simulation);
        if (res.status === "success" || res.data?.status === "success") {
          this.balancingDiagnostics = res.data || res.data?.data || [];
          return this.balancingDiagnostics;
        }
        return [];
      } catch (error) {
        console.error("Error fetch balancing diagnostics:", error);
        utilityStore.onError(error);
        return [];
      } finally {
        this.diagnosticsLoading = false;
      }
    },
    async applyAutoBalanceSimulation(id_simulation: number | string, items: any[], mode: 'balanced' | 'shift_target' = 'balanced') {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      this.balancingMode = mode;
      try {
        const res: any = await autoSimulationBalance(id_simulation, false, items, mode);
        if (res.status === "success" || res.data?.status === "success") {
          notificationStore.showDialogSuccess("Auto Balance Selesai", res.message || res.data?.message || "Beban mesin berhasil diseimbangkan.");
          
          if (res.machine_diagnostics || res.data?.machine_diagnostics) {
            this.balancingDiagnostics = res.machine_diagnostics || res.data?.machine_diagnostics || [];
          } else if (id_simulation) {
            await this.fetchBalancingDiagnostics(id_simulation);
          }

          if (this.currentSimulationId) {
             await this.fetchSummaryData(this.currentSimulationId);
          }
          return true;
        } else {
          notificationStore.showDialogError("Error", res.message || res.data?.message || "Gagal menerapkan auto balance.");
          return false;
        }
      } catch (error) {
        console.error("Error applying auto balance:", error);
        utilityStore.onError(error);
        return false;
      }
    },
    async autoBalanceSimulation(id_simulation: number | string) {
      return this.previewAutoBalanceSimulation(id_simulation);
    },
    async cancelSimulationProgress(id_simulation: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        this.createLoading = true;
        // Use the existing or new delete endpoint
        const res: any = await deleteSimulation(id_simulation);
        if (res.status === "success" || res.data?.status === "success") {
          notificationStore.showDialogSuccess("Dibatalkan", "Progress simulasi berhasil dibatalkan dan dihapus.");
          // reset state
          this.step = 1;
          this.createData = [];
          this.currentSimulationId = null;
          return true;
        } else {
          notificationStore.showDialogError("Error", res.message || res.data?.message || "Gagal membatalkan simulasi");
          return false;
        }
      } catch (error) {
        console.error("Error cancelling simulation:", error);
        utilityStore.onError(error);
        return false;
      } finally {
        this.createLoading = false;
      }
    },
    async removeSimulation(id_simulation: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        const res: any = await deleteSimulation(id_simulation);
        if (res.status === "success" || res.data?.status === "success") {
          notificationStore.showDialogSuccess("Terhapus", "Data simulasi berhasil dihapus.");
          return true;
        } else {
          notificationStore.showDialogError("Error", res.message || res.data?.message || "Gagal menghapus simulasi");
          return false;
        }
      } catch (error) {
        console.error("Error deleting simulation:", error);
        utilityStore.onError(error);
        return false;
      }
    },
    async changeSimulationStatus(id_simulation: number | string, status: number | string, approval_notes?: string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        const res: any = await updateSimulationStatus(id_simulation, status, approval_notes);
        if (res.status === "success" || res.data?.status === "success") {
          notificationStore.showDialogSuccess("Berhasil", "Status simulasi berhasil diperbarui.");
          return true;
        } else {
          notificationStore.showDialogError("Error", res.message || res.data?.message || "Gagal memperbarui status");
          return false;
        }
      } catch (error) {
        console.error("Error updating status:", error);
        utilityStore.onError(error);
        return false;
      }
    },
    async calculateProductionTimes(id_simulation: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        const res: any = await calculateProductionTimes(id_simulation);
        if (res.status === "success" || res.data?.status === "success") {
          notificationStore.showDialogSuccess("Berhasil", "Kalkulasi jam produksi berhasil diperbarui.");
          return true;
        } else {
          notificationStore.showDialogError("Error", res.message || res.data?.message || "Gagal menghitung jam produksi");
          return false;
        }
      } catch (error) {
        console.error("Error calculating production times:", error);
        utilityStore.onError(error);
        return false;
      }
    },
    async adjustProdTime(id_simulation: number | string, machine: string, adjust_value: number, unit = 'jam') {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      try {
        const res: any = await adjustProdTime({ id_simulation, machine, adjust_value, unit });
        if (res.status === "success" || res.data?.status === "success") {
          notificationStore.showDialogSuccess("Berhasil", res.message || "Prod time berhasil disesuaikan.");
          const summaryArray = Array.isArray(res.data) ? res.data : (res.data?.data || (Array.isArray(res.summary) ? res.summary : null));
          if (summaryArray && summaryArray.length > 0) {
            this.summaryData = summaryArray;
            if (this.selectedSimulation) {
              this.selectedSimulation.summary = summaryArray;
            }
          }
          if (id_simulation) {
            await this.fetchSummaryData(id_simulation);
          }
          await this.fetchLiveSummary();
          return res.data || true;
        } else {
          notificationStore.showDialogError("Error", res.message || "Gagal menyesuaikan prod time");
          return false;
        }
      } catch (error) {
        console.error("Error adjusting prod time:", error);
        utilityStore.onError(error);
        return false;
      }
    }
  }
});
