<script setup lang="ts">
import { onMounted, shallowRef, computed } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useCashAdvanceSummaryStore } from '@/stores/Finance/Report/CashAdvanceSummaryStore';
import type { CashAdvanceSummaryDepartmentItem, CashAdvanceSummaryItem } from '@/types/Finance/Report/CashAdvanceSummary';
import { SyncOutlined } from '@ant-design/icons-vue';

const breadcrumbs = shallowRef([
  { title: 'Finance', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'Advance Payment Summary', disabled: true, href: '#' }
]);

const store = useCashAdvanceSummaryStore();
const { departmentRows, filter, tillDate, scopedDepartment, loading, exporting, grandTotal, permissions } = storeToRefs(store);

const tillDateLabel = computed(() => {
  if (!tillDate.value) return '';
  const d = new Date(tillDate.value);
  if (isNaN(d.getTime())) return tillDate.value;
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
});

// API kadang mengembalikan field numeric sebagai string ("2000000.00") — selalu dibersihkan dulu
// sebelum dipakai untuk kalkulasi/format, supaya tidak salah tipe (string tidak dijumlah, hanya digabung).
const toNumber = (val: unknown): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

const formatNumber = (val: string | number | null | undefined) => {
  const n = toNumber(val);
  if (!n) return '-';
  return n.toLocaleString('id-ID', { minimumFractionDigits: 0 });
};

// Urutan bucket overdue dari yang paling baru (0-5) sampai paling lama (>25)
const OVERDUE_KEYS = ['overdue_0_5', 'overdue_6_10', 'overdue_11_15', 'overdue_16_20', 'overdue_21_25', 'overdue_gt_25'] as const;

// Sorot kuning bukan cuma bucket yang lagi aktif, tapi juga semua bucket sebelumnya yang sudah "dilewati" —
// mis. kalau outstanding-nya sekarang ada di 11-15, berarti sempat melewati 0-5 dan 6-10 juga.
const overdueHighlightClass = (row: CashAdvanceSummaryDepartmentItem | CashAdvanceSummaryItem, key: (typeof OVERDUE_KEYS)[number]) => {
  const furthestIdx = OVERDUE_KEYS.reduce((acc, k, i) => (toNumber(row[k]) > 0 ? i : acc), -1);
  const isPassed = furthestIdx >= 0 && OVERDUE_KEYS.indexOf(key) <= furthestIdx;
  return isPassed ? 'bg-yellow-200 dark:bg-yellow-900/50 font-semibold text-gray-800 dark:text-yellow-200' : 'text-gray-400';
};
const overdueHighlightAmber = (row: CashAdvanceSummaryDepartmentItem | CashAdvanceSummaryItem, key: (typeof OVERDUE_KEYS)[number]) => {
  const furthestIdx = OVERDUE_KEYS.reduce((acc, k, i) => (toNumber(row[k]) > 0 ? i : acc), -1);
  const isPassed = furthestIdx >= 0 && OVERDUE_KEYS.indexOf(key) <= furthestIdx;
  return isPassed ? 'bg-amber-300 dark:bg-amber-900/50 font-semibold text-gray-800 dark:text-amber-200' : 'text-gray-400';
};

const totalRows = computed(() => departmentRows.value.length);
// Expand + Departemen + Qty + Balance + Current + 6 overdue + Keterangan = 12
const totalCols = 12;

onMounted(() => {
  store.fetchData();
});
</script>

