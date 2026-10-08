import { defineStore } from 'pinia';
import moment from 'moment';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { metalFinishService } from '@/services/Stamping/Transaction/MetalFinishService';
import type {
  MetalFinishItem,
  MetalFinishGroup,
  MetalFinishParams,
  EditRecord,
  EditProblem,
  EmployeeItem,
  PartListItem,
  ProblemListItem,
  RepairProcessListItem
} from '@/types/Stamping/Transaction/MetalFinish';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

// ── Helpers ──────────────────────────────────────────────────────

function groupByNik(items: MetalFinishItem[]): MetalFinishGroup[] {
  const map = new Map<string, MetalFinishGroup>();
  for (const item of items) {
    if (!map.has(item.nik)) {
      map.set(item.nik, { nik: item.nik, operator_name: item.operator_name, items: [] });
    }
    map.get(item.nik)!.items.push({ ...item, problems: [...item.problems] });
  }
  for (const group of map.values()) {
    group.items.sort((a, b) => a.urut - b.urut);
  }
  return Array.from(map.values());
}

function computeTimeline(groups: MetalFinishGroup[], params: MetalFinishParams): void {
  const shiftStartTime = params.shift == 1 ? '07:15' : '20:00';

  for (const group of groups) {
    let prevEnd = moment(`${params.date} ${shiftStartTime}`, 'YYYY-MM-DD HH:mm');

    for (const item of group.items) {
      item.time_start = prevEnd.format('HH:mm');
      if (item.time_end) {
        const next = moment(`${params.date} ${item.time_end}`, 'YYYY-MM-DD HH:mm');
        if (next.isSameOrBefore(prevEnd)) next.add(1, 'day');
        prevEnd = next;
      }
    }
  }
}

function buildEditForm(group: MetalFinishGroup): EditRecord[] {
  return group.items.map((item) => ({
    id: item.id,
    urut: item.urut,
    part_number: item.part_number,
    job_number: item.job_number,
    time_start: item.time_start ?? null,
    time_end: item.time_end ?? null,
    prepare_time: item.prepare_time,
    prod_time: item.prod_time,
    qty_ok: item.qty_ok,
    qty_ng: item.qty_ng,
    problems:
      item.problems.length > 0
        ? item.problems.map((p) => ({
            problem_id: p.problem_id,
            repair_process_id: p.repair_process_id,
            problem: p.problem,
            repair_process: p.repair_process
          }))
        : [{ problem_id: null, repair_process_id: null, problem: null, repair_process: null }]
  }));
}

// ── Store ─────────────────────────────────────────────────────────

