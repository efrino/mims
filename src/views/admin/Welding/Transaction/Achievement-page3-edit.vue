<script setup lang="ts">
import { onMounted, ref, shallowRef, computed, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useAchievementWld } from '@/stores/Welding/Transaction/Achievement';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import type { Attendance, Detail, SummaryData } from '@/types/Welding/Transaction/Achievement';
import { useUtilityStore } from '@/stores/utility';
import CustomSelectSearch from "@/components/CustomSelectSearch.vue";
import { useAuthStore } from '@/stores/auth';
import { useTheme } from 'vuetify';

const storeAch = useAchievementWld();
const { cleanData, selectedPrefixLine, selectedLineId, partData, formEdit, currentPatan, filter, permissions, keteranganActual, keteranganPlan, currentUser } = storeToRefs(storeAch);
const router = useRouter();
const route = useRoute();
const dataTable = ref<Detail[]>([]);
const utils = useUtilityStore();
const note = ref<string>("");
const summaryData = ref<SummaryData>();
const attendance = ref<Attendance[]>([]);
const authStore = useAuthStore();

// Parameter halaman (line, tanggal, shift) disimpan juga di URL query supaya tetap ada
// setelah refresh, karena saat refresh isi store kembali kosong.
const queryStr = (v: unknown) => (typeof v === 'string' ? v : '');
const qPrefix = queryStr(route.query.prefix);
const qLine = queryStr(route.query.line);
let needFetch = cleanData.value.length == 0;

if (qPrefix && qLine) {
  const qDate = queryStr(route.query.date);
  const qShift = queryStr(route.query.shift);
  if ((qDate && qDate != filter.value.date) || (qShift && qShift != String(filter.value.shift))) needFetch = true;

  selectedPrefixLine.value = qPrefix;
  selectedLineId.value = qLine;
  if (qDate) filter.value.date = qDate;
  if (qShift) filter.value.shift = typeof filter.value.shift === 'number' ? Number(qShift) : qShift;
} else if (selectedPrefixLine.value != "" && selectedLineId.value != "") {
  router.replace({
    query: {
      ...route.query,
      prefix: selectedPrefixLine.value,
      line: selectedLineId.value,
      date: filter.value.date,
      shift: String(filter.value.shift),
    },
  });
} else {
  router.push({ name: "Transaction-welding-achievement" });
}

const page = ref({ title: `Achievement Welding - Line ${selectedLineId.value}` });
const breadcrumbs = shallowRef([
  { title: 'Welding', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Achievement', disabled: false, href: '/transaction/welding/achievement/' },
  { title: `LINE ${selectedPrefixLine.value}`, disabled: false, href: '/transaction/welding/achievement/showline' },
  { title: `LINE ${selectedLineId.value}`, disabled: true, href: '#' }
]);

const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

const tableWrapperRef = ref<HTMLElement | null>(null)

watch(isDark, (val) => {
  const el = tableWrapperRef.value
  if (!el) return
  if (val) {
    el.style.setProperty('--border-color', '#ffffff')
    el.style.setProperty('--sticky-head-bg', '#1e3a5f')
    el.style.setProperty('--sticky-body-bg', '#1f2937')
  } else {
    el.style.setProperty('--border-color', '#000000')
    el.style.setProperty('--sticky-head-bg', '#ebf5ff')
    el.style.setProperty('--sticky-body-bg', '#ffffff')
  }
})

const searchPartNumber = ref('')
const searchJobNumber = ref('')

const filteredDetail = computed(() => {
  return formEdit.value.detail.filter(item => {
    const matchPart = item.part_number?.toLowerCase().includes(searchPartNumber.value.toLowerCase())
    const matchJob = item.job_number?.toLowerCase().includes(searchJobNumber.value.toLowerCase())
    return matchPart && matchJob
  })
})

const activeDropdownRow = ref<number | null>(null)

type ArrowKey = "ArrowRight" | "ArrowLeft" | "ArrowDown" | "ArrowUp"
const inputRefs = ref<Record<string, HTMLElement | null>>({})

const handleArrowKey = (e: KeyboardEvent, row: number, col: number): void => {
  const target = e.target as HTMLInputElement | null
  if (!target) return

  if (e.key === "Enter") {
    if (target.list) {
      e.preventDefault()
      e.stopPropagation()
      target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      return
    }
  }

  const dirs: Record<ArrowKey, [number, number]> = {
    ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0],
  }

  if (!(e.key in dirs)) return
  e.preventDefault()

  const [dRow, dCol] = dirs[e.key as ArrowKey]
  let nextRow = row + dRow
  let nextCol = col + dCol

  while (true) {
    if (nextRow < 0 || nextRow >= formEdit.value.detail.length) return
    if (nextCol < 0 || nextCol > 50) return

    const nextKey = `inputField-${nextRow}-${nextCol}`
    const el = inputRefs.value[nextKey] as HTMLInputElement | null
    if (el) { el.focus(); el.select?.(); return }

    if (dRow !== 0) nextRow += dRow
    else nextCol += dCol
  }
}