<template>
  <BaseBreadcrumb title="Advance Payment Summary" :breadcrumbs="breadcrumbs" class="mb-6" />

  <div class="flex flex-col gap-5">
    <!-- ── Quick Stats ────────────────────────────────────────────── -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="rounded-lg border-l-4 border-l-blue-500 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
        <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Departemen</p>
        <p class="text-xl font-bold text-gray-800 dark:text-gray-100 leading-tight">{{ totalRows }}</p>
        <p class="text-[11px] text-gray-400">memiliki kasbon outstanding</p>
      </div>
      <div class="rounded-lg border-l-4 border-l-amber-500 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
        <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Qty Kas Bon</p>
        <p class="text-xl font-bold text-gray-800 dark:text-gray-100 leading-tight">{{ grandTotal.qty_kasbon }}</p>
        <p class="text-[11px] text-gray-400">seluruh data</p>
      </div>
      <div class="rounded-lg border-l-4 border-l-red-500 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
        <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Balance Due</p>
        <p class="text-xl font-bold text-red-600 dark:text-red-400 leading-tight tabular-nums">
          {{ formatNumber(grandTotal.balance_due) }}
        </p>
        <p class="text-[11px] text-gray-400">belum dikembalikan</p>
      </div>
    </div>

    <!-- ── Filter Bar ─────────────────────────────────────────────── -->
    <div class="flex flex-wrap justify-between items-end gap-3">
      <div class="flex flex-wrap items-end gap-3 ">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Hitung Overdue per Tanggal</label>
          <input
            v-model="filter.till_date"
            type="date"
            class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
          />
        </div>
  
        <button
          @click="store.fetchData()"
          type="button"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 font-medium rounded-full text-sm px-5 py-2 whitespace-nowrap"
        >
          <SyncOutlined />
          Reload
        </button>
      </div>

      <button
        v-if="permissions.download"
        @click="store.exportExcel()"
        type="button"
        :disabled="loading || exporting || departmentRows.length === 0"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 font-medium rounded-full text-sm px-5 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i class="mdi text-base" :class="exporting ? 'mdi-loading mdi-spin' : 'mdi-microsoft-excel'" />
        Export Excel
      </button>
    </div>

    <!-- User tanpa akses ViewAll (dept head): data dibatasi backend ke departemennya sendiri -->
    <div
      v-if="!permissions.viewAll"
      class="flex items-center gap-2 rounded-lg border-1 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 text-sm text-blue-800 dark:text-blue-200"
    >
      <i class="mdi mdi-office-building-outline text-base" />
      <span>
        Summary Kasbon:
        <strong>{{ scopedDepartment || (loading ? 'memuat...' : '-') }}</strong>
        <span class="text-xs text-blue-600/80 dark:text-blue-300/70"></span>
      </span>
    </div>

    <!-- Acuan tanggal overdue yang benar-benar dipakai backend untuk hasil yang sedang tampil -->
    <p v-if="tillDateLabel" class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
      <i class="mdi mdi-calendar-clock-outline" />
      Data overdue per <span class="font-semibold text-gray-700 dark:text-gray-200">{{ tillDateLabel }}</span>
    </p>

    <!-- ── Tabel Summary (grouped header, mirip sheet Balance Due) ──── -->
    <div class="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm">
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th rowspan="2" class="px-2 py-2 border border-gray-300 dark:border-gray-600 bg-blue-100 dark:bg-blue-950/40 w-8"></th>
            <th
              rowspan="2"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-100 dark:bg-blue-950/40 font-bold uppercase text-gray-700 dark:text-gray-200 whitespace-nowrap"
            >
              Departemen
            </th>
            <th
              rowspan="2"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-100 dark:bg-blue-950/40 font-bold uppercase text-gray-700 dark:text-gray-200 whitespace-nowrap"
            >
              Qty Kas Bon
            </th>
            <th
              rowspan="2"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-100 dark:bg-blue-950/40 font-bold uppercase text-gray-700 dark:text-gray-200 whitespace-nowrap"
            >
              Balance Due
            </th>
            <th
              rowspan="2"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-100 dark:bg-blue-950/40 font-bold uppercase text-gray-700 dark:text-gray-200 whitespace-nowrap"
            >
              Current
            </th>
            <th
              colspan="6"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-100 dark:bg-blue-950/40 font-bold uppercase text-gray-700 dark:text-gray-200 text-center"
            >
              Over Due (Hari)
            </th>
            <th
              rowspan="2"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-100 dark:bg-blue-950/40 font-bold uppercase text-gray-700 dark:text-gray-200 whitespace-nowrap"
            >
              Keterangan
            </th>
          </tr>
          <tr>
            <th
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-950/20 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
            >
              0 - 5
            </th>
            <th
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-950/20 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
            >
              6-10
            </th>
            <th
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-950/20 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
            >
              11-15
            </th>
            <th
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-950/20 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
            >
              16-20
            </th>
            <th
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-950/20 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
            >
              21-25
            </th>
            <th
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-950/20 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
            >
              &gt;25
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading -->
          <tr v-if="loading">
            <td :colspan="totalCols" class="px-4 py-12 text-center text-gray-400 border border-gray-300 dark:border-gray-600">
              <i class="mdi mdi-loading mdi-spin text-3xl block mb-2 text-blue-400" />
              <span class="text-sm">Memuat data...</span>
            </td>
          </tr>

          <!-- Empty -->
          <tr v-else-if="departmentRows.length === 0">
            <td :colspan="totalCols" class="px-4 py-12 text-center border border-gray-300 dark:border-gray-600">
              <i class="mdi mdi-table-off text-3xl block mb-2 text-gray-300" />
              <span class="text-sm text-gray-400">Tidak ada data</span>
            </td>
          </tr>

          <!-- Data rows -->
          <template v-else v-for="row in departmentRows" :key="row.department">
            <tr
              class="bg-white dark:bg-gray-900 hover:bg-blue-50/50 dark:hover:bg-gray-800/60 cursor-pointer"
              @click="store.toggleDepartment(row.department)"
            >
              <td class="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center text-gray-400">
                <i
                  class="mdi text-sm transition-transform"
                  :class="store.isDepartmentExpanded(row.department) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                />
              </td>
              <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {{ row.department }}
              </td>
              <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center tabular-nums text-gray-700 dark:text-gray-300">
                {{ row.qty_kasbon }}
              </td>
              <td
                class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100"
              >
                {{ formatNumber(row.balance_due) }}
              </td>
              <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-700 dark:text-gray-300">
                {{ formatNumber(row.current_amount) }}
              </td>
              <td
                class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                :class="overdueHighlightAmber(row, 'overdue_0_5')"
              >
                {{ formatNumber(row.overdue_0_5) }}
              </td>
              <td
                class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                :class="overdueHighlightAmber(row, 'overdue_6_10')"
              >
                {{ formatNumber(row.overdue_6_10) }}
              </td>
              <td
                class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                :class="overdueHighlightAmber(row, 'overdue_11_15')"
              >
                {{ formatNumber(row.overdue_11_15) }}
              </td>
              <td
                class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                :class="overdueHighlightAmber(row, 'overdue_16_20')"
              >
                {{ formatNumber(row.overdue_16_20) }}
              </td>
              <td
                class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                :class="overdueHighlightAmber(row, 'overdue_21_25')"
              >
                {{ formatNumber(row.overdue_21_25) }}
              </td>
              <td
                class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                :class="overdueHighlightAmber(row, 'overdue_gt_25')"
              >
                {{ formatNumber(row.overdue_gt_25) }}
              </td>
              <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-400">-</td>
            </tr>

            <!-- Sub-baris karyawan pada departemen ini, tampil saat expand -->
            <template v-if="store.isDepartmentExpanded(row.department)">
              <tr
                v-if="store.employeesByDepartment(row.department).length === 0"
                :key="`${row.department}-empty`"
                class="bg-gray-50 dark:bg-gray-800/40"
              >
                <td :colspan="totalCols" class="px-4 py-3 text-center text-xs text-gray-400 border border-gray-200 dark:border-gray-700">
                  Tidak ada rincian karyawan.
                </td>
              </tr>
              <tr
                v-for="emp in store.employeesByDepartment(row.department)"
                :key="emp.nik"
                class="bg-gray-50 dark:bg-gray-800/40 hover:bg-blue-50/50 dark:hover:bg-gray-800/60"
              >
                <td class="px-2 py-1.5 border border-gray-200 dark:border-gray-700"></td>
                <td class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <span class="inline-flex items-center gap-1.5 pl-3">
                    <i class="mdi mdi-subdirectory-arrow-right text-xs text-gray-300" />
                    {{ emp.name }}
                  </span>
                </td>
                <td
                  class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-center tabular-nums text-gray-500 dark:text-gray-400"
                >
                  {{ emp.qty_kasbon }}
                </td>
                <td
                  class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-right tabular-nums font-medium text-gray-700 dark:text-gray-200"
                >
                  {{ formatNumber(emp.balance_due) }}
                </td>
                <td
                  class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-500 dark:text-gray-400"
                >
                  {{ formatNumber(emp.current_amount) }}
                </td>
                <td
                  class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                  :class="overdueHighlightClass(emp, 'overdue_0_5')"
                >
                  {{ formatNumber(emp.overdue_0_5) }}
                </td>
                <td
                  class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                  :class="overdueHighlightClass(emp, 'overdue_6_10')"
                >
                  {{ formatNumber(emp.overdue_6_10) }}
                </td>
                <td
                  class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                  :class="overdueHighlightClass(emp, 'overdue_11_15')"
                >
                  {{ formatNumber(emp.overdue_11_15) }}
                </td>
                <td
                  class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                  :class="overdueHighlightClass(emp, 'overdue_16_20')"
                >
                  {{ formatNumber(emp.overdue_16_20) }}
                </td>
                <td
                  class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                  :class="overdueHighlightClass(emp, 'overdue_21_25')"
                >
                  {{ formatNumber(emp.overdue_21_25) }}
                </td>
                <td
                  class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-right tabular-nums"
                  :class="overdueHighlightClass(emp, 'overdue_gt_25')"
                >
                  {{ formatNumber(emp.overdue_gt_25) }}
                </td>
                <td class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-400">-</td>
              </tr>
            </template>
          </template>
        </tbody>

        <!-- Grand Total -->
        <tfoot v-if="departmentRows.length > 0">
          <tr class="bg-gray-50 dark:bg-gray-800/60 font-bold">
            <td colspan="2" class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Grand Total</td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center tabular-nums text-gray-800 dark:text-gray-100">
              {{ grandTotal.qty_kasbon }}
            </td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-800 dark:text-gray-100">
              {{ formatNumber(grandTotal.balance_due) }}
            </td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-800 dark:text-gray-100">
              {{ formatNumber(grandTotal.current_amount) }}
            </td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-800 dark:text-gray-100">
              {{ formatNumber(grandTotal.overdue_0_5) }}
            </td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-800 dark:text-gray-100">
              {{ formatNumber(grandTotal.overdue_6_10) }}
            </td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-800 dark:text-gray-100">
              {{ formatNumber(grandTotal.overdue_11_15) }}
            </td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-800 dark:text-gray-100">
              {{ formatNumber(grandTotal.overdue_16_20) }}
            </td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-800 dark:text-gray-100">
              {{ formatNumber(grandTotal.overdue_21_25) }}
            </td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-800 dark:text-gray-100">
              {{ formatNumber(grandTotal.overdue_gt_25) }}
            </td>
            <td class="px-3 py-2 border border-gray-200 dark:border-gray-700"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