export const useMetalFinishStore = defineStore('MetalFinish', {
  state: () => {
    const utilityStore = useUtilityStore();
    return {
      params: utilityStore.getCurrentShift() as MetalFinishParams,
      permissions: {
        create: authStore.checkAccess('Transaction.Create.MetalFinishStamping'),
        update: authStore.checkAccess('Transaction.Update.MetalFinishStamping')
      },
      groups: [] as MetalFinishGroup[],

      // unified modal (view or edit)
      dialogMode: 'edit' as 'view' | 'edit',
      editGroup: null as MetalFinishGroup | null,
      editForm: [] as EditRecord[],
      editSnapshot: '' as string, // JSON.stringify snapshot for dirty diff

      // lookup lists (fetched once)
      partList: [] as PartListItem[],
      problemList: [] as ProblemListItem[],
      repairList: [] as RepairProcessListItem[],

      employeeList: [] as EmployeeItem[],

      createForm: {
        nik: '',
        job_number: ''
      },

      dialog: {
        edit: false,
        create: false,
        createInEdit: false
      }
    };
  },

  actions: {
    // ── Fetch main data ──────────────────────────────────────────
    async fetchData() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      notificationStore.loading = true;
      try {
        const result = await metalFinishService.fetchData({
          date: this.params.date,
          shift: this.params.shift
        });
        if (result) {
          const groups = groupByNik(result.data);
          computeTimeline(groups, this.params);
          this.groups = groups;
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    // ── Lookup lists ─────────────────────────────────────────────
    async ensureLists() {
      const [parts, pl, rl] = await Promise.all([
        this.partList.length === 0 ? metalFinishService.fetchPartList() : Promise.resolve(this.partList),
        this.problemList.length === 0 ? metalFinishService.fetchProblemList() : Promise.resolve(this.problemList),
        this.repairList.length === 0 ? metalFinishService.fetchRepairList() : Promise.resolve(this.repairList)
      ]);
      this.partList = parts;
      this.problemList = pl;
      this.repairList = rl;
    },

    // ── Employee search ──────────────────────────────────────────
    async searchEmployees(query: string) {
      this.employeeList = await metalFinishService.fetchEmployees(query);
    },

    // ── Create ───────────────────────────────────────────────────
    async openCreate() {
      await Promise.all([this.ensureLists(), this.searchEmployees('')]);
      this.createForm = { nik: '', job_number: '' };
      this.dialog.create = true;
    },
    closeCreate() {
      this.dialog.create = false;
      this.createForm = { nik: '', job_number: '' };
    },
    async openCreateInEdit() {
      // Rows filled in the edit table but not yet saved would otherwise be wiped out
      // by the fetchData() + editForm rebuild that follows creating the new part.
      const saved = await this.persistEditChanges();
      if (!saved) return;

      await this.ensureLists();
      this.createForm = { nik: this.editGroup?.nik ?? '', job_number: '' };
      this.dialog.createInEdit = true;
    },
    closeCreateInEdit() {
      this.dialog.createInEdit = false;
      this.createForm = { nik: this.editGroup?.nik ?? '', job_number: '' };
    },
    async submitCreate() {
      const notificationStore = useNotificationStore();
      const { nik, job_number } = this.createForm;

      if (!nik) {
        notificationStore.showAlertWarning('NIK operator harus diisi.');
        return;
      }
      if (!job_number) {
        notificationStore.showAlertWarning('Part number harus dipilih.');
        return;
      }
      const part = this.partList.find((p) => p.job_number === job_number);
      if (!part) {
        notificationStore.showAlertWarning('Part tidak ditemukan.');
        return;
      }

      const wasInEdit = this.dialog.createInEdit;
      const prevNik = wasInEdit ? (this.editGroup?.nik ?? null) : null;

      // Catch any edits made in the edit table while the "Tambah Part" dialog was open,
      // so they aren't wiped out by the fetchData() + editForm rebuild below.
      if (wasInEdit) {
        const saved = await this.persistEditChanges({ silent: true });
        if (!saved) return;
      }

      notificationStore.loading = true;
      try {
        const result = await metalFinishService.create({
          nik,
          date: this.params.date,
          shift: this.params.shift,
          part_number: part.part_number,
          job_number: part.job_number
        });
        if (result) {
          notificationStore.showAlertSuccess('Data berhasil dibuat.');
          this.closeCreate();
          this.closeCreateInEdit();
          if (wasInEdit) this.closeEdit();
          await this.fetchData();
          if (prevNik) {
            const group = this.groups.find((g) => g.nik === prevNik);
            if (group) await this.openEdit(group);
          }
        }
      } finally {
        notificationStore.disableLoading();
      }
    },

    // ── Detail (view-only) ───────────────────────────────────────
    openDetail(group: MetalFinishGroup) {
      this.editGroup = group;
      this.editForm = buildEditForm(group);
      this.editSnapshot = '';
      this.dialogMode = 'view';
      this.dialog.edit = true;
    },
    closeDetail() {
      this.dialog.edit = false;
      this.editGroup = null;
      this.editForm = [];
      this.editSnapshot = '';
    },

    // ── Edit modal ───────────────────────────────────────────────
    async openEdit(group: MetalFinishGroup) {
      this.editGroup = group;
      this.editForm = buildEditForm(group);
      this.editSnapshot = JSON.stringify(this.editForm);
      this.dialogMode = 'edit';
      // Lists must be ready before the dialog opens so Autocomplete
      // components mount with populated options and resolve labels correctly.
      await this.ensureLists();
      this.dialog.edit = true;
    },
    closeEdit() {
      this.dialog.edit = false;
      this.editGroup = null;
      this.editForm = [];
      this.editSnapshot = '';
    },

    // problems helpers
    addProblem(recordIdx: number) {
      this.editForm[recordIdx].problems.push({ problem_id: null, repair_process_id: null });
    },
    removeProblem(recordIdx: number, probIdx: number) {
      this.editForm[recordIdx].problems.splice(probIdx, 1);
    },

    // ── Timeline recomputation for edit form ─────────────────────
    recomputeEditTimeline() {
      const utilityStore = useUtilityStore();
      const shiftStartTime = this.params.shift == 1 ? '07:15' : '20:00';
      let prevEnd = moment(`${this.params.date} ${shiftStartTime}`, 'YYYY-MM-DD HH:mm');
      for (const row of this.editForm) {
        row.time_start = prevEnd.format('HH:mm');
        if (row.time_end) {
          let endMoment = moment(`${this.params.date} ${row.time_end}`, 'YYYY-MM-DD HH:mm');
          if (endMoment.isSameOrBefore(prevEnd)) endMoment.add(1, 'day');
          // if span > 12 h the user typed a time before time_start — clamp to time_start
          if (endMoment.diff(prevEnd, 'minutes') > 720) {
            endMoment = prevEnd.clone();
            row.time_end = endMoment.format('HH:mm');
          }
          // snap forward if time_end lands inside a break window
          endMoment = utilityStore.snapToBreakEnd(this.params, endMoment);
          row.time_end = endMoment.format('HH:mm');
          const breakMinutes = utilityStore.mappingBreak(
            this.params,
            prevEnd.format('YYYY-MM-DD HH:mm'),
            endMoment.format('YYYY-MM-DD HH:mm')
          );
          const diffMinutes = endMoment.diff(prevEnd, 'minutes');
          row.prod_time = Math.max(0, diffMinutes - Number(row.prepare_time ?? 0) - breakMinutes);
          prevEnd = endMoment.clone();
        } else {
          row.prod_time = null;
        }
      }
    },

    // ── Reorder (swap adjacent rows and reassign urut) ────────────
    moveUp(idx: number) {
      if (idx === 0) return;
      const items = [...this.editForm];
      [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
      items.forEach((row, i) => {
        row.urut = i + 1;
      });
      this.editForm = items;
      this.recomputeEditTimeline();
    },
    moveDown(idx: number) {
      if (idx >= this.editForm.length - 1) return;
      const items = [...this.editForm];
      [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
      items.forEach((row, i) => {
        row.urut = i + 1;
      });
      this.editForm = items;
      this.recomputeEditTimeline();
    },

    // ── Delete single record ─────────────────────────────────────
    async deleteRecord(id: number, idx: number) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      notificationStore.loading = true;
      try {
        const result = await metalFinishService.deleteRecord(id);
        if (result) {
          this.editForm.splice(idx, 1);
          this.editForm.forEach((row, i) => {
            row.urut = i + 1;
          });
          this.recomputeEditTimeline();
          this.editSnapshot = JSON.stringify(this.editForm);
          notificationStore.showAlertSuccess('Record berhasil dihapus.');
          await this.fetchData();
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    // ── Save (dirty-track, batch PUT) ────────────────────────────
    // Validates the edit table and persists only the rows that changed since it was
    // opened (or since the last successful save). Shared by the explicit Save button and
    // by any flow that must not lose in-progress edits (e.g. adding a part mid-edit).
    // Returns true when it's safe to proceed (either persisted, or nothing to persist),
    // false when validation failed or the save request failed — the caller should abort.
    async persistEditChanges(options: { silent?: boolean } = {}): Promise<boolean> {
      const notificationStore = useNotificationStore();

      // Validation: per-row, if any main field is filled → all must be filled as valid numbers;
      // per-problem entry, both problem_id and repair_process_id must be set together.
      // v-model.number leaves empty inputs as "" and invalid entries as NaN, so we check both.
      const isValidNumber = (v: number | null | undefined): boolean => {
        if (v === null || v === undefined || (v as unknown as string) === '') return false;
        return !Number.isNaN(Number(v));
      };

      const errors: string[] = [];
      this.editForm.forEach((row, idx) => {
        const label = `Baris ${idx + 1} (${row.part_number || row.job_number})`;
        const checks = {
          'Prepare Time': row.prepare_time,
          'Qty OK': row.qty_ok
        } as Record<string, number | null | undefined>;
        const anyMain = Object.values(checks).some((v) => isValidNumber(v) && v! > 0);
        const allMain = Object.values(checks).every((v) => isValidNumber(v) && v! > 0);

        if (anyMain && !allMain) {
          const missing = Object.entries(checks)
            .filter(([, v]) => !isValidNumber(v) || v! <= 0)
            .map(([k]) => k);
          errors.push(`${label}: ${missing.join(', ')} harus diisi angka lebih dari 0.`);
        }
        if (anyMain && !row.time_end) {
          errors.push(`${label}: Time End harus diisi.`);
        }
        if (row.problems.length == 0) {
          errors.push(`${label}: Minimal harus menambahkan 1 Problem dan Repair Process.`);
        }
        row.problems.forEach((prob, pIdx) => {
          const hasProblem = prob.problem_id !== null && prob.problem_id !== undefined;
          const hasRepair = prob.repair_process_id !== null && prob.repair_process_id !== undefined;
          if (!hasProblem && !hasRepair) {
            errors.push(`${label}, Problem ${pIdx + 1}: Problem dan Repair Process harus diisi.`);
          } else if (!hasProblem) {
            errors.push(`${label}, Problem ${pIdx + 1}: Problem harus diisi.`);
          } else if (!hasRepair) {
            errors.push(`${label}, Problem ${pIdx + 1}: Repair Process harus diisi.`);
          }
        });
      });
      if (errors.length > 0) {
        notificationStore.showDialogWarning('Save Failed', errors.join('<br>'));
        return false;
      }

      const snapshot: EditRecord[] = this.editSnapshot ? JSON.parse(this.editSnapshot) : [];
      const dirtyRecords = this.editForm
        .filter((row, idx) => JSON.stringify(row) !== JSON.stringify(snapshot[idx]))
        .map((row) => {
          const totalQty = Number(row.qty_ok ?? 0) + Number(row.qty_ng ?? 0);
          const prodTime = Number(row.prod_time);
          const prepTime = Number(row.prepare_time);
          const gsph = prepTime && prodTime && totalQty ? (totalQty * 60) / (prodTime + prepTime) : null;
          const cycle_time = totalQty ? (Number(row.prod_time ?? 0) / totalQty) * 60 : null;
          return {
            id: row.id,
            urut: row.urut,
            part_number: row.part_number,
            job_number: row.job_number,
            time_end: row.time_end,
            prepare_time: row.prepare_time,
            prod_time: row.prod_time,
            qty_ok: row.qty_ok,
            qty_ng: row.qty_ng,
            gsph,
            cycle_time,
            problems: row.problems as EditProblem[]
          };
        });

      if (dirtyRecords.length === 0) {
        if (!options.silent) notificationStore.showAlertWarning('Tidak ada perubahan data.');
        return true;
      }

      notificationStore.loading = true;
      try {
        const result = await metalFinishService.batchUpdate({ records: dirtyRecords });
        if (!result) return false;
        if (!options.silent) notificationStore.showAlertSuccess(`${dirtyRecords.length} record berhasil disimpan.`);
        // Reflect the persisted state so these rows aren't re-sent on the next save.
        this.editSnapshot = JSON.stringify(this.editForm);
        return true;
      } finally {
        notificationStore.disableLoading();
      }
    },

    async saveBatch() {
      const saved = await this.persistEditChanges();
      if (!saved) return;
      this.closeEdit();
      await this.fetchData();
    }
  }
});
