<script setup lang="ts">
import { useStampingAchievementProdStore } from '@/stores/Stamping/Transaction/Achievement';
import { useUtilityStore } from '@/stores/utility';
import { useAuthStore } from '@/stores/auth';
import { ref, shallowRef, onMounted, inject, watch, onBeforeUnmount, computed } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { initFlowbite } from 'flowbite';
import { storeToRefs } from 'pinia';
import MultiSelectCheckbox from '@/components/shared/MultiSelectCheckbox.vue';
import Autocomplete from '@/components/form/Autocomplete.vue';
import type { AutocompleteOption } from '@/components/form/Autocomplete.vue';

// @ts-ignore
import Datepicker from 'flowbite-datepicker/Datepicker';

import { PlusOutlined, SyncOutlined, PrinterOutlined, PlayCircleOutlined } from '@ant-design/icons-vue';

import type { FormAttendance } from '@/types/Stamping/Transaction/Achievement';
import moment from 'moment';

const utilityStore = useUtilityStore();
const achievementStore = useStampingAchievementProdStore();
const authStore = useAuthStore();

const { formatDate, formatDecimaltoNumber, formatPercentOneZero, formatNumberOneDecimal, focusNext } = utilityStore;

const {
  fetchDataLine,
  fetchDataPart,
  loadDataDetailEdit,
  openForm,
  checkForm,
  loadDataLed,
  loadDataKanban,
  onSaveDetail,
  onDelete,
  deleteData,
  onMove,
  countDataActual,
  startItem,
  filterMachineLine,
  onEmptyKanban,
  rePrintKanban,
  onSaveMachine,
  loadKeteranganRepair,
  loadKeteranganDT,
  stopItem,
  startProcess,
  stopProcess,
  addRow,
  printEKanban,
  cancelEkanban,
  onAddLine,
  closeForm,
  closeRefreshForm
} = achievementStore;

const { user } = authStore;

const {
  params,
  lines,
  patan,
  dialog,
  addList,
  statusList,
  listAllLine,
  combinationProcess,
  keteranganList,
  keteranganAllList,
  statusDelivery,
  planProcess,
  totalProcess,
  permissions,
  shiftNow,
  formDetail,
  line_id,
  line,
  formAttendance,
  statusForm,
  partItems,
  list,
  formKanbanFull
} = storeToRefs(achievementStore);

const roles = ref<string[]>(['Foreman', 'Checkman', 'Crane', 'Operator']);

type AttendanceKey = keyof FormAttendance;
const properties = ref<AttendanceKey[]>(['standard', 'present', 'leave', 'exchange_day', 'permit', 'sick', 'absent']);

const page = ref({ title: '' });
const breadcrumbs = shallowRef([
  {
    title: 'Stamping',
    disabled: false,
    href: '#'
  },
  {
    title: 'Production',
    disabled: false,
    href: '#'
  },
  {
    title: 'Achievement Stamping',
    disabled: true,
    href: '#'
  }
]);

const view = ref(false);
const confirmDeleteUrut = ref<string | number | null>(null);

const askDelete = (urut: string | number) => {
  confirmDeleteUrut.value = urut;
};

const confirmDelete = () => {
  if (confirmDeleteUrut.value !== null) {
    onDelete(confirmDeleteUrut.value);
  }
  confirmDeleteUrut.value = null;
};

const ketEditor = ref({ open: false, field: '', index: 0, label: '', upper: false, value: '' });

const openKetEditor = (field: string, index: number, label: string, upper: boolean) => {
  const list = (formDetail.value as any)[field] ?? [];
  ketEditor.value = { open: true, field, index, label, upper, value: list[index] ?? '' };
};

const saveKetEditor = () => {
  const { field, index, upper, value } = ketEditor.value;
  const detail = formDetail.value as any;
  if (!Array.isArray(detail[field])) detail[field] = [];
  detail[field][index] = upper ? value.toUpperCase() : value;
  ketEditor.value.open = false;
};

const beforeUnloadHandler = () => {
  closeRefreshForm(user.fullname!);
};

