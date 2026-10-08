<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import MultiSelectCheckbox from '@/components/shared/MultiSelectCheckbox.vue';
import { useAchievementSAPStore } from '@/stores/Welding/Transaction/AchievementSAP';
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import DatePickerButton from '@/components/date/DatePickerButton.vue';

const store = useAchievementSAPStore();
const notificationStore = useNotificationStore();
const {
  view,
  lines,
  line,
  formDetail,
  dialog,
  params,
  list
} = storeToRefs(store);

const page = ref({ title: 'Sample Page' });
const breadcrumbs = shallowRef([
  {
    title: 'Welding',
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

const filterDate = ref({
  month: '',
  year: ''
});

const keterangan_sap = computed(() => list.value.keterangan_sap);

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('id-ID', options);
}

function formatPercentOneZero(value: number): string {
  return value.toFixed(1);
}

function focusNext(event: KeyboardEvent): void {
  const target = event.target as HTMLElement;
  const inputs = Array.from(document.querySelectorAll('.achievement')) as HTMLElement[];
  const currentIndex = inputs.indexOf(target);
  
  if (currentIndex > -1 && currentIndex < inputs.length - 1) {
    inputs[currentIndex + 1].focus();
  }
}

function countDataActual(): void {
  store.calculateTotals();
}

function loadDataEditSAP(lineData: any): void {
  store.loadDataEditSAP(lineData);
}

async function onSaveDetailSAP(): Promise<void> {
  await store.onSaveDetailSAP();
}

async function handleSyncSAP(): Promise<void> {
  if (!filterDate.value.month || !filterDate.value.year) {
    notificationStore.showDialogWarning('warning', 'Please select month and year');
    return;
  }
  
  params.value.period = `${filterDate.value.year}${filterDate.value.month}`;
  
  try {
    await store.fetchDataSAP('LKH-WLD');
    notificationStore.showDialogWarning('success', 'SAP data synchronized successfully!');
  } catch (error) {
    notificationStore.showDialogError('error', 'Failed to synchronize SAP data. Please try again.');
    console.error('Sync SAP failed:', error);
  }
}

watch(
  [() => params.value.date, () => params.value.shift],
  () => {
    page.value.title = `Achievement Welding compare with SAP (${formatDate(params.value.date)} / Shift ${params.value.shift})`;
  },
  { immediate: true }
);

watch(
  [() => params.value.date, () => params.value.shift],
  async () => {
    await store.fetchDataLineforSAP();
  }
);

onMounted(() => {
  store.fetchDataLineforSAP();
});

onUnmounted(() => {
  store.resetState();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="mt-1 mb-15">
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <DatePickerButton v-model="params.date" label="Filter By Date" />
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
        <button type="button" @click="handleSyncSAP"
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
      <div v-for="(lineItem, i) in lines" :key="i">
        <div class="rounded-lg shadow bg-[#182747] text-white hover:shadow-lg transition hover-menu" style="border-top: 5px solid #2563eb">
          <div class="p-4 flex justify-between items-center">
            <!-- LEFT -->
            <div class="min-w-0">
              <span class="text-lg font-semibold truncate block">LINE {{ lineItem.line_id }}</span>
            </div>

            <!-- RIGHT BUTTONS -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <!-- VIEW -->
              <button
                class="w-7 h-7 flex items-center justify-center rounded-full text-white bg-blue-500 border border-blue-500"
                @click="[(view = true), loadDataEditSAP(lineItem)]"
                title="View"
              >
                <i class="mdi mdi-eye text-sm"></i>
              </button>

              <!-- EDIT -->
              <button
                class="px-2 py-1 text-xs rounded border text-white bg-green-500 border-green-500"
                @click="loadDataEditSAP(lineItem)"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="dialog.detail" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
    <div class="relative w-[95vw] max-w-[98vw] max-h-[95vh] bg-[#fafafb] rounded-2xl shadow-xl flex flex-col overflow-hidden">
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
            <h3 class="text-lg font-semibold text-gray-900">Achievement vs SAP — LINE {{ line?.line_id }}</h3>
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
            <h1 class="text-slate-700 font-bold text-2xl text-center">{{ line?.line_id }}</h1>
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
              {{ formDetail.total_ok || 0 }}
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
              {{ formDetail.total_sap || 0 }}
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
                formDetail.total_ok > 0 && formDetail.total_sap > 0
                  ? formatPercentOneZero((formDetail.total_sap / formDetail.total_ok) * 100)
                  : "0"
              }}%
            </h1>
          </div>
        </div>

        <!-- Table -->
        <div class="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div class="relative overflow-auto max-h-[55vh]">
            <table class="w-full text-sm text-center text-gray-700 border-collapse">
              <thead class="sticky top-0 z-20 bg-gray-50 text-gray-700 text-xs uppercase">
                <tr>
                  <th rowspan="3" class="px-6 py-3 border-new">No</th>
                  <th rowspan="3" class="px-6 py-3 border-new">Patan</th>
                  <th rowspan="3" class="px-6 py-3 border-new part">Part Number</th>
                  <th rowspan="3" class="px-6 py-3 border-new">Material</th>
                  <th rowspan="3" class="px-6 py-3 border-new">BIQ</th>
                  <th rowspan="2" class="px-6 py-3 border-new bg-yellow-50">Lot Size</th>
                  <th rowspan="2" class="px-6 py-3 border-new bg-green-50">LKH</th>
                  <th colspan="3" class="px-6 py-3 bg-purple-50 border-new">SAP</th>
                  <th rowspan="2" class="px-6 py-3 bg-red-50 border-new w-24">GAP LKH vs SCAN</th>
                  <th rowspan="2" class="px-6 py-3 bg-red-50 border-new">REJECT</th>
                  <th rowspan="3" class="px-6 py-3 border-new">Problem Scan</th>
                </tr>
                <tr>
                  <th class="px-6 py-3 bg-purple-50 border-new">QTY</th>
                  <th class="px-6 py-3 bg-purple-50 border-new">R/M</th>
                  <th class="px-6 py-3 bg-purple-50 border-new">TP</th>
                </tr>
                <tr>
                  <th class="px-6 py-3 bg-yellow-50 border-new">(pcs)</th>
                  <th class="px-6 py-3 bg-green-50 border-new">(pcs)</th>
                  <th class="px-6 py-3 bg-purple-50 border-new">(pcs)</th>
                  <th class="px-6 py-3 bg-purple-50 border-new">(sht)</th>
                  <th class="px-6 py-3 bg-purple-50 border-new">(pcs)</th>
                  <th class="px-6 py-3 bg-red-50 border-new">(pcs)</th>
                  <th class="px-6 py-3 bg-red-50 border-new">(pcs)</th>
                </tr>
              </thead>

              <tbody class="text-xs font-medium">
                <template v-for="(item, dIndex) in formDetail.part_number" :key="`data-process-${dIndex}`">
                  <tr v-if="item" class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-3 border-new font-bold">
                      {{ formDetail.urut_plan[dIndex] }}
                    </td>
                    <td class="px-6 py-3 border-new">
                      {{
                        formDetail.additional[dIndex] == 1
                          ? "Add"
                          : formDetail.additional[dIndex] == 2
                          ? "LJ"
                          : formDetail.additional[dIndex] == 3
                          ? "TP"
                          : line?.patan || '-'
                      }}
                    </td>
                    <td class="px-6 py-3 border-new">
                      {{ formDetail.part_number[dIndex] }}
                    </td>
                    <td class="px-6 py-3 border-new">
                    </td>
                    <td class="px-6 py-3 border-new">
                    </td>
                    <td class="px-6 py-3 border-new bg-yellow-50">
                      {{ formDetail.lotsize[dIndex] || 0 }}
                    </td>
                    <td v-if="view" class="px-6 py-3 border-new bg-green-50">
                      {{ formDetail.lotsize_actual[dIndex] || 0 }}
                    </td>
                    <td v-else class="px-3 py-2 border-new bg-green-50">
                      <input type="number" min="0" v-on:keyup.enter="focusNext"
                        v-model.number="formDetail.lotsize_actual[dIndex]" @input="countDataActual" 
                        class="w-20 achievement bg-white text-gray-900 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </td>
                    <td class="px-6 py-3 border-new bg-purple-50" 
                        :class="parseInt(String(formDetail.qty_sap[dIndex])) !== parseInt(String(formDetail.lotsize[dIndex])) ? 'text-red-500 font-bold' : ''">
                      {{ formDetail.qty_sap[dIndex] || 0 }}
                    </td>
                    <td class="px-6 py-3 border-new bg-purple-50">
                    </td>
                    <td class="px-6 py-3 border-new bg-purple-50">
                    </td>
                    <td class="px-6 py-3 border-new bg-red-50"
                        :class="formDetail.qty_sap[dIndex] !== formDetail.lotsize_actual[dIndex] ? 'text-red-500 font-bold' : ''">
                        {{ formDetail.qty_sap[dIndex] > 0  || formDetail.lotsize_actual[dIndex] > 0 ?
                          formDetail.qty_sap[dIndex] -
                          formDetail.lotsize_actual[dIndex] : ''
                        }}
                    </td>
                    <td class="px-6 py-3 border-new bg-red-50">
                      {{ formDetail.reject[dIndex] !== 0 ? formDetail.reject[dIndex] : '' }}
                    </td>
                    <td v-if="view" class="px-6 py-3 border-new">
                      {{ formDetail.keterangan_sap[dIndex]?.toString() || '' }}
                    </td>
                    <td v-else class="px-3 py-2 border-new">
                      <MultiSelectCheckbox 
                        v-model="formDetail.keterangan_sap[dIndex]" 
                        :options="[...keterangan_sap]"
                        placeholder="Select keterangan" />
                    </td>
                  </tr>
                </template>
              </tbody>

              <tfoot class="text-xs uppercase font-bold bg-gray-100">
                <tr>
                  <th colspan="5" class="px-6 py-4 border-new text-left">TOTAL</th>
                  <th class="px-6 py-4 border-new bg-yellow-50">{{ formDetail.total_lot_rh ? formDetail.total_lot_rh : 0 }}</th>
                  <th class="px-6 py-4 border-new bg-green-50">{{ formDetail.total_ok ? formDetail.total_ok : 0 }}</th>
                  <th class="px-6 py-4 border-new bg-purple-50">{{ formDetail.total_sap ? formDetail.total_sap : 0 }}</th>
                  <th class="px-6 py-4 border-new bg-purple-50"></th>
                  <th class="px-6 py-4 border-new bg-purple-50"></th>
                  <th class="px-6 py-4 border-new bg-red-50">
                    {{ formDetail.total_sap || formDetail.total_ok ? formDetail.total_sap - formDetail.total_ok : 0 }}
                  </th>
                  <th class="px-6 py-4 border-new bg-red-50">{{ formDetail.total_repair ? formDetail.total_repair : 0 }}</th>
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
          class="flex items-center gap-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5 text-center transition-colors">
          <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
          Close
        </button>

        <button v-if="!view" @click="onSaveDetailSAP" type="button"
          class="flex items-center gap-2 text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center transition-colors">
          <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

table tbody td {
  text-align: center;
}

table tfoot th {
  text-align: center;
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

/* Datepicker Custom Styles */
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
