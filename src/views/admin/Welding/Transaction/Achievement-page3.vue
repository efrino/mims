<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useAchievementWld } from '@/stores/Welding/Transaction/Achievement';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import type { Attendance, Detail, SummaryData } from '@/types/Welding/Transaction/Achievement';
import { useUtilityStore } from '@/stores/utility';
import { useAuthStore } from '@/stores/auth';

const storeAch = useAchievementWld();
const { cleanData, selectedPrefixLine, selectedLineId, currentUser, currentPatan, filter } = storeToRefs(storeAch);
const router = useRouter();
const route = useRoute();
const dataTable = ref<Detail[]>([]);
const utils = useUtilityStore();
const note = ref<string>('');
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
} else if (selectedPrefixLine.value != '' && selectedLineId.value != '') {
  router.replace({
    query: {
      ...route.query,
      prefix: selectedPrefixLine.value,
      line: selectedLineId.value,
      date: filter.value.date,
      shift: String(filter.value.shift)
    }
  });
} else {
  router.push({ name: 'Transaction-welding-achievement' });
}

const page = ref({ title: `Achievement Welding - Line ${selectedLineId.value}` });
const breadcrumbs = shallowRef([
  {
    title: 'Welding',
    disabled: false,
    href: '#'
  },
  {
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Achievement',
    disabled: false,
    href: '/transaction/welding/achievement/'
  },
  {
    title: `LINE ${selectedPrefixLine.value}`,
    disabled: false,
    href: '/transaction/welding/achievement/showline'
  },
  {
    title: `LINE ${selectedLineId.value}`,
    disabled: true,
    href: '#'
  }
]);

const dataPreparation = () => {
  cleanData.value.forEach((e) => {
    if (e.prefix_line_id == selectedPrefixLine.value) {
      e.detail.forEach((item) => {
        currentPatan.value = item.patan;
        note.value = item.note || '-';
        summaryData.value = item.summary_data;
        attendance.value = item.attendance;

        if (item.line_id == selectedLineId.value) {
          dataTable.value = item.detail;
        }
      });
    }
  });
  fillEmptyAttendance();
};

const editData = async () => {
  if (!(await storeAch.canOpenForm())) return;
  storeAch.openFormEdit(currentPatan.value);
  router.push({ name: 'transaction-welding-achievement-detail-edit' });
};

// Status kunci form: dipakai untuk remark "sedang dibuka oleh ..." dan tombol Edit.
onMounted(async () => {
  storeAch.checkUser();
  if (needFetch) await storeAch.fetchData();
  dataPreparation();
});

const lockedBy = computed(() => {
  const user = currentUser.value.user;
  return currentUser.value.status === false && user && user !== authStore.user.fullname ? user : null;
});

const canEdit = () => {
  const isOwner = currentUser.value.user === authStore.user.fullname;
  const isNew = currentUser.value.user === null;
  return isOwner || isNew;
};