const handleManPowerArrowKey = (e: KeyboardEvent, row: number, col: number): void => {
  const target = e.target as HTMLInputElement | null
  if (!target) return

  const dirs: Record<ArrowKey, [number, number]> = {
    ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0],
  }

  if (!(e.key in dirs)) return
  e.preventDefault()

  const [dRow, dCol] = dirs[e.key as ArrowKey]
  let nextRow = row + dRow
  let nextCol = col + dCol

  while (true) {
    if (nextRow < 0 || nextRow > 3) return
    if (nextCol < 0 || nextCol > 3) return

    const nextKey = `manPower-${nextRow}-${nextCol}`
    const el = inputRefs.value[nextKey] as HTMLInputElement | null
    if (el) { el.focus(); el.select?.(); return }

    if (dRow !== 0) nextRow += dRow
    else nextCol += dCol
  }
}

onMounted(async () => {
  if (needFetch) await storeAch.fetchData()
  dataPreparation()
})

const dataPreparation = () => {
  cleanData.value.forEach(e => {
    if (e.prefix_line_id == selectedPrefixLine.value) {
      e.detail.forEach(item => {
        currentPatan.value = item.patan;
        note.value = item.note || "-";
        summaryData.value = item.summary_data;
        attendance.value = item.attendance;
        if (item.line_id == selectedLineId.value) dataTable.value = item.detail;
      });
    }
  });

  if (attendance.value.length == 0) {
    const roles = ["Foreman", "Checkman", "Handling", "Operator"];
    attendance.value = roles.map(role => ({
      DATE: filter.value.date,
      line_id: selectedLineId.value,
      shift: filter.value.shift,
      name_role: role,
      standard: 0, present: 0, sick: 0, leave: 0,
    }));
  }

  formEdit.value = { detail: dataTable.value, attendance: attendance.value };
};
const patanOptions = ref<string[]>(["Add", "A", "B", "C", "D", "R1", "LJ", "TP"])
const addRow = () => {
  const newRow: Detail = {
    id: '',

    urut: '',
    patan: '',
    urut_plan: '0',

    job_number: '',
    part_number: '',

    status: '',
    status_plan: 'FP',

    idletime: '0',

    is_open: '0',
    is_running: '0',
    is_next: '0',
    is_tandem: '0',

    stroke_plan: '',
    stroke_act: null,

    plan_process: null,
    act_process: null,

    total_process: '',

    finish_actual: '',
    time_shift: '',
    update_date: '',

    tpt: '',
    tpt_actual: '0.00',

    uph_plan: '',
    uph_act: '',

    lotsize: '',
    lotsize_actual: '0',

    dandori: '0',
    dandori_plan: '',

    combination: null,
    value_combination: null,

    dt_total: '0',

    dt_wip: '0',
    dt_jig: '0',
    dt_machines: '0',
    dt_other: '0',

    ket_dt_wip: '',
    ket_dt_jig: '',
    ket_dt_machines: '',
    ket_dt_other: '',

    reject: '0',
    repair: '0',

    ket_reject: '',
    ket_repair: '',

    nut_spot: null,

    information: '',

    keterangan_plan: '',
    keterangan_actual: '',

    additional: '',

    user_open: null,

    total_lotsize_act: 0,
    total_dt: 0,
    uph: null,
  };
  formEdit.value.detail.push(newRow);
};

const saveData = async () => {
  const save = await storeAch.editData();
    if (save) {
    dataPreparation();
  }
}

const deleteRow = async (index: string) => {
  await storeAch.deleteRow(index);
  dataPreparation();
};

const updateIsRunning  = (index: number) => { formEdit.value.detail[index].is_running = "1" };
const resetIsRunning   = (index: number) => { formEdit.value.detail[index].is_running = "0" };
const updateIsNext     = (index: number) => { formEdit.value.detail[index].is_next = "1" };
const resetIsNext      = (index: number) => { formEdit.value.detail[index].is_next = "0" };

const shouldShowDoneButton = (index: number) => {
  const hasActual = parseInt(formEdit.value.detail[index].lotsize_actual!) > 1 && formEdit.value.detail[index].is_next == '0';
  const hasRepair = parseInt(formEdit.value.detail[index].repair!) > 1;
  const hasReject = parseInt(formEdit.value.detail[index].reject!) > 1;
  return hasActual || hasRepair || hasReject;
};

const canEditAdditional     = (index: number) => permissions.value.pcd || formEdit.value.detail[index].urut_plan == '0';
const canEditActual         = () => !storeAch.permissions.pcd || authStore.user.username === "administrator";
const canEditKeteranganPlan = () => storeAch.permissions.pcd || authStore.user.username === "administrator";