onMounted(() => {
  fetchDataPart();
  fetchDataLine();
  initFlowbite();

  window.addEventListener('beforeunload', beforeUnloadHandler);
  closeRefreshForm(user.fullname!);
  socket?.emit('andonConnectedChecker', {
    app: 'mims'
  });

  const el = document.getElementById('datepicker-inline');
  if (!el) return;

  const datepicker = new Datepicker(el, {
    autohide: true,
    format: 'yyyy-mm-dd'
  });

  if (params.value.date) {
    datepicker.setDate(params.value.date);
  }

  el.addEventListener('changeDate', (e: any) => {
    const d: Date = e.detail.date;

    const localDate = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

    params.value.date = localDate;

    fetchDataLine();

    page.value.title = `Achievement Stamping (${formatDate(params.value.date)} / Shift ${params.value.shift} / Patan ${patan.value})`;
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnloadHandler);
});

function calculationGSPH(jumlah_mesin: number): string {
  const totalTPT = Number(formDetail.value.total_tpt_actual || 0);

  if (totalTPT <= 0 || jumlah_mesin <= 0) {
    return '-';
  }

  const totalStroke = Number(formDetail.value.total_stroke_actual || 0);
  const totalIdleTime = Number(formDetail.value.total_idletime || 0);

  const effectiveTime = totalTPT - totalIdleTime;

  if (effectiveTime <= 0) {
    return '-';
  }

  const gsph = (totalStroke / effectiveTime / jumlah_mesin) * 60;

  return Number.isFinite(gsph) ? Math.round(gsph).toString() : '-';
}

function calculateAverage(arr: Array<number | string>): number {
  if (arr.length === 0) {
    return 0;
  }
  const filteredArray = arr.filter((item): item is number | string => item !== '0' && item !== '');

  if (filteredArray.length === 0) {
    return 0;
  }
  const sum = filteredArray.reduce<number>((total, item) => total + Number(item), 0);
  return sum / filteredArray.length;
}

const form = ref<{ validate: () => boolean } | null>(null);
const submitHandler = (): void => {
  form.value?.validate();
};

function close(): void {
  window.location.reload();
}

// Helper arrowkey
type ArrowKey = 'ArrowRight' | 'ArrowLeft' | 'ArrowDown' | 'ArrowUp';

const inputRefs = ref<Record<string, HTMLElement | null>>({});

const handleArrowKey = (e: KeyboardEvent, row: number, col: number): void => {
  const target = e.target as HTMLInputElement | null;
  if (!target) return;

  if (e.key === 'Enter') {
    if (target.list) {
      e.preventDefault();
      e.stopPropagation();
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      return;
    }
  }

  // HANYA INI YANG DIOPTIMASI - ganti object dengan switch
  let dRow = 0,
    dCol = 0;
  switch (e.key) {
    case 'ArrowRight':
      dCol = 1;
      break;
    case 'ArrowLeft':
      dCol = -1;
      break;
    case 'ArrowDown':
      dRow = 1;
      break;
    case 'ArrowUp':
      dRow = -1;
      break;
    default:
      return;
  }

  e.preventDefault();

  let nextRow = row + dRow;
  let nextCol = col + dCol;

  const maxRow = formDetail.value.is_tandem.length;

  while (true) {
    if (nextRow < 0 || nextRow >= maxRow) return;
    if (nextCol < 0 || nextCol > 30) return;

    const nextKey = `inputField-${nextRow}-${nextCol}`;
    const el = inputRefs.value[nextKey] as HTMLInputElement | null;

    if (el) {
      // GANTI: pakai microtask lebih cepat
      queueMicrotask(() => {
        el.focus();
      });
      return;
    }

    if (dRow !== 0) nextRow += dRow;
    else nextCol += dCol;
  }
};

type RuleResult = true | string;

const getTextFieldRules = (dataLain: number, data: number): RuleResult => {
  if (dataLain > 0 && data === 0) {
    return 'Text is required when number is greater than 10';
  }
  return true;
};

const getTextFieldRulesMany = (dataLain: number, dataLain2: number, dataLain3: number, data: number): RuleResult => {
  if ((dataLain2 === 0 || dataLain3 === 0) && dataLain > 0 && data === 0) {
    return 'Text is required when number is greater than 10';
  }
  return true;
};

const saveKanbanFull = (): void => {
  const qtyOk = Number(formKanbanFull.value.qty_ok);
  const maxQty = Number(formKanbanFull.value.total_kanban);
  const dIndex = formKanbanFull.value.dIndex;

  // VALIDASI
  if (!qtyOk || qtyOk < 1) {
    utilityStore.showLocalWarning('Validasi', 'Qty OK harus lebih dari 0');
    return;
  }

  if (qtyOk > maxQty) {
    utilityStore.showLocalWarning('Validasi', `Qty OK tidak boleh melebihi ${maxQty}`);
    return;
  }

  // AUTO CHECK CHECKBOX
  for (let i = 1; i <= qtyOk; i++) {
    const key = `${dIndex}-${i}`;
    if (!checkedStatus.value?.[key]) {
      handleCheckboxClick(dIndex, i);
    }
  }

  // PRINT
  printEKanban(formKanbanFull.value.part_number_rh, formKanbanFull.value.part_number_lh, user.username!, qtyOk);

  // CLOSE DIALOG
  dialog.value.kanbanFull = false;
};

const cancelKanbanFull = (): void => {
  const qtyOk = Number(formKanbanFull.value.qty_ok);
  const maxQty = Number(formKanbanFull.value.total_kanban);
  const dIndex = formKanbanFull.value.dIndex;

  // VALIDASI
  if (!qtyOk || qtyOk < 1) {
    utilityStore.showLocalWarning('Validasi', 'Qty OK harus lebih dari 0');
    return;
  }

  if (qtyOk > maxQty) {
    utilityStore.showLocalWarning('Validasi', `Qty OK tidak boleh melebihi ${maxQty}`);
    return;
  }

  // AUTO CHECK CHECKBOX
  for (let i = 1; i <= qtyOk; i++) {
    const key = `${dIndex}-${i}`;
    if (!checkedStatus.value?.[key]) {
      handleCheckboxClick(dIndex, i);
    }
  }

  // CANCEL E-KANBAN
  cancelEkanban(formKanbanFull.value.part_number_rh, formKanbanFull.value.part_number_lh, user.username!, qtyOk);

  // CLOSE DIALOG
  dialog.value.kanbanFull = false;
};

const checkedStatus = ref<Record<string, boolean>>({});

const handleCheckboxClick = (dIndex: number, index: number): void => {
  const key = `${dIndex}-${index}`;

  if (!checkedStatus.value) {
    checkedStatus.value = {};
  }

  checkedStatus.value[key] = !checkedStatus.value[key];
};

const socket = inject<any>('socket');

const onReloadPage = (id: string | null = null): void => {
  const data: Record<string, any> = { app: 'mims' };
  if (id) {
    data.id = id;
  }

  socket?.emit?.('reloadPageEmit', data);
};

// helper machine and process
const machineOptions = computed(() => {
  return filterMachineLine() ?? [];
});

const processOptions = computed(() => {
  return list.value.process ?? [];
});

const partOptions = computed<AutocompleteOption[]>(() =>
  (partItems.value ?? []).map((p) => ({
    value: p.part_number,
    label: p.part_number,
    sublabel: p.job_number !== p.part_number ? p.job_number : undefined
  }))
);

//helper
watch(
  [() => params.value.date, () => params.value.shift, () => patan.value],
  () => {
    page.value.title = `Achievement Stamping (${formatDate(params.value.date)} / Shift ${params.value.shift} / Patan ${patan.value})`;
  },
  { immediate: true }
);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5"></BaseBreadcrumb>
  <div class="flex flex-wrap items-center mb-3 gap-2">
    <button
      @click="dialog.addLine = true"
      class="flex items-center gap-2 text-white bg-yellow-400 hover:bg-yellow-800 focus:ring-red-500 focus:border-red-500 font-medium rounded-full text-sm px-4 py-1.5 text-center"
    >
      <PlusOutlined />
      Add Line
    </button>

    <button
      v-if="user.username == 'administrator'"
      @click="onReloadPage()"
      class="flex items-center gap-2 text-white bg-red-600 hover:bg-red-800 focus:ring-red-500 focus:border-red-500 font-medium rounded-full text-sm px-3 py-1.5 text-center"
    >
      <SyncOutlined />
      Refresh All Line
    </button>

    <div class="flex">
      <button
        type="button"
        data-dropdown-toggle="datepickerDropdown"
        class="flex items-center gap-2 mr-1 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 font-medium rounded-s-xl text-sm px-3 py-1.5 text-center"
      >
        Filter By Date
        <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4" />
        </svg>
      </button>
      <form class="flex w-1/4">
        <select
          v-model="params.shift"
          id="shift"
          @change="() => fetchDataLine()"
          class="bg-gray-50 min-w-[130px] border border-new text-gray-900 text-sm rounded-e-xl focus:ring-blue-500 focus:border-blue-500 block w-auto px-3 py-1.5"
        >
          <option value="" disabled>Pilih Shift</option>
          <option :value="1">Shift 1</option>
          <option :value="2">Shift 2</option>
        </select>
      </form>
    </div>
    <div id="datepickerDropdown" class="hidden z-50 mt-2 w-72 bg-white rounded-lg shadow">
      <div id="datepicker-inline"></div>
    </div>
  </div>

  <!-- Menu -->
  <div class="mt-1 mb-15">
    <div class="grid max-sm:grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      <div v-for="(line, i) in lines" :key="i">
        <div class="rounded-lg shadow bg-[#182747] text-white hover:shadow-lg transition hover-menu" style="border-top: 5px solid #2563eb">
          <div class="p-4 flex justify-between items-center">
            <!-- LEFT -->
            <div class="min-w-0">
              <span class="text-lg font-semibold truncate block"> LINE {{ line.line_id }} </span>
            </div>

            <!-- RIGHT -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <!-- VIEW -->
              <button
                class="w-7 h-7 flex items-center justify-center rounded-full text-white bg-blue-500 border border-blue-500"
                @click="[(view = true), loadDataDetailEdit(line)]"
              >
                <i class="mdi mdi-eye text-sm"></i>
              </button>

              <!-- EDIT -->
              <button
                :disabled="!permissions.update && !permissions.create && !permissions.pcd"
                :class="
                  permissions.update || permissions.create || permissions.pcd
                    ? 'text-white bg-green-500 border-green-500'
                    : 'text-gray-600 border-gray-600 bg-gray-200 cursor-not-allowed'
                "
                class="px-2 py-1 text-xs rounded border"
                @click="(loadDataDetailEdit(line), checkForm(user.fullname!), openForm(line))"
              >
                Edit
              </button>

              <!-- LED -->
              <button
                :disabled="!permissions.update && !permissions.create && !permissions.pcd"
                :class="
                  permissions.update || permissions.create || permissions.pcd
                    ? 'text-white bg-red-500 border-red-500'
                    : 'text-gray-600 border-gray-600 bg-gray-200 cursor-not-allowed'
                "
                class="px-2 py-1 text-xs rounded border"
                @click="loadDataLed(line)"
              >
                LED
              </button>

              <!-- E-KBN -->
              <button
                :disabled="!permissions.update && !permissions.create && !permissions.pcd"
                :class="
                  permissions.update || permissions.create || permissions.pcd
                    ? 'text-white bg-yellow-400 border-yellow-400'
                    : 'text-gray-600 border-gray-600 bg-gray-200 cursor-not-allowed'
                "
                class="px-2 py-1 text-xs rounded border"
                @click="loadDataKanban(line)"
              >
                E-KBN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Dialog (View / Edit Mode) -->
  <div v-if="dialog.detail" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
    <div class="relative bg-black text-white shadow-lg max-w-[98vw] max-h-[94vh] overflow-auto">
      <div :class="!view ? 'div1' : ''">
        <table class="border-separate border-spacing-0 w-full text-sm" :class="!view ? 'text-white bg-black' : 'text-white bg-black'">
          <!-- Header View & Edit Table Dialog -->
          <thead>
            <tr class="bg-gray-900">
              <th :colspan="view ? 38 : 51" class="p-2 text-center">Line {{ line_id }}</th>
            </tr>

            <tr>
              <th :colspan="view ? 14 : 19" class="bg-blue-500 p-1">
                PLAN
                <span class="font-normal">{{ '(' + formatDate(params.date) + ' / Shift ' + params.shift + ')' }}</span>
              </th>
              <th :colspan="view ? 24 : 32" class="bg-green-500 p-1">
                ACTUAL <span class="font-normal">{{ '(' + formatDate(params.date) + ' / Shift ' + params.shift + ')' }}</span>
              </th>
            </tr>
            <tr>
              <th rowspan="3" v-if="!view" class="bg-blue-500 sticky9">Delete</th>
              <th rowspan="3" class="bg-blue-500" :class="!view ? 'sticky' : 'stick'">No</th>
              <th rowspan="3" v-if="!view" class="bg-blue-500 tandem sticky2">Tandem</th>
              <th rowspan="3" v-if="!view" class="bg-blue-500 sticky3">Order</th>
              <th rowspan="3" v-if="!view" class="bg-blue-500 sticky4">Plan Order</th>
              <th
                rowspan="3"
                :colspan="(!view && permissions.pcd == true) || (!view && params.date !== shiftNow.date) ? 2 : 0"
                class="bg-blue-500"
              >
                Patan
              </th>
              <th rowspan="3" class="bg-blue-500 line_id">Line</th>
              <th class="sticky left-22 z-12 bg-blue-500 part" :class="!view ? 'sticky7' : 'stick7'" colspan="2" :rowspan="view ? 1 : 2">
                Part
              </th>
              <th class="sticky left-95.75 z-12 bg-blue-500" rowspan="3" :class="!view ? 'sticky8' : 'stick8'">Status</th>
              <th class="bg-blue-500" rowspan="3">Mapping Process</th>
              <th class="bg-blue-500" rowspan="3">Stroke</th>
              <th class="bg-blue-500" rowspan="3">Jumlah Process</th>
              <th class="bg-blue-500" colspan="2">Lot Size</th>
              <th class="bg-blue-500" rowspan="2" :colspan="view ? 0 : 2" style="width: 100px">TPT</th>
              <th class="bg-blue-500" rowspan="3">GSPH Plan</th>
              <th class="bg-blue-500" rowspan="3">Keterangan</th>
              <th class="bg-green-500" rowspan="3">Stroke</th>
              <th class="bg-green-500" rowspan="3">Total Process</th>
              <th v-if="!view" class="bg-green-500" rowspan="3">LED</th>
              <th class="bg-green-500" colspan="2">OK</th>
              <th :colspan="view ? '2' : '3'" style="width: 100px" class="bg-green-500">Repair</th>
              <th :colspan="view ? '2' : '3'" style="width: 100px" class="bg-green-500">Reject</th>
              <th class="bg-green-500" colspan="2" v-if="params.date >= '2024-02-07'">Total Lot Size</th>
              <th class="bg-green-500" rowspan="3">Status</th>
              <th class="bg-green-500" rowspan="3">Idletime</th>
              <th class="bg-green-500" rowspan="2">Dandori</th>
              <th :colspan="view ? '5' : '6'" style="width: 100px" class="bg-green-500">Down Time</th>
              <th class="bg-green-500" :rowspan="view ? '1' : '2'" colspan="2">TPT</th>
              <th class="bg-green-500" rowspan="2">GSPH</th>
              <th v-if="!view" class="bg-green-500" rowspan="3" style="width: 250px">Keterangan</th>
              <th class="bg-green-500" :rowspan="view ? '2' : '3'" style="width: 250px">Status Delivery</th>
              <th class="bg-green-500 text-no-wrap" :rowspan="view ? '2' : '3'">Tipe Palet</th>
              <th class="bg-green-500" :rowspan="view ? '2' : '3'">Jumlah Palet</th>
              <th v-if="!view" class="bg-green-500" rowspan="3">Start Machine</th>
              <th v-if="!view" class="bg-green-500" rowspan="3">Next Process</th>
            </tr>
            <tr>
              <th v-if="view" class="sticky left-22 z-12 bg-blue-500 stick7">RH</th>
              <th v-if="view" class="sticky left-59 z-12 bg-blue-500 stick72">LH</th>
              <th class="bg-blue-500">RH</th>
              <th class="bg-blue-500">LH</th>
              <th class="bg-green-500">RH</th>
              <th class="bg-green-500">LH</th>

              <th class="bg-green-500">RH</th>
              <th class="bg-green-500">LH</th>
              <th v-if="!view" class="bg-green-500" rowspan="2">KET</th>
              <th class="bg-green-500">RH</th>
              <th class="bg-green-500">LH</th>
              <th v-if="!view" class="bg-green-500" rowspan="2">KET</th>
              <th v-if="params.date >= '2024-02-07'" class="bg-green-500">RH</th>
              <th v-if="params.date >= '2024-02-07'" class="bg-green-500">LH</th>
              <th class="bg-green-500">Machines</th>
              <th class="bg-green-500">Dies</th>
              <th class="bg-green-500">Other</th>
              <th class="bg-green-500">Material</th>
              <th class="bg-green-500">Total</th>
              <th v-if="!view" class="bg-green-500" rowspan="2">KET</th>
              <th v-if="view" class="bg-green-500">(minutes)</th>
              <th v-if="view" class="bg-green-500">(jam)</th>
            </tr>
            <tr v-if="!view">
              <th class="bg-blue-500 sticky7 rh">RH</th>
              <th class="bg-blue-500 sticky72 lh">LH</th>
              <th class="bg-blue-500">(pcs)</th>
              <th class="bg-blue-500">(pcs)</th>
              <th class="bg-blue-500">(minutes)</th>
              <th class="bg-blue-500">(jam)</th>
              <th class="bg-green-500">(pcs)</th>
              <th class="bg-green-500">(pcs)</th>
              <th v-if="params.date >= '2024-02-07'" class="bg-green-500">(pcs)</th>
              <th v-if="params.date >= '2024-02-07'" class="bg-green-500">(pcs)</th>
              <th class="bg-green-500">(pcs)</th>
              <th class="bg-green-500">(pcs)</th>
              <th class="bg-green-500">(pcs)</th>
              <th class="bg-green-500">(pcs)</th>
              <th class="bg-green-500">(minutes)</th>
              <th class="bg-green-500">(minutes)</th>
              <th class="bg-green-500">(minutes)</th>
              <th class="bg-green-500">(minutes)</th>
              <th class="bg-green-500">(minutes)</th>
              <th class="bg-green-500">(minutes)</th>
              <th class="bg-green-500">(minutes)</th>
              <th class="bg-green-500">(jam)</th>
              <th class="bg-green-500">(stroke/hour)</th>
            </tr>
          </thead>

          <!-- View Mode Table -->
          <tbody v-if="view">
            <tr v-for="dIndex in formDetail.is_tandem.length" :key="`data-process-${dIndex}`" class="hover:bg-slate-700/40 transition">
              <th class="table-view bg">
                {{ formDetail.urut_plan[dIndex - 1] }}
              </th>
              <th class="table-view bg" v-if="formDetail.additional[dIndex - 1] == 1">Add</th>
              <th class="table-view bg" v-else>
                {{
                  formDetail.additional[dIndex - 1] == 1
                    ? 'Add'
                    : formDetail.additional[dIndex - 1] == 2
                      ? 'LJ'
                      : formDetail.additional[dIndex - 1] == 3
                        ? 'TP'
                        : formDetail.patan[dIndex - 1]
                }}
              </th>
              <th class="sticky left-0 z-12 bg">
                {{ formDetail.original_line[dIndex - 1] }}
              </th>
              <th
                class="table-view tooltip-cell sticky left-22 z-12 w-43 min-w-37 px-0 bg"
                :data-tooltip="(formDetail.job_rh || '')[dIndex - 1]"
              >
                {{ formDetail.part_rh[dIndex - 1] }}
              </th>
              <th
                class="table-view tooltip-cell sticky left-59 z-12 w-43 min-w-37 px-0 bg"
                :data-tooltip="(formDetail.job_lh || '')[dIndex - 1]"
              >
                {{ formDetail.part_lh[dIndex - 1] }}
              </th>
              <th class="table-view sticky left-95.75 z-12 bg">
                {{ formDetail.status_plan[dIndex - 1] }}
              </th>
              <th class="table-view bg">
                {{ formDetail.combination[dIndex - 1] }}
              </th>
              <th class="table-view">
                {{ formDetail.stroke_plan[dIndex - 1] ? formDetail.stroke_plan[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.plan_process[dIndex - 1] ? formDetail.plan_process[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.lot_rh[dIndex - 1] }}
              </th>
              <th class="table-view">
                {{ formDetail.lot_lh[dIndex - 1] }}
              </th>
              <th class="table-view">
                {{ formDetail.tpt[dIndex - 1] }}
              </th>
              <th class="table-view">
                {{ formDetail.gsph_plan[dIndex - 1] }}
              </th>
              <th class="table-view">
                {{ formDetail.keterangan[dIndex - 1] }}
              </th>
              <th class="table-view">
                {{ formDetail.stroke_act[dIndex - 1] ? formDetail.stroke_act[dIndex - 1] : '' }}
              </th>
              <td>
                {{ formDetail.act_process[dIndex - 1] !== 0 ? formDetail.total_process[dIndex - 1] : '' }}
              </td>
              <th>
                {{
                  Number(formDetail.act_rh[dIndex - 1]) !== 0
                    ? formDetail.act_rh[dIndex - 1]
                    : Number(formDetail.act_lh[dIndex - 1]) > 0
                      ? formDetail.act_rh[dIndex - 1]
                      : ''
                }}
              </th>
              <th>
                {{
                  formDetail.act_lh[dIndex - 1] !== 0
                    ? formDetail.act_lh[dIndex - 1]
                    : formDetail.act_rh[dIndex - 1] > 0
                      ? formDetail.act_lh[dIndex - 1]
                      : ''
                }}
              </th>
              <th class="table-view">
                {{ Number(formDetail.repair_rh[dIndex - 1]) !== 0 ? formDetail.repair_rh[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.repair_lh[dIndex - 1] !== 0 ? formDetail.repair_lh[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ Number(formDetail.reject_rh[dIndex - 1]) !== 0 ? formDetail.reject_rh[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.reject_lh[dIndex - 1] !== 0 ? formDetail.reject_lh[dIndex - 1] : '' }}
              </th>
              <th
                v-if="params.date >= '2024-02-07'"
                class="table-view"
                :class="
                  Number(formDetail.total_lotsize_rh[dIndex - 1]) > Number(formDetail.lot_rh[dIndex - 1])
                    ? 'text-blue-500'
                    : Number(formDetail.total_lotsize_rh[dIndex - 1]) < Number(formDetail.lot_rh[dIndex - 1])
                      ? 'text-red-500'
                      : ''
                "
              >
                {{ formDetail.total_lotsize_rh[dIndex - 1] ? formDetail.total_lotsize_rh[dIndex - 1] : '' }}
              </th>
              <th
                v-if="params.date >= '2024-02-07'"
                class="table-view"
                :class="
                  Number(formDetail.total_lotsize_lh[dIndex - 1]) > Number(formDetail.lot_lh[dIndex - 1])
                    ? 'text-blue-500'
                    : Number(formDetail.total_lotsize_lh[dIndex - 1]) < Number(formDetail.lot_lh[dIndex - 1])
                      ? 'text-red-500'
                      : ''
                "
              >
                {{ formDetail.total_lotsize_lh[dIndex - 1] ? formDetail.total_lotsize_lh[dIndex - 1] : '' }}
              </th>
              <th class="table-view" :class="formDetail.status_plan[dIndex - 1] !== formDetail.status[dIndex - 1] ? 'text-red-500' : ''">
                {{ formDetail.status[dIndex - 1] }}
              </th>
              <th class="table-view">
                {{ formDetail.idletime[dIndex - 1] !== 0 ? formDetail.idletime[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.dandori[dIndex - 1] !== 0 ? formDetail.dandori[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.dt_machines[dIndex - 1] !== 0 ? formDetail.dt_machines[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.dt_dies[dIndex - 1] !== 0 ? formDetail.dt_dies[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.dt_other[dIndex - 1] !== 0 ? formDetail.dt_other[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.dt_material[dIndex - 1] !== 0 ? formDetail.dt_material[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.total_dt[dIndex - 1] ? formDetail.total_dt[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.tpt_actual[dIndex - 1] !== 0 ? formDetail.tpt_actual[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.tpt_actual[dIndex - 1] !== 0 ? formDetail.finish_actual[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.tpt_actual[dIndex - 1] !== 0 ? formatDecimaltoNumber(formDetail.gsph[dIndex - 1]) : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.status_delivery[dIndex - 1] ? formDetail.status_delivery[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.tipe_palet[dIndex - 1] ? formDetail.tipe_palet[dIndex - 1] : '' }}
              </th>
              <th class="table-view">
                {{ formDetail.act_palet[dIndex - 1] ? formDetail.act_palet[dIndex - 1] : '' }}
              </th>
            </tr>
          </tbody>

          <!-- Edit Mode Table -->
          <tbody v-else>
            <tr v-for="(row, idx) in formDetail.is_tandem.length > 13 ? formDetail.is_tandem.length : 13" :key="`data-process-${idx}`">
              <td v-if="permissions.pcd === true" class="text-center">
                <button
                  v-if="!view"
                  type="button"
                  @click="askDelete(formDetail.urut[idx])"
                  class="inline-flex items-center justify-center w-8 h-8 text-white bg-black rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2-3h6a1 1 0 011 1v1H8V5a1 1 0 011-1z"
                    />
                  </svg>
                </button>
              </td>
              <td v-else class="text-center">
                <button
                  v-if="!view"
                  type="button"
                  @click="deleteData()"
                  class="inline-flex items-center justify-center w-8 h-8 text-white bg-black rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  <!-- Delete Icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2-3h6a1 1 0 011 1v1H8V5a1 1 0 011-1z"
                    />
                  </svg>
                </button>
              </td>
              <td>{{ idx + 1 }}</td>
              <td>
                <input type="checkbox" class="checkbox" v-model="formDetail.is_tandem[idx]" value="1" @change="countDataActual" />
              </td>
              <td class="sticky3">
                <div class="flex items-center justify-center gap-1 w-auto">
                  <button
                    v-if="idx < formDetail.is_tandem.length - 1"
                    type="button"
                    @click="onMove('down', formDetail.urut[idx])"
                    class="inline-flex items-center justify-center w-8 h-8 text-white bg-red-500 rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <button
                    v-if="idx > 0"
                    type="button"
                    @click="onMove('up', formDetail.urut[idx])"
                    class="inline-flex items-center justify-center w-8 h-8 text-white bg-blue-500 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </div>
              </td>
              <td>
                {{ formDetail.urut_plan[idx] }}
              </td>
              <td v-if="formDetail.urut_plan[idx] == ''" class="text-left">
                <select
                  v-model="formDetail.additional[idx]"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option v-for="(item, i) in addList" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>

                <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-800 text-lg"> ▾ </span>
              </td>
              <td v-else-if="formDetail.additional[idx] == '1'">Add</td>
              <th v-else>
                {{
                  formDetail.additional[idx] == 1
                    ? 'Add'
                    : formDetail.additional[idx] == 2
                      ? 'LJ'
                      : formDetail.additional[idx] == 3
                        ? 'TP'
                        : formDetail.patan[idx]
                }}
              </th>
              <td v-if="permissions.pcd == true || params.date !== shiftNow.date" class="text-left text-black font-normal">
                <datalist id="addListOptions">
                  <option
                    v-for="(item, i) in addList"
                    :key="i"
                    :value="item"
                    placeholder=""
                    @keydown="handleArrowKey($event, idx, 0)"
                    :ref="(el) => (inputRefs[`inputField-${idx}-0`] = el as HTMLElement)"
                  />
                </datalist>
              </td>
              <td>
                <select
                  v-model="formDetail.original_line[idx]"
                  @keydown="handleArrowKey($event, idx, 1)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-1`] = el as HTMLElement)"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option v-for="(item, i) in listAllLine" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>

                <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-800 text-lg"> ▾ </span>
              </td>
              <td
                v-if="permissions.pcd === true || formDetail.urut_plan[idx] == 0 || params.date !== shiftNow.date"
                class="text-left sticky_rh text-black font-medium"
              >
                <Autocomplete
                  :options="partOptions"
                  v-model="formDetail.part_rh[idx]"
                  input-class="w-full"
                  @keydown="handleArrowKey($event, idx, 2)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-2`] = el as any)"
                  @update:model-value="countDataActual"
                />
              </td>

              <td v-else class="sticky_rh">
                {{ formDetail.part_rh[idx] }}
              </td>

              <td
                v-if="permissions.pcd === true || formDetail.urut_plan[idx] == 0 || params.date !== shiftNow.date"
                class="text-left sticky_lh text-black font-medium"
              >
                <Autocomplete
                  :options="partOptions"
                  v-model="formDetail.part_lh[idx]"
                  input-class="w-full"
                  @keydown="handleArrowKey($event, idx, 3)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-3`] = el as any)"
                  @update:model-value="countDataActual"
                />
              </td>

              <td v-else class="sticky_lh">
                {{ formDetail.part_lh[idx] }}
              </td>

              <td
                v-if="permissions.pcd == true || formDetail.urut_plan[idx] == 0 || params.date !== shiftNow.date"
                class="text-left sticky_status text-black font-normal"
              >
                <select
                  v-model="formDetail.status_plan[idx]"
                  @keydown="handleArrowKey($event, idx, 4)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-4`] = el as HTMLElement)"
                  @change="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option v-for="(item, i) in statusList" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>
              </td>

              <td v-else class="sticky_status">
                {{ formDetail.status_plan[idx] }}
              </td>

              <td
                v-if="permissions.pcd == true || formDetail.urut_plan[idx] == 0 || params.date !== shiftNow.date"
                class="text-center text-black font-normal"
              >
                <select
                  v-model="formDetail.combination[idx]"
                  @keydown="handleArrowKey($event, idx, 5)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-5`] = el as HTMLElement)"
                  @change="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option v-for="(item, i) in combinationProcess" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>
              </td>
              <td v-else>{{ formDetail.combination[idx] }}</td>
              <td>
                {{ formDetail.stroke_plan[idx] ? formDetail.stroke_plan[idx] : 0 }}
              </td>

              <td
                v-if="permissions.pcd == true || formDetail.urut_plan[idx] == 0 || params.date !== shiftNow.date"
                class="text-left text-black font-normal"
              >
                <select
                  v-model="formDetail.plan_process[idx]"
                  @keydown="handleArrowKey($event, idx, 6)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-6`] = el as HTMLElement)"
                  @change="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option v-for="(item, i) in planProcess" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>
              </td>
              <td v-else>
                {{ formDetail.plan_process[idx] }}
              </td>

              <td
                v-if="permissions.pcd === true || formDetail.urut_plan[idx] == 0 || params.date !== shiftNow.date"
                class="text-left text-black font-normal"
              >
                <input
                  type="number"
                  v-model="formDetail.lot_rh[idx]"
                  @keydown="handleArrowKey($event, idx, 7)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-7`] = el as HTMLElement)"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-1 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 achievement"
                  @input="countDataActual"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.lot_rh[idx] }}
              </td>

              <td
                v-if="permissions.pcd === true || formDetail.urut_plan[idx] == 0 || params.date !== shiftNow.date"
                class="text-left text-black font-normal"
              >
                <input
                  type="number"
                  v-model="formDetail.lot_lh[idx]"
                  @keydown="handleArrowKey($event, idx, 8)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-8`] = el as HTMLElement)"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-1 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 achievement"
                  @input="countDataActual"
                  placeholder=""
                />
              </td>
              <td v-else>{{ formDetail.lot_lh[idx] }}</td>

              <td
                v-if="permissions.pcd == true || formDetail.urut_plan[idx] == 0 || params.date !== shiftNow.date"
                class="text-left text-black font-normal"
              >
                <input
                  type="number"
                  v-model="formDetail.tpt[idx]"
                  @keydown="handleArrowKey($event, idx, 9)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-9`] = el as HTMLElement)"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 achievement"
                  @input="countDataActual"
                  placeholder=""
                />
              </td>
              <td v-else>{{ formDetail.tpt[idx] }}</td>
              <td>
                {{ formDetail.finish_plan[idx] }}
              </td>

              <td
                v-if="permissions.pcd == true || formDetail.urut_plan[idx] == 0 || params.date !== shiftNow.date"
                class="text-left text-black font-normal"
              >
                <input
                  type="number"
                  v-model="formDetail.gsph_plan[idx]"
                  @keydown="handleArrowKey($event, idx, 10)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-10`] = el as HTMLElement)"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-1 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 achievement"
                  @input="countDataActual"
                  placeholder=""
                />
              </td>
              <td v-else>{{ formDetail.gsph_plan[idx] }}</td>

              <td>
                <select
                  v-model="formDetail.keterangan[idx]"
                  @keydown="handleArrowKey($event, idx, 11)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-11`] = el as HTMLElement)"
                  @change="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option v-for="(item, i) in keteranganList" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>
              </td>
              <td>
                {{ formDetail.stroke_act[idx] ? formDetail.stroke_act[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <select
                  v-model.number="formDetail.act_process[idx]"
                  @keydown="handleArrowKey($event, idx, 12)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-12`] = el as HTMLElement)"
                  @change="countDataActual"
                  class="w-full bg-white text-gray-900 border rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  :class="{
                    'border-red-500 bg-red-50':
                      Number(formDetail.act_process[idx]) > 0 && formDetail.act_process[idx] !== formDetail.value_combination[idx]
                  }"
                >
                  <option v-for="(item, i) in totalProcess" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>
              </td>
              <td v-else>
                {{ formDetail.act_process[idx] ? formDetail.act_process[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <button
                  v-if="!view"
                  type="button"
                  @click="loadDataLed(line)"
                  class="inline-flex items-center justify-center w-full min-w-[56px] px-3 py-1.5 font-semibold text-white rounded bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  LED
                </button>
              </td>
              <td v-else>LED</td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.act_rh[idx]"
                  @keydown="handleArrowKey($event, idx, 13)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-13`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full achievement bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px] h-10"
                />
              </td>
              <td v-else>
                {{ formDetail.act_rh[idx] ? formDetail.act_rh[idx] : 0 }}
              </td>

              <td
                v-if="
                  (permissions.pcd == false && formDetail.part_lh[idx]) || (user.username == 'administrator' && formDetail.part_lh[idx])
                "
              >
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.act_lh[idx]"
                  @keydown="handleArrowKey($event, idx, 14)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-14`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full achievement bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px] h-10"
                />
              </td>
              <td v-else>
                {{ formDetail.act_lh[idx] ? formDetail.act_lh[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.repair_rh[idx]"
                  @keydown="handleArrowKey($event, idx, 15)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-15`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full achievement bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px] h-10"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.repair_rh[idx] ? formDetail.repair_rh[idx] : 0 }}
              </td>

              <td
                v-if="
                  (permissions.pcd == false && formDetail.part_lh[idx]) || (user.username == 'administrator' && formDetail.part_lh[idx])
                "
              >
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.repair_lh[idx]"
                  @keydown="handleArrowKey($event, idx, 16)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-16`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full achievement bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px] h-10"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.repair_lh[idx] ? formDetail.repair_lh[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <button
                  v-if="!view"
                  type="button"
                  @click="loadKeteranganRepair()"
                  class="inline-flex items-center justify-center w-full min-w-[56px] px-3 py-1.5 font-semibold text-white rounded bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  KET
                </button>
              </td>
              <td v-else>KET</td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.reject_rh[idx]"
                  @keydown="handleArrowKey($event, idx, 17)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-17`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full achievement bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px] h-10"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.reject_rh[idx] ? formDetail.reject_rh[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.reject_lh[idx]"
                  @keydown="handleArrowKey($event, idx, 18)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-18`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full achievement bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px] h-10"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.reject_lh[idx] ? formDetail.reject_lh[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <button
                  v-if="!view"
                  type="button"
                  @click="loadKeteranganRepair()"
                  class="inline-flex items-center justify-center w-full min-w-[56px] px-3 py-1.5 font-semibold text-white rounded bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  KET
                </button>
              </td>
              <td v-else>KET</td>

              <td
                v-if="params.date >= '2024-02-07'"
                :class="
                  Number(formDetail.total_lotsize_rh[idx]) > Number(formDetail.lot_rh[idx])
                    ? 'text-blue-500'
                    : Number(formDetail.total_lotsize_rh[idx]) < Number(formDetail.lot_rh[idx])
                      ? 'text-red-500'
                      : ''
                "
              >
                {{ formDetail.total_lotsize_rh[idx] ? formDetail.total_lotsize_rh[idx] : '' }}
              </td>

              <td
                v-if="params.date >= '2024-02-07'"
                :class="
                  Number(formDetail.total_lotsize_lh[idx]) > Number(formDetail.lot_lh[idx])
                    ? 'text-blue-500'
                    : Number(formDetail.total_lotsize_lh[idx]) < Number(formDetail.lot_lh[idx])
                      ? 'text-red-500'
                      : ''
                "
              >
                {{ formDetail.total_lotsize_lh[idx] ? formDetail.total_lotsize_lh[idx] : '' }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <select
                  v-model="formDetail.status[idx]"
                  @keydown="handleArrowKey($event, idx, 19)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-19`] = el as HTMLElement)"
                  @change="countDataActual"
                  :class="[
                    'w-full bg-white text-gray-900 border rounded-md px-2 py-1 text-sm focus:ring-2 appearance-none',
                    formDetail.status[idx] !== '' && formDetail.status[idx] !== formDetail.status_plan[idx]
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  ]"
                >
                  <option v-for="(item, i) in statusList" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>
              </td>
              <td v-else></td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.idletime[idx]"
                  @keydown="handleArrowKey($event, idx, 20)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-20`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Idle Time"
                />
              </td>
              <td v-else>
                {{ formDetail.idletime[idx] ? formDetail.idletime[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.dandori[idx]"
                  @keydown="handleArrowKey($event, idx, 21)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-21`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.dandori[idx] ? formDetail.dandori[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.dt_machines[idx]"
                  @keydown="handleArrowKey($event, idx, 22)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-22`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.dt_machines[idx] ? formDetail.dt_machines[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.dt_dies[idx]"
                  @keydown="handleArrowKey($event, idx, 23)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-23`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.dt_dies[idx] ? formDetail.dt_dies[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.dt_other[idx]"
                  @keydown="handleArrowKey($event, idx, 24)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-24`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.dt_other[idx] ? formDetail.dt_other[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.dt_material[idx]"
                  @keydown="handleArrowKey($event, idx, 25)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-25`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.dt_material[idx] ? formDetail.dt_material[idx] : 0 }}
              </td>
              <td>
                {{ formDetail.total_dt[idx] ? formDetail.total_dt[idx] : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <button
                  v-if="!view"
                  type="button"
                  @click="loadKeteranganDT()"
                  class="inline-flex items-center justify-center w-full min-w-[56px] px-3 py-1.5 font-semibold text-white rounded bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  KET
                </button>
              </td>
              <td v-else>KET</td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.tpt_actual[idx]"
                  @keydown="handleArrowKey($event, idx, 26)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-26`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.tpt_actual[idx] ? formDetail.tpt_actual[idx] : 0 }}
              </td>
              <td>
                {{ formDetail.tpt_actual[idx] ? formDetail.finish_actual[idx] : '' }}
              </td>
              <td>
                {{ formDetail.tpt_actual[idx] !== 0 ? formatDecimaltoNumber(formDetail.gsph[idx]) : 0 }}
              </td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <select
                  v-model="formDetail.keterangan_all[idx]"
                  @keydown="handleArrowKey($event, idx, 27)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-27`] = el as HTMLElement)"
                  @change="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option v-for="(item, i) in keteranganAllList" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>
              </td>
              <td v-else></td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <select
                  v-model="formDetail.status_delivery[idx]"
                  @keydown="handleArrowKey($event, idx, 28)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-28`] = el as HTMLElement)"
                  @change="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option v-for="(item, i) in statusDelivery" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>
              </td>
              <td v-else></td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <select
                  v-model="formDetail.tipe_palet[idx]"
                  @keydown="handleArrowKey($event, idx, 29)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-29`] = el as HTMLElement)"
                  @change="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option v-for="(item, i) in list.palet" :key="i" :value="item">
                    {{ item }}
                  </option>
                </select>
              </td>
              <td v-else></td>

              <td v-if="(permissions.pcd == false || user.username == 'administrator') && formDetail.keterangan[idx] !== 'Switch Item'">
                <input
                  type="number"
                  min="0"
                  v-model.number="formDetail.act_palet[idx]"
                  @keydown="handleArrowKey($event, idx, 30)"
                  :ref="(el) => (inputRefs[`inputField-${idx}-30`] = el as HTMLElement)"
                  @input="countDataActual"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </td>
              <td v-else>
                {{ formDetail.act_palet[idx] ? formDetail.act_palet[idx] : 0 }}
              </td>
              <!-- Start Machhine -->
              <td v-if="formDetail.part_rh[idx] && Number(formDetail.is_running[idx]) == 0">
                <button
                  v-if="!view"
                  type="button"
                  @click="startItem(formDetail.part_rh[idx], formDetail.urut_plan[idx])"
                  class="inline-flex items-center justify-center w-auto h-8 pa-4 text-white bg-green-500 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  Start
                </button>
              </td>
              <td v-else-if="formDetail.part_rh[idx] && Number(formDetail.is_running[idx]) === 1">
                <button
                  v-if="!view"
                  type="button"
                  @click="stopItem(formDetail.part_rh[idx], formDetail.urut_plan[idx])"
                  class="inline-flex items-center justify-center w-auto h-8 pa-4 text-white bg-red-500 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  Stop
                </button>
              </td>
              <td
                v-if="
                  (Number(formDetail.act_rh[idx]) > 1 && formDetail.is_next[idx] === '0') ||
                  Number(formDetail.repair_rh[idx]) > 1 ||
                  Number(formDetail.reject_rh[idx]) > 1
                "
                class="white"
              >
                <button
                  v-if="!view"
                  type="button"
                  class="inline-flex items-center justify-center w-auto h-8 pa-4 text-gray-400 bg-gray-300 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Done
                </button>
              </td>
              <td v-else-if="formDetail.part_rh[idx] && formDetail.is_next[idx] === '0'">
                <button
                  v-if="!view"
                  type="button"
                  class="inline-flex items-center justify-center w-auto h-8 pa-4 text-white bg-green-500 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
                  @click="startProcess(formDetail.part_rh[idx], formDetail.urut_plan[idx])"
                >
                  Start
                </button>
              </td>
              <td v-else-if="formDetail.part_rh[idx] && Number(formDetail.is_next[idx]) == 1">
                <button
                  v-if="!view"
                  type="button"
                  class="inline-flex items-center justify-center w-auto h-8 pa-4 text-white bg-red-500 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                  @click="stopProcess(formDetail.part_rh[idx], formDetail.urut_plan[idx])"
                >
                  Stop
                </button>
              </td>
            </tr>

            <tr>
              <th colspan="65" class="pa-2">
                <button
                  v-if="!view"
                  type="button"
                  class="inline-flex items-center justify-center w-auto h-8 pa-4 text-white bg-green-600 rounded hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                  @click="addRow()"
                >
                  Add Row
                </button>
              </th>
            </tr>
          </tbody>

          <tfoot>
            <tr>
              <th :colspan="view ? '7' : '12'">TOTAL</th>
              <th>
                {{ formDetail.total_stroke ? formDetail.total_stroke : 0 }}
              </th>
              <th></th>
              <th>
                {{ formDetail.total_lot_rh ? formDetail.total_lot_rh : 0 }}
              </th>
              <th>
                {{ formDetail.total_lot_lh ? formDetail.total_lot_lh : 0 }}
              </th>
              <th>{{ formDetail.tpt_total }}</th>
              <th v-if="!view"></th>
              <th></th>
              <th></th>
              <th>
                {{ formDetail.total_stroke_actual ? formDetail.total_stroke_actual : 0 }}
              </th>
              <th v-if="!view"></th>
              <th></th>
              <th>
                {{ formDetail.total_act_rh ? formDetail.total_act_rh : 0 }}
              </th>
              <th>
                {{ formDetail.total_act_lh ? formDetail.total_act_lh : 0 }}
              </th>
              <td>
                {{ formDetail.total_repair_rh ? formDetail.total_repair_rh : 0 }}
              </td>
              <td>
                {{ formDetail.total_repair_lh ? formDetail.total_repair_lh : 0 }}
              </td>
              <td v-if="!view"></td>
              <td>
                {{ formDetail.total_reject_rh ? formDetail.total_reject_rh : 0 }}
              </td>
              <td>
                {{ formDetail.total_reject_lh ? formDetail.total_reject_lh : 0 }}
              </td>
              <td v-if="!view"></td>
              <td v-if="params.date >= '2024-02-07'">
                {{ formDetail.accum_lotsize_rh ? formDetail.accum_lotsize_rh : 0 }}
              </td>
              <td v-if="params.date >= '2024-02-07'">
                {{ formDetail.accum_lotsize_lh ? formDetail.accum_lotsize_lh : 0 }}
              </td>
              <td></td>
              <td>
                {{ formDetail.total_idletime ? formDetail.total_idletime : 0 }}
              </td>
              <td>
                {{ formDetail.total_dandori ? formDetail.total_dandori : 0 }}
              </td>
              <td>
                {{ formDetail.total_dt_machines ? formDetail.total_dt_machines : 0 }}
              </td>
              <td>
                {{ formDetail.total_dt_dies ? formDetail.total_dt_dies : 0 }}
              </td>
              <td>
                {{ formDetail.total_dt_other ? formDetail.total_dt_other : 0 }}
              </td>
              <td>
                {{ formDetail.total_dt_material ? formDetail.total_dt_material : 0 }}
              </td>
              <td>
                {{ formDetail.dt_total ? formDetail.dt_total : 0 }}
              </td>
              <td v-if="!view"></td>
              <td v-if="formDetail.is_trial.includes(true)">
                {{ formDetail.total_tpt_trial ? formDetail.total_tpt_trial : 0 }}
              </td>
              <td v-else>
                {{ formDetail.total_tpt_actual ? formDetail.total_tpt_actual : 0 }}
              </td>
              <td>
                {{ formDetail.range_tpt ? formDetail.range_tpt : 0 }}
              </td>
              <td>
                {{ line.jumlah_mesin ? calculationGSPH(line.jumlah_mesin) : '' }}
              </td>
              <td></td>
              <td></td>
              <td></td>
              <td v-if="!view"></td>
              <td v-if="!view"></td>
              <td v-if="!view"></td>
            </tr>
            <tr></tr>
          </tfoot>
        </table>

        <div class="grid grid-cols-12 gap-4 mt-2">
          <!-- TOTAL QTY -->
          <div class="col-span-12 lg:col-span-8">
            <div class="bg-[#2B2E37] rounded-lg shadow p-2 overflow-x-auto">
              <table class="w-full text-white colappse">
                <thead>
                  <tr>
                    <th colspan="6">TOTAL QTY</th>
                    <th rowspan="3" class="text-yellow-400 text-3xl">GSPH</th>
                    <th rowspan="2" class="text-yellow-400 text-3xl">TPT</th>
                  </tr>
                  <tr>
                    <th colspan="2" class="bg-green-600 text-white">OK</th>
                    <th colspan="2" class="bg-yellow-400 text-white">Repair</th>
                    <th colspan="2" class="bg-red-600 text-white">Reject</th>
                  </tr>
                  <tr>
                    <th class="bg-green-600 text-white">Pcs</th>
                    <th class="bg-green-600 text-white">%</th>
                    <th class="bg-yellow-400 text-white">Pcs</th>
                    <th class="bg-yellow-400 text-white">%</th>
                    <th class="bg-red-600 text-white">Pcs</th>
                    <th class="bg-red-600 text-white">%</th>
                    <th>Minutes</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <th rowspan="3" class="text-2xl">{{ line.qty_ok }}</th>
                    <th rowspan="3" class="text-2xl">
                      {{ line.ok_persen ? formatPercentOneZero(line.ok_persen) : '0 %' }}
                    </th>

                    <th rowspan="3" class="text-2xl">{{ line.total_repair }}</th>
                    <th rowspan="3" class="text-2xl">
                      {{
                        params.date >= '2024-02-07'
                          ? line.total_repair && formDetail.total_pembagi_repair
                            ? formatPercentOneZero((line.total_repair / Number(formDetail.total_pembagi_repair)) * 100)
                            : '0 %'
                          : line.total_repair
                            ? formatPercentOneZero(line.repair_persen)
                            : '0 %'
                      }}
                    </th>

                    <th rowspan="3" class="text-2xl">{{ line.total_reject }}</th>
                    <th rowspan="3" class="text-2xl">
                      {{
                        params.date >= '2024-02-07'
                          ? line.total_reject && formDetail.total_pembagi_reject
                            ? formatPercentOneZero((Number(line.total_reject) / Number(formDetail.total_pembagi_reject)) * 100)
                            : '0 %'
                          : line.total_reject
                            ? formatPercentOneZero(line.reject_persen)
                            : '0 %'
                      }}
                    </th>

                    <th rowspan="3" class="text-2xl">
                      {{ line.jumlah_mesin ? calculationGSPH(line.jumlah_mesin) : '' }}
                    </th>
                    <th rowspan="3" class="text-2xl">
                      {{ formDetail.total_tpt_actual }}
                    </th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- NOTE -->
          <div class="col-span-12 lg:col-span-4">
            <div class="bg-[#2B2E37] rounded-lg border shadow p-3 h-full">
              <h3 class="text-xl font-bold mb-2 px-2 border-b-2">NOTE</h3>
              <p class="whitespace-pre-wrap text-center pa-3">
                {{ formDetail.keterangan_sum }}
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-12 gap-4 mt-4">
          <div class="col-span-12 lg:col-span-5">
            <div class="bg-[#2B2E37] rounded-lg shadow p-2 overflow-x-auto">
              <table class="w-full text-white colappse">
                <thead>
                  <tr>
                    <th colspan="8">Σ Man Power</th>
                  </tr>
                  <tr>
                    <th></th>
                    <th class="bg-blue-600 w-14">Std</th>
                    <th class="bg-green-600 w-14">Act</th>
                    <th class="bg-gray-500 w-14">C</th>
                    <th class="bg-gray-500 w-14">GH</th>
                    <th class="bg-gray-500 w-14">I</th>
                    <th class="bg-yellow-400 w-14">S</th>
                    <th class="bg-red-500 w-14">A</th>
                  </tr>
                </thead>

                <tbody v-if="!view">
                  <tr v-for="(role, index) in roles" :key="index">
                    <th>{{ role }}</th>
                    <td v-for="property in properties" :key="property">
                      <input
                        type="number"
                        v-model="formAttendance[property][index]"
                        required
                        oninvalid="this.setCustomValidity('Wajib diisi')"
                        oninput="this.setCustomValidity('Lengkapi Data Man Power')"
                        class="manpower-input w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                </tbody>

                <tbody v-else>
                  <tr v-for="(role, index) in roles" :key="index">
                    <th>{{ role }}</th>
                    <td v-for="property in properties" :key="property">
                      {{ formAttendance[property]?.[index] }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="text-sm text-gray-300 mt-2 px-1">
                * <b>Std</b> : Standard | <b>Act</b> : Actual | <b>C</b> : Cuti | <b>GH</b> : Ganti Hari | <b>I</b> : Izin | <b>S</b>: Sakit
                | <b>A</b> : Absent
              </div>
            </div>
          </div>

          <div v-if="params.date >= '2024-02-07'" class="col-span-12 lg:col-span-5">
            <div class="bg-[#2B2E37] rounded-lg shadow p-2 overflow-x-auto">
              <table class="colappse w-full text-white text-center">
                <thead>
                  <tr class="text-sm xl:text-lg">
                    <th>Total Pembagi Repair</th>
                    <th>Total Pembagi Reject</th>
                    <th>Rata-rata Dandori</th>
                    <th>Rata-rata GSPH</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="text-xl xl:text-2xl">
                    <th>{{ formDetail.total_pembagi_repair }}</th>
                    <th>{{ formDetail.total_pembagi_reject }}</th>
                    <th>
                      {{ formDetail.total_dandori ? formatNumberOneDecimal(calculateAverage(formDetail.dandori)) : 0 }}
                    </th>
                    <th>
                      {{ formDetail.gsph ? formatNumberOneDecimal(calculateAverage(formDetail.gsph)) : 0 }}
                    </th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="col-span-12 lg:col-span-2">
            <div class="bg-[#2B2E37] rounded-lg shadow p-2">
              <table class="w-full text-white text-center colappse">
                <thead>
                  <tr>
                    <th>Jumlah Mesin Aktif</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="text-2xl">
                    <th v-if="view">
                      {{ formDetail.jumlah_mesin[0] }}
                    </th>
                    <td v-else>
                      <input
                        type="number"
                        v-model="formDetail.jumlah_mesin[0]"
                        class="w-20 bg-gray-700 text-white border border-gray-500 rounded px-2 py-1 text-center"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 px-4 py-3 border-t border-gray-700">
        <!-- CLOSE BUTTONS -->
        <button
          v-if="params.date !== shiftNow.date"
          @click="
            dialog.detail = false;
            view = false;
            closeForm();
          "
          class="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition"
        >
          Close
        </button>

        <button
          v-else-if="statusForm?.user === user.fullname || statusForm?.user === 'Close'"
          @click="
            dialog.detail = false;
            view = false;
            closeForm();
            close();
          "
          class="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition"
        >
          Close
        </button>

        <button
          v-else
          @click="[(dialog.detail = false), (view = false)]"
          class="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition"
        >
          Tutup
        </button>

        <!-- SPACER -->
        <div class="flex-1"></div>

        <!-- SAVE BUTTON -->
        <button
          v-if="(!view && statusForm?.user === user.fullname) || statusForm?.user === 'Close'"
          @click="(onSaveDetail(), submitHandler())"
          class="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
        >
          Save
        </button>
      </div>
    </div>
  </div>
  <!-- End Dialog -->

  <!-- Form Running Text Dialog -->
  <div v-if="dialog.formLed" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
    <!-- MODAL -->
    <div id="form-led" class="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
      <!-- HEADER -->
      <div class="px-6 py-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">Data LED Machine</h3>
      </div>

      <!-- BODY -->
      <div class="px-6 py-4 overflow-x-auto">
        <table class="w-full border border-gray-600 border-collapse text-sm">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-500 px-2 py-1 w-[50px] text-center">No</th>
              <th class="border border-gray-500 px-2 py-1">Part Number Plan</th>
              <th class="border border-gray-500 px-2 py-1">Qty Plan</th>
              <th class="border border-gray-500 px-2 py-1 w-[400px]">Machine</th>
              <th class="border border-gray-500 px-2 py-1 w-[400px]">Process</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="dIndex in formDetail.part_rh.length" :key="`data-process-${dIndex}`" class="odd:bg-white even:bg-gray-100">
              <td class="border border-gray-400 px-2 py-1 text-center">
                {{ dIndex }}
              </td>

              <td class="border border-gray-400 px-2 py-1">
                <input type="hidden" v-model="formDetail.part_rh[dIndex - 1]" />
                {{ formDetail.part_rh[dIndex - 1] }}
              </td>

              <td class="border border-gray-400 px-2 py-1">
                {{ formDetail.lot_rh[dIndex - 1] }}
              </td>

              <!-- MACHINE -->
              <td class="border border-gray-400 px-2 py-1 relative">
                <MultiSelectCheckbox v-model="formDetail.machine[dIndex - 1]" :options="machineOptions" placeholder="" keep-search />
              </td>

              <!-- PROCESS -->
              <td class="border border-gray-400 px-2 py-1 relative">
                <MultiSelectCheckbox v-model="formDetail.process[dIndex - 1]" :options="processOptions" placeholder="" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="flex justify-between items-center px-6 py-4 border-t">
        <button type="button" class="px-4 py-2 text-sm rounded-lg bg-gray-500 text-white hover:bg-gray-600" @click="dialog.formLed = false">
          Close
        </button>

        <button type="button" class="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700" @click="onSaveMachine()">
          Save
        </button>
      </div>
    </div>
  </div>
  <!-- End  Dialog -->

  <!-- Form Keterangan Repair Dialog -->
  <div v-if="dialog.formKetRepair" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
    <!-- MODAL -->
    <div class="relative w-full max-w-7xl bg-black text-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden">
      <!-- BODY -->
      <div class="p-4 overflow-auto max-h-[75vh]">
        <table class="w-full border border-white text-sm">
          <thead>
            <tr>
              <th colspan="3" class="bg-blue-600 text-white border border-white">PLAN</th>
              <th colspan="18" class="bg-green-600 text-white border border-white">ACTUAL</th>
            </tr>

            <tr>
              <th rowspan="3" class="bg-blue-600 border border-white">No</th>
              <th rowspan="2" colspan="2" class="bg-blue-600 border border-white">PART</th>
              <th colspan="2" class="bg-green-600 border border-white">Repair</th>
              <th colspan="2" class="bg-green-600 border border-white">Reject</th>
              <th colspan="2" class="bg-green-600 border border-white">Keterangan Repair</th>
              <th colspan="2" class="bg-green-600 border border-white">Keterangan Reject</th>
            </tr>

            <tr>
              <th class="bg-green-600 border border-white">RH</th>
              <th class="bg-green-600 border border-white">LH</th>
              <th class="bg-green-600 border border-white">RH</th>
              <th class="bg-green-600 border border-white">LH</th>
              <th class="bg-green-600 border border-white" rowspan="2">RH</th>
              <th class="bg-green-600 border border-white" rowspan="2">LH</th>
              <th class="bg-green-600 border border-white" rowspan="2">RH</th>
              <th class="bg-green-600 border border-white" rowspan="2">LH</th>
            </tr>

            <tr>
              <th class="bg-blue-600 border border-white">RH</th>
              <th class="bg-blue-600 border border-white">LH</th>
              <th class="bg-green-600 border border-white">(pcs)</th>
              <th class="bg-green-600 border border-white">(pcs)</th>
              <th class="bg-green-600 border border-white">(pcs)</th>
              <th class="bg-green-600 border border-white">(pcs)</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="dIndex in Math.max(formDetail.is_tandem?.length || 0, 1)"
              :key="`data-process-${dIndex}`"
              class="odd:bg-black even:bg-gray-900"
            >
              <td class="border border-white text-center">{{ dIndex }}</td>
              <td class="border border-white">{{ formDetail.part_rh?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white">{{ formDetail.part_lh?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white">{{ formDetail.repair_rh?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white">{{ formDetail.repair_lh?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white">{{ formDetail.reject_rh?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white">{{ formDetail.reject_lh?.[dIndex - 1] ?? '' }}</td>

              <!-- KET REPAIR RH -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.ket_repair_rh[dIndex - 1]"
                  readonly
                  @click="openKetEditor('ket_repair_rh', dIndex - 1, 'Keterangan Repair RH', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.ket_repair_rh[dIndex - 1] = formDetail.ket_repair_rh[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>

              <!-- KET REPAIR LH -->
              <td class="border border-white">
                <template v-if="(permissions?.pcd === false && formDetail.part_lh?.[dIndex - 1]) || user.username === 'administrator'">
                  <input
                    type="text"
                    v-model="formDetail.ket_repair_lh[dIndex - 1]"
                    readonly
                    @click="openKetEditor('ket_repair_lh', dIndex - 1, 'Keterangan Repair LH', true)"
                    @keyup.enter="focusNext"
                    @input="formDetail.ket_repair_lh[dIndex - 1] = formDetail.ket_repair_lh[dIndex - 1]?.toUpperCase()"
                    class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </template>
                <template v-else>
                  {{ formDetail.ket_repair_lh?.[dIndex - 1] ?? '' }}
                </template>
              </td>

              <!-- KET REJECT RH -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.ket_reject_rh[dIndex - 1]"
                  readonly
                  @click="openKetEditor('ket_reject_rh', dIndex - 1, 'Keterangan Reject RH', false)"
                  @keyup.enter="focusNext"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>

              <!-- KET REJECT LH -->
              <td class="border border-white">
                <template v-if="(permissions?.pcd === false && formDetail.part_lh?.[dIndex - 1]) || user.username === 'administrator'">
                  <input
                    type="text"
                    v-model="formDetail.ket_reject_lh[dIndex - 1]"
                    readonly
                    @click="openKetEditor('ket_reject_lh', dIndex - 1, 'Keterangan Reject LH', false)"
                    @keyup.enter="focusNext"
                    class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </template>
                <template v-else>
                  {{ formDetail.ket_reject_lh?.[dIndex - 1] ?? '' }}
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-white">
        <button class="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700" @click="dialog.formKetRepair = false">Close</button>

        <button v-if="!view" class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700" @click="onSaveDetail()">Save</button>
      </div>
    </div>
  </div>
  <!-- End Dialog -->

  <!-- Dialog Form Ket DT -->
  <div v-if="dialog.formKetDT" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
    <!-- MODAL -->
    <div class="relative w-full max-w-7xl bg-black text-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden">
      <!-- CONTENT -->
      <div class="p-4 overflow-auto max-h-[75vh]">
        <table class="w-full border border-white text-sm">
          <thead>
            <tr>
              <th colspan="3" class="bg-blue-600 border border-white">PLAN</th>
              <th colspan="19" class="bg-green-600 border border-white">ACTUAL</th>
            </tr>

            <tr>
              <th rowspan="3" class="bg-blue-600 border border-white">No</th>
              <th rowspan="2" colspan="2" class="bg-blue-600 border border-white">PART</th>
              <th rowspan="3" class="bg-green-600 border border-white">Idletime</th>
              <th colspan="5" class="bg-green-600 border border-white">Down Time</th>
              <th rowspan="5" class="bg-green-600 border border-white w-[250px]">Keterangan Idletime</th>
              <th colspan="4" rowspan="2" class="bg-green-600 border border-white w-[750px]">Keterangan Down Time</th>
              <th colspan="4" rowspan="2" class="bg-green-600 border border-white w-[750px]">Countermeasure</th>
              <th colspan="4" rowspan="2" class="bg-green-600 border border-white w-[750px]">Status</th>
            </tr>

            <tr>
              <th class="bg-green-600 border border-white">Mesin</th>
              <th class="bg-green-600 border border-white">Dies</th>
              <th class="bg-green-600 border border-white">Others</th>
              <th class="bg-green-600 border border-white">Material</th>
              <th class="bg-green-600 border border-white">Total</th>
            </tr>

            <tr>
              <th class="bg-blue-600 border border-white">RH</th>
              <th class="bg-blue-600 border border-white">LH</th>
              <th class="bg-green-600 border border-white">(menit)</th>
              <th class="bg-green-600 border border-white">(menit)</th>
              <th class="bg-green-600 border border-white">(menit)</th>
              <th class="bg-green-600 border border-white">(menit)</th>
              <th class="bg-green-600 border border-white">(menit)</th>
              <th class="bg-green-600 border border-white">Mesin</th>
              <th class="bg-green-600 border border-white">Dies</th>
              <th class="bg-green-600 border border-white">Others</th>
              <th class="bg-green-600 border border-white">Material</th>
              <th class="bg-green-600 border border-white">Mesin</th>
              <th class="bg-green-600 border border-white">Dies</th>
              <th class="bg-green-600 border border-white">Others</th>
              <th class="bg-green-600 border border-white">Material</th>
              <th class="bg-green-600 border border-white">Mesin</th>
              <th class="bg-green-600 border border-white">Dies</th>
              <th class="bg-green-600 border border-white">Others</th>
              <th class="bg-green-600 border border-white">Material</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="dIndex in Math.max(formDetail.is_tandem?.length || 0, 1)"
              :key="`data-dt-${dIndex}`"
              class="odd:bg-black even:bg-gray-900"
            >
              <td class="border border-white text-center">{{ dIndex }}</td>
              <td class="border border-white">{{ formDetail.part_rh?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white">{{ formDetail.part_lh?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white text-center">{{ formDetail.idletime?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white text-center">{{ formDetail.dt_machines?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white text-center">{{ formDetail.dt_dies?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white text-center">{{ formDetail.dt_other?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white text-center">{{ formDetail.dt_material?.[dIndex - 1] ?? '' }}</td>
              <td class="border border-white text-center">{{ formDetail.total_dt?.[dIndex - 1] ?? 0 }}</td>

              <!-- KET IDLETIME -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.ket_idletime[dIndex - 1]"
                  readonly
                  @click="openKetEditor('ket_idletime', dIndex - 1, 'Keterangan Idletime', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.ket_idletime[dIndex - 1] = formDetail.ket_idletime[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>

              <!-- KET DT MESIN -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.ket_dt_machines[dIndex - 1]"
                  readonly
                  @click="openKetEditor('ket_dt_machines', dIndex - 1, 'Keterangan Down Time Mesin', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.ket_dt_machines[dIndex - 1] = formDetail.ket_dt_machines[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>

              <!-- KET DT DIES -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.ket_dt_dies[dIndex - 1]"
                  readonly
                  @click="openKetEditor('ket_dt_dies', dIndex - 1, 'Keterangan Down Time Dies', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.ket_dt_dies[dIndex - 1] = formDetail.ket_dt_dies[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>

              <!-- KET DT OTHER -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.ket_dt_other[dIndex - 1]"
                  readonly
                  @click="openKetEditor('ket_dt_other', dIndex - 1, 'Keterangan Down Time Others', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.ket_dt_other[dIndex - 1] = formDetail.ket_dt_other[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>

              <!-- KET DT MATERIAL -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.ket_dt_material[dIndex - 1]"
                  readonly
                  @click="openKetEditor('ket_dt_material', dIndex - 1, 'Keterangan Down Time Material', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.ket_dt_material[dIndex - 1] = formDetail.ket_dt_material[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>
              <!-- KET DT MESIN -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.cm_dt_machines[dIndex - 1]"
                  readonly
                  @click="openKetEditor('cm_dt_machines', dIndex - 1, 'Countermeasure Mesin', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.cm_dt_machines[dIndex - 1] = formDetail.cm_dt_machines[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>

              <!-- cm DT DIES -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.cm_dt_dies[dIndex - 1]"
                  readonly
                  @click="openKetEditor('cm_dt_dies', dIndex - 1, 'Countermeasure Dies', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.cm_dt_dies[dIndex - 1] = formDetail.cm_dt_dies[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>

              <!-- cm DT OTHER -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.cm_dt_other[dIndex - 1]"
                  readonly
                  @click="openKetEditor('cm_dt_other', dIndex - 1, 'Countermeasure Others', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.cm_dt_other[dIndex - 1] = formDetail.cm_dt_other[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>

              <!-- cm DT MATERIAL -->
              <td class="border border-white">
                <input
                  type="text"
                  v-model="formDetail.cm_dt_material[dIndex - 1]"
                  readonly
                  @click="openKetEditor('cm_dt_material', dIndex - 1, 'Countermeasure Material', true)"
                  @keyup.enter="focusNext"
                  @input="formDetail.cm_dt_material[dIndex - 1] = formDetail.cm_dt_material[dIndex - 1]?.toUpperCase()"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>
              <!-- status DT MESIN -->
              <td class="border border-white">
                <select
                  v-model="formDetail.status_dt_machines[dIndex - 1]"
                  @change="focusNext"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-</option>
                  <option value="OPEN">OPEN</option>
                  <option value="ON PROGRESS">ON PROGRESS</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </td>

              <!-- status DT DIES -->
              <td class="border border-white">
                <select
                  v-model="formDetail.status_dt_dies[dIndex - 1]"
                  @change="focusNext"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-</option>
                  <option value="OPEN">OPEN</option>
                  <option value="ON PROGRESS">ON PROGRESS</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </td>

              <!-- status DT OTHER -->
              <td class="border border-white">
                <select
                  v-model="formDetail.status_dt_other[dIndex - 1]"
                  @change="focusNext"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-</option>
                  <option value="OPEN">OPEN</option>
                  <option value="ON PROGRESS">ON PROGRESS</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </td>

              <!-- status DT MATERIAL -->
              <td class="border border-white">
                <select
                  v-model="formDetail.status_dt_material[dIndex - 1]"
                  @change="focusNext"
                  class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-</option>
                  <option value="OPEN">OPEN</option>
                  <option value="ON PROGRESS">ON PROGRESS</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-white">
        <button class="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700" @click="dialog.formKetDT = false">Close</button>

        <button v-if="!view" class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700" @click="onSaveDetail()">Save</button>
      </div>
    </div>
  </div>
  <!-- End Dialog -->

  <!-- Keterangan Editor Dialog -->
  <div v-if="ketEditor.open" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
    <!-- MODAL -->
    <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl">
      <!-- HEADER -->
      <div class="px-4 py-3 border-b">
        <h3 class="text-lg font-semibold text-gray-800">{{ ketEditor.label }}</h3>
      </div>

      <!-- BODY -->
      <div class="p-4">
        <textarea
          v-model="ketEditor.value"
          rows="8"
          :readonly="view"
          :class="{ uppercase: ketEditor.upper }"
          class="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between px-4 py-3 border-t">
        <button class="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600" @click="ketEditor.open = false">Close</button>

        <button v-if="!view" class="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" @click="saveKetEditor()">OK</button>
      </div>
    </div>
  </div>
  <!-- End Dialog -->

  <!-- Delete Dialog -->
  <div v-if="dialog.confirmDelete" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
    <!-- MODAL -->
    <div class="bg-white rounded-lg shadow-lg w-full max-w-[350px]">
      <!-- HEADER -->
      <div class="flex items-center gap-2 px-4 py-3 border-b">
        <!-- ICON ALERT -->
        <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z"
          />
        </svg>

        <h3 class="text-lg font-semibold text-gray-800">Warning</h3>
      </div>

      <!-- BODY -->
      <div class="px-4 py-4 text-gray-700 text-sm">You don't currently have permission to delete this data</div>

      <!-- FOOTER -->
      <div class="flex justify-end px-4 py-3 border-t">
        <button class="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition" @click="dialog.confirmDelete = false">
          OK
        </button>
      </div>
    </div>
  </div>
  <!-- End Dialog -->

  <!-- Confirm Delete Plan Dialog -->
  <div v-if="confirmDeleteUrut !== null" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
    <!-- MODAL -->
    <div class="bg-white rounded-lg shadow-lg w-full max-w-[350px]">
      <!-- HEADER -->
      <div class="flex items-center gap-2 px-4 py-3 border-b">
        <!-- ICON ALERT -->
        <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z"
          />
        </svg>

        <h3 class="text-lg font-semibold text-gray-800">Confirmation</h3>
      </div>

      <!-- BODY -->
      <div class="px-4 py-4 text-gray-700 text-sm">Are you sure you want to delete this plan order?</div>

      <!-- FOOTER -->
      <div class="flex justify-end gap-2 px-4 py-3 border-t">
        <button class="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition" @click="confirmDeleteUrut = null">
          Cancel
        </button>
        <button class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition" @click="confirmDelete()">Delete</button>
      </div>
    </div>
  </div>
  <!-- End Dialog -->

  <!-- Form Kanban Dialog -->
  <div v-if="dialog.formKanban" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
    <!-- Modal -->
    <div class="relative w-full max-w-7xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <h3 class="text-lg font-semibold">E Kanban Line {{ line_id }}</h3>

        <button @click="dialog.formKanban = false" class="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <!-- Body -->
      <div class="p-4 overflow-auto max-h-[70vh]">
        <table class="w-full border-kanban border-black text-sm">
          <thead>
            <tr class="bg-blue-200 kanban">
              <th rowspan="3" class="border-kanban px-2">No</th>
              <th colspan="2" rowspan="2" class="border-kanban px-2">Part Number Plan</th>
              <th colspan="2" rowspan="2" class="border-kanban px-2">Qty Plan</th>
              <th colspan="2" rowspan="2" class="border-kanban px-2">Qty / Kanban</th>
              <th colspan="2" rowspan="2" class="border-kanban px-2">Pallet</th>
              <th rowspan="3" class="border-kanban px-2">Status Plan</th>
              <th colspan="4" class="border-kanban px-2">Kanban Wait</th>
              <th rowspan="3" class="border-kanban px-2 bg-green-200">Finish</th>
              <th rowspan="3" class="border-kanban px-2 bg-green-200">Actual</th>
              <th rowspan="3" class="border-kanban px-2">Action</th>
            </tr>

            <tr class="bg-blue-200 kanban">
              <th colspan="2" class="border-kanban px-2">Jumlah</th>
              <th colspan="2" class="border-kanban px-2">Total QTY</th>
            </tr>

            <tr class="bg-blue-200">
              <th class="border-kanban px-2">RH</th>
              <th class="border-kanban px-2">LH</th>
              <th class="border-kanban px-2">RH</th>
              <th class="border-kanban px-2">LH</th>
              <th class="border-kanban px-2">RH</th>
              <th class="border-kanban px-2">LH</th>
              <th class="border-kanban px-2">Type</th>
              <th class="border-kanban px-2">QTY</th>
              <th class="border-kanban px-2">RH</th>
              <th class="border-kanban px-2">LH</th>
              <th class="border-kanban px-2">RH</th>
              <th class="border-kanban px-2">LH</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="idx in formDetail.part_rh.filter((p) => p !== '').length" :key="idx" class="text-center">
              <td class="border-kanban px-2">{{ idx }}</td>
              <td class="border-kanban px-2">{{ formDetail.part_rh[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.part_lh[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.lot_rh[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.lot_lh[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.zbehmg_rh[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.zbehmg_lh[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.type_pallet[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.qty_pallet[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.status_plan[idx - 1] }}</td>

              <td class="border-kanban px-2">{{ formDetail.ztotkbn_rh[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.ztotkbn_lh[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.ztotqty_rh[idx - 1] }}</td>
              <td class="border-kanban px-2">{{ formDetail.ztotqty_lh[idx - 1] }}</td>

              <!-- tombol printer -->
              <td class="border-kanban px-2" colspan="2">
                <button
                  v-if="Number(formDetail.ztotkbn_rh[idx - 1]) >= 1"
                  class="px-2 py-1 text-white bg-green-600 rounded hover:bg-green-700"
                  @click="
                    dialog.kanbanFull = true;
                    formKanbanFull.part_number_rh = formDetail.part_rh[idx - 1];
                    formKanbanFull.part_number_lh = formDetail.part_lh[idx - 1];
                    formKanbanFull.total_kanban = formDetail.ztotkbn_rh[idx - 1];
                    formKanbanFull.dIndex = idx;
                  "
                >
                  Print
                </button>
              </td>

              <!-- Action -->
              <td class="border-kanban px-2 space-x-2">
                <button
                  class="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
                  @click="
                    onEmptyKanban(
                      formDetail.part_rh[idx - 1],
                      formDetail.part_lh[idx - 1],
                      String(
                        formDetail.lot_rh[idx - 1] && formDetail.zbehmg_rh[idx - 1]
                          ? Number(formDetail.lot_rh[idx - 1]) / Number(formDetail.zbehmg_rh[idx - 1])
                          : 0
                      )
                    )
                  "
                  :disabled="
                    formDetail.zstatus[idx - 1] !== '1' ||
                    Number(formDetail.zkbnwait_rh[idx - 1]) * Number(formDetail.zbehmg_rh[idx - 1]) < Number(formDetail.lot_rh[idx - 1])
                  "
                >
                  <PlayCircleOutlined />
                  Start
                </button>

                <button
                  class="px-3 py-1 my-2 bg-gray-500 text-white rounded disabled:opacity-50"
                  @click="
                    rePrintKanban({
                      part_rh: formDetail.part_rh[idx - 1] ?? null,
                      part_lh: formDetail.part_lh[idx - 1] ?? null,
                      username: user.fullname!,
                      qtyOk: formDetail.zkbnfull_rh[idx - 1] ?? 0
                    })
                  "
                  :disabled="formDetail.zstatus[idx - 1] == '1' || !formDetail.zstatus[idx - 1] || formDetail.zstatus[idx - 1] !== '5'"
                >
                  <PrinterOutlined />
                  Print
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-6 py-4 border-t inset-shadow-xs">
        <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" @click="onSaveDetail()">Save</button>
      </div>
    </div>
  </div>
  <!-- End Dialog -->

  <!-- Kanban Dialog -->
  <div v-if="dialog.kanbanFull" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50">
    <!-- MODAL -->
    <div class="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
      <!-- SWITCH -->
      <div class="mb-3">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" v-model="formKanbanFull.isCancel" class="sr-only peer" />
          <div
            class="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-red-500 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-5"
          ></div>
          <span class="text-sm font-medium text-gray-700"> Ubah mode </span>
        </label>
      </div>

      <!-- TITLE -->
      <h2 class="text-lg font-semibold text-gray-800 mb-4">
        Berapa Jumlah Kanban yang
        <span :class="formKanbanFull.isCancel ? 'text-red-600' : 'text-green-600'">
          {{ formKanbanFull.isCancel ? 'Cancel' : 'OK' }}
        </span>
        ?
        <br />
        <span class="text-sm text-gray-500">
          ({{ formKanbanFull.part_number_rh }} <span v-if="formKanbanFull.part_number_lh"> / {{ formKanbanFull.part_number_lh }} </span>)
        </span>
      </h2>

      <!-- INPUT -->
      <div class="flex items-center justify-center gap-2 mb-6">
        <input
          v-model.number="formKanbanFull.qty_ok"
          type="number"
          :placeholder="formKanbanFull.isCancel ? 'Qty Cancel' : 'Qty OK'"
          :min="0"
          :max="formKanbanFull.total_kanban"
          class="w-24 text-center border rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500"
        />
        <span class="text-lg font-medium"> / {{ formKanbanFull.total_kanban }} Kanban </span>
      </div>

      <!-- ACTIONS -->
      <div class="flex justify-between">
        <button @click="dialog.kanbanFull = false" class="px-4 py-2 rounded-md bg-gray-500 text-white hover:bg-gray-600">✕ Close</button>

        <button
          v-if="!formKanbanFull.isCancel"
          @click="saveKanbanFull"
          class="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
        >
          💾 Save
        </button>

        <button v-else @click="cancelKanbanFull" class="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">⛔ Cancel</button>
      </div>
    </div>
  </div>
  <!-- End Dialog -->

  <!-- Add Line Dialog -->
  <div v-if="dialog.addLine" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50">
    <!-- MODAL -->
    <div class="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
      <!-- TITLE -->
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Add Line</h2>

      <!-- FORM -->
      <div class="mb-6">
        <label class="block mb-1 text-sm font-medium text-gray-700"> Line </label>

        <!-- AUTOCOMPLETE → SELECT -->
        <select
          v-model="params.line_id"
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" disabled>Pilih Line</option>
          <option v-for="line in listAllLine" :key="line" :value="line">
            {{ line }}
          </option>
        </select>
      </div>

      <!-- ACTIONS -->
      <div class="flex justify-end gap-3">
        <button @click="dialog.addLine = false" class="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300">
          Cancel
        </button>

        <button @click="onAddLine()" class="px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700">Save</button>
      </div>
    </div>
  </div>
  <!-- End Dialog -->
</template>

<style scoped>
.border {
  border: 1px solid #e5e7eb !important;
}

.border-kanban {
  border: 1px solid #525353 !important;
}

.line_id {
  padding: 0px 30px !important;
}
.pcs {
  width: 300px !important;
}

.tandem {
  padding: 5px !important;
}

.div1 {
  overflow: scroll;
  height: 790px;
}

.div1 table {
  border-spacing: 0;
}

.bg,
.head {
  background-color: #182747;
}

/* Sticky View */
.div1 .stick {
  position: -webkit-sticky;
  position: sticky;
  left: 0;
  z-index: 2;
}

.div1 .stick6 {
  position: -webkit-sticky;
  position: sticky;
  left: 36px;
  z-index: 2;
}

.div1 .stick7 {
  position: -webkit-sticky;
  position: sticky;
  left: 133px;
  z-index: 2;
}

.div1 .stick72 {
  position: -webkit-sticky;
  position: sticky;
  left: 221px;
  z-index: 2;
}

.div1 .stick8 {
  position: -webkit-sticky;
  position: sticky;
  left: 390px;
  z-index: 2;
}

.div1 .stick9 {
  position: -webkit-sticky;
  position: sticky;
  left: 463px;
  z-index: 2;
}

.div1 th.sticky2 {
  position: -webkit-sticky;
  position: sticky;
  left: 0px;
  z-index: 2;
}

.div1 th.sticky3 {
  position: -webkit-sticky;
  position: sticky;
  left: 70px;
  z-index: 2;
}

.div1 th.sticky4 {
  position: -webkit-sticky;
  position: sticky;
  left: 150px;
  z-index: 2;
}

.div1 th.sticky7 {
  position: -webkit-sticky;
  position: sticky;
  left: 220px;
  z-index: 2;
}

.div1 th.sticky72 {
  position: -webkit-sticky;
  position: sticky;
  left: 415px;
  z-index: 2;
}

.div1 th.sticky8 {
  position: -webkit-sticky;
  position: sticky;
  left: 610px;
  z-index: 2;
}

.lh {
  min-width: 195px !important;
  max-width: 195px !important;
  width: 195px !important;
}

.part {
  min-width: 270px !important;
  max-width: 270px !important;
  width: 270px !important;
}

.rh {
  min-width: 195px !important;
  max-width: 195px !important;
  width: 195px !important;
}

.div1 td:nth-child(1),
.div1 td:nth-child(2),
.div1 td:nth-child(3),
.div1 td:nth-child(4),
.div1 td:nth-child(5),
.div1 td:nth-child(7),
.div1 td:nth-child(8),
.div1 td:nth-child(9),
.div1 td:nth-child(10) {
  background: #182747;
}

.div1 td:nth-child(3) {
  position: sticky;
  left: 0;
  z-index: 2;
}

.div1 td:nth-child(4) {
  position: sticky;
  left: 70px;
  z-index: 2;
}

.div1 td:nth-child(5) {
  position: -webkit-sticky;
  position: sticky;
  left: 150px;
  z-index: 2;
}

.div1 td.sticky_rh {
  position: -webkit-sticky;
  position: sticky;
  left: 220px;
  z-index: 2;
}
.div1 td.sticky_lh {
  position: sticky;
  left: 415px;
  z-index: 2;
}

.div1 td.sticky_status {
  position: sticky;
  left: 610px;
  z-index: 2;
}

.wrap {
  white-space: normal;
}

.note {
  height: 175px !important;
}

.besar {
  height: 175px !important;
  width: 100% !important;
}

/* Sembunyikan tombol naik-turun (spinner) semua input number di halaman ini */
/* Chrome, Safari, Edge, Opera */
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

/* Firefox */
input[type='number'] {
  appearance: textfield !important;
  -moz-appearance: textfield !important;
}

td {
  white-space: nowrap;
}

.table-view {
  white-space: nowrap;
  /* padding: 0 5px;
  margin: 0px; */
  /* border: 1px solid white !important; */
}

td {
  padding: 0 5px;
  margin: 0px;
  border: 1px solid white !important;
  white-space: nowrap;
}

th {
  padding: 0 14px;
  margin: 0px;
  border: 1px solid white !important;
}

tbody td,
tfoot td:nth-child(2),
tfoot {
  text-align: center;
}

tbody td {
  width: 10px;
}

#andon-container {
  width: 100%;
  padding: 0;
  /* height: 100%; */
  overflow: hidden;
}

/* Checkbox tandem hijau terang.
   Flowbite (diimpor di tailwind.css) menyetel
   [type='checkbox']:checked { background-color: currentColor !important }
   dengan color biru #1C64F2 — jadi color-nya yang harus ditimpa. */
input[type='checkbox'].checkbox {
  transform: scale(1.2);
  color: #6fd626 !important; /* currentColor → hijau terang saat dicentang */
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background-color: #ffffff;
  cursor: pointer;
}

input[type='checkbox'].checkbox:checked {
  background-color: #6fd626 !important;
  border-color: #6fd626 !important;
}

/* Input man power: sembunyikan spinner number agar angka tidak tertutup */
.manpower-input::-webkit-outer-spin-button,
.manpower-input::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

.manpower-input {
  appearance: textfield !important;
  -moz-appearance: textfield !important;
  text-align: center;
}

table {
  border-collapse: separate;
}

thead {
  position: sticky;
  z-index: 9999;
  top: -16px;
}

.colappse {
  border-collapse: collapse !important;
}

.kanban {
  font-size: 1.2rem;
  padding: 8px !important;
  border: 2px black solid !important;
}

.kanban td,
.kanban th {
  padding: 8px !important;
}

#form-led table,
#form-led tr,
#form-led th,
#form-led td {
  border: 2px solid !important;
}

.hover-menu {
  transition: transform 0.3s ease-in-out;
}

.hover-menu:hover {
  transform: scale(1.1);
}

.tooltip-cell::after {
  content: attr(data-tooltip);
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translateY(-50%);
  margin-left: 6px;

  background: #bf360c;
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;

  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 9999;
}

.tooltip-cell:hover::after {
  opacity: 1;
}

.tooltip-cell:hover {
  z-index: 50 !important;
}

.tooltip-cell:not([data-tooltip]):hover::after,
.tooltip-cell[data-tooltip='']:hover::after {
  opacity: 0;
}
</style>

<style>
/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}

/* Flowbite Datepicker Custom Styles */
.datepicker-cell.selected,
.datepicker-cell.selected:hover {
  background-color: #3b82f6 !important;
  color: white !important;
  font-weight: 600;
}

.datepicker-cell.today {
  background-color: #dbeafe;
  font-weight: 600;
}

.datepicker-cell.today.selected {
  background-color: #3b82f6 !important;
  color: white !important;
}

.datepicker-cell:hover {
  background-color: #f3f4f6;
}

.datepicker-cell.focused:not(.selected) {
  background-color: #e5e7eb;
}

.datepicker-cell {
  border-radius: 0.375rem;
  margin: 0.5px;
}

.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}
</style>