const fillEmptyAttendance = () => {
  if (attendance.value.length != 0) return;
  attendance.value = [
    {
      DATE: '-',
      line_id: '-',
      shift: '-',
      name_role: 'Foreman',
      standard: '-',
      present: '-',
      sick: '-',
      leave: '-'
    },
    {
      DATE: '-',
      line_id: '-',
      shift: '-',
      name_role: 'Checkman',
      standard: '-',
      present: '-',
      sick: '-',
      leave: '-'
    },
    {
      DATE: '-',
      line_id: '-',
      shift: '-',
      name_role: 'Handling',
      standard: '-',
      present: '-',
      sick: '-',
      leave: '-'
    },
    {
      DATE: '-',
      line_id: '-',
      shift: '-',
      name_role: 'Operator',
      standard: '-',
      present: '-',
      sick: '-',
      leave: '-'
    }
  ];
}
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col gap-8">
    <!-- Remark: form sedang dibuka user lain -->
    <div
      v-if="lockedBy"
      class="flex items-center gap-2 px-4 -mb-8 rounded-lg text-sm bg-yellow-50 text-yellow-800"
      style="border: 1px solid #facc15"
    >
      <i class="mdi mdi-lock text-base"></i>
      <span>
        Mode lihat saja. Form sedang dibuka oleh <strong>{{ lockedBy }}</strong
        >, data tidak bisa diubah sampai <strong>{{ lockedBy }}</strong> menutup formnya.
      </span>
      <button
        @click="router.push({ name: 'Transaction-welding-achievement' })"
        class="flex items-center gap-2 ml-auto px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap bg-white text-yellow-800 hover:bg-yellow-100 transition-all duration-300"
        style="border: 1px solid #facc15"
        title="Kembali ke daftar line"
      >
        <i class="mdi mdi-arrow-left text-base"></i>
        Kembali
      </button>
    </div>

    <!-- Button -->
    <div class="flex justify-end gap-3 -mb-5">
      <button
        v-if="canEdit()"
        @click="editData"
        class="flex gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
      >
        <svg
          class="w-5 h-5 text-white"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z"
          />
        </svg>
        Edit Data
      </button>
    </div>

    <!-- Main Table -->
    <div class="shadow-md rounded-lg p-5 bg-white">
      <div class="relative overflow-x-auto pb-2 table-wrapper">
        <table class="w-full text-xs text-left rtl:text-right text-gray-900">
          <thead class="text-xs text-gray-900 bg-gray-100">
            <tr>
              <th scope="col" colspan="11" class="px-2 py-1 text-center bg-blue-100">Plan</th>
              <th scope="col" colspan="14" class="px-2 py-1 text-center bg-green-100">Actual</th>
            </tr>

            <tr>
              <!-- Plan -->
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">No</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">Patan</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">Part Number</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">Job Number</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">Status</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">OP</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">Stroke</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">Lot Size</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">TPT</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">UPH Plan</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-blue-100">Keterangan</th>

              <!-- Actual -->
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Stroke</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">OK</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Repair</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Reject</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Total Lot Size</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Idletime</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Dandori</th>
              <th scope="col" colspan="5" class="px-2 py-1 text-center bg-green-100">Down Time</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">TPT (minutes)</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">UPH</th>
            </tr>

            <tr>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Machines</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Jig</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Other</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Bahan</th>
              <th scope="col" rowspan="2" class="px-2 py-1 text-center bg-green-100">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in dataTable" :key="index" class="bg-white hover:bg-gray-50 text-center">
              <td class="px-2 py-1">
                {{ index + 1 }}
              </td>
              <td class="px-2 py-1">
                {{ currentPatan }}
              </td>
              <td class="px-2 py-1 whitespace-nowrap">
                {{ item.part_number }}
              </td>
              <td class="px-2 py-1 whitespace-nowrap">
                {{ item.job_number }}
              </td>
              <td class="px-2 py-1">
                {{ item.status_plan }}
              </td>
              <td class="px-2 py-1 whitespace-nowrap">
                {{ item.total_process }}
              </td>
              <td class="px-2 py-1">
                {{ item.stroke_plan }}
              </td>
              <td class="px-2 py-1">
                {{ item.lotsize }}
              </td>
              <td class="px-2 py-1">
                {{ item.tpt }}
              </td>
              <td class="px-2 py-1">
                {{ item.uph_plan }}
              </td>
              <td class="px-2 py-1">
                {{ item.keterangan_plan }}
              </td>
              <td class="px-2 py-1">
                {{ item.stroke_act }}
              </td>
              <td class="px-2 py-1">
                {{ item.lotsize_actual }}
              </td>
              <td class="px-2 py-1">
                {{ item.repair }}
              </td>
              <td class="px-2 py-1">
                {{ item.reject }}
              </td>
              <td
                class="px-2 py-1"
                :class="
                  Number(item.total_lotsize_act!) > Number(item.lotsize!)
                    ? 'text-blue-500 font-medium'
                    : Number(item.total_lotsize_act!) < Number(item.lotsize!)
                      ? 'text-red-500 font-medium'
                      : ''
                "
              >
                {{ item.total_lotsize_act }}
              </td>
              <td class="px-2 py-1">
                {{ item.idletime }}
              </td>
              <td class="px-2 py-1">
                {{ item.dandori }}
              </td>
              <td class="px-2 py-1">
                {{ item.dt_machines }}
              </td>
              <td class="px-2 py-1">
                {{ item.dt_jig }}
              </td>
              <td class="px-2 py-1">
                {{ item.dt_other }}
              </td>
              <td class="px-2 py-1">
                {{ item.dt_wip }}
              </td>
              <td class="px-2 py-1">
                {{ item.total_dt == 0 ? '' : item.total_dt }}
              </td>
              <td class="px-2 py-1">
                {{ item.tpt_actual == '0.00' ? '-' : item.tpt_actual }}
              </td>
              <td class="px-2 py-1">
                {{ item.uph == null ? '-' : item.uph }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex gap-8">
      <!-- Summary Table -->
      <div class="relative overflow-x-auto shadow-md sm:rounded-lg w-full">
        <table class="text-sm text-left rtl:text-right text-gray-500">
          <thead class="text-xs text-gray-700 bg-gray-50">
            <tr>
              <th scope="col" colspan="6" class="px-6 py-3 text-center">TOTAL QTY</th>
              <th scope="col" rowspan="2" class="px-4 py-3 text-center text-xl">STROKE</th>
              <th scope="col" rowspan="2" class="px-4 py-3 text-center text-xl">UPH</th>
              <th scope="col" rowspan="2" class="px-4 py-3 text-center text-xl">TPT</th>
            </tr>

            <tr>
              <th scope="col" colspan="2" class="px-6 py-3 text-center bg-green-50">OK</th>
              <th scope="col" colspan="2" class="px-6 py-3 text-center bg-yellow-50">Repair</th>
              <th scope="col" colspan="2" class="px-6 py-3 text-center bg-red-50">Reject</th>
            </tr>

            <tr>
              <th scope="col" class="px-4 py-3 text-center bg-green-50">PCS</th>
              <th scope="col" class="px-4 py-3 text-center bg-green-50">%</th>
              <th scope="col" class="px-4 py-3 text-center bg-yellow-50">PCS</th>
              <th scope="col" class="px-4 py-3 text-center bg-yellow-50">%</th>
              <th scope="col" class="px-4 py-3 text-center bg-red-50">PCS</th>
              <th scope="col" class="px-4 py-3 text-center bg-red-50">%</th>
              <th scope="col" class="px-4 py-3 text-center">Total</th>
              <th scope="col" class="px-4 py-3 text-center">Average</th>
              <th scope="col" class="px-4 py-3 text-center">Minutes</th>
            </tr>
          </thead>
          <tbody>
            <tr class="bg-white text-gray-500 font-medium hover:bg-gray-50">
              <td class="px-3 py-5 text-center bg-green-50 text-xl">
                {{ summaryData?.qty_total }}
              </td>
              <td class="px-3 py-5 text-center bg-green-50 text-xl">{{ utils.formatPercentOneZero(summaryData?.qty_persen) }}%</td>
              <td class="px-3 py-5 text-center bg-yellow-50 text-xl">
                {{ summaryData?.repair_total }}
              </td>
              <td class="px-3 py-5 text-center bg-yellow-50 text-xl">{{ utils.formatPercentOneZero(summaryData?.repair_persen) }}%</td>
              <td class="px-3 py-5 text-center bg-red-50 text-xl">
                {{ summaryData?.reject_total }}
              </td>
              <td class="px-3 py-5 text-center bg-red-50 text-xl">{{ utils.formatPercentOneZero(summaryData?.reject_persen) }}%</td>
              <td class="px-3 py-5 text-center text-xl">
                {{ utils.formatDecimaltoNumber(summaryData?.total_stroke_actual) }}
              </td>
              <td class="px-3 py-5 text-center text-xl">
                {{ utils.formatDecimaltoNumber(summaryData?.avg_uph) }}
              </td>
              <td class="px-3 py-5 text-center text-xl">
                {{ utils.formatDecimaltoNumber(summaryData?.tpt_total) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Note -->
      <table class="w-1/2">
        <thead>
          <tr>
            <th class="text-start px-5 py-3 text-xl">Note</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center px-4 py-3">{{ note }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Man Power -->
    <div class="flex justify-center">
      <div class="relative overflow-x-auto shadow-md sm:rounded-lg w-1/2 manpower-table">
        <table class="w-full text-xs text-left rtl:text-right text-gray-900">
          <thead class="text-xs text-gray-900 bg-gray-100">
            <tr>
              <th scope="col" colspan="5" class="px-4 py-1 text-center text-lg">Σ Man Power</th>
            </tr>

            <tr>
              <th scope="col" class="px-2 py-1 text-center"></th>
              <th scope="col" class="px-2 py-1 text-center bg-blue-50 text-md">Standard</th>
              <th scope="col" class="px-2 py-1 text-center bg-green-50 text-md">Actual</th>
              <th scope="col" class="px-2 py-1 text-center bg-yellow-50 text-md">Sakit</th>
              <th scope="col" class="px-2 py-1 text-center bg-gray-100 text-md">Izin</th>
            </tr>
          </thead>
          <tbody>
            <tr class="bg-white hover:bg-gray-50">
              <td class="px-2 py-1 text-center">Foreman</td>
              <template v-for="(item, index) in attendance" :key="index">
                <template v-if="item.name_role == 'Foreman'">
                  <td class="px-2 py-1 text-center">
                    {{ item.standard ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.present ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.sick ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.leave ?? '-' }}
                  </td>
                </template>
              </template>
            </tr>
            <tr class="bg-white hover:bg-gray-50">
              <td class="px-2 py-1 text-center">Checkman</td>
              <template v-for="(item, index) in attendance" :key="index">
                <template v-if="item.name_role == 'Checkman'">
                  <td class="px-2 py-1 text-center">
                    {{ item.standard ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.present ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.sick ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.leave ?? '-' }}
                  </td>
                </template>
              </template>
            </tr>
            <tr class="bg-white hover:bg-gray-50">
              <td class="px-2 py-1 text-center">Handling</td>
              <template v-for="(item, index) in attendance" :key="index">
                <template v-if="item.name_role == 'Handling'">
                  <td class="px-2 py-1 text-center">
                    {{ item.standard ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.present ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.sick ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.leave ?? '-' }}
                  </td>
                </template>
              </template>
            </tr>
            <tr class="bg-white hover:bg-gray-50">
              <td class="px-2 py-1 text-center">Operator</td>
              <template v-for="(item, index) in attendance" :key="index">
                <template v-if="item.name_role == 'Operator'">
                  <td class="px-2 py-1 text-center">
                    {{ item.standard ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.present ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.sick ?? '-' }}
                  </td>
                  <td class="px-2 py-1 text-center">
                    {{ item.leave ?? '-' }}
                  </td>
                </template>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.border {
  border: 1px solid #000000 !important;
}

.table-wrapper {
  max-height: 700px;
  overflow-y: auto;
}

/* Tinggi baris header dikunci supaya offset sticky (top) di bawah selalu pas */
.table-wrapper thead th {
  height: 26px;
  white-space: nowrap;
}

/* Highlight baris saat hover */
.table-wrapper tbody tr:hover td,
.manpower-table tbody tr:hover td {
  background-color: #f1f5f9;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

/* Border dasar untuk semua th dan td */
thead th,
tbody td {
  border-right: 1px solid #000000 !important;
  border-bottom: 1px solid #000000 !important;
}

/* Border kiri untuk kolom pertama */
thead th:first-child,
tbody td:first-child {
  border-left: 1px solid #000000 !important;
}

/* Border atas untuk baris pertama thead */
thead tr:first-child th {
  border-top: 1px solid #000000 !important;
}

/* Baris pertama (dengan colspan) */
thead tr:first-child th {
  position: sticky !important;
  top: 0 !important;
  z-index: 10 !important;
  border: 1px solid #000000 !important;
}

/* Baris pertama (dengan colspan) */
thead tr:first-child th {
  position: sticky !important;
  top: 0 !important;
  z-index: 10 !important;
  border: 1px solid #000000 !important;
}

/* Baris kedua  */
thead tr:nth-child(2) th {
  position: sticky !important;
  top: 26px !important;
  z-index: 9 !important;
}

/* Baris ketiga */
thead tr:nth-child(3) th {
  position: sticky !important;
  top: 52px !important;
  z-index: 9 !important;
}
</style>