const thBlue  = computed(() => isDark.value
  ? 'px-2 py-1 text-center bg-blue-900 text-blue-100'
  : 'px-2 py-1 text-center bg-blue-100 text-gray-900'
)
const thGreen = computed(() => isDark.value
  ? 'px-2 py-1 text-center bg-green-900 text-green-100'
  : 'px-2 py-1 text-center bg-green-100 text-gray-900'
)
const inputDark = computed(() => isDark.value
  ? 'border-[1px] text-xs text-gray-50 border-gray-500 rounded bg-gray-700 focus:ring-blue-400 focus:border-blue-400'
  : 'border-[1px] text-xs text-gray-900 border-gray-400 rounded bg-white focus:ring-blue-500 focus:border-blue-500'
)
const selectDark = computed(() => isDark.value
  ? 'border-[1px] text-xs text-gray-50 border-gray-500 rounded bg-gray-700 focus:ring-blue-400 focus:border-blue-400'
  : 'border-[1px] text-xs text-gray-900 border-gray-400 rounded bg-white focus:ring-blue-500 focus:border-blue-500'
)
const tdBase      = computed(() => isDark.value ? 'text-gray-50' : 'text-gray-900')
const thNeutral   = computed(() => isDark.value ? 'px-4 py-3 text-center text-gray-50' : 'px-4 py-3 text-center text-gray-900')
const tdNeutral   = computed(() => isDark.value ? 'px-3 py-5 text-center text-xl text-gray-50' : 'px-3 py-5 text-center text-xl text-gray-900')
const cardDark    = computed(() => isDark.value ? 'shadow-md rounded-lg p-5 bg-gray-800' : 'shadow-md rounded-lg p-5 bg-white')
const wrapperDark = computed(() => isDark.value ? 'relative overflow-x-auto shadow-md sm:rounded-lg bg-gray-800' : 'relative overflow-x-auto shadow-md sm:rounded-lg')
</script>

