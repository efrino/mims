<script setup lang="ts">
import { onMounted, shallowRef, computed, watch, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { initFlowbite } from 'flowbite';
import { SyncOutlined } from '@ant-design/icons-vue';

// @ts-ignore
import Datepicker from 'flowbite-datepicker/Datepicker';

import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import Autocomplete from '@/components/form/Autocomplete.vue';
import type { AutocompleteOption } from '@/components/form/Autocomplete.vue';
import type { EditRecord, MetalFinishItem } from '@/types/Stamping/Transaction/MetalFinish';
import { useMetalFinishStore } from '@/stores/Stamping/Transaction/MetalFinish';
import { useUtilityStore } from '@/stores/utility';

const store = useMetalFinishStore();
const utilityStore = useUtilityStore();

const { formatDate } = utilityStore;
const {
  params,
  groups,
  dialogMode,
  editGroup,
  dialog,
  editForm,
  editSnapshot,
  partList,
  problemList,
  repairList,
  createForm,
  employeeList,
  permissions
} = storeToRefs(store);

const {
  fetchData,
  openDetail,
  closeDetail,
  openEdit,
  closeEdit,
  addProblem,
  removeProblem,
  moveUp,
  moveDown,
  recomputeEditTimeline,
  saveBatch,
  openCreate,
  closeCreate,
  openCreateInEdit,
  closeCreateInEdit,
  submitCreate,
  deleteRecord
} = store;

const confirmDeleteIdx = ref<number | null>(null);

async function doDelete(id: number, idx: number) {
  confirmDeleteIdx.value = null;
  await deleteRecord(id, idx);
}

// ── Dirty tracking per row ────────────────────────────────────────
const dirtySet = computed<Set<number>>(() => {
  if (!editSnapshot.value) return new Set();
  const snap: typeof editForm.value = JSON.parse(editSnapshot.value);
  const dirty = new Set<number>();
  editForm.value.forEach((row, idx) => {
    if (JSON.stringify(row) !== JSON.stringify(snap[idx])) dirty.add(idx);
  });
  return dirty;
});

// ── Part autocomplete options ─────────────────────────────────────
// value = job_number  → searched via option.value in Autocomplete filter
// label = part_number → searched via option.label, shown in input after select
// sublabel = job_number (if different) → shown as subtitle in dropdown list
const colorMap = { STAMPING: 'yellow', WELDING: 'teal' };
const partOptions = computed<AutocompleteOption[]>(() =>
  partList.value.map((p) => ({
    value: p.job_number,
    label: p.part_number,
    sublabel: p.job_number !== p.part_number ? p.job_number : undefined,
    statusLabel: { label: p.status, colorMap: colorMap }
  }))
);

function selectPart(rIdx: number, val: string | number | null) {
  const jobNum = String(val ?? '');
  const found = partList.value.find((p) => p.job_number === jobNum);
  if (!found) return;
  editForm.value[rIdx].part_number = found.part_number;
  editForm.value[rIdx].job_number = found.job_number;
}

const employeeOptions = computed<AutocompleteOption[]>(() =>
  employeeList.value.map((e) => ({
    value: e.nik,
    label: e.name,
    sublabel: `${e.nik} — ${e.department}`
  }))
);

const problemOptions = computed<AutocompleteOption[]>(() => problemList.value.map((p) => ({ value: p.id, label: p.problem })));

const repairOptions = computed<AutocompleteOption[]>(() => repairList.value.map((r) => ({ value: r.id, label: r.proses })));

const resumeStats = computed(() => {
  const totalOk = editForm.value.reduce((s, r) => s + Number(r.qty_ok ?? 0), 0);
  const totalNg = editForm.value.reduce((s, r) => s + Number(r.qty_ng ?? 0), 0);
  const totalQty = totalOk + totalNg;
  const totalProdTime = editForm.value.reduce((s, r) => s + Number(r.prod_time ?? 0), 0);
  const totalPrepTime = editForm.value.reduce((s, r) => s + Number(r.prepare_time ?? 0), 0);
  const okPct = totalQty ? ((totalOk / totalQty) * 100).toFixed(1) : '-';
  const ngPct = totalQty ? ((totalNg / totalQty) * 100).toFixed(1) : '-';
  const gsph = totalProdTime && totalQty ? ((totalQty * 60) / (totalProdTime + totalPrepTime)).toFixed(0) : '-';
  const gsphAvg = (() => {
    const avg = editForm.value.reduce((s, r) => s + Number(calcGsph(r)), 0) / editForm.value.length;

    return Number.isNaN(avg) ? '-' : avg.toFixed(0);
  })();
  const cycleTimeAvg = (() => {
    const avg = (totalProdTime / totalQty) * 60;

    return Number.isNaN(avg) || totalQty == 0 ? '-' : avg.toFixed(1);
  })();
  return { totalOk, totalNg, okPct, ngPct, gsph, tpt: totalProdTime, gsphAvg, cycleTimeAvg };
});

type CalcRow = Pick<EditRecord | MetalFinishItem, 'qty_ok' | 'qty_ng' | 'prod_time' | 'prepare_time'>;

function calcGsph(row: CalcRow): string {
  const total = Number(row.qty_ok ?? 0) + Number(row.qty_ng ?? 0);
  const prodTime = Number(row.prod_time);
  const prepTime = Number(row.prepare_time);
  if (!prodTime || !total || Number.isNaN(prodTime) || Number.isNaN(total)) return '-';
  return ((total * 60) / (prodTime + prepTime)).toFixed(0);
}

function calcCycleTime(row: CalcRow): string {
  const total = Number(row.qty_ok ?? 0) + Number(row.qty_ng ?? 0);
  const prodTime = Number(row.prod_time ?? 0);
  if (!total || Number.isNaN(total) || Number.isNaN(prodTime)) return '-';
  return ((prodTime / total) * 60).toFixed(1);
}

// ── Page meta ─────────────────────────────────────────────────────
const page = shallowRef({ title: '' });
const breadcrumbs = shallowRef([
  { title: 'Stamping', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Metal Finish', disabled: true, href: '#' }
]);

watch(
  [() => params.value.date, () => params.value.shift],
  () => {
    page.value = { title: `Metal Finish (${formatDate(params.value.date)} / Shift ${params.value.shift})` };
  },
  { immediate: true }
);

onMounted(() => {
  fetchData();
  initFlowbite();

  const el = document.getElementById('mf-datepicker-inline');
  if (!el) return;

  const datepicker = new Datepicker(el, { autohide: true, format: 'yyyy-mm-dd' });
  if (params.value.date) datepicker.setDate(params.value.date);

  el.addEventListener('changeDate', (e: any) => {
    const d: Date = e.detail.date;
    params.value.date = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    fetchData();
  });
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <!-- Filter Bar -->
  <div class="flex flex-wrap items-center mb-3 gap-2">
    <div class="flex">
      <button
        type="button"
        data-dropdown-toggle="mfDatepickerDropdown"
        class="flex items-center gap-2 text-white outline-blue-600 bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 font-medium rounded-s-xl text-sm px-3 pl-4 py-1.5 text-center"
      >
        {{ params.date }}
        <svg class="w-2.5 h-2.5 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4" />
        </svg>
      </button>
      <select
        v-model="params.shift"
        @change="fetchData"
        class="bg-gray-50 min-w-32.5 border outline outline-gray-300 text-gray-900 text-sm rounded-e-xl focus:ring-blue-500 focus:border-blue-500 block w-auto px-3 py-1.5"
      >
        <option :value="1">Shift 1</option>
        <option :value="2">Shift 2</option>
      </select>
    </div>

    <button
      v-show="permissions.create"
      @click="openCreate"
      class="flex items-center gap-2 text-white bg-blue-700 hover:bg-blue-900 font-medium rounded-full text-sm px-4 py-1.5"
    >
      <i class="mdi mdi-plus"></i>
      NIK
    </button>

    <button
      @click="fetchData"
      class="flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 font-medium rounded-full text-sm px-4 py-1.5"
    >
      <SyncOutlined />
      Refresh
    </button>

    <div id="mfDatepickerDropdown" class="hidden z-1500 mt-2 w-72 bg-white rounded-lg shadow">
      <div id="mf-datepicker-inline"></div>
    </div>
  </div>

  <!-- Card Grid -->
  <div class="mt-1 mb-15">
    <div v-if="groups.length === 0" class="flex items-center justify-center h-40 text-gray-400 text-sm">
      Tidak ada data untuk tanggal dan shift ini.
    </div>

    <div v-else class="grid max-sm:grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      <div v-for="group in groups" :key="group.nik">
        <!-- <div class="rounded-lg shadow bg-white text-blue-700 hover:shadow-lg transition hover-menu" style="border-top: 5px solid">
          <div class="p-4 flex justify-between items-center">
            <div class="min-w-0 flex flex-col">
              <span class="text-base font-semibold truncate block">{{ group.operator_name }}</span>
              <div class="flex gap-3 items-center">
                <span class="text-xs text-gray-500">{{ group.nik }}</span>
                <span class="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 w-fit">{{ group.items.length }} Part</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">

              <button
                class="w-7 h-7 flex items-center justify-center rounded-full text-blue-600 hover:text-white border border-blue-600 bg-blue-100 hover:bg-blue-700 transition-all"
                title="Lihat Detail"
                @click="openDetail(group)"
              >
                <i class="mdi mdi-eye text-sm"></i>
              </button>
              <button
                v-show="permissions.update"
                class="w-7 h-7 flex items-center justify-center rounded-full text-green-600 hover:text-white border border-green-600 bg-blue-100 hover:bg-green-800 transition-all"
                title="Edit"
                @click="openEdit(group)"
              >
                <i class="mdi mdi-pencil text-sm"></i>
              </button>
            </div>
          </div>

          <div class="border-t px-4 py-2 grid grid-cols-2 gap-1 text-sm font-semibold bg-slate-100">
            <div>
              <span class="font-normal text-xs text-gray-700">Qty OK : </span>
              <span class="text-green-600">{{ group.items.reduce((s, i) => s + Number(i.qty_ok ?? 0), 0) }}</span>
            </div>
            <div>
              <span class="font-normal text-xs text-gray-700">Qty NG : </span>
              <span class="text-red-600">{{ group.items.reduce((s, i) => s + Number(i.qty_ng ?? 0), 0) }}</span>
            </div>
          </div>
        </div> -->
        <div class="rounded-lg shadow bg-slate-700 text-blue-700 hover:shadow-lg transition hover-menu" style="border-top: 5px solid">
          <div class="p-4 flex justify-between items-center">
            <div class="min-w-0 flex flex-col">
              <span class="text-base font-semibold truncate block text-blue-50">{{ group.operator_name }}</span>
              <div class="flex gap-3 items-center">
                <span class="text-xs text-gray-300 font-medium">{{ group.nik }}</span>
                <span class="text-xs font-medium bg-amber-50 text-slate-800 rounded-full px-2 py-0.5 w-fit"
                  >{{ group.items.length }} Part</span
                >
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <!-- View -->
              <button
                class="w-7 h-7 flex items-center justify-center rounded-full text-blue-100 hover:text-white border border-blue-600 bg-blue-500 hover:bg-blue-700 transition-all"
                title="Lihat Detail"
                @click="openDetail(group)"
              >
                <i class="mdi mdi-eye text-sm"></i>
              </button>
              <!-- Edit -->
              <button
                v-show="permissions.update"
                class="w-7 h-7 flex items-center justify-center rounded-full text-white hover:text-white border border-green-600 bg-green-500 hover:bg-green-800 transition-all"
                title="Edit"
                @click="openEdit(group)"
              >
                <i class="mdi mdi-pencil text-sm"></i>
              </button>
            </div>
          </div>

          <div class="border-t px-4 py-2 grid grid-cols-2 gap-1 text-sm font-semibold bg-gray-800">
            <div>
              <span class="font-normal text-xs text-gray-100">Qty OK : </span>
              <span class="text-green-300">{{ group.items.reduce((s, i) => s + Number(i.qty_ok ?? 0), 0) }}</span>
            </div>
            <div>
              <span class="font-normal text-xs text-gray-100">Qty NG : </span>
              <span class="text-red-300">{{ group.items.reduce((s, i) => s + Number(i.qty_ng ?? 0), 0) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
       UNIFIED MODAL (view + edit)
  ════════════════════════════════════════════════════════════════ -->
  <div v-if="dialog.edit && editForm.length > 0" class="fixed inset-0 z-2000 flex items-center justify-center bg-black/70">
    <div class="relative bg-black text-white shadow-lg max-w-[98vw] max-h-[94vh] flex flex-col">
      <!-- Scrollable Table Area -->
      <div class="flex-1 overflow-auto">
        <table class="border-separate border-spacing-0 w-full text-sm text-white bg-black">
          <thead>
            <!-- Title Row -->
            <tr class="bg-gray-900">
              <th :colspan="dialogMode === 'edit' ? 12 : 11" class="p-2 pl-4 text-left font-semibold">
                <template v-if="dialogMode === 'edit'">Edit — </template>{{ editGroup?.operator_name }}
                <span class="font-normal text-gray-400 ml-2"
                  >{{ editGroup?.nik }} — {{ formatDate(params.date) }} / Shift {{ params.shift }}</span
                >
              </th>
              <th class="bg-gray-900 pr-3 text-right">
                <button
                  @click="dialogMode === 'edit' ? closeEdit() : closeDetail()"
                  class="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  &times;
                </button>
              </th>
            </tr>

            <!-- Column Headers -->
            <tr>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap text-center">No</th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap">Part Number</th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap">Job Number</th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap">Problems &rarr; Repairs</th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap text-center">
                Prepare Time <br />
                <span class="font-medium text-xs">(Minutes)</span>
              </th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap text-center">
                Prod Time <br />
                <span class="font-medium text-xs">(Auto)</span>
              </th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap text-center">Time Start</th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap text-center">Time End</th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap text-center">
                Qty OK <br />
                <span class="font-medium text-xs">(Pcs)</span>
              </th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap text-center">
                Qty NG <br />
                <span class="font-medium text-xs">(Pcs)</span>
              </th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap text-center">GSPH</th>
              <th class="bg-emerald-800 border px-3 py-2 whitespace-nowrap text-center">
                Cycle Time <br />
                <span class="font-medium text-xs">(Second)</span>
              </th>

              <th v-if="dialogMode === 'edit'" class="bg-gray-700 px-2 py-2 w-12"></th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(row, rIdx) in editForm"
              :key="row.id"
              class="transition"
              :class="dirtySet.has(rIdx) ? 'bg-yellow-900/20' : 'hover:bg-slate-700/40'"
            >
              <!-- No -->
              <td class="px-2 py-1 text-center border-b border-gray-700 align-middle whitespace-nowrap">
                <template v-if="dialogMode === 'edit'">
                  <div class="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      @click="moveUp(rIdx)"
                      :disabled="rIdx === 0"
                      class="text-gray-300 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none"
                    >
                      ▲
                    </button>
                    <span class="text-sm font-medium">
                      {{ rIdx + 1 }}
                      <span v-if="dirtySet.has(rIdx)" class="text-yellow-400 text-xs">●</span>
                    </span>
                    <button
                      type="button"
                      @click="moveDown(rIdx)"
                      :disabled="rIdx === editForm.length - 1"
                      class="text-gray-300 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none"
                    >
                      ▼
                    </button>
                  </div>
                </template>
                <span v-else class="text-sm font-medium">{{ rIdx + 1 }}</span>
              </td>
              <!-- Part Number -->
              <td class="px-1 py-1 border-b border-gray-700 align-middle min-w-45">
                <template v-if="dialogMode === 'edit'">
                  <Autocomplete
                    :options="partOptions"
                    :model-value="row.job_number"
                    placeholder="Cari part / job..."
                    @update:model-value="(val) => selectPart(rIdx, val)"
                  />
                </template>
                <span v-else class="px-2 font-medium">{{ row.part_number }}</span>
              </td>
              <!-- Job Number -->
              <td class="px-3 py-2 whitespace-nowrap border-b border-gray-700 align-middle text-gray-300">
                {{ row.job_number || '-' }}
              </td>
              <!-- Problems -->
              <td class="px-2 py-1 border-b border-gray-700 min-w-75 align-top">
                <template v-if="dialogMode === 'edit'">
                  <div v-for="(prob, pIdx) in row.problems" :key="pIdx" class="flex items-center gap-1 mb-1">
                    <div class="flex-1">
                      <Autocomplete
                        :options="problemOptions"
                        :model-value="prob.problem_id"
                        placeholder="Pilih Problem..."
                        @update:model-value="(val) => (prob.problem_id = val !== null ? Number(val) : null)"
                      />
                    </div>
                    <div class="flex-1">
                      <Autocomplete
                        :options="repairOptions"
                        :model-value="prob.repair_process_id"
                        placeholder="Pilih Repair..."
                        @update:model-value="(val) => (prob.repair_process_id = val !== null ? Number(val) : null)"
                      />
                    </div>
                    <button
                      type="button"
                      @click="removeProblem(rIdx, pIdx)"
                      class="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-red-400 border border-red-400 hover:bg-red-900/40"
                    >
                      <i class="mdi mdi-close text-xs"></i>
                    </button>
                  </div>
                  <button
                    type="button"
                    @click="addProblem(rIdx)"
                    class="text-xs text-green-400 border border-green-400 rounded px-2 py-0.5 hover:bg-green-900/40"
                  >
                    + Add
                  </button>
                </template>
                <template v-else>
                  <div v-if="row.problems.length > 0" class="flex flex-col gap-1 py-1">
                    <div v-for="(prob, pIdx) in row.problems" :key="pIdx" class="flex items-center gap-1 text-xs">
                      <span class="bg-red-900/60 text-red-300 border border-red-700 rounded px-1.5 py-0.5 font-medium">{{
                        prob.problem ?? '-'
                      }}</span>
                      <span class="text-gray-500">→</span>
                      <span class="bg-yellow-900/60 text-yellow-300 border border-yellow-700 rounded px-1.5 py-0.5">{{
                        prob.repair_process ?? '-'
                      }}</span>
                    </div>
                  </div>
                  <span v-else class="text-gray-600 text-xs">-</span>
                </template>
              </td>

              <!-- Prepare Time -->
              <td class="px-1 py-1 border-b border-gray-700 align-middle w-20">
                <template v-if="dialogMode === 'edit'">
                  <input
                    v-model.number="row.prepare_time"
                    type="number"
                    min="0"
                    @input="recomputeEditTimeline()"
                    class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-10"
                  />
                </template>
                <span v-else class="px-2 text-center block">{{ row.prepare_time ?? '-' }}</span>
              </td>

              <!-- Prod Time (computed) -->
              <td class="px-3 py-2 text-center whitespace-nowrap border-b border-gray-700 align-middle">
                <span class="text-gray-300">{{ row.prod_time ?? '--' }}</span>
              </td>

              <!-- Time Start (computed) -->
              <td class="px-3 py-2 text-center whitespace-nowrap border-b border-gray-700 align-middle">{{ row.time_start ?? '--:--' }}</td>

              <!-- Time End (editable in edit mode) -->
              <td class="px-1 py-1 border-b border-gray-700 align-middle w-24">
                <template v-if="dialogMode === 'edit'">
                  <input
                    v-model="row.time_end"
                    type="time"
                    @blur="recomputeEditTimeline()"
                    class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </template>
                <span v-else class="px-2 text-center block">{{ row.time_end ?? '--:--' }}</span>
              </td>

              <!-- Qty OK -->
              <td class="px-1 py-1 border-b border-gray-700 align-middle w-20">
                <template v-if="dialogMode === 'edit'">
                  <input
                    v-model.number="row.qty_ok"
                    type="number"
                    min="0"
                    class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-10"
                  />
                </template>
                <span v-else :class="row.qty_ok ? 'text-green-400 font-semibold' : 'text-gray-500'" class="px-2 text-center block">{{
                  row.qty_ok ?? '-'
                }}</span>
              </td>

              <!-- Qty NG -->
              <td class="px-1 py-1 border-b border-gray-700 align-middle w-20">
                <template v-if="dialogMode === 'edit'">
                  <input
                    v-model.number="row.qty_ng"
                    type="number"
                    min="0"
                    class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-10"
                  />
                </template>
                <span v-else :class="row.qty_ng ? 'text-red-400 font-semibold' : 'text-gray-500'" class="px-2 text-center block">{{
                  row.qty_ng ?? '-'
                }}</span>
              </td>

              <!-- GSPH (view-only) -->
              <td class="px-3 py-2 text-center whitespace-nowrap border-b border-gray-700 align-middle text-yellow-300 text-sm">
                {{ calcGsph(row) }}
              </td>

              <!-- Cycle Time (view-only) -->
              <td class="px-3 py-2 text-center whitespace-nowrap border-b border-gray-700 align-middle text-yellow-300 text-sm">
                {{ calcCycleTime(row) }}
              </td>

              <!-- Delete (edit mode only) -->
              <td v-if="dialogMode === 'edit'" class="px-2 py-1 border-b border-gray-700 align-middle text-center w-12 hover:bg-red-700/20">
                <template v-if="confirmDeleteIdx === rIdx">
                  <div class="flex flex-col items-center gap-1">
                    <span class="text-red-400 text-xs font-medium">Hapus?</span>
                    <div class="flex gap-1">
                      <button
                        type="button"
                        @click="doDelete(row.id, rIdx)"
                        class="px-2 py-0.5 bg-red-600 hover:bg-red-500 rounded text-white text-xs"
                      >
                        Ya
                      </button>
                      <button
                        type="button"
                        @click="confirmDeleteIdx = null"
                        class="px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs"
                      >
                        Tidak
                      </button>
                    </div>
                  </div>
                </template>
                <button
                  v-else
                  type="button"
                  @click="confirmDeleteIdx = rIdx"
                  title="Hapus baris"
                  class="w-8 h-8 flex items-center justify-center mx-auto rounded-full bg-red-600/20 border border-red-500 text-red-400 hover:bg-red-800 hover:text-white transition"
                >
                  <i class="mdi mdi-trash-can text-base"></i>
                </button>
              </td>
            </tr>
          </tbody>

          <tfoot>
            <!-- Edit mode tfoot: Tambah Part button + totals (13 cols) -->
            <tr v-if="dialogMode === 'edit'" class="bg-gray-900 font-semibold">
              <td colspan="2" class="px-3 py-2 text-right text-gray-300">
                <button
                  @click="openCreateInEdit"
                  class="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-400 text-sm text-white font-medium"
                >
                  <i class="mdi mdi-plus"></i>
                  Part
                </button>
              </td>
              <td colspan="2" class="px-3 py-2 text-center bg-gray-950 text-gray-300">TOTAL</td>
              <td class="px-3 py-2 text-center text-gray-300">
                {{ editForm.reduce((s, r) => Number(s) + Number(r.prepare_time ?? 0), 0) }}
              </td>
              <td class="px-3 py-2 text-center text-gray-300">
                {{ editForm.reduce((s, r) => Number(s) + Number(r.prod_time ?? 0), 0) }}
              </td>
              <td class="px-3 py-2 text-center text-gray-300">{{ editForm[0].time_start }}</td>
              <td class="px-3 py-2 text-center text-gray-300">{{ editForm[editForm.length - 1].time_end }}</td>
              <td class="px-3 py-2 text-center text-green-400">
                {{ editForm.reduce((s, r) => Number(s) + Number(r.qty_ok ?? 0), 0) }}
              </td>
              <td class="px-3 py-2 text-center text-red-400">
                {{ editForm.reduce((s, r) => Number(s) + Number(r.qty_ng ?? 0), 0) }}
              </td>
              <td class="px-3 py-2 text-center text-yellow-400/80">{{ resumeStats.gsph }}</td>
              <td class="px-3 py-2 text-center text-yellow-400/80">{{ resumeStats.cycleTimeAvg }}</td>
              <td v-if="dialogMode === 'edit'" class="bg-gray-700 px-2 py-2 w-12"></td>
            </tr>
            <!-- View mode tfoot: totals only (12 cols) -->
            <tr v-else class="bg-gray-900 font-semibold">
              <td colspan="4" class="px-3 py-2 text-center bg-gray-950 text-gray-300">TOTAL</td>
              <td class="px-3 py-2 text-center text-gray-300">
                {{ editForm.reduce((s, r) => Number(s) + Number(r.prepare_time ?? 0), 0) }}
              </td>
              <td class="px-3 py-2 text-center text-gray-300">
                {{ editForm.reduce((s, r) => Number(s) + Number(r.prod_time ?? 0), 0) }}
              </td>
              <td class="px-3 py-2 text-center text-gray-300">{{ editForm[0].time_start }}</td>
              <td class="px-3 py-2 text-center text-gray-300">{{ editForm[editForm.length - 1].time_end }}</td>
              <td class="px-3 py-2 text-center text-green-400">
                {{ editForm.reduce((s, r) => Number(s) + Number(r.qty_ok ?? 0), 0) }}
              </td>
              <td class="px-3 py-2 text-center text-red-400">
                {{ editForm.reduce((s, r) => Number(s) + Number(r.qty_ng ?? 0), 0) }}
              </td>
              <td class="px-3 py-2 text-center text-yellow-400/80">{{ resumeStats.gsphAvg }}</td>
              <td class="px-3 py-2 text-center text-yellow-400/80">{{ resumeStats.cycleTimeAvg }}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Resume Summary -->
        <div class="p-4 bg-black border-t border-gray-700">
          <table class="text-xs text-white border-collapse">
            <thead>
              <tr>
                <th colspan="4" class="border border-gray-600 px-4 py-1.5 text-center bg-gray-800 font-semibold tracking-wide">
                  TOTAL QTY
                </th>
                <th rowspan="3" class="border border-gray-600 px-6 py-1.5 text-center bg-gray-800 font-semibold tracking-wide align-middle">
                  GSPH
                </th>
                <th rowspan="3" class="border border-gray-600 px-6 py-1.5 text-center bg-gray-800 font-semibold tracking-wide align-middle">
                  TPT <br />
                  <span class="font-medium">(Minutes)</span>
                </th>
              </tr>
              <tr>
                <th colspan="2" class="border border-gray-600 px-4 py-1 text-center bg-gray-800">OK</th>
                <th colspan="2" class="border border-gray-600 px-4 py-1 text-center bg-gray-800">REJECT</th>
              </tr>
              <tr>
                <th class="border border-gray-600 px-4 py-1 text-center bg-gray-800 min-w-[70px]">PCS</th>
                <th class="border border-gray-600 px-4 py-1 text-center bg-gray-800 min-w-[55px]">%</th>
                <th class="border border-gray-600 px-4 py-1 text-center bg-gray-800 min-w-[70px]">PCS</th>
                <th class="border border-gray-600 px-4 py-1 text-center bg-gray-800 min-w-[55px]">%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-600 px-4 py-2 text-center text-green-400 font-semibold text-lg">
                  {{ resumeStats.totalOk }}
                </td>
                <td class="border border-gray-600 px-4 py-2 text-center text-green-400 text-lg">
                  {{ resumeStats.okPct }}{{ resumeStats.okPct !== '-' ? '%' : '' }}
                </td>
                <td class="border border-gray-600 px-4 py-2 text-center text-red-400 font-semibold text-lg">
                  {{ resumeStats.totalNg }}
                </td>
                <td class="border border-gray-600 px-4 py-2 text-center text-red-400 text-lg">
                  {{ resumeStats.ngPct }}{{ resumeStats.ngPct !== '-' ? '%' : '' }}
                </td>
                <td class="border border-gray-600 px-4 py-2 text-center text-yellow-300 font-semibold text-lg">
                  {{ resumeStats.gsph }}
                </td>
                <td class="border border-gray-600 px-4 py-2 text-center text-blue-300 font-semibold text-lg">
                  {{ resumeStats.tpt }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="bg-gray-900 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <template v-if="dialogMode === 'edit'">
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-400">
              <template v-if="dirtySet.size > 0">
                <span class="text-yellow-400 font-medium">{{ dirtySet.size }} record</span> diubah
              </template>
              <template v-else>Belum ada perubahan</template>
            </span>
          </div>
          <div class="flex gap-2">
            <button @click="closeEdit" class="px-4 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-sm text-white">Batal</button>
            <button
              @click="saveBatch"
              :disabled="dirtySet.size === 0"
              class="px-5 py-1.5 rounded text-sm font-medium text-white transition"
              :class="dirtySet.size > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed opacity-50'"
            >
              Simpan ({{ dirtySet.size }})
            </button>
          </div>
        </template>
        <template v-else>
          <div></div>
          <button @click="closeDetail" class="px-4 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-sm text-white">Tutup</button>
        </template>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
       CREATE DIALOG (outer — asks for NIK + Part)
  ════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div v-if="dialog.create" class="fixed inset-0 z-[2000] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60" @click="closeCreate"></div>
      <div class="relative bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 class="text-base font-semibold mb-5">Tambah Metal Finish</h2>

        <!-- NIK (employee autocomplete with server-side search) -->
        <div class="mb-4">
          <Autocomplete
            :options="employeeOptions"
            :model-value="createForm.nik"
            label="NIK / Nama Operator"
            placeholder="Cari NIK atau nama..."
            @update:model-value="(val) => (createForm.nik = String(val ?? ''))"
          />
        </div>

        <!-- Part -->
        <div class="mb-6">
          <Autocomplete
            :options="partOptions"
            :model-value="createForm.job_number"
            label="Part Number"
            placeholder="Cari part / job..."
            @update:model-value="(val) => (createForm.job_number = String(val ?? ''))"
          />
        </div>

        <div class="flex justify-end gap-2">
          <button @click="closeCreate" class="px-4 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-sm">Batal</button>
          <button @click="submitCreate" class="px-5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-sm font-medium">Simpan</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ═══════════════════════════════════════════════════════════════
       CREATE-IN-EDIT DIALOG (inside edit modal context — Part only)
  ════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div v-if="dialog.createInEdit" class="fixed inset-0 z-2500 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60" @click="closeCreateInEdit"></div>
      <div class="relative bg-gray-900 text-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 class="text-base font-semibold mb-1">Tambah Part</h2>
        <p class="text-xs text-gray-400 mb-5">{{ editGroup?.operator_name }} — {{ editGroup?.nik }}</p>

        <!-- Part -->
        <div class="mb-6">
          <Autocomplete
            :options="partOptions"
            :model-value="createForm.job_number"
            label="Part Number"
            placeholder="Cari part / job..."
            @update:model-value="(val) => (createForm.job_number = String(val ?? ''))"
          />
        </div>

        <div class="flex justify-end gap-2">
          <button @click="closeCreateInEdit" class="px-4 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-sm">Batal</button>
          <button @click="submitCreate" class="px-5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-sm font-medium">Simpan</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
<style>
.datepicker-cell.selected,
.datepicker-cell.focused {
  background-color: #5289ff;
  border-radius: 20%;
  color: white;
}
</style>
