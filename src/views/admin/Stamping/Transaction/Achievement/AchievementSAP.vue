<script setup lang="ts">
import { useStampingAchievementProdStore } from "@/stores/Stamping/Transaction/Achievement";
import { useUtilityStore } from "@/stores/utility";
import { useAuthStore } from "@/stores/auth";
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import MultiSelectCheckbox from '@/components/shared/MultiSelectCheckbox.vue';
import { onMounted, ref, shallowRef, watch, computed, onBeforeUnmount } from 'vue';
import { storeToRefs } from "pinia";
import { initFlowbite } from "flowbite";
// @ts-ignore
import Datepicker from "flowbite-datepicker/Datepicker";

const page = ref({ title: "" });
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
    title: 'Achievement SAP',
    disabled: true,
    href: '#'
  }
]);

const view = ref(false);
const achievementStore = useStampingAchievementProdStore();
const utilityStore = useUtilityStore();
const authStore = useAuthStore();

const {
  fetchDataLineforSAP,
  fetchDataSAP,
  loadDataEditSAP,
  countDataActual,
  onSaveDetailSAP,
  closeRefreshForm,
} = achievementStore

const {
  formatPercentOneZero,
  focusNext,
  formatDate,
} = utilityStore

const {
  line,
  lines,
  dialog,
  formDetail,
  keterangan_sap,
  filterDate,
  params,
  line_id,
  patan,
  is_done,
} = storeToRefs(achievementStore);

const {
  user,
} = authStore;

const beforeUnloadHandler = () => {
  closeRefreshForm(user.fullname!)
}