<template>
  <div :class="isDark ? 'bg-gray-900 min-h-screen p-1 rounded-xl transition-colors duration-300' : 'bg-white min-h-screen p-1 rounded-xl transition-colors duration-300'">

    <div class="flex items-center justify-between mb-7">
      <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>
      <div class="flex items-center gap-3">

        <button
          @click="router.push({ name: 'Transaction-welding-achievement' })"
          class="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-300"
          :class="isDark ? 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'"
          title="Kembali ke daftar line"
        >
          <i class="mdi mdi-arrow-left text-base"></i>
          Kembali
        </button>

        <button
          @click="saveData"
          class="flex gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
        >
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M11 16h2m6.707-9.293-2.414-2.414A1 1 0 0 0 16.586 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7.414a1 1 0 0 0-.293-.707ZM16 20v-6a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v6h8ZM9 4h6v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4Z"/>
          </svg>
          Simpan
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-8">
      <div :class="cardDark">
        <div ref="tableWrapperRef" class="relative overflow-x-auto pb-2 table-wrapper main-table-wrapper" :class="isDark ? 'dark' : ''">
          <table class="w-full text-xs text-left rtl:text-right" :class="isDark ? 'text-gray-100' : 'text-gray-900'">
            <thead :class="isDark ? 'text-xs text-gray-50 bg-gray-700' : 'text-xs text-gray-900 bg-gray-100'">
              <tr>
                <th scope="col" rowspan="4" :class="thBlue">Delete</th>
                <th scope="col" colspan="11" :class="thBlue">Plan</th>
                <th scope="col" colspan="23" :class="thGreen">Actual</th>
              </tr>

              <tr>
                <th scope="col" rowspan="3" :class="thBlue">No</th>
                <th scope="col" rowspan="3" :class="thBlue">Patan</th>

                <th scope="col" rowspan="3" :class="thBlue">
                  <div>Part Number</div>
                  <input
                    type="text"
                    v-model="searchPartNumber"
                    placeholder="Search..."
                    class="mt-1 block w-full px-1.5 py-0.5 font-normal"
                    :class="inputDark"
                  />
                </th>

                <th scope="col" rowspan="3" :class="thBlue">
                  <div>Job Number</div>
                  <input
                    type="text"
                    v-model="searchJobNumber"
                    placeholder="Search..."
                    class="mt-1 block w-full px-1.5 py-0.5 font-normal"
                    :class="inputDark"
                  />
                </th>

                <th scope="col" rowspan="3" :class="thBlue">Status</th>
                <th scope="col" rowspan="3" :class="thBlue">OP</th>
                <th scope="col" rowspan="3" :class="thBlue">Stroke</th>
                <th scope="col" rowspan="2" :class="thBlue"><span class="whitespace-nowrap">Lot Size</span></th>
                <th scope="col" rowspan="2" :class="thBlue">TPT</th>
                <th scope="col" rowspan="3" :class="thBlue">UPH Plan</th>
                <th scope="col" rowspan="3" :class="thBlue">Keterangan</th>
                <th scope="col" rowspan="3" :class="thGreen">Stroke</th>
                <th scope="col" rowspan="2" :class="thGreen">OK</th>
                <th scope="col" rowspan="2" colspan="2" :class="thGreen">Repair</th>
                <th scope="col" rowspan="2" colspan="2" :class="thGreen">Reject</th>
                <th scope="col" rowspan="3" :class="thGreen">Total Lot Size</th>
                <th scope="col" rowspan="2" :class="thGreen">Idletime</th>
                <th scope="col" rowspan="2" :class="thGreen">Dandori</th>
                <th scope="col" colspan="9" :class="thGreen">Down Time</th>
                <th scope="col" rowspan="2" :class="thGreen">TPT</th>
                <th scope="col" rowspan="2" :class="thGreen">UPH</th>
                <th scope="col" rowspan="3" :class="thGreen">Keterangan</th>
                <th scope="col" rowspan="3" :class="thGreen">Start Machine</th>
                <th scope="col" rowspan="3" :class="thGreen">Next Process</th>
              </tr>

              <tr>
                <th scope="col" rowspan="1" colspan="2" :class="thGreen">Machines</th>
                <th scope="col" rowspan="1" colspan="2" :class="thGreen">Jig</th>
                <th scope="col" rowspan="1" colspan="2" :class="thGreen">Other</th>
                <th scope="col" rowspan="1" colspan="2" :class="thGreen">Bahan</th>
                <th scope="col" rowspan="1" :class="thGreen">Total</th>
              </tr>

              <tr>
                <th :class="thBlue">pcs</th>
                <th :class="thBlue">Minutes</th>
                <th :class="thGreen">pcs</th>
                <th :class="thGreen">pcs</th>
                <th :class="thGreen">Ket</th>
                <th :class="thGreen">pcs</th>
                <th :class="thGreen">Ket</th>
                <th :class="thGreen">Minutes</th>
                <th :class="thGreen">Minutes</th>
                <th :class="thGreen">Minutes</th>
                <th :class="thGreen">Ket</th>
                <th :class="thGreen">Minutes</th>
                <th :class="thGreen">Ket</th>
                <th :class="thGreen">Minutes</th>
                <th :class="thGreen">Ket</th>
                <th :class="thGreen">Minutes</th>
                <th :class="thGreen">Ket</th>
                <th :class="thGreen">Minutes</th>
                <th :class="thGreen">Minutes</th>
                <th :class="thGreen">pcs/hour</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(item, index) in filteredDetail"
                :key="index"
                class="border-b text-center transition-colors"
                :class="isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-50' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'"
              >
                <td class="px-2 py-1">
                  <button v-if="permissions.pcd" @click="deleteRow(item.urut)">
                    <svg class="w-5 h-5 text-red-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                    </svg>
                  </button>
                  <p v-else class="text-center">-</p>
                </td>

                <td class="px-2 py-1">{{ index + 1 }}</td>
                <td v-if="item.urut_plan == '0'" class="px-2 py-1">
                  <select
                    v-model="item.patan"
                    class="block w-20 pl-1.5 pr-6 py-1"
                    :class="selectDark"
                  >
                    <option value=""></option>
                    <option v-for="p in patanOptions" :key="p" :value="p">{{ p }}</option>
                  </select>
                </td>
                <td v-else class="px-2 py-1">{{ currentPatan }}</td>

                <td v-if="canEditAdditional(index)" class="px-2 py-1 part-number-cell">
                  <div
                    class="select-wrapper"
                    :class="isDark ? 'select-wrapper--dark' : 'select-wrapper--light'"
                    @focusin="activeDropdownRow = index"
                    @focusout="activeDropdownRow = null"
                  >
                    <CustomSelectSearch
                      v-model="item.part_number"
                      :items="partData"
                      label=""
                      :require-type="false"
                      return-type="part_number"
                    />
                  </div>
                </td>
                <td v-else class="px-2 py-1 whitespace-nowrap">{{ item.part_number }}</td>

                <td class="px-2 py-1 whitespace-nowrap">{{ item.job_number }}</td>

                <td v-if="canEditAdditional(index)" class="px-2 py-1">
                  <select v-model="item.status_plan" :ref="el => (inputRefs[`inputField-${index}-0`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 0)" class="block w-16 pl-1.5 pr-6 py-1" :class="selectDark">
                    <option value="FP">FP</option>
                    <option value="WIP">WIP</option>
                  </select>
                </td>
                <td v-else class="px-2 py-1">{{ item.status_plan }}</td>

                <td class="px-2 py-1 whitespace-nowrap">{{ item.total_process }}</td>
                <td class="px-2 py-1">{{ item.stroke_plan }}</td>

                <td v-if="canEditAdditional(index)" class="px-2 py-1">
                  <input type="number" v-model="item.lotsize" :ref="el => (inputRefs[`inputField-${index}-1`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 1)" class="block w-16 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.lotsize }}</td>

                <td v-if="canEditAdditional(index)" class="px-2 py-1">
                  <input type="number" v-model="item.tpt" :ref="el => (inputRefs[`inputField-${index}-2`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 2)" class="block w-20 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.tpt }}</td>

                <td v-if="canEditAdditional(index)" class="px-2 py-1">
                  <input type="number" v-model="item.uph_plan" :ref="el => (inputRefs[`inputField-${index}-3`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 3)" class="block w-20 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.uph_plan }}</td>

                <td v-if="canEditKeteranganPlan()" class="px-2 py-1">
                  <select v-model="item.keterangan_plan" :ref="el => (inputRefs[`inputField-${index}-4`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 4)" class="block w-40 pl-1.5 pr-6 py-1" :class="selectDark">
                    <option value=""></option>
                    <option v-for="value in keteranganPlan" :value="value.information">{{ value.information }}</option>
                  </select>
                </td>
                <td v-else class="px-2 py-1">{{ item.keterangan_plan }}</td>

                <td class="px-2 py-1">{{ item.stroke_act }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.lotsize_actual" :ref="el => (inputRefs[`inputField-${index}-5`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 5)" class="block w-16 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.lotsize_actual }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.repair" :ref="el => (inputRefs[`inputField-${index}-6`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 6)" class="block w-16 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.repair }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="text" v-model="item.ket_repair" :ref="el => (inputRefs[`inputField-${index}-7`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 7)" class="block w-32 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.ket_repair }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.reject" :ref="el => (inputRefs[`inputField-${index}-8`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 8)" class="block w-16 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.reject }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="text" v-model="item.ket_reject" :ref="el => (inputRefs[`inputField-${index}-9`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 9)" class="block w-32 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.ket_reject }}</td>

                <td class="px-2 py-1" :class="Number(item.total_lotsize_act!) > Number(item.lotsize!) ? 'text-blue-400 font-medium' : (Number(item.total_lotsize_act!) < Number(item.lotsize!) ? 'text-red-400 font-medium' : tdBase)">
                  {{ item.total_lotsize_act }}
                </td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.idletime" :ref="el => (inputRefs[`inputField-${index}-10`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 10)" class="block w-20 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.idletime }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.dandori" :ref="el => (inputRefs[`inputField-${index}-11`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 11)" class="block w-20 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.dandori }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.dt_machines" :ref="el => (inputRefs[`inputField-${index}-12`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 12)" class="block w-20 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.dt_machines }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="text" v-model="item.ket_dt_machines" :ref="el => (inputRefs[`inputField-${index}-13`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 13)" class="block w-32 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.ket_dt_machines }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.dt_jig" :ref="el => (inputRefs[`inputField-${index}-14`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 14)" class="block w-20 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.dt_jig }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="text" v-model="item.ket_dt_jig" :ref="el => (inputRefs[`inputField-${index}-15`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 15)" class="block w-32 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.ket_dt_jig }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.dt_other" :ref="el => (inputRefs[`inputField-${index}-16`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 16)" class="block w-20 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.dt_other }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="text" v-model="item.ket_dt_other" :ref="el => (inputRefs[`inputField-${index}-17`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 17)" class="block w-32 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.ket_dt_other }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.dt_wip" :ref="el => (inputRefs[`inputField-${index}-18`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 18)" class="block w-20 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.dt_wip }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="text" v-model="item.ket_dt_wip" :ref="el => (inputRefs[`inputField-${index}-19`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 19)" class="block w-32 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.ket_dt_wip }}</td>

                <td class="px-2 py-1">{{ item.total_dt == 0 ? '' : item.total_dt }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <input type="number" v-model="item.tpt_actual" :ref="el => (inputRefs[`inputField-${index}-20`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 20)" class="block w-20 px-1.5 py-1" :class="inputDark" />
                </td>
                <td v-else class="px-2 py-1">{{ item.tpt_actual == '0.00' ? '-' : item.tpt_actual }}</td>

                <td class="px-2 py-1">{{ item.uph == null ? '-' : item.uph }}</td>

                <td v-if="canEditActual()" class="px-2 py-1">
                  <select v-model="item.keterangan_actual" :ref="el => (inputRefs[`inputField-${index}-21`] = el as HTMLElement)" @keydown="handleArrowKey($event, index, 21)" class="block w-48 pl-1.5 pr-6 py-1" :class="selectDark">
                    <option value=""></option>
                    <option v-for="value in keteranganActual" :value="value.information">{{ value.information }}</option>
                  </select>
                </td>
                <td v-else class="px-2 py-1">{{ item.keterangan_actual }}</td>

                <td class="px-2 py-1">
                  <button v-if="item.part_number && item.is_running == '0'" @click="updateIsRunning(index)" class="text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded text-xs px-3 py-1 text-center">Start</button>
                  <button v-else-if="item.part_number && item.is_running == '1'" @click="resetIsRunning(index)" class="text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded text-xs px-3 py-1 text-center">Stop</button>
                  <p v-else class="text-center">-</p>
                </td>

                <td class="px-2 py-1">
                  <p v-if="shouldShowDoneButton(index)" class="font-medium text-green-500">Done</p>
                  <button v-else-if="item.part_number && item.is_next == '0'" @click="updateIsNext(index)" class="text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded text-xs px-3 py-1 text-center">Start</button>
                  <button v-else-if="item.part_number && item.is_next == '1'" @click="resetIsNext(index)" class="text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded text-xs px-3 py-1 text-center">Stop</button>
                  <p v-else class="text-center">-</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-start mt-3">
          <button
            @click="addRow"
            class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
                  hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300
                  font-medium rounded-full text-sm px-5 py-2.5"
            :class="isDark ? 'focus:ring-blue-800' : 'focus:ring-blue-300'"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5v14"/>
            </svg>
            Add Row
          </button>
        </div>
      </div>

      <div class="flex gap-8">
        <div :class="[wrapperDark, 'w-full plain-table-wrapper', isDark ? 'dark' : '']">
          <table class="text-sm text-left rtl:text-right w-full" :class="isDark ? 'text-gray-100' : 'text-gray-900'">
            <thead :class="isDark ? 'text-xs text-gray-50 bg-gray-700' : 'text-xs text-gray-900 bg-gray-100'">
              <tr>
                <th scope="col" colspan="6" :class="thNeutral">TOTAL QTY</th>
                <th scope="col" rowspan="2" :class="thNeutral">STROKE</th>
                <th scope="col" rowspan="2" :class="thNeutral">UPH</th>
                <th scope="col" rowspan="2" :class="thNeutral">TPT</th>
              </tr>
              <tr>
                <th scope="col" colspan="2" :class="isDark ? 'px-6 py-3 text-center bg-green-900 text-green-100' : 'px-6 py-3 text-center bg-green-100 text-gray-900'">OK</th>
                <th scope="col" colspan="2" :class="isDark ? 'px-6 py-3 text-center bg-yellow-900 text-yellow-100' : 'px-6 py-3 text-center bg-yellow-100 text-gray-900'">Repair</th>
                <th scope="col" colspan="2" :class="isDark ? 'px-6 py-3 text-center bg-red-900 text-red-100' : 'px-6 py-3 text-center bg-red-100 text-gray-900'">Reject</th>
              </tr>
              <tr>
                <th scope="col" :class="isDark ? 'px-6 py-3 text-center bg-green-900 text-green-100' : 'px-6 py-3 text-center bg-green-100 text-gray-900'">PCS</th>
                <th scope="col" :class="isDark ? 'px-6 py-3 text-center bg-green-900 text-green-100' : 'px-6 py-3 text-center bg-green-100 text-gray-900'">%</th>
                <th scope="col" :class="isDark ? 'px-6 py-3 text-center bg-yellow-900 text-yellow-100' : 'px-6 py-3 text-center bg-yellow-100 text-gray-900'">PCS</th>
                <th scope="col" :class="isDark ? 'px-6 py-3 text-center bg-yellow-900 text-yellow-100' : 'px-6 py-3 text-center bg-yellow-100 text-gray-900'">%</th>
                <th scope="col" :class="isDark ? 'px-6 py-3 text-center bg-red-900 text-red-100' : 'px-6 py-3 text-center bg-red-100 text-gray-900'">PCS</th>
                <th scope="col" :class="isDark ? 'px-6 py-3 text-center bg-red-900 text-red-100' : 'px-6 py-3 text-center bg-red-100 text-gray-900'">%</th>
                <th scope="col" :class="thNeutral">Total</th>
                <th scope="col" :class="thNeutral">Average</th>
                <th scope="col" :class="thNeutral">Minutes</th>
              </tr>
            </thead>
            <tbody>
              <tr class="font-medium border-b" :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
                <td :class="isDark ? 'px-3 py-5 text-center bg-green-900 text-green-100 text-xl' : 'px-3 py-5 text-center bg-green-100 text-gray-700 text-xl'">{{ summaryData?.qty_total }}</td>
                <td :class="isDark ? 'px-3 py-5 text-center bg-green-900 text-green-100 text-xl' : 'px-3 py-5 text-center bg-green-100 text-gray-700 text-xl'">{{ utils.formatPercentOneZero(summaryData?.qty_persen) }}%</td>
                <td :class="isDark ? 'px-3 py-5 text-center bg-yellow-900 text-yellow-100 text-xl' : 'px-3 py-5 text-center bg-yellow-100 text-gray-700 text-xl'">{{ summaryData?.repair_total }}</td>
                <td :class="isDark ? 'px-3 py-5 text-center bg-yellow-900 text-yellow-100 text-xl' : 'px-3 py-5 text-center bg-yellow-100 text-gray-700 text-xl'">{{ utils.formatPercentOneZero(summaryData?.repair_persen) }}%</td>
                <td :class="isDark ? 'px-3 py-5 text-center bg-red-900 text-red-100 text-xl' : 'px-3 py-5 text-center bg-red-100 text-gray-700 text-xl'">{{ summaryData?.reject_total }}</td>
                <td :class="isDark ? 'px-3 py-5 text-center bg-red-900 text-red-100 text-xl' : 'px-3 py-5 text-center bg-red-100 text-gray-700 text-xl'">{{ utils.formatPercentOneZero(summaryData?.reject_persen) }}%</td>
                <td :class="isDark ? 'px-3 py-5 text-center text-xl text-gray-50' : 'px-3 py-5 text-center text-xl text-gray-900'">{{ utils.formatDecimaltoNumber(summaryData?.total_stroke_actual) }}</td>
                <td :class="isDark ? 'px-3 py-5 text-center text-xl text-gray-50' : 'px-3 py-5 text-center text-xl text-gray-900'">{{ utils.formatDecimaltoNumber(summaryData?.avg_uph) }}</td>
                <td :class="isDark ? 'px-3 py-5 text-center text-xl text-gray-50' : 'px-3 py-5 text-center text-xl text-gray-900'">{{ utils.formatDecimaltoNumber(summaryData?.tpt_total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table class="w-full plain-table-wrapper" :class="isDark ? 'dark bg-gray-800 rounded-lg' : ''">
          <thead>
            <tr>
              <th :class="isDark ? 'text-start px-5 py-3 text-xl text-gray-50' : 'text-start px-5 py-3 text-xl text-gray-900'">Note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td :class="isDark ? 'text-center px-4 py-3 text-gray-100' : 'text-center px-4 py-3 text-gray-900'">{{ note }}</td>
            </tr>
          </tbody>
        </table>
      </div>  

      <div class="flex justify-center">
        <div :class="[wrapperDark, 'w-1/2 plain-table-wrapper manpower-table', isDark ? 'dark' : '']">
          <table class="w-full text-xs text-left rtl:text-right" :class="isDark ? 'text-gray-100' : 'text-gray-900'">
            <thead :class="isDark ? 'text-xs text-gray-50 bg-gray-700' : 'text-xs text-gray-900 bg-gray-100'">
              <tr>
                <th scope="col" colspan="5" :class="[isDark ? 'px-4 py-2 text-center bg-gray-600 text-gray-50' : 'px-4 py-2 text-center bg-gray-200 text-gray-900', 'text-lg']">Σ Man Power</th>
              </tr>
              <tr>
                <th scope="col" :class="thNeutral"></th>
                <th scope="col" :class="isDark ? 'px-4 py-2 text-center bg-blue-900 text-blue-100' : 'px-4 py-2 text-center bg-blue-100 text-gray-900'">Standard</th>
                <th scope="col" :class="isDark ? 'px-4 py-2 text-center bg-green-900 text-green-100' : 'px-4 py-2 text-center bg-green-100 text-gray-900'">Actual</th>
                <th scope="col" :class="isDark ? 'px-4 py-2 text-center bg-yellow-900 text-yellow-100' : 'px-4 py-2 text-center bg-yellow-100 text-gray-900'">Sakit</th>
                <th scope="col" :class="isDark ? 'px-4 py-2 text-center bg-gray-600 text-gray-50' : 'px-4 py-2 text-center bg-gray-200 text-gray-900'">Izin</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(role, roleIndex) in ['Foreman', 'Checkman', 'Handling', 'Operator']"
                :key="role"
                class="border-b transition-colors"
                :class="isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'"
              >
                <td :class="isDark ? 'px-2 py-1 text-center text-gray-50' : 'px-2 py-1 text-center text-gray-900'">{{ role }}</td>
                <template v-for="(item, idx) in formEdit.attendance" :key="idx">
                  <template v-if="item.name_role == role">
                    <td :class="isDark ? 'px-2 py-1 text-center bg-gray-800' : 'px-2 py-1 text-center bg-white'">
                      <input
                        type="number"
                        v-model="item.standard"
                        :ref="el => (inputRefs[`manPower-${roleIndex}-0`] = el as HTMLElement)"
                        @keydown="handleManPowerArrowKey($event, roleIndex, 0)"
                        class="block w-full px-1.5 py-1"
                        :class="inputDark"
                      />
                    </td>
                    <td :class="isDark ? 'px-2 py-1 text-center bg-gray-800' : 'px-2 py-1 text-center bg-white'">
                      <input
                        type="number"
                        v-model="item.present"
                        :ref="el => (inputRefs[`manPower-${roleIndex}-1`] = el as HTMLElement)"
                        @keydown="handleManPowerArrowKey($event, roleIndex, 1)"
                        class="block w-full px-1.5 py-1"
                        :class="inputDark"
                      />
                    </td>
                    <td :class="isDark ? 'px-2 py-1 text-center bg-gray-800' : 'px-2 py-1 text-center bg-white'">
                      <input
                        type="number"
                        v-model="item.sick"
                        :ref="el => (inputRefs[`manPower-${roleIndex}-2`] = el as HTMLElement)"
                        @keydown="handleManPowerArrowKey($event, roleIndex, 2)"
                        class="block w-full px-1.5 py-1"
                        :class="inputDark"
                      />
                    </td>
                    <td :class="isDark ? 'px-2 py-1 text-center bg-gray-800' : 'px-2 py-1 text-center bg-white'">
                      <input
                        type="number"
                        v-model="item.leave"
                        :ref="el => (inputRefs[`manPower-${roleIndex}-3`] = el as HTMLElement)"
                        @keydown="handleManPowerArrowKey($event, roleIndex, 3)"
                        class="block w-full px-1.5 py-1"
                        :class="inputDark"
                      />
                    </td>
                  </template>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Highlight baris: hover (halus) & fokus (kontras, menang atas hover) */
.main-table-wrapper,
.manpower-table {
  --row-hover-bg: #f1f5f9;
  --row-focus-bg: #dbeafe;
}

.main-table-wrapper.dark,
.manpower-table.dark {
  --row-hover-bg: #2b3646;
  --row-focus-bg: #23406b;
}

.main-table-wrapper tbody tr:hover td,
.manpower-table tbody tr:hover td {
  background-color: var(--row-hover-bg) !important;
}

.main-table-wrapper tbody tr:has(input:focus, select:focus) td,
.manpower-table tbody tr:has(input:focus, select:focus) td {
  background-color: var(--row-focus-bg) !important;
}

.main-table-wrapper {
  --border-color: #000000;
  --sticky-head-bg: #ebf5ff;
  --sticky-body-bg: #ffffff;
  --head-row-h: 26px;
  --col-part: 170px;
  --col-job: 110px;
}

.dark .main-table-wrapper,
.main-table-wrapper.dark {
  --border-color: #ffffff;
  --sticky-head-bg: #1e3a5f;
  --sticky-body-bg: #1f2937;
}

.table-wrapper {
  max-height: 700px;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.main-table-wrapper table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.main-table-wrapper thead th,
.main-table-wrapper tbody td {
  border-right: 1px solid var(--border-color, #000000) !important;
  border-bottom: 1px solid var(--border-color, #000000) !important;
}

/* Tinggi baris header dikunci supaya offset sticky (top) di bawah selalu pas */
.main-table-wrapper thead th {
  height: var(--head-row-h);
}

/* Lebar kolom sticky (Part Number & Job Number) dikunci supaya offset left pas */
.main-table-wrapper thead tr:nth-child(2) th:nth-child(3),
.main-table-wrapper tbody td:nth-child(4) {
  width: var(--col-part);
  min-width: var(--col-part);
}

.main-table-wrapper thead tr:nth-child(2) th:nth-child(4),
.main-table-wrapper tbody td:nth-child(5) {
  width: var(--col-job);
  min-width: var(--col-job);
}

/* CustomSelectSearch versi compact (hanya di halaman ini) */
.select-wrapper :deep(.relative) {
  margin-top: 0;
}

.select-wrapper :deep(.relative > div:first-child) {
  padding: 0.25rem 0.375rem;
  font-size: 0.75rem;
  line-height: 1rem;
  border-radius: 0.25rem;
}

.main-table-wrapper thead th:first-child,
.main-table-wrapper tbody td:first-child {
  border-left: 1px solid var(--border-color, #000000) !important;
}

.main-table-wrapper thead tr:first-child th {
  border-top: 1px solid var(--border-color, #000000) !important;
  position: sticky !important;
  top: 0 !important;
  z-index: 20 !important;
}

.main-table-wrapper thead tr:nth-child(2) th:nth-child(3) {
  position: sticky !important;
  left: 0 !important;
  z-index: 20 !important;
  background-color: var(--sticky-head-bg, #ebf5ff) !important;
}

.main-table-wrapper tbody td:nth-child(4) {
  position: sticky !important;
  left: 0 !important;
  z-index: 15 !important;
  background-color: var(--sticky-body-bg, #ffffff) !important;
}

.main-table-wrapper thead tr:nth-child(2) th:nth-child(4) {
  position: sticky !important;
  left: var(--col-part) !important;
  z-index: 20 !important;
  background-color: var(--sticky-head-bg, #ebf5ff) !important;
}

.main-table-wrapper tbody td:nth-child(5) {
  position: sticky !important;
  left: var(--col-part) !important;
  z-index: 15 !important;
  background-color: var(--sticky-body-bg, #ffffff) !important;
}

.main-table-wrapper thead tr:nth-child(2) th:nth-child(8),
.main-table-wrapper thead tr:nth-child(4) th:nth-child(1) {
  position: sticky !important;
  left: calc(var(--col-part) + var(--col-job)) !important;
  z-index: 20 !important;
  background-color: var(--sticky-head-bg, #ebf5ff) !important;
}

.main-table-wrapper tbody td:nth-child(9) {
  position: sticky !important;
  left: calc(var(--col-part) + var(--col-job)) !important;
  z-index: 15 !important;
  background-color: var(--sticky-body-bg, #ffffff) !important;
}

.main-table-wrapper thead tr:nth-child(2) th {
  position: sticky !important;
  top: var(--head-row-h) !important;
  z-index: 9 !important;
}

.main-table-wrapper thead tr:nth-child(3) th {
  position: sticky !important;
  top: calc(var(--head-row-h) * 2) !important;
  z-index: 9 !important;
}

.main-table-wrapper thead tr:nth-child(4) th {
  position: sticky !important;
  top: calc(var(--head-row-h) * 3) !important;
  z-index: 9 !important;
}

.plain-table-wrapper {
  --plain-border: #000000; 
}

.plain-table-wrapper.dark {
  --plain-border: #ffffff; 
}

.plain-table-wrapper table {
  width: 100%;
  border-collapse: collapse;
}

.plain-table-wrapper thead th,
.plain-table-wrapper tbody td {
  position: static !important;
  top: auto !important;
  left: auto !important;
  z-index: auto !important;
  border: 1px solid var(--plain-border); 
}
</style>