onMounted(async () => {
  window.addEventListener("beforeunload", beforeUnloadHandler);

  await fetchDataLineforSAP();
  await fetchDataSAP();

  if (lines.value && lines.value.length > 0) {
    formDetail.value.patan = lines.value.map((item: any) => item.patan || "-");

    console.log("Patan Fixed:", formDetail.value.patan);
  }
  initFlowbite();
  const el = document.getElementById("datepicker-inline");

  if (el) {

    const datepicker = new Datepicker(el, {
      autohide: false,
      format: "yyyy-mm-dd"
    });

    if (filterDate.value.date) {
      datepicker.setDate(filterDate.value.date);
    }

    // filter by date
    el.addEventListener("changeDate", (e: any) => {
      const d = e.detail.date;

      const localDate = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-")

      filterDate.value.date = localDate;
      fetchDataLineforSAP();
      fetchDataSAP();
      page.value.title = `Achievement Stamping compare with SAP (${formatDate(
        params.value.date
      )} / Shift ${params.value.shift})`;
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})

const detectedPatan = computed(() => {
  if (!lines.value || lines.value.length === 0) return "-";

  const found = lines.value.find((item: any) => item.patan && item.patan !== "-" && item.patan !== "");

  return found ? found.patan : "-";
});

const payloadSAP = computed(() => {
  return {
    formDetail: formDetail.value as unknown as Record<string, any[]>,
    line_id: line_id.value,
    date: achievementStore.params.date,
    shift: String(achievementStore.params.shift),
    patan: patan.value,
    is_done: is_done.value
  };
});

watch(
  [() => params.value.date, () => params.value.shift],
  () => {
    page.value.title = `Achievement Stamping compare with SAP (${formatDate(params.value.date)} / Shift ${params.value.shift})`;
  },
  { immediate: true }
);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="mt-1 mb-15">
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <button type="button" data-dropdown-toggle="datepickerDropdown"
        class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 font-medium rounded-full text-sm px-5 py-2.5 text-center">
        <CalendarOutlined />
        Filter By Date
        <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 10 6">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="m1 1 4 4 4-4" />
        </svg>
      </button>
      <div id="datepickerDropdown" class="hidden z-50 mt-2 w-72 bg-white rounded-lg shadow">
        <div id="datepicker-inline"></div>
      </div>
      <form class="flex w-1/4">
        <select v-model="filterDate.month" id="month"
          class="bg-gray-50 min-w-[130px] border border-new text-gray-900 text-sm rounded-s-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          required>
          <option value="" disabled>Pilih Bulan</option>
          <option value="01">Januari</option>
          <option value="02">Februari</option>
          <option value="03">Maret</option>
          <option value="04">April</option>
          <option value="05">Mei</option>
          <option value="06">Juni</option>
          <option value="07">Juli</option>
          <option value="08">Agustus</option>
          <option value="09">September</option>
          <option value="10">Oktober</option>
          <option value="11">November</option>
          <option value="12">Desember</option>
        </select>
        <select v-model="filterDate.year" id="year"
          class="bg-gray-50 min-w-[130px] border border-new text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          required>
          <option value="" disabled>Pilih Tahun</option>
          <option v-for="i in 5" :key="i" :value="new Date().getFullYear() - (i - 1)">
            {{ new Date().getFullYear() - (i - 1) }}
          </option>
        </select>
        <button type="button" @click="achievementStore.fetchDataLineforSAP()"
          class="flex w-full items-center gap-2 whitespace-nowrap text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-e-full text-sm px-3 py-2.5 text-center">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4" />
          </svg>
          Sync SAP
        </button>
      </form>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
      <div v-for="(line, i) in lines" :key="i">
        <div class="rounded-lg shadow bg-[#182747] text-white hover:shadow-lg transition hover-menu" style="border-top: 5px solid #2563eb">
          <div class="p-4 flex justify-between items-center">
            <!-- LEFT -->
            <div class="min-w-0">
              <span class="text-lg font-semibold truncate block">LINE {{ line.line_id }}</span>
            </div>

            <!-- RIGHT BUTTONS -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <!-- VIEW -->
              <button
                class="w-7 h-7 flex items-center justify-center rounded-full text-white bg-blue-500 border border-blue-500"
                @click="[(view = true), loadDataEditSAP(line)]"
                title="View"
              >
                <i class="mdi mdi-eye text-sm"></i>
              </button>

              <!-- EDIT -->
              <button
                class="px-2 py-1 text-xs rounded border text-white bg-green-500 border-green-500"
                @click="loadDataEditSAP(line)"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Dialog -->
  <div v-if="dialog.detail" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
    <div class="relative w-[95vw] max-w-[98vw] max-h-[95vh]
            bg-[#fafafb] rounded-2xl shadow-xl
            flex flex-col overflow-hidden">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-100 rounded-lg">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Achievement vs SAP — LINE {{ line.line_id }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ view ? 'Detail data (read-only)' : 'Edit achievement & bandingkan dengan data SAP' }}</p>
          </div>
        </div>
        <button @click="[(dialog.detail = false), (view = false)]"
          class="text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm w-9 h-9 inline-flex justify-center items-center transition">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
        </button>
      </div>

      <div class="flex-1 p-4 md:p-6 space-y-5 overflow-y-auto">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
            <div class="flex items-center gap-2 text-gray-500 font-medium text-sm mb-2">
              <span class="rounded-lg bg-slate-100 p-2">
                <svg class="w-4 h-4 text-slate-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                  height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 14v7M5 4.971v9.541c5.6-5.538 8.4 2.64 14-.086v-9.54C13.4 7.61 10.6-.568 5 4.97Z" />
                </svg>
              </span>
              LINE
            </div>
            <h1 class="text-slate-700 font-bold text-2xl text-center">{{ line.line_id }}</h1>
          </div>

          <div class="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
            <div class="flex items-center gap-2 text-gray-500 font-medium text-sm mb-2">
              <span class="rounded-lg bg-blue-100 p-2">
                <svg class="w-4 h-4 text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                  height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667" />
                </svg>
              </span>
              Total LKH
            </div>
            <h1 class="text-blue-600 font-bold text-2xl text-center">
              {{
                formDetail.total_act_rh || formDetail.total_act_lh
                  ? parseInt(String(formDetail.accum_lkh || 0))
                  : "0"
              }}
            </h1>
          </div>

          <div class="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
            <div class="flex items-center gap-2 text-gray-500 font-medium text-sm mb-2">
              <span class="rounded-lg bg-purple-100 p-2">
                <svg class="w-4 h-4 text-purple-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                  height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667" />
                </svg>
              </span>
              Total SAP
            </div>
            <h1 class="text-purple-600 font-bold text-2xl text-center">
              {{
                formDetail.total_sap_rh || formDetail.total_sap_lh
                  ? parseInt(String(formDetail.accum_sap || 0))
                  : "0"
              }}
            </h1>
          </div>

          <div class="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
            <div class="flex items-center gap-2 text-gray-500 font-medium text-sm mb-2">
              <span class="rounded-lg bg-green-100 p-2">
                <svg class="w-4 h-4 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                  height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667" />
                </svg>
              </span>
              Achievement
            </div>
            <h1 class="text-green-600 font-bold text-2xl text-center">
              {{
                parseInt(String(formDetail.accum_lkh || 0)) > 0 && parseInt(String(formDetail.accum_sap || 0)) > 0
                  ? formatPercentOneZero(
                    (parseInt(String(formDetail.accum_sap || 0)) / parseInt(String(formDetail.accum_lkh || 1))) * 100
                  )
                  : "0"
              }} %
            </h1>
          </div>
        </div>

        <div class="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div
            class="relative overflow-auto lg:max-w-[1100px] 2xl:max-w-[1730px] lg:max-h-[450px] 2xl:max-h-[600px]">
            <table class="min-w-max text-sm text-center text-gray-200 border-collapse">
              <thead class="sticky top-0 z-20 bg-gray-50 text-gray-700 text-xs uppercase">
                <tr>
                  <th scope="col" rowspan="3" class="px-6 py-3 border-new">
                    No
                  </th>
                  <th scope="col" rowspan="3" class="px-6 py-3 border-new">
                    Patan
                  </th>
                  <th scope="col" colspan="2" rowspan="2" class="px-6 py-3 bg-cyan-50 border-new part">
                    Part
                  </th>
                  <th scope="col" rowspan="3" class="px-6 py-3 border-new bg-blue-50">
                    Material
                  </th>
                  <th scope="col" rowspan="6" class="px-6 py-3 border-new bg-blue-50">
                    BIQ
                  </th>
                  <th scope="col" colspan="2" class="px-6 py-3 border-new bg-yellow-50">
                    Lot Size
                  </th>
                  <th scope="col" colspan="3" class="px-6 py-3 border-new bg-green-50">
                    LKH
                  </th>
                  <th scope="col" colspan="6" class="px-6 py-3 border-new bg-purple-50">
                    SAP
                  </th>
                  <th scope="col" colspan="2" class="px-6 py-3 border-new bg-red-50">
                    GAP LKH vs SCAN
                  </th>
                  <th scope="col" colspan="2" class="px-6 py-3 border-new bg-red-50">
                    REJECT
                  </th>
                  <th scope="col" rowspan="3" class="px-6 py-3 border-new">
                    Problem Scan
                  </th>
                </tr>
                <tr>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50 ">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50">
                    Total
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    Total
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    R/M
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    TP RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    TP LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50">
                    RH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50">
                    LH
                  </th>
                </tr>
                <tr>
                  <th scope="col" colspan="1" class="px-6 py-3 border-new bg-cyan-50">
                    RH
                  </th>
                  <th scope="col" colspan="1" class="px-6 py-3 border-new bg-cyan-50">
                    LH
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-yellow-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-green-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    (sht)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-purple-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50">
                    (pcs)
                  </th>
                  <th scope="col" class="px-6 py-3 border-new bg-red-50">
                    (pcs)
                  </th>
                </tr>
              </thead>

              <!-- Tbody -->
              <tbody class="text-gray-700 text-xs uppercase font-medium">
                <template v-for="dIndex in formDetail.part_rh.length" :key="`data-process-${dIndex}`">
                  <tr v-if="formDetail.part_rh[dIndex - 1] || formDetail.part_lh[dIndex - 1]">
                    <td class="px-6 py-4 border-new font-bold">
                      {{ formDetail.urut_plan[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{
                        formDetail.additional[dIndex - 1] == 1
                          ? "Add"
                          : formDetail.additional[dIndex - 1] == 2
                            ? "LJ"
                            : formDetail.additional[dIndex - 1] == 3
                              ? "TP"
                              : (lines[dIndex - 1]?.patan && lines[dIndex - 1]?.patan !== '-')
                                ? lines[dIndex - 1]?.patan
                                : detectedPatan
                      }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{ formDetail.part_rh[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{ formDetail.part_lh[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      <!-- Material dari SAP -->
                    </td>
                    <td class="px-6 py-4 border-new">
                      <!-- BIQ dari SAP -->
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{ formDetail.lot_rh[dIndex - 1] }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{ formDetail.lot_lh[dIndex - 1] }}
                    </td>
                    <td v-if="view" class="px-6 py-4 border-new">
                      {{
                        formDetail.total_lotsize_rh[dIndex - 1]
                          ? formDetail.total_lotsize_rh[dIndex - 1]
                          : ""
                      }}
                    </td>
                    <td v-else class="px-3 py-2 border-new">
                      <input type="number" min="0" v-on:keyup.enter="focusNext"
                        v-model.number="formDetail.act_rh[dIndex - 1]" @input="countDataActual" class="w-auto achievement
                              bg-gray-50 text-gray-900
                              border-new border-gray-300
                              rounded-md
                              px-1 py-2
                              text-sm
                              focus:ring-2 focus:ring-blue-500
                              focus:border-blue-500" />
                    </td>
                    <td v-if="view" class="px-6 py-4 border-new">
                      {{
                        formDetail.total_lotsize_lh[dIndex - 1]
                          ? formDetail.total_lotsize_lh[dIndex - 1]
                          : ""
                      }}
                    </td>
                    <td v-else class="px-3 py-2 border-new">
                      <input type="number" min="0" v-on:keyup.enter="focusNext"
                        v-model.number="formDetail.act_lh[dIndex - 1]" @input="countDataActual" class="w-auto achievement
                              bg-gray-50 text-gray-900
                              border-new border-gray-300
                              rounded-md
                              px-2 py-2
                              text-sm
                              focus:ring-2 focus:ring-blue-500
                              focus:border-blue-500" placeholder="0" />
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{
                        formDetail.total_lotsize_rh[dIndex - 1]
                          ? parseInt(
                            String(formDetail.total_lotsize_rh[dIndex - 1])
                          ) +
                          parseInt(String(formDetail.total_lotsize_lh[dIndex - 1]))
                          : ""
                      }}
                    </td>
                    <td class="px-6 py-4 border-new" :class="parseInt(String(formDetail.sap_rh[dIndex - 1])) !==
                      parseInt(String(formDetail.total_lotsize_rh[dIndex - 1]))
                      ? 'text-red-500 font-bold'
                      : ''
                      ">
                      {{
                        String(formDetail.sap_rh[dIndex - 1]) !== "0"
                          ? formDetail.sap_rh[dIndex - 1]
                          : formDetail.act_rh[dIndex - 1] > 0
                            ? formDetail.sap_rh[dIndex - 1]
                            : ""
                      }}
                    </td>
                    <td class="px-6 py-4 border-new" :class="parseInt(String(formDetail.sap_lh[dIndex - 1])) !==
                      parseInt(String(formDetail.total_lotsize_lh[dIndex - 1]))
                      ? 'text-red-500 font-bold'
                      : ''
                      ">
                      {{
                        String(formDetail.sap_lh[dIndex - 1]) !== "0"
                          ? formDetail.sap_lh[dIndex - 1]
                          : formDetail.act_lh[dIndex - 1] > 0
                            ? formDetail.sap_lh[dIndex - 1]
                            : ""
                      }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      <!-- Total dari RH dan LH per baris -->
                      {{
                        formDetail.sap_rh[dIndex - 1] !== 0
                          ? formDetail.total_sap[dIndex - 1]
                          : ""
                      }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      <!-- R/M dari SAP -->
                    </td>
                    <td class="px-6 py-4 border-new">
                      <!-- TP RH dari SAP -->
                    </td>
                    <td class="px-6 py-4 border-new">
                      <!-- TP LH dari SAP -->
                    </td>
                    <td class="px-6 py-4 border-new" :class="formDetail.sap_rh[dIndex - 1] !==
                      formDetail.act_rh[dIndex - 1]
                      ? 'text-red-500 font-bold'
                      : ''
                      ">
                      <!-- Pengurangan Actual RH dan SAP RH -->
                      {{
                        String(formDetail.sap_rh[dIndex - 1]) !== "0"
                          ? formDetail.act_rh[dIndex - 1] -
                          formDetail.sap_rh[dIndex - 1]
                          : ""
                      }}
                    </td>
                    <td class="px-6 py-4 border-new" :class="formDetail.sap_lh[dIndex - 1] !==
                      formDetail.act_lh[dIndex - 1]
                      ? 'text-red-500 font-bold'
                      : ''
                      ">
                      <!-- Pengurangan Actual LH dan SAP LH -->
                      {{
                        String(formDetail.sap_lh[dIndex - 1]) !== "0"
                          ? formDetail.act_lh[dIndex - 1] -
                          formDetail.sap_lh[dIndex - 1]
                          : ""
                      }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{
                        String(formDetail.reject_rh[dIndex - 1]) !== "0"
                          ? formDetail.reject_rh[dIndex - 1]
                          : ""
                      }}
                    </td>
                    <td class="px-6 py-4 border-new">
                      {{
                        String(formDetail.reject_lh[dIndex - 1]) !== "0"
                          ? formDetail.reject_lh[dIndex - 1]
                          : ""
                      }}
                    </td>
                    <td v-if="view" class="px-6 py-4 border-new">
                      <!-- Problem Scan Multi pilihan -->
                      <!-- Cut off ≠ actual kanban -->
                      {{ formDetail.keterangan_sap[dIndex - 1].toString() }}
                    </td>
                    <td v-else class="px-3 py-2 border-new">
                      <MultiSelectCheckbox v-model="formDetail.keterangan_sap[dIndex - 1]" :options="keterangan_sap"
                        placeholder="Select keterangan" />
                    </td>
                  </tr>
                </template>
              </tbody>
              <tfoot class="text-gray-700 text-xs uppercase font-medium">
                <tr>
                  <th :colspan="6" class="px-6 py-4 border-new">TOTAL</th>
                  <th class="px-6 py-4 border-new">{{ formDetail.total_lot_rh ? formDetail.total_lot_rh : 0 }}</th>
                  <th class="px-6 py-4 border-new">{{ formDetail.total_lot_lh ? formDetail.total_lot_lh : 0 }}</th>

                  <th class="px-6 py-4 border-new">{{ formDetail.accum_lotsize_rh ? formDetail.accum_lotsize_rh : 0 }}
                  </th>
                  <th class="px-6 py-4 border-new">{{ formDetail.accum_lotsize_lh ? formDetail.accum_lotsize_lh : 0 }}
                  </th>

                  <th class="px-6 py-4 border-new">
                    {{
                      (formDetail.accum_lotsize_rh || formDetail.accum_lotsize_lh)
                        ? parseInt(String(formDetail.accum_lotsize_rh || 0)) +
                        parseInt(String(formDetail.accum_lotsize_lh || 0))
                        : 0
                    }}
                  </th>

                  <th class="px-6 py-4 border-new">{{ formDetail.total_sap_rh ? formDetail.total_sap_rh : 0 }}</th>
                  <th class="px-6 py-4 border-new">{{ formDetail.total_sap_lh ? formDetail.total_sap_lh : 0 }}</th>

                  <th class="px-6 py-4 border-new">
                    {{
                      parseInt(String(formDetail.total_sap_rh || 0)) !== 0
                        ? parseInt(String(formDetail.total_sap_rh || 0)) +
                        parseInt(String(formDetail.total_sap_lh || 0))
                        : 0
                    }}
                  </th>

                  <th class="px-6 py-4 border-new"></th>
                  <th class="px-6 py-4 border-new"></th>
                  <th class="px-6 py-4 border-new"></th>

                  <th class="px-6 py-4 border-new">
                    {{
                      formDetail.accum_lotsize_rh || formDetail.total_sap_rh
                        ? parseInt(String(formDetail.accum_lotsize_rh || 0)) -
                        parseInt(String(formDetail.total_sap_rh || 0))
                        : 0
                    }}
                  </th>

                  <th class="px-6 py-4 border-new">
                    {{
                      formDetail.accum_lotsize_lh || formDetail.total_sap_lh
                        ? parseInt(String(formDetail.accum_lotsize_lh || 0)) -
                        parseInt(String(formDetail.total_sap_lh || 0))
                        : 0
                    }}
                  </th>

                  <th class="px-6 py-4 border-new">{{ formDetail.total_reject_rh !== "0" ? formDetail.total_reject_rh :
                    0 }}</th>
                  <th class="px-6 py-4 border-new">{{ formDetail.total_reject_lh !== "0" ? formDetail.total_reject_lh :
                    0 }}</th>
                  <th class="px-6 py-4 border-new"></th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
        <button @click="dialog.detail = false; view = false" type="button"
          class="text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5 text-center inline-flex items-center transition-colors">
          <svg class="w-4 h-4 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
          Close
        </button>

        <button v-if="!view" @click="onSaveDetailSAP(payloadSAP)" type="button"
          class="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center inline-flex items-center transition-colors">
          <svg class="w-4 h-4 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4" />
          </svg>
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.border-new {
  border: 1px solid #e5e7eb !important;
}

.part {
  min-width: 270px !important;
  max-width: 270px !important;
  width: 270px !important;
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
  margin: .5px;
}

.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}
</style>